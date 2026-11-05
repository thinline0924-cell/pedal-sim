const test = require('node:test');
const assert = require('node:assert/strict');
const ENG = require('../js/engine.js');

const at = (arr, f) => arr[ENG.freqs.findIndex(x => x >= f)];

test('つまみの時計表記：0 = 7:00、5 = 12:00、10 = 5:00', () => {
  assert.equal(ENG.clock(0), '7:00');
  assert.equal(ENG.clock(5), '12:00');
  assert.equal(ENG.clock(7.5), '2:30');
  assert.equal(ENG.clock(10), '5:00');
});

const amp = (k, model = 'deville') => [{id: 'a', type: 'amp', model, k: {input: 'input', presence: 3, volume: 5, bright: 0, channel: 'normal', reverb: 0, ...k}}];

test('Fender 型トーンスタック：BASS を上げると低域が上がる', () => {
  const lo = ENG.analyze(amp({treble: 5, middle: 5, bass: 1}), 'studio').final;
  const hi = ENG.analyze(amp({treble: 5, middle: 5, bass: 9}), 'studio').final;
  assert.ok(at(hi, 100) > at(lo, 100) + 3);
});

test('Fender 型トーンスタック：TREBLE を上げると低域に対して高域が上がる', () => {
  // TREBLE は 1 kHz 付近も持ち上げるため、1 kHz 基準ではなく 4 kHz と 100 Hz の差で比べる
  const tilt = arr => at(arr, 4000) - at(arr, 100);
  const lo = ENG.analyze(amp({treble: 1, middle: 5, bass: 5}), 'studio').final;
  const hi = ENG.analyze(amp({treble: 9, middle: 5, bass: 5}), 'studio').final;
  assert.ok(tilt(hi) > tilt(lo) + 6);
});

test('RETURN 接続ではトーン回路とリバーブを通らない', () => {
  const a = ENG.analyze(amp({input: 'return', treble: 1, middle: 5, bass: 1, reverb: 8}), 'studio');
  const b = ENG.analyze(amp({input: 'return', treble: 9, middle: 5, bass: 9, reverb: 8}), 'studio');
  assert.deepEqual(a.final, b.final);
  assert.equal(a.time.rt60, 0);
});

test('バイパス中の機材は周波数特性と音量を変えない', () => {
  const gtr = {id: 'g', type: 'guitar', pu: {R: {fc: 4300, q: 1.7, lvl: -13}}, k: {vol: 10, tone: 8, sel: 'R'}};
  const ts = {id: 'o', type: 'od', bypass: true, k: {drive: 8, level: 5, tone: 5},
    v: {lowcut: 100, hicut: 6000, hump: 800, humpDb: 5, g0: 12, g1: 38, ceil: -5, knee: 4, shape: 'sym', tone: [{kind: 'hs', key: 'tone', f: 1500, flat: 5, db: 1.5}]}};
  const a = ENG.analyze([gtr], 'studio'), b = ENG.analyze([gtr, ts], 'studio');
  assert.deepEqual(a.final, b.final);
  assert.equal(b.stages.o.out, b.stages.g.out);
});

test('歪みを深くするとクリップ量と THD が増える', () => {
  const mk = drive => [{id: 'g', type: 'guitar', pu: {R: {fc: 4300, q: 1.7, lvl: -13}}, k: {vol: 10, tone: 8, sel: 'R'}},
    {id: 'o', type: 'od', k: {drive, level: 5, tone: 5},
      v: {lowcut: 100, hicut: 6000, hump: 800, humpDb: 5, g0: 12, g1: 38, ceil: -5, knee: 4, shape: 'sym', tone: [{kind: 'hs', key: 'tone', f: 1500, flat: 5, db: 1.5}]}}];
  const lo = ENG.analyze(mk(2), 'studio'), hi = ENG.analyze(mk(9), 'studio');
  assert.ok(hi.stages.o.sat > lo.stages.o.sat);
  assert.ok(hi.harm.thd > lo.harm.thd);
});
