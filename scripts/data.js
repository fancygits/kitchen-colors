// Data: static angle/palette definitions, storage helpers, image loader

export const ANGLES = [
  { id: 'gen1', label: 'View 1', photo: 'uploads/gen-kitchen-1.png', masks: 'masks/gen1' },
  { id: 'gen2', label: 'View 2', photo: 'uploads/gen-kitchen-2.png', masks: 'masks/gen2' },
  { id: 'gen3', label: 'View 3', photo: 'uploads/gen-kitchen-3.png', masks: 'masks/gen3' },
];

export const DEFAULT_CABINET = [
  { name: 'High Gloss', swatches: [
    ['White','#FAF9F5'],
    ['Bianco','#FEF9E3'],
    ['Trend Gray','#CACCC9'],
    ['Onyx Grey','#B5B9B8'],
    ['Dark Grey','#404241'],
    ['Metalic Elm','#1A1F19', 'metallic-elm.jpg']
  ]},
  { name: 'Matte', swatches: [
    ['Matte White','#E1E2E4'],
    ['Stone Grey','#ABB5B6', 'stone-grey.jpg'],
    ['Sahara Cream','#C7C0AE'],
    ['Matte Grey','#A5978E'],
    ['Pebble Grey','#A0A2A1'],
    ['Dolphin Grey','#39393B'],
    ['Black','#000000'],
    ['Night Blue','#0E2336'],
    ['Forest Green','#47544D']
  ]},
  { name: 'Wooden', swatches: [
    ['Akra Oak',         '#69665D', 'akra-oak.jpg'],
    ['Alaska Oak',       '#69665D', 'alaska-oak.jpg'],
    ['Cream Texture',    '#A89688', 'cream-texture.jpg'],
    ['Delphi Oak',       '#C6B89F', 'delphi-oak.jpg'],
    ['Grey Texture',     '#8F8279', 'grey-texture.jpg'],
    ['Natural Oak',      '#AA825C', 'natural-oak.jpg'],
    ['Natural Touch Oak','#D4B48F', 'natural-touch-oak.jpg'],
    ['Orlando Oak',      '#BDB5B2', 'orlando-oak.jpg'],
    ['Peru Oak',         '#8C6C47', 'peru-oak.jpg'],
    ['Siena',            '#5F4931', 'siena.jpg'],
    ['Texas Oak',        '#645343', 'texas-oak.jpg'],
    ['Textile Light',    '#DCD9D0', 'textile-light.jpg'],
    ['Textile Vision',   '#B5B1A5', 'textile-vision.jpg'],
    ['Timber Light',     '#D7D8D0', 'timber-light.jpg'],
    ['Timber Dark',      '#B7AE9C', 'timber-dark.jpg'],
    ['Toledo Dark',      '#7D746F', 'toledo-dark.jpg'],
    ['Toledo Light',     '#7E7259', 'toledo-light.jpg'],
    ['Walnut',           '#927259', 'walnut.jpg'],
  ]},
  { name: 'Custom', swatches: [['My Swatch','#C7C0AE']] }
];

export const DEFAULT_PULLS = [
  { name: 'Finishes', swatches: [
    ['Stainless Silver','#C9CBCD'],['Black','#1D1D1F'],
    ['Brushed Brass','#BE9C56'],['Brushed Bronze','#D4BC8B'],['White','#F4F3F0']
  ]}
];

// ── localStorage helpers ──
export function lsGet(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ── IndexedDB for photos ──
function idb() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('kitchen-colors', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('files');
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
export function idbGet(key) {
  return idb().then(db => new Promise((res, rej) => {
    const rq = db.transaction('files','readonly').objectStore('files').get(key);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => rej(rq.error);
  }));
}
export function idbSet(key, val) {
  return idb().then(db => new Promise((res, rej) => {
    const rq = db.transaction('files','readwrite').objectStore('files').put(val, key);
    rq.onsuccess = () => res();
    rq.onerror = () => rej(rq.error);
  }));
}

// ── Image loader ──
export function loadImg(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Failed: ' + src));
    im.src = src;
  });
}
