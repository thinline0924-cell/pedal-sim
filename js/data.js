/* ===== GEAR DATA =====
   status: ok = メーカー資料で確認 / chk = 販売店・第三者資料のみ (要確認) / none = 未取得
   knob: [key, label] (0–10) | {key, label, kind:'num', min, max, step, unit} | {key, label, kind:'sw', opts:[[value,label]...]} */
const TELE = (lv) => ({R: {fc: 4300, q: 1.7, lvl: lv}, M: {fc: 5600, q: 1.0, lvl: lv - 2}, F: {fc: 2900, q: 1.4, lvl: lv - 2}});
const HH = (fc, lv) => ({R: {fc, q: 1.35, lvl: lv}, M: {fc: fc * 1.3, q: 0.9, lvl: lv - 2}, F: {fc: fc * 0.88, q: 1.25, lvl: lv - 1}});
const PU_SW = {key: 'sel', label: 'PU', kind: 'sw', opts: [['F', 'ネック'], ['M', 'ミックス'], ['R', 'ブリッジ']]};

const GUITARS = {
  av63: {name: 'American Vintage II 1963 Telecaster', short: 'AVII 63 Tele', maker: 'Fender', pu: TELE(-13),
    spec: 'Pure Vintage \'63 Tele シングル×2', method: 'PU の共振（インダクタンス＋ケーブル容量）から帯域を推定。PU の DC 抵抗・インダクタンスは未取得のため標準値を使用。',
    src: [['PU 構成', 'Pure Vintage \'63 シングル×2', 'ok', 'Fender 公式製品ページ'], ['PU 抵抗値・インダクタンス', '—', 'none', '実測を推奨']]},
  tl69: {name: 'MIJ Traditional \'69 Telecaster Thinline', short: '69 Thinline', maker: 'Fender', pu: TELE(-13.5),
    spec: 'Tele シングル×2 / セミホロウ', method: 'Tele シングル標準値で推定。セミホロウ構造の鳴りは現段階では未反映。',
    src: [['PU 構成', 'Tele シングル×2（アルニコ）', 'chk', '販売店の記載'], ['PU 抵抗値・インダクタンス', '—', 'none', '実測を推奨']]},
  ecd: {name: 'Elitist Country Deluxe', short: 'Elitist CD', maker: 'Epiphone', pu: HH(2500, -9.5),
    spec: 'ハムバッカー×2（型番未確認）', method: 'ハムバッカー標準値で推定。PU の型番が不明なため要確認。',
    src: [['PU 構成', 'ハム×2', 'chk', '第三者データベース'], ['PU 型番', '—', 'none', '個体の確認が必要']]},
  am93: {name: 'AM93QM', short: 'AM93QM', maker: 'Ibanez', pu: HH(2600, -10),
    spec: 'Super 58 ハム×2 / セミホロウ', method: 'Super 58（アルニコ PAF 系）の標準値で推定。',
    src: [['PU 構成', 'Super 58 ×2（パッシブ・アルニコ）', 'chk', '販売店の記載（複数で一致）']]},
};

const INPUT_SW = {key: 'input', label: '接続', kind: 'sw', opts: [['input', 'INPUT'], ['return', 'RETURN']]};
const PRE = (key, label) => ({key, label, kind: 'knob', min: 0, max: 10, pre: 1});

const AMPS = {
  deville: {name: 'Hot Rod DeVille 410 IV', maker: 'Fender', short: 'DeVille 410', model: 'deville', acW: 180, acStatus: 'chk', acFrom: 'Wikipedia（公式資料で要確認）',
    knobs: [INPUT_SW, {key: 'channel', label: 'CH', kind: 'sw', pre: 1, opts: [['normal', 'NORMAL'], ['drive', 'DRIVE']]}, {key: 'bright', label: 'BRIGHT', kind: 'sw', pre: 1, opts: [[0, 'OFF'], [1, 'ON']]},
      PRE('volume', 'VOLUME'), PRE('drive', 'DRIVE'), PRE('master', 'MASTER'), PRE('treble', 'TREBLE'), PRE('bass', 'BASS'), PRE('middle', 'MIDDLE'), PRE('reverb', 'REVERB'), ['presence', 'PRESENCE']],
    k: {input: 'return', channel: 'normal', bright: 0, volume: 4, drive: 4, master: 4, treble: 6, bass: 4.5, middle: 6, reverb: 2.5, presence: 3},
    method: 'RETURN（パワーアンプ入力）接続ではプリ部・トーン回路・リバーブを通らないため、パワー段（6L6×2）と PRESENCE（負帰還）のみ計算。INPUT 接続時は Fender 型トーンスタックを回路値から計算（Yeh–Smith の式）。',
    src: [['コントロール', 'Volume / Drive / Master / Treble / Bass / Middle / Reverb / Presence', 'chk', '販売店の記載'], ['出力', '60 W', 'chk', '販売店の記載'], ['消費電力', '180 W', 'chk', 'Wikipedia'], ['トーンスタック定数', 'Fender 標準値で代用', 'chk', '回路図での確認を推奨'], ['パワーアンプ入力', 'あり（FX ループ / Power Amp In）', 'chk', '販売店の記載（III 以降）'], ['IV での変更点', '—', 'none', '取扱説明書で確認']]},
  jc120: {name: 'JC-120 Jazz Chorus', maker: 'Roland', short: 'JC-120', model: 'jc', acW: 130, acStatus: 'ok', acFrom: 'Roland 公式製品ページ',
    knobs: [INPUT_SW, {key: 'bright', label: 'BRIGHT', kind: 'sw', pre: 1, opts: [[0, 'OFF'], [1, 'ON']]}, PRE('volume', 'VOLUME'), PRE('treble', 'TREBLE'), PRE('middle', 'MIDDLE'), PRE('bass', 'BASS'),
      PRE('distortion', 'DISTORTION'), PRE('reverb', 'REVERB'), PRE('speed', 'SPEED'), PRE('depth', 'DEPTH')],
    k: {input: 'return', bright: 1, volume: 4, treble: 5, middle: 5, bass: 4, distortion: 0, reverb: 2.5, speed: 3, depth: 0},
    method: 'RETURN 接続ではパワーアンプ（ほぼフラットなソリッドステート）とスピーカーのみ計算。INPUT 接続時はアクティブ EQ と DISTORTION（硬いクリップ）を計算。',
    src: [['コントロール（CH2）', 'Bright / Volume / Treble / Middle / Bass / Distortion / Reverb / Speed / Depth', 'ok', 'Roland 公式'], ['出力', '60 W + 60 W', 'ok', 'Roland 公式'], ['消費電力', '130 W', 'ok', 'Roland 公式']]},
};

const OD_VOICE = {
  ful: {lowcut: 90, hicut: 6500, hump: 750, humpDb: 4, g0: 10, g1: 34, ceil: -4, knee: 4, shape: 'sym',
    tone: [{kind: 'hs', key: 'edge', f: 2600, flat: 5, db: 1.1}, {kind: 'ls', key: 'bottom', f: 160, flat: 5, db: 1.1}]},
  fm: {lowcut: 110, hicut: 6000, hump: 800, humpDb: 5, g0: 12, g1: 38, ceil: -5, knee: 4, shape: 'sym',
    tone: [{kind: 'hs', key: 'tone', f: 1500, flat: 5, db: 1.5}]},
  bf: {lowcut: 80, hicut: 5600, hump: 0, humpDb: 0, g0: 20, g1: 48, ceil: -7, knee: 2.5, shape: 'asym',
    tone: [{kind: 'pk', key: 'narrow', f: 800, q: 2.2, flat: 5, db: 1.4}, {kind: 'pk', key: 'wide', f: 1500, q: 0.5, flat: 5, db: 1.2}]},
};

const CHAIN = [
  {id: 'gtr', type: 'guitar', no: 'IN', guitar: 'av63', k: {vol: 10, tone: 8, sel: 'R'}},
  {id: 'sdd', type: 'buffer', no: '1', name: 'Sunday Driver SW II', maker: 'Lehle', kind: 'プリアンプ / バッファ / ブースター',
    knobs: [{key: 'mode', label: 'MODE', kind: 'sw', opts: [['S', 'S'], ['D', 'D']]}, ['gain', 'GAIN']], k: {mode: 'D', gain: 2},
    power: {v: '9–15V', ma: 165, note: '64–165 mA（最大値で計算）。15V を超えないこと', st: 'ok', from: 'Lehle 公式', maxV: 15},
    method: '公開仕様（最大 +18 dB、入力インピーダンス S = 5 MΩ / D = 1 MΩ）を使用。入力直後のバッファとしてケーブル容量の影響を軽減。',
    src: [['GAIN', '最大 +18 dB', 'chk', '販売店の記載'], ['入力インピーダンス', 'S 5 MΩ / D 1 MΩ', 'ok', 'Lehle 公式'], ['電源', '9–15 V / 64–165 mA', 'ok', 'Lehle 公式']]},
  {id: 'wdn', type: 'optocomp', no: '2', name: 'The Warden', maker: 'EarthQuaker Devices', kind: 'オプティカル・コンプ',
    knobs: [['level', 'LEVEL'], ['sustain', 'SUSTAIN'], ['ratio', 'RATIO'], ['tone', 'TONE'], ['attack', 'ATTACK'], ['release', 'RELEASE']],
    k: {level: 5.5, sustain: 3.5, ratio: 3, tone: 4, attack: 4, release: 5},
    power: {v: '9V', ma: 45, note: '9V 専用（内部で 18V に昇圧）。公式 31 mA / 販売店（V2）45 mA → 大きい方で計算', st: 'chk', from: 'EQD 公式・販売店', only9: true},
    method: 'オプト型コンプの汎用モデル。SUSTAIN は固定スレッショルドへの入力量として扱う（メーカー説明に基づく）。TONE は 11 時付近でフラット。',
    src: [['コントロール', 'Level / Sustain / Ratio / Tone / Attack / Release', 'chk', '販売店の記載（V2）'], ['電源', '9V / 31 mA', 'ok', 'EQD 公式'], ['版', 'V2', 'ok', 'ユーザー入力']]},
  {id: 'wah', type: 'wah', no: '3', name: 'V847-A HK works MOD.', maker: 'VOX', kind: 'ワウ', bypass: true,
    knobs: [['pos', 'PEDAL']], k: {pos: 6},
    power: {v: '9V', ma: null, note: '消費電流 未取得', st: 'none', from: '—'},
    method: 'V847 の回路（インダクタ型ワウ）で推定。HK works による改造内容は不明のため、実機測定での補正を推奨。',
    src: [['回路', 'V847（標準）', 'chk', '公開回路情報'], ['MOD 内容', '—', 'none', '工房への確認か実機測定']]},
  {id: 'xng', type: 'thru', no: 'SW', name: 'Xenagama Tail Loop 2', maker: 'One Control', kind: '3 ループ・スイッチャー（MK2）', switcher: true,
    knobs: [], k: {},
    power: {v: '9V', ma: 12, note: '版により 5–12 mA', st: 'chk', from: '第三者資料'},
    method: 'MK2 はバッファなしのため、ループの ON/OFF のみ反映。DC 分岐出力（4 系統・非アイソレート）からループ内のペダルに給電できる。',
    src: [['構成', '3 ループ＋チューナーアウト', 'ok', 'メーカー資料'], ['版', 'MK2（バッファなし）', 'ok', 'ユーザー入力'], ['DC 分岐出力', '4 系統', 'chk', '販売店の記載']]},
  {id: 'ful', type: 'od', no: 'L1', loop: 1, name: 'Fulltender', maker: 'JERSEY GIRL homemade guitars', kind: 'オーバードライブ', bypass: true,
    knobs: [['drive', 'DRIVE'], ['edge', 'EDGE'], ['bottom', 'BOTTOM'], ['level', 'LEVEL']], k: {drive: 4, edge: 5, bottom: 5, level: 6}, v: OD_VOICE.ful,
    power: {v: '9V', ma: null, note: '消費電流 未取得', st: 'none', from: '—'},
    method: '回路情報が公開されていないため汎用 OD モデルで仮置き。実機に試験信号を通して録る「実機測定」が最適。',
    src: [['コントロール', 'Drive / Edge / Bottom / Level ＋ スイッチ×2', 'chk', '第三者データベース'], ['回路', '非公開', 'none', '実機測定を推奨']]},
  {id: 'fm', type: 'od', no: 'L2', loop: 2, name: 'FIRE MIST FM-1V', maker: 'Free The Tone', kind: 'オーバードライブ',
    knobs: [['level', 'LEVEL'], ['tone', 'TONE'], ['drive', 'DRIVE']], k: {level: 6, tone: 5.5, drive: 4}, v: OD_VOICE.fm,
    power: {v: '9V', ma: null, note: '消費電流 未取得', st: 'none', from: '—'},
    method: '回路は非公開。入出力インピーダンス（入力 1 MΩ 以上 / 出力 10 kΩ）は反映。歪み特性は実機測定で置き換え予定。',
    src: [['コントロール', 'Level / Tone / Drive', 'chk', '販売店の記載'], ['入力 / 出力インピーダンス', '1 MΩ 以上 / 10 kΩ', 'chk', '販売店の記載'], ['消費電流', '—', 'none', '取扱説明書で確認']]},
  {id: 'bf', type: 'od', no: 'L3', loop: 3, name: 'Brown Feather', maker: '320design', kind: 'ディストーション', bypass: true,
    knobs: [['level', 'VOLUME'], ['drive', 'GAIN'], ['narrow', 'NARROW'], ['wide', 'WIDE']], k: {level: 5, drive: 5, narrow: 5, wide: 5}, v: OD_VOICE.bf,
    power: {v: '9V', ma: null, note: 'センター−。消費電流 未取得', st: 'none', from: '—'},
    method: 'OPA2134 を使う歪み回路であること以外は非公開。NARROW / WIDE は帯域の狭い・広い 2 つの EQ として仮置き。実機測定を推奨。',
    src: [['コントロール', 'Volume / Gain / Narrow / Wide', 'chk', '販売店の記載'], ['電源', '9V センター−', 'chk', '販売店の記載'], ['回路', '非公開（OPA2134 使用）', 'chk', '販売店の記載']]},
  {id: 'pb', type: 'thru', no: 'TU', offChain: true, name: 'Pitchblack PB-01', maker: 'KORG', kind: 'チューナー（チューナーアウト）',
    knobs: [], k: {},
    power: {v: '9V', ma: 40, note: '最大 40 mA', st: 'chk', from: '第三者サイトの取扱説明書'},
    method: 'スイッチャーのチューナーアウトに接続。音の経路には入らない。',
    src: [['接続', 'Xenagama のチューナーアウト', 'ok', '入力された構成'], ['消費電流', '最大 40 mA', 'chk', '第三者サイトの取扱説明書']]},
  {id: 'tcr', type: 'preamp', no: '4', name: 'Traditional Crystal', maker: 'HTJ-WORKS', kind: 'JFET プリアンプ（Two-Rock 系）', ret: true,
    knobs: [['treble', 'TREBLE'], ['middle', 'MIDDLE'], ['bass', 'BASS'], {key: 'mid', label: 'MID', kind: 'sw', opts: [[0, 'OFF'], [1, 'ON']]},
      {key: 'deep', label: 'DEEP', kind: 'sw', opts: [[0, 'OFF'], [1, 'ON']]}, {key: 'bright', label: 'BRIGHT', kind: 'sw', opts: [[0, 'OFF'], [1, 'ON']]}],
    k: {treble: 5.5, middle: 4.5, bass: 4.5, mid: 0, deep: 0, bright: 1},
    power: {v: '—', ma: null, note: '仕様 未取得', st: 'none', from: '—'},
    method: 'Two-Rock のプリ部を JFET で再現した機材として、パッシブ TMB トーン回路（Fender 型の定数で代用）と MID / DEEP / BRIGHT の 3 スイッチで計算。アンプはこの後ろからパワーアンプ入力（RETURN）で受ける。',
    src: [['種類', 'JFET プリアンプ（Two-Rock のプリ部を再現）', 'chk', '販売店の記載'], ['コントロール', 'Treble / Middle / Bass ＋ Mid / Deep / Bright', 'ok', 'ユーザー入力'],
      ['トーン回路の定数', 'Fender 型で代用', 'chk', '実機測定か回路の確認を推奨'], ['その他のつまみ（音量など）', '—', 'none', '確認が必要'], ['電源', '—', 'none', '取扱説明書で確認']]},
  {id: 'md5', type: 'mod', no: '5', name: 'MD-500', maker: 'BOSS', kind: 'モジュレーション（DSP）',
    knobs: [{key: 'type', label: 'TYPE', kind: 'sw', opts: [['cho', 'CHORUS'], ['fl', 'FLANGER'], ['ph', 'PHASER'], ['tr', 'TREMOLO']]}, ['rate', 'RATE'], ['depth', 'DEPTH'], ['elevel', 'E.LEVEL']],
    k: {type: 'cho', rate: 3, depth: 3.5, elevel: 4},
    power: {v: '9V', ma: 225, note: '225 mA', st: 'chk', from: '販売店の記載（公式で要確認）'},
    method: 'DSP 機材なので回路解析は不要。パラメータ表から揺れの速さ・深さを時間方向に反映（周波数特性への影響は小さい）。',
    src: [['消費電流', '225 mA', 'chk', '販売店の記載（複数で一致）'], ['パラメータ名', '—', 'chk', '取扱説明書で確認']]},
  {id: 'ft2', type: 'dly', no: '6', name: 'FLIGHT TIME FT-2Y', maker: 'Free The Tone', kind: 'デジタル・ディレイ',
    knobs: [{key: 'ms', label: 'TIME', kind: 'num', min: 10, max: 2000, step: 5, unit: 'ms'}, {key: 'fb', label: 'FEEDBACK', kind: 'num', min: 0, max: 100, step: 1, unit: '%'},
      {key: 'dlevel', label: 'DELAY LEVEL', kind: 'num', min: 0, max: 100, step: 1, unit: ''}, {key: 'output', label: 'OUTPUT', kind: 'num', min: 0, max: 3, step: 0.5, unit: 'dB'}],
    k: {ms: 420, fb: 30, dlevel: 62, output: 0},
    power: {v: '9–12V', ma: 400, note: '約 400 mA', st: 'chk', from: '販売店の記載'},
    method: 'DSP 機材。ディレイ音量・フィードバック・出力（最大 +3 dB）を表示値のまま使用。BPM 解析機能は対象外。',
    src: [['表示パラメータ', 'Delay level / Feedback / Output', 'chk', 'Sound On Sound のレビュー'], ['出力ブースト', '最大 +3 dB', 'ok', 'Free The Tone 公式'], ['電源', '9–12 V / 約 400 mA', 'chk', '販売店の記載']]},
  {id: 'amp', type: 'amp', no: 'AMP', amp: 'deville', k: {}},
  {id: 'cab', type: 'cab', no: 'SP', k: {mic: 3, dist: 2}},
];

const SUPPLY = {name: 'Engine Room LVL8', maker: 'Fender', from: 'Fender 公式（7・8 番の電圧別上限は販売店の記載）',
  outs: [1, 2, 3, 4, 5, 6].map(n => ({n, set: '9V', max: 500})).concat([{n: 7, set: '12V', max: 375, sw: true}, {n: 8, set: '9V', max: 500, sw: true}])};
const ASSIGN = [
  {out: 1, ids: ['ft2']}, {out: 2, ids: ['md5']}, {out: 3, ids: ['wdn']}, {out: 4, ids: ['pb']},
  {out: 5, ids: ['tcr']}, {out: 6, ids: ['wah']}, {out: 7, ids: ['sdd']},
  {out: 8, ids: ['xng', 'ful', 'fm', 'bf'], note: 'Xenagama の DC 分岐出力から L1〜L3 へ（非アイソレート）'}];
