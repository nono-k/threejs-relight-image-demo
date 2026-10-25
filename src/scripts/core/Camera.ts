import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

type OrthographicCameraParams = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  near?: number;
  far?: number;
  scale?: number;
}

type PerspectiveCameraParams = {
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
}

export class OrthographicCamera extends THREE.OrthographicCamera {
  private readonly frustomScale;

  constructor(params?: OrthographicCameraParams) {
    const aspect = window.innerWidth / window.innerHeight;
    const left = params?.left ?? -aspect;
    const right = params?.right ?? aspect;
    const top = params?.top ?? 1;
    const bottom = params?.bottom ?? -1;
    const near = params?.near ?? 0.1;
    const far = params?.far ?? 100;
    const scale = params?.scale ?? 1;

    super(left * scale, right * scale, top * scale, bottom * scale, near, far);

    this.position.z = 10;
    this.frustomScale = scale;
  }

  update() {
    const aspect = window.innerWidth / window.innerHeight;
    this.left = -aspect * this.frustomScale;
    this.right = aspect * this.frustomScale;
    this.updateProjectionMatrix();
  }
}

export class PerspectiveCamera extends THREE.PerspectiveCamera {
  constructor(params?: PerspectiveCameraParams) {
    const fov = params?.fov ?? 45;
    const aspect = params?.aspect ?? window.innerWidth / window.innerHeight;
    const near = params?.near ?? 0.1;
    const far = params?.far ?? 2000;

    super(fov, aspect, near, far);

    this.position.z = 3;
  }

  update() {
    this.aspect = window.innerWidth / window.innerHeight;
    this.updateProjectionMatrix();
  }
}

export class Controls extends OrbitControls {
  constructor(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    super(camera, renderer.domElement);
  }
}