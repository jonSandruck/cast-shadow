# cast-shadow

A light source with a position in three dimensions. Objects sit at a height
above the page, and their shadows are **projected** from that geometry
rather than styled by hand.

Move the light, or scroll, and every shadow re-aims itself. Raise an object
and its shadow lengthens and softens together, because both come from the
same number.

No dependencies. No build step. Two files.

## Install

Copy `cast-shadow.css` and `cast-shadow.js` into your project, then:

```html
<link rel="stylesheet" href="cast-shadow.css">
<script type="module" src="cast-shadow.js"></script>
```

Mark anything you want lit:

```html
<div class="card" data-cast>…</div>
```

That's the whole setup. The script starts itself and picks up elements
added later.

> **Heads up:** ES modules don't load over `file://`. Opening the HTML by
> double-clicking it will fail with a CORS error. Serve the folder instead —
> `python3 -m http.server` is enough.

## The model

For a light at height `H` and an object at height `h`, sitting a horizontal
distance `d` from the light:

```
offset = d × h / (H − h)
```

Similar triangles, nothing more. Two things fall out for free:

- An object at `h = 0` gets no offset. Flat on the page means no throw.
- An object directly beneath the light gets no offset at any height.

That same `h / (H − h)` factor is the **penumbra ratio**, so blur comes from
one multiply instead of a hand-tuned curve. Two objects at the same height
share a blur no matter where they sit on screen. That consistency is what
makes a layout read as one lit scene rather than a pile of separate shadows.

## Light colour

```css
:root { --cast-light-color: var(--cast-2700k); }
```

Tints everything the light reaches — the surface sheen, the lit rim, the
room's pool. It takes any colour, so a hex or an `oklch()` works; the
Kelvin scale ships as named constants, computed from the Planckian locus
and normalised so the brightest channel is 1.

| Token | Hex | Reads as |
| --- | --- | --- |
| `--cast-1800k` | `#ff7e00` | candle |
| `--cast-2700k` | `#ffad59` | incandescent |
| `--cast-3000k` | `#ffb86d` | warm white |
| `--cast-3500k` | `#ffc78b` | soft white |
| `--cast-4000k` | `#ffd3a5` | neutral white |
| `--cast-5000k` | `#ffe6d0` | horizon daylight |
| `--cast-5600k` | `#ffefe4` | studio strobe |
| `--cast-6500k` | `#ffffff` | D65, and sRGB white |
| `--cast-7500k` | `#ebecff` | overcast sky |
| `--cast-9000k` | `#d6dfff` | open shade |
| `--cast-12000k` | `#c0d1ff` | clear blue sky |

**Neutral is 6500K, not 4000K.** sRGB's white point *is* D65, so 6500K is
white by definition and every warmer temperature reads yellow on screen.
4000K is "neutral white" in a room and a visible tungsten wash on a
display. 6500K is snapped to pure white so the default tints nothing —
D65 sits on the daylight locus rather than the blackbody one, so the
strictly accurate value lands a shade off and would tint every page by a
third of a level for no reason.

CSS cannot evaluate the conversion, so this is a table rather than a
function. `--cast-light-color: 3200K` is not a thing; moving the maths
into JavaScript would allow it, at the cost of room mode's "needs no
JavaScript" property.

### Shadows stay neutral, deliberately

A warm light does not make warm shadows, and it does not make cool ones
either. A shadow is only tinted when some *other* source fills it — sun
plus sky, or a lamp plus a window — and that is a second light, not a
property of this one. One bulb in a room bounces off the walls at roughly
its own temperature, so its shadows come out darker, not bluer.

The cool-shadow-under-warm-key effect is real and worth having, but it
belongs to a multiple-light model. Tinting shadows from a single light's
colour would be dressing up a two-lamp effect as one, so this doesn't.

There is also a practical reason. An unlit colour has to be darker than
whatever it sits on, and pure black always is. A tinted dark is not: mixing
a pale sky blue into black gives `rgb(30, 31, 36)`, which is darker than
paper and *lighter* than a dark page — so tinted shadows vanish in dark
mode. Shadows keep their own knobs.

## The light

```css
:root {
  --cast-light-x: 50%;      /* percentages, px, vw and vh all work */
  --cast-light-y: 0%;
  --cast-light-z: 600;      /* height above the page, unitless px */
  --cast-light-size: 350;   /* width of the source, unitless px */
}
```

`--cast-light-size` is the most useful dial here. It's the width of the
source, so it controls softness without touching position:

| Value | Reads as |
| --- | --- |
| `60` | Hard midday sun, crisp edges |
| `350` | Softbox. The default |
| `900` | Overcast sky, very diffuse |

Soft interface shadows imply a very large source, which is why the default
is bigger than it first looks.

### Why unitless

`calc()` won't reliably divide a length by a length — Level 3 requires a
plain number as the divisor, and Level 4's type math isn't something to
build on yet. So heights are unitless numbers meaning pixels, and the
arithmetic multiplies by `1px` at the end.

This isn't a style choice. Elevation is per-element and lives in CSS. If
JavaScript needed it, JavaScript would have to call `getComputedStyle` on
every element — the exact cost this design exists to avoid.

## Elevation

```css
.card   { --cast-elevation: 20; }
.dialog { --cast-elevation: 80; }
```

Height above the page, in px. Rough guide:

| Range | Suits |
| --- | --- |
| `2`–`8` | Pressed states, inset panels, hairline lift |
| `12`–`24` | Cards, buttons, tiles |
| `40`–`64` | Dropdowns, popovers, tooltips |
| `80`–`120` | Modals, sheets, anything that owns the screen |

There's no `--cast-length`. Shadow throw is derived, not set.

## Tuning

| Property | Default | What it does |
| --- | --- | --- |
| `--cast-elevation` | `20` | Height above the page, in px |
| `--cast-light-z` | `600` | Light height, in px |
| `--cast-light-size` | `350` | Source width — the softness dial |
| `--cast-color` | `12 14 24` | Shadow colour, as RGB channels |
| `--cast-alpha-near` | `0.34` | Opacity at the light |
| `--cast-alpha-far` | `0.12` | Opacity at maximum range |
| `--cast-throw-max` | `90` | Safety clamp on throw, in px |

Opacity falloff is the one deliberately unphysical knob. It stands in for
ambient fill, and without it distant shadows read as tar.

The clamp matters because the projection is honest: as `h` approaches `H`,
the offset runs to infinity. Correct, but not useful.

## Edge mode

A hairline rim: lit on the side facing the light, shaded on the side away
from it.

```html
<div class="panel" data-cast="edge">…</div>
```

| Property | Default | What it does |
| --- | --- | --- |
| `--cast-edge-width` | `1` | Rim width, in px |
| `--cast-edge-lit` | 30% of the light's colour | Colour of the lit rim |
| `--cast-edge-shade` | `rgb(0 0 0 / 0.34)` | Colour of the shaded rim |
| `--cast-edge-overhead` | 29% of the shade colour | Rim colour with the light straight above |

Two inset shadows reusing the same vector, composed into the same
`box-shadow` as the drop shadow — `box-shadow` isn't additive, so all the
layers have to be declared in one place. On its own it adds no element and
no stacking context, which makes it the cheapest thing in the library, and
it does more for the illusion than anything else in it.

The offset is divided by the vector's larger component, so the rim sits at
exactly `--cast-edge-width` on its dominant edge at every angle. Scaling
the raw unit vector instead would leave only 0.707px at 45°, which
antialiasing dilutes by about a third — and the rim then visibly pulses as
the light swings around. Measured across eight light positions, strength
now varies by 0%.

Both are full colours rather than bare alphas, so a warm lamp can give a
warm rim:

```css
--cast-edge-lit: rgb(255 240 205 / 0.34);
```

The same headroom rule applies as surface mode, and the defaults are
balanced by measurement rather than by eye. On the demo's pale tile the
shaded rim lands at 22.7 ΔL\*; on its dark tile the lit rim lands at 22.6.
Each surface leans on whichever end has room and the other costs nothing,
so one pair of values holds up in both themes.

**On a near-white panel you cannot have a highlight.** White over `#fcfbf9`
moves it 0.2 ΔL\*. That is not a tuning failure, it is the display: there
is nothing above white. Light-mode form comes from the shaded side, which
is also how a real white object looks. If you want a visible lit rim, the
panel has to come off pure white first.

**Unlike the shadow and the sheen, the rim does not fade with distance.**
That's deliberate: those are broad soft areas where falloff reads as light,
but a hairline crossing a fade threshold reads as flicker. Multiply by
`(1 - var(--cast-t))` yourself if you want it to fall off.

**Its direction fades with angle**, by the same obliqueness term as the
sheen — an edge lit from straight above has no bright side and no dark
side. Measured on a mid-grey tile at `d = 250`, the directional rim runs
45.3 levels with the light at `H = 200` and 7.6 at `H = 1600`. That is a
different curve from distance fade and does not bring the flicker with
it: obliqueness moves smoothly with position, so the hairline never steps.

**The light doesn't vanish either.** As the direction fades, an even ring
takes over, in `--cast-edge-overhead`. On a solid object the rim is a
bevel, the rounded edge between top and side. Lit from straight above,
the top faces the light squarely and the bevel tilts away, so the bevel
is evenly lit but *dimmer* than the face: at a 45 degree bevel it gets
cos 45 = 0.71 of the face's light, so the default is 29% of the dark rim
colour. On glass it's the lit colour instead — see `glass` below. Numbers
are under *overhead* in surface mode.

It is applied by mixing whatever colour you set toward transparent rather
than by owning the alpha, so `--cast-edge-lit` and `--cast-edge-shade`
stay full colours you can replace outright, and a warm rim set by hand
still fades with angle.

**An opaque child hides the rim.** An inset shadow paints above the
element's background but *below* its content, and there is no `z-index` for
it, because it isn't a layer. On a card with a full-bleed photo the rim
measured 1-3 levels of luminance, which is nothing.

Adding `surface` fixes it. When both modes are on, the rim is drawn on
surface mode's `::before` instead, so it rides `--cast-surface-z` along
with the sheen — under the content by default, over the photo when lifted.
Measured on the same cards: 1-3 levels before, 23-68 lifted. At the default
`--cast-surface-z: -1` it paints in exactly the same place as the
element-level rim, so nothing changes for a card whose own background
shows.

If you want a lifted rim and no sheen, add `surface` and zero the gradient:

```css
--cast-sheen: 0;
--cast-shade: 0;
--cast-surface-z: 2;
```

Edge on its own is untouched by any of this — no pseudo-element, no
`position: relative`, and it can still share an element with room mode.

**Two notes:**

- **Don't pair it with a border.** A border and a lit rim are two ways to
  draw the same edge, and running both draws it twice. The rim paints just
  inside the border box, so a border sits immediately outside it. Measured
  across a card's left edge in light mode, luminance ran
  `176 → 216 → 171 → 246` with a border and `179 → 171 → 221 → 245`
  without — two contrast reversals inside 2px, versus one clean ramp. Dark
  mode does the same thing (`12 → 51 → 25 → 36`). Either way it reads as a
  misregistered stroke, so let the rim be the edge.
- It doesn't combine with shape mode — `inset` follows the border box, not
  the alpha silhouette, and shape mode clears `box-shadow` entirely. Edge
  and surface do combine, and that pairing is the strongest look here.

## Room mode

Lights the space rather than the object: a pool centred on the lamp,
falling off to a vignette at the edges. Works on the page or on any
element.

```html
<body data-cast="room">              <!-- the whole page -->
<section data-cast="room">…</section> <!-- just this box -->
```

| Property | Default | What it does |
| --- | --- | --- |
| `--cast-room-reach` | `900` | Radius of the lit pool, in px |
| `--cast-room-light` | `rgb(255 255 255 / 0.1)` | Colour of the pool |
| `--cast-room-dark` | `rgb(0 0 0 / 0.16)` | Colour of the vignette |
| `--cast-grain` | `0.4` | Grain strength |
| `--cast-grain-size` | `140` | Grain tile size, in px |
| `--cast-grain-blend` | `overlay` | How the grain composites |
| `--cast-grain-z` | `-1`, or `9999` on body | Which layer the grain sits on |

**It never touches `background-image`.** The pool is drawn on a pseudo-element
overlay, so it composites over whatever backgrounds the element already has
without needing to know what they are. Stacking gradients into
`background-image` by hand works, but only if you already know the full
stack; this doesn't.

**It needs no JavaScript.** The pool's position falls out of numbers already
on the element:

```css
at calc(50% - var(--cast-ux) * var(--cast-d) * 1px)
   calc(50% - var(--cast-uy) * var(--cast-d) * 1px)
```

The element's centre is `50% 50%` of its own box and the vector to the light
is `(ux, uy) × d`, so subtracting one from the other gives the light's
position inside that element, in the element's own coordinates. The gradient
centre is allowed to fall outside the box, so this keeps working when the
light is nowhere near the element.

**`<body>` is a special case, deliberately.** Its box is the whole document,
so an absolute overlay would repaint a gradient thousands of pixels tall on
every scroll frame. On body the overlay is fixed instead, which paints the
viewport only — and since the gradient box is then the viewport, the light's
own properties position it directly with no arithmetic at all. Body also
gets `box-shadow: none`, since a room is the space rather than an object
floating above itself.

**Grain hides banding by camouflage, so scale matters more than strength.**
A disrupting pattern hides an edge when it sits near the scale of that edge,
and averages harmlessly away when it is much finer. Raising
`--cast-grain-size` does more than raising `--cast-grain`.

That is also why `--cast-grain-size` is the only scale knob, and why it is
enough. Making the noise coarser by dropping `feTurbulence`'s
`baseFrequency` instead leaves the tile the same size while the features
inside it grow, so there are fewer of them per tile and the repeat becomes
obvious. Scaling the tile grows the features and the period together.

Grain is specified in CSS px and is the same at every device pixel ratio.
An earlier version halved it above `2dppx` to keep each speckle one device
pixel wide, which was backwards — it made the technique weakest on exactly
the displays where banding is most visible. Per-pixel noise also picks up
colour fringing from an RGB-stripe panel, a second reason to keep it coarse.

One detail makes loud grain possible at all: the noise tile is **opaque**,
with its alpha channel forced to 1. `feTurbulence` leaves alpha varying
along with colour, which makes the tile a translucent grey film that can
only ever add light, so turning it up washes a dark page out instead of
dithering it.

**Pick the blend per surface.** `overlay` and `soft-light` swap relative
strength depending on how light the ground is. Measured noise amplitude:

| | `overlay` | `soft-light` |
| --- | --- | --- |
| Light ground | 0.52 | 0.26 |
| Dark ground | 0.46 | 0.91 |

So `soft-light` is the gentler of the two on a light surface and the louder
one on a dark surface. The demo takes `soft-light` in light mode and
`overlay` in dark.

**On `<body>` the grain sits above the content**, which is the second thing
body needs a special case for. `mix-blend-mode` only blends within its own
stacking context, and a body background has already gone to the canvas,
which is painted outside it — so an isolated grain layer has nothing to
blend against and silently falls back to plain alpha. Measured on a dark
page at grain `0.5`, that pushes mean luminance up 74 levels; lifting the
layer out brings the drift to 6. Set `--cast-grain-z: -1` to put it back
underneath, at the cost of that wash.

Room mode uses both pseudo-elements, so it can't share an element with
surface mode. Put room on the container and surface on the things inside it.

## Surface mode

`box-shadow` only ever describes the space *behind* an object. Surface mode
lights the object's own face:

```html
<div class="panel" data-cast="surface">…</div>
```

You get a face modelled from both ends — highlight toward the light,
shading away from it — plus fine grain.

**Tune by surface, not by theme.** Compositing leaves almost no headroom at
the top of a light surface: white at alpha `0.14` over `#fcfbf9` moves the
red channel from 252 to 252.4, under half a level. Black at the same alpha
takes it to 216.7 — a change roughly 84 times larger. On a dark surface it
inverts. So a light panel is modelled almost entirely by `--cast-shade` and
a dark one almost entirely by `--cast-sheen`, and the pair self-balances
without needing to know which theme is active.

| Property | Default | What it does |
| --- | --- | --- |
| `--cast-sheen` | `0.14` | Highlight strength on the lit edge |
| `--cast-shade` | `0.09` | Shading strength on the unlit edge |
| `--cast-sheen-reach` | from light size | Terminator width; `45%` at the default source |
| `--cast-surface-z` | `-1` | Which layer the modelling sits on |
| `--cast-grain` | `0.2` | Grain opacity |
| `--cast-grain-size` | `280` | Grain tile size, in px |
| `--cast-grain-z` | `-1` | Which layer the grain sits on |
| `--cast-grain-image` | fractal noise | Set to `none` to drop it |

### The light's height and size reach the face too

Throw and blur both come from `h / (H - h)`, so they always answered to
the light's height. The face modelling did not — it knew only direction
and distance. Moving the light from 200 to 1600 changed the throw 8.3x
and the sheen 0x.

Two terms fix that.

**Obliqueness** is `d / (H - h)`: how far the light is off to one side
compared with how far up. It is 0 directly overhead, 1 at 45 degrees, and
clamps there because the look saturates well before the ratio does. The
directional parts of the sheen and the rim both scale by it, so a face lit
from straight above has no brighter side and one lit from a low raking
angle has a strong one.

Measured on a mid-grey tile, sheen spread in levels of luminance, at the
default light height of 600:

| distance | `H` = 200 | `H` = 600 | `H` = 1600 |
| --- | --- | --- | --- |
| 0 | 0.5 | 0.5 | 0.5 |
| 250 | 19.4 | 8.8 | 3.4 |
| 550 | 12.2 | 11.6 | 4.4 |

This also fixes a quieter bug. At `d = 0` an element sits exactly on the
light, so `--cast-ux` and `--cast-uy` are both zero and the gradient angle
is whatever `atan2(0, 0)` returns. The sheen used to be at full strength
there — 23.5 levels, its maximum — pointing nowhere in particular. Now it
is 0.5.

**Overhead** is the other half of the same angle: `1 - obliqueness`, 1
straight above and 0 from 45 degrees out. It exists because obliqueness
alone was half a fix. Every face effect scaled by it, so as the light
arrived over a surface the sheen and the rim faded to exactly zero — the
light vanished where it is strongest, right where room mode's pool is
brightest. Directly under a lamp, neither side of a face is brighter than
the other, but the face is still lit.

So as the light comes overhead, the directional effects hand over to even
ones: a uniform wash on the face, and an even ring on the rim. The amount
of light stays about the same; only its direction goes.

The ring is where solid and glass differ. A solid tile's edge is a bevel
tilting away from an overhead light, so it ends up slightly *darker* than
the face. A glass tile's edge glows, because light through the pane
catches the inside of it. Rim delta against the face, over mid-grey:

| light distance | solid: face L\* | solid: rim | glass: face L\* | glass: rim |
| --- | --- | --- | --- | --- |
| 900 | 67.5 | +9.2 / −21.1 | 49.0 | +24.7 / −21.2 |
| 300 | 69.0 | +1.9 / −14.0 | 51.6 | +20.5 / −0.9 |
| 0, before any of this | 67.6 | 0.0 / 0.0 | 48.7 | 0.0 / 0.0 |
| 0, now | 72.1 | −6.7 / −6.7 | 56.2 | +22.6 / +22.6 |

An earlier version of this change drew the lit ring on everything, which
put a solid tile's edge *brighter* than its face under the lamp. That's
right for glass and wrong for anything you can't see through.

What this changes on a real page:

- **Light mode, pale surfaces:** the face doesn't change — a white wash on
  near-white has no headroom — but the edge comes back. Under the lamp a
  pale card's rim used to measure +0.4, gone; now it's −8.7 all round.
- **Dark mode:** a card under the lamp lifts about +7 L\*, and its edge
  sits just darker than the face. Things with their own background on that
  card, like code chips, don't lift, so they stand out a little more there.
- **Far from the light:** nothing. With the light off to one side, every
  viewport of the demo was pixel-identical.
- **Reduced motion and no JavaScript:** the static fallback puts the light
  at a middling distance, inside 45 degrees, so it picks up a little of
  both. On a dark card, +1.1 L\* on the face.


**Source size** sets `--cast-sheen-reach`, the width of the terminator. A
small hard source draws a tight, high-contrast falloff; a big soft one
draws a gradual wash. Same number that sets the shadow's blur, so the two
stay consistent instead of one being crisp while the other is soft.

| `--cast-light-size` | reach |
| --- | --- |
| `20` | 16.9% |
| `60` | 30.3% |
| `350` | 45.0% |
| `900` | 47.9% |

It saturates near the top, which is correct rather than lazy: past a
certain source size the terminator is already as soft as a linear
gradient can draw, even while the shadow keeps on blurring. The default
source lands at 44.99%, which is exactly where this sat as a fixed
number, so a page that never touches light size sees no change from it.

**What this costs.** Obliqueness is never above 1, so it can only reduce
the sheen, never raise it. Elements beyond `H - h` from the light are
unchanged; nearer ones get weaker, which is the whole point. On the demo's
text cards the sheen drops about 20% and the rim about 23%. The defaults
were not raised to compensate — doing that would have made distant faces
stronger than they used to be, to hide a correction that is the feature.

Nothing here changes the browser floor. It is `min()`, `clamp()`,
`color-mix()` and ordinary `calc()`, all already required.

The sheen angle comes from CSS `atan2()`, so this needs no extra
JavaScript. Grain exists to break up banding — large soft gradients band
badly on 8-bit displays. Its scale is the same at every device pixel ratio,
for the reason given under room mode: grain hides banding by camouflage,
and camouflage needs to be near the scale of what it's hiding.

**An opaque child hides it.** The modelling paints at `z-index: -1`, behind
the element's content, so a photo filling a card covers it completely —
measured corner-to-corner spread across such a card face is `0`. Lift it
with `--cast-surface-z: 2` and the sheen falls on the photo, where the light
would actually land. With `edge` on as well, the same number lifts the rim.

On a photo the rim does most of the work. A photograph brings its own
detail, so a soft gradient over it stays quiet — measured, the sheen moves
a bright photo by about 7 levels and a near-black one by 14 — while a
hairline at the border reads immediately.

That costs contrast wherever it crosses type. On the demo's muted body text
a sheen takes it from `5.27:1` to `4.54:1` at `0.07` and `3.92:1` at `0.14`,
which is below AA. Lift it for media cards, leave it alone for text-heavy
ones.

**Costs, stated plainly:**

- Surface mode uses **both** `::before` and `::after`. If you need those
  pseudo-elements, you can't use it on that element.
- It sets `isolation: isolate`, which creates a stacking context.
- It isn't designed to combine with shape mode.

### See-through surfaces: `glass`

```html
<div class="panel" data-cast="surface edge glass">…</div>
```

For an element whose background is translucent. Without it, the grain
gets louder and lighter as the background gets clearer.

That comes from the isolation above. `mix-blend-mode` only blends inside
its own stacking context, so the grain's backdrop is the element's own
background and nothing behind it. As that background goes transparent
there is nothing left to blend with, and the blend quietly turns into
plain alpha compositing. At alpha 0, `soft-light` grain measured the same
as `normal` — the blend mode had stopped doing anything.

Grain's own contribution as the background's alpha falls from 1 to 0, on
a tile over a mid-grey page, with `soft-light` blending:

| | grain RMS | mean shift |
| --- | --- | --- |
| `surface` | 1.01 → 3.05 | +3.7 → +13.9 |
| `surface glass` | 1.00 → 1.36 | +3.7 → +5.2 |

**`glass` also picks the blend, and that matters as much as the rest.**
Under `overlay`, the library default, the same fix only takes the grain
from RMS 3.07 to 2.80. `overlay` is a contrast boost centred on mid-grey,
so it's quiet over dark and light backdrops and loud over mid-tones —
which is what most photographs are. Grain on a glass tile at alpha 0:

| backdrop | `overlay` | `soft-light` |
| --- | --- | --- |
| dark | RMS 0.88, +3.5 | RMS 1.37, +5.2 |
| mid-tone | RMS 2.80, +11.1 | RMS 1.36, +5.2 |
| light | RMS 0.94, +3.2 | RMS 0.50, +1.7 |

Everywhere else the blend is picked per surface. Behind glass the surface
is whatever sits back there, which the library can't know, so `glass`
takes the blend whose worst case is better: `soft-light`, at half of
`overlay`'s.

`glass` is seven settings, and you can write them yourself instead:

```css
.panel {
  isolation: auto;       /* let the layers see what's behind */
  --cast-surface-z: 2;   /* sheen above the background */
  --cast-grain-z: 9999;  /* grain above the background */

  /* a stronger rim, to match an opaque card's */
  --cast-edge-lit: color-mix(in srgb, var(--cast-light-color) 50%, transparent);
  --cast-edge-shade: rgb(0 0 0 / 0.45);

  /* under the lamp, light through the pane lights the inside of the edge */
  --cast-edge-overhead: var(--cast-edge-lit);

  --cast-grain-blend: soft-light;  /* steady over any backdrop */
}
```

Dropping the isolation alone is not enough. Without it, layers at `-1`
paint *behind* the element's own background — on an opaque tile the sheen
measured 0.00. So both layers come up as well. With all three, the sheen
matches an ordinary surface at every alpha, and so does the grain on an
opaque `glass` tile.

**The rim is stronger on purpose.** A see-through face doesn't stand out
from what's behind it, so the rim does all the outlining. Real glass is
also brightest at its edges: light that enters the face gets trapped
inside the pane and leaks out at the edge. The target is the same edge
definition an opaque card gets. Over the demo's window photograph:

| | lit side, dark theme | shade side, light theme |
| --- | --- | --- |
| glass, default rim | +55.0 | −42.1 |
| glass, stronger rim | +80.2 | −54.7 |
| opaque card | +76.5 | −57.8 |

**Don't tune glass by theme.** A dark theme usually means a dark surface,
so it's natural to switch sheen or blend with the theme. Glass is the
exception: its surface is the backdrop, which doesn't change with the
theme. The demo tinted its glass tiles with the theme's surface colour
and lost the symmetry badly — over the same photo, +18.1 L* in light
mode against −6.4 in dark. Clear tiles with no per-theme overrides land
at +2.4 and +2.6. If you want a tint, pick one per backdrop, not per
theme.

**Your own CSS wins.** `glass` is written with the specificity of one
class, so a class of yours loaded after the library overrides any of the
seven. An earlier version used two attribute selectors and beat
`.panel { --cast-surface-z: 1 }`; that's fixed.

**Costs.** Both layers now sit over the content, so they tint text, the
same trade as `--cast-surface-z: 2` on a photo card. It does nothing
without `surface`. And it doesn't frost anything: add your own
`backdrop-filter` if you want blur.

**One thing CSS can't do.** An element's own drop shadow is clipped to
outside its box, so you never see the shadow *through* a clear tile.
Measured on a fully clear tile, the inside read the same as open page
while the shadow below it was 18 levels darker. Real glass would show
its shadow through itself.

## Shape mode

By default the shadow follows the border box, which is right for cards,
buttons and panels. For a cutout PNG or an SVG, trace the alpha silhouette:

```html
<svg data-cast="shape">…</svg>
```

Three things to know:

- `filter` creates a stacking context **and** a containing block. Any
  `position: fixed` descendant will anchor to this element instead of the
  viewport.
- It costs more to paint than `box-shadow`.
- `drop-shadow` has no spread parameter, so there is no spread knob.

Don't apply it to opaque images. A `.png` photo has no transparency, so the
box is already correct and cheaper.

## How it works

The script writes three unitless numbers per element and makes no styling
decision at all:

| Property | Range | Meaning |
| --- | --- | --- |
| `--cast-ux` | `-1` to `1` | Horizontal direction away from the light |
| `--cast-uy` | `-1` to `1` | Vertical direction away from the light |
| `--cast-d` | px | Horizontal distance from the light |

It also writes `--cast-max-d` once on `:root`, so the stylesheet can derive
`--cast-t` — a `0`-to-`1` range value — without a second per-element write.

Distance arrives raw rather than normalised because the shadow is
projected, not styled. The stylesheet divides it by the light's height and
the element's own elevation.

### Performance

Element geometry is measured once and cached in document space. The scroll
path then reads `scrollX`/`scrollY` a single time per frame and does pure
arithmetic — no `getBoundingClientRect`, no `getComputedStyle`, no layout
thrash. Re-measuring happens only on resize or when an element changes size.

An `IntersectionObserver` culls anything offscreen, so a page with a
thousand elements only computes the dozen you can see. Writes are skipped
entirely when a value hasn't changed.

## JavaScript API

Only needed if you want to configure something.

```js
import { castShadow } from './cast-shadow.js';

const shadows = castShadow({
  selector: '[data-cast]',        // which elements to track
  root: document,                 // subtree to watch
  light: { x: '20%', y: '10%' },  // overrides the CSS properties
  maxDistance: null,              // null = viewport diagonal
});

shadows.setLight('80%', '0%');  // move the light
shadows.refresh();              // re-measure after a layout change
shadows.destroy();              // remove listeners and properties
```

Calling `castShadow()` replaces the instance that started on import, so the
two never fight over the same element.

Note that `x` and `y` are JavaScript's business but `z` is not. Height lives
in CSS with elevation, because they have to be in the same unit space for
the projection to mean anything.

## Accessibility

Under `prefers-reduced-motion: reduce` the script stops writing entirely and
the stylesheet falls back to a static shadow pointing straight down. The
same fallback applies if JavaScript never runs — the CSS alone gives you an
ordinary, tasteful shadow. The script only makes it directional.

## Known limitations

- **Scrolling sub-containers.** Elements inside their own scroll container
  are positioned against the document, not that container, so their shadows
  won't track correctly. Call `refresh()` on that container's scroll if you
  need it.
- **Shadows don't land on anything.** `box-shadow` draws behind its own
  element. There's no occlusion and nothing catches a shadow cast by a
  neighbour. This is a lighting *effect*, not a renderer.
- **One light.** Two objects can't be lit from different directions.

## Browser support

Needs `@property`, `atan2()`, `IntersectionObserver` and `ResizeObserver` —
Chrome and Edge 111+, Safari 16.4+, Firefox 128+. Older browsers ignore the
custom properties and fall back to the static shadow.

## Demo

`index.html` opens with a hero where the light follows your pointer, then
shows each capability with a live example and its code, then gets technical:
install, how it works, and the full reference. Serve the folder and open it;
below the hero, click anywhere to move the light.

The library is still the two files at the root. `demo/img/` holds
photographs for the documentation page only, chosen for luminance spread
because that is what stresses the modelling: a bright portrait at mean 118,
a mid-tone still life at 104, and the Hubble deep field at 20. One more,
a patterned window, sits behind the glass example so there is something
to see through.

All but the window came from `scikit-image`'s bundled sample data:

| File | Source |
| --- | --- |
| `portrait.jpg` | NASA — astronaut Eileen Collins, public domain |
| `deepfield.jpg` | NASA/ESA — Hubble Deep Field, public domain |
| `coffee.jpg`, `cat.jpg` | scikit-image sample data |
| `avatar.jpg` | Rocket launch, scikit-image sample data |
| `window.jpg` | Patterned window glass, [Unsplash](https://unsplash.com/photos/a-blurry-image-of-a-diamond-pattern-on-a-window-GY2KahLf4fY), Unsplash License. Cropped to a 5:2 band and resized to 1000×400 |

**Check the licences yourself before publishing this page anywhere
public.** NASA imagery is public domain and safe, and the Unsplash
License allows free use without attribution, though the credit above is
good manners. The scikit-image samples are distributed for use with that
project and I have not verified their terms for other uses. Swapping in your own photos is a one-line change per
card.
