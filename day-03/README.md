# 🎅🃏✉️Merry shader holiday cards🎄🎉🎅

‼️ Ah, it's that time of the year: time to send the seasonal greeting cards!
Making your own cards is fun, but alas, we are just shader coders; we only know
how to make cool shaders. If only there was a way to make holiday cards from
shaders 🤔....

But there is!🎉 It's called [barrier-grid (🚧-🏁)
animations](https://en.wikipedia.org/wiki/Barrier-grid_animation_and_stereography).
 Today we will show how you can convert your shader into an
animated holiday card.

Sneak peek of the result (click to watch on Youtube):

[![Video showing a animated holiday card made from
shader](https://img.youtube.com/vi/iDa7Zn4C6UA/0.jpg)](https://www.youtube.com/watch?v=iDa7Zn4C6UA)

## 🎁Introduction🎁

This technique was developed when participating to the [Demoscene Holiday Card
Exchange](https://demoscene.exchanges.cards) over the past few years. The
barrier-grid animations were inspired by the overhead projector demo [Shapes by
Cortex](https://www.pouet.net/prod.php?which=53773).

The card consists of a background, printed on a white paper, and a foreground,
printed on a transparent film and cut to the shape of a circle. The foreground
has a black-and-white spiral; or opaque-and-transparent spiral when printed on a
film. A hole is punched in the middle of both the background and the foreground,
and they are attached using a brass fastener. This allows the foreground to be
rotated 360 degrees. As the foreground is rotated, the spiral reveals different
parts of the background, creating an animation. This is a kind of [barrier-grid
animation](https://en.wikipedia.org/wiki/Barrier-grid_animation_and_stereography),
with a spiral shaped barrier. These are also sometimes known as scanimations or
Moiré animations.

The designs are prototyped with
[Shadertoy](https://www.shadertoy.com/view/lcycD3), exported as JPG with Python,
printed using a laser printer on paper and on film, and finally assembled onto a
cardboard backing.

## 🛒Materials and tools needed⚒️

This takes a bit of preparation. In particular, finding laser transparency films
from brick-and-mortar shops was surprisingly hard nowadays, so I just ordered
them online. The rest you can get from a well-stocked craft store.

<img src="images/materials.jpg" alt="Photograph of transparent film, brass fasteners, cardboard, spray adhesive, super glue, hole punch, precision cutting knife, compass, cutting board, paper, newspaper and disposable gloves" width="600 dp"/>

1. **Transparent film, suitable for printing.** Laser printers require specific
   type of films that can withstand the heat without warping and shrinking.
   Furthermore, there's both monochrome laser and color laser transparencies,
   which apparently have slightly different coatings. The basic design only uses
   grayscale foregrounds, so monochrome laser transparencies are ok. I used
   "Lyreco Transparency film for monochrome laser printer", material: PET, size:
   A4.
2. **Brass fasteners.** I used brass paper fasteners (split pins), with a width
   of ~ 3 mm.
3. **Cardboard.** Each card requires a 150 mm × 450 mm rectangle. I used 500 mm
   × 650 mm 240 g/m<sup>2</sup> cardboard sheets from Canson, so each sheet
   gives 4 cards. I preferred dark cardboard (black, ultramarine), because the
   animation will be quite dark, due to majority of the foreground being black.
4. **Spray adhesive.** I used Maston 500 ml Spray Adhesive. Not all of them are
   equal: some cheaper brands created awful clumps and did not spray evenly.
5. **Super glue.** I used Loctite 5g Precision. Some of the cheap stuff doesn't
   actually glue anything, so go with Loctite if you want to be sure that the
   glue works.
6. **Hole punch.** This should match the size of the brass fasteners. Mine were
   3 mm, so I used a 3 mm punch. Note that it needs to reach the center of the
   film and the paper, so it needs to be one of the types that look a bit like
   hollow cylinders. The ones that only reach a few cm from the edge of the
   paper cannot be used.
7. **Precision cutting knife**. X-Acto or similar.
8. **Compass**. The tool for drawing circles, not the device for finding the
   magnetic north.
9. **Paper cutting board**. Preferably with one dimension over 450 mm and a
   grid.
10. **White paper**.
11. **Newspaper or similar**. On which one can apply the spray adhesive.
12. **Disposable gloves**. The spray adhesive and superglue are kinda nasty on
    fingers, so use these when applying the adhesives.
13. **Scissors**.

## 🎞️Making the animation as a OpenGL shader🎞️

The OpenGL shader should output both the background (paper print) and the
foreground (film print). First, write a general shader effect in Shadertoy with
an animation that loops with a period of t = 1. So the looping animation can be
a function `vec3 animation(vec2 uv,float t) {...}` which takes the screen
coordinates (from -1 to 1) and time as parameters and outputs an RGB color.

The foreground will be a 16-armed spiral with 50 rings from center to edge, with
majority of it being black and 20% will be transparent (white). For each pixel
we can calculate "phase", with something like `float phase =
mod(16*atan2(uv.y,uv.x)/(2*pi)+50*length(uv),1)` and in the foreground, if
`phase < 0.2`, then the pixel is white, otherwise it is black. The spiral loops
after it is turned 1/16th circle, so in the final card, the animation starts
looping after the foreground is turned 1/16th circle. The foreground looks like
this:

<img src="images/foreground.jpg" alt="Foreground of the shader barried-grid animation" width="600 dp"/>

These images have been downscaled for the web; use the Python scripts below to
generate high resolution versions of the designs for printing.

The background print is now simply produced by `vec3 pixelcolor =
animation(uv,phase)`, where phase is calculated using the same equation as in
the foreground. Note that due to the duty cycle of the foreground being 20%, at
every instance we see not only the current slice t of the animation, but all
colors in a time range of [t,t - 0.2]. So there will be significant "motion
blur". Decreasing the duty cycle reduces the motion blur, but makes the whole
animation darker, and vice versa. You may want to experiment here to get the
results you want; values from 0.2 to 0.3 usually worked well. The background
looks like this:

<img src="images/background.jpg" alt="Background of the shader barried-grid animation" width="600 dp"/>

The background includes some cutting aides, to cut it into a square. Also, both
the foreground and the background should include a circle in the center, to
indicate where the hole should be punched (e.g., a 3 mm circle).

Finally, due to alignment errors in the final card, the effect tends to break
near the middle and to work better on the edges. Thus, effects with darkness in
the middle (tunnels, starfields) seem to work the best.

Examples of animations I've made over the years are in the table below. Click on
the links to see source code or the ShaderToy prototype. In ShaderToy, use mouse
to see how the animation looks as a barrier-grid animation.

| Year | Effect | Source                          | Shadertoy prototype                                                                                    |
|------|--------|---------------------------------|--------------------------------------------------------------------------------------------------------|
| 2024 | Snow   | [snow.frag](code/snow.frag)     | [![Snow](https://www.shadertoy.com/media/shaders/lcycD3.jpg)](https://www.shadertoy.com/view/lcycD3)   |
| 2023 | Torus  | [torus.frag](code/torus.frag)   | [![Torus](https://www.shadertoy.com/media/shaders/mlKcWt.jpg)](https://www.shadertoy.com/view/mlKcWt)  |
| 2022 | Gears  | [gears.frag](code/gears.frag)   | [![Gears](https://www.shadertoy.com/media/shaders/DssSDS.jpg)](https://www.shadertoy.com/view/DssSDS)  |
| 2021 | Tunnel | [tunnel.frag](code/tunnel.frag) | [![Tunnel](https://www.shadertoy.com/media/shaders/NtKGWh.jpg)](https://www.shadertoy.com/view/NtKGWh) |

The codes here are extremely unoptimized and slow for what they do, but that
doesn't matter, as they will be running on a holiday card with more computing
power than your computer. 😸🤡

Now, fork one of the shaders on ShaderToy and make your own animation! Once you
are happy with your shader, save it into .frag file, following the examples
above, and continue to the next step.

## 🚀Exporting the designs as JPGs using Python🚀

I wrote a simple script [card.py](code/card.py) that uses PyOpenGL to render the
design and Pillow-PIL to export it as a JPG.

Prerequisites: [Python](https://www.python.org/) and
[poetry](https://python-poetry.org/). Then:

1. Download all the files from the subfolder [code/](code)

2. Run:

```
poetry install
poetry run python card.py <your_shader>.frag
```

This will export background.jpg and foreground.jpg, with nominal sizes of 145 mm
× 145 mm in 8192 × 8192 resolution.

Try `poetry run python card.py --help` for more options; `--preview` allows
previewing the design before exporting. I had to disable the Windows GPU driver
[timeout detection and recovery](https://github.com/ROCm/ROCm/issues/2335) as
some of the designs were so slow to export... 🦥

## 🖨️Printing the design🖨️

To print the designs, a high quality color laser printer is preferred, as the
animation will work better when the tiny lines are sharp.

Print the background.jpg on a normal white paper and foreground.jpg on the
transparent film.

Note that the Python script *mirrors* foreground design: we want the printed
side of the film facing directly against the printed side of the paper.
Otherwise, there will be a gap equal of the film thickness between the
foreground and the background, which makes the animation work less well. The
designs include some small and large circles to allow figuring out which side is
which; otherwise it's a bit tough to see from the film.

To actually print the designs on Windows, Paint has good enough control of the
final dimensions of the print. It read the DPI correctly, so if you do Page
Setup before printing (File -> Print -> Page Setup), you can make the final
print centered on paper and exactly 145 mm x 145 mm.

## ✂️Making the card📏

Time to get crafty and actually make the card!

1. Cut a 150 mm × 450 mm rectangle from the cardboard.

<img src="images/rectangle.jpg" alt="Photograph showing a 150 mm × 450 mm rectangle cut from cardboards" width="600 dp"/>

2. With the backside of the knife, score the cardboard, splitting the cardboard
   into a 151 mm left, 150 mm middle and a 149 mm right section. This slight
   difference in the sizes of the sections ensures that the right section will
   fold nicely below the left section. Then flip the cardboard over, so the
   scored side is down.

<img src="images/scoring.jpg" alt="Photograph showing how cardboard can be scored into three sections with the backside of a knife" width="600 dp"/>

3. Fold the right section to the center, then the left section on top. The
   scored side should be the outside of the folds. Then unfold both sections
   again.

<img src="images/fold_sides.jpg" alt="Photograph showing how the three sections are folded, with the scored side on the outside of the fold" width="600 dp"/>

4. Mark the center of the right section. This is done by drawing two diagonal
   lines from corner to corner.

<img src="images/mark_center.jpg" alt="Photograph showing how the center of the right section is marked by drawing two diagonal lines" width="600 dp"/>

5. Use a compass to draw a 130 mm diameter (65 mm radius) circle centered on the
   right section. The drawing should be inside, so it will not be visible in the
   final card.

<img src="images/draw_circle.jpg" alt="Photograph swowing how a compass is used to draw a 65 mm radius circle on the right section of the card" width="600 dp"/>

6. Carefully cut out the circle, using scissors or a knife.

<img src="images/cut_circle.jpg" alt="Photograph showing cutting a circle" width="600 dp"/>

7. Cut the background print into a 145 mm × 145 mm square. You can use scissors
   here; this cut is not super critical.

<img src="images/cut_background.jpg" alt="Photograph showing cutting the background design from paper" width="600 dp"/>

8. Cut a 130 mm × 130 mm square from white paper.

<img src="images/cut_paper_square.jpg" alt="Photograph showing cutting a 130 mm × 130 mm square from paper" width="600 dp"/>

9. Place the background print and the white paper square on newspaper, face
   down, and spray them with the spray adhesive. Do this outdoors; the spray
   adhesive smells bad and makes all nearby surfaces sticky (duh). Use gloves.

<img src="images/spray_adhesive.jpg" alt="Photograph showing how spray adhesive is applied behind the papers" width="600 dp"/>

10. Glue the background print to the middle section, with 2.5 mm surrounding
   margin on each side. Glue the white square to the left section, with 10 mm
   surrounding margin on each side.

<img src="images/glue_papers.jpg" alt="Photography showing how the background and the paper squares are glued to the middle and left sections, respectively" width="600 dp"/>

11. Cut the foreground film print into a 140 mm circle. Use the symbols on the
    film to figure which side of the film is which; we want the printed side of
    the film facing directly against the printed side of the paper.

<img src="images/cut_foreground.jpg" alt="Photograph showing cutting the foreground circle using scissors" width="600 dp"/>

12. Punch the centers of both the background (with cardboard backing) and the
    foreground. Try to hit the center as close as possible; if it's misaligned,
    the animation will wobble.

<img src="images/punch_center.jpg" alt="Photograph showing how a 3 mm hole is punched to the center of the background" width="600 dp"/>

13. Use a brass fastener to attach the foreground to the background.

<img src="images/split_pin_backside.jpg" alt="Photograph showing the backside of the card, with the split pin coming through to the backside" width="600 dp"/>

14. Place a drop of super glue into each of the four corners of the middle
    section, then fold the right section on top. Use a fresh pair of gloves,
    just in case.

<img src="images/superglue.jpg" alt="Photograph showing four drops of super glue, one in each corner of the middle section" width="600 dp"/>

15. Done!

<img src="images/final.jpg" alt="Photograph of the final card" width="600 dp"/>

Enjoy your shader holiday card! Merry XMas and Happy Holidays! 🎅🃏✉️🎉🎅 - pestis

## ❄️Licensing Information❄️

My code is [CC0](https://creativecommons.org/public-domain/cc0/) (effectively
public domain). Any code snippets from other developers retain their original
licenses.

The text and content is licensed under [CC BY-SA
4.0](https://creativecommons.org/licenses/by-sa/4.0/)





