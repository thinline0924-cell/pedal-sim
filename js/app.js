/* ===== STATE ===== */
const AMP_STATE = Object.fromEntries(Object.entries(AMPS).map(([k, a]) => [k, {...a.k}]));
const S = {sel: 'fm', ref: true, env: 'studio', tab: 'unit', an: null};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const unit = id => CHAIN.find(u => u.id === id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const f1 = (v, d = 1) => (v == null || !isFinite(v) ? '—' : (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + Math.abs(v).toFixed(d));
const fHz = f => (f >= 1000 ? (f / 1000) + 'k' : String(f));

function syncAmp() {
  const a = unit('amp'), c = unit('cab');
  a.k = AMP_STATE[a.amp]; a.model = AMPS[a.amp].model; c.model = a.model;
  const g = unit('gtr'); g.pu = GUITARS[g.guitar].pu;
}
syncAmp();
const G = () => GUITARS[unit('gtr').guitar];
const A = () => AMPS[unit('amp').amp];
function meta(u) {
  if (u.type === 'guitar') { const g = G(); return {name: g.short, full: g.name, maker: g.maker, kind: g.spec, knobs: [['vol', 'VOL'], ['tone', 'TONE'], PU_SW], method: g.method, src: g.src}; }
  if (u.type === 'amp') { const a = A(); return {name: a.short, full: a.name, maker: a.maker, kind: A().name + (u.k.input === 'return' ? ' · RETURN 接続（パワー段のみ）' : ' · INPUT 接続'), knobs: a.knobs, method: a.method, src: a.src}; }
  if (u.type === 'cab') {
    const jc = u.model === 'jc';
    return {name: jc ? '12" ×2' : '10" ×4', full: (jc ? 'JC-120 内蔵 12 インチ×2' : 'DeVille 410 内蔵 10 インチ×4'), maker: 'スピーカー・マイク', kind: 'オープンバック・コンボ',
      knobs: [['mic', 'MIC POS'], ['dist', 'DIST']], method: 'オープンバックのコンボを想定した汎用スピーカー特性。手持ちの IR ファイルを読み込めば置き換え可能。',
      src: [['スピーカー', jc ? '12 インチ×2' : '10 インチ×4', 'ok', 'メーカー資料'], ['IR', '未読み込み', 'none', 'IR ファイルの読み込みに対応予定']]};
  }
  return {name: u.name, full: u.name, maker: u.maker, kind: u.kind, knobs: u.knobs, method: u.method, src: u.src};
}
const spec = k => (Array.isArray(k) ? {key: k[0], label: k[1], kind: 'knob', min: 0, max: 10} : k);
const canBypass = u => !['guitar', 'amp', 'cab'].includes(u.type) && !u.switcher && !u.offChain;

/* ===== CONTROLS ===== */
function dialSVG(v, mini) {
  let t = '';
  if (!mini) for (let i = 0; i <= 10; i++) {
    const a = (-150 + i * 30) * Math.PI / 180, r1 = i % 5 ? 42 : 40;
    t += `<line class="tk" x1="${(50 + r1 * Math.sin(a)).toFixed(1)}" y1="${(50 - r1 * Math.cos(a)).toFixed(1)}" x2="${(50 + 47 * Math.sin(a)).toFixed(1)}" y2="${(50 - 47 * Math.cos(a)).toFixed(1)}"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${t}<circle class="body" cx="50" cy="50" r="${mini ? 44 : 34}"/>
    <g class="ptr" transform="rotate(${-150 + v * 30} 50 50)"><line x1="50" y1="${mini ? 50 : 48}" x2="50" y2="${mini ? 9 : 18}"/></g></svg>`;
}
function fmtNum(s, v) { return (s.step < 1 ? v.toFixed(1) : String(Math.round(v))) + (s.unit ? ' ' + s.unit : ''); }
function ctrlHTML(u, k, mini) {
  const s = spec(k), v = u.k[s.key], off = u.type === 'amp' && u.k.input === 'return' && s.pre ? ' inactive' : '', attrs = `data-u="${u.id}" data-k="${s.key}"`;
  if (s.kind === 'sw') {
    const onoff = s.opts.length === 2 && s.opts[0][1] === 'OFF';
    if (mini) return `<span class="mini-sw${off}${onoff && v == 1 ? ' lit' : ''}" ${attrs} title="${s.label}">${onoff ? s.label : esc(s.opts.find(o => o[0] == v)?.[1] ?? '')}</span>`;
    return `<div class="ctl sw${off}"><div class="seg" role="group" aria-label="${s.label}">${s.opts.map(([ov, ol]) =>
      `<button type="button" class="seg-b" ${attrs} data-v="${ov}" aria-pressed="${ov == v}">${ol}</button>`).join('')}</div><div class="clabel">${s.label}</div></div>`;
  }
  if (s.kind === 'num') {
    return `<div class="ctl ${mini ? 'mini' : ''}${off} drag numf" tabindex="0" role="slider" aria-label="${s.label}" aria-valuemin="${s.min}" aria-valuemax="${s.max}" aria-valuenow="${v}" ${attrs}>
      <div class="lcd"><span class="val">${fmtNum(s, v)}</span></div>${mini ? '' : `<div class="clabel">${s.label}</div>`}</div>`;
  }
  if (mini) return `<div class="ctl mini${off} drag knob" tabindex="0" role="slider" aria-label="${esc(meta(u).name)} ${s.label}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${v}" ${attrs} title="${s.label}">${dialSVG(v, true)}</div>`;
  return `<div class="ctl${off} drag knob" tabindex="0" role="slider" aria-label="${esc(meta(u).name)} ${s.label}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${v}" ${attrs}>
    <div class="dial">${dialSVG(v)}</div><div class="clabel">${s.label}</div>
    <div class="read"><span class="val">${v.toFixed(1)}</span><span class="clk">${ENG.clock(v)}</span></div></div>`;
}
function setParam(id, key, v) {
  const u = unit(id), s = spec(meta(u).knobs.find(k => spec(k).key === key));
  if (s.kind !== 'sw') { v = Math.min(s.max, Math.max(s.min, v)); const st = s.kind === 'knob' ? 0.05 : s.step; v = Math.round(v / st) * st; }
  if (u.k[key] === v) return;
  u.k[key] = v;
  if (key === 'input') { buildStrip(); update(true); return; }
  $$(`[data-u="${id}"][data-k="${key}"]`).forEach(el => {
    if (el.classList.contains('seg-b')) el.setAttribute('aria-pressed', el.dataset.v == v);
    else if (el.classList.contains('mini-sw')) { if (s.opts[0][1] === 'OFF') el.classList.toggle('lit', v == 1); else el.textContent = s.opts.find(o => o[0] == v)[1]; }
    else if (el.classList.contains('knob')) {
      el.setAttribute('aria-valuenow', v); $('.ptr', el).setAttribute('transform', `rotate(${-150 + v * 30} 50 50)`);
      const val = $('.val', el); if (val) { val.textContent = v.toFixed(1); $('.clk', el).textContent = ENG.clock(v); }
    } else if (el.classList.contains('numf')) { el.setAttribute('aria-valuenow', v); $('.val', el).textContent = fmtNum(s, v); }
  });
  update();
}
let drag = null;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.drag'); if (!el) return;
  e.preventDefault(); el.focus(); el.setPointerCapture(e.pointerId);
  const u = unit(el.dataset.u), s = spec(meta(u).knobs.find(k => spec(k).key === el.dataset.k));
  drag = {el, s, y: e.clientY, v: u.k[el.dataset.k]};
  if (S.sel !== u.id) { S.sel = u.id; update(true); }
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const span = drag.s.max - drag.s.min, px = e.shiftKey ? 700 : 180;
  setParam(drag.el.dataset.u, drag.el.dataset.k, drag.v + (drag.y - e.clientY) / px * span);
});
document.addEventListener('pointerup', () => { drag = null; });
document.addEventListener('wheel', e => {
  const el = e.target.closest('.drag'); if (!el || document.activeElement !== el) return;
  e.preventDefault(); const u = unit(el.dataset.u), s = spec(meta(u).knobs.find(k => spec(k).key === el.dataset.k));
  const st = s.kind === 'knob' ? 0.25 : s.step; setParam(u.id, s.key, u.k[s.key] + (e.deltaY < 0 ? st : -st));
}, {passive: false});

document.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const el = e.target.closest && e.target.closest('.drag');
  if (el && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    e.preventDefault(); const u = unit(el.dataset.u), s = spec(meta(u).knobs.find(k => spec(k).key === el.dataset.k));
    const st = (s.kind === 'knob' ? 0.25 : s.step) * (e.shiftKey ? 4 : 1), cur = u.k[s.key];
    setParam(u.id, s.key, {ArrowUp: cur + st, ArrowRight: cur + st, ArrowDown: cur - st, ArrowLeft: cur - st, Home: s.min, End: s.max}[e.key]); return;
  }
  const order = CHAIN.map(u => u.id), i = order.indexOf(S.sel);
  switch (e.key) {
    case ']': S.sel = order[Math.min(order.length - 1, i + 1)]; break;
    case '[': S.sel = order[Math.max(0, i - 1)]; break;
    case 'b': case 'B': toggleBypass(S.sel); return;
    case 'r': case 'R': S.ref = !S.ref; break;
    case 'p': case 'P': S.tab = S.tab === 'power' ? 'unit' : 'power'; break;
    case 'e': case 'E': { const ks = Object.keys(ENG.ENVS); S.env = ks[(ks.indexOf(S.env) + 1) % ks.length]; break; }
    default: return;
  }
  update(true);
});
function toggleBypass(id) { const u = unit(id); if (!canBypass(u)) return; u.bypass = !u.bypass; S.sel = id; update(true); }
document.addEventListener('click', e => {
  const seg = e.target.closest('.seg-b'); if (seg) { const u = unit(seg.dataset.u), cur = u.k[seg.dataset.k]; setParam(u.id, seg.dataset.k, typeof cur === 'number' ? +seg.dataset.v : seg.dataset.v); return; }
  const by = e.target.closest('[data-bypass]'); if (by) { toggleBypass(by.dataset.bypass); return; }
  const tb = e.target.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; update(true); return; }
  const rf = e.target.closest('[data-ref]'); if (rf) { S.ref = !S.ref; update(true); return; }
  const sl = e.target.closest('[data-select]'); if (sl && !e.target.closest('.drag')) { S.sel = sl.dataset.select; S.tab = 'unit'; update(true); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'sel-env') S.env = t.value;
  else if (t.id === 'sel-gtr') { unit('gtr').guitar = t.value; syncAmp(); S.sel = 'gtr'; buildStrip(); }
  else if (t.id === 'sel-amp') { unit('amp').amp = t.value; syncAmp(); S.sel = 'amp'; buildStrip(); }
  else return;
  update(true);
});
