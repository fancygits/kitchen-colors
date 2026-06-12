// App: boot — restore persisted state then kick off initial load

import { st } from './state.js';
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

  const sel = lsGet('kitchen-colors-selection', null);
  if (sel && typeof sel.upper === 'string') {
    st.upper = sel.upper;
    st.lower = typeof sel.lower === 'string' ? sel.lower : 'original';
    st.pulls = typeof sel.pulls === 'string' ? sel.pulls : 'original';
  }

  const col = lsGet('kitchen-colors-collapsed', null);
  if (col && typeof col === 'object') {
    st.collapsed = { upper:!!col.upper, lower:!!col.lower, pulls:!!col.pulls };
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
