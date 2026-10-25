import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

type Size = {
  width: number;
  height: number;
  aspect: number;
};

export class Three  {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly clock: THREE.Clock;
  private _stats?: Stats;
  private abortController?: AbortController;

  private resizeHandler?: (size: Size) => void;
  private isActive = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = this.createRenderer(canvas);
    this.scene = this.createScene();
    this.clock = new THREE.Clock();

    this.addEvents();
  }

  private createRenderer(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });

    const { innerWidth: width, innerHeight: height } = window;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    return renderer;
  }

  private createScene() {
    const scene = new THREE.Scene();
    return scene;
  }

  private addEvents() {
    this.abortController = new AbortController();

    window.addEventListener('resize', () => {
      const { innerWidth: width, innerHeight: height } = window;
      this.renderer.setSize(width, height);
      this.resizeHandler?.({ width, height, aspect: width / height });
    }, { signal: this.abortController.signal });

    document.addEventListener('visibilitychange', () => {
      this.isActive = document.visibilityState === 'visible';
    }, { signal: this.abortController.signal });
  }

  setResizeHandler(fn: (size: Size) => void) {
    this.resizeHandler = fn;
  }

  render(camera: THREE.Camera, update?: (delta: number) => void) {
    if (!this.isActive) return;

    const delta = this.clock.getDelta();
    update?.(delta);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, camera);

    this._stats?.update();
  }

  get stats() {
    if (!this._stats) {
      this._stats = new Stats();
      document.body.appendChild(this._stats.dom);
    }
    return this._stats;
  }

  get size(): Size {
    const { width, height } = this.renderer.domElement;
    return { width, height, aspect: width / height };
  }

  getCoverScale(imageAspect: number): [number, number] {
    const screenAspect = this.size.aspect;

    return screenAspect < imageAspect
      ? [screenAspect / imageAspect, 1]
      : [1, imageAspect / screenAspect];
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.abortController?.abort();
  }
}