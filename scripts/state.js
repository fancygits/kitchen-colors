// State: shared mutable state object, runtime constants, and DOM refs

export const LAYERS = ['upper', 'lower', 'pulls'];
export const MAX_DIM = 1600;

export const st = {
  angle: 'gen1',
  upper: 'original', lower: 'original', pulls: 'original',
  editing: false, layer: 'upper', tool: 'draw',
  brushSize: 16, loupeOn: true,
  collapsed: { upper: false, lower: false, pulls: false },
  editPanel: null, addHex: '#888888', addName: '',
  status: 'Loading…',
  palettes: null,
};

// per-angle runtime data: angleId → { W, H, basePx, composed, masks, overlays, offCtx }
export const angleData = {};

export let pts = [];
export let history = [];
export let cursorPos = null;
export let erasing = false;
export let lastBrush = null;

export function setPts(v)       { pts = v; }
export function setHistory(v)   { history = v; }
export function setCursorPos(v) { cursorPos = v; }
export function setErasing(v)   { erasing = v; }
export function setLastBrush(v) { lastBrush = v; }

// ── DOM refs ──
export const canvas        = document.getElementById('canvas');
export const ctx           = canvas.getContext('2d');
export const fileInput     = document.getElementById('fileInput');
export const editSection   = document.getElementById('editSection');
export const editToggleBtn = document.getElementById('editToggleBtn');
export const downloadBtn   = document.getElementById('downloadBtn');
export const pickFileBtn   = document.getElementById('pickFileBtn');
export const layerBtnsEl   = document.getElementById('layerBtns');
export const toolBtnsEl    = document.getElementById('toolBtns');
export const loupeBtn      = document.getElementById('loupeBtn');
export const brushRow      = document.getElementById('brushRow');
export const brushRange    = document.getElementById('brushRange');
export const brushVal      = document.getElementById('brushVal');
export const actionBtnsEl  = document.getElementById('actionBtns');
export const editHintEl    = document.getElementById('editHint');
export const statusTextEl  = document.getElementById('statusText');
export const rightPanel    = document.getElementById('rightPanel');
export const angleTabs     = document.getElementById('angleTabs');
