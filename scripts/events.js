// Events: canvas pointer/keyboard listeners and toolbar button listeners

import { st, pts, erasing, lastBrush, setPts, setCursorPos, setErasing, setLastBrush,
         canvas, fileInput, editToggleBtn, downloadBtn, pickFileBtn,
         loupeBtn, brushRange, brushVal, LAYERS, MAX_DIM, angleData } from './state.js';
import { idbSet, loadImg } from './data.js';
import { buildOverlay, composeBase, persistMask } from './compose.js';
import { getAD, repaint, loadAngle } from './render.js';
import { evtPos, eraseSegment, drawSegment, pushHistory, closeShape } from './masks.js';
import { renderUI } from './controls.js';

// ── Canvas pointer events ──
canvas.addEventListener('pointerdown', e => {
  if (!st.editing) return;
  const ad = getAD(st.angle);
  if (!ad.basePx) return;
  e.preventDefault();
  const p = evtPos(e, canvas);
  if (st.tool === 'brush' || st.tool === 'drawBrush') {
    setErasing(true); pushHistory(st.layer, renderUI); setLastBrush(p);
    (st.tool === 'drawBrush' ? drawSegment : eraseSegment)(p, p); repaint(); return;
  }
  if (pts.length >= 3) {
    const f=pts[0];
    if (Math.hypot(p.x-f.x,p.y-f.y) < 12*p.scale) { closeShape(renderUI); return; }
  }
  setPts([...pts, {x:p.x,y:p.y}]); renderUI(); repaint();
});

canvas.addEventListener('pointermove', e => {
  if (!st.editing) return;
  const p = evtPos(e, canvas);
  setCursorPos(p);
  if (erasing) { (st.tool === 'drawBrush' ? drawSegment : eraseSegment)(lastBrush, p); setLastBrush(p); }
  repaint();
});

function finishBrush() {
  if (!erasing) return;
  setErasing(false);
  composeBase(st.angle, repaint);
  persistMask(st.angle, st.layer);
  repaint();
}

canvas.addEventListener('pointerup', () => finishBrush());
canvas.addEventListener('pointerleave', () => { finishBrush(); setCursorPos(null); repaint(); });

canvas.addEventListener('dblclick', e => {
  if (!st.editing || st.tool==='brush' || st.tool==='drawBrush') return;
  e.preventDefault();
  if (pts.length>=4) {
    const a=pts[pts.length-1], b=pts[pts.length-2];
    if (Math.hypot(a.x-b.x,a.y-b.y)<6) setPts(pts.slice(0,-1));
  }
  if (pts.length>=3) closeShape(renderUI);
});

window.addEventListener('keydown', e => {
  if (!st.editing) return;
  const tag=(e.target&&e.target.tagName)||'';
  if (tag==='INPUT'||tag==='TEXTAREA') return;
  if (e.key==='Enter' && pts.length>=3) { e.preventDefault(); closeShape(renderUI); }
  else if (e.key==='Escape' && pts.length) { setPts([]); renderUI(); repaint(); }
  else if (e.key==='Backspace' && pts.length) { e.preventDefault(); setPts(pts.slice(0,-1)); renderUI(); repaint(); }
});

// ── Toolbar button listeners ──
pickFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!confirm('Replacing the photo clears the painted masks for this angle (you will redraw them on the new photo). Continue?')) return;
  idbSet('photo-' + st.angle, file).catch(()=>{});
  const url = URL.createObjectURL(file);
  loadImg(url).then(im => {
    URL.revokeObjectURL(url);
    const ad = getAD(st.angle);
    const scale = Math.min(1, MAX_DIM/Math.max(im.width,im.height));
    ad.W = Math.max(1,Math.round(im.width*scale));
    ad.H = Math.max(1,Math.round(im.height*scale));
    const off=document.createElement('canvas'); off.width=ad.W; off.height=ad.H;
    ad.offCtx=off.getContext('2d',{willReadFrequently:true});
    ad.offCtx.drawImage(im,0,0,ad.W,ad.H);
    ad.basePx=ad.offCtx.getImageData(0,0,ad.W,ad.H);
    const n=ad.W*ad.H;
    ad.masks={upper:new Uint8Array(n), lower:new Uint8Array(n), pulls:new Uint8Array(n)};
    setPts([]); import('./state.js').then(m=>m.setHistory([]));
    LAYERS.forEach(l=>{ buildOverlay(st.angle,l); persistMask(st.angle,l); });
    composeBase(st.angle, repaint);
    st.status=''; renderUI(); repaint();
  }).catch(()=>{ st.status='Could not read that image.'; renderUI(); });
});

downloadBtn.addEventListener('click', () => {
  const ad = getAD(st.angle);
  if (!ad.composed) return;
  ad.composed.toBlob(blob => {
    if (!blob) return;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='kitchen-colors.jpg'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  },'image/jpeg',0.85);
});

editToggleBtn.addEventListener('click', () => {
  setPts([]); setCursorPos(null); setErasing(false);
  st.editing=!st.editing; renderUI(); repaint();
});

loupeBtn.addEventListener('click', () => {
  st.loupeOn=!st.loupeOn; renderUI(); repaint();
});

brushRange.addEventListener('input', () => {
  st.brushSize=+brushRange.value; brushVal.textContent=st.brushSize+'px'; repaint();
});
