/** 

    License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
    
    Shader Advent - Day 14
    Linear Interpolation
    
    12/14/2024 @byt3_m3chanic
    
*/

// Basic Uniform Definitions
#define R           iResolution
#define T           iTime
#define M           iMouse
#define PI          3.14159265
#define PI2         6.28318530

// Global Variables.
// I try to place  these at the top as they will get
// set in our main() and then be available to the 
// rest of our functions at that value.
float tspeed=0., tmod=0., ga1=0., ga2=0., ga3=0., ga4=0.;

// Standard rotation / hash 2 to 1 functions
mat2 rot(float a) {return mat2(cos(a),sin(a),-sin(a),cos(a));}
float hash21(vec2 a) {return fract(sin(dot(a,vec2(27.609,57.583)))*43758.5453);}

// Our timing functions
float lerp (float b, float e, float t) { return clamp((t - b) / (e - b), 0., 1.); }
float eoc (float t) { return (t = t-1.)*t*t+1.; }
float eic (float t) { return  t*t*t; }

// Main Image Loop
void mainImage( out vec4 O, in vec2 F ) {
    
    // Set the speed of animation
    tspeed = T*.5;
    
    // Create a modlus version of time that
    // will trigger our items on screen
    // this should be a value high enough to
    // cover the ID's in the grid on screen.
    tmod = mod(tspeed,10.);
 
    // Circle Truchet Code
    vec3 C = vec3(.02);
    vec2 uv = (2.*F-R.xy)/max(R.x,R.y);
    
    const float scale = 6.;
    uv*=scale;
    uv+=vec2(.5);
    
    float px = fwidth(uv.x); 
    
    vec2 id = floor(uv), q = fract(uv)-.5;
    float rnd = hash21(id.xy);

    // main truchet pattern
    if(rnd>.5) q.y = -q.y;
    rnd = fract(rnd*32.27);
    
    vec2 u2 = vec2(length(q-.5),length(q+.5));
    vec2 q2 = u2.x<u2.y ? q-.5 : q+.5;
    
    float thickness = .1275;
    float d1 = abs(length(q2)-.5)-thickness;
    float d3 = length(q)-.5;
    
    if(rnd>.85) d1 = min(length(q.x)-thickness,length(q.y)-thickness);

    d1=max(d1,d3);

    // color mixdown
    vec3 clr = vec3(.23);
    vec3 clx = vec3(.0);
    
    C = mix(C,clr,smoothstep(px,-px,d3));
    C = mix(C,clx,smoothstep(px,-px,d1));

    // gamma and output
    C = pow(C,vec3(.4545));
    O = vec4(C,1.);
}
