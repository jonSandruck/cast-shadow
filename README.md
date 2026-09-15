# cast-shadow

Shadows that point away from a light source fixed in the viewport. As an
element moves across the screen, its shadow swings to match — growing
longer, softer and fainter the further it gets from the light.

No dependencies. No build step. Two files.

## Install

Copy `cast-shadow.css` and `cast-shadow.js` into your project, then:

```html
<link rel="stylesheet" href="cast-shadow.css">
<script type="module" src="cast-shadow.js"></script>
```

Mark anything you want to cast a shadow:

```html
<div class="card" data-cast>…</div>
```

That's the whole setup. The script starts itself and picks up elements
added later.

> **Heads up:** ES modules don't load over `file://`. Opening the HTML by
> double-clicking it will fail with a CORS error. Serve the folder instead —
> `python3 -m http.server` is enough.

## Move the light

The light lives in CSS, so most projects never touch the JavaScript:

```css
:root {
  --cast-light-x: 50%;   /* percentages, px, vw and vh all work */
  --cast-light-y: 0%;
}
```

## Tuning

Every visual decision is a custom property. Override them anywhere the
cascade reaches — globally, per component, inside a media query, inside a
dark-mode block.

| Property | Default | What it does |
| --- | --- | --- |
| `--cast-length` | `28px` | Shadow throw at maximum distance |
| `--cast-blur-near` | `3px` | Blur for elements at the light |
| `--cast-blur-far` | `26px` | Blur at maximum distance |
| `--cast-alpha-near` | `0.34` | Opacity at the light |
| `--cast-alpha-far` | `0.12` | Opacity at maximum distance |
| `--cast-color` | `12 14 24` | Shadow colour, as RGB channels |
| `--cast-ease` | `t * (2 - t)` | Falloff curve for length |
| `--cast-max-distance` | viewport diagonal | Distance at which `--cast-t` reaches `1` |

A different look is just a class:

```css
.warm {
  --cast-length: 48px;
  --cast-blur-far: 40px;
  --cast-color: 92 46 12;
}
```

### Shape mode

By default the shadow follows the element's border box, which is right for
cards, buttons and panels. For a cutout PNG or an SVG, switch to the alpha
silhouette:

```html
<svg data-cast="shape">…</svg>
```

Three things to know before you use it:

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
| `--cast-t` | `0` to `1` | Normalised distance from the light |

The stylesheet turns those into an offset, a blur and an opacity. If you
want a different relationship between distance and shadow, you change CSS,
not JavaScript.

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
  selector: '[data-cast]',   // which elements to track
  root: document,            // subtree to watch
  light: { x: '20%', y: '10%' },  // overrides the CSS properties
  maxDistance: null,         // null = viewport diagonal
});

shadows.setLight('80%', '0%');  // move the light
shadows.refresh();              // re-measure after a layout change
shadows.destroy();              // remove listeners and properties
```

Calling `castShadow()` replaces the instance that started on import, so the
two never fight over the same element.

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
  neighbour. This is a lighting *effect*, not a lighting model.
- **Very long throws stop reading as light.** Past roughly 60px the effect
  starts to look like a sticker with a smear under it. Raise
  `--cast-length` carefully.

## Browser support

Needs `@property`, `IntersectionObserver` and `ResizeObserver` — Chrome and
Edge 85+, Safari 16.4+, Firefox 128+. Older browsers ignore the custom
properties and fall back to the static shadow.

## Demo

`index.html`. Serve the folder and open it, then click anywhere to move the
light.
