precision mediump float;

varying vec2 vUv;
uniform float uTime;

void main() {
  float r = 0.5 + 0.5 * sin(uTime + vUv.x * 10.0);
  float g = 0.5 + 0.5 * sin(uTime + vUv.y * 10.0);
  float b = 0.5 + 0.5 * sin(uTime);
  gl_FragColor = vec4(r, g, b, 1.0);
}