import { Html, Head, Main, NextScript } from 'next/document'

// Mock styled-jsx to prevent document.querySelector errors
if (typeof window === 'undefined') {
  // Server-side mock
  global.document = {
    querySelector: () => null,
    createElement: () => ({}),
    head: { appendChild: () => {} },
  }
}

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
