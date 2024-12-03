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

vec2 hash( vec2 p )
{
    p = vec2(dot(p,vec2(127.1,311.7)),
             dot(p,vec2(269.5,183.3)));
    return fract(sin(p)*18.5453);
}

// return distance, and cell id
vec2 voronoi( in vec2 x ) {
    x.x = mod(x.x*12.,12.);
    vec2 n = vec2(floor( x.x)+floor(x.y),0);
    vec2 f = fract( x );

	vec3 m = vec3( 8.0 );
    for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ )
    {
        vec2  g = vec2( float(i), float(j) );
        vec2  g2 = vec2( float(i+j), 0.);
        vec2  o = hash( mod(n + g2,12.) );
	    vec2  r = g - f + (0.5+0.5*sin(3.*o-.1));
		float d = dot( r, r );
        if( d<m.x )
            m = vec3( d, o );
    }

    return vec2( sqrt(m.x), m.y+m.z );
}

// we're going to raymarch to this distance field. Returns vec4(color,distance)
vec4 map(vec3 p,float t) {
    float u = atan(p.y,p.x)/PI;
    float v = p.z*4.;
    vec2 q = voronoi(vec2(u-t/12.,v+t));
    vec3 col = 0.6 + 0.4*cos( u*PI + vec3(0.0,.5,1.)+v);
    col *= vec3(1. - clamp(1.0 - 2.*q.x*q.x,0.0,1.0)) * 7.;
    return vec4(col,1.-length(p.xy)-q.x/3.);
}

vec3 animation(vec2 uv,float t) {
    if (length(uv)>1.)
        return vec3(1.);
    vec3 o = vec3(0,0,-5);
    vec3 r = normalize(vec3(uv,.5));
    vec3 col = vec3(0.);
    float d=0.;
    for (int i=0;i<70;i++) {
        vec4 m = map(o + d*r,t);
        if (m.w<.001) {
            col = m.xyz * pow(2.,-d);
            break;
        }
        d += m.w;
    }
    return col;
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
