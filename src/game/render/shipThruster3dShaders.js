export const plumeVertex = /* glsl */`
varying vec3 vLocal;
varying vec3 vRay;
varying vec3 vEngine;
void main(){
  mat4 transform = modelViewMatrix * instanceMatrix;
  vLocal = position;
  vRay = -vec3(transform[0].z / dot(transform[0].xyz,transform[0].xyz),
    transform[1].z / dot(transform[1].xyz,transform[1].xyz),
    transform[2].z / dot(transform[2].xyz,transform[2].xyz));
  vEngine = instanceColor;
  gl_Position = projectionMatrix * transform * vec4(position,1.0);
}`;

// Integrate a smooth plasma volume inside a small box. No texture, animated
// atlas, screen-sized buffer or per-frame generated asset is needed.
export const plumeFragment = /* glsl */`
uniform float time;
varying vec3 vLocal;
varying vec3 vRay;
varying vec3 vEngine;
void main(){
  vec3 ray = normalize(vRay);
  vec3 invRay = 1.0 / (ray + vec3(0.000001));
  vec3 t0 = (vec3(-0.5,-0.5,0.0)-vLocal)*invRay;
  vec3 t1 = (vec3(0.5,0.5,1.0)-vLocal)*invRay;
  vec3 nearSide = min(t0,t1), farSide=max(t0,t1);
  float start = max(max(nearSide.x,nearSide.y),nearSide.z);
  float end = min(min(farSide.x,farSide.y),farSide.z);
  float stepSize = max(0.0,end-start)/12.0;
  float density = 0.0;
  vec3 light = vec3(0.0);
  for(int i=0;i<12;i++){
    vec3 p = vLocal + ray*(start+(float(i)+0.5)*stepSize);
    float z=clamp(p.z,0.0,1.0);
    vec2 radial=p.xy-vec2(vEngine.y*z*z*0.35,0.0);
    float pulse=0.91+0.09*cos(z*29.0-time*11.0+vEngine.z*6.28);
    float radius=(0.34*pow(max(0.0,1.0-z),0.68)+0.025)*pulse;
    float r=length(radial)/radius;
    float body=exp(-r*r*3.0)*(1.0-smoothstep(0.72,1.15,r));
    body*=smoothstep(0.0,0.025,z)*(1.0-smoothstep(0.65,1.0,z));
    float hot=exp(-r*r*8.0)*(1.0-smoothstep(0.18,0.85,z));
    vec3 color=mix(vec3(0.03,0.38,1.0),vec3(0.90,0.98,1.0),hot);
    density+=body*stepSize;
    light+=color*body*stepSize;
  }
  float alpha=(1.0-exp(-density*7.0))*smoothstep(0.0,0.12,vEngine.x);
  if(alpha<0.002) discard;
  gl_FragColor=vec4(light/max(density,0.0001)*1.25,alpha);
  #include <colorspace_fragment>
}`;

export const wakeVertex = /* glsl */`
varying vec2 vUv;
varying vec3 vCloud;
void main(){
  mat4 transform=modelViewMatrix*instanceMatrix;
  vec4 center=transform*vec4(0.0,0.0,0.0,1.0);
  center.xy+=position.xy*length(transform[0].xyz);
  vUv=uv;vCloud=instanceColor;
  gl_Position=projectionMatrix*center;
}`;
export const wakeFragment = /* glsl */`
varying vec2 vUv;
varying vec3 vCloud;
void main(){
  vec2 p=(vUv-0.5)*2.0;
  float r=length(p);
  float softness=exp(-r*r*5.5)*(1.0-smoothstep(0.65,1.0,r));
  float alpha=softness*vCloud.x*pow(1.0-vCloud.y,1.8)*smoothstep(0.0,0.09,vCloud.y)*0.32;
  if(alpha<0.001) discard;
  vec3 color=mix(vec3(0.12,0.48,0.95),vec3(0.55,0.85,1.0),1.0-vCloud.y);
  gl_FragColor=vec4(color,alpha);
  #include <colorspace_fragment>
}`;
