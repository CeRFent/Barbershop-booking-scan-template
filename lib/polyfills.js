// Polyfills for server-side rendering
if (typeof window === 'undefined') {
  // Mock document for server-side rendering
  global.document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      removeChild: () => {},
    }),
    head: {
      appendChild: () => {},
      removeChild: () => {},
    },
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  }

  // Mock window for server-side rendering
  global.window = {
    document: global.document,
    location: {},
    history: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }

  // Mock navigator for server-side rendering
  global.navigator = {
    userAgent: 'node',
  }
}
