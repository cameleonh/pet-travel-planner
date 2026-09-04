import * as THREE from 'three';
import { U, updateFrameUniforms } from './SharedUniforms.js';
import { Quality, autoDetectPreset } from './Quality.js';
import { makeRT, FullScreenPass, PingPong } from '../gfx/FullScreenPass.js';
import { bakeProceduralTextures } from '../gfx/ProceduralTextures.js';
import { OceanFFT } from '../ocean/OceanFFT.js';
import { OceanMesh } from '../ocean/OceanMesh.js';
import { Atmosphere } from '../sky/Atmosphere.js';
import { SkyRenderer } from '../sky/SkyRenderer.js';
import { Clouds } from '../sky/Clouds.js';
import { Lightning } from '../weather/Lightning.js';
import { Rain, Spray } from '../weather/Precipitation.js';
import { OCEAN_SAMPLE_GLSL } from '../ocean/OceanSampleGLSL.js';
import { PostFX } from '../post/PostFX.js';
import { HeroCamera } from '../HeroCamera.js';
import { GpuProfiler } from './GpuProfiler.js';

/**
 * HeroApp — the ABYSSAL engine (github.com/Token-Gremlin/natural-disasters,
 * MIT) adapted for embedding as the 같이갈개 hero backdrop. Local changes
 * vs upstream core/App.js: container-driven sizing instead of the full
 * window, no URLSearchParams / Director / Sandbox / waterspout, passive
 * HeroCamera, and dispose() for React unmount. Weather is attached
 * externally via `app.weather` and stepped through the beforeUpdate hook.
 */
export class HeroApp {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.onProgress = opts.onProgress || (() => {});
    this.onFirstFrame = opts.onFirstFrame || null;
    this.time = 0;
    this.frame = 0;
    this.running = false;
    this.paused = false;
    this._lastT = 0;
    this._projNoJitter = new THREE.Matrix4();
    this._firstFrameDone = false;
  }

  async init() {
    const canvas = this.canvas;
    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, stencil: false, depth: true,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    });
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.debug.checkShaderErrors = false;
    this.renderer = renderer;

    const gl = renderer.getContext();
    if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 is required for the hero backdrop.');
    const extFloat = gl.getExtension('EXT_color_buffer_float');
    if (!extFloat) throw new Error('EXT_color_buffer_float is required (float render targets).');
    gl.getExtension('OES_texture_float_linear');
    gl.getExtension('EXT_float_blend');

    this.caps = {
      maxTexture: renderer.capabilities.maxTextureSize,
      anisotropy: renderer.capabilities.getMaxAnisotropy(),
      drawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
      renderer: (() => {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
      })(),
    };

    this.profiler = new GpuProfiler(renderer);
    this.profiler.enabled = false;
    this.quality = new Quality(this.opts.preset || autoDetectPreset(this.caps.renderer));
    this.quality.adaptive = this.opts.adaptive !== false;
    this.quality.onDowngrade = (name, scale) => this.setQualityPreset(name, scale);

    this.onProgress('baking procedural textures', 0.08);
    this.textures = await bakeProceduralTextures(renderer, (m) => this.onProgress(m, 0.1));
    U.uFoamTex.value = this.textures.foam;
    U.uRippleTex.value = this.textures.ripple;
    U.uCurlTex.value = this.textures.curl;

    this.onProgress('solving wave spectrum', 0.42);
    this.ocean = new OceanFFT(renderer, { size: this.quality.fftSize });

    this.onProgress('integrating atmosphere', 0.55);
    this.atmosphere = new Atmosphere(renderer);
    this.atmosphere.buildStaticLUTs(true);

    this.onProgress('building sky', 0.62);
    this.sky = new SkyRenderer(renderer, this.atmosphere);

    this.onProgress('seeding cloud volume', 0.66);
    this.clouds = new Clouds(renderer, this.atmosphere, this.textures, this.quality);

    this.onProgress('tessellating ocean', 0.7);
    this.oceanMesh = new OceanMesh(this.ocean, this.atmosphere, this.quality, this.clouds.shared);

    this.lightning = new Lightning();
    this.onProgress('seeding spray', 0.76);
    this.rain = new Rain(this.quality);
    this.spray = new Spray(this.renderer, this.ocean, this.quality,
      FullScreenPass, makeRT, PingPong, OCEAN_SAMPLE_GLSL);

    this.scene = new THREE.Scene();
    this.scene.add(this.sky.mesh);
    this.scene.add(this.oceanMesh.mesh);
    this.scene.add(this.spray.mesh);
    this.scene.add(this.rain.mesh);
    this.scene.add(this.lightning.mesh);

    this.onProgress('setting up camera', 0.8);
    const size = this._cssSize();
    this.cine = new HeroCamera(size.w / size.h);
    this.camera = this.cine.camera;

    this.onProgress('compiling post stack', 0.86);
    this._resize(true);
    if (typeof ResizeObserver !== 'undefined' && this.opts.container) {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.opts.container);
    }

    this.onProgress('warming shaders', 0.94);
    this.ocean.update(1 / 60);
    this.atmosphere.update(this.camera, this.camera.position);
    this.sky.renderEnv();
    renderer.compile(this.scene, this.camera);

    this.onProgress('ready', 1.0);
  }

  _cssSize() {
    const size = this.opts.getSize ? this.opts.getSize() : { w: 1, h: 1 };
    return { w: Math.max(2, size.w | 0), h: Math.max(2, size.h | 0) };
  }

  setQualityPreset(name, scale = 1.0) {
    this.quality.setPreset(name, scale);
    this.oceanMesh?.setResolution(this.quality.oceanGridX, this.quality.oceanGridY);
    this.clouds?.setQuality(this.quality);
    this.rain?.setQuality(this.quality);
    this.spray?.setQuality(this.quality);
    this._resize(true);
    this.onQualityChange?.(this.quality.presetName);
  }

  _resize(force = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio);
    const { w: cssW, h: cssH } = this._cssSize();
    const w = Math.max(2, Math.floor(cssW * dpr * this.quality.effectiveScale));
    const h = Math.max(2, Math.floor(cssH * dpr * this.quality.effectiveScale));
    if (!force && this.renderWidth === w && this.renderHeight === h) return;
    this.renderWidth = w; this.renderHeight = h;

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(cssW, cssH, true);

    if (this.hdrRT) this.hdrRT.dispose();
    this.hdrRT = makeRT(w, h, {
      type: THREE.HalfFloatType, count: 2, depthBuffer: true,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, name: 'hdrMRT',
    });

    if (!this.post) this.post = new PostFX(this.renderer, w, h);
    else this.post.setSize(w, h);
    this.clouds?.setSize(w, h);

    this.camera.aspect = cssW / cssH;
    this.camera.updateProjectionMatrix();
    U.uResolution.value.set(w, h);
    U.uInvResolution.value.set(1 / w, 1 / h);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastT = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const dtRaw = (t - this._lastT) / 1000;
      this._lastT = t;
      const dt = Math.min(Math.max(dtRaw, 1e-4), 0.05);
      this.frameMs = dtRaw * 1000;
      this.render(dt);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  render(dt) {
    const scaled = this.paused ? 0 : dt * (this.timeScale ?? 1);
    this.time += scaled;
    this.frame++;

    if (this.quality.tick(this.frameMs)) this._resize();

    this.beforeUpdate?.(scaled, dt);

    this.cine.update(dt, this.time);
    this.ocean.update(scaled);
    this.atmosphere.update(this.camera, this.camera.position);
    this.atmosphere.syncUniforms(U);
    U.uAmbientColor.value.set(this.atmosphere.ambientColor.r, this.atmosphere.ambientColor.g, this.atmosphere.ambientColor.b);
    this.sky.update(this.time);
    this.lightning.update(scaled || dt * 1e-3, this.time, this.weather?.state);
    this.cine.waveFloor = (this.ocean?.significantWaveHeight || 0) * 0.75;

    const camY = this.camera.position.y - U.uSeaLevel.value;
    this.oceanMesh.material.uniforms.uGridPlane.value = camY - 0.5;
    this.oceanMesh.update(this.camera.position, U.uSeaLevel.value);

    // ---- TAA jitter
    this.camera.updateProjectionMatrix();
    this._projNoJitter.copy(this.camera.projectionMatrix);
    if (this.post.settings.taa) {
      const [jx, jy] = this.post.getJitter(this.frame);
      this.camera.projectionMatrix.elements[8] += jx;
      this.camera.projectionMatrix.elements[9] += jy;
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      U.uJitter.value.set(jx, jy);
    }

    updateFrameUniforms(this.camera, this._projNoJitter, dt, this.time, this.frame);
    this.afterUpdate?.(scaled, dt);

    this.rain.update(this.camera, U.uRain.value, this.hdrRT.height);
    this.spray.update(scaled || dt, U.uSprayAmount.value);

    this.clouds.update(this.time, dt);
    this.sky.setCloudTextures(this.clouds.screenTexture, this.clouds.envTexture);
    this.sky.renderEnv();

    // ---- main pass
    const r = this.renderer;
    r.setRenderTarget(this.hdrRT);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);

    this.post.settings.focusDistance = this.cine.focusDistance;
    this.post.render(this.hdrRT.textures[0], this.hdrRT.textures[1], null);

    if (!this._firstFrameDone) {
      this._firstFrameDone = true;
      this.onFirstFrame?.();
    }
  }

  /** Best-effort teardown for React unmount: stop the loop and release the GL context. */
  dispose() {
    this.stop();
    try { this._ro?.disconnect(); } catch { /* ignore */ }
    try { this.clouds?.dispose?.(); } catch { /* ignore */ }
    try { this.ocean?.dispose?.(); } catch { /* ignore */ }
    try { this.post?.dispose?.(); } catch { /* ignore */ }
    try { this.hdrRT?.dispose(); } catch { /* ignore */ }
    try { this.renderer.dispose(); } catch { /* ignore */ }
    try { this.renderer.forceContextLoss?.(); } catch { /* ignore */ }
  }
}
