-- This is a TIC-80 Christmas demo that creates a festive scene with
-- multiple visual effects: a fractal pattern, bouncing robot sprites,
-- and animated text. TIC-80 is a fantasy console (like a virtual
-- retro computer) with a 240x136 pixel screen and a 16-color palette.

-- Import math functions directly into our scope
-- This is a Lua convention that saves us from typing 'math.'
-- repeatedly and makes the code more readable
abs				= math.abs
cos 			= math.cos
sin 			= math.sin
floor		= math.floor
min 		 = math.min
max 		 = math.max

-- The strict() function helps catch common Lua programming errors
-- by detecting uses of undefined variables. This is helpful because
-- Lua normally creates global variables silently when you mistype
-- a variable name, which can lead to hard-to-find bugs.
function strict()
	local declared_globals = {}

	-- In Lua, _G is a special table that holds all global variables
	-- setmetatable lets us intercept attempts to read or write globals
	setmetatable(_G, {
		-- This function is called when code tries to create a new
		-- global variable. We make it throw an error instead of
		-- silently creating the variable.
		__newindex = function(_, name, value)
			if not declared_globals[name] then
				error("Attempt to create global variable '" .. name .. "'", 2)
				end
				rawset(_G, name, value)
			end,
		-- This function is called when code tries to read a global
		-- variable. We log a warning if the variable doesn't exist.
		-- Note: We can't crash here because TIC-80 constantly checks
		-- for certain global functions it needs to run.
		__index = function(_, name)
			if not declared_globals[name] then
				trace("Attempt to access undeclared global variable '" .. name .. "'", 2)
			end
			return nil
		end
	})
end

-- These are common mathematical helper functions that you'll often
-- see in graphics programming, especially in shader code. They're
-- essential tools for creating smooth animations and effects.

-- fract() gets the fractional part of a number
-- For example: fract(3.7) returns 0.7
function fract(a)
	return a-floor(a)
end

-- round() rounds a number to the nearest integer
-- For example: round(3.7) returns 4
function round(a)
	return floor(a+0.5)
end

-- clamp() constrains a value between a minimum and maximum
-- This is crucial for keeping values in a valid range
-- For example: clamp(150, 0, 100) returns 100
function clamp(a,b,c)
	return min(max(a,b),c)
end

-- smoothstep() creates a smooth transition between two values
-- It's commonly used in graphics to create natural-looking
-- transitions. The output is guaranteed to be between 0 and 1,
-- and the transition has smooth acceleration and deceleration.
function smoothstep(a,b,c)
	local t = clamp((c-a)/(b-a),0,1)
 return t*t*(3-2*t)
end

-- hash() creates a pseudo-random number from a single input
-- This is a common trick in shader programming where you need
-- deterministic randomness - the same input always gives the
-- same "random" output. It's based on the properties of sine
-- and floating-point numbers.
function hash(co)
  return fract(sin(co*12.9898) * 13758.5453)
end

-- mix() performs linear interpolation between two values
-- For example: mix(0, 100, 0.5) returns 50
function mix(a,b,x)
  return a+(b-a)*x
end

-- tanh_approx() is a fast approximation of the hyperbolic tangent
-- function. It's useful for creating smooth transitions that
-- flatten out at the extremes. This is a common optimization
-- in graphics programming where exact math isn't needed.
function tanh_approx(x)
	local x2 = x*x
 return clamp(x*(27 + x2)/(27+9*x2), -1, 1)
end

-- BDR is a special TIC-80 function that's called for every
-- scanline (horizontal line) of the screen. It's similar to
-- the raster interrupts used in old computers like the C64
-- to create effects that would otherwise be impossible due
-- to hardware color limitations.
function BDR(ln)
	local top,bottom
	top = 23+50
	bottom = 121
	if (ln < top) or (ln > bottom) then
		-- For the top and bottom portions of the screen,
		-- use the normal TIC-80 background color palette
		poke(0x3FC0, 0x1A)
		poke(0x3FC1, 0x1C)
		poke(0x3FC2, 0x2C)
	else
		-- For the middle portion, create a deep blue gradient
		-- by modifying the background color for each scanline
		poke(0x3FC0, 0x1A)
		poke(0x3FC1, 0x1C)
		poke(0x3FC2, 0x2C+3*(ln-top))
	end
end

-- This creates the main visual effect based on the apollonian
-- fractal. For each pixel, we:
-- 1. Transform the pixel coordinates into 3D space
-- 2. Apply a rotation to create movement
-- 3. Apply the apollonian fractal formula
-- 4. Draw the result in different colors
--
-- The effect creates an intricate pattern of curved lines
-- that seems to fold through space as it rotates.
function apollonianEffect(tm)
	local a,s,c1,s1,c2,s2,radii
	local anim,px,py,pz,spx,tmp
	local scale,r2,k
	s							= 1.25
	a							= tm*0.25
	-- Calculate rotation matrices
	c1						= cos(a)
	s1						= sin(a)
	c2						= cos(a*1.234)
	s2						= sin(a*1.234)

	-- Set the thickness of the lines we'll draw
	radii			= 0.005
	anim				= 1.5
	for x=0,99 do
		-- Convert screen coordinates to normalized space (-1 to 1)
		spx = -1+x*0.02
		-- Apply smoothing at the edges
		spx = tanh_approx(spx*anim)/anim
		for y=0,99 do
			px = spx
			py = -1+y*0.02
			px = px*0.5
			py = py*0.5
			-- Create animation in the z dimension
			pz = 0.3*(c1+s2)
			-- Apply 3D rotation to create movement
			tmp=  c1*px+s1*pz
			pz = -s1*px+c1*pz
			px = tmp

			tmp=  c2*py+s2*pz
			pz = -s2*py+c2*pz
			py = tmp
			scale = 1
			-- The apollonian fractal loop
			--	Many shaders based on this fractal
			--	For example IQ's: https://www.shadertoy.com/view/4ds3zn
			for i=0,2 do
				px = -1+2*fract(0.5*px+0.5)
				py = -1+2*fract(0.5*py+0.5)
				pz = -1+2*fract(0.5*pz+0.5)
				r2 = px*px+py*py+pz*pz
				k  = s/r2
				px = k*px
				py = k*py
				pz = k*pz
				scale = scale*k
			end

			scale = 1/scale

			-- Draw the fractal by testing each axis
			-- We draw three copies with different colors:
			-- center (blue), left (red), and right (green)
			if abs(pz)*scale < radii then
				-- Mid (blue)
				pix(x+70,y+18,11)
				-- Left (red)
				pix(69-x,y+18,3)
				-- Right (green)
				pix(269-x,y+18,5)
			end

			if abs(py)*scale < radii then
				-- Mid (blue)
				pix(x+70,y+18,10)
				pix(69-x,y+18,2)
				pix(269-x,y+18,6)
			end

			if abs(px)*scale < radii then
				-- Mid (blue)
				pix(x+70,y+18,9)
				-- Left (red)
				pix(69-x,y+18,1)
				-- Right (green)
				pix(269-x,y+18,7)
			end
		end
	end
end

-- This function creates a single bouncing robot sprite
-- that moves back and forth across the screen. The robot
-- automatically flips direction when it reaches the edges,
-- and its vertical position follows a bouncing pattern.
function bouncer(tm)
	local px,py,dx,tx,w,nx,fx,b,si
	w  = 240-48        -- Screen width minus sprite width
	dx = 80            -- Horizontal speed
	tx = dx*tm         -- Total distance traveled
	nx = (tx//w)%2     -- Number of complete travels (for direction)
	if nx == 0 then
		px = round(tx%w)   -- Moving right
		fx = 1
	else
		px = round(w-tx%w) -- Moving left
		fx = 0
	end
	-- Create bouncing motion using a parabola
	b  = fract(tm)-0.5
	b  = b*b
	py = round(50+100*b)
	-- Animate the sprite (alternating between two frames)
	si = floor(3*tm)%2
	spr(1+2*si,px,py,14,3,fx,0,2,2)
end

-- This creates a row of bouncing robots at the top of
-- the screen.
function topBar(tm)
	local px,py,dx,tx,w,nx,fx,b,si,i
	local h0,h1,sx
	dx = 30     -- Horizontal spacing
	sx = 20     -- Segment width

	for i=-1,11 do
		tx = dx*tm
		nx = tx//sx-i
		-- Create variation between robots using hash function
		h0	= hash(nx+123.4)
		h1 = fract(8667*h0)
		-- Calculate bounce with varying heights
		b  = fract(mix(1.5,0.5, h0*h0)*(tm+h0))-0.5
		b  = b*b
		b  = b
		px = round(tx%sx+i*sx)
		py = round(40*mix(0.25,1.0,h0)*(b-0.25)+3)
		si = floor(3*tm*mix(0.5,1.5,h1))%2
		-- Draw background bar and sprite
		-- Remove the white color (12) from
		--	the color cycle
		nx = (round(nx%15)-3)&0xF
		rect(px-2,0,sx,18,nx)
		-- Switching palette color 10
		--	This renders the sprite with
		--	different base colors
		poke4(0x3FF0*2+10,nx)
		spr(1+2*si,px-1,py,14,1,1,0,2,2)
		-- Restoring palette color 10
		poke4(0x3FF0*2+10,10)
	end
	line(0,18,240,18,12)
end

-- Creates the bottom banner with animated "Merry Christmas" text
-- The text moves in a sinusoidal pattern and includes a shadow
-- for better visibility
function bottomBar(tm)
	local px
	rect(0,118,240,136,8)
	line(0,118,240,118,12)

	-- Create moving text effect
	px = sin(tm)*40+30
	print("Merry Christmas", px+1,122+1,0,0,2)  -- Shadow
	print("Merry Christmas", px,122,12,0,2)     -- Text
end

-- TIC() is the main function that TIC-80 calls every frame
-- (60 times per second). Here we:
-- 1. Get the current time
-- 2. Clear the screen
-- 3. Draw all our effects in order
function TIC()
	local tm
	tm = time()/1000  -- Convert to seconds
	cls(0)           -- Clear screen to black

	-- Draw all effects
	apollonianEffect(tm)
	bouncer(tm)
	topBar(tm)
	bottomBar(tm)
end

-- Initial setup function
function setup()
-- Uncomment to enable strict mode for debugging
--	strict()
end

setup()