// Controls: render edit-mode controls, status bar, and top-level renderUI

import { st, pts, history, LAYERS, LAYER_META, editSection, editToggleBtn, loupeBtn, brushRow,
         layerBtnsEl, toolBtnsEl, actionBtnsEl, editHintEl, statusTextEl } from './state.js';
import { groupsFor, findHex } from './compose.js';
import { repaint } from './render.js';
import { closeShape, undoEdit, clearLayer, restoreOrigMask, downloadMask } from './masks.js';
import { renderAngleTabs, renderRightPanel } from './panels.js';

export function renderUI() {
  renderAngleTabs(renderUI);
  renderEditToggleBtn();
  renderLoupeBtn();
  renderBrushRow();
  editSection.style.display = st.editing ? 'flex' : 'none';
  if (st.editing) {
    renderLayerBtns();
    renderToolBtns();
    renderActionBtns();
    renderEditHint();
  }
  renderStatus();
  renderRightPanel(renderUI);
}

function pill(label, on, onClick, extraClass='') {
  const b = document.createElement('button');
  b.className = (on ? 'pill-on' : 'pill-off') + (extraClass ? ' '+extraClass : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function renderLayerBtns() {
  layerBtnsEl.innerHTML='';
  layerBtnsEl.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
  LAYERS.forEach(id=>{
    const meta=LAYER_META[id]||{};
    const b=document.createElement('button');
    b.className=(st.layer===id?'pill-on':'pill-off')+' pill-dot';
    const dotEl=document.createElement('span');
    dotEl.style.cssText=`width:9px;height:9px;border-radius:50%;background:${meta.tintHex||'#888'};border:1px solid rgba(0,0,0,.2);box-sizing:border-box;flex:none`;
    b.appendChild(dotEl);
    b.appendChild(document.createTextNode(meta.label||id));
    b.addEventListener('click',()=>{
      import('./state.js').then(m=>{ m.setPts([]); });
      st.layer=id; renderUI(); repaint();
    });
    layerBtnsEl.appendChild(b);
  });
}

function renderToolBtns() {
  toolBtnsEl.innerHTML='';
  toolBtnsEl.style.cssText='display:flex;gap:6px';
  [['draw','Draw shape'],['erasePoly','Erase shape'],['drawBrush','Draw brush'],['brush','Eraser brush']].forEach(([id,label])=>{
    const b=pill(label,st.tool===id,()=>{
      import('./state.js').then(m=>{ m.setPts([]); });
      st.tool=id; renderUI(); repaint();
    });
    toolBtnsEl.appendChild(b);
  });
}

function renderActionBtns() {
  actionBtnsEl.innerHTML='';
  const add=(label,solid,onClick)=>{
    const b=document.createElement('button');
    b.className=solid?'solid':'outline';
    b.textContent=label;
    b.addEventListener('click',onClick);
    actionBtnsEl.appendChild(b);
  };
  if (pts.length>=3) add('Close shape',true,()=>closeShape(renderUI));
  if (pts.length>0)  add('Undo point',false,()=>{
    import('./state.js').then(m=>{ m.setPts(pts.slice(0,-1)); renderUI(); repaint(); });
  });
  if (history.length>0) add('Undo edit',false,()=>undoEdit(renderUI));
  add('Clear layer',false,()=>clearLayer(renderUI));
  add('Restore original mask',false,()=>restoreOrigMask(st.layer,renderUI));
  add('Download mask',false,()=>downloadMask(st.layer));
}

function renderEditHint() {
  const layerWords={upper:'UPPERS (purple)',lower:'LOWERS (teal)',pulls:'PULLS (yellow)'};
  const lw=layerWords[st.layer];
  let hint;
  if (st.tool==='drawBrush') {
    hint='Editing '+lw+'. Drag over the photo to paint the mask — good for adding small areas.';
    if (st.loupeOn) hint+=' Use the magnifier to line up precisely before dragging.';
  } else if (st.tool==='brush') {
    hint='Editing '+lw+'. Drag over the photo to erase the mask — good for handles and small cleanups.';
    if (st.loupeOn) hint+=' Use the magnifier to line up precisely before dragging.';
  } else {
    const verb=st.tool==='erasePoly'?'cut that shape out of the mask':'fill that shape into the mask';
    hint='Editing '+lw+'. Click to drop corner points — straight lines connect them. Click the first (yellow) point or press Enter to close and '+verb+'. Backspace removes the last point, Esc cancels.';
    if (st.loupeOn) hint+=' Line up the magnifier crosshair with a corner before clicking.';
    if (st.layer==='pulls') hint+=' Draw a small shape around each pull or handle.';
  }
  editHintEl.textContent=hint;
}

function renderStatus() {
  const selOf = side => findHex(st[side], groupsFor(side));
  let status=st.status;
  if (st.editing && pts.length>0) status=pts.length+(pts.length===1?' point':' points')+(pts.length>=3?' — click the yellow point to close':'');
  const parts = LAYERS.map(id => {
    const meta = LAYER_META[id]||{};
    const sw = selOf(id);
    return `${meta.label||id}: <strong>${sw?sw.name:'Original'}</strong>`;
  });
  statusTextEl.innerHTML = parts.join(' &nbsp;·&nbsp; ') + (status ? ' &nbsp;&nbsp;'+status : '');
}

function renderEditToggleBtn() {
  editToggleBtn.className = st.editing ? 'solid' : 'outline';
  editToggleBtn.textContent = st.editing ? 'Done editing' : 'Edit masks';
}

function renderLoupeBtn() {
  loupeBtn.className = st.loupeOn ? 'pill-on' : 'pill-off';
  loupeBtn.textContent = st.loupeOn ? 'Magnifier on' : 'Magnifier off';
}

function renderBrushRow() {
  brushRow.style.display = (st.tool==='brush' || st.tool==='drawBrush') ? 'flex' : 'none';
}
