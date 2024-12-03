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
const float DUTYCYCLE = 0.2; // what amount of the foreground is transparent
const float LINEWIDTH = 0.002; // the width of the cutting lines for the background
const float PRINTSIZE = 145.; // nominal print size of the background, in mm
const float HOLESIZE = 3.; // size of the center hole, in mm
const float FGSIZE = 139.2; // diameter of the foreground, in mm

const float RAD = 0.13;
const float ZMIN = 1.4;
const float ZMAX = 10.;
const int BALLS = 400;

float snowball(vec2 uv,float t,float z) {
    t += z*100.1247987;
    uv.y += t;
    float p = floor(uv.y)-t;
    uv.x -= cos(p+z*300.+sin(p*1.3+cos(p*1.6)))*.2;
    uv.y = mod(uv.y,1.)-.5;
    uv /= RAD;
    return max(1.-dot(uv,uv),0.);
}

vec3 hash13( uint n )
{
    // integer hash copied from Hugo Elias
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    uvec3 k = n * uvec3(n,n*16807U,n*48271U);
    return vec3( k & uvec3(0x7fffffffU))/float(0x7fffffff);
}

const int STEPS = 20;
const float BIG = 403.;
const float BIGZ = BIG/384.*2.;
const int ITERS = 12;
const float MINDIST = .0001;
const float CAM_X = 7.96;
const float CAM_Y =.5;
const float CAM_Z = 37.1;
const float LEVEL = 1.;
const float XMULT = 1.5;
const float COLORMULT = 3.4;
const float COLORSCALE = 0.0269857728183;
const float XDIV = 2.0006;
const float RSCALE = pow(2.,1./3.); // this doesn't actually have to be exactly this number
const float RDIV = pow(RSCALE,float(ITERS));
const float GLOWAMOUNT = 0.0449857728183;
const float GLOWDECAY = 1e4;

// the background is copy-pasted from balrog, a 256b executable graphics
// https://github.com/vsariola/balrog/
vec3 bg(vec2 uv) {
    vec2 ray = uv;
    ray.y = -ray.y;
    ray.xy *= vec2(25,200); // this is actually what we have on DOS: the screen coordinates

    vec3 p = vec3(CAM_X,CAM_Y,CAM_Z);
    int i;
    float glow = 0.0;

    for(i = 0; i < STEPS; i++) {

       vec3 t = p;
       // o is the amount of rotation in the kaleidoscopic IFS. we vary it depending on the point
       // in space
       float o = cos(p.x*XMULT)/XDIV;
       float r = 0.;

       // r is the weird part: instead of length(t) or length(t)^2, we compute "cumulative r-squared"
       // which is RSCALE^(ITERS-1)*t[0].x^2 + ... + RSCALE*t[ITERS-2].x^2 + t[ITERS-1].x^2
       // Looks like some euclidian distance still. RSCALE was added because otherwise the noisy
       // later iterations made the whole thing look like a mess.
       for(int j=0;j<ITERS;j++){
          t.x = abs(t.x - round(t.x)); // abs is folding, t.x - round(t.x) is domain repetition
          t.x += t.x; // domain scaling
          r *= RSCALE;
          r += t.x*t.x;
          t.xyz = t.yzx; // shuffle coordinates so next time we operate on previous y etc.
          t.x += t.z * o; // rotation, but using very poor math
          t.z -= t.x * o;
       }

       float dist = sqrt(r/RDIV)-LEVEL;  // this is something like a SDF of a ball
       glow += GLOWAMOUNT/(1.+dist*dist*GLOWDECAY); // add some glow every step

       p.xy += ray.xy * dist/BIG; // the math emulates what are actually doing on DOS
       p.z += dist/BIGZ;
       if (dist < MINDIST) break;
    }

    float s =  float(i)*COLORSCALE;

    vec3 col = vec3(s*s)+cos(p*COLORMULT)*glow; // s*s to adjust the contrast
    // clamping colors on DOS is very expensive so we do abs(sin(...)) to get to 0..1 range
    return abs(sin(col));
}

vec3 animation(vec2 uv,float t) {
    if (length(uv)>1.)
        return vec3(1.);

    float c;
    for (int i = 0;i < BALLS;i++) {
        vec3 p = hash13(uint(i*204+6600));
        p.z = ZMIN + sqrt(p.z) * (ZMAX-ZMIN);
        float s = snowball(uv*p.z+(p.xy*2.2-1.1)*p.z,t,p.z);
        c += exp(-p.z*.7+.8)*s;
    }
    return vec3(.8,.9,1.)*c+bg(uv);
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
