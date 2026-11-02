import * as THREE from 'three';
import { OrthographicCamera } from './core/Camera';
import { Three } from './core/Three';
import { Gui } from './Gui';
import vertex from './shaders/vertex.glsl?raw';
import depthFragment from './shaders/depth.glsl?raw';
import normalFragment from './shaders/normal.glsl?raw';
import relightFragment from './shaders/relight.glsl?raw';

import image from '../images/image.jpg';

type ViewMode = 'lit' | 'depth' | 'normal';

const VIEW_MODE = {
  lit: 0,
  depth: 1,
  normal: 2,
};

const PARAMS = {
  view: 'lit' as ViewMode,
  lightX: 0.35,
  lightY: 0.2,
  lightZ: 0.9,
  intensity: 1.2,
  radius: 1.6,
  falloff: 2,
  ambient: 0.6,
  shininess: 48,
  specular: 0.35,
  depthScale: 0.25,
  blur: 4,
  invert: false,
  shadow: true,
  color: '#ffc9a0',
};

export class App extends Three {
  private readonly camera: OrthographicCamera;
  private readonly quad!: THREE.Mesh;
  private readonly depthTarget: THREE.WebGLRenderTarget;
  private readonly normalTarget: THREE.WebGLRenderTarget;
  private readonly depthMaterial: THREE.ShaderMaterial;
  private readonly normalMaterial: THREE.ShaderMaterial;
  private readonly relightMaterial: THREE.ShaderMaterial;
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly lightColor = new THREE.Color();
  private readonly uvScale = new THREE.Vector2(1, 1);
  private readonly pointerAbort = new AbortController();
  private readonly pane: Gui;

  private imageAspect = 1;
  private dragging = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.camera = new OrthographicCamera({ left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10 });
    this.camera.position.z = 1;

    const { width, height } = this.size;
    this.depthTarget = this.createTarget(width, height);
    this.normalTarget = this.createTarget(width, height);

    const placeholder = this.createPlaceholder();
    this.depthMaterial = this.createDepthMaterial(placeholder);
    this.normalMaterial = this.createNormalMaterial();
    this.relightMaterial = this.createRelightMaterial(placeholder);

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.relightMaterial);
    this.scene.add(this.quad);

    this.pane = this.createGui();

    this.resize();
    this.bindPointer();
    this.loadTexture();

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private createTarget(width: number, height: number) {
    const target = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    target.texture.colorSpace = THREE.NoColorSpace;
    return target;
  }

  private createPlaceholder() {
    const texture = new THREE.DataTexture(new Uint8Array([190, 170, 160, 255]), 1, 1);
    texture.colorSpace = THREE.NoColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  private createDepthMaterial(albedo: THREE.Texture) {
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: depthFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uAlbedo: { value: albedo },
        uUvScale: { value: this.uvScale },
        uTexel: { value: new THREE.Vector2(1 / this.size.width, 1 / this.size.height)},
        uBlur: { value: PARAMS.blur },
        uInvert: { value: PARAMS.invert ? 1 : 0 },
      },
    });
  }

  private createNormalMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: normalFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uDepth: { value: this.depthTarget.texture },
        uTexel: { value: new THREE.Vector2(1 / this.size.width, 1 / this.size.height) },
        uDepthScale: { value: PARAMS.depthScale },
        uAspect: { value: this.size.aspect }
      },
    })
  }

  private createRelightMaterial(albedo: THREE.Texture) {
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: relightFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uDepth: { value: this.depthTarget.texture },
        uNormal: { value: this.normalTarget.texture },
        uAlbedo: { value: albedo },
        uUvScale: { value: this.uvScale },
        uAspect: { value: this.size.aspect },
        uDepthScale: { value: PARAMS.depthScale },
        uLightPos: { value: new THREE.Vector3(PARAMS.lightX, PARAMS.lightY, PARAMS.lightZ) },
        uLightColor: { value: new THREE.Color(PARAMS.color) },
        uLightIntensity: { value: PARAMS.intensity },
        uLightRadius: { value: PARAMS.radius },
        uFalloff: { value: PARAMS.falloff },
        uAmbient: { value: PARAMS.ambient },
        uShininess: { value: PARAMS.shininess },
        uSpecular: { value: PARAMS.specular },
        uCameraPos: { value: new THREE.Vector3(0, 0, 2) },
        uShadow: { value: PARAMS.shadow ? 1 : 0 },
        uView: { value: VIEW_MODE[PARAMS.view] },
      },
    })
  }

  private bindPointer() {
    const signal = this.pointerAbort.signal;
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (event) => {
      this.dragging = true;
      this.moveLight(event);
    }, { signal });

    window.addEventListener('pointermove', (event) => {
      if (!this.dragging) return;
      this.moveLight(event);
    }, { signal });

    window.addEventListener('pointerup', () => {
      this.dragging = false;
    }, { signal });

    window.addEventListener('resize', () => {
      this.resize();
    }, { signal });
  }

  private loadTexture() {
    this.textureLoader.load(image, (texture) => {
      this.applyTexture(texture);
    })
  }

  private applyTexture(texture: THREE.Texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    const image = texture.image as { width: number; height: number };
    this.imageAspect = image.width / Math.max(image.height, 1);

    const uniforms = this.relightMaterial.uniforms;
    const previous = uniforms.uAlbedo?.value as THREE.Texture;
    uniforms.uAlbedo!.value = texture;
    this.depthMaterial.uniforms.uAlbedo!.value = texture;
    if (previous !== texture) previous.dispose();

    this.updateCover();
  }

  private updateCover() {
    const [x, y] = this.getCoverScale(this.imageAspect);
    this.uvScale.set(x, y);
  }

  private moveLight(event: PointerEvent) {
    const uvx = event.clientX / window.innerWidth;
    const uvy = 1 - event.clientY / window.innerHeight;
    PARAMS.lightX = (uvx - 0.5) * this.size.aspect;
    PARAMS.lightY = uvy - 0.5;
    this.pane.refresh();
  }

  private syncUniforms() {
    const uniforms = this.relightMaterial.uniforms;
    const lightPos = uniforms.uLightPos?.value as THREE.Vector3;
    const lightColor = uniforms.uLightColor?.value as THREE.Color;

    lightPos.set(PARAMS.lightX, PARAMS.lightY, PARAMS.lightZ);
    lightColor.copy(this.lightColor.set(PARAMS.color));
    uniforms.uLightIntensity!.value = PARAMS.intensity;
    uniforms.uLightRadius!.value = PARAMS.radius;
    uniforms.uFalloff!.value = PARAMS.falloff;
    uniforms.uAmbient!.value = PARAMS.ambient;
    uniforms.uShininess!.value = PARAMS.shininess;
    uniforms.uSpecular!.value = PARAMS.specular;
    uniforms.uDepthScale!.value = PARAMS.depthScale;
    uniforms.uShadow!.value = PARAMS.shadow ? 1 : 0;
    uniforms.uView!.value = VIEW_MODE[PARAMS.view];

    this.depthMaterial.uniforms.uBlur!.value = PARAMS.blur;
    this.depthMaterial.uniforms.uInvert!.value = PARAMS.invert ? 1 : 0;

    this.normalMaterial.uniforms.uDepthScale!.value = PARAMS.depthScale;
  }

  private createGui() {
    const pane = new Gui();
    pane.addBinding(PARAMS, 'view', {
      options: {
        Lit: 'lit',
        Depth: 'depth',
        Normal: 'normal',
      },
    });
    const light = pane.addFolder({ title: 'Light' });
    light.addBinding(PARAMS, 'lightX', { min: -1.5, max: 1.5 });
    light.addBinding(PARAMS, 'lightY', { min: -1, max: 1 });
    light.addBinding(PARAMS, 'lightZ', { min: 0.2, max: 2 });
    light.addBinding(PARAMS, 'intensity', { min: 0, max: 4 });
    light.addBinding(PARAMS, 'radius', { min: 0.2, max: 4 });
    light.addBinding(PARAMS, 'falloff', { min: 0.2, max: 4 });
    light.addBinding(PARAMS, 'color', { view: 'color' });
    const shading = pane.addFolder({ title: 'Shading' });
    shading.addBinding(PARAMS, 'ambient', { min: 0, max: 1.5 });
    shading.addBinding(PARAMS, 'shininess', { min: 1, max: 128 });
    shading.addBinding(PARAMS, 'specular', { min: 0, max: 2 });
    shading.addBinding(PARAMS, 'depthScale', { min: 0, max: 3 });
    shading.addBinding(PARAMS, 'blur', { min: 0, max: 16 });
    shading.addBinding(PARAMS, 'invert');
    shading.addBinding(PARAMS, 'shadow');
    return pane;
  }

  private animate() {
    this.syncUniforms();

    this.quad.material = this.depthMaterial;
    this.renderer.setRenderTarget(this.depthTarget);
    this.renderer.render(this.scene, this.camera);

    this.quad.material = this.normalMaterial;
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.render(this.scene, this.camera);

    this.quad.material = this.relightMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const { width, height, aspect } = this.size;
    this.depthTarget.setSize(width, height);
    this.normalTarget.setSize(width, height);
    (this.depthMaterial.uniforms.uTexel!.value as THREE.Vector2).set(1 / width, 1 / height);
    (this.normalMaterial.uniforms.uTexel!.value as THREE.Vector2).set(1 / width, 1 / height);
    this.normalMaterial.uniforms.uAspect!.value = aspect;
    this.relightMaterial.uniforms.uAspect!.value = aspect;
    (this.normalMaterial.uniforms.uTexel!.value as THREE.Vector2).set(1 / width, 1 / height);
    this.updateCover();
  }
}

const app = new App(document.getElementById('webgl') as HTMLCanvasElement);

window.addEventListener('beforeunload', () => {
  app.dispose();
});
