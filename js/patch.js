/* ===== PATCHES =====
   A patch is a full snapshot of the rig: guitar, amp (with every amp's own knob state), environment,
   and each unit's knobs + ON/OFF. The editor always works on CHAIN; the current patch is re-captured
   after every change, and other patches are analysed from independent copies (chainOf). */
const STORE_KEY = 'rigbench.v1';
const PATCH_COLORS = ['trace', 'trace-2', 'trace-3', 'trace-4'];
const MAX_COMPARE = 4;

function snapshot(name, memo = '') {
  return {
    name, memo, env: S.env, guitar: unit('gtr').guitar, amp: unit('amp').amp,
    ampState: JSON.parse(JSON.stringify(AMP_STATE)),
    units: Object.fromEntries(CHAIN.filter(u => u.type !== 'amp').map(u => [u.id, {k: {...u.k}, bypass: !!u.bypass}])),
  };
}
function applyPatch(p) {
  S.env = p.env; unit('gtr').guitar = p.guitar; unit('amp').amp = p.amp;
  for (const [k, v] of Object.entries(p.ampState || {})) if (AMP_STATE[k]) Object.assign(AMP_STATE[k], v);
  for (const u of CHAIN) {
    const d = p.units[u.id]; if (!d || u.type === 'amp') continue;
    u.k = {...u.k, ...d.k}; u.bypass = d.bypass;
  }
  syncAmp();
}
/* independent chain for analysing a patch that is not on screen */
function chainOf(p) {
  return CHAIN.map(u => {
    const d = p.units[u.id], c = {...u, k: {...u.k, ...(d ? d.k : {})}, bypass: d ? d.bypass : u.bypass};
    if (u.type === 'guitar') { c.guitar = p.guitar; c.pu = GUITARS[p.guitar].pu; }
    if (u.type === 'amp') { c.amp = p.amp; c.k = {...AMPS[p.amp].k, ...(p.ampState[p.amp] || {})}; c.model = AMPS[p.amp].model; c.bypass = false; }
    if (u.type === 'cab') c.model = AMPS[p.amp].model;
    return c;
  });
}
const analyzePatch = p => ENG.analyze(chainOf(p), p.env);

/* ---- example patches built from the current rig (marked 例) ---- */
function examplePatches() {
  const base = snapshot('01 クリーン + FIRE MIST', '例：歌もの A メロ。FIRE MIST は軽め。');
  const clone = (p, name, memo, edit) => { const c = JSON.parse(JSON.stringify(p)); c.name = name; c.memo = memo; edit(c.units, c); return c; };
  const crunch = clone(base, '02 クランチ（Fulltender + FIRE MIST）', '例：サビのバッキング。Fulltender をブースター的に前段。', u => {
    u.ful.bypass = false; Object.assign(u.ful.k, {drive: 3, edge: 6, bottom: 4.5, level: 7});
    Object.assign(u.fm.k, {drive: 5.5, tone: 5, level: 5.5});
    u.md5.bypass = true; Object.assign(u.ft2.k, {ms: 380, fb: 22, dlevel: 48});
  });
  const lead = clone(base, '03 リード（Brown Feather）', '例：ギターソロ。ディレイ長め、モジュレーションは切る。', (u, c) => {
    u.fm.bypass = true; u.bf.bypass = false; Object.assign(u.bf.k, {drive: 6.5, level: 6, narrow: 6, wide: 4.5});
    u.wdn.bypass = true; u.md5.bypass = true; Object.assign(u.ft2.k, {ms: 480, fb: 38, dlevel: 70, output: 1.5});
    Object.assign(u.tcr.k, {treble: 5, middle: 6, bass: 4});
  });
  return [base, crunch, lead];
}

/* ---- storage (per-browser; the app works without it) ---- */
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({patches: S.patches, cur: S.cur, cmp: S.cmp, sheet: S.sheet})); } catch (e) { /* storage unavailable */ }
  }, 300);
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(STORE_KEY)); if (d && Array.isArray(d.patches) && d.patches.length) return d; } catch (e) { /* ignore */ }
  return null;
}

/* ---- toolbar ---- */
function renderPatchBar() {
  $('#sel-patch').innerHTML = S.patches.map((p, i) => `<option value="${i}"${i === S.cur ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  const nm = $('#patch-name'); if (document.activeElement !== nm) nm.value = S.patches[S.cur].name;
  $('#p-del').disabled = S.patches.length <= 1;
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === S.view));
}
function switchPatch(i) {
  S.patches[S.cur] = snapshot(S.patches[S.cur].name, S.patches[S.cur].memo);
  S.cur = i; applyPatch(S.patches[i]); buildStrip(); renderPatchBar(); update(true);
}
function setView(v) {
  S.view = v;
  $('#view-edit').hidden = v !== 'edit'; $('#view-compare').hidden = v !== 'compare'; $('#view-sheet').hidden = v !== 'sheet';
  document.body.dataset.mode = v;
  renderPatchBar(); update(true);
}
let delArmed = null;
document.addEventListener('click', e => {
  const vb = e.target.closest('[data-view]'); if (vb) { setView(vb.dataset.view); return; }
  if (e.target.closest('#p-dup')) {
    const cur = snapshot(S.patches[S.cur].name, S.patches[S.cur].memo);
    S.patches[S.cur] = cur;
    const c = JSON.parse(JSON.stringify(cur)); c.name = cur.name + ' のコピー';
    S.patches.splice(S.cur + 1, 0, c); S.cmp = S.cmp.map(i => (i > S.cur ? i + 1 : i));
    switchPatch(S.cur + 1); return;
  }
  const del = e.target.closest('#p-del');
  if (del) {
    if (S.patches.length <= 1) return;
    if (delArmed !== S.cur) { delArmed = S.cur; del.textContent = 'もう一度押すと削除'; del.classList.add('danger');
      setTimeout(() => { delArmed = null; del.textContent = '削除'; del.classList.remove('danger'); }, 3000); return; }
    const gone = S.cur; delArmed = null; del.textContent = '削除'; del.classList.remove('danger');
    S.patches.splice(gone, 1);
    S.cmp = S.cmp.filter(i => i !== gone).map(i => (i > gone ? i - 1 : i));
    if (!S.cmp.length) S.cmp = [0];
    S.cur = Math.min(gone, S.patches.length - 1); applyPatch(S.patches[S.cur]); buildStrip(); renderPatchBar(); update(true);
  }
});
document.addEventListener('change', e => { if (e.target.id === 'sel-patch') switchPatch(+e.target.value); });
document.addEventListener('input', e => {
  if (e.target.id === 'patch-name') {
    S.patches[S.cur].name = e.target.value || '名前なし';
    const o = $(`#sel-patch option[value="${S.cur}"]`); if (o) o.textContent = S.patches[S.cur].name;
    save(); if (S.view !== 'edit') renderAux();
  }
});

/* called at the end of every update(): capture the edited patch, refresh the other views */
function afterUpdate() {
  if (!S.patches) return;
  S.patches[S.cur] = snapshot(S.patches[S.cur].name, S.patches[S.cur].memo);
  save();
  if (S.view !== 'edit') renderAux();
}
