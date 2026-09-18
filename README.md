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
| `--cast-edge-light` | `0.55` | Lit rim strength |
| `--cast-edge-dark` | `0.22` | Shaded rim strength |

Two inset shadows reusing the same vector, composed into the same
`box-shadow` as the drop shadow — `box-shadow` isn't additive, so all the
layers have to be declared in one place. It is the cheapest thing in the
library and does more for the illusion than anything else in it.

The same headroom rule applies as surface mode. Measured on the demo's pale
tile, the lit rim moves the surface 1.6 levels while the shaded rim moves it
41.7. On a dark panel it inverts.

**Unlike the shadow and the sheen, the rim does not fade with distance.**
That's deliberate: those are broad soft areas where falloff reads as light,
but a hairline crossing a fade threshold reads as flicker. Multiply by
`(1 - var(--cast-t))` yourself if you want it to fall off.

**Two notes:**

- A border sits outside the inset rim and competes with it. Edge mode reads
  best on an element with no border.
- It doesn't combine with shape mode — `inset` follows the border box, not
  the alpha silhouette, and shape mode clears `box-shadow` entirely. Edge
  and surface do combine, and that pairing is the strongest look here.

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
| `--cast-sheen-reach` | `45%` | How far each term carries in from its edge |
| `--cast-grain` | `0.09` | Grain opacity |
| `--cast-grain-size` | `140` | Grain tile size, in px |
| `--cast-grain-image` | fractal noise | Set to `none` to drop it |

The sheen angle comes from CSS `atan2()`, so this needs no extra
JavaScript. Grain exists to break up banding — large soft gradients band
badly on 8-bit displays, and it halves its tile on high-DPI screens so the
grain stays at device-pixel scale instead of going soft.

**Costs, stated plainly:**

- Surface mode uses **both** `::before` and `::after`. If you need those
  pseudo-elements, you can't use it on that element.
- It sets `isolation: isolate`, which creates a stacking context.
- It isn't designed to combine with shape mode.

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
- **Rims thin on the diagonal.** The offset is a unit vector scaled by the
  rim width, so a rim sits a full `--cast-edge-width` on axis and about
  0.7 of it at 45°. Invisible at the 1px default.

## Browser support

Needs `@property`, `atan2()`, `IntersectionObserver` and `ResizeObserver` —
Chrome and Edge 111+, Safari 16.4+, Firefox 128+. Older browsers ignore the
custom properties and fall back to the static shadow.

## Demo

`index.html`. Serve the folder and open it, then click anywhere to move the
light.
