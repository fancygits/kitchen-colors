// Compose: pixel-level color application — palette lookups, texture blending, mask compositing

import { st, angleData } from './state.js';
import { lsSet } from './data.js';

export function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

export function palKey(side) { return side === 'pulls' ? 'pulls' : 'cabinet'; }

export function mergeTextureRefs(loaded, defaults) {
  const texMap = {};
  for (const g of defaults) for (const sw of g.swatches) if (sw[2]) texMap[sw[0]] = sw[2];
  return loaded.map(g => ({
    ...g,
    swatches: g.swatches.map(sw => texMap[sw[0]] ? [sw[0], sw[1], texMap[sw[0]]] : sw)
  }));
}

export function groupsFor(side) {
  const p = st.palettes;
  return p ? p[palKey(side)] : [];
}

export function findHex(id, groups) {
  for (const g of groups) for (const [name, hex, texture] of g.swatches) if (name === id) return { name, hex, texture };
  return null;
}

// ── Texture cache ──
const textureCache = {};

function loadImgLocal(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Failed: ' + src));
    im.src = src;
  });
}

export function loadTexture(file) {
  if (file in textureCache) return Promise.resolve(textureCache[file]);
  return loadImgLocal('textures/' + file).then(im => {
    const MAX_TEX = 512;
    const scale = Math.min(1, MAX_TEX / Math.max(im.width, im.height));
    const tw = Math.round(im.width * scale);
    const th = Math.round(im.height * scale);
    const c = document.createElement('canvas');
    c.width = tw; c.height = th;
    const cx = c.getContext('2d');
    cx.drawImage(im, 0, 0, tw, th);
    const px = cx.getImageData(0, 0, tw, th).data;
    const n = tw * th;
    const gray = new Float32Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      const g = (0.299 * px[j] + 0.587 * px[j+1] + 0.114 * px[j+2]) / 255;
      gray[i] = g; sum += g;
    }
    const shift = 0.5 - sum / n;
    for (let i = 0; i < n; i++) gray[i] = Math.max(0, Math.min(1, gray[i] + shift));
    const result = { data: gray, w: tw, h: th };
    textureCache[file] = result;
    return result;
  }).catch(() => { textureCache[file] = null; return null; });
}

// Soft-light blend: t=0.5 → no change; t>0.5 → lighten; t<0.5 → darken
function softLight(base, t) {
  return (1 - 2*t) * base * base + 2 * t * base;
}

const TEXTURE_STRENGTH = 0.55;

export function applyTexture(out, mask, texture, W, H) {
  if (!texture) return;
  const { data, w: tw, h: th } = texture;
  for (let i = 0; i < W * H; i++) {
    const a = (mask[i] / 255) * TEXTURE_STRENGTH;
    if (a <= 0.004) continue;
    const x = i % W, y = Math.floor(i / W);
    const t = data[(y % th) * tw + (x % tw)];
    const j = i * 4;
    for (let c = 0; c < 3; c++) {
      const base = out[j+c] / 255;
      out[j+c] = Math.round(out[j+c] * (1-a) + softLight(base, t) * 255 * a);
    }
  }
}

export function applyMask(out, base, mask, hex, baseLum, W, H) {
  const tgt = hexToRgb(hex);
  const n = W * H;
  let BL = baseLum;
  if (!BL) {
    let sum = 0, wsum = 0;
    for (let i = 0; i < n; i++) {
      const a = mask[i] / 255;
      if (a <= 0.004) continue;
      const j = i * 4;
      sum += (0.299*base[j] + 0.587*base[j+1] + 0.114*base[j+2]) * a;
      wsum += a;
    }
    BL = wsum > 0 ? sum / wsum : 183;
  }
  for (let i = 0; i < n; i++) {
    const a = mask[i] / 255;
    if (a <= 0.004) continue;
    const j = i * 4;
    const lum = 0.299*base[j] + 0.587*base[j+1] + 0.114*base[j+2];
    const rt = lum / BL;
    out[j]   = out[j]   * (1-a) + Math.min(255, tgt[0]*rt) * a;
    out[j+1] = out[j+1] * (1-a) + Math.min(255, tgt[1]*rt) * a;
    out[j+2] = out[j+2] * (1-a) + Math.min(255, tgt[2]*rt) * a;
  }
}

export function tintFor(layer) {
  if (layer === 'upper') return [197,98,255];
  if (layer === 'lower') return [43,194,161];
  return [228,255,69];
}

// repaintFn is passed in to avoid a circular import with render.js
export function composeBase(angleId, repaintFn) {
  const ad = angleData[angleId];
  if (!ad || !ad.basePx) return;
  const img = new ImageData(new Uint8ClampedArray(ad.basePx.data), ad.W, ad.H);
  const u = findHex(st.upper, groupsFor('upper'));
  const l = findHex(st.lower, groupsFor('lower'));
  const p = findHex(st.pulls, groupsFor('pulls'));
  if (u) applyMask(img.data, ad.basePx.data, ad.masks.upper, u.hex, 183, ad.W, ad.H);
  if (l) applyMask(img.data, ad.basePx.data, ad.masks.lower, l.hex, 183, ad.W, ad.H);
  if (p) applyMask(img.data, ad.basePx.data, ad.masks.pulls, p.hex, null, ad.W, ad.H);
  [u, l, p].forEach((sw, i) => {
    if (!sw?.texture) return;
    const mask = [ad.masks.upper, ad.masks.lower, ad.masks.pulls][i];
    if (sw.texture in textureCache) {
      applyTexture(img.data, mask, textureCache[sw.texture], ad.W, ad.H);
    } else {
      loadTexture(sw.texture).then(tex => {
        if (tex) { composeBase(angleId, repaintFn); if (repaintFn) repaintFn(); }
      });
    }
  });
  if (!ad.composed) { ad.composed = document.createElement('canvas'); }
  if (ad.composed.width !== ad.W || ad.composed.height !== ad.H) { ad.composed.width = ad.W; ad.composed.height = ad.H; }
  ad.composed.getContext('2d').putImageData(img, 0, 0);
}

export function buildOverlay(angleId, layer) {
  const ad = angleData[angleId];
  if (!ad || !ad.basePx) return;
  const m = ad.masks[layer];
  const tint = tintFor(layer);
  const img = new ImageData(ad.W, ad.H);
  const d = img.data;
  const n = ad.W * ad.H;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    d[j]=tint[0]; d[j+1]=tint[1]; d[j+2]=tint[2]; d[j+3]=m[i];
  }
  const key = 'ov_' + layer;
  if (!ad.overlays[key]) { ad.overlays[key] = document.createElement('canvas'); }
  if (ad.overlays[key].width !== ad.W || ad.overlays[key].height !== ad.H) {
    ad.overlays[key].width = ad.W; ad.overlays[key].height = ad.H;
  }
  ad.overlays[key].getContext('2d').putImageData(img, 0, 0);
}

export function persistMask(angleId, layer) {
  try {
    const ad = angleData[angleId];
    const m = ad.masks[layer];
    const c = document.createElement('canvas');
    c.width = ad.W; c.height = ad.H;
    const cx = c.getContext('2d');
    const img = cx.createImageData(ad.W, ad.H);
    const d = img.data;
    for (let i = 0; i < ad.W * ad.H; i++) {
      const j = i * 4, v = m[i];
      d[j]=v; d[j+1]=v; d[j+2]=v; d[j+3]=255;
    }
    cx.putImageData(img, 0, 0);
    lsSet('kitchen-colors-mask-' + angleId + '-' + layer, c.toDataURL('image/png'));
  } catch {}
}
