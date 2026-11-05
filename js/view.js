/* ===== PLOTS ===== */
const ROOT = document.documentElement;
let CS = getComputedStyle(ROOT);   // palette comes from the canvas being drawn (dark app / light sheet)
const P = n => CS.getPropertyValue('--' + n).trim();
function prep(cv) {
  CS = getComputedStyle(cv);
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
  if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = P('well'); g.fillRect(0, 0, w, h);
  g.font = `10px ${P('f-ui')}`; g.textBaseline = 'middle';
  return {g, w, h};
}
function axes(g, b, ys, yfn, fmt, xs, xfn, xfmt) {
  g.lineWidth = 1;
  for (const y of ys) { g.strokeStyle = y === 0 ? P('grid-0') : P('grid'); g.beginPath(); g.moveTo(b.x0, Math.round(yfn(y)) + .5); g.lineTo(b.x1, Math.round(yfn(y)) + .5); g.stroke();
    g.fillStyle = P('axis'); g.textAlign = 'right'; g.fillText(fmt(y), b.x0 - 5, yfn(y)); }
  for (const x of xs) { g.strokeStyle = P('grid'); g.beginPath(); g.moveTo(Math.round(xfn(x)) + .5, b.y0); g.lineTo(Math.round(xfn(x)) + .5, b.y1); g.stroke();
    g.fillStyle = P('axis'); g.textAlign = 'center'; g.fillText(xfmt(x), Math.min(b.x1 - 10, Math.max(b.x0 + 8, xfn(x))), b.y1 + 10); }
}
const LF = Math.log(20), LR = Math.log(20000 / 20);
function drawFR(cv, an) {
  const {g, w, h} = prep(cv), b = {x0: 34, y0: 10, x1: w - 10, y1: h - 20};
  const X = f => b.x0 + (Math.log(f) - LF) / LR * (b.x1 - b.x0), Y = d => b.y0 + (18 - ENG.clamp(d, -30, 18)) / 48 * (b.y1 - b.y0);
  axes(g, b, [-30, -24, -18, -12, -6, 0, 6, 12, 18], Y, d => (d > 0 ? '+' + d : String(d)), [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], X, fHz);
  const fs = ENG.freqs, line = (arr, col, lw, dash) => { g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.beginPath();
    arr.forEach((d, i) => (i ? g.lineTo(X(fs[i]), Y(d)) : g.moveTo(X(fs[i]), Y(d)))); g.stroke(); g.setLineDash([]); };
  if (S.ref) {
    g.fillStyle = P('diff'); g.beginPath(); an.final.forEach((d, i) => (i ? g.lineTo(X(fs[i]), Y(d)) : g.moveTo(X(fs[i]), Y(d))));
    for (let i = fs.length - 1; i >= 0; i--) g.lineTo(X(fs[i]), Y(ENG.refCurve[i])); g.closePath(); g.fill();
    line(ENG.refCurve, P('ref'), 1, [4, 3]);
  }
  const st = an.stages[S.sel];
  if (st && !['cab'].includes(S.sel)) { const i1k = fs.findIndex(f => f >= 1000); line(st.cum.map(v => v - st.cum[i1k]), P('trace-2'), 1, [2, 2]); }
  line(an.final, P('trace'), 1.75);
}
function drawGain(cv, an) {
  const {g, w, h} = prep(cv), b = {x0: 30, y0: 10, x1: w - 8, y1: h - 20};
  const Y = d => b.y0 + (30 - ENG.clamp(d, -30, 30)) / 60 * (b.y1 - b.y0);
  axes(g, b, [-30, -20, -10, 0, 10, 20, 30], Y, d => (d > 0 ? '+' + d : String(d)), [], () => 0, () => '');
  const list = CHAIN.filter(u => !u.offChain && u.type !== 'cab' && !(u.type === 'thru' && !u.switcher && !u.ret));
  const cw = (b.x1 - b.x0) / list.length, bw = Math.max(4, Math.min(16, cw * 0.5));
  list.forEach((u, i) => {
    const s = an.stages[u.id], cx = b.x0 + cw * (i + .5), sel = u.id === S.sel;
    g.fillStyle = u.bypass ? P('bar-off') : sel ? P('trace-2') : P('bar');
    g.fillRect(Math.round(cx - bw / 2), Y(s.out), bw, b.y1 - Y(s.out));
    if (s.sat > 0.2 && !u.bypass) { g.fillStyle = P('clip'); g.fillRect(Math.round(cx - bw / 2), Y(s.pre), bw, Math.max(2, Y(s.ceil) - Y(s.pre))); }
    if (s.ceil != null && !u.bypass) { g.fillStyle = P('fg'); g.fillRect(Math.round(cx - bw / 2 - 3), Math.round(Y(s.ceil)), bw + 6, 1); }
    g.fillStyle = sel ? P('fg') : P('axis'); g.textAlign = 'center'; g.fillText(u.no, cx, b.y1 + 10);
  });
}
function drawHarm(cv, an) {
  const {g, w, h} = prep(cv), b = {x0: 30, y0: 10, x1: w - 8, y1: h - 20}, H = an.harm.rel;
  const Y = d => b.y0 + -ENG.clamp(d, -60, 0) / 60 * (b.y1 - b.y0);
  axes(g, b, [-60, -40, -20, 0], Y, String, [], () => 0, () => '');
  const cw = (b.x1 - b.x0) / 12;
  H.forEach((d, i) => { const x = Math.round(b.x0 + cw * i + cw * .2), bw = Math.max(2, Math.round(cw * .6));
    g.fillStyle = i === 0 ? P('fg') : i % 2 ? P('trace') : P('trace-2'); g.fillRect(x, Y(d), bw, b.y1 - Y(d));
    g.fillStyle = P('axis'); g.textAlign = 'center'; g.fillText(String(i + 1), x + bw / 2, b.y1 + 10); });
  const iw = Math.min(96, w * .3), ih = 36, ix = b.x1 - iw - 4, iy = b.y0 + 4;
  g.fillStyle = P('well'); g.fillRect(ix, iy, iw, ih); g.strokeStyle = P('grid-0'); g.strokeRect(ix + .5, iy + .5, iw, ih);
  const wv = an.harm.wave, mx = Math.max(...wv.map(Math.abs)) || 1;
  g.strokeStyle = P('fg'); g.lineWidth = 1; g.beginPath();
  wv.forEach((v, i) => { const x = ix + i / (wv.length - 1) * iw, y = iy + ih / 2 - v / mx * (ih / 2 - 4); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
}
function drawTime(cv, an) {
  const {g, w, h} = prep(cv), b = {x0: 30, y0: 10, x1: w - 8, y1: h - 20}, T = an.time, tm = 3;
  const X = t => b.x0 + t / tm * (b.x1 - b.x0), Y = d => b.y0 + (6 - ENG.clamp(d, -60, 6)) / 66 * (b.y1 - b.y0);
  axes(g, b, [-60, -40, -20, 0], Y, String, [0, 0.5, 1, 1.5, 2, 2.5, 3], X, t => t + 's');
  const line = (arr, col, lw, dash) => { g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.beginPath(); arr.forEach((d, i) => (i ? g.lineTo(X(T.t[i]), Y(d)) : g.moveTo(X(T.t[i]), Y(d)))); g.stroke(); g.setLineDash([]); };
  line(T.reverb, P('ref'), 1, [3, 3]); line(T.delay, P('trace-2'), 1); line(T.total, P('trace'), 1.5);
}
const PLOTS = {fr: drawFR, gain: drawGain, harm: drawHarm, time: drawTime};

/* ===== STRIP (signal chain, A-style) ===== */
function unitHTML(u) {
  const m = meta(u), k = m.knobs.filter(x => spec(x).kind !== 'sw' || u.type === 'guitar' || u.type === 'amp' || u.type === 'md5');
  const ctrls = m.knobs.map(x => ctrlHTML(u, x, true)).join('');
  return `<div class="u u-${u.type}${u.knobs && u.knobs.length > 4 ? ' u-wide' : ''}" data-unit="${u.id}" data-select="${u.id}">
    <div class="u-t"><span class="u-no">${u.no}</span><span class="u-n">${esc(m.name)}</span></div>
    <div class="u-m">${esc(m.maker)}${u.ret ? ' · リターン挿し' : ''}</div>
    <div class="u-k">${ctrls || '<span class="u-none">—</span>'}</div>
    <div class="u-lv"><span class="meter"><i data-slot="meter-${u.id}"></i></span><span class="num" data-slot="out-${u.id}"></span></div>
    ${canBypass(u) ? `<button type="button" class="fs" data-bypass="${u.id}" aria-label="${esc(m.name)} ON/OFF" aria-pressed="${!u.bypass}"><i class="lamp"></i><span data-slot="fs-${u.id}">${u.bypass ? 'OFF' : 'ON'}</span>${u.loop ? `<span class="fs-l">ループ ${u.loop}</span>` : ''}</button>` : ''}
  </div>`;
}
function buildStrip() {
  const parts = [];
  const sw = unit('xng'), loops = CHAIN.filter(u => u.loop), pb = unit('pb');
  for (const u of CHAIN) {
    if (u.loop || u.offChain) continue;
    if (u.switcher) {
      parts.push(`<div class="grp" data-unit="${u.id}">
        <div class="grp-t" data-select="${u.id}"><span class="u-no">SW</span><b>${esc(u.name)}</b><span class="dim">${esc(u.maker)}</span></div>
        <div class="grp-b">${loops.map(unitHTML).join('<span class="wire"></span>')}</div>
        <div class="grp-tu" data-select="${pb.id}" data-unit="${pb.id}"><span class="u-no">TUNER OUT</span>→ ${esc(pb.maker)} ${esc(pb.name)}</div>
      </div>`);
    } else parts.push(unitHTML(u));
  }
  $('#strip').innerHTML = parts.join('<span class="wire"></span>');
}

/* ===== INSPECTOR (B-style) ===== */
const ST_LABEL = {ok: '確認済', chk: '要確認', none: '未取得'};
function unitInfo(u, an) {
  const s = an.stages[u.id]; if (!s) return ['音の経路外（チューナーアウト）'];
  const out = [`入力 ${f1(s.inp)} dBu → 出力 ${f1(s.out)} dBu`];
  if (u.type === 'guitar') { const p = G().pu[u.k.sel]; out.push(`PU 共振 ≈ ${Math.round(p.fc * (an.ctx.bufferedEarly ? 1 : .86) * (.55 + .045 * u.k.tone))} Hz（${an.ctx.bufferedEarly ? '直後にバッファあり' : 'ケーブル容量の影響あり'}）`); }
  if (u.type === 'buffer') out.push(`ゲイン +${(u.k.gain * 1.8).toFixed(1)} dB · 入力 ${u.k.mode === 'S' ? '5 MΩ' : '1 MΩ'}`);
  if (u.type === 'optocomp') out.push(`ゲインリダクション ${(s.gr || 0).toFixed(1)} dB`);
  if (u.type === 'wah') out.push(`ピーク ≈ ${Math.round(420 * Math.pow(1800 / 420, u.k.pos / 10))} Hz`);
  if (s.sat > 0.05 && !u.bypass) out.push(`クリップ量 ${s.sat.toFixed(1)} dB`);
  if (u.type === 'dly') out.push(`リピート ${an.time.taps.length} 回（−60 dB まで）`);
  if (u.type === 'amp' && u.k.input === 'return') out.push('プリ部・トーン回路・リバーブは通らない（RETURN 接続）');
  if (u.type === 'amp' && an.time.rt60) out.push(`リバーブ RT60 ≈ ${an.time.rt60.toFixed(2)} s`);
  return out;
}
function inspUnit(an) {
  const u = unit(S.sel), m = meta(u);
  const rows = m.knobs.map(spec).map(s => {
    const v = u.k[s.key];
    if (s.kind === 'sw') return `<tr><td>${s.label}</td><td class="num">${esc(s.opts.find(o => o[0] == v)?.[1] ?? '')}</td><td></td></tr>`;
    if (s.kind === 'num') return `<tr><td>${s.label}</td><td class="num">${fmtNum(s, v)}</td><td></td></tr>`;
    return `<tr><td>${s.label}</td><td class="num">${v.toFixed(2)}</td><td class="num">${ENG.clock(v)}</td></tr>`;
  }).join('');
  const sel = u.type === 'guitar' ? `<select id="sel-gtr">${Object.entries(GUITARS).map(([k, g]) => `<option value="${k}"${k === u.guitar ? ' selected' : ''}>${esc(g.maker)} ${esc(g.name)}</option>`).join('')}</select>`
    : u.type === 'amp' ? `<select id="sel-amp">${Object.entries(AMPS).map(([k, a]) => `<option value="${k}"${k === u.amp ? ' selected' : ''}>${esc(a.maker)} ${esc(a.name)}</option>`).join('')}</select>` : '';
  return `<div class="i-head">
      <div class="i-maker">${esc(m.maker)}</div>
      <div class="i-name">${esc(m.full)}</div>
      <div class="i-kind">${esc(m.kind)}${u.loop ? ` · Xenagama ループ ${u.loop}` : ''}</div>
      ${sel ? `<div class="i-sel">${sel}</div>` : ''}
      ${canBypass(u) ? `<button type="button" class="fs fs-big onoff" data-bypass="${u.id}" aria-pressed="${!u.bypass}"><i class="lamp"></i>${u.bypass ? 'OFF' : 'ON'}</button>` : ''}
    </div>
    ${m.knobs.length ? `<div class="i-ctl">${m.knobs.map(x => ctrlHTML(u, x, false)).join('')}</div>` : ''}
    <div class="i-sec">計算値</div>
    <ul class="i-calc" data-slot="calc">${unitInfo(u, an).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    ${rows ? `<div class="i-sec">設定</div><table class="t"><thead><tr><th>つまみ</th><th>値</th><th>時計</th></tr></thead><tbody data-slot="ptab">${rows}</tbody></table>` : ''}
    <div class="i-sec">解析方法</div>
    <p class="i-method">${esc(m.method)}</p>
    <div class="i-sec">読み取り元</div>
    <table class="t src"><thead><tr><th>項目</th><th>値</th><th>状態</th></tr></thead><tbody>
      ${m.src.map(([it, v, st, from]) => `<tr><td>${esc(it)}</td><td>${esc(v)}<div class="from">${esc(from)}</div></td><td class="st st-${st}"><i></i>${ST_LABEL[st]}</td></tr>`).join('')}
    </tbody></table>
    <div class="i-url"><label for="url-in">製品ページ・説明書の URL</label>
      <div class="row"><input id="url-in" type="url" placeholder="https://" disabled><button type="button" class="btn" disabled>読み取る</button></div>
      <p class="hint">URL の読み取りは次の段階で実装します。</p></div>`;
}
function powerData() {
  const items = CHAIN.filter(u => u.power).map(u => ({u, ...u.power}));
  const known = items.filter(i => i.ma != null), unknown = items.filter(i => i.ma == null);
  return {items, known, unknown, total: known.reduce((a, i) => a + i.ma, 0)};
}
function inspPower() {
  const d = powerData(), a = A();
  const rows = ASSIGN.map(as => {
    const o = SUPPLY.outs.find(x => x.n === as.out), us = as.ids.map(unit);
    const ma = us.reduce((t, u) => t + (u.power.ma || 0), 0), unk = us.filter(u => u.power.ma == null).length;
    const pct = ma / o.max * 100, cls = pct >= 90 ? 'crit' : pct >= 75 ? 'warn' : '';
    const bad = us.filter(u => (u.power.only9 && o.set !== '9V') || (u.power.maxV && parseFloat(o.set) > u.power.maxV));
    return `<tr class="${bad.length ? 'bad' : ''}"><td class="num">${o.n}</td><td class="num">${o.set}${o.sw ? '<span class="from"> 切替</span>' : ''}</td>
      <td>${us.map(u => esc(u.name)).join('<br>')}${as.note ? `<div class="from">${esc(as.note)}</div>` : ''}</td>
      <td class="num nw">${ma} / ${o.max}${unk ? `<div class="from">＋未取得 ${unk}</div>` : ''}</td>
      <td class="nw"><span class="load ${cls}"><i style="width:${Math.min(100, pct)}%"></i></span><span class="num pct">${Math.round(pct)}%</span></td></tr>`;
  }).join('');
  const list = d.items.map(i => `<tr><td>${esc(i.u.name)}<div class="from">${esc(i.u.maker)}</div></td><td class="num">${esc(i.v)}</td>
    <td class="num">${i.ma == null ? '—' : i.ma + ' mA'}</td><td class="st st-${i.st}"><i></i>${ST_LABEL[i.st]}</td></tr>
    ${i.note ? `<tr class="sub"><td colspan="4">${esc(i.note)}${i.from !== '—' ? ' · ' + esc(i.from) : ''}</td></tr>` : ''}`).join('');
  return `<div class="i-sec">${esc(SUPPLY.maker)} ${esc(SUPPLY.name)} · 割り当て案</div>
    <div class="psum"><div><span>確認できた合計</span><b class="num">${d.total} mA</b></div><div><span>未取得</span><b class="num">${d.unknown.length} 台</b></div><div><span>使用出力</span><b class="num">${ASSIGN.length} / ${SUPPLY.outs.length}</b></div></div>
    <table class="t pw"><thead><tr><th>OUT</th><th>電圧</th><th>機材</th><th>消費 / 上限</th><th>負荷</th></tr></thead><tbody>${rows}</tbody></table>
    <ul class="req">
      <li>OUT 1：FT-2Y は上限の 80%。12V では上限 375 mA になるため 9V のまま使う</li>
      <li>OUT 7：Sunday Driver SW II を 12V で駆動してヘッドルームを確保（上限 15V のため 18V は不可）</li>
      <li class="warn">The Warden は 9V 専用。切替出力（7・8）に移す場合は 9V 設定を確認</li>
      <li>デジタル 2 台（FT-2Y / MD-500）は別々の出力に分けてある</li>
      <li class="muted">未取得 ${d.unknown.length} 台（${d.unknown.map(i => i.u.name).join('、')}）は説明書かテスターで確認</li>
    </ul>
    <p class="hint">${esc(SUPPLY.from)}</p>
    <div class="i-sec">機材ごとの仕様</div>
    <table class="t"><thead><tr><th>機材</th><th>電圧</th><th>消費</th><th>状態</th></tr></thead><tbody>${list}</tbody></table>
    <div class="i-sec">AC 100V</div>
    <table class="t"><tbody>
      <tr><td>${esc(a.maker)} ${esc(a.name)}</td><td class="num">${a.acW} W</td><td class="st st-${a.acStatus}"><i></i>${ST_LABEL[a.acStatus]}</td></tr>
      <tr class="sub"><td colspan="3">${esc(a.acFrom)} · 電流 ≈ ${(a.acW / 100).toFixed(1)} A（15 A 回路の ${Math.round(a.acW / 15)}%）</td></tr>
    </tbody></table>`;
}

/* ===== UPDATE ===== */
let lastInsp = '';
function bandDiff(an) {
  return [['低域', 80, 250], ['中低域', 250, 800], ['中域', 800, 2500], ['高域', 2500, 6000]].map(([n, a, z]) => {
    let s = 0, c = 0; ENG.freqs.forEach((f, i) => { if (f >= a && f < z) { s += an.final[i] - ENG.refCurve[i]; c++; } }); return {n, a, z, d: s / c};
  });
}
function update(full) {
  const an = S.an = ENG.analyze(CHAIN, S.env);
  for (const u of CHAIN) {
    const s = an.stages[u.id];
    $$(`[data-unit="${u.id}"]`).forEach(el => { el.classList.toggle('is-sel', u.id === S.sel); el.classList.toggle('is-off', !!u.bypass); el.classList.toggle('is-clip', !!s && s.sat > 0.5 && !u.bypass); });
    if (!s) continue;
    $$(`[data-slot="fs-${u.id}"]`).forEach(el => { el.textContent = u.bypass ? 'OFF' : 'ON'; el.parentElement.setAttribute('aria-pressed', !u.bypass); });
    $$(`[data-slot="out-${u.id}"]`).forEach(el => el.textContent = f1(s.out));
    $$(`[data-slot="meter-${u.id}"]`).forEach(el => el.style.width = ENG.clamp((s.out + 30) / 50 * 100, 0, 100) + '%');
  }
  const key = S.tab + ':' + S.sel + ':' + unit('gtr').guitar + ':' + unit('amp').amp + ':' + unit('amp').k.input + ':' + (unit(S.sel).bypass ? 1 : 0);
  const body = $('#insp-body');
  if (full || key !== lastInsp) { body.innerHTML = S.tab === 'power' ? inspPower() : inspUnit(an); lastInsp = key; }
  else if (S.tab === 'unit') {
    const u = unit(S.sel), calc = $('[data-slot="calc"]', body), pt = $('[data-slot="ptab"]', body);
    if (calc) calc.innerHTML = unitInfo(u, an).map(s => `<li>${esc(s)}</li>`).join('');
    if (pt) pt.innerHTML = meta(u).knobs.map(spec).map(s => { const v = u.k[s.key];
      return s.kind === 'sw' ? `<tr><td>${s.label}</td><td class="num">${esc(s.opts.find(o => o[0] == v)?.[1] ?? '')}</td><td></td></tr>`
        : s.kind === 'num' ? `<tr><td>${s.label}</td><td class="num">${fmtNum(s, v)}</td><td></td></tr>`
        : `<tr><td>${s.label}</td><td class="num">${v.toFixed(2)}</td><td class="num">${ENG.clock(v)}</td></tr>`; }).join('');
  }
  $$('[data-tab]').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === S.tab));
  $('#sel-env').value = S.env;
  $('#ref-btn').setAttribute('aria-pressed', S.ref);
  $('#bands').innerHTML = S.ref ? '<span class="lb">参考音源との差</span>' + bandDiff(an).map(b => {
    const c = Math.abs(b.d) > 4 ? 'crit' : Math.abs(b.d) > 2 ? 'warn' : '';
    return `<span class="bd ${c}">${b.n}<span class="hz">${fHz(b.a)}–${fHz(b.z)}</span><b class="num">${f1(b.d)} dB</b></span>`; }).join('') : '<span class="lb">参考音源は非表示（R）</span>';
  const sat = Object.values(an.stages).reduce((a, s) => a + (s.sat || 0), 0);
  $('#readouts').innerHTML = [['THD', an.harm.thd.toFixed(1) + ' %'], ['偶数/奇数', an.harm.evenOdd.toFixed(2)], ['総クリップ量', sat.toFixed(1) + ' dB'],
    ['−20 dB 到達', an.time.sustain ? an.time.sustain.toFixed(2) + ' s' : '> 3 s'], ['ディレイ', an.time.dTime ? Math.round(an.time.dTime * 1000) + ' ms' : 'OFF'], ['RT60', an.time.rt60 ? an.time.rt60.toFixed(2) + ' s' : '—']]
    .map(([k, v]) => `<div><span>${k}</span><b class="num">${v}</b></div>`).join('');
  const pd = powerData();
  $('#sb-power').textContent = `DC ${pd.total} mA ＋ 未取得 ${pd.unknown.length} 台 · AC ${A().acW} W`;
  $('#sb-sel').textContent = meta(unit(S.sel)).name;
  draw();
  afterUpdate();
}
function draw() { if (S.view === 'edit') $$('#view-edit canvas[data-plot]').forEach(cv => PLOTS[cv.dataset.plot](cv, S.an)); }
