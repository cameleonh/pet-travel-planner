import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveCompanionClips } from "./dog-animation";

export type DogMood = "idle" | "walk" | "happy";

const GLB_URL = "/companion/dog.glb";
const TARGET_HEIGHT = 1.6;
const FADE_SECONDS = 0.28;
// FBX2glTF (Quaternius) exports the animal facing +Z (toward the camera).
const FACE_YAW = 0;

/**
 * Minimal three.js runtime for the companion mascot: loads the CC0 dog model,
 * renders it on a transparent canvas, and crossfades between idle / walk / a
 * one-shot happy reaction. The caller owns the canvas size and lifecycle.
 */
export class CompanionDogDriver {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<DogMood, THREE.AnimationAction>();
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private mood: DogMood = "idle";
  private paused = false;
  private disposed = false;
  private raf = 0;

  private constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    mixer: THREE.AnimationMixer,
    actions: Map<DogMood, THREE.AnimationAction>,
    canvas: HTMLCanvasElement,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.mixer = mixer;
    this.actions = actions;
    this.mixer.addEventListener("finished", (event) => {
      if ((event as unknown as { action?: THREE.AnimationAction }).action === this.actions.get("happy") && this.mood === "happy") {
        this.setMood("idle");
      }
    });
    this.resizeObserver = new ResizeObserver(() => this.resize(canvas));
    this.resizeObserver.observe(canvas);
    this.resize(canvas);
  }

  static async create(canvas: HTMLCanvasElement): Promise<CompanionDogDriver | null> {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return null;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a2a, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.4, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfe3ff, 1.1);
    rim.position.set(-3, 2, -2.5);
    scene.add(rim);

    let gltf: Awaited<ReturnType<GLTFLoader["loadAsync"]>>;
    try {
      gltf = await new GLTFLoader().loadAsync(GLB_URL);
    } catch {
      renderer.dispose();
      return null;
    }

    const model = gltf.scene;
    const initial = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    initial.getSize(size);
    const scale = TARGET_HEIGHT / Math.max(size.y, 1e-3);
    model.scale.setScalar(scale);
    const fitted = new THREE.Box3().setFromObject(model);
    const center = fitted.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= fitted.min.y;
    model.rotation.y = FACE_YAW;
    scene.add(model);

    camera.position.set(TARGET_HEIGHT * 0.42, TARGET_HEIGHT * 0.6, TARGET_HEIGHT * 2.55);
    camera.lookAt(0, TARGET_HEIGHT * 0.46, 0);

    const clips = resolveCompanionClips(gltf.animations.map((clip) => clip.name));
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map<DogMood, THREE.AnimationAction>();
    const bind = (mood: DogMood, clipName: string | null, once = false) => {
      if (!clipName) return;
      const clip = THREE.AnimationClip.findByName(gltf.animations, clipName);
      if (!clip) return;
      const action = mixer.clipAction(clip);
      if (once) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions.set(mood, action);
    };
    bind("idle", clips.idle);
    bind("walk", clips.walk);
    bind("happy", clips.happy, true);
    actions.get("idle")?.play();

    const driver = new CompanionDogDriver(renderer, scene, camera, mixer, actions, canvas);
    driver.start();
    return driver;
  }

  private resize(canvas: HTMLCanvasElement): void {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private start(): void {
    const loop = () => {
      if (this.disposed) return;
      const delta = this.clock.getDelta();
      if (!this.paused) this.mixer.update(delta);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  setMood(mood: DogMood): void {
    if (mood === this.mood || this.disposed) return;
    const next = this.actions.get(mood);
    const previous = this.actions.get(this.mood);
    if (next) {
      next.reset();
      next.setEffectiveTimeScale(1);
      next.setEffectiveWeight(1);
      next.fadeIn(FADE_SECONDS).play();
    }
    previous?.fadeOut(FADE_SECONDS);
    this.mood = mood;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.clock.getDelta();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.mixer.stopAllAction();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    this.renderer.dispose();
  }
}
