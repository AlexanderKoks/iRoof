
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/iRoof/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/iRoof"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 1257, hash: 'ac050968873b0adc93bd444fd08d463e80421b0ed6d6e8cc7d2bde435dc0b71f', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1771, hash: '164335421d416c5f601ed6611d20538346dc2bbe5e32b1fb6b11104add1ccdef', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 7314, hash: 'c73bfc9b0f0a8ee2fcc08074860e9d232094c4ee7a8e4ee8e1334ecd12a15b62', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
