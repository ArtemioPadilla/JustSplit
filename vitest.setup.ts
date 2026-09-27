// Vitest global setup. Only matters for jsdom-environment tests (RTL renders).
// Node-environment tests skip this via the loader fast path.

// Polyfill `matchMedia` for jsdom (some components query it on mount).
if (typeof window !== 'undefined' && !window.matchMedia) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Polyfill `scrollIntoView` for jsdom — jsdom doesn't implement layout, so
// this never exists on Element.prototype. Needed by chat-style auto-scroll
// effects (e.g. ChatThread) that call it on every render.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Polyfill `ResizeObserver` for jsdom (ROADMAP Epic 18's "still open" gap).
// jsdom has no layout engine and never implements ResizeObserver — anything
// that observes an element for size changes (e.g. @zag-js/splitter's
// `trackRootResize` effect) throws `ResizeObserver is not a constructor`
// without this. A no-op observer is sufficient: components that need real
// dimensions in tests should stub `getBoundingClientRect` explicitly.
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  class ResizeObserverPolyfill {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = ResizeObserverPolyfill;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverPolyfill;
}

// Polyfill `IntersectionObserver` for jsdom, same rationale as above.
if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  class IntersectionObserverPolyfill {
    root: Element | null = null;
    rootMargin = '';
    thresholds: ReadonlyArray<number> = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).IntersectionObserver = IntersectionObserverPolyfill;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IntersectionObserver = IntersectionObserverPolyfill;
}

// Make @testing-library/jest-dom's custom matchers available everywhere.
import '@testing-library/jest-dom/vitest';
