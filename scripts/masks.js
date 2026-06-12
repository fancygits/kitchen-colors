// Masks: mask editing logic — polygon draw/erase, brush erase, undo, persist

import { st, angleData, pts, history, setPts, setHistory, LAYERS } from './state.js';
import { ANGLES, loadImg } from './data.js';
import { buildOverlay, composeBase, persistMask } from './compose.js';
import { getAD, repaint } from './render.js';

export function evtPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  const ad = getAD(st.angle);
  return { x: (e.clientX-r.left)*ad.W/r.width, y: (e.clientY-r.top)*ad.H/r.height, scale: ad.W/r.width };
}

function eraseCircle(m, cx, cy, r, W, H) {
  const x0=Math.max(0,Math.floor(cx-r)), x1=Math.min(W-1,Math.ceil(cx+r));
  const y0=Math.max(0,Math.floor(cy-r)), y1=Math.min(H-1,Math.ceil(cy+r));
  const r2=r*r;
  for (let y=y0;y<=y1;y++) {
    const dy=y-cy;
    for (let x=x0;x<=x1;x++) {
      if ((x-cx)*(x-cx)+dy*dy<=r2) m[y*W+x]=0;
    }
  }
}

function drawCircle(m, cx, cy, r, W, H) {
  const x0=Math.max(0,Math.floor(cx-r)), x1=Math.min(W-1,Math.ceil(cx+r));
  const y0=Math.max(0,Math.floor(cy-r)), y1=Math.min(H-1,Math.ceil(cy+r));
  const r2=r*r;
  for (let y=y0;y<=y1;y++) {
    const dy=y-cy;
    for (let x=x0;x<=x1;x++) {
      if ((x-cx)*(x-cx)+dy*dy<=r2) m[y*W+x]=255;
    }
  }
}

export function eraseSegment(a, b) {
  const ad = getAD(st.angle);
  const m = ad.masks[st.layer];
  const r = st.brushSize;
  const dist = Math.hypot(b.x-a.x, b.y-a.y);
  const steps = Math.max(1, Math.ceil(dist/(r*0.4)));
  const ov = ad.overlays['ov_'+st.layer];
  const ox = ov ? ov.getContext('2d') : null;
  if (ox) { ox.save(); ox.globalCompositeOperation='destination-out'; ox.fillStyle='#000'; }
  for (let s=0;s<=steps;s++) {
    const x=a.x+(b.x-a.x)*s/steps, y=a.y+(b.y-a.y)*s/steps;
    eraseCircle(m, x, y, r, ad.W, ad.H);
    if (ox) { ox.beginPath(); ox.arc(x,y,r,0,Math.PI*2); ox.fill(); }
  }
  if (ox) ox.restore();
}

export function drawSegment(a, b) {
  const ad = getAD(st.angle);
  const m = ad.masks[st.layer];
  const r = st.brushSize;
  const dist = Math.hypot(b.x-a.x, b.y-a.y);
  const steps = Math.max(1, Math.ceil(dist/(r*0.4)));
  const ov = ad.overlays['ov_'+st.layer];
  const ox = ov ? ov.getContext('2d') : null;
  if (ox) { ox.save(); ox.globalCompositeOperation='source-over'; }
  for (let s=0;s<=steps;s++) {
    const x=a.x+(b.x-a.x)*s/steps, y=a.y+(b.y-a.y)*s/steps;
    drawCircle(m, x, y, r, ad.W, ad.H);
    if (ox) {
      const layerColors = { upper:'rgba(197,98,255,', lower:'rgba(43,194,161,', pulls:'rgba(228,255,69,' };
      const base = layerColors[st.layer] || 'rgba(255,255,255,';
      ox.fillStyle = base+'0.6)';
      ox.beginPath(); ox.arc(x,y,r,0,Math.PI*2); ox.fill();
    }
  }
  if (ox) ox.restore();
}

export function pushHistory(layer, renderUI) {
  const ad = getAD(st.angle);
  setHistory([...history, { angleId: st.angle, layer, data: ad.masks[layer].slice() }]);
  if (history.length > 25) setHistory(history.slice(1));
  renderUI();
}

export function undoEdit(renderUI) {
  const newHistory = [...history];
  const h = newHistory.pop();
  setHistory(newHistory);
  if (!h) return;
  const ad = angleData[h.angleId];
  if (h.data.length !== ad.W * ad.H) { renderUI(); return; }
  ad.masks[h.layer] = h.data;
  buildOverlay(h.angleId, h.layer);
  composeBase(h.angleId, repaint);
  persistMask(h.angleId, h.layer);
  st.layer = h.layer;
  setPts([]); renderUI(); repaint();
}

export function closeShape(renderUI) {
  const ad = getAD(st.angle);
  if (pts.length < 3 || !ad.basePx) return;
  const erase = st.tool === 'erasePoly';
  pushHistory(st.layer, renderUI);
  const c = document.createElement('canvas');
  c.width=ad.W; c.height=ad.H;
  const cx2 = c.getContext('2d',{willReadFrequently:true});
  cx2.fillStyle='#fff';
  cx2.beginPath(); cx2.moveTo(pts[0].x,pts[0].y);
  for (let i=1;i<pts.length;i++) cx2.lineTo(pts[i].x,pts[i].y);
  cx2.closePath(); cx2.fill();
  const d=cx2.getImageData(0,0,ad.W,ad.H).data;
  const m=ad.masks[st.layer];
  for (let i=0;i<ad.W*ad.H;i++) {
    const v=d[i*4+3]; if (!v) continue;
    m[i] = erase ? Math.min(m[i], 255-v) : Math.max(m[i], v);
  }
  setPts([]);
  buildOverlay(st.angle, st.layer);
  composeBase(st.angle, repaint);
  persistMask(st.angle, st.layer);
  renderUI(); repaint();
}

export function clearLayer(renderUI) {
  const ad = getAD(st.angle);
  if (!ad.basePx) return;
  pushHistory(st.layer, renderUI);
  ad.masks[st.layer].fill(0);
  setPts([]);
  buildOverlay(st.angle, st.layer);
  composeBase(st.angle, repaint);
  persistMask(st.angle, st.layer);
  renderUI(); repaint();
}

export function restoreOrigMask(layer, renderUI) {
  const ad = getAD(st.angle);
  if (!ad.basePx) return;
  const angle = ANGLES.find(a => a.id === st.angle);
  const src = angle.masks + '/' + layer + '.png';
  loadImg(src).then(im => {
    pushHistory(layer, renderUI);
    const c=document.createElement('canvas'); c.width=ad.W; c.height=ad.H;
    const cx2=c.getContext('2d',{willReadFrequently:true}); cx2.drawImage(im,0,0,ad.W,ad.H);
    const d=cx2.getImageData(0,0,ad.W,ad.H).data;
    const m=ad.masks[layer];
    for (let i=0;i<ad.W*ad.H;i++) m[i]=d[i*4];
    setPts([]);
    buildOverlay(st.angle,layer);
    composeBase(st.angle, repaint);
    persistMask(st.angle,layer);
    renderUI(); repaint();
  }).catch(()=>{});
}

export function downloadMask(layer) {
  const ad = getAD(st.angle);
  if (!ad.basePx) return;
  const m = ad.masks[layer];
  const c = document.createElement('canvas');
  c.width = ad.W; c.height = ad.H;
  const cx2 = c.getContext('2d');
  const img = cx2.createImageData(ad.W, ad.H);
  const d = img.data;
  for (let i = 0; i < ad.W * ad.H; i++) {
    const j = i * 4, v = m[i];
    d[j]=v; d[j+1]=v; d[j+2]=v; d[j+3]=255;
  }
  cx2.putImageData(img, 0, 0);
  c.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = st.angle + '-' + layer + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}
