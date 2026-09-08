// Server-side polyfills for browser globals
// This ensures compatibility when client-side code is executed on server

if (typeof global !== 'undefined') {
  // Polyfill for 'self' global variable
  if (typeof self === 'undefined') {
    global.self = globalThis;
  }
  
  // Polyfill for 'window' global variable
  if (typeof window === 'undefined') {
    global.window = {
      location: { href: '' },
      navigator: { userAgent: 'Node.js' },
      document: { 
        createElement: () => ({}),
        querySelector: () => null,
        querySelectorAll: () => [],
        head: { appendChild: () => {}, removeChild: () => {} },
        body: { appendChild: () => {}, removeChild: () => {} },
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
  
  // Polyfill for 'document' global variable
  if (typeof document === 'undefined') {
    global.document = global.window.document;
  }
  
  // Polyfill for 'navigator' global variable
  if (typeof navigator === 'undefined') {
    global.navigator = global.window.navigator;
  }
  
  // Polyfill for 'location' global variable
  if (typeof location === 'undefined') {
    global.location = global.window.location;
  }
}
