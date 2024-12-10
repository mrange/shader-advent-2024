
## Getting Started with WebGPU and WGSL

The world of creative coding and shader art is constantly evolving, with new technologies and tools emerging to empower artists and developers. WebGPU, the next-generation graphics API for the web, promises to revolutionize how we create and experience real-time graphics.

This blog post explores the development of a WebGPU renderer using WGSL (WebGPU Shading Language), a bit inspired by popular platforms like ShaderToy and GLSL Sandbox. We’ll delve into the code, highlighting key concepts and techniques for building a flexible and performant renderer that can handle a variety of shader effects.

### Embracing WebGPU and WGSL

WebGPU offers a modern, low-level API for accessing the power of GPUs, providing significant improvements over WebGL. While WebGL, based on OpenGL ES, has served the web well, it carries some legacy baggage and isn’t designed to fully exploit the capabilities of modern graphics hardware.

**WebGPU’s Advantages:**

-   **Performance:** WebGPU utilizes a more streamlined architecture that reduces overhead and allows for more efficient parallel processing, leading to significant performance gains.
-   **Explicitness:** WebGPU’s API is more explicit and less stateful than WebGL, making it easier to reason about and debug.
-   **Safety:** WGSL, the shading language designed specifically for WebGPU, incorporates strong typing, robust error checking, and memory safety features, reducing the likelihood of common shader errors.
-   **Portability:** WebGPU aims for greater consistency across different GPU vendors and platforms, enhancing portability. This allows developers to write code once and deploy it everywhere, reducing development time and ensuring a consistent user experience.

**Challenges when transitioning from WebGL to WebGPU:**

-   **Conceptual Shift:** WebGPU’s approach to resource management and rendering differs significantly from WebGL. It requires a shift in thinking about how to structure your rendering code. For example:
    -   **Explicit Resource Management:** You have direct control over GPU resources (buffers, textures) and need to explicitly allocate, bind, and manage their lifetimes.
    -   **Pipeline State Objects:** WebGPU uses pipeline state objects to encapsulate the entire rendering pipeline configuration.
    -   **Command Encoding:** Rendering commands are recorded into command buffers before being submitted to the GPU.
-   **API Complexity:** While WebGPU’s API is more modern, it can also be more complex to learn and use initially, especially for developers familiar with WebGL.
-   **Limited Browser Support:** WebGPU is still relatively new, and browser support is not as widespread as WebGL. However, support is growing rapidly. (See [caniuse.com](https://caniuse.com/?search=WebGPU))

### A 1000-foot View of WebGPU

At its core, WebGPU revolves around these key concepts:

-   **Adapter and Device:** An adapter represents a physical GPU, while a device represents a logical connection to that GPU, enabling communication and control.
-   **Pipeline:** A pipeline acts as a blueprint for the rendering process. It defines the shader stages, vertex formats, blending operations, and other configurations, streamlining the rendering flow.
-   **Command Encoding:** WebGPU introduces command buffers, where rendering commands are recorded before being submitted to the GPU. This allows for optimized execution and better control over rendering order.
-   **Bind Groups:** Resources like buffers and textures are grouped together in bind groups. These bind groups are then associated with shader stages, providing a structured way to manage and access data within shaders.
-   **Render Passes:** A render pass encapsulates a series of rendering operations targeting a specific framebuffer. This helps organize rendering tasks and ensures that drawing happens in a controlled manner.
-   **Compute Shaders:** WebGPU unlocks the power of compute shaders, enabling general-purpose parallel computations on the GPU. These shaders can be harnessed for tasks like generating textures, performing physics simulations, or even machine learning inference.
-   **Synchronization:** WebGPU provides mechanisms for synchronizing operations, ensuring that tasks are executed in the correct order and preventing data races, especially when dealing with asynchronous GPU operations.

### Core Components of the Renderer

The renderer we gonna look at here mirrors the structure of many WebGL/GLSL Shader renderers out there, It comprises several key components:

-   **`Renderer` class:** Manages the WebGPU context, device, and resources. Creates and executes render passes, and handles user input for interactivity.
-   **`Material` class:** Encapsulates shader code (vertex and fragment) and associated metadata. Creates shader modules for WebGPU.
-   **`Geometry` class:** Defines the geometry to be rendered (e.g., a rectangle for fullscreen effects). Creates vertex buffers.
-   **`TextureLoader` class:** Loads and manages textures (images and videos) for use in shaders. *( We will not be looking at it here in the post )*
-   **`Uniforms` class:** Manages uniform data that is passed to shaders. Provides methods for updating uniform values.
-   **`RenderPassBuilder` class:** Helps create and configure render passes, including fragment shaders,compute shaders and render pipelines.
-   **`RenderPass` class:** Represents a single render pass with its associated pipeline, uniforms, and resources.
### Rendering Process

The rendering process involves the following steps:

1.  **Initialization:** Request and configure the WebGPU adapter, device, and canvas context.
2.  **Resource Creation:** Create buffers, textures, and samplers.
3.  **Render Pass Setup:** Define render passes using the `RenderPassBuilder`, specifying shaders, geometry, and textures.
4.  **Rendering Loop:**
    -   Execute compute shaders (if any) to perform pre-processing or generate data.
    -   Execute render passes to draw to intermediate textures.
    -   Execute the main render pass to combine and display the final output on the canvas.


## Building the WGSL Shader Render

Now that we've laid the groundwork and explored the core components of our WebGPU renderer, let's dive into the exciting part: building the actual shader pipeline! This is where we'll see how to combine the `Renderer`, `Material`, `Geometry`, `Uniforms`, and `RenderPass` classes to create stunning visual effects with WGSL.

We'll start by examining how the renderer sets up the main rendering pipeline, which acts as the final stage for combining and processing the output of individual render passes. Then, we'll explore how to create and configure these individual render passes, each with its own shader code, geometry, and resources.

### Constructing the main endering pipeline

The `WGLSLShaderRenderer` class manages the WebGPU rendering pipeline and orchestrates the rendering process. A key concept in this renderer is the separation of the main render pass from other render passes. This allows for a flexible and modular approach to building shader effects.

#### Main Render Pass vs. Other Render Passes

-   **Main Render Pass:** This is the final stage of the rendering pipeline, where the output of all other render passes is combined and processed. It's defined by a single `GPURenderPipeline` object created in the `addMainRenderPass()` method described brifley below. Think of it as the "master shader" that orchestrates the final visual output.

-   **Render Passes:** These are intermediate stages in the pipeline that can perform various operations, such as generating textures, applying effects, or pre-processing data. Each render pass is defined by its own `GPURenderPipeline` and can use different shaders, textures, and uniforms.

This separation allows for a modular approach to building shader effects. You can create individual render passes for specific tasks and then combine them in the main render pass to achieve the desired visual result.

## Constructing the main rendering
So lets have brief look at how we set up the Main Render Pass.


```typescript
/**
 * Creates the main render pipeline, which combines the output of other render passes.
 * @param uniformBuffer - The uniform buffer for the pipeline.
 * @param material - The material to use for the pipeline.
 * @returns The created GPURenderPipeline.
 */
createMainRenderPipeline(uniformBuffer: GPUBuffer, material: Material): GPURenderPipeline {
  const bindingGroupEntries: Array<GPUBindGroupEntry> = [];
  const sampler = this.getDevice().createSampler({
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'nearest'
  });

  // Bind the sampler and uniform buffer
  bindingGroupEntries.push(
    { binding: 0, resource: sampler },
    { binding: 1, resource: { buffer: uniformBuffer } }
  );

  const layout = new Array<GPUBindGroupLayoutEntry>();

  // Define the layout entries for the sampler and uniform buffer
  layout.push(
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      sampler: {}
    }, {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform" }
    }
  );

  // Include the output textures from other render passes in the bind group
  const renderPasses = Array.from(this.renderPassBacklog.values());
  renderPasses.forEach((pass, i) => {
    bindingGroupEntries.push({
      binding: 2 + i,
      resource: pass.bufferView
    });
    layout.push({
      binding: 2 + i,
      visibility: GPUShaderStage.FRAGMENT,
      texture: {}
    });
  });

  // Create the bind group layout and pipeline layout
  const screenBindGroupLayout = this.getDevice().createBindGroupLayout({ entries: layout });
  this.screenBindGroup = this.getDevice().createBindGroup({
    layout: screenBindGroupLayout,
    entries: bindingGroupEntries
  });
  const screenPipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [screenBindGroupLayout] });

  // Create the render pipeline
  const pipelineDescriptor: GPURenderPipelineDescriptor = {
    vertex: {
      module: material.vertexShaderModule,
      entryPoint: material.shader.vertexEntryPoint || 'main_vertex',
      buffers: [this.geometry.vertexBufferLayout(0)]
    },
    fragment: {
      module: material.fragmentShaderModule,
      entryPoint: material.shader.fragmentEntryPoint || 'main_fragment',
      targets: [{ format: 'bgra8unorm' }]
    },
    primitive: { topology: 'triangle-list' },
    layout: screenPipelineLayout
  };

  return this.getDevice().createRenderPipeline(pipelineDescriptor);
}
```
This function creates the `GPURenderPipeline` for the final rendering stage. It sets up the necessary bind group layout and entries for the sampler, uniform buffer, and output textures from previous render passes. These resources are then bound to the pipeline, allowing the main shader to access and process them.

## Create the Render Passes

Here follows a method that allows you to add individual render passes to the rendering pipeline. Each render pass can perform a specific operation on the GPU, using different shaders and resources.


```typescript
addRenderPass(label: string, material: Material, geometry: Geometry, textures?: Array<ITexture> | []) {
  textures?.forEach(texture => {
    this.textures.push(texture);
  });

  const priorRenderPasses = Array.from(this.renderPassBacklog.values());
  const uniforms = this.uniforms;

  const renderPipeline = this.renderPassBuilder.createRenderPipeline(material, geometry, this.textures, priorRenderPasses);

  const assets = this.createAssets(); // Creates render targets
  const bindingGroupEntrys: Array<GPUBindGroupEntry> = [];

  const sampler = this.getDevice().createSampler({
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'nearest'
  });

  bindingGroupEntrys.push({
    binding: 0,
    resource: {
      buffer: uniforms.uniformBuffer
    }
  }, {
    binding: 1,
    resource: sampler
  });

  let offset = bindingGroupEntrys.length;

  priorRenderPasses.forEach((pass, i) => {
    bindingGroupEntrys.push({
      binding: offset + i,
      resource: pass.bufferView,
    });
  });

  offset = bindingGroupEntrys.length;
  this.textures.forEach((t, i) => {
    let entry: GPUBindGroupEntry;
    if (t.type === 0) {
      entry = {
        binding: i + offset,
        resource: (t.data as GPUTexture).createView()
      }
    } else {
      entry = {
        binding: i + 2,
        resource: this.getDevice().importExternalTexture({ source: t.data as HTMLVideoElement }),
      };
    }
    bindingGroupEntrys.push(entry);
  });

  const bindGroup = this.getDevice().createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: bindingGroupEntrys,
    label: `${label} renderpass`
  });

  const renderPass = new RenderPass(
    1, label, renderPipeline, uniforms, bindGroup, assets.buffer, assets.bufferView
  );

  this.renderPassBacklog.set(label, renderPass);
}
```
This method sets up a render pass with the specified shaders, geometry, and textures. It also binds the necessary resources, including the outputs of any previous render passes, making them available as inputs to the current shader. The resulting render pass is then added to the `renderPassBacklog` to be executed in the rendering loop.

By adding multiple render passes, you can create complex, layered visual effects. The main render pass can then combine these intermediate outputs to produce the final rendered image.

## Representing Shaders and Geometry: `Material` and `Geometry` Classes

Before we delve into the rendering loop, let's take a closer look at two fundamental classes in our WebGPU renderer: `Material` and `Geometry`. I think that make sense for us to do so.


## The `Material` Class

The `Material` class encapsulates the shader code and associated metadata for a render pass. It provides a structured way to manage your WGSL shaders and provides methods for creating shader modules that WebGPU can understand.


```typescript

	export interface IMaterialShader {
		  vertex: string;
		  vertexEntryPoint?: string;
		  fragment: string;
		  fragmentEntryPoint?: string;
}

    export class Material {
      vertexShaderModule: GPUShaderModule;
      fragmentShaderModule: GPUShaderModule;

      constructor(public device: GPUDevice, public shader: IMaterialShader) {
        this.vertexShaderModule = this.device.createShaderModule({
          code: shader.vertex
        });

        this.fragmentShaderModule = this.device.createShaderModule({
          code: shader.fragment

        });
      }
    }
```
The `Material` class takes the WebGPU device and an `IMaterialShader` object as input. The `IMaterialShader` object typically contains the WGSL code for the vertex and fragment shaders, along with optional entry point names. The `Material` class then creates the corresponding shader modules using the `device.createShaderModule()` method.


## The `Geometry` Class

The `Geometry` class defines the shapes we'll render with our shaders. It encapsulates vertex data (positions, colors, etc.) and creates the necessary buffers on the GPU.

Here's a simplified version of the `IGeometry` interface:
```typescript
export interface IGeometry {
  verticesType: VERTEXType; // Enum indicating the type of vertex data (e.g., position, color)
  vertices: Float32Array;   // The actual vertex data
  indices: Uint16Array;     // Indices defining how vertices connect to form shapes
  // ... other optional attributes like uvs, normals
}
```
The `Geometry` class uses this interface to create vertex buffers on the GPU. For our ShaderToy-like renderer, we'll primarily be using a simple rectangle that covers the entire screen. This rectangle is represented by the `rectGeometry` object, which is actually composed of two triangles, as this is how rectangles are typically represented for rendering.

This is provided by the `rectGeometry` object:





```typescript
   export const rectGeometry: IGeometry = {
        verticesType: VERTEXType.xyz,
        vertices: new Float32Array([
          -1, 1, 0,
          -1, -1, 0,
          1, -1, 0,
          1, 1, 0,
          -1, 1, 0,
          1, -1, 0,
        ]),
        indicies: new Uint16Array([0, 1, 2, 3, 4, 5]),
      };
```

## Orchestrating the Graphics Pipeline: Render Passeses

In our WebGPU renderer, a `RenderPass` represents a single stage in the graphics pipeline. Each pass performs a specific operation, like rendering to a texture or applying a post-processing effect. This allows us to build complex visual effects by chaining multiple passes together.

#### The `RenderPass` Object

A `RenderPass` object encapsulates the necessary information for a rendering operation:

-   `pipeline`: A `GPURenderPipeline` or `GPUComputePipeline` object defining the shaders and rendering configuration.
-   `uniforms`: A `Uniforms` object holding the uniform data for the shaders.
-   `bindGroup`: A `GPUBindGroup` that binds the resources (uniforms, textures) to the pipeline.
-   `buffer` and `bufferView`: A `GPUTexture` and its corresponding `GPUTextureView` representing the render target (where the output of the pass is stored).

#### The `RenderPassBuilder`

As we saw in the previous section on "Adding Render Passes," the `RenderPassBuilder` class helps create and configure these `RenderPass` objects. It handles the creation of pipelines, bind groups, and other necessary WebGPU objects, simplifying the process of setting up render passes.

#### Types of Render Passes

Our renderer supports two main types of render passes:

-   **Render Passes:** These passes use vertex and fragment shaders to render graphics to a texture.

- **Compute Passes:** While not covered in detail in this post, compute passes leverage the parallel processing power of GPUs to perform general-purpose computations. They utilize compute shaders, which operate on data organized into workgroups, **enabling highly parallel execution**. This can be useful for tasks like generating textures or performing simulations.  **Note: rendered textures can ofcourse be passed to the screen ( canvas/texture).**


### Under the Hood: The `RenderPassBuilder`

To streamline the creation of render passes, our renderer utilizes the `RenderPassBuilder` class. This class encapsulates the logic for constructing the necessary WebGPU objects, including pipelines and bind groups, making it easier to define and manage different rendering stages.

Here's a look at the code for the `RenderPassBuilder`:

```typescript
import { IPass } from "../../Interfaces/IPass";
import { IPassBuilder } from "../../Interfaces/IPassBuilder";
import { IWGSLTextureData } from "./TextureLoader";
import { Geometry } from "./geometry";
import { Material } from "./material";

/**
 * A builder class for creating render passes in WebGPU.
 */
export class RenderPassBuilder implements IPassBuilder {
  pipelineLayout!: GPUPipelineLayout;
  bindGroup!: GPUBindGroup;
  device: GPUDevice;

  /**
   * Creates a new RenderPassBuilder.
   * @param device - The GPUDevice to use for creating resources.
   * @param canvas - The HTMLCanvasElement to render to.
   */
  constructor(device: GPUDevice, public canvas: HTMLCanvasElement) {
    this.device = device;
  }

  /**
   * Creates a bind group layout and entries for a render pipeline.
   * @param uniformBuffer - The uniform buffer for the pipeline.
   * @param sampler - An optional GPUSampler to use. If not provided, a default sampler is created.
   * @returns An array of GPUBindGroupEntry objects.
   */
  getRenderPipelineBindingGroupLayout(
    uniformBuffer: GPUBuffer,
    sampler?: GPUSampler
  ): Array<GPUBindGroupEntry> {
    const bindingGroupEntries: Array<GPUBindGroupEntry> = [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer
        }
      }
    ];

    const defaultSampler = this.device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'nearest'
    });

    bindingGroupEntries.push({
      binding: 1,
      resource: sampler || defaultSampler
    });

    return bindingGroupEntries;
  }

  /**
   * Creates a render pipeline.
   * @param material - The material to use for the pipeline.
   * @param geometry - The geometry to use for the pipeline.
   * @param textures - An array of textures to use in the pipeline.
   * @param priorRenderPasses - An array of prior render passes to include as textures.
   * @returns The created GPURenderPipeline.
   */
  createRenderPipeline(material: Material, geometry: Geometry, textures: Array<IWGSLTextureData>, priorRenderPasses: IPass[]): GPURenderPipeline {
    const bindGroupLayoutEntries = [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" }
      }
    ];

    // Add prior render passes as textures to the bind group layout
    priorRenderPasses.forEach((_, index) => {
      bindGroupLayoutEntries.push({
        binding: 2 + index,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
      });
    });

    // Add textures to the bind group layout
    textures.forEach((texture, index) => {
      bindGroupLayoutEntries.push({
        binding: 2 + priorRenderPasses.length + index,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: texture.type === 0 ? "float" : "unfilterable-float" },
        externalTexture: texture.type === 1 ? {} : undefined
      });
    });

    // Create the bind group layout and pipeline layout
    const bindGroupLayout = this.device.createBindGroupLayout({ entries: bindGroupLayoutEntries });
    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

    // Create and return the render pipeline
    return this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: material.vertexShaderModule,
        entryPoint: "main_vertex",
        buffers: [geometry.vertexBufferLayout(0)]
      },
      fragment: {
        module: material.fragmentShaderModule,
        entryPoint: "main_fragment",
        targets: [{ format: 'bgra8unorm' }]
      }
    });
  }

  /**
   * Creates a compute pipeline.
   * @param computeShader - The compute shader module.
   * @param textures - An array of textures to use in the pipeline.
   * @returns The created GPUComputePipeline.
   */
  createComputePipeline(computeShader: GPUShaderModule, textures: Array<IWGSLTextureData>): GPUComputePipeline {
    const bindGroupLayoutEntries = [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "write-only",
          format: "bgra8unorm",
          viewDimension: "2d"
        }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" }
      }
    ];

    // Add textures to the bind group layout
    textures.forEach((texture, index) => {
      bindGroupLayoutEntries.push({
        binding: 2 + index,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: texture.type === 0 ? "float" : "unfilterable-float" },
        externalTexture: texture.type === 1 ? {} : undefined
      });
    });

    // Create the bind group layout and pipeline layout
    const bindGroupLayout = this.device.createBindGroupLayout({ entries: bindGroupLayoutEntries });
    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

    // Create and return the compute pipeline
    return this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: computeShader,
        entryPoint: 'main'
      }
    });
  }
}

```
**Summary**

The `RenderPassBuilder` class provides methods for:

-   Creating bind group layouts and entries for render pipelines.
-   Creating render pipelines, which define the shaders, geometry, and textures used in a rendering operation.
-   Creating compute pipelines, which define the compute shader and resources used for general-purpose GPU computations.

This class simplifies the process of setting up render passes by handling the creation and configuration of the underlying WebGPU objects, allowing you to focus on defining the specific shaders and resources for each pass.

## Managing Uniforms: The `Uniforms` Class

The `Uniforms` class is responsible for managing the uniform data that is passed to your shaders. This data can include things like time, resolution, mouse position, or other values that you want to control dynamically in your shaders.

```typescript
    export  class  Uniforms {
    uniformBufferArray:  Float32Array;
    uniformBuffer:  GPUBuffer;

    /**
    * Initializes a Float32Array with default values for uniforms.
    * @param  w - The width of the canvas.
    * @param  h - The height of the canvas.
    * @returns A new Float32Array with initialized values.
    */

    static  initialize(w:  number, h:  number):  Float32Array {
    return  new  Float32Array([w, h, 0, 1, 0, 0, 0, 0, 0, 0]);
    }

    /**
    * Creates a new Uniforms instance.
    * @param  device - The GPUDevice to use for creating the uniform buffer.
    * @param  canvas - The HTMLCanvasElement to get dimensions from.
    */

    constructor(public  device:  GPUDevice, canvas:  HTMLCanvasElement) {
    this.uniformBuffer  =  this.device.createBuffer({
    size:  60,
    usage:  GPUBufferUsage.UNIFORM  |  GPUBufferUsage.COPY_DST  |  GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.uniformBufferArray  =  Uniforms.initialize(canvas.width, canvas.height); // Use the initialize method
    }

    /**
    * Sets uniform values in the uniform buffer array
    * @param  values - An array of values to set.
    * @param  offset - The offset in the array where the values should be written.
    */
    setUniforms(values:  ArrayLike<number>, offset:  number) {
    this.uniformBufferArray.set(values, offset);
    }
    /**
    * Updates the uniform buffer on the GPU with the data from the uniform buffer array.
    */
    updateUniformBuffer() {
    this.device.queue.writeBuffer(
    this.uniformBuffer,    0,
    this.uniformBufferArray.buffer,
    this.uniformBufferArray.byteOffset,
    this.uniformBufferArray.byteLength
    );
    }
    }
```
### The Rendering Loop: Bringing the Shaders to Life

While the shaders themselves define the visual effects, it's the rendering loop that brings them to life. The `update()` method in our WebGPU renderer acts as the conductor, orchestrating the execution of the various render passes and ultimately producing the final image on the canvas.

```typescript
     update(ts: number) {
            const encoder = this.getDevice().createCommandEncoder();
            const arrRenderPasses = Array.from(this.renderPassBacklog.values());
            // get the compute shaders from the back log
            arrRenderPasses.filter((pre) => {
                return pre.type == 0
            }).forEach(pass => {
                const computePass = encoder.beginComputePass();
                computePass.setPipeline(pass.pipleline as GPUComputePipeline);
                computePass.setBindGroup(0, pass.bindGroup);
                computePass.dispatchWorkgroups(Math.floor((this.canvas.width + 7) / 8), Math.floor((this.canvas.height + 7) / 8), 1);
                computePass.end();
            });
            arrRenderPasses.filter(pre => {
                return pre.type == 1
            }).forEach(pass => {
                const renderPassDescriptor: GPURenderPassDescriptor = {
                    colorAttachments: [{
                        loadOp: 'clear',
                        storeOp: 'store',
                        view: pass.bufferView,
                        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    }]
                };
                const renderPass = encoder.beginRenderPass(renderPassDescriptor);
                renderPass.setPipeline(pass.pipleline as GPURenderPipeline)
                renderPass.setBindGroup(0, pass.bindGroup);
                renderPass.setVertexBuffer(0, this.geometry.vertexBuffer);
                renderPass.setIndexBuffer(this.geometry.indexBuffer, 'uint16');
                renderPass.drawIndexed(this.geometry.numOfVerticles, 1);
                renderPass.end();
            });
            const mainRenderer: GPURenderPassEncoder = encoder.beginRenderPass({
                colorAttachments: [{
                    view: this.context!.getCurrentTexture().createView(),
                    clearValue: { r: 0.0, g: 0, b: 0.0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store"
                }]
            });
            this.uniforms.setUniforms([this.frame], 8);
            this.uniforms.setUniforms([ts], 3);
            this.uniforms.updateUniformBuffer();

            mainRenderer.setPipeline(this.renderPipleline);
            mainRenderer.setVertexBuffer(0, this.geometry.vertexBuffer);
            mainRenderer.setBindGroup(0, this.screen_bind_group);
            mainRenderer.draw(6, 1, 0, 0);
            mainRenderer.end();
            this.getDevice().queue.submit([encoder.finish()]);
        }
```

## Bringing It All Together: Setting up the Renderer

Now, let's see how to initialize the `WGLSLShaderRenderer` and configure the main render pass, which will serve as the foundation for our WebGPU-powered shader effects.

### Rendrer and Main Shader

The following code demonstrates the basic setup:

```typescript
    const shaderRenderer = new WGSLShaderRenderer(canvas, device, context);
      // Create the main shader
    const mainShader = new Material(device, defaultMainShader);
	  // ... (here we add the renderPasses ( shown below) ...
    // Add the main render pass
    this.shaderRenderer.addMainRenderPass(mainShader);

```
First, we create an instance of the `WGLSLShaderRenderer`, passing in the canvas element, WebGPU device, and context. Then, we create a `Material` object using the `defaultMainShader`, which defines the vertex and fragment shaders for the main render pass. Finally, we add the main render pass to the renderer using the `addMainRenderPass()` method.

This main render pass will be responsible for combining the output of any other render passes we add and rendering the final image to the canvas.

Here is the code for the defaultMainShader:

```typescript

const defaultMainShader: IMaterialShader = {
  vertex: /* wgsl */ `
    struct VertexOutput {
      @builtin(position) Position : vec4<f32>,
      @location(0) TexCoord : vec2<f32>,
    }
    @vertex
    fn main_vertex(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
      var positions = array<vec2<f32>, 6>(
        vec2<f32>( 1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(
 1.0,  1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0,  1.0)
      );
      var
 texCoords = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 0.0)
      );
      var output : VertexOutput;
      output.Position = vec4<f32>(positions[VertexIndex],
 0.0, 1.0);
      output.TexCoord = texCoords[VertexIndex];
      return output;
    }
  `,
  fragment: /* wgsl */ `
    struct Uniforms {
      resolution: vec3<f32>,
      time: f32
    };
    @group(0) @binding(0) var screen_sampler : sampler;
    @group(0) @binding(1) var<uniform> uniforms: Uniforms;
    @group(0) @binding(2) var buffer1: texture_2d<f32>;

    struct VertexOutput {
      @builtin(position) Position: vec4<f32>,
      @location(0) TexCoord: vec2<f32>
    };

    @fragment
    fn main_fragment(
      @location(0) TexCoord : vec2<f32>,
      @builtin(position) Position: vec4<f32>
    ) -> @location(0) vec4<f32> {
      return textureSample(buffer1, screen_sampler, -TexCoord);
    }
  `,
}
```
This shader simply samples a texture from the `buffer1` variable, which will be the output of a render pass. This demonstrates how you can chain multiple render passes together to create complex effects.


### Create a render pass

This code snippet demonstrates how to add a render pass to your `WGLSLShaderRenderer`.


```typescript
    // ... (add your render passes before adding the mainPass

    // Create a render pass
    const renderPassShader = {
      name: "buffer1",
      shader: new Material(webgpu.device, rayMarchWGSLShader),
      geometry: new Geometry(webgpu.device, rectGeometry)
    };

    shaderRenderer.addRenderPass(
      renderPassShader.name,
      renderPassShader.shader,
      renderPassShader.geometry
    );
```

First, an object `renderPassShader` is created to define the configuration of the render pass. It includes the name of the pass (`"buffer1"`), the shader (`rayMarchWGSLShader` wrapped in a `Material` object), and the geometry (`rectGeometry` wrapped in a `Geometry` object).

Then, the `addRenderPass()` method of the `shaderRenderer` is called, passing the name, shader, and geometry as arguments. This adds the render pass to the renderer's backlog of passes to be executed in the rendering loop.

This render pass will use the `rayMarchWGSLShader` to generate a visual effect and store the output in a texture. This texture can then be used in the main render pass or other subsequent render passes to create more complex and layered effects.

Here is the code for the rayMarchWGSLShader

```typescript

 const rayMarchWGSLShader: IMaterialShader = {
	vertex: defaultWglslVertex,
	fragment: /* glsl */ `struct Uniforms {
		resolution: vec3 < f32 > ,
		time: f32
	};

	@group(0) @binding(0) var < uniform > uniforms: Uniforms;
	@group(0) @binding(1) var linearSampler: sampler;
	struct VertexOutput {
		@builtin(position) pos: vec4 < f32 > ,
			@location(0) uv: vec2 < f32 >
	};
	const MAX_STEPS: i32 = 100;
	const MAX_DIST: f32 = 100.0;
	const SURFACE_DIST: f32 = 0.001;
	const LIGHT_POS: vec3 < f32 > = vec3 < f32 > (-2.0, 5.0, 3.0);

	fn estimateNormal(pos: vec3 < f32 > ) -> vec3 < f32 > {
		let e: vec2 < f32 > = vec2 < f32 > (1.0, -1.0) * 0.5773 * 0.0005;
		return normalize(
			e.xyy * map(pos + e.xyy) +
			e.yyx * map(pos + e.yyx) +
			e.yxy * map(pos + e.yxy) +
			e.xxx * map(pos + e.xxx)
		);
	}

	fn calculateLight(p: vec3 < f32 > , viewDir: vec3 < f32 > , normal: vec3 < f32 > ) -> vec3 < f32 > {
		let ambientStrength: f32 = 0.1;
		let ambient: vec3 < f32 > = vec3 < f32 > (0.1, 0.1, 0.1) * ambientStrength;
		let lightDir: vec3 < f32 > = normalize(LIGHT_POS - p);
		let diffuseStrength: f32 = 1.7;
		let diffuse: vec3 < f32 > = vec3 < f32 > (1.0, 1.0, 1.0) * diffuseStrength * max(dot(normal, lightDir), 0.0);

		let viewDirNorm: vec3 < f32 > = normalize(viewDir);
		let reflectDir: vec3 < f32 > = reflect(-lightDir, normal);
		let specularStrength: f32 = 0.8;
		let shininess: f32 = 32.0;
		let specular: vec3 < f32 > = vec3 < f32 > (1.0, 1.0, 1.0) * specularStrength * pow(max(dot(viewDirNorm, reflectDir), 0.0), shininess);

		return ambient + diffuse + specular;
	}

	fn calculateAO(p: vec3 < f32 > , normal: vec3 < f32 > ) -> f32 {
		let aoRadius: f32 = 0.1;
		let aoSamples: i32 = 5;
		var occlusion: f32 = 0.0;
		for (var i: i32 = 1; i <= aoSamples; i = i + 1) {
			let stepSize: f32 = aoRadius / f32(i);
			let samplePoint: vec3 < f32 > = p + normal * stepSize;
			let sampleDist: f32 = map(samplePoint);
			occlusion += stepSize - sampleDist;
		}
		occlusion = 1.0 - (occlusion / f32(aoSamples));
		return occlusion;
	}

	fn rotationMatrixY(angle: f32) -> mat3x3 < f32 > {
		let c: f32 = cos(angle);
		let s: f32 = sin(angle);
		return mat3x3 < f32 > (
			vec3 < f32 > (c, 0.0, s),
			vec3 < f32 > (0.0, 1.0, 0.0),
			vec3 < f32 > (-s, 0.0, c)
		);
	}

	fn map(point: vec3 < f32 > ) -> f32 {
		return length(point) - 1.5;
	}

	fn main(fragCoord: vec2 < f32 > ) -> vec4 < f32 > {

		let uv: vec2 < f32 > = (2.*fragCoord.xy-uniforms.resolution.xy) / uniforms.resolution.y;

		var color: vec3 < f32 > = vec3 < f32 > (0.0, 0.0, 0.0);

		let cameraPos: vec3 < f32 > = vec3 < f32 > (0.0, 0.0, 2.0);
		let rayDir: vec3 < f32 > = normalize(vec3 < f32 > (uv, -1.0));

		var t: f32 = 0.0;

		for (var i: i32 = 0; i < MAX_STEPS; i = i + 1) {
			let currentPos: vec3 < f32 > = cameraPos + t * rayDir;
			let dist: f32 = map(currentPos);
			if (dist < SURFACE_DIST) {
				let normal: vec3 < f32 > = estimateNormal(currentPos);
				let lightColor: vec3 < f32 > = calculateLight(currentPos, rayDir, normal);
				let ao: f32 = calculateAO(currentPos, normal);
				color = lightColor * ao; // Apply lighting and AO
				break;
			}
			if (t > MAX_DIST) {
				break;
			}
			t = t + dist;
		}

		return vec4 < f32 > (color, 1.0);
	}
	@fragment
	fn main_fragment(in: VertexOutput) -> @location(0) vec4 < f32 > {
		return main(in.pos.xy);
	}
`};
```
This shader implements a basic ray marching algorithm to render a sphere with lighting and ambient occlusion. It demonstrates how you can create interesting visual effects using WGSL shaders in your WebGPU renderer.


## Conclusion: A New Era of Web Graphics

This exploration of our WebGPU renderer and its core components provides a glimpse into the exciting possibilities that WebGPU and WGSL offer for creating stunning visuals on the web. By embracing this modern graphics API, we're not only gaining performance and efficiency but also unlocking new levels of expressiveness and creative freedom.

As WebGPU continues to mature and gain wider browser support, it's poised to revolutionize how we approach graphics rendering on the web. Its cleaner API, enhanced safety features, and focus on portability make it an ideal choice for both experienced and aspiring graphics programmers.

### WGSL vs. GLSL?

In a follow-up blog post in thes advents calendar ( Sorry for revaling the suppise )  , we'll delve deeper into the differences between WGSL and GLSL, comparing their syntax, features, and performance characteristics. We'll explore how WGSL's modern design addresses some of the limitations of GLSL and how it can lead to more robust and efficient shader code.

Stay tuned for an in-depth analysis of these shading languages and discover how WGSL can empower you to create even more impressive and innovative visual experiences on the web.

*Magnus Thor, December 24*


## LINKS

**Run a WGSL version of Alien Waterworld by Mårten Rånge**

https://magnusthor.github.io/demolished-rail/wwwroot/example/runsWGSLShader.html

*Is the GLSL version by Mårnen found at https://www.shadertoy.com/view/WtXyW4*

**Fiddle with the Alien Waterworld WGSL Shader**

https://magnusthor.github.io/demolished-rail/wwwroot/editor/?shader=3f9238a7-ba7a-4046-aa48-7e8a9b22f6cb

*Which uses the thing we talked about in this article*
