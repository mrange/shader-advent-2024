// First check if the terminal supports Sixel graphics
//  On Windows you can use Windows Terminal 1.22.2912.0+ (at the time of writing in preview)
//  You can find Windows Terminal in Windows Store.
{
    // Clear any pending input from STDIN
    while (Console.KeyAvailable)
    {
        Console.ReadKey();
    }

    // Ask the terminal for its capabilities
    Console.Write("\x1B[c");

    // Wait for the terminal to respond
    Thread.Sleep(100);

    var sb = new StringBuilder();
    // Read all available input (non-blocking)
    while (Console.KeyAvailable)
    {
        var key = Console.ReadKey();
        sb.Append(key.KeyChar);
    }

    // Parse capabilities (semicolon-separated)
    var caps = sb
        .ToString()
        .Split(";")
        .Select(x => x.Trim())
        .ToHashSet();

    // Check if Sixel support is present (capability code '4')
    if (!caps.Contains("4"))
    {
        throw new Exception("Terminal does not support Sixel graphics");
    }
}

// Hide the cursor
Console.Write("\x1B[?25l");
// Clear the screen
Console.Write("\x1B[2J");

// TIC-80 fantasy console color palette
// See: https://tic80.com/
RGB[] tic80Palette =
[
    new RGB(0x0, 0x1C, 0x1C, 0x2C), // Night Blue
    new RGB(0x1, 0x5D, 0x27, 0x5D), // Deep Purple
    new RGB(0x2, 0xB1, 0x3E, 0x53), // Dark Red
    new RGB(0x3, 0xEF, 0x7D, 0x57), // Orange
    new RGB(0x4, 0xFF, 0xCD, 0x75), // Yellow
    new RGB(0x5, 0xA7, 0xF0, 0x70), // Light Green
    new RGB(0x6, 0x38, 0xB7, 0x64), // Green
    new RGB(0x7, 0x25, 0x71, 0x79), // Teal
    new RGB(0x8, 0x29, 0x36, 0x6F), // Dark Blue
    new RGB(0x9, 0x3B, 0x5F, 0xC9), // Blue
    new RGB(0xA, 0x41, 0xA6, 0xF6), // Light Blue
    new RGB(0xB, 0x73, 0xEF, 0xF7), // Cyan
    new RGB(0xC, 0xF4, 0xF4, 0xF4), // White
    new RGB(0xD, 0x94, 0xB0, 0xC2), // Light Gray
    new RGB(0xE, 0x56, 0x6C, 0x86), // Gray
    new RGB(0xF, 0x33, 0x3C, 0x57)  // Dark Gray
];

// Sixel constants
const byte SixelBase = 63;  // Base character '?' (ASCII 63)

// Screen dimensions
const int Width = 640;
const int Height = 400;
// Screen buffer - each byte represents one pixel
// Uses 4-bit color (16 colors) from the TIC-80 palette
// Values 0-15 map to indices in the tic80Palette array
var screen = new byte[Width * Height];

var builder = new StringBuilder();
var clock = Stopwatch.StartNew();
var fps = 60;
var sleepFor = (int)Math.Round(1000.0 / fps);

var done = false;
while (!done) 
{
    var before = clock.ElapsedMilliseconds;
    // Check for exit condition (Escape key)
    if (Console.KeyAvailable)
    {
        var key = Console.ReadKey();
        done |= key.Key == ConsoleKey.Escape;
    }

    // Generate a simple animated effect
    {
        var time = before / 1000.0;
        for (var y = 0; y < Height; ++y)
        {
            var yoff = y * Width;
            var yy = (-Height + 2.0 * y) / Height;
            for (var x = 0; x < Width; ++x)
            {
                var xx = (-Width + 2.0 * x) / Height;

                var d = 1E3;
                for (var i = 0; i < 5; ++i)
                {
                    var itime = time + i;
                    var xx2 = xx + Sin(itime);
                    var yy2 = yy + Sin(itime * 0.707);
                    var d2 = Sqrt(xx2 * xx2 + yy2 * yy2) - 0.5;
                    d = SoftMin(d, d2, 0.5);
                }

                var od = Abs(d) - 0.025;

                // Color selection based on distance field
                byte col = 8;
                if (d < 0.0)
                {
                    col = (byte)(((int)Round((d + time) * 16)) & 0xF);
                }
                if (od < 0.0)
                {
                    col = 12;
                }

                screen[x + yoff] = col;
            }
        }
    }

    // Render screen using Sixel graphics
    {
        builder
            .Clear()
            .Append("\x1B[H")      // Move cursor to home position
            .Append("\x1B[12t")    // Clear screen
            .Append("\x1BP7;1;q")  // Initialize Sixel mode (square pixels)
            ;

        // Define color palette
        foreach (var color in tic80Palette)
        {
            builder.Append($"#{color.Index};2;{color.Red.ToSixelColorComponent()};{color.Green.ToSixelColorComponent()};{color.Blue.ToSixelColorComponent()}");
        }

        // Convert pixel data to Sixel format
        // Each Sixel represents 6 vertical pixels
        for (var y6 = 0; y6 < Height; y6 += 6) 
        {
            // Process each color separately for RLE optimization
            foreach (var color in tic80Palette)
            {
                var idx = color.Index;
                builder.Append($"#{idx}");

                // Run-length encoding tracking
                byte repeatedSixel = SixelBase;
                int sixelRepetition = 0;

                for (var x = 0; x < Width; ++x) 
                {
                    byte sixel = 0;
                    // Handle edge case where height isn't divisible by 6
                    var rem = Min(6, Height - y6);
                    
                    // Build sixel by checking each vertical pixel
                    for (var i = 0; i < rem; ++i) 
                    {
                        var y = y6 + i;
                        var pixel = screen[x + y * Width];
                        if (pixel == idx)
                        {
                            sixel |= (byte)(1 << i);
                        }
                    }

                    sixel += SixelBase;

                    // Handle run-length encoding
                    if (repeatedSixel == sixel)
                    {
                        ++sixelRepetition;
                    }
                    else
                    {
                        // Output previous run
                        if (sixelRepetition > 3) 
                        {
                            // Use RLE for runs longer than 3
                            builder
                                .Append($"!{sixelRepetition}")
                                .Append((char)repeatedSixel);
                        } 
                        else 
                        {
                            // Direct output for short runs
                            for(var i = 0; i < sixelRepetition; ++i) 
                            {
                                builder.Append((char)repeatedSixel);
                            }
                        }

                        repeatedSixel = sixel;
                        sixelRepetition = 1;
                    }
                }

                // Output final run if not empty
                if (repeatedSixel != SixelBase)
                {
                    if (sixelRepetition > 3) 
                    {
                        builder
                            .Append($"!{sixelRepetition}")
                            .Append((char)repeatedSixel);
                    } 
                    else 
                    {
                        for(var i = 0; i < sixelRepetition; ++i) 
                        {
                            builder.Append((char)repeatedSixel);
                        }
                    }
                }

                builder.Append('$');  // Return to start of line
            }

            builder.Append('-');  // Move to next row
        }

        // End Sixel sequence
        builder.Append("\x1B\\");

        // Output to console
        Console.Write(builder.ToString());
    }

    // Maintain target framerate
    var after = clock.ElapsedMilliseconds;
    var elapsed = after - before;
    if (elapsed < sleepFor)
    {
        Thread.Sleep((int)(sleepFor - elapsed));
    }
}

// Helper functions
double Mix(double a, double b, double x)
{
    return a + (b - a) * x;
}

// Smooth minimum function
// License: MIT, author: Inigo Quilez
// Source: https://www.iquilezles.org/www/articles/smin/smin.htm
double SoftMin(double a, double b, double k) 
{
    var h = Clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return Mix(b, a, h) - k * h * (1.0 - h);
}

record RGB(byte Index, byte Red, byte Green, byte Blue);

static class Extensions
{
    // Convert 8-bit color component to Sixel color range (0-100)
    public static byte ToSixelColorComponent(this byte c)
    {
        return (byte)Round(c * 100.0 / 255);
    }
}