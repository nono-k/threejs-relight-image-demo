import * as THREE from 'three';
import { Controls, PerspectiveCamera } from './core/Camera';
import { Three } from './core/Three';
import { Gui } from './Gui';
import fragment from './shaders/fragment.glsl?raw';
import vertex from './shaders/vertex.glsl?raw';

export class App extends Three {
  private readonly camera: PerspectiveCamera;
  private cube!: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.camera = new PerspectiveCamera();
    new Controls(this.renderer, this.camera);

    this.init();
    this.createGeometry();

    this.setGui();

    window.addEventListener('resize', this.resize.bind(this));
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private init() {
    this.scene.background = new THREE.Color('#222222');
  }

  private createGeometry() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
      },
    });

    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
  }

  private setGui() {
    const PARAMS = {
      zPos: this.camera.position.z,
    };

    const pane = new Gui();
    pane.addBinding(PARAMS, 'zPos', { min: 0, max: 10 });

    pane.on('change', () => {
      this.camera.position.z = PARAMS.zPos;
    });
  }

  private animate() {
    const delta = this.clock.getDelta();
    this.cube.rotation.x += delta * 0.5;
    this.cube.rotation.y += delta * 0.5;

    const cubeMaterial = this.cube.material as THREE.ShaderMaterial;

    if (cubeMaterial.uniforms.uTime) {
      cubeMaterial.uniforms.uTime.value += delta;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    this.camera.update();
  }
}

const app = new App(document.getElementById('webgl') as HTMLCanvasElement);

window.addEventListener('beforeunload', () => {
  app.dispose();
});
