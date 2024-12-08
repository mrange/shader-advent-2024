// For GLSL / python version
#version 330
uniform vec2 iResolution;
uniform float iTime;
uniform int iMode;
out vec4 fragColor;

// For ShaderToy version, replace the previous lines with:
//
// const int iMode = 0;
//
// iMode can be:
//   0: previewing rotating foreground against background
//   1: background print
//   2: foreground print
//   3: original animation from which the background is generated
//   4: blends between all the different modes
#define AA 4 // antialiasing, each pixel is sampled from AA * AA points
const float RINGS = 50.; // how many rings there are in the foreground spiral
const float REPSPERROUND = 16.; // how many arms there are in the foreground spiral
const float PI = acos(-1.);
const float DUTYCYCLE = 0.3; // what amount of the foreground is transparent
const float LINEWIDTH = 0.002; // the width of the cutting lines for the background
const float PRINTSIZE = 145.; // nominal print size of the background, in mm
const float HOLESIZE = 3.; // size of the center hole, in mm
const float FGSIZE = 139.2; // diameter of the foreground, in mm
const float MINDIST = .00001;
const float MAXDIST = 125.;
const int MAXSTEP = 160;

vec3 glow;

#define r2(a)mat2(cos(a),sin(a),-sin(a),cos(a))

void pModTorus(inout vec3 p,float t, float r0, float n,float m) {
    float ksi = atan(p.y, p.x);
    p.xy -= r0 * vec2(cos(ksi),sin(ksi));
    float q = dot(p.xy,vec2(cos(ksi),sin(ksi)));
    float theta = atan(p.z,q);
    float r = length(vec2(p.z,q));
    float an = 2.*PI/n;
    float am = 2.*PI/m;
    theta += sin(ksi*3.+sin(ksi*2.));
    theta = mod(theta+4.+an/2.,an)-an/2.;
    ksi = mod(ksi+t*am+am/2.,am)-am/2.;
    p.x = (r0 + r*cos(theta))*cos(ksi);
    p.y = (r0 + r*cos(theta))*sin(ksi);
    p.z = r*sin(theta);
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xy)-t.x,p.z);
  return length(q)-t.y;
}

vec3 rep3(vec3 p, float r)
{
    return mod(p+r,2.*r)-r;
}

float sdSphere( vec3 p, float r)
{
  return length(p) - r;
}

float sdBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) +
         length(max(d,0.0));
}

float box(vec3 p, vec3 s){
    vec3 d = abs(p)-s;
    return max(d.x,max(d.y,d.z));
}

vec2 map(vec3 p,float t) {
    float s = sdTorus(p,vec2(1,0.5));
    glow += 0.00002/(0.01+s*s)*vec3(1,1,10);
    pModTorus(p,t,1.,4.,20.);
    float r = sdSphere(p-vec3(1.5,0,0),.2);
    glow += 0.00005/(0.0005+r*r)*(0.3+0.5*cos(vec3(1.,2,3)+p.z*5.));
    return vec2(min(r,s),1.);
}

vec3 animation(vec2 uv,float t) {
    if (length(uv)>1.)
        return vec3(1.);

    vec3 rd = normalize(vec3(uv,0.9));

    vec3 ro = vec3(0,0,-2.);
    vec3 pos;
    float d;
    vec2 m;
    glow = vec3(0);

    for(int i=0; i<MAXSTEP; i++) {
        pos = ro + rd*d;
        m = map(pos,t);
        d += m.x/3.;
        if (abs(m.x)<d*MINDIST || d>MAXDIST) {
            break;
        }
    }

    return pow(vec3(glow),vec3(0.5454));
}
float phase(vec2 uv) {
    return REPSPERROUND*atan(uv.y,uv.x)/2./PI + RINGS*length(uv);
}

vec3 background(vec2 uv) {
    // add cutting aides & marks
    if (length(uv-.72)<.01)
        return vec3(0.);
    if (length(uv-vec2(.76,.69))<.02)
        return vec3(0.);
    if (abs(max(abs(uv.x),abs(uv.y))-1.)<LINEWIDTH)
        return vec3(0.);
    if (length(uv)<HOLESIZE/PRINTSIZE)
        return vec3(1.);

    // generate background print by slicing the animation
    return animation(uv,phase(uv));
}

vec3 foreground(vec2 uv,float t) {
    // add cutting aides & marks
    float maskrad = FGSIZE/PRINTSIZE;
    if (length(uv/maskrad-.72)<.01)
        return vec3(0.);
    if (length(uv/maskrad-vec2(.76,.69))<.02)
        return vec3(0.);
    if (length(uv)>maskrad)
        return vec3(1.);
    if (length(uv)<HOLESIZE/PRINTSIZE)
        return vec3(1.);

    // generate foreground spiral
    float k = mod(phase(uv)-t,1.);
    if (k > DUTYCYCLE)
        return vec3(0.);
    return vec3(1.);
}

// For ShaderToy, replace the following two lines with:
// void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
void main() {
    vec4 fragCoord = gl_FragCoord;

    vec3 col;

    // we'll take the modulus, to make it easy to see that the animation
    // really loops
    float t = mod(iTime,1.);

    for (int x=0;x<AA;x++) {
        for (int y=0;y<AA;y++) {
            vec2 uv = ((fragCoord.xy+vec2(x,y)/float(AA))*2.-iResolution.xy)/iResolution.y;
            switch (iMode) {
                default:
                    col += foreground(uv,t) * background(uv);
                    break;
                case 1:
                    col += background(uv);
                    break;
                case 2:
                    col += foreground(uv,t);
                    break;
                case 3:
                    col += animation(uv,t);
                    break;
                case 4:
                    int step = int(iTime / 5.) % 4;
                    float alpha = fract(iTime / 5.);
                    alpha = 1./(1. + exp(-(alpha-.5)*30.));
                    col += step == 0 ? mix(background(uv),foreground(uv,t),alpha) :
                           step == 1 ? mix(foreground(uv,t),foreground(uv,t) * background(uv),alpha) :
                           step == 2 ? mix(foreground(uv,t) * background(uv),animation(uv,t),alpha) :
                                       mix(animation(uv,t),background(uv),alpha);

            }
        }
    }
    fragColor = vec4(col/float(AA*AA),1.);
}
