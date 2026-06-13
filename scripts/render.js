// Render: angle loading, canvas repaint, loupe magnifier

import { st, angleData, pts, cursorPos, erasing, LAYERS, LAYER_META, MAX_DIM, canvas, ctx } from './state.js';
import { ANGLES, lsGet, idbGet, loadImg } from './data.js';
import { composeBase, buildOverlay } from './compose.js';

export function getAD(angleId) {
  if (!angleData[angleId]) angleData[angleId] = { W:0, H:0, basePx:null, composed:null, masks:{}, overlays:{}, offCtx:null };
  return angleData[angleId];
}

function toMaskArr(im, W, H, offCtx) {
  const m = new Uint8Array(W * H);
  if (!im) return m;
  offCtx.clearRect(0, 0, W, H);
  offCtx.drawImage(im, 0, 0, W, H);
  const d = offCtx.getImageData(0, 0, W, H).data;
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4];
  return m;
}

function maskSrc(angleId, layer) {
  const saved = lsGet('kitchen-colors-mask-' + angleId + '-' + layer, null);
  if (saved) return saved;
  const angle = ANGLES.find(a => a.id === angleId);
  return angle.masks + '/' + layer + '.png';
}

export async function loadAngle(angleId) {
  const ad = getAD(angleId);
  if (ad.basePx) return;

  const angle = ANGLES.find(a => a.id === angleId);
  const blob = await idbGet('photo-' + angleId).catch(() => null);
  const photoSrc = blob ? URL.createObjectURL(blob) : angle.photo;

  const maskImgs = await Promise.all([
    loadImg(photoSrc),
    ...LAYERS.map(l => loadImg(maskSrc(angleId, l)).catch(() => null)),
  ]);
  const photo = maskImgs[0];
  if (blob) URL.revokeObjectURL(photoSrc);

  const scale = Math.min(1, MAX_DIM / Math.max(photo.width, photo.height));
  ad.W = Math.max(1, Math.round(photo.width * scale));
  ad.H = Math.max(1, Math.round(photo.height * scale));

  const off = document.createElement('canvas');
  off.width = ad.W; off.height = ad.H;
  ad.offCtx = off.getContext('2d', { willReadFrequently: true });
  ad.offCtx.drawImage(photo, 0, 0, ad.W, ad.H);
  ad.basePx = ad.offCtx.getImageData(0, 0, ad.W, ad.H);

  LAYERS.forEach((l, i) => { ad.masks[l] = toMaskArr(maskImgs[i + 1], ad.W, ad.H, ad.offCtx); });

  composeBase(angleId, repaint);
  LAYERS.forEach(l => buildOverlay(angleId, l));
}

// Called when a custom layer is added after angles are already loaded.
export function initLayerOnLoadedAngles(layerId) {
  Object.keys(angleData).forEach(angleId => {
    const ad = angleData[angleId];
    if (!ad.basePx) return;
    ad.masks[layerId] = new Uint8Array(ad.W * ad.H);
    buildOverlay(angleId, layerId);
  });
}

export function repaint() {
  const ad = getAD(st.angle);
  if (!ad.composed) return;
  if (canvas.width !== ad.W || canvas.height !== ad.H) { canvas.width = ad.W; canvas.height = ad.H; }
  ctx.drawImage(ad.composed, 0, 0);

  if (!st.editing) { canvas.style.cursor = 'default'; return; }

  const active = st.layer;
  ctx.save();
  LAYERS.forEach(l => {
    const ov = ad.overlays['ov_' + l];
    if (!ov) return;
    ctx.globalAlpha = active === l ? 0.55 : 0.16;
    ctx.drawImage(ov, 0, 0);
  });
  ctx.restore();

  const s = ad.W / canvas.getBoundingClientRect().width || 1;
  const isErase = st.tool === 'erasePoly';
  const col = isErase ? '#FF3B30' : '#000';

  if (pts.length) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    };
    if (pts.length >= 3) {
      path(); ctx.closePath();
      ctx.fillStyle = isErase ? 'rgba(255,59,48,.20)' : 'rgba(228,255,69,.30)';
      ctx.fill();
    }
    path();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4.5*s; ctx.stroke();
    ctx.strokeStyle = col;   ctx.lineWidth = 1.8*s; ctx.stroke();
    if (cursorPos && !erasing) {
      ctx.beginPath();
      const lp = pts[pts.length-1];
      ctx.moveTo(lp.x, lp.y); ctx.lineTo(cursorPos.x, cursorPos.y);
      ctx.setLineDash([6*s, 5*s]);
      ctx.strokeStyle = col; ctx.lineWidth = 1.5*s; ctx.stroke();
      ctx.setLineDash([]);
    }
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const first = i === 0 && pts.length >= 3;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (first?7:4.5)*s, 0, Math.PI*2);
      ctx.fillStyle = first ? '#E4FF45' : '#fff';
      ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5*s; ctx.stroke();
    }
    ctx.restore();
  }

  if ((st.tool === 'brush' || st.tool === 'drawBrush') && cursorPos) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cursorPos.x, cursorPos.y, st.brushSize, 0, Math.PI*2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3*s; ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.25*s; ctx.stroke();
    ctx.restore();
  }

  if (st.loupeOn && cursorPos) {
    drawLoupe(s);
  }

  canvas.style.cursor = (st.tool === 'brush' || st.tool === 'drawBrush') ? 'none' : 'crosshair';
}

function drawLoupe(s) {
  const ad = getAD(st.angle);
  const z = 3, R = 72*s, pad = 20*s;
  const cx = cursorPos.x, cy = cursorPos.y;
  let lx = cx+R+pad, ly = cy-R-pad;
  if (lx+R > ad.W) lx = cx-R-pad;
  if (ly-R < 0) ly = cy+R+pad;
  lx = Math.max(R+2*s, Math.min(ad.W-R-2*s, lx));
  ly = Math.max(R+2*s, Math.min(ad.H-R-2*s, ly));
  const sr = R/z;
  ctx.save();
  ctx.beginPath(); ctx.arc(lx, ly, R, 0, Math.PI*2); ctx.closePath();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(lx-R, ly-R, 2*R, 2*R);
  const sx0=cx-sr, sy0=cy-sr;
  const sx1=Math.max(0,sx0), sy1=Math.max(0,sy0);
  const sx2=Math.min(ad.W,cx+sr), sy2=Math.min(ad.H,cy+sr);
  if (sx2>sx1 && sy2>sy1) {
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, sx1,sy1,sx2-sx1,sy2-sy1, lx-R+(sx1-sx0)*z, ly-R+(sy1-sy0)*z, (sx2-sx1)*z,(sy2-sy1)*z);
    ctx.imageSmoothingEnabled = sm;
  }
  const arm=16*s, gap=5*s;
  const cross = (color, w) => {
    ctx.strokeStyle=color; ctx.lineWidth=w; ctx.beginPath();
    ctx.moveTo(lx-arm,ly); ctx.lineTo(lx-gap,ly);
    ctx.moveTo(lx+gap,ly); ctx.lineTo(lx+arm,ly);
    ctx.moveTo(lx,ly-arm); ctx.lineTo(lx,ly-gap);
    ctx.moveTo(lx,ly+gap); ctx.lineTo(lx,ly+arm);
    ctx.stroke();
  };
  cross('rgba(0,0,0,.85)', 3*s); cross('#fff', 1.2*s);
  ctx.beginPath(); ctx.arc(lx,ly,1.6*s,0,Math.PI*2); ctx.fillStyle='#E4FF45'; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(lx,ly,R,0,Math.PI*2);
  ctx.strokeStyle='#fff'; ctx.lineWidth=4*s; ctx.stroke();
  ctx.strokeStyle='#000'; ctx.lineWidth=1.5*s; ctx.stroke();
  ctx.restore();
}
