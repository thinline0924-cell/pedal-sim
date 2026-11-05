/* ===== ENGINE: signal chain model + analysis (shared by all three layouts) ===== */
const ENG = (() => {
  const NF = 240, FMIN = 20, FMAX = 20000;
  const freqs = Array.from({length: NF}, (_, i) => FMIN * Math.pow(FMAX / FMIN, i / (NF - 1)));
  const TAU = 2 * Math.PI;

  // complex helpers
  const C = (re, im = 0) => ({re, im});
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const mag = a => Math.hypot(a.re, a.im);
  const sc = (a, k) => C(a.re * k, a.im * k);
  const poly = (cs, s) => { let r = C(0), p = C(1); for (const c of cs) { r = add(r, sc(p, c)); p = mul(p, s); } return r; };
  const rat = (num, den) => f => { const s = C(0, TAU * f); return div(poly(num, s), poly(den, s)); };

  // analog prototype sections -> functions f => complex
  const lp1 = fc => { const w = TAU * fc; return rat([1], [1, 1 / w]); };
  const hp1 = fc => { const w = TAU * fc; return rat([0, 1 / w], [1, 1 / w]); };
  const lp2 = (fc, q) => { const w = TAU * fc; return rat([w * w], [w * w, w / q, 1]); };
  const hp2 = (fc, q) => { const w = TAU * fc; return rat([0, 0, 1], [w * w, w / q, 1]); };
  const peak = (fc, q, g) => { const w = TAU * fc, A = Math.pow(10, g / 40); return rat([w * w, A * w / q, 1], [w * w, w / (A * q), 1]); };
  const lshelf = (fc, g) => { const w = TAU * fc, G = Math.pow(10, g / 20); return rat([G * w, 1], [w, 1]); };
  const hshelf = (fc, g) => { const w = TAU * fc, G = Math.pow(10, g / 20); return rat([w, G], [w, 1]); };
  const gain = g => () => C(Math.pow(10, g / 20));

  const logTaper = x => (Math.pow(10, 2 * x) - 1) / 99;          // audio "A" taper, x 0..1
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // Yeh & Smith (2006) closed form for the Fender/Marshall/Vox-family passive tone stack
  function toneStack(cmp, t, m, l) {
    const {C1, C2, C3, R1, R2, R3, R4} = cmp;
    const b1 = t*C1*R1 + m*C3*R3 + l*(C1*R2 + C2*R2) + (C1*R3 + C2*R3);
    const b2 = t*(C1*C2*R1*R4 + C1*C3*R1*R4) - m*m*(C1*C3*R3*R3 + C2*C3*R3*R3)
      + m*(C1*C3*R1*R3 + C1*C3*R3*R3 + C2*C3*R3*R3) + l*(C1*C2*R1*R2 + C1*C2*R2*R4 + C1*C3*R2*R4)
      + l*m*(C1*C3*R2*R3 + C2*C3*R2*R3) + (C1*C2*R1*R3 + C1*C2*R3*R4 + C1*C3*R3*R4);
    const b3 = l*m*(C1*C2*C3*R1*R2*R3 + C1*C2*C3*R2*R3*R4) - m*m*(C1*C2*C3*R1*R3*R3 + C1*C2*C3*R3*R3*R4)
      + m*(C1*C2*C3*R1*R3*R3 + C1*C2*C3*R3*R3*R4) + t*C1*C2*C3*R1*R3*R4 - t*m*C1*C2*C3*R1*R3*R4
      + t*l*C1*C2*C3*R1*R2*R4;
    const a1 = (C1*R1 + C1*R3 + C2*R3 + C2*R4 + C3*R4) + m*C3*R3 + l*(C1*R2 + C2*R2);
    const a2 = m*(C1*C3*R1*R3 - C2*C3*R3*R4 + C1*C3*R3*R3 + C2*C3*R3*R3) + l*m*(C1*C3*R2*R3 + C2*C3*R2*R3)
      - m*m*(C1*C3*R3*R3 + C2*C3*R3*R3) + l*(C1*C2*R2*R4 + C1*C2*R1*R2 + C1*C3*R2*R4 + C2*C3*R2*R4)
      + (C1*C2*R1*R4 + C1*C3*R1*R4 + C1*C2*R3*R4 + C1*C2*R1*R3 + C1*C3*R3*R4 + C2*C3*R3*R4);
    const a3 = l*m*(C1*C2*C3*R1*R2*R3 + C1*C2*C3*R2*R3*R4) - m*m*(C1*C2*C3*R1*R3*R3 + C1*C2*C3*R3*R3*R4)
      + m*(C1*C2*C3*R3*R3*R4 + C1*C2*C3*R1*R3*R3 - C1*C2*C3*R1*R3*R4) + l*C1*C2*C3*R1*R2*R4
      + C1*C2*C3*R1*R3*R4;
    return rat([0, b1, b2, b3], [1, a1, a2, a3]);
  }
  const STACKS = {
    marshall: {C1: 470e-12, C2: 22e-9, C3: 22e-9, R1: 220e3, R2: 1e6, R3: 22e3, R4: 33e3},
    fender:   {C1: 250e-12, C2: 100e-9, C3: 47e-9, R1: 250e3, R2: 250e3, R3: 10e3, R4: 100e3},
  };

  /* ---- unit definitions ----
     k: knob values 0..10. Each type returns:
       fr(k)    -> array of f=>complex sections (small-signal response)
       stage(k, inLevel) -> {out, pre, ceil, sat, shape}  levels in dBu
  */
  /* ---- unit types ----
     fr(k, u, ctx)    -> small-signal sections
     stage(k, inLvl, u, ctx) -> {pre, out, ceil, sat, shape, gr}
  */
  const clipSoft = (pre, ceil, knee) => (pre > ceil ? ceil + knee * Math.tanh((pre - ceil) / knee) : pre);
  const TYPES = {
    guitar: {
      fr: (k, u, ctx) => {
        const p = u.pu[k.sel];                        // {fc, q, lvl}
        const load = ctx.bufferedEarly ? 1 : 0.86;    // long cable before first buffer lowers resonance
        return [lp2(p.fc * load * (0.55 + 0.045 * k.tone), p.q * (0.55 + 0.05 * k.tone)), hshelf(1800, -(10 - k.vol) * 0.6)];
      },
      stage: (k, i, u) => { const out = u.pu[k.sel].lvl + 20 * Math.log10(Math.max(1e-3, logTaper(k.vol / 10))); return {pre: out, out, ceil: null, sat: 0}; },
    },
    buffer: {     // Lehle Sunday Driver SW II: 0 dB at 7:00 (buffer) .. +18 dB
      fr: () => [hp1(12)],
      stage: (k, i) => { const g = k.gain / 10 * 18, pre = i + g; return {pre, out: clipSoft(pre, 12, 3), ceil: 12, sat: Math.max(0, pre - 12)}; },
    },
    thru: { fr: () => [], stage: (k, i) => ({pre: i, out: i, ceil: null, sat: 0}) },
    optocomp: {   // Warden: Sustain drives a fixed threshold, Ratio, Tone (flat near 11:00), Level
      fr: k => [hshelf(2500, (k.tone - 4) * 1.4)],
      stage: (k, i) => {
        const drive = i + k.sustain * 2.2, thr = -10, ratio = 2 + k.ratio * 0.8;
        const over = Math.max(0, drive - thr), gr = over * (1 - 1 / ratio);
        return {pre: drive, out: drive - gr + (k.level - 5) * 2.4 - 2, ceil: thr, sat: 0, gr};
      },
    },
    wah: {
      fr: k => { const f = 420 * Math.pow(1800 / 420, k.pos / 10); return [peak(f, 4.2, 15), lp1(f * 3.2), hp1(f * 0.25), gain(-6)]; },
      stage: (k, i) => ({pre: i, out: i + 2, ceil: null, sat: 0}),
    },
    od: {         // generic overdrive / distortion; per-product voicing in u.v
      fr: (k, u) => {
        const v = u.v, s = [hp1(v.lowcut)];
        if (v.hump) s.push(peak(v.hump, 0.8, v.humpDb * (0.4 + k.drive / 16)));
        for (const t of v.tone) s.push(t.kind === 'hs' ? hshelf(t.f, (k[t.key] - t.flat) * t.db)
          : t.kind === 'ls' ? lshelf(t.f, (k[t.key] - t.flat) * t.db) : peak(t.f, t.q, (k[t.key] - t.flat) * t.db));
        s.push(lp1(v.hicut));
        return s;
      },
      stage: (k, i, u) => {
        const v = u.v, pre = i + v.g0 + (v.g1 - v.g0) * logTaper(k.drive / 10) * 0.8 + (v.g1 - v.g0) * k.drive / 50;
        const lim = clipSoft(pre, v.ceil, v.knee);
        return {pre, out: lim + (k.level - 5) * 3 - 3, ceil: v.ceil, sat: Math.max(0, pre - v.ceil), shape: v.shape};
      },
    },
    preamp: {     // JFET preamp modelled on a Two-Rock clean pre section; passive TMB + 3 toggles
      fr: k => [hp1(40), toneStack(STACKS.fender, k.treble / 10, k.middle / 10, logTaper(k.bass / 10)),
        peak(700, 0.8, k.mid ? 4 : 0), lshelf(90, k.deep ? 5 : 0), hshelf(2600, k.bright ? 5 : 0), lp1(12000)],
      frNorm: true,
      stage: (k, i) => { const pre = i + 5, ceil = 12; return {pre, out: clipSoft(pre, ceil, 6) - 1, ceil, sat: Math.max(0, pre - ceil), shape: 'tube'}; },
    },
    mod: { fr: () => [], stage: (k, i) => ({pre: i, out: i + (k.elevel - 5) * 0.2, ceil: 2, sat: 0}) },
    dly: { fr: () => [], stage: (k, i) => ({pre: i, out: i + k.output * 0.3, ceil: 2, sat: 0}) },
    amp: {
      fr: (k, u) => {
        if (k.input === 'return') return u.model === 'jc' ? [hp1(45), lp1(14000)] : [hp1(55), hshelf(3800, (k.presence - 3) * 0.7), lp1(9000)];
        if (u.model === 'jc') return [hp1(45), lshelf(110, (k.bass - 5) * 2.4), peak(900, 0.7, (k.middle - 5) * 1.8),
          hshelf(3200, (k.treble - 5) * 2.4 + (k.bright ? 4 : 0)), lp1(14000)];
        return [hp1(55), hshelf(2400, (k.bright ? (1 - k.volume / 10) * 6 : 0)),
          toneStack(STACKS.fender, k.treble / 10, k.middle / 10, logTaper(k.bass / 10)),
          hshelf(3800, (k.presence - 3) * 0.7), lp1(9000)];
      },
      frNorm: true,
      stage: (k, i, u) => {
        if (k.input === 'return') { const pre = i + 12, ceil = 18; return {pre, out: clipSoft(pre, ceil, 4), ceil, sat: Math.max(0, pre - ceil), shape: u.model === 'jc' ? 'sym' : 'tube'}; }
        if (u.model === 'jc') {     // solid-state clean; distortion knob adds a hard clip stage
          const pre = i + 20 * Math.log10(Math.max(1e-3, logTaper(k.volume / 10))) + 22 + k.distortion * 3, ceil = 14;
          const lim = k.distortion > 0.2 ? clipSoft(pre, ceil - k.distortion * 1.6, 1.5) : Math.min(pre, ceil);
          return {pre, out: lim, ceil: k.distortion > 0.2 ? ceil - k.distortion * 1.6 : ceil, sat: Math.max(0, pre - (k.distortion > 0.2 ? ceil - k.distortion * 1.6 : ceil)), shape: 'sym'};
        }
        const drv = k.channel === 'drive';
        const pre = i + (drv ? 18 + k.drive * 3.4 : 20 * Math.log10(Math.max(1e-3, logTaper(k.volume / 10))) + 30), ceil = drv ? 2 : 8;
        return {pre, out: clipSoft(pre, ceil, 5) + 6, ceil, sat: Math.max(0, pre - ceil), shape: 'tube'};
      },
    },
    cab: {
      fr: (k, u) => (u.model === 'jc'
        ? [hp2(70, 0.9), peak(120, 1.4, 2.5), peak(2600, 1.2, 3.5 - k.mic * 0.5), lp2(6800 - k.mic * 200, 0.8), lp1(9000)]
        : [hp2(85, 1.0), peak(140, 1.3, 3), peak(1800, 1.1, 3 - k.mic * 0.4), peak(3400, 1.6, 2.5 - k.mic * 0.4), lp2(5400 - k.mic * 180, 0.85), lp2(7600, 0.7)])
        .concat([gain(-k.dist * 0.4)]),
      frNorm: true,
      stage: (k, i) => ({pre: i, out: i, ceil: null, sat: 0}),
    },
  };

  const ENVS = {
    studio: {label: 'リハスタ', fr: []},
    live:   {label: 'ライブハウス', fr: [peak(125, 1.4, 3.5), peak(2800, 1.2, -1.5), hshelf(6000, -3)]},
    rec:    {label: 'レコーディング', fr: []},
  };

  function sectionsDb(secs, scale = 1) {
    return freqs.map(f => { let h = C(1); for (const s of secs) h = mul(h, s(f)); return 20 * Math.log10(mag(h) + 1e-12) * scale; });
  }
  function normalize(arr) { const i1k = freqs.findIndex(f => f >= 1000); const r = arr[i1k]; return arr.map(v => v - r); }

  function analyze(chain, envKey) {
    const active = chain.filter(u => !u.offChain);
    const firstBuf = active.findIndex(u => u.type === 'buffer' && !u.bypass);
    const ctx = {bufferedEarly: firstBuf > 0 && firstBuf <= 2};
    let level = null, total = new Array(NF).fill(0);
    const stages = {};
    for (const u of active) {
      const T = TYPES[u.type];
      let db, st;
      if (u.bypass) { db = new Array(NF).fill(0); st = {pre: level, out: level, ceil: null, sat: 0}; }
      else { db = sectionsDb(T.fr(u.k, u, ctx), T.frScale || 1); if (T.frNorm) db = normalize(db); st = T.stage(u.k, level, u, ctx); }
      st.inp = level; level = st.out;
      total = total.map((v, i) => v + db[i]);
      stages[u.id] = {id: u.id, db, cum: total.slice(), ...st};
    }
    const envDb = sectionsDb((ENVS[envKey] || ENVS.studio).fr);
    const final = normalize(total.map((v, i) => v + envDb[i]));
    return {stages, final, ctx, harm: harmonics(active, stages), time: timeEnv(active, stages)};
  }

  function harmonics(chain, stages) {
    const N = 512; let x = Array.from({length: N}, (_, n) => Math.sin(TAU * n / N));
    chain.forEach(u => {
      const st = stages[u.id]; if (u.bypass || !st.shape || st.sat < 0.05) return;
      const drive = Math.pow(10, Math.min(st.sat, 40) / 20 * 0.45) * 0.9;
      const pk = Math.max(...x.map(Math.abs)) || 1;
      x = x.map(v => {
        const y = v / pk * drive;
        if (st.shape === 'sym') return Math.tanh(y);
        if (st.shape === 'asym') return y > 0 ? Math.tanh(y * 1.25) : Math.tanh(y * 0.65) * 0.85;
        if (st.shape === 'hard') return Math.max(-1, Math.min(1, y * 1.1)) * 0.9 + Math.tanh(y) * 0.1;
        const b = 0.45; return y + b > 0 ? Math.tanh(y + b) - Math.tanh(b) : (Math.tanh((y + b) * 2.2) / 2.2) - Math.tanh(b);
      });
    });
    const H = [];
    for (let h = 1; h <= 12; h++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) { re += x[n] * Math.cos(TAU * h * n / N); im -= x[n] * Math.sin(TAU * h * n / N); }
      H.push(Math.hypot(re, im) * 2 / N);
    }
    const h1 = H[0] || 1e-9;
    const rel = H.map(v => 20 * Math.log10(v / h1 + 1e-9));
    const thd = Math.sqrt(H.slice(1).reduce((a, v) => a + v * v, 0)) / h1 * 100;
    const even = Math.sqrt(H.filter((_, i) => i % 2 === 1).reduce((a, v) => a + v * v, 0));
    const odd = Math.sqrt(H.filter((_, i) => i % 2 === 0 && i > 0).reduce((a, v) => a + v * v, 0));
    return {rel, thd, wave: x, evenOdd: even / (odd + 1e-9)};
  }

  function timeEnv(chain, stages) {
    const T = 3.0, N = 600, t = Array.from({length: N}, (_, i) => i / (N - 1) * T);
    const on = ty => chain.find(u => u.type === ty && !u.bypass);
    const satTotal = Object.values(stages).reduce((a, s) => a + (s.sat || 0), 0);
    const cp = on('optocomp');
    const squash = cp ? Math.min(1, (stages[cp.id].gr || 0) / 14) : 0;
    const atk = cp ? 0.004 + cp.k.attack / 10 * 0.04 : 0.004;
    const decayRate = 26 / (1 + satTotal / 22 + squash * 0.9);
    const attackPeak = 6 * (1 - squash * 0.7) * (1 - Math.min(1, satTotal / 50));
    const dry = t.map(s => (s < atk ? -60 + s / atk * 60 : 0) + Math.max(0, attackPeak * (1 - s / 0.12)) - decayRate * s);
    const dl = on('dly');
    const dTime = dl ? dl.k.ms / 1000 : 0, fb = dl ? dl.k.fb / 100 : 0, mix = dl ? Math.pow(10, (dl.k.dlevel - 100) / 40) : 0;
    const taps = [];
    if (dl) for (let n = 1; n < 40; n++) { const lv = 20 * Math.log10(mix * Math.pow(fb, n - 1) + 1e-6); if (lv < -60 || n * dTime > T) break; taps.push({t: n * dTime, lv}); }
    const delay = t.map(s => { let p = 0; for (const tp of taps) { if (s < tp.t) break; p += Math.pow(10, (tp.lv - decayRate * (s - tp.t)) / 20); } return dl ? 20 * Math.log10(p + 1e-6) : -90; });
    const amp = chain.find(u => u.type === 'amp');
    const rv = amp && amp.k.input !== 'return' && amp.k.reverb > 0.2 ? amp.k.reverb : 0;
    const rt60 = rv ? 1.1 + rv / 10 * 1.6 : 0;
    const reverb = t.map(s => rv ? 20 * Math.log10(rv / 10 * 0.5 + 1e-6) + (s < 0.03 ? -20 * (1 - s / 0.03) : 0) - 60 * s / rt60 : -90);
    const total = t.map((_, i) => 10 * Math.log10(Math.pow(10, dry[i] / 10) + Math.pow(10, delay[i] / 10) + Math.pow(10, reverb[i] / 10)));
    const reach = (arr, lv) => { const i = arr.findIndex((v, j) => j > 4 && v < lv); return i < 0 ? null : t[i]; };
    return {t, dry, delay, reverb, total, taps, rt60, dTime, sustain: reach(dry, -20), decayRate};
  }

  const refCurve = normalize(sectionsDb([hp2(95, 0.9), peak(180, 1, 2), peak(800, 0.9, 3.2), peak(2600, 1.3, 3.5), lp2(4800, 0.85), lp2(7200, 0.7)]));

  function clock(v) {
    const q = Math.round(v * 4) / 4; let h = Math.floor(7 + q); const m = Math.round((7 + q - h) * 60);
    h = ((h - 1) % 12) + 1; return h + ':' + String(m).padStart(2, '0');
  }
  return {freqs, analyze, refCurve, clock, ENVS, clamp, TYPES, hp1, lp1, peak, hshelf, lshelf};
})();
if (typeof module !== 'undefined') module.exports = ENG;
