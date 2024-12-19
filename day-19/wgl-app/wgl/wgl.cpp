/*
 * Windows OpenGL Shader Tutorial
 * This file demonstrates how to set up a minimal OpenGL context in Windows
 * and render using fragment shaders.
 */

// Windows-specific configuration
// These defines help reduce the size of the Windows headers and avoid some legacy code
#define WIN32_LEAN_AND_MEAN  // Excludes rarely-used Windows headers
#define WIN32_EXTRA_LEAN     // Further reduces Windows headers
#define WINDOWS_IGNORE_PACKING_MISMATCH  // Prevents some alignment warnings

// Standard C headers
#include <assert.h>  // For runtime assertions (checking if our assumptions are correct)

// Debug-only includes
#ifdef _DEBUG
    #include <stdio.h>  // For printf() - only included in debug builds
#endif

// Graphics-related headers
#include <windows.h>    // Core Windows functions (creating windows, handling messages)
#include <GL/gl.h>      // Core OpenGL functions
#include "glext.h"      // Modern OpenGL extensions (needed for shaders)

extern "C" {
/*
 * Forward Declarations
 * These are functions we'll define later but need to reference now
 */

// Gets the GLSL code for our fragment shader
GLchar const* GetFragmentShaderSource(void);

// Windows event handler - processes window events like resizing, closing, etc.
LRESULT CALLBACK WndProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam);

/*
 * Debug Support
 * These are only included when building in debug mode (_DEBUG is defined)
 */
#ifdef _DEBUG
// Callback function for OpenGL to report errors
void APIENTRY debugCallback(
    GLenum source           // Where the error came from
  , GLenum type             // The type of error
  , GLuint id               // Error ID
  , GLenum severity         // How serious the error is
  , GLsizei length          // Length of the error message
  , GLchar const* message   // The error message itself
  , void const* userParam   // User-provided data (unused)
  ) {
    printf(message);
    printf("\n");
}
    
// Buffer for debug messages
char debugLog[0xFFFF];  // 65535 characters
#endif

int _fltused;

/*
 * Window Configuration
 */

// Initial window size (16:9 aspect ratio)
int xres = 1600;
int yres = 1080;

// Window class specification - tells Windows how to create our window
WNDCLASSA windowClassSpecification {
      CS_OWNDC    // style        : Give us our own DC (drawing context)
    | CS_HREDRAW  //                Redraw on resize
    | CS_VREDRAW  //                Redraw on resize
  , &WndProc      // lpfnWndProc  : Function to handle window events
  , 0             // cbClsExtra   : No extra class memory
  , 0             // cbWndExtra   : No extra window memory
  , 0             // hInstance    : Application instance handle (set later)
  , 0             // hIcon        : Default icon
  , 0             // hCursor      : Default cursor
  , 0             // hbrBackground: No background brush
  , 0             // lpszMenuName : No menu
  , "WGL"         // lpszClassName: Our window class name
};

// Pixel format specification - tells OpenGL how to set up our graphics buffer
PIXELFORMATDESCRIPTOR pixelFormatSpecification {
    sizeof(PIXELFORMATDESCRIPTOR)   // nSize          : Size of struct, used as kind of versioning in Windows
  , 1                               // nVersion       :
  ,   PFD_DRAW_TO_WINDOW            // dwFlags        : Will draw in a window
    | PFD_SUPPORT_OPENGL            //                  Using OpenGL
    | PFD_DOUBLEBUFFER              //                  Use double buffering (smoother display)
  , PFD_TYPE_RGBA                   // iPixelType     : Use RGBA colors                        
  , 32                              // cColorBits     : 32 bits for color (8 each for R,G,B,A)
  , 0                               // cRedBits       : Not set
  , 0                               // cRedShift      : Not set
  , 0                               // cGreenBits     : Not set
  , 0                               // cGreenShift    : Not set
  , 0                               // cBlueBits      : Not set
  , 0                               // cBlueShift     : Not set
  , 8                               // cAlphaBits:    : 8 bits for alpha channel
  , 0                               // cAlphaShift    : Not set
  , 0                               // cAccumBits     : Not set
  , 0                               // cAccumRedBits  : Not set
  , 0                               // cAccumGreenBits: Not set
  , 0                               // cAccumBlueBits : Not set
  , 0                               // cAccumAlphaBits: Not set
  , 32                              // cDepthBits     : 32 bits for depth buffer
  , 0                               // cStencilBits   : Not set
  , 0                               // cAuxBuffers    : Not set
  , PFD_MAIN_PLANE                  // iLayerType     : Main drawing layer
  , 0                               // bReserved      : Not set
  , 0                               // dwLayerMask    : Not set
  , 0                               // dwVisibleMask  : Not set
  , 0                               // dwDamageMask   : Not set
};

 
/*
 * Main Program Entry Point
 * This code initializes OpenGL, creates a window, and runs the main rendering loop
 */

// Different entry points for Debug and Release builds
#ifdef _DEBUG
// Debug builds use console mode for easier debugging
int main() {
#else
// Release builds use regular Windows entry point
int WINAPI WinMain(
    HINSTANCE hInstance     // Handle to current instance
  , HINSTANCE hPrevInstance // Always NULL in Win32
  , LPSTR     lpCmdLine     // Command line arguments
  , int       nCmdShow      // Window display state
) {
#endif

  /*
   * Step 1: Initialize Window
   */
  
  #ifdef _DEBUG
  // In debug mode, we need to manually get the instance handle
  auto hInstance = GetModuleHandle(0);
  assert(hInstance && "Failed to get module handle");
  #endif

  // Complete the window class specification by setting the hInstance
  windowClassSpecification.hInstance = hInstance;
  
  // Register the window class with Windows. This is necessary to create a window 
  // instance later based on the specifications defined in `windowClassSpecification`.
  auto regOk = RegisterClassA(&windowClassSpecification);
  assert(regOk && "Failed to register window class");

  // Define the window style with flags for visibility, overlapping, and popup behavior.
  auto dwStyle = WS_VISIBLE | WS_OVERLAPPEDWINDOW | WS_POPUP;

  // Adjust the window size to account for window borders and title bar based on the specified
  // resolution (`xres` by `yres`). This ensures the client area matches the desired resolution.
  RECT windowRect = { 0, 0, xres, yres };
  auto rectOk = AdjustWindowRect(&windowRect, dwStyle, 0);
  assert(rectOk && "Failed to adjust window rect");

  // Calculate the dimensions of the adjusted window and find the center position 
  // based on the screen size, so the window will open centered on the screen.
  auto width        = windowRect.right - windowRect.left;
  auto height       = windowRect.bottom - windowRect.top;
  auto screenWidth  = GetSystemMetrics(SM_CXSCREEN);
  auto screenHeight = GetSystemMetrics(SM_CYSCREEN);

  // Create the window with the specified style, dimensions, and centered position.
  auto hwnd = CreateWindowExA(
      0                                       // No extended window styles
    , windowClassSpecification.lpszClassName  // Registered window class name
    , nullptr                                 // No window title
    , dwStyle                                 // Window style flags
    , (screenWidth - width) / 2               // Centered X position
    , (screenHeight - height) / 2             // Centered Y position
    , width, height                           // Window dimensions
    , nullptr, nullptr, nullptr, nullptr      // Parent, menu, instance, and param handles (unused)
  );
  assert(hwnd && "Failed to create window");

  /*
   * Step 2: Initialize OpenGL
   */

  // Obtain the device context (DC) for the specified window, which allows us to draw 
  // and interact with the window's graphics.
  auto hdc = GetDC(hwnd);
  assert(hdc && "Failed to get DC");

  // Set up the OpenGL pixel format for the window, specifying how pixels should be represented.
  auto pixelFormat = ChoosePixelFormat(hdc, &pixelFormatSpecification);
  assert(pixelFormat && "Failed to choose pixel format");

  // Apply the selected pixel format to the device context, ensuring that it is properly configured 
  // for OpenGL rendering.
  auto setOk = SetPixelFormat(hdc, pixelFormat, &pixelFormatSpecification);
  assert(setOk && "Failed to set pixel format");

  // Create and activate an OpenGL rendering context for the device context, which allows us 
  // to perform OpenGL operations in this window.
  auto hglrc = wglCreateContext(hdc);
  assert(hglrc && "Failed to create GL context");

  // Make the created OpenGL context current for the specified device context, enabling 
  // OpenGL commands to affect the window's rendering.
  auto makeOk = wglMakeCurrent(hdc, hglrc);
  assert(makeOk && "Failed to make GL context current");

  /*
   * Step 3: Set up Shader Program
   */

  #ifdef _DEBUG
  // Enable OpenGL debug output in debug builds
  glEnable(GL_DEBUG_OUTPUT);

  // Retrieve a pointer to the OpenGL function `glDebugMessageCallback` using `wglGetProcAddress`.
  // OpenGL functions like this one are often not directly accessible, as they may be specific 
  // to certain OpenGL versions or extensions. By looking them up at runtime, we ensure compatibility
  // with different graphics drivers and hardware setups.
  auto glDebugMessageCallback = (PFNGLDEBUGMESSAGECALLBACKPROC)wglGetProcAddress("glDebugMessageCallback");

  // Set up a debug callback function (`debugCallback`) to handle messages from the OpenGL driver,
  // like errors or performance warnings. This helps with diagnosing issues during development.
  glDebugMessageCallback(debugCallback, 0);
  #endif

  // Create the shader program using `glCreateShaderProgramv` which creates a shader 
  // program in one step by specifying the shader type and the shader source code. This function 
  // allows us to skip manual shader compilation and linking steps. We specify `GL_FRAGMENT_SHADER` 
  // as the shader type, with `1` indicating that there’s one shader source in `fragmentShaders`.
  GLchar const* fragmentShaders[] = { GetFragmentShaderSource() };
  auto glCreateShaderProgramv = (PFNGLCREATESHADERPROGRAMVPROC)wglGetProcAddress("glCreateShaderProgramv");
  auto shaderProgram = glCreateShaderProgramv(GL_FRAGMENT_SHADER, 1, fragmentShaders);

  // Ensure that `shaderProgram` was created successfully. A non-positive value would indicate
  // a failure to create the program, so we use an assertion to catch this in debug builds.
  assert(shaderProgram > 0 && "Failed to create shader program");

  #ifdef _DEBUG
  // Retrieve the compilation log for `shaderProgram` and print it
  auto glGetProgramInfoLog = (PFNGLGETSHADERINFOLOGPROC)wglGetProcAddress("glGetProgramInfoLog");
  glGetProgramInfoLog(shaderProgram, sizeof(debugLog), NULL, debugLog);
  printf(debugLog);

  // Final setup is complete, so disable debug output
  glDisable(GL_DEBUG_OUTPUT);
  #endif

  auto glGetUniformLocation = (PFNGLGETUNIFORMLOCATIONPROC)wglGetProcAddress("glGetUniformLocation");
  // Get the location of the `iTime` uniform in the shader program. This location will be used 
  // to set the value of `iTime`.
  auto iTimeLocation = glGetUniformLocation(shaderProgram, "iTime");
  // Get the location of the `iResolution` uniform in the shader program. This location is 
  // used to pass the resolution of the rendering window.
  auto iResolutionLocation = glGetUniformLocation(shaderProgram, "iResolution");
  assert(iTimeLocation > -1 && iResolutionLocation > -1 && "Failed to get uniform locations");

  // Activate the shader program so it will be applied to all pixels 
  // in subsequent draw calls, such as the upcoming call to `glRects`.
  auto glUseProgram = (PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram");
  glUseProgram(shaderProgram);

  /*
   * Step 4: Main Render Loop
   */

  // Start time (in milliseconds)
  auto before = GetTickCount64();
  auto done = false;
  MSG msg = {};

  // Get function pointers for setting uniforms
  auto glUniform1f = (PFNGLUNIFORM1FPROC)wglGetProcAddress("glUniform1f");
  auto glUniform3f = (PFNGLUNIFORM3FPROC)wglGetProcAddress("glUniform3f");

  while (!done) {
    // Process Windows messages in a loop. This is typical in a Win32 application to handle 
    // system events like keyboard input, window resizing, or close requests.
    while (PeekMessageA(&msg, 0, 0, 0, PM_REMOVE)) {
      // Check if the message is `WM_QUIT`, which indicates the application should close.
      // If so, set `done` to true to break out of the main loop.
      if (msg.message == WM_QUIT) done = true;
      // Prepare the message for further processing. `TranslateMessage` handles input-specific 
      // tasks like converting keystrokes into character messages.
      TranslateMessage(&msg);
      // Dispatch the message to the appropriate window procedure, which will handle the message 
      // (e.g., updating the window or responding to user actions).
      DispatchMessageA(&msg);
    }

    // Update shader uniforms with the current time and resolution.

    // Get the current time in milliseconds and calculate the elapsed time (`iTime`) 
    // since the program started, in seconds.
    auto now = GetTickCount64();
    auto iTime = (now - before) / 1000.0f;

    // Set the `iTime` uniform in the shader program with the calculated time.
    glUniform1f(iTimeLocation, iTime);

    // Set the `iResolution` uniform with the current window resolution (x, y, depth). 
    glUniform3f(
      iResolutionLocation
    , static_cast<GLfloat>(xres)
    , static_cast<GLfloat>(yres)
    , 1.0f
    );

    // Draw a fullscreen quad (rectangle) that covers the viewport from -1 to 1 
    // in normalized device coordinates. This applies the shader across the entire window.
    glRects(-1, -1, 1, 1);

    // Swap the front and back buffers to display the rendered frame on the screen.
    auto swapOk = SwapBuffers(hdc);
    assert(swapOk && "Failed to swap buffers");
  }

  // We are done, let windows clean up the resources
#if NOCRT
  // When compiling without CRT we need to kill the process ourselves
  ExitProcess(0);
#else
  return 0;
#endif
}

// Windows sends messages to our window through the WndProc callback function. 
// This allows us to respond to various events, such as resizing or closing the window.
LRESULT CALLBACK WndProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
  // Ignore system commands related to screensaver activation or monitor power 
  // management to prevent interference with our application.
  if (uMsg == WM_SYSCOMMAND && (wParam == SC_SCREENSAVE || wParam == SC_MONITORPOWER))
    return 0;

  // Handle window closing events. If the user requests to close the window, 
  // destroys the window, or presses the ESC key, we initiate shutdown.
  if (
    // Check if the window is being closed
        uMsg == WM_CLOSE 
    // Check if the window is being destroyed
    ||  uMsg == WM_DESTROY 
    // Check if the ESC key was pressed
    ||  (uMsg == WM_CHAR || uMsg == WM_KEYDOWN) && wParam == VK_ESCAPE) {
    // Post a quit message to the message queue, which will be picked up 
    // by our main loop to terminate the application.
    PostQuitMessage(0);
    return 0;
  }

  // Handle window resizing. Update the global variables with the new 
  // width and height, and adjust the OpenGL viewport accordingly.
  if (uMsg == WM_SIZE) {
    xres = LOWORD(lParam);  // Get the new width
    yres = HIWORD(lParam);  // Get the new height

    // Update the OpenGL viewport to match the new window size.
    glViewport(0, 0, xres, yres);
  }

  // For any other messages, forward them to the default window procedure 
  // for further processing.
  return DefWindowProcA(hWnd, uMsg, wParam, lParam);
}

GLchar const * GetFragmentShaderSource() {
  // Return the fragment shader source code using a raw string literal for convenience.
  // Shader by Kishimisu: https://www.shadertoy.com/view/mtyGWy
  return 
    R"SHADER(
#version 300 es
// Prelude compatible with simple ShaderToy shaders
precision highp float;

out vec4 fragColor;

// ShaderToy Uniforms
// These are the most commonly used ShaderToy uniforms.
uniform float iTime;          // ShaderToy's time uniform
uniform vec3 iResolution;     // ShaderToy's resolution (viewport) uniform

// ShaderToy-compatible mainImage function signature
void mainImage(out vec4 fragColor, in vec2 fragCoord);

void main() {
  // Pass the fragment coordinates to mainImage and output to fragColor
  mainImage(fragColor, gl_FragCoord.xy);
}

// Paste ShaderToy shader code here -->

/* This animation is the material of my first youtube tutorial about creative 
    coding, which is a video in which I try to introduce programmers to GLSL 
    and to the wonderful world of shaders, while also trying to share my recent 
    passion for this community.
                                        Video URL: https://youtu.be/f4s1h2YETNY
*/

//https://iquilezles.org/articles/palettes/
vec3 palette( float t ) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263,0.416,0.557);

    return a + b*cos( 6.28318*(c*t+d) );
}

//https://www.shadertoy.com/view/mtyGWy
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.5) - 0.5;

        float d = length(uv) * exp(-length(uv0));

        vec3 col = palette(length(uv0) + i*.4 + iTime*.4);

        d = sin(d*8. + iTime)/8.;
        d = abs(d);

        d = pow(0.01 / d, 1.2)  ;

        finalColor += col * d;
    }
        
    fragColor = vec4(finalColor, 1.0);
}
)SHADER";
}

}