// App: boot — restore persisted state then kick off initial load

import { st, addCustomLayer } from './state.js';
import { ANGLES, DEFAULT_CABINET, DEFAULT_PULLS, lsGet } from './data.js';
import { mergeTextureRefs } from './compose.js';
import { loadAngle, repaint } from './render.js';
import { renderUI } from './controls.js';
import './events.js'; // registers all event listeners

(async function boot() {
  const palettes = lsGet('kitchen-colors-palettes', null);
  if (palettes && Array.isArray(palettes.cabinet) && Array.isArray(palettes.pulls)) {
    st.palettes = {
      cabinet: mergeTextureRefs(palettes.cabinet, DEFAULT_CABINET),
      pulls:   mergeTextureRefs(palettes.pulls,   DEFAULT_PULLS),
    };
  } else {
    st.palettes = { cabinet: DEFAULT_CABINET, pulls: DEFAULT_PULLS };
  }

  // Restore persisted custom layers
  const customLayers = JSON.parse(localStorage.getItem('kitchen-colors-custom-layers') || '[]');
  customLayers.forEach(({ id, name, tintHex }) => {
    addCustomLayer(id, name, tintHex);
    const savedPal = lsGet('kitchen-colors-palettes', null);
    if (savedPal && Array.isArray(savedPal[id])) {
      st.palettes[id] = savedPal[id];
    } else {
      st.palettes[id] = [{ name: 'Custom', swatches: [[name, tintHex]] }];
    }
  });

  const sel = lsGet('kitchen-colors-selection', null);
  if (sel && typeof sel.upper === 'string') {
    st.upper = sel.upper;
    st.lower = typeof sel.lower === 'string' ? sel.lower : 'original';
    st.pulls = typeof sel.pulls === 'string' ? sel.pulls : 'original';
    // restore custom layer selections
    customLayers.forEach(({ id }) => {
      if (typeof sel[id] === 'string') st[id] = sel[id];
    });
  }

  const col = lsGet('kitchen-colors-collapsed', null);
  if (col && typeof col === 'object') {
    const base = { upper:!!col.upper, lower:!!col.lower, pulls:!!col.pulls };
    customLayers.forEach(({ id }) => { base[id] = !!col[id]; });
    st.collapsed = base;
  }

  renderUI();

  st.status = 'Loading…';
  renderUI();

  try {
    await loadAngle(st.angle);
    st.status = '';
  } catch {
    st.status = 'Could not load the photo.';
  }

  renderUI();
  repaint();
})();
