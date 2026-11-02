precision mediump float;

varying vec2 vUv;

uniform sampler2D uAlbedo;
uniform vec2 uUvScale;
uniform vec2 uTexel;
uniform float uBlur;
uniform float uInvert;

float luma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 photoUv = clamp((vUv - 0.5) * uUvScale + 0.5, 0.0, 1.0);
  vec2 stepUv = uTexel * uUvScale * max(uBlur, 0.0);

  float sum = 0.0;
  float weight = 0.0;

  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      float w = max(1.0 - length(vec2(float(x), float(y))) / 4.0, 0.0);
      vec2 uv = photoUv + stepUv * vec2(float(x), float(y));
      sum += luma(texture2D(uAlbedo, uv).rgb) * w;
      weight += w;
    }
  }

  float height = sum / weight;
  height = mix(height, 1.0 - height, uInvert);
  gl_FragColor = vec4(height, 0.0, 0.0, 1.0);
}