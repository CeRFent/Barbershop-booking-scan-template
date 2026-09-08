// Polyfill 'self' for server-side rendering
if (typeof globalThis !== 'undefined' && typeof globalThis.self === 'undefined') {
  globalThis.self = globalThis;
}

if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  global.self = global;
}
