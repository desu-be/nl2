import { defineConfig, type Plugin } from 'vite';

// Served from https://<owner>.github.io/nl2/: every URL is relative to this base.
const BASE = '/nl2/';

// GitHub Pages cannot send headers, so the Content Security Policy is a <meta> tag. It is added to
// the production build only: the dev server injects inline styles and scripts it would block.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "connect-src 'self' https://api.github.com",
  "img-src 'self' data:",
  "style-src 'self'",
  "font-src 'self'",
  "script-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  base: BASE,
  plugins: [contentSecurityPolicy()],
  build: { target: 'es2022' },
});
