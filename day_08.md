## Demystification of つぶやきGLSL
Hello all for this new Shader Advent Calendar 2024 ! 

If you are following the shader scene you might probably encountered theses productions, usually tagged with #つぶやきGLSL where people create things in less than 280 characters. つぶやき actually means "tweet" so it's litterally "tweet GLSL".

Most reaction are extatic, and it's right as it's a real challenge to fit complex generated graphics within few characters.

But you know what ? As paradoxal it seems, theses productions are an excellent way to learn shader. Why ? Because the limitation of characters impose a hard limit on the number of effect applicable, which means usualy, the productions are focused on 1 or 2 "simplified" effects. 

Of course, as it is, most of production are almost unreadable and looks magical to most of us. But today, I want to use one #つぶやきGLSL production and show you few step to unroll such code so that you are not afraid anymore and can understand what is going on, and you could reuse it later.

As an example, I'll take a production from @zozuar : https://twigl.app/?ol=true&ss=-NqUk6pcpkcFek1iupHp
## Twigl

Before jumping to code, I need also to introduce briefly the website twigl. To keep it simple it's a alternative to Shadertoy, but has been extensively used in the sizecoding of fragment shader code for #つぶやきGLSL .
The source code is in github here https://github.com/doxas/twigl . There is 2 important points to notice :
- Twigl have multiple mode that define multiple level of size coding. Usually the mode `GEEKEST` is prefered as it drastically reduce the boilerplate code to minimal character needed. Also, most of uniform variable will be available as one characters name.  
- Twigl have some method, like `rotate2D` or `fnoise`, already defined here https://github.com/doxas/twigl/tree/969491b285ba217fd895132a466ee6b3128243f3?tab=readme-ov-file#glsl-snippets-in-geekest-mode which help a lot to keep your code small.
## Let's Check !

So we start with this :
```glsl
for(float e,i,a,w,x,g,h;i++<90.;o+=.01-.02/exp(max(s,e)*3e3)/h){vec3 p=vec3((FC.xy-.5*r)/r.y*g+2.,g);p.zy*=rotate2D(.5);e=p.y;h=e+p.x*.3;p.z+=t;for(a=.6;a>.001;a*=.7)p.xz*=rotate2D(5.),x=(p.x+p.z)/a+t+t,e-=w=exp(sin(x)-3.)*a,h+=abs(dot(sin(p.xz/a*.3)*a,r/r));g+=e=min(e,h*.5-1.);}
```
## Unroll the code

When doing so, I advise you use the twigl interface to see that you didn't break by accident the code :D

The code as oneliner is impressive, but let's try to add line break and reformat code so it starts to be more readable.
So let's do a linter job and add linebreak when we see a `;` and try to manage indentaion with the `{ .. }`
```glsl
for(float e,i,a,w,x,g,h;i++<90.;o+=.01-.02/exp(max(s,e)*3e3)/h) { 
  vec3 p=vec3((FC.xy-.5*r)/r.y*g+2.,g);
  p.zy*=rotate2D(.5);
  e=p.y;
  h=e+p.x*.3;
  p.z+=t;
  for(a=.6;a>.001;a*=.7)p.xz*=rotate2D(5.),x=(p.x+p.z)/a+t+t,e-=w=exp(sin(x)-3.)*a,h+=abs(dot(sin(p.xz/a*.3)*a,r/r));
  g+=e=min(e,h*.5-1.);
}
```

Ok we see better what's going on. The first `for` is the raymarching loop and everything is compact using the for loop mechanism to save some space : 
- It initalize a bunch of variables that will be needed.
- The iteration is controlled by `i` and each time the loop execute its conditional branch, it will increase the variable `i` and check if it's under `90`
- Normaly, the last branch of the `for` loop is usually used for incrementing your loop variable, but nothing forbid you to increment any value. Here `o` is the output value, so the color of the shader that we "accumulate". 

Let's jump to the 2nd `for` loop. As it doesn't contains `{}` only the next statement will be executed within the loop. But here, the statement is a set of multiple variable affection command separated by `,`.

Also notice the `r/r`. It's not an error and can feels weird at first sight. Notice that it's used within a `dot` product with `vec2`. Turns out it's one of the most effective way, in numbers of character, to define `vec2(1.)`. 

Knowing theses tricks, we could iterate our formating to this

```glsl
for(float e,i,a,w,x,g,h;i<90.;i++)
{
  vec3 p=vec3((FC.xy-.5*r)/r.y*g+2.,g); 
  p.zy*=rotate2D(.5);                   
  e=p.y;                               
  h=e+p.x*.3;
  p.z+=t;                               
  for(a=.6;a>.001;a*=.7) {              
    p.xz*=rotate2D(5.);
    x=(p.x+p.z)/a+t+t;
    e-=w=exp(sin(x)-3.)*a;
    h+=abs(dot(sin(p.xz/a*.3)*a,vec2(1.)));
    
  }                                   
  g+=e=min(e,h*.5-1.);                 
  o+=.01-.02/exp(max(s,e)*3e3)/h;      
}
```

If you know a little bit shader coding, it's starts to make sense. If it doesn't, the code is much more readable for you to start learning from example :) .
### Usual variable name 
Let's identify the common variables and their usage.

**Twigl bounded**
- `r` is the resolution
- `o` is the output color
- `t` is time
**Other variable**
- `e` is the current distance of the point to the sdf
- `i` is the current ray marching loop index
- `g` is the global distance of the ray
- `p` is the current coordinate

Other are situational variable needs.
Knowing this we can start understand the code. I will comment each line to explain what is going on. 


```glsl
for(float e,i,a,w,x,g,h;i<90.;i++) // Ray marching loop
{
  vec3 p=vec3((FC.xy-.5*r)/r.y*g+2.,g);  // Define the position of ray
  p.zy*=rotate2D(.5);  // Tilt the camera to slightly look down                  
  e=p.y;              // define a plane that will be at y = 0, it's the 'sea'
  h=e+p.x*.3;         // define another plane that will be slightly tilted on x axis , it's the "mountain"
  p.z+=t;             // move the camera forward                              
  for(a=.6;a>.001;a*=.7) { // Kind of fbm https://iquilezles.org/articles/fbm/ to generate noise       
    p.xz*=rotate2D(5.); // Shuffling the space, purely for randomness
    x=(p.x+p.z)/a+t+t; // Yet again shuffling but that evolves with time, it's the "wave" effect on the sea 
    e-=w=exp(sin(x)-3.)*a; // Adding the wave effect to our `sea` plane 
    h+=abs(dot(sin(p.xz/a*.3)*a,vec2(1.))); // Adding `mountain`
    
  }                                   
  g+=e=min(e,h*.5-1.); // Union of the 2 sdfs        
  o+=.01-.02/exp(max(s,e)*3e3)/h; // Computing light and accumulating to the output color     
}
```

If you're new to shader, this might feel steep, but it's also great because it's extermely condensed information to understand base of concept like ray marching loop. As I previously said, don't be afraid to manipulate the code, remove line, change constant value, so you can see what part of the code is affecting what part of the effect.

### Portage to Shadertoy / Bonzomatic
To reuse the code into another platform, like shadertoy or bonzomatic, one simple approach is to override with a bunch of `#define` the common variable like resolution, output color or time. Usually it's sufficient, then you can properly substitute the variables.
```glsl
// Example for Bonzomatic 
#define t fGlobalTime
#define FC gl_FragCoord
#define r v2Resolution
#deifine o out_color

// Rest of the code 
[...]
```

One note thow, there is subtilities between "Native OpenGL" (Bonzomatic) and "WebGL" (Twigl, Shadertoy). I don't know all of them, but in our case, the initalization of parameters are by default 0 on webgl **but** undefined on opengl. Which mean you need to explicitly initialize all variables declared to 0 if you want a proper portage to "Native OpenGL".
```glsl
// From our example
for(float e=0.,i=0.,a=0.,w=0.,x=0.,g=0.,h=0.;i<90.;i++) // Necessary
{ ... }
```


## That's it !
We demystified the code and even found an optimisation as the `w` looks having not particular effect :) 

You can now repeat the process on other productions ! Notable artists like [yonatan](https://x.com/zozuar) [Yohei Nishitsuji](https://x.com/YoheiNishitsuji),  [kishimisu](https://x.com/kishimisu/) or [Kamoshika](https://x.com/kamoshika_vrc) are extremely prolific in this category. Of course, each artist has its own way and some shader might take more time to understand, but that's with the practice that you will learn how to decode faster and understand more things ! 

With this, you are now ready to train for maybe more livecode events ? But this will be another story later in the month .... ;) 
