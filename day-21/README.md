#  GLSL to WGSL with Compute Shaders

Ready to unlock the true potential of your GPU? Today, we're diving into the world of WebGPU/WGSL compute shaders with a mesmerizing Mandelbrot fractal for a change. 🌈✨💻😄

![enter image description here](https://i.postimg.cc/BbfXzKD7/iq-fractak.png)

The Mandelbrot set, a famous fractal celebrated for its infinite complexity and self-similarity, can produce visually stunning results. Rendering it efficiently, however, does come with its quirks. We'll be porting a ShaderToy example by the talented Inigo Quilez (iq) that uses "orbit traps" to generate vibrant colors ([https://www.shadertoy.com/view/ldf3DN](https://www.shadertoy.com/view/ldf3DN)).

By moving this shader from GLSL to a WGSL compute shader, we'll not only learn about the nuances of shader porting but also witness a **whopping 70% performance boost** on a Ryzen 5 with Vega 8 graphics as an example ( as a low-end test machine. )

> *..Shader art should be accessible to everyone, performing well even on low-end systems. Experiencing shader magic is something everyone deserves."

**IQ'S original GLSL Shader**

```glsl
// antialiasing level
#define AA 3

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec3 col = vec3(0.0);

    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {

    vec2 p = (2.0*(fragCoord+vec2(float(m),float(n))/float(AA))-iResolution.xy) / iResolution.y;

	float zoo = 1.0/(350.0 - 250.0*sin(0.25*iTime-0.3));

	vec2 cc = vec2(-0.533516,0.526141) + p*zoo;

	vec2 t2c = vec2(-0.5,2.0);
	t2c += 0.5*vec2( cos(0.13*(iTime-10.0)), sin(0.13*(iTime-10.0)) );

    // iterate
    vec2 z  = vec2(0.0);
    vec2 dz = vec2(0.0);
	float trap1 = 0.0;
	float trap2 = 1e20;
	float co2 = 0.0;
    for( int i=0; i<150; i++ )
    {
		// z' -> 2·z·z' + 1
        dz = 2.0*vec2(z.x*dz.x-z.y*dz.y, z.x*dz.y + z.y*dz.x ) + vec2(1.0,0.0);

        // z -> z² + c
        z = cc + vec2( z.x*z.x - z.y*z.y, 2.0*z.x*z.y );

        // trap 1
		float d1 = abs(dot(z-vec2(0.0,1.0),vec2(0.707)));
		float ff = 1.0-smoothstep(0.6,1.4,d1);
		co2 += ff;
		trap1 += ff*d1;

		//trap2
		trap2 = min( trap2, dot(z-t2c,z-t2c) );

        if( dot(z,z)>1024.0 ) break;
    }

    // distance, d(c) = |z|·log|z|/|z'|
	float d = sqrt( dot(z,z)/dot(dz,dz) )*log(dot(z,z));

	float c1 = pow( clamp( 2.00*d/zoo,    0.0, 1.0 ), 0.5 );
	float c2 = pow( clamp( 1.5*trap1/co2, 0.0, 1.0 ), 2.0 );
	float c3 = pow( clamp( 0.4*trap2, 0.0, 1.0 ), 0.25 );

	vec3 col1 = 0.5 + 0.5*sin( 3.0 + 4.0*c2 + vec3(0.0,0.5,1.0) );
	vec3 col2 = 0.5 + 0.5*sin( 4.1 + 2.0*c3 + vec3(1.0,0.5,0.0) );
	col += 2.0*sqrt(c1*col1*col2);
    }
	col /= float(AA*AA);

	fragColor = vec4( col, 1.0 );
}

```

**WGSL ( Compute Shader )**

We’ll break this down step by step., but here is the full WGSL implementation.

```glsl

struct Uniforms {
  resolution: vec3<f32>,
  time: f32
};

const AA:i32 = 3;
const sqrt2_inv:f32 = 0.70710678118; // Precompute 1/sqrt(2)
const k:f32 = 19.0;  // Define 19.0 as a constant

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var RENDERPASS0: texture_storage_2d<bgra8unorm, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) invocation_id: vec3u) {
  let R: vec2<f32> = uniforms.resolution.xy;
  let fragCoord = vec2<f32>(f32(invocation_id.x), f32(invocation_id.y));
  var col: vec3<f32> = vec3<f32>(0.0);

  // Precompute constant values
  let zoo = 1.0 / (350.0 - 250.0 * sin(fma(0.25, uniforms.time, -0.3)));
  let t2c_base = vec2<f32>(-0.5, 2.0) +
                0.5 * vec2<f32>(cos(fma(0.13, uniforms.time, -1.3)),
                            sin(fma(0.13, uniforms.time, -1.3)));

  for (var m: i32 = 0; m < AA; m = m + 1) {
    for (var n: i32 = 0; n < AA; n = n + 1) {
      let p = (2.0 * (fragCoord + vec2<f32>(f32(m), f32(n)) / f32(AA)) - R) / R.y;
      let cc = vec2<f32>(-0.533516, 0.526141) + p * zoo;
      var z = vec2<f32>(0.0);
      var dz = vec2<f32>(0.0);
      var trap1: f32 = 0.0;
      var trap2: f32 = 1e20;
      var co2: f32 = 0.0;

      for (var i: i32 = 0; i < 150; i = i + 1) {
        dz = vec2<f32>(fma(2.0 * z.x, dz.x, -2.0 * z.y * dz.y),
                      fma(2.0 * z.x, dz.y, 2.0 * z.y * dz.x)) + vec2<f32>(1.0, 0.0);
        z = cc + vec2<f32>(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);

        // Use select instead of if (dot(z, z) > 1024.0) { break; }
        let shouldBreak = dot(z, z) > 1024.0;
        i = select(i, 150, shouldBreak); // If shouldBreak is true, set i to 150

        let z_offset = z - vec2<f32>(0.0, 1.0);
        let d1 = abs(dot(z_offset, vec2<f32>(sqrt2_inv)));
        let ff = 1.0 - smoothstep(0.6, 1.4, d1);
        co2 = fma(ff, d1, co2); // Use FMA for co2 and trap1
        trap1 = fma(ff, d1, trap1);
        trap2 = min(trap2, dot(z - t2c_base, z - t2c_base));
      }

      let d = sqrt(dot(z, z) / dot(dz, dz)) * log(dot(z, z));
      let c1 = pow(clamp(2.0 * d / zoo, 0.0, 1.0), 0.5);
      let c2 = pow(clamp(1.5 * trap1 / co2, 0.0, 1.0), 2.0);
      let c3 = pow(clamp(0.4 * trap2, 0.0, 1.0), 0.25);

      // Precompute the factor outside the sin() calls
      let factor1 = 3.0 + 4.0 * c2;
      let factor2 = 4.1 + 2.0 * c3;

      // Use FMA for the final color calculation
      col = fma(
        2.0 * sqrt(c1 * (0.5 + 0.5 * sin(factor1 + vec3<f32>(0.0, 0.5, 1.0))) *
                      (0.5 + 0.5 * sin(factor2 + vec3<f32>(1.0, 0.5, 0.0)))), // Restored the original 0.0 here
        vec3<f32>(1.0),
        col
      );
    }
  }

  col /= f32(AA * AA);
  textureStore(RENDERPASS0, invocation_id.xy, vec4<f32>(col, 1.0));
}

```

**Compute Shaders: From Computation to Canvas**


Compute shaders are powerful tools for general-purpose calculations on the GPU. While they often work behind the scenes, they can also be integrated into the rendering process to directly affect what you see on the screen.

In this example, the compute shader generates the texture for the Mandelbrot fractal. Each thread calculates the color for a single pixel and writes it into a 2D texture using the `textureStore` function. Once the entire texture is computed, it's passed to the rendering pipeline for display on the canvas. This separation of computation and rendering allows us to harness the GPU's power to create visuals efficiently.

To display the texture on the canvas, a simple render pass is employed:

1.  **The Compute Shader Output:** The compute shader writes its output to a texture.
2.  **The Render Pass:** This texture is then sampled in a fragment shader (or other suitable rendering method) during a render pass, effectively mapping it onto a quad that fills the canvas.
3.  **The Canvas Display:** Finally, the rendered image is presented on the screen, allowing us to visualize the results of the compute shader.

This workflow highlights the flexibility of compute shaders: they can perform highly parallelized computations and feed the results seamlessly into the rendering pipeline. Whether it's generating textures, simulating physics, or other GPU-accelerated tasks, compute shaders expand what's possible in modern web graphics.

**Workgroups: Painting the Canvas in Parallel**

To achieve this, the compute shader divides the screen into workgroups – small groups of threads that work together. Each workgroup is responsible for calculating the colors for a specific region of the pixels.

The `@workgroup_size(8, 8, 1)` attribute in our WGSL code defines the dimensions of these workgroups. We've chosen an 8x8 grid of threads, so each workgroup handles 64 pixels simultaneously. This parallel approach allows the GPU to quickly process the entire image.

**Why This Matters for Visuals**

By using compute shaders and workgroups in this way, we can:

-   **Accelerate Rendering:** Leverage the GPU's parallel processing to generate complex visuals more efficiently.
-   **Implement Advanced Effects:** Compute shaders open doors to techniques that might be challenging with traditional fragment shaders, such as:
    -   Post-processing effects
    -   Procedural generation of textures and geometry
    -   Physics-based rendering

This shows just how versatile compute shaders can be—not only handling off-screen calculations but also creating stunning on-screen visuals

**Performance Unleashed: Compute Shaders vs. Fragment Shaders**

One of the most exciting aspects of this Mandelbrot shader port is the performance improvement we achieved. By moving the calculations from a GLSL fragment shader to a WGSL compute shader, we observed a remarkable **70% increase in frames per second** on a system with a Ryzen 5 CPU and a Vega 8 GPU.

This boost can be attributed to several factors:

-   **Parallel Processing:** Compute shaders are designed to exploit the massive parallelism of GPUs. By dividing the work into workgroups, we can calculate the color of many pixels concurrently.
-   **Reduced Overhead:** Compute shaders often have less overhead compared to fragment shaders, as they don't need to deal with some of the complexities of the rendering pipeline.
-   **Efficient Data Access:** Compute shaders can efficiently access and share data within workgroups, leading to faster computations.

This performance gain underscores the potential of WebGPU and compute shaders, especially for computationally intensive tasks like fractal rendering. Even on modest hardware, WebGPU can deliver a smoother and more responsive experience.

**Wrapping Up: The Power of Compute Shaders in WebGPU**

In this journey from GLSL to WGSL, we've explored the fascinating world of compute shaders and witnessed their ability to accelerate graphics rendering. By porting Iq's Mandelbrot shader to WebGPU, we've seen firsthand how compute shaders can harness the parallel processing power of GPUs to generate complex visuals more efficiently.

Key takeaways from this exploration include:

-   **Compute shaders are versatile:** They can handle a wide range of tasks, from fractal rendering to image processing and physics simulations.
-   **Workgroups are essential:** These organized groups of threads allow for parallel execution and efficient data sharing within the GPU.
-   **Performance gains are significant:** Moving from a fragment shader to a compute shader resulted in a remarkable 70% FPS boost in our example.
-   **WebGPU is a game-changer:** This modern graphics API unlocks new possibilities for high-performance graphics on the web.


**Harnessing WGSL**

-   **`fma` Function:** We used the `fma` (fused multiply-add) function, which combines multiplication and addition into a single instruction. This can improve efficiency, especially in computationally intensive shaders like this one.

-   **`select` for Branching:** To avoid branching divergence and maintain parallel efficiency, we replaced a traditional `if` statement with the `select` function. This ensures all threads within a workgroup execute the same instructions, preventing performance bottlenecks.

-   **Precomputed Values:** We precomputed `sqrt2_inv (1/sqrt(2))` to avoid redundant calculations, contributing to a potential performance boost.

-   **WGSL-Specific Syntax:** The code showcases WGSL-specific elements like uniforms (`struct Uniforms`), binding resources (`@group` and `@binding` attributes), and built-in variables (`@builtin(global_invocation_id)`), highlighting the differences between WGSL and GLSL.


**Comparison to GLSL:**

These optimizations and WGSL-specific features exemplify the advantages of WebGPU and its shading language. While GLSL is powerful, WGSL offers a modern approach with features designed for efficient execution on parallel architectures. The use of `fma`, `select`, and the inherent parallelism of compute shaders contribute to the significant performance gains observed in this example.



###  Additional thoughts

**Determine Optimal Workgroup Size**

There's no universally "optimal" workgroup size, as it depends on the specific compute shader, the workload, and the GPU architecture as far as my knowledge reach.

However, you can use heuristics and common practices to suggest a reasonable starting point.

-   **Heuristics:**

    -   **Multiples of Warp/Wavefront Size:** GPUs often process threads in groups called warps (NVIDIA) or wavefronts (AMD). Aligning your workgroup size to multiples of these (typically 32 or 64) can improve efficiency.
    -   **Consider the Problem:** If your compute shader operates on a 2D image, a 2D workgroup (e.g., 8x8 or 16x16) often makes sense. For 3D data, a 3D workgroup might be more appropriate.
    -   **Balance Occupancy and Resources:** Larger workgroups can improve occupancy (the number of active threads on the GPU), but they also consume more resources. You'll need to find a balance.
-   **Empirical Testing:** The most reliable way to find the optimal size is to experiment with different values and benchmark the performance of your compute shader.


**Dynamic Workgroup Size:**

To assist with determining workgroup sizes dynamically, you can query the GPU adapter for its `maxComputeWorkgroupSize` limits (*See https://gpuweb.github.io/gpuweb/#gpusupportedlimits*) . Using these values, calculate a power-of-two size that balances compatibility and performance. For example, the following code dynamically computes a workgroup size:

```typescript

const initWebGPU = async (canvas: HTMLCanvasElement, options?: GPURequestAdapterOptions) => {
    const adapter = await navigator.gpu?.requestAdapter(options);
    const device = await adapter?.requestDevice();

    if (!device) throw "WebGPU not supported.";

    const context = canvas.getContext("webgpu");
    context?.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const workgroupsize = getWorkgroupSizeString(adapter!.limits);

    return { device, context, adapter, workgroupsize };
};

const getWorkgroupSizeString = (limits: any): {
    x: number, y: number, z: number, workgroup_size: string
} => {
    const x = Math.min(16, largestPowerOf2LessThan(limits.maxComputeWorkgroupSizeX));
    const y = Math.min(16, largestPowerOf2LessThan(limits.maxComputeWorkgroupSizeY));
    return {
        x, y, z: 1, workgroup_size: `@workgroup_size(${x}, ${y}, 1)`
    };
};
```
In this example, the workgroup size is capped at `16x16x1` by default, adhering to GPU constraints while maintaining compatibility across devices. Using this approach simplifies workgroup sizing, allowing your application to adapt to various hardware.


### Final Thoughts

WebGPU is truly transformative for high-performance shaders, especially when compared to older techniques like GLSL. By porting from GLSL to WGSL, you gain access to better performance optimizations, better integration with the GPU's parallel processing capabilities, and a more modern API that offers increased flexibility.

What are you waiting for? Try out your own fractals, raymarching effects, and compute shaders in WGSL and let your creativity soar. Happy coding! 😎

## Links

**Mandelbrot - orbit traps  by Inigo Quilez (iq)**

 https://www.shadertoy.com/view/ldf3DN

**Run the WGSL version of Mandelbrot - orbit traps**

https://magnusthor.github.io/demolished-rail/wwwroot/example/runComputeShader.html

**Fiddle with the WGSL Compute  Shader version**

https://magnusthor.github.io/demolished-rail/wwwroot/editor/?shader=4f83033c-fa50-423e-917f-db55a7e7a38f

*Magnus Thor, 21st of december 2024*

Merry Christmas to you all! 🎄🎁🎅











