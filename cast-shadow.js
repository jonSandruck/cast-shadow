/**
 * cast-shadow
 *
 * Directional shadows driven by a light source anchored to the viewport.
 * As an element travels across the screen, its shadow swings to point
 * away from the light, lengthening and softening with distance.
 *
 * This file makes no styling decisions. It writes three unitless numbers
 * per element and lets cast-shadow.css decide what they mean:
 *
 *   --cast-ux   horizontal direction away from the light  (-1 to 1)
 *   --cast-uy   vertical direction away from the light    (-1 to 1)
 *   --cast-d    horizontal distance from the light, in px
 *
 * Distance is handed over raw rather than normalised because the shadow
 * is projected, not styled: the stylesheet divides it by the light's
 * height and the element's own elevation. Those live in CSS, and reading
 * them from here would mean a getComputedStyle call per element — the
 * exact cost this design exists to avoid.
 *
 * Importing this module starts it automatically with sensible defaults.
 * Call castShadow() only if you need to configure something.
 */

const DEFAULTS = {
  /** Which elements get a shadow. */
  selector: '[data-cast]',
  /** Subtree to watch. */
  root: null,
  /** Light position, e.g. { x: '50%', y: '0%' }. Null reads it from CSS. */
  light: null,
  /** Range over which --cast-t reaches 1. Null uses the viewport diagonal. */
  maxDistance: null,
};

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const PROPS = ['--cast-ux', '--cast-uy', '--cast-d'];
const MAX_DISTANCE_PROP = '--cast-max-d';

/**
 * Resolve a CSS-ish length against a viewport axis.
 * Accepts numbers, '120px', '50%', '50vw', '20vh', or a bare '120'.
 */
function toPixels(value, axisSize) {
  if (typeof value === 'number') return value;

  const text = String(value ?? '').trim();
  if (!text) return 0;

  const amount = parseFloat(text);
  if (!Number.isFinite(amount)) return 0;

  if (text.endsWith('%')) return (amount / 100) * axisSize;
  if (text.endsWith('vw')) return (amount / 100) * window.innerWidth;
  if (text.endsWith('vh')) return (amount / 100) * window.innerHeight;
  return amount;
}

/** Read a custom property off the root element, or '' if unset. */
function readRootProperty(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Is this element carried by a fixed ancestor?
 *
 * Checking the element's own `position` is not enough: a static child of a
 * fixed header is itself pinned to the viewport, and treating it as part of
 * the document makes its shadow swing on scroll when it should sit still.
 *
 * The memo is shared across one measure pass, so a page full of siblings
 * walks each shared ancestor once rather than once per element.
 */
function isViewportFixed(element, memo) {
  const chain = [];
  let node = element;

  while (node && node !== document.documentElement) {
    if (memo.has(node)) {
      const known = memo.get(node);
      for (const seen of chain) memo.set(seen, known);
      return known;
    }

    if (getComputedStyle(node).position === 'fixed') {
      for (const seen of chain) memo.set(seen, true);
      memo.set(node, true);
      return true;
    }

    chain.push(node);
    node = node.parentElement;
  }

  for (const seen of chain) memo.set(seen, false);
  return false;
}

/** Trim float noise so we write short strings and skip no-op updates. */
function round(value) {
  return Math.round(value * 1000) / 1000;
}

function createInstance(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const root = config.root ?? document;

  /** Element -> cached geometry. Never read during scroll. */
  const entries = new Map();
  /** Elements currently on or near screen. */
  const visible = new Set();

  const light = { x: 0, y: 0 };
  let maxDistance = 1;

  let frame = 0;
  let remeasure = true;
  let stopped = false;

  const reducedMotion = window.matchMedia(REDUCED_MOTION);

  // ---- Measuring -------------------------------------------------------
  //
  // The expensive pass. Runs on start, on resize, and when elements change
  // size, never on scroll. Positions are cached in document space so the
  // update pass can derive screen position from a single scroll read.

  function measure() {
    const scrollLeft = window.scrollX;
    const scrollTop = window.scrollY;

    // An unset custom property computes to an empty string, not undefined,
    // so fall through on falsiness rather than nullishness.
    const declaredX = config.light?.x ?? readRootProperty('--cast-light-x');
    const declaredY = config.light?.y ?? readRootProperty('--cast-light-y');

    light.x = toPixels(declaredX || '50%', window.innerWidth);
    light.y = toPixels(declaredY || '0%', window.innerHeight);

    const declaredMax = config.maxDistance ?? readRootProperty('--cast-max-distance');
    const resolvedMax = toPixels(declaredMax, window.innerWidth);
    maxDistance =
      resolvedMax > 0
        ? resolvedMax
        : Math.hypot(window.innerWidth, window.innerHeight);

    // One write on the root, inherited by every element, so the stylesheet
    // can normalise distance without a second per-element property.
    document.documentElement.style.setProperty(
      MAX_DISTANCE_PROP,
      round(maxDistance),
    );

    // Batch every read together. Interleaving reads and writes here is
    // what turns a smooth page into a slideshow.
    const fixedMemo = new Map();

    for (const [element, entry] of entries) {
      const box = element.getBoundingClientRect();
      // Anything pinned to the viewport never moves on screen, so its
      // shadow must not swing as the page scrolls. Cache it in viewport
      // space instead of document space.
      const isFixed = isViewportFixed(element, fixedMemo);

      entry.fixed = isFixed;
      entry.x = box.left + box.width / 2 + (isFixed ? 0 : scrollLeft);
      entry.y = box.top + box.height / 2 + (isFixed ? 0 : scrollTop);
    }
  }

  // ---- Updating --------------------------------------------------------
  //
  // The cheap pass. Two scroll reads total, then pure maths and style
  // writes for the handful of elements actually on screen.

  function update() {
    const scrollLeft = window.scrollX;
    const scrollTop = window.scrollY;

    for (const element of visible) {
      const entry = entries.get(element);
      if (!entry) continue;

      const centreX = entry.fixed ? entry.x : entry.x - scrollLeft;
      const centreY = entry.fixed ? entry.y : entry.y - scrollTop;

      const deltaX = centreX - light.x;
      const deltaY = centreY - light.y;
      const distance = Math.hypot(deltaX, deltaY);

      // Direction and distance travel separately: the projection that
      // turns them into an offset needs the element's elevation, which
      // only the stylesheet knows.
      const unitX = distance ? round(deltaX / distance) : 0;
      const unitY = distance ? round(deltaY / distance) : 0;
      const span = round(distance);

      if (
        unitX === entry.lastX &&
        unitY === entry.lastY &&
        span === entry.lastD
      ) {
        continue;
      }

      entry.lastX = unitX;
      entry.lastY = unitY;
      entry.lastD = span;

      element.style.setProperty('--cast-ux', unitX);
      element.style.setProperty('--cast-uy', unitY);
      element.style.setProperty('--cast-d', span);
    }
  }

  function schedule({ measureFirst = false } = {}) {
    if (stopped || reducedMotion.matches) return;
    if (measureFirst) remeasure = true;
    if (frame) return;

    frame = requestAnimationFrame(() => {
      frame = 0;
      if (remeasure) {
        remeasure = false;
        measure();
      }
      update();
    });
  }

  // ---- Observers -------------------------------------------------------

  // Only elements on or near screen get updated. A page with a thousand
  // cards still only does work for the dozen you can see.
  const intersectionObserver = new IntersectionObserver(
    (records) => {
      for (const record of records) {
        if (record.isIntersecting) visible.add(record.target);
        else visible.delete(record.target);
      }
      schedule();
    },
    { rootMargin: '25%' },
  );

  // An element that changes size has moved its own centre.
  const resizeObserver = new ResizeObserver(() => schedule({ measureFirst: true }));

  // Pick up elements added after load without needing a manual refresh.
  let syncQueued = false;
  const mutationObserver = new MutationObserver(() => {
    // Fires once per DOM change. Collapse a burst into a single rescan
    // rather than running querySelectorAll on every mutation.
    if (syncQueued || stopped) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      if (!stopped) sync();
    });
  });

  function clearProperties(element) {
    for (const property of PROPS) element.style.removeProperty(property);
  }

  /** Reconcile the tracked set with what is actually in the DOM. */
  function sync() {
    const found = new Set(root.querySelectorAll(config.selector));

    for (const element of found) {
      if (entries.has(element)) continue;
      entries.set(element, { x: 0, y: 0, fixed: false });
      intersectionObserver.observe(element);
      resizeObserver.observe(element);
    }

    for (const element of entries.keys()) {
      if (found.has(element)) continue;
      intersectionObserver.unobserve(element);
      resizeObserver.unobserve(element);
      entries.delete(element);
      visible.delete(element);
      clearProperties(element);
    }

    schedule({ measureFirst: true });
  }

  function onScroll() {
    schedule();
  }

  function onResize() {
    schedule({ measureFirst: true });
  }

  function onMotionPreferenceChange() {
    if (reducedMotion.matches) {
      // Step out of the way entirely. Inline styles would beat the
      // stylesheet's reduced-motion rule, so remove them rather than
      // fighting the cascade with !important.
      for (const element of entries.keys()) clearProperties(element);
    } else {
      schedule({ measureFirst: true });
    }
  }

  // ---- Lifecycle -------------------------------------------------------

  function start() {
    sync();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    mutationObserver.observe(root === document ? document.body : root, {
      childList: true,
      subtree: true,
    });
    reducedMotion.addEventListener('change', onMotionPreferenceChange);

    // Paint the first frame synchronously so shadows are correct on load
    // rather than snapping into place a frame later.
    if (!reducedMotion.matches) {
      remeasure = false;
      measure();
      update();
    }
  }

  function destroy() {
    if (stopped) return;
    stopped = true;

    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    reducedMotion.removeEventListener('change', onMotionPreferenceChange);
    intersectionObserver.disconnect();
    resizeObserver.disconnect();
    mutationObserver.disconnect();

    for (const element of entries.keys()) clearProperties(element);
    document.documentElement.style.removeProperty(MAX_DISTANCE_PROP);
    entries.clear();
    visible.clear();
  }

  start();

  return {
    /** Re-measure everything. Call after a layout change the observers miss. */
    refresh: () => schedule({ measureFirst: true }),

    /** Move the light. Accepts the same units as the CSS properties. */
    setLight(x, y) {
      config.light = { x, y };
      schedule({ measureFirst: true });
    },

    /** Tear down listeners and remove every property this instance wrote. */
    destroy,
  };
}

// ---- Automatic start ---------------------------------------------------
//
// Importing the module is enough for the common case. Calling castShadow()
// yourself replaces this instance, so the two never fight over an element.

let automatic = null;
let configuredManually = false;

/**
 * Start cast-shadow with your own options. Replaces the instance that
 * started on import, so the two never fight over the same elements.
 */
export function castShadow(options = {}) {
  // Also stops the automatic instance from starting later. Without this, a
  // caller who configures before DOMContentLoaded gets a second instance
  // when the document finishes parsing, and the two fight over elements.
  configuredManually = true;

  if (automatic) {
    automatic.destroy();
    automatic = null;
  }

  return createInstance(options);
}

export default castShadow;

function startAutomatic() {
  if (automatic || configuredManually) return;
  automatic = createInstance();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startAutomatic, { once: true });
} else {
  startAutomatic();
}
