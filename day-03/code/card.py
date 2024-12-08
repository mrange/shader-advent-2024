import argparse
import glfw
from OpenGL.GL import *
import OpenGL.GL.shaders
from pathlib import Path
import time
from PIL import Image, ImageOps

VERTEX_SHADER = """
#version 330
attribute vec2 vertexIn;
void main() {
    gl_Position = vec4(vertexIn.xy,0.0,1.0);
}
"""

GEOMETRY_SHADER = """
#version 330

layout(points) in;
layout(triangle_strip, max_vertices = 4) out;

void main()
{
    gl_Position = vec4( 1.0, 1.0, 0.5, 1.0 );
    EmitVertex();

    gl_Position = vec4(-1.0, 1.0, 0.5, 1.0 );
    EmitVertex();

    gl_Position = vec4( 1.0,-1.0, 0.5, 1.0 );
    EmitVertex();

    gl_Position = vec4(-1.0,-1.0, 0.5, 1.0 );
    EmitVertex();

    EndPrimitive();
}
"""


def showPreview(window, shader):
    width, height = glfw.get_window_size(window)

    def windowSizeCallBack(_, w, h):
        nonlocal width, height
        width = w
        height = h

    glfw.set_window_size_callback(window, windowSizeCallBack)

    mode = 0

    def keyCallBack(window, key, scancode, action, mods):
        nonlocal mode
        if key == glfw.KEY_0:
            mode = 0
        if key >= glfw.KEY_1 and key <= glfw.KEY_4 and action == glfw.PRESS:
            mode = key - glfw.KEY_1 + 1

    glfw.set_key_callback(window, keyCallBack)

    glClearColor(0.0, 0.0, 1.0, 1.0)

    iResolutionLoc = glGetUniformLocation(shader, "iResolution")
    iModeLoc = glGetUniformLocation(shader, "iMode")
    iTimeLoc = glGetUniformLocation(shader, "iTime")

    startTime = time.time_ns()
    while not glfw.window_should_close(window):
        glfw.poll_events()

        glUniform2f(iResolutionLoc, width, height)
        glViewport(0, 0, width, height)
        glUniform1i(iModeLoc, mode)
        glUniform1f(iTimeLoc, (time.time_ns() - startTime) / 1e9)

        glClear(GL_COLOR_BUFFER_BIT)
        glDrawArrays(GL_POINTS, 0, 1)

        glfw.swap_buffers(window)


def createBuffers(width, height):
    fbo = glGenFramebuffers(1)
    color_buf = glGenRenderbuffers(1)
    depth_buf = glGenRenderbuffers(1)
    # binds created FBO to context both for read and draw
    glBindFramebuffer(GL_FRAMEBUFFER, fbo)
    # bind color render buffer
    glBindRenderbuffer(GL_RENDERBUFFER, color_buf)
    glRenderbufferStorage(GL_RENDERBUFFER, GL_RGBA8, width, height)
    glFramebufferRenderbuffer(
        GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, color_buf
    )
    # bind depth render buffer - no need for 2D, but necessary for real 3D rendering
    glBindRenderbuffer(GL_RENDERBUFFER, depth_buf)
    glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT, width, height)
    glFramebufferRenderbuffer(
        GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, depth_buf
    )
    return fbo, color_buf, depth_buf, width, height


def deleteBuffers(buffers):
    fbo, color_buf, depth_buf, width, height = buffers
    glBindFramebuffer(GL_FRAMEBUFFER, 0)
    glDeleteRenderbuffers(1, color_buf)
    glDeleteRenderbuffers(1, depth_buf)
    glDeleteFramebuffers(1, fbo)


def readColorBuffer(buffers):
    fbo, color_buf, depth_buf, width, height = buffers
    glPixelStorei(GL_PACK_ALIGNMENT, 1)
    glReadBuffer(GL_COLOR_ATTACHMENT0)
    data = glReadPixels(0, 0, width, height, GL_RGB, GL_UNSIGNED_BYTE)
    return data, width, height


def export(shader, imagesize, printsize):
    buffers = createBuffers(imagesize, imagesize)
    glViewport(0, 0, imagesize, imagesize)
    glUniform2f(glGetUniformLocation(shader, "iResolution"), imagesize, imagesize)
    glUniform1f(glGetUniformLocation(shader, "iTime"), 0)
    # draw background
    glUniform1i(glGetUniformLocation(shader, "iMode"), 1)
    glClear(GL_COLOR_BUFFER_BIT)
    glDrawArrays(GL_POINTS, 0, 1)
    data, width, height = readColorBuffer(buffers)
    image = Image.frombytes("RGB", (width, height), data)
    image = ImageOps.flip(image)
    dpi = imagesize / (printsize / 25.4)
    image.save("background.jpg", quality=98, dpi=(dpi, dpi))
    # draw foreground
    glUniform1i(glGetUniformLocation(shader, "iMode"), 2)
    glClear(GL_COLOR_BUFFER_BIT)
    glDrawArrays(GL_POINTS, 0, 1)
    data, width, height = readColorBuffer(buffers)
    image = Image.frombytes("RGB", (width, height), data)
    image = ImageOps.flip(image)
    image = ImageOps.mirror(image)
    image.save("foreground.jpg", quality=98, dpi=(dpi, dpi))
    deleteBuffers(buffers)


def main(preview, printsize, imagesize, shaderpath):
    fragmentShader = Path(shaderpath).read_text()
    # even if we are exporting, we'll use glfw to create the window just
    # to get an OpenGL context
    if not glfw.init():
        raise RuntimeError("Could not initialize glfw")
    window = glfw.create_window(
        1280, 720, "Holiday card (press 0 - 3 to change mode)", None, None
    )
    if not window:
        glfw.terminate()
        raise RuntimeError("Could not obtain a glfw window")
    glfw.make_context_current(window)
    # Compile The Program and shaders
    shader = OpenGL.GL.shaders.compileProgram(
        OpenGL.GL.shaders.compileShader(VERTEX_SHADER, GL_VERTEX_SHADER),
        OpenGL.GL.shaders.compileShader(fragmentShader, GL_FRAGMENT_SHADER),
        OpenGL.GL.shaders.compileShader(GEOMETRY_SHADER, GL_GEOMETRY_SHADER),
    )
    glUseProgram(shader)
    # Create Buffer object in gpu
    VBO = glGenBuffers(1)
    # Bind the buffer
    glBindBuffer(GL_ARRAY_BUFFER, VBO)
    if preview:
        showPreview(window, shader)
    else:
        export(shader, imagesize, printsize)
    glfw.terminate()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Export OpenGL fragment shaders as animated holiday card designs."
    )
    parser.add_argument(
        "-p",
        "--preview",
        help="Show preview of the shader instead of exporting.",
        action="store_true",
    )
    parser.add_argument(
        "-s",
        "--printsize",
        help="Size of the design once printed, in mm. Default: 145",
        type=float,
        default=145,
    )
    parser.add_argument(
        "-i",
        "--imagesize",
        help="Vertical and horizontal resolution of the exported JPGs. Default: 8192",
        type=int,
        default=8192,
    )
    parser.add_argument(
        "shaderpath",
        help="Path to the file containing the OpenGL fragment shader.",
        type=str,
    )
    args = parser.parse_args()
    main(**vars(args))
