import * as THREE from 'three';

/**
 * Passive slow-drift camera for the hero backdrop. Local addition: replaces
 * the upstream CinematicCamera (free-flight input + director shot system)
 * with the minimal surface the engine's render loop touches — camera,
 * update(dt, time), waveFloor, focusDistance.
 */
export class HeroCamera {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 120000);
    this.camera.position.set(0, 22, 190);
    // Landscape shot: focus effectively at the horizon so DOF never smears
    // the backdrop even if it gets re-enabled.
    this.focusDistance = 900;
    this.waveFloor = 0;
    this._angle = 0.9;
    this._look = new THREE.Vector3();
  }

  update(dt, time) {
    this._angle += dt * 0.011;
    const radius = 190 + Math.sin(time * 0.045) * 14;
    const y = Math.max(22 + Math.sin(time * 0.032) * 3.5, this.waveFloor + 2.5);
    this.camera.position.set(Math.cos(this._angle) * radius, y, Math.sin(this._angle) * radius);
    // Look through the orbit centre to the far side: a horizon view that
    // slowly pans, so the sun and weather drift through frame on their own.
    this._look.set(
      -Math.cos(this._angle) * 700,
      y * 0.55 + Math.sin(time * 0.021) * 1.5,
      -Math.sin(this._angle) * 700,
    );
    this.camera.lookAt(this._look);
    this.camera.updateMatrixWorld();
  }
}
