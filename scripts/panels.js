// Panels: render angle tab strip and right-panel color cards

import { st, LAYERS, angleTabs, rightPanel } from './state.js';
import { ANGLES, lsSet } from './data.js';
import { groupsFor, findHex } from './compose.js';
import { loadAngle, repaint } from './render.js';
import { addColor, deleteColor, select } from './palette.js';

export function renderAngleTabs(renderUI) {
  angleTabs.innerHTML = '';
  const lbl = document.createElement('span');
  lbl.className = 'angle-label'; lbl.textContent = 'Angle';
  angleTabs.appendChild(lbl);
  ANGLES.forEach(ang => {
    const b = pill(ang.label, st.angle===ang.id, async () => {
      if (st.angle===ang.id) return;
      st.angle=ang.id;
      import('./state.js').then(m => { m.setPts([]); m.setCursorPos(null); });
      lsSet('kitchen-colors-angle', ang.id);
      renderUI();
      const { getAD } = await import('./render.js');
      const ad = getAD(ang.id);
      if (!ad.basePx) {
        st.status='Loading…'; renderUI();
        await loadAngle(ang.id).catch(()=>{ st.status='Could not load.'; });
        st.status='';
      }
      renderUI(); repaint();
    });
    angleTabs.appendChild(b);
  });
}

export function renderRightPanel(renderUI) {
  rightPanel.innerHTML='';
  const sides=[
    {side:'upper', title:'Upper cabinets'},
    {side:'lower', title:'Lower cabinets'},
    {side:'pulls', title:'Pulls & handles'},
  ];
  sides.forEach(({side,title})=>{
    const expanded=!st.collapsed[side];
    const editMode=st.editPanel===side;
    const groups=groupsFor(side);
    const selOf=findHex(st[side],groups);

    const card=document.createElement('div');
    card.className='panel-card';

    // header
    const header=document.createElement('div');
    header.className='panel-header';
    const titleEl=document.createElement('div');
    titleEl.className='panel-title'; titleEl.textContent=title;
    header.appendChild(titleEl);

    const headerBtns=document.createElement('div');
    headerBtns.style.cssText='display:flex;gap:6px;align-items:center';
    if (expanded) {
      const origBtn=document.createElement('button');
      origBtn.className='outline'; origBtn.textContent='Original';
      origBtn.addEventListener('click',()=>{ select(side,'original',renderUI); });
      headerBtns.appendChild(origBtn);

      const editBtn=document.createElement('button');
      editBtn.className=editMode?'solid':'outline';
      editBtn.textContent=editMode?'Done':'Edit';
      editBtn.addEventListener('click',()=>{ st.editPanel=editMode?null:side; st.addName=''; renderUI(); });
      headerBtns.appendChild(editBtn);
    }

    const toggleBtn=document.createElement('button');
    toggleBtn.className='pill-off'; toggleBtn.textContent=expanded?'Hide':'Show';
    toggleBtn.addEventListener('click',()=>{
      st.collapsed[side]=!st.collapsed[side];
      if (st.collapsed[side]&&st.editPanel===side) st.editPanel=null;
      lsSet('kitchen-colors-collapsed',st.collapsed);
      renderUI();
    });
    headerBtns.appendChild(toggleBtn);
    header.appendChild(headerBtns);
    card.appendChild(header);

    if (expanded) {
      if (editMode) {
        card.appendChild(buildAddColorBox(side, renderUI));
      }

      groups.forEach(g=>{
        const grpEl=document.createElement('div');
        grpEl.className='swatch-group';
        const nameEl=document.createElement('div');
        nameEl.className='swatch-group-name'; nameEl.textContent=g.name;
        grpEl.appendChild(nameEl);
        const rowEl=document.createElement('div');
        rowEl.className='swatch-row';
        g.swatches.forEach(([name,hex])=>{
          const btn=document.createElement('button');
          btn.className='swatch-btn';
          btn.title=editMode?'Delete '+name:name;
          btn.style.background=hex;
          if (name===st[side]) btn.style.boxShadow='inset 0 0 0 3px #fff, 0 0 0 2px #000';
          if (editMode) {
            const x=document.createElement('span');
            x.className='swatch-x'; x.textContent='×';
            btn.appendChild(x);
            btn.addEventListener('click',()=>deleteColor(side,name,renderUI));
          } else {
            btn.addEventListener('click',()=>select(side,name,renderUI));
          }
          rowEl.appendChild(btn);
        });
        grpEl.appendChild(rowEl);
        card.appendChild(grpEl);
      });
    }

    const selRow=document.createElement('div');
    selRow.className='panel-sel';
    const chip=document.createElement('span');
    chip.className='sel-chip';
    chip.style.background=selOf?selOf.hex:'transparent';
    selRow.appendChild(chip);
    const selTxt=document.createElement('span');
    selTxt.innerHTML='Selected: <strong style="color:#000">'+(selOf?selOf.name:'Original')+'</strong>';
    selRow.appendChild(selTxt);
    card.appendChild(selRow);

    rightPanel.appendChild(card);
  });

  const disc=document.createElement('p');
  disc.className='disclaimer';
  disc.textContent='Wood grains shown as flat tone — swap in real door samples before you commit. Photo, masks, and palette edits save automatically in this browser.';
  rightPanel.appendChild(disc);
}

function buildAddColorBox(side, renderUI) {
  const addBox=document.createElement('div');
  addBox.className='add-color-box';
  const row=document.createElement('div');
  row.className='add-color-row';
  const colorIn=document.createElement('input');
  colorIn.type='color'; colorIn.value=st.addHex;
  colorIn.addEventListener('input',e=>{ st.addHex=e.target.value; });
  const nameIn=document.createElement('input');
  nameIn.type='text'; nameIn.placeholder='Color name'; nameIn.value=st.addName;
  nameIn.addEventListener('input',e=>{ st.addName=e.target.value; });
  const addBtn=document.createElement('button');
  addBtn.className='solid'; addBtn.textContent='Add';
  addBtn.addEventListener('click',()=>addColor(side,renderUI));
  row.appendChild(colorIn); row.appendChild(nameIn); row.appendChild(addBtn);
  const hint=document.createElement('div');
  hint.className='hint-text';
  hint.textContent=side==='pulls'
    ?'Pick a color and add it, or click a swatch below to delete it.'
    :'Pick a color and add it, or click a swatch below to delete it. Cabinet colors are shared by uppers and lowers.';
  addBox.appendChild(row); addBox.appendChild(hint);
  return addBox;
}

function pill(label, on, onClick) {
  const b = document.createElement('button');
  b.className = on ? 'pill-on' : 'pill-off';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
