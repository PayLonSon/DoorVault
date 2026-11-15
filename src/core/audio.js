// 程序化音效：全部用 Web Audio 即時合成，不需要任何音檔
let ctx = null, master = null, noiseBuf = null;
let drone = null, wings = null, heartTimer = 0, heartRate = 1.1;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function noise(loop = false) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = loop;
  return src;
}

function env(gainNode, t, a, peak, dcy) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + a);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
}

function tone(freq, type, dur, vol, when = 0, slideTo = null) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env(g, t, 0.01, vol, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function burst(filterType, freq, dur, vol, when = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = filterType; f.frequency.value = freq;
  env(g, t, 0.005, vol, dur);
  s.connect(f).connect(g).connect(master);
  s.start(t); s.stop(t + dur + 0.05);
}

export function suspendAudio() { if (ctx && ctx.state === 'running') ctx.suspend(); }
export function resumeAudio() { if (ctx && ctx.state !== 'running') ctx.resume(); }

// ---- 持續的背景聲 ----
export function startAmbience() {
  if (!ctx || drone) return;
  const g = ctx.createGain(); g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = 'sawtooth'; o1.frequency.value = 55;
  o2.type = 'sawtooth'; o2.frequency.value = 57.3;
  o1.connect(lp); o2.connect(lp); lp.connect(g).connect(master);
  o1.start(); o2.start();

  // 翅膀聲：雜訊 + 快速振幅調變，音量隨距離調整
  const wn = noise(true), bp = ctx.createBiquadFilter(), wg = ctx.createGain(), am = ctx.createGain();
  bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 1.2;
  am.gain.value = 0.5;
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
  lfo.frequency.value = 21; lfoG.gain.value = 0.5;
  lfo.connect(lfoG).connect(am.gain);
  wg.gain.value = 0;
  wn.connect(bp).connect(am).connect(wg).connect(master);
  wn.start(); lfo.start();

  drone = { g, nodes: [o1, o2] };
  wings = { g: wg, nodes: [wn, lfo], bp, lfo };
  heartTimer = 0;
}

// 怪物的「存在感」聲音：每種怪物不同（翅膀、嘶嘶聲、呼吸、低語、悶響）
export function setPresence(freq, rate, q = 1.2) {
  if (!ctx || !wings) return;
  wings.bp.frequency.value = freq;
  wings.bp.Q.value = q;
  wings.lfo.frequency.value = rate;
}

export function stopAmbience() {
  if (!ctx || !drone) return;
  const t = ctx.currentTime;
  for (const x of [drone, wings]) {
    x.g.gain.cancelScheduledValues(t);
    x.g.gain.setValueAtTime(x.g.gain.value, t);
    x.g.gain.linearRampToValueAtTime(0, t + 1.2);
    x.nodes.forEach((n) => n.stop(t + 1.3));
  }
  drone = wings = null;
}

// 每幀更新：恐懼越高心跳越快；怪物越近翅膀聲越大
export function updateAmbience(dt, fear01, monsterNear01) {
  if (!ctx || !drone) return;
  wings.g.gain.setTargetAtTime(monsterNear01 * 0.22, ctx.currentTime, 0.1);
  heartRate = 1.1 - fear01 * 0.7;
  heartTimer -= dt;
  if (heartTimer <= 0) {
    heartTimer = heartRate;
    const v = 0.25 + fear01 * 0.35;
    tone(62, 'sine', 0.16, v, 0, 40);
    tone(58, 'sine', 0.14, v * 0.7, 0.18, 38);
  }
}

// ---- 單次音效 ----
export const sfx = {
  click() { tone(900, 'square', 0.04, 0.05); },
  select() { tone(440, 'triangle', 0.25, 0.08); tone(660, 'triangle', 0.3, 0.05, 0.08); },
  door() { burst('lowpass', 300, 1.2, 0.25); tone(90, 'sawtooth', 1.4, 0.05, 0, 60); },
  harmonica() {
    [523, 659, 784].forEach((f, i) => { tone(f, 'square', 0.6, 0.035, i * 0.12); tone(f * 1.005, 'triangle', 0.6, 0.04, i * 0.12); });
  },
  matches() { burst('highpass', 2500, 0.15, 0.25); burst('bandpass', 800, 1.2, 0.08, 0.1); },
  salt() { for (let i = 0; i < 6; i++) burst('highpass', 5000, 0.05, 0.08, i * 0.04); },
  mirror() { tone(1800, 'sine', 0.5, 0.05); tone(2400, 'sine', 0.6, 0.03, 0.05); },
  charm() { tone(330, 'sine', 1.0, 0.08); tone(495, 'sine', 1.0, 0.05); },
  flashOn() { tone(1200, 'square', 0.03, 0.06); },
  flashOff() { tone(700, 'square', 0.03, 0.05); },
  window() { burst('lowpass', 180, 0.4, 0.5); tone(80, 'sine', 0.3, 0.3, 0, 50); },
  windowClose() { burst('lowpass', 180, 0.4, 0.5); tone(80, 'sine', 0.3, 0.3, 0, 50); },
  paper() { burst('bandpass', 3000, 0.25, 0.08); },
  screech() { tone(900, 'sawtooth', 0.5, 0.08, 0, 300); tone(950, 'sawtooth', 0.5, 0.06, 0, 280); burst('bandpass', 1500, 0.4, 0.15); },
  hit() { burst('lowpass', 400, 0.5, 0.5); tone(140, 'sawtooth', 0.6, 0.12, 0, 50); },
  wake() { [392, 494, 587, 784].forEach((f, i) => tone(f, 'sine', 2.2, 0.06, i * 0.18)); },
  fail() { tone(220, 'sawtooth', 2.4, 0.06, 0, 55); tone(233, 'sawtooth', 2.4, 0.05, 0, 58); },
  progress() { tone(300, 'sine', 0.05, 0.02); },
  knock(vol = 0.3) { burst('lowpass', 160, 0.18, vol); tone(70, 'sine', 0.15, vol * 0.6, 0, 50); },
  cup() { tone(1400, 'triangle', 0.25, 0.06, 0, 900); burst('bandpass', 2000, 0.3, 0.08, 0.05); },
  key() { tone(2600, 'sine', 0.12, 0.05); tone(3200, 'sine', 0.15, 0.04, 0.06); },
  candle() { burst('highpass', 2500, 0.12, 0.2); burst('bandpass', 600, 0.6, 0.05, 0.08); },
  seal() { burst('bandpass', 1200, 0.2, 0.12); tone(110, 'sine', 0.3, 0.2, 0.05, 70); },
  shatter() { for (let i = 0; i < 8; i++) burst('highpass', 3000 + i * 300, 0.12, 0.15, i * 0.03); tone(90, 'sawtooth', 0.6, 0.15, 0, 40); },
};
