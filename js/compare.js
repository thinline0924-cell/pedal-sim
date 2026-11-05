/* ===== COMPARE + SETTING SHEET ===== */
const ENV_LABEL = k => (ENG.ENVS[k] || ENG.ENVS.studio).label;
const today = () => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

/* ---- setting rows shared by the compare table and the sheet ---- */
function valueOf(cu, s) {
  const v = cu.k[s.key];
  if (v == null) return {txt: '—', val: '', clk: ''};
  if (s.kind === 'sw') { const t = s.opts.find(o => o[0] == v)?.[1] ?? String(v); return {txt: t, val: t, clk: ''}; }
  if (s.kind === 'num') { const t = fmtNum(s, v); return {txt: t, val: t, clk: ''}; }
  return {txt: `${v.toFixed(1)}  ${ENG.clock(v)}`, val: v.toFixed(1), clk: ENG.clock(v), v};
}
function settingRows(pats) {
  const chains = pats.map(chainOf), rows = [];
  rows.push({group: '構成', label: 'ギター', vals: pats.map(p => ({txt: GUITARS[p.guitar].short}))});
  rows.push({group: '構成', label: 'アンプ', vals: pats.map(p => ({txt: `${AMPS[p.amp].short}（${(p.ampState[p.amp] || {}).input === 'return' ? 'RETURN' : 'INPUT'}）`}))});
  rows.push({group: '構成', label: '使用環境', vals: pats.map(p => ({txt: ENV_LABEL(p.env)}))});
  CHAIN.forEach((u, ui) => {
    if (u.offChain || u.switcher) return;
    const group = `${u.no} ${meta(chains[0][ui]).name}`;
    if (canBypass(u)) rows.push({group, label: 'ON / OFF', onoff: true, vals: chains.map(c => ({txt: c[ui].bypass ? 'OFF' : 'ON', on: !c[ui].bypass}))});
    const keys = [];
    chains.forEach(c => meta(c[ui]).knobs.map(spec).forEach(s => { if (!keys.find(k => k.key === s.key)) keys.push(s); }));
    keys.forEach(s => rows.push({group, label: s.label, vals: chains.map(c => {
      const cu = c[ui], own = meta(cu).knobs.map(spec).find(x => x.key === s.key);
      if (!own) return {txt: '—', off: true};
      const inactive = cu.type === 'amp' && cu.k.input === 'return' && own.pre;
      return {...valueOf(cu, own), off: !!cu.bypass || inactive};
    })}));
  });
  rows.forEach(r => { r.diff = new Set(r.vals.map(v => v.txt)).size > 1; });
  return rows;
}
const selected = () => S.cmp.filter(i => i < S.patches.length).slice(0, MAX_COMPARE);

/* ---- multi-patch plots ---- */
function drawFRMulti(cv, list, ref) {
  const {g, w, h} = prep(cv), b = {x0: 34, y0: 10, x1: w - 10, y1: h - 20};
  const X = f => b.x0 + (Math.log(f) - LF) / LR * (b.x1 - b.x0), Y = d => b.y0 + (18 - ENG.clamp(d, -30, 18)) / 48 * (b.y1 - b.y0);
  axes(g, b, [-30, -24, -18, -12, -6, 0, 6, 12, 18], Y, d => (d > 0 ? '+' + d : String(d)), [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], X, fHz);
  const line = (arr, col, lw, dash) => { g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.beginPath();
    arr.forEach((d, i) => (i ? g.lineTo(X(ENG.freqs[i]), Y(d)) : g.moveTo(X(ENG.freqs[i]), Y(d)))); g.stroke(); g.setLineDash([]); };
  if (ref) line(ENG.refCurve, P('ref'), 1, [4, 3]);
  list.forEach(({an, col}) => line(an.final, P(col), 1.75));
}
function drawTimeMulti(cv, list) {
  const {g, w, h} = prep(cv), b = {x0: 30, y0: 10, x1: w - 8, y1: h - 20}, tm = 3;
  const X = t => b.x0 + t / tm * (b.x1 - b.x0), Y = d => b.y0 + (6 - ENG.clamp(d, -60, 6)) / 66 * (b.y1 - b.y0);
  axes(g, b, [-60, -40, -20, 0], Y, String, [0, 0.5, 1, 1.5, 2, 2.5, 3], X, t => t + 's');
  list.forEach(({an, col}) => { const T = an.time; g.strokeStyle = P(col); g.lineWidth = 1.5; g.beginPath();
    T.total.forEach((d, i) => (i ? g.lineTo(X(T.t[i]), Y(d)) : g.moveTo(X(T.t[i]), Y(d)))); g.stroke(); });
}
function drawGainMulti(cv, list) {
  const {g, w, h} = prep(cv), b = {x0: 30, y0: 10, x1: w - 8, y1: h - 20};
  const Y = d => b.y0 + (30 - ENG.clamp(d, -30, 30)) / 60 * (b.y1 - b.y0);
  const units = CHAIN.filter(u => !u.offChain && u.type !== 'cab' && !(u.type === 'thru' && !u.switcher && !u.ret));
  const cw = (b.x1 - b.x0) / units.length, X = i => b.x0 + cw * (i + .5);
  axes(g, b, [-30, -20, -10, 0, 10, 20, 30], Y, d => (d > 0 ? '+' + d : String(d)), [], () => 0, () => '');
  units.forEach((u, i) => { g.fillStyle = P('axis'); g.textAlign = 'center'; g.fillText(u.no, X(i), b.y1 + 10); });
  list.forEach(({an, col}) => {
    g.strokeStyle = P(col); g.fillStyle = P(col); g.lineWidth = 1.5; g.beginPath();
    units.forEach((u, i) => { const y = Y(an.stages[u.id].out); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke();
    units.forEach((u, i) => { const s = an.stages[u.id]; if (s.sat > 0.5 && !u.bypass) { g.fillStyle = P('clip'); g.fillRect(X(i) - 3, Y(s.out) - 3, 6, 6); } });
  });
}
function metricRows(ans) {
  const bands = ans.map(bandDiff);
  const m = [
    ['THD', a => a.harm.thd.toFixed(1) + ' %'],
    ['総クリップ量', a => Object.values(a.stages).reduce((t, s) => t + (s.sat || 0), 0).toFixed(1) + ' dB'],
    ['偶数/奇数', a => a.harm.evenOdd.toFixed(2)],
    ['−20 dB 到達', a => (a.time.sustain ? a.time.sustain.toFixed(2) + ' s' : '> 3 s')],
    ['ディレイ', a => (a.time.dTime ? Math.round(a.time.dTime * 1000) + ' ms' : 'OFF')],
    ['RT60', a => (a.time.rt60 ? a.time.rt60.toFixed(2) + ' s' : '—')],
  ].map(([k, f]) => [k, ans.map(f)]);
  ['低域', '中低域', '中域', '高域'].forEach((n, bi) => m.push([`参考音源との差 ${n}`, bands.map(b => f1(b[bi].d) + ' dB')]));
  return m;
}

/* ---- picker (shared by compare and sheet) ---- */
function pickerHTML() {
  const sel = selected();
  return `<div class="pick"><span class="pick-l">対象のパッチ（最大 ${MAX_COMPARE}）</span>${S.patches.map((p, i) => {
    const on = sel.includes(i), col = on ? PATCH_COLORS[sel.indexOf(i)] : null;
    return `<label class="pk${on ? ' on' : ''}"><input type="checkbox" data-cmp="${i}"${on ? ' checked' : ''}${!on && sel.length >= MAX_COMPARE ? ' disabled' : ''}>
      ${col ? `<i class="pk-sw" style="background:var(--${col})"></i>` : ''}${esc(p.name)}</label>`; }).join('')}</div>`;
}

/* ---- compare view ---- */
function renderCompare() {
  const sel = selected(), pats = sel.map(i => S.patches[i]), ans = pats.map(analyzePatch);
  const list = ans.map((an, k) => ({an, col: PATCH_COLORS[k]}));
  const head = pats.map((p, k) => `<th><i class="pk-sw" style="background:var(--${PATCH_COLORS[k]})"></i>${esc(p.name)}
      <button type="button" class="btn sm" data-edit-patch="${sel[k]}">編集</button></th>`).join('');
  const rows = settingRows(pats).filter(r => !S.diffOnly || r.diff);
  let lastG = '';
  const body = rows.map(r => {
    const g = r.group !== lastG ? `<tr class="grp-r"><td colspan="${pats.length + 1}">${esc(r.group)}</td></tr>` : ''; lastG = r.group;
    return g + `<tr class="${r.diff ? 'diff' : ''}"><td>${esc(r.label)}</td>${r.vals.map(v =>
      `<td class="num${v.off ? ' off' : ''}${r.onoff ? (v.on ? ' is-on' : ' is-offv') : ''}">${esc(v.txt)}</td>`).join('')}</tr>`;
  }).join('') || `<tr><td colspan="${pats.length + 1}" class="muted">選んだパッチの設定に違いはありません。</td></tr>`;
  $('#view-compare').innerHTML = `${pickerHTML()}
    ${pats.length < 2 ? '<p class="cmp-hint">2 つ以上選ぶと比較できます。パッチはツールバーの「複製」で増やせます。</p>' : ''}
    <div class="cmp-grid">
      <section class="pn cmp-fr"><div class="pn-t"><b>周波数特性</b><span class="note">1 kHz = 0 dB${S.ref ? ' · 破線 参考音源' : ''}</span></div><canvas class="c-fr" data-cplot="fr"></canvas></section>
      <section class="pn"><div class="pn-t"><b>ゲインステージ</b><span class="note">各段の出力 dBu · 赤 = クリップ</span></div><canvas class="c-sm" data-cplot="gain"></canvas></section>
      <section class="pn"><div class="pn-t"><b>時間変化</b><span class="note">単音の合計</span></div><canvas class="c-sm" data-cplot="time"></canvas></section>
    </div>
    <section class="pn"><div class="pn-t"><b>測定値</b></div>
      <div class="tblwrap"><table class="t cmp-t"><thead><tr><th></th>${head}</tr></thead><tbody>
        ${metricRows(ans).map(([k, vs]) => `<tr class="${new Set(vs).size > 1 ? 'diff' : ''}"><td>${k}</td>${vs.map(v => `<td class="num">${v}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div></section>
    <section class="pn"><div class="pn-t"><b>設定</b>
      <label class="chk"><input type="checkbox" id="diff-only"${S.diffOnly ? ' checked' : ''}>違いのある行だけ表示</label>
      <span class="note">左の縦線 = パッチ間で違う行 · 薄い値 = OFF または RETURN 接続で効かないつまみ</span></div>
      <div class="tblwrap"><table class="t cmp-t set-t"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
  $('#view-compare canvas[data-cplot="fr"]') && drawFRMulti($('#view-compare canvas[data-cplot="fr"]'), list, S.ref);
  drawGainMulti($('#view-compare canvas[data-cplot="gain"]'), list);
  drawTimeMulti($('#view-compare canvas[data-cplot="time"]'), list);
}

/* ---- setting sheet ---- */
function sheetDial(v, off) {
  let t = '';
  for (let i = 0; i <= 10; i++) { const a = (-150 + i * 30) * Math.PI / 180, r1 = i % 5 ? 41 : 37;
    t += `<line x1="${(50 + r1 * Math.sin(a)).toFixed(1)}" y1="${(50 - r1 * Math.cos(a)).toFixed(1)}" x2="${(50 + 47 * Math.sin(a)).toFixed(1)}" y2="${(50 - 47 * Math.cos(a)).toFixed(1)}" class="${i % 5 ? '' : 'mj'}"/>`; }
  return `<svg viewBox="0 0 100 100" class="sd${off ? ' sd-off' : ''}" aria-hidden="true">${t}<circle cx="50" cy="50" r="30"/>
    <line class="pt" x1="50" y1="50" x2="50" y2="22" transform="rotate(${-150 + v * 30} 50 50)"/></svg>`;
}
function sheetTile(cu) {
  const m = meta(cu), off = !!cu.bypass, byp = canBypass(cu);
  // RETURN 接続ではプリ部のつまみは音に関係しないので、シートには載せない
  const ret = cu.type === 'amp' && cu.k.input === 'return';
  const ctl = m.knobs.map(spec).filter(s => !(ret && s.pre)).map(s => {
    const v = valueOf(cu, s), dim = off;
    if (s.kind === 'knob') return `<div class="sk${dim ? ' dim' : ''}">${sheetDial(cu.k[s.key], dim)}<b>${v.clk}</b><span class="sk-l">${esc(s.label)}</span><span class="sk-v">${v.val}</span></div>`;
    return `<div class="ss${dim ? ' dim' : ''}"><span class="sk-l">${esc(s.label)}</span><b>${esc(v.txt)}</b></div>`;
  }).join('');
  return `<article class="st-tile${off ? ' st-off' : ''}">
    <header><span class="no">${cu.no}</span><span class="nm">${esc(m.name)}</span>${byp ? `<span class="st-on">${off ? 'OFF' : 'ON'}</span>` : ''}</header>
    <div class="st-ctl">${ctl || '<span class="dim">つまみなし</span>'}${ret ? '<span class="st-note">プリ部・EQ・リバーブは不使用</span>' : ''}</div></article>`;
}
function sheetPower() {
  return `<table class="t st-pw"><thead><tr><th>OUT</th><th>電圧</th><th>機材</th><th>mA</th></tr></thead><tbody>${ASSIGN.map(as => {
    const o = SUPPLY.outs.find(x => x.n === as.out), us = as.ids.map(unit), ma = us.reduce((t, u) => t + (u.power.ma || 0), 0), unk = us.some(u => u.power.ma == null);
    return `<tr><td class="num">${o.n}</td><td class="num">${o.set}</td><td>${us.map(u => esc(u.name)).join(' / ')}</td><td class="num">${ma}${unk ? '＋?' : ''} / ${o.max}</td></tr>`; }).join('')}</tbody></table>`;
}
function sheetHead(title, sub) {
  const m = S.sheet;
  return `<header class="pg-h"><div><div class="pg-k">セッティングシート</div><h2>${esc(title)}</h2>${sub ? `<div class="pg-sub">${sub}</div>` : ''}</div>
    <dl class="pg-meta"><div><dt>日付</dt><dd><input data-sheet-meta="date" value="${esc(m.date)}" aria-label="日付"></dd></div>
      <div><dt>会場</dt><dd><input data-sheet-meta="venue" value="${esc(m.venue)}" placeholder="—" aria-label="会場"></dd></div>
      <div><dt>担当</dt><dd><input data-sheet-meta="staff" value="${esc(m.staff)}" placeholder="—" aria-label="担当"></dd></div></dl></header>`;
}
function sheetPage(i) {
  const p = S.patches[i], c = chainOf(p), amp = c.find(u => u.type === 'amp');
  const flow = c.filter(u => !u.offChain && !u.switcher && u.type !== 'cab').map(u => {
    const n = esc(meta(u).name); return u.bypass ? `<s>${n}</s>` : `<b>${n}</b>`; }).join(' → ');
  const sub = `${esc(GUITARS[p.guitar].maker)} ${esc(GUITARS[p.guitar].name)} · ${esc(AMPS[p.amp].name)}（${amp.k.input === 'return' ? 'RETURN 接続・パワーアンプのみ' : 'INPUT 接続'}）· ${ENV_LABEL(p.env)}`;
  return `<section class="page">${sheetHead(p.name, sub)}
    <p class="pg-flow">${flow}</p>
    <div class="st-grid">${c.filter(u => !u.offChain && !u.switcher).map(sheetTile).join('')}</div>
    <div class="pg-low">
      <div class="pg-memo"><div class="pg-k">メモ</div><textarea data-memo="${i}" rows="4" aria-label="メモ">${esc(p.memo || '')}</textarea></div>
      ${S.sheet.graph ? `<figure class="pg-fig"><figcaption>周波数特性（1 kHz = 0 dB${S.ref ? '・破線 参考音源' : ''}）</figcaption><canvas class="c-sheet" data-splot="${i}"></canvas></figure>` : ''}
    </div>
    ${S.sheet.power ? `<div class="pg-k">電源 ${esc(SUPPLY.maker)} ${esc(SUPPLY.name)}</div>${sheetPower()}` : ''}
    <footer class="pg-f">Rig Bench · ${esc(p.name)} · 値は暫定（出典の確認状況はアプリ内「読み取り元」を参照）</footer></section>`;
}
function sheetTablePage(sel) {
  const pats = sel.map(i => S.patches[i]), rows = settingRows(pats);
  let lastG = '';
  const body = rows.map(r => {
    const g = r.group !== lastG ? `<tr class="grp-r"><td colspan="${pats.length + 1}">${esc(r.group)}</td></tr>` : ''; lastG = r.group;
    return g + `<tr class="${r.diff ? 'diff' : ''}"><td>${esc(r.label)}</td>${r.vals.map(v =>
      `<td class="num${v.off ? ' off' : ''}${r.onoff ? (v.on ? ' is-on' : ' is-offv') : ''}">${esc(v.txt)}</td>`).join('')}</tr>`;
  }).join('');
  return `<section class="page">${sheetHead('パッチ一覧', `${pats.length} パッチ · 左の縦線 = パッチ間で違う行`)}
    <table class="t st-list"><thead><tr><th></th>${pats.map(p => `<th>${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
    ${S.sheet.power ? `<div class="pg-k">電源 ${esc(SUPPLY.maker)} ${esc(SUPPLY.name)}</div>${sheetPower()}` : ''}
    <footer class="pg-f">Rig Bench · 値は暫定</footer></section>`;
}
function renderSheet() {
  const sel = selected(), o = S.sheet;
  $('#view-sheet').innerHTML = `<div class="sheet-ctl">${pickerHTML()}
      <div class="sheet-opts">
        <div class="seg" role="group" aria-label="レイアウト">
          <button type="button" class="seg-o" data-layout="each" aria-pressed="${o.layout === 'each'}">1 パッチ 1 ページ</button>
          <button type="button" class="seg-o" data-layout="table" aria-pressed="${o.layout === 'table'}">一覧表</button></div>
        <label class="chk"><input type="checkbox" data-sheet-opt="power"${o.power ? ' checked' : ''}>電源表</label>
        ${o.layout === 'each' ? `<label class="chk"><input type="checkbox" data-sheet-opt="graph"${o.graph ? ' checked' : ''}>周波数特性</label>` : ''}
        <span class="sp"></span>
        <button type="button" class="btn primary" id="print-btn">印刷 / PDF に保存</button>
      </div></div>
    <div class="sheet">${sel.length ? (o.layout === 'table' ? sheetTablePage(sel) : sel.map(sheetPage).join('')) : '<p class="cmp-hint">対象のパッチを選んでください。</p>'}</div>`;
  $$('#view-sheet canvas[data-splot]').forEach(cv => drawFRMulti(cv, [{an: analyzePatch(S.patches[+cv.dataset.splot]), col: 'trace'}], S.ref));
}
function renderAux() { if (S.view === 'compare') renderCompare(); else if (S.view === 'sheet') renderSheet(); }

document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-cmp]')) {
    const i = +t.dataset.cmp;
    S.cmp = t.checked ? [...new Set([...S.cmp, i])].sort((a, b) => a - b).slice(0, MAX_COMPARE) : S.cmp.filter(x => x !== i);
    save(); renderAux();
  } else if (t.id === 'diff-only') { S.diffOnly = t.checked; renderCompare(); }
  else if (t.matches('[data-sheet-opt]')) { S.sheet[t.dataset.sheetOpt] = t.checked; save(); renderSheet(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('[data-memo]')) { S.patches[+t.dataset.memo].memo = t.value; save(); }
  else if (t.matches('[data-sheet-meta]')) { S.sheet[t.dataset.sheetMeta] = t.value; save();
    $$(`[data-sheet-meta="${t.dataset.sheetMeta}"]`).forEach(x => { if (x !== t) x.value = t.value; }); }
});
document.addEventListener('click', e => {
  const ep = e.target.closest('[data-edit-patch]'); if (ep) { switchPatch(+ep.dataset.editPatch); setView('edit'); return; }
  const ly = e.target.closest('[data-layout]'); if (ly) { S.sheet.layout = ly.dataset.layout; save(); renderSheet(); return; }
  if (e.target.closest('#print-btn')) window.print();
});
