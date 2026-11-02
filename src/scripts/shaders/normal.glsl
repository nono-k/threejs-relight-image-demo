precision mediump float;

varying vec2 vUv;

uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uDepthScale;
uniform float uAspect;

void main() {
  vec2 uv = vUv;

  float dL = texture2D(uDepth, uv - vec2(uTexel.x, 0.0)).r;
  float dR = texture2D(uDepth, uv + vec2(uTexel.x, 0.0)).r;
  float dD = texture2D(uDepth, uv - vec2(0.0, uTexel.y)).r;
  float dU = texture2D(uDepth, uv + vec2(0.0, uTexel.y)).r;

  float dx = (dR - dL) * uDepthScale;
  float dy = (dU - dD) * uDepthScale;
  float sx = 2.0 * uTexel.x * uAspect;
  float sy = 2.0 * uTexel.y;

  vec3 normal = normalize(vec3(-dx / sx, -dy / sy, 1.0));
  gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
}