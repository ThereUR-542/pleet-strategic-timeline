class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined" && !window.ResizeObserver) {
  (window as any).ResizeObserver = ResizeObserverPolyfill;
}

// jsdom does not implement matchMedia; FlowCanvas's useIsMobile / reduced-motion
// checks call it at render time. Provide a no-match stub so the shell renders.
if (typeof window !== "undefined" && !window.matchMedia) {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}
