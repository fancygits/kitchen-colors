// Palette: add/delete colors, select swatches, persist palette state

import { st, angleData } from './state.js';
import { lsSet } from './data.js';
import { palKey, groupsFor, composeBase } from './compose.js';
import { repaint } from './render.js';

export function savePalettes(palettes, extraSt, renderUI) {
  st.palettes = palettes;
  if (extraSt) Object.assign(st, extraSt);
  lsSet('kitchen-colors-palettes', palettes);
  lsSet('kitchen-colors-selection', { upper:st.upper, lower:st.lower, pulls:st.pulls });
  renderUI();
}

export function addColor(side, renderUI) {
  const key = palKey(side);
  const palettes = JSON.parse(JSON.stringify(st.palettes));
  const groups = palettes[key];
  const hex = st.addHex.toUpperCase();
  let name = (st.addName||'').trim() || hex;
  const exists = n => n==='original' || groups.some(g=>g.swatches.some(([nm])=>nm===n));
  const base=name; let i=2;
  while (exists(name)) name=base+' '+(i++);
  let custom = groups.find(g=>g.name==='Custom');
  if (!custom) { custom={name:'Custom',swatches:[]}; groups.push(custom); }
  custom.swatches.push([name,hex]);
  savePalettes(palettes, { addName:'' }, renderUI);
}

export function deleteColor(side, name, renderUI) {
  const key = palKey(side);
  const palettes = JSON.parse(JSON.stringify(st.palettes));
  palettes[key] = palettes[key]
    .map(g=>({name:g.name, swatches:g.swatches.filter(([nm])=>nm!==name)}))
    .filter(g=>g.swatches.length>0);
  const upd = {};
  const sides = key==='pulls' ? ['pulls'] : ['upper','lower'];
  sides.forEach(s => { if (st[s]===name) upd[s]='original'; });
  savePalettes(palettes, upd, renderUI);
  Object.keys(angleData).forEach(id => { if (angleData[id].basePx) composeBase(id, repaint); });
  repaint();
}

export function select(side, id, renderUI) {
  st[side] = id;
  lsSet('kitchen-colors-selection', { upper:st.upper, lower:st.lower, pulls:st.pulls });
  Object.keys(angleData).forEach(angleId => {
    if (angleData[angleId].basePx) composeBase(angleId, repaint);
  });
  renderUI(); repaint();
}
