precision mediump float;

varying vec2 vUv;
uniform sampler2D uDepth;
uniform sampler2D uNormal;
uniform sampler2D uAlbedo;
uniform vec2 uUvScale;
uniform float uAspect;
uniform float uDepthScale;
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform float uLightRadius;
uniform float uFalloff;
uniform float uAmbient;
uniform float uShininess;
uniform float uSpecular;
uniform vec3 uCameraPos;
uniform float uShadow;
uniform float uView;

float occlusionOf(vec3 pos, float dist, vec3 dir) {
  if (uShadow < 0.5) return 1.0;

  for (int i = 1; i <= 16; i++) {
    vec3 p = pos + dir * (dist * float(i) / 16.0);
    vec2 uv = vec2(p.x / uAspect + 0.5, p.y + 0.5);

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;

    float sceneZ = texture2D(uDepth, uv).r * uDepthScale;
    if (sceneZ > p.z + 0.02) return 0.45;
  }

  return 1.0;
}

void main() {
  vec2 uv = vUv;

  if (uView > 1.5) {
    gl_FragColor = vec4(texture2D(uNormal, uv).rgb, 1.0);
    return;
  }

  if (uView > 0.5) {
    float d = texture2D(uDepth, uv).r;
    gl_FragColor = vec4(vec3(d), 1.0);
    return;
  }

  float depth = texture2D(uDepth, uv).r;
  vec3 pos = vec3((uv - 0.5) * vec2(uAspect, 1.0), depth * uDepthScale);
  vec3 normal = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);

  vec2 photoUv = clamp((uv - 0.5) * uUvScale + 0.5, 0.0, 1.0);
  vec3 albedo = texture2D(uAlbedo, photoUv).rgb;

  vec3 toLight = uLightPos - pos;
  float dist = length(toLight);
  vec3 lightDir = toLight / max(dist, 0.0001);
  float atten = pow(clamp(1.0 - dist / uLightRadius, 0.0, 1.0), uFalloff);
  float shadow = occlusionOf(pos, dist, lightDir);

  float wrap = clamp(dot(normal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
  wrap *= wrap;

  vec3 viewDir = normalize(uCameraPos - pos);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(clamp(dot(normal, halfDir), 0.0, 1.0), uShininess);

  vec3 color = albedo * uAmbient;
  color += albedo * uLightColor * wrap * uLightIntensity * atten * shadow;
  color += uLightColor * spec * uSpecular * atten * shadow;

  float bulb = smoothstep(0.035, 0.0, length(uLightPos.xy - pos.xy));
  color = mix(color, uLightColor, bulb);

  gl_FragColor = vec4(color, 1.0);

  #include <colorspace_fragment>
}