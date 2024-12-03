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

const float TEETH_SIZE = 0.05;

float gear(float angle,vec2 uv,float wheels,inout vec4 prevGear){
    float radius = wheels / 50.;
    float prev_radius = prevGear.z / 50.;
    vec2 offset = vec2(cos(angle),sin(angle)) * (prev_radius + radius + .01 + TEETH_SIZE);

    vec4 gear;
    gear.xy = prevGear.xy + offset;
    gear.z = wheels;
    gear.w = -(prevGear.w + angle * prevGear.z) - PI - (PI + angle) * wheels;

    vec2 pos = uv - gear.xy;
    float r = length(pos);
    float a = atan(pos.y,pos.x);
    float f = smoothstep(-.5,.5,cos(a * wheels + gear.w)) * TEETH_SIZE + radius;

    prevGear = gear;

    return (1. - smoothstep(f , f + .002f,r)) * step(radius - TEETH_SIZE * 1.2,r);
}

vec3 animation(vec2 uv,float t) {

    if (length(uv)>1.)
        return vec3(1.);
    vec4 prevGear;
    vec3 col = vec3(0);
    uv = uv/1.4;
    float b = 5.;
    vec3 c = vec3(1.7);
    vec3 p = vec3(0);
    float angle = 4.3 + PI;
    uv *= mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
    for (int i=0;i<10;i++) {
        prevGear.xy = vec2(0);
        prevGear.z = 15.;
        prevGear.w = t * 2. * PI;
        p = max(p,c * gear(0.,uv,10.,prevGear));
        p = max(p,c * gear(1.4,uv,6.,prevGear));
        p = max(p,c * gear(3.2,uv,6.,prevGear));
        p = max(p,c * gear(1.5,uv,7.,prevGear));
        p = max(p,c * gear(3.4,uv,8.,prevGear));
        p = max(p,c * gear(4.2,uv,9.,prevGear));
        p = max(p,c * gear(2.3,uv,6.,prevGear));
        p = max(p,c * gear(4.,uv,7.,prevGear));
        p = max(p,c * gear(4.3,uv,5.,prevGear));
        p = max(p,c * gear(5.7,uv,10.,prevGear));
        p = max(p,c * gear(4.8,uv,6.,prevGear));
        p = max(p,c * gear(6.,uv,8.,prevGear));
        p = max(p,c * gear(1.2,uv,9.,prevGear));
        p = max(p,c * gear(-0.7,uv,5.,prevGear));
        p = max(p,c * gear(-0.2,uv,6.,prevGear));
        p = max(p,c * gear(0.76,uv,8.,prevGear));
        uv = uv*1.2;
        c *= vec3(0.75,0.5,0.7);
        float angle = float(i)+4.5;
        uv *= mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
    }

    p = pow(p,vec3(2.2));

    return p;
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
