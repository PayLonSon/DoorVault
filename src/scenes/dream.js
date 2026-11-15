import { resolveEffect } from '../core/effects.js';
import { sfx, startAmbience, stopAmbience, updateAmbience, suspendAudio, resumeAudio } from '../core/audio.js';
import { isTouchDevice } from '../core/input.js';
import { session } from '../core/run.js';
import { BEHAVIORS } from '../world/monsters.js';
import { buildStaticLayer, targetAnchor, drawTarget, drawTargetGlint, drawPlayer, drawFx } from '../world/draw.js';

// 夢境場景：讀取故事資料，建立房間、目標物與怪物。
// 怪物怎麼動由 world/monsters.js 的行為決定；這裡負責玩家、互動、道具、恐懼值與畫面。

const PLAYER_SPEED = 140;
const PLAYER_R = 12;
const INTERACT_RANGE = 52;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch (e) { /* 不支援就略過 */ } };

const TARGET_SFX = { window: 'windowClose', cup: 'cup', key: 'key', candle: 'candle', jar: 'seal' };
const VERB = { window: '關窗', cup: '打翻', key: '撿起', candle: '點燃', jar: '封住' };

export const dreamScene = {
  enter(game) {
    const run = game.run, story = run.story;
    Object.assign(this, {
      game, story, map: story.map, theme: story.theme, cfg: story.monster,
      behavior: BEHAVIORS[story.monster.behavior],
      t: 0, fear: 0, ended: null, endT: 0, shake: 0, hitFlash: 0, invuln: 0,
      prevInteract: false, fx: [], toastT: 0, noteT: 0, activeNote: null, progressSfxT: 0,
      noise: 0, noiseEvent: 0, noiseFxT: 0, done: 0, paused: false, moved: 0, tipShown: false,
      lampOff: 0,
    });
    this.player = { x: this.map.playerStart.x, y: this.map.playerStart.y, face: 1, step: 0, moving: false, mag: 0 };
    this.targets = this.map.targets.map((t) => ({ ...t, done: false, progress: 0, anchor: targetAnchor(t, this.map) }));
    this.need = story.objective.need ?? this.targets.length;
    this.notes = this.map.notes.map((n) => ({ ...n, read: false }));
    this.item = {
      def: run.item, uses: run.item.uses ?? Infinity, on: false,
      effect: resolveEffect(run.item, story), announced: false,
    };
    const start = this.cfg.start || { x: this.map.width / 2, y: this.map.height / 2 };
    this.monster = { x: start.x, y: start.y, vx: 0, vy: 0, seed: Math.random() * 10 };
    this.staticLayer = buildStaticLayer(story);
    this.dark = document.createElement('canvas');
    this.darkCtx = this.dark.getContext('2d');
    run.need = this.need;
    session.runs++;
    session.seen.add(story.id);

    this.hud = {
      root: document.getElementById('hud'),
      objective: document.getElementById('hud-objective'),
      timer: document.getElementById('hud-timer'),
      fear: document.getElementById('hud-fear'),
      item: document.getElementById('hud-item'),
      toast: document.getElementById('hud-toast'),
      note: document.getElementById('hud-note'),
    };
    this.hud.root.classList.remove('hidden');
    this.hud.note.classList.add('hidden');
    document.getElementById('touch').classList.toggle('hidden', !isTouchDevice());
    this.hint = document.getElementById('stick-hint');
    this.hint.classList.remove('fade');
    document.getElementById('btn-pause').onclick = () => this.pause(game);
    document.getElementById('btn-resume').onclick = () => this.resume(game);
    game.input.reset();
    startAmbience();
    this.behavior.init(this, this.monster);
    this.toast(story.idiom, 1.8);
  },

  exit() {
    document.getElementById('pause').classList.add('hidden');
    this.hud.root.classList.add('hidden');
    this.hud.toast.classList.remove('show');
    document.getElementById('touch').classList.add('hidden');
    stopAmbience();
  },

  pause(game) {
    if (this.paused || this.ended) return;
    this.paused = true;
    game.input.reset();
    suspendAudio();
    document.getElementById('pause').classList.remove('hidden');
  },

  resume(game) {
    if (!this.paused) return;
    this.paused = false;
    game.input.reset();
    resumeAudio();
    document.getElementById('pause').classList.add('hidden');
  },

  toast(text, secs = 2.4) {
    this.hud.toast.textContent = text;
    this.hud.toast.classList.add('show');
    this.toastT = secs;
  },

  makeNoise(r) {
    this.noiseEvent = Math.max(this.noiseEvent, r);
    if (this.cfg.behavior === 'blind') this.fx.push({ kind: 'noise', x: this.player.x, y: this.player.y, r, t: 0, life: 0.9 });
  },

  end(result) {
    if (this.ended) return;
    const run = this.game.run;
    this.ended = result;
    this.endT = 0;
    run.result = result;
    run.elapsed = this.t;
    run.progress = this.done;
    if (result === 'win') {
      session.woke.add(this.story.id);
      if (!session.fragments.includes(this.story.fragment)) session.fragments.push(this.story.fragment);
    }
    stopAmbience();
    if (result === 'win') sfx.wake(); else { sfx.fail(); buzz(300); }
    this.hud.note.classList.add('hidden');
  },

  // ======================== 更新 ========================
  update(game, dt) {
    if (this.paused) return;
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.hud.toast.classList.remove('show'); }
    this.shake = Math.max(0, this.shake - dt * 2);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.5);
    this.fx = this.fx.filter((f) => (f.t += dt) < f.life);

    if (this.ended) {
      this.endT += dt;
      if (this.endT > 3) game.go('result');
      return;
    }

    this.t += dt;
    if (!this.tipShown && this.t > 2 && this.story.tip) { this.tipShown = true; this.toast(this.story.tip, 4); }

    const input = game.input.read();
    this.updatePlayer(dt, input);
    this.updateInteract(dt, input);
    const lightOn = this.item.def.kind === 'toggle' && this.item.on;
    this.lightOn = lightOn;
    this.lightProvokes = lightOn && this.item.effect === 'provoked';
    this.lightRepels = lightOn && this.item.effect === 'effective';
    if (input.item) this.useItem();
    this.updateNoise(dt);
    this.behavior.update(this, this.monster, dt);
    this.checkContact(dt);
    this.updateFear(dt);
    this.updateHud();
    if (this.t >= this.story.timeLimit) this.end('timeout');
  },

  updatePlayer(dt, input) {
    const p = this.player;
    const mag = Math.min(1, Math.hypot(input.x, input.y));
    p.x += input.x * PLAYER_SPEED * dt;
    p.y += input.y * PLAYER_SPEED * dt;
    if (input.x) p.face = Math.sign(input.x);
    p.mag = mag;
    p.moving = mag > 0.08;
    if (p.moving) {
      p.step += dt * 10 * mag;
      this.moved += dt;
      if (this.moved > 1.5) this.hint.classList.add('fade');
    }
    collideWorld(p, PLAYER_R, this.map);
    if (this.activeNote && dist(p, this.activeNote) > 60) this.hideNote();
  },

  updateNoise(dt) {
    const p = this.player;
    const moveNoise = p.moving ? 30 + p.mag * p.mag * 330 : 0;
    this.noise = Math.max(moveNoise, this.noiseEvent);
    this.noiseEvent = Math.max(0, this.noiseEvent - dt * 2000);
    if (this.cfg.behavior === 'blind' && moveNoise > 160) {
      this.noiseFxT -= dt;
      if (this.noiseFxT <= 0) { this.noiseFxT = 0.4; this.fx.push({ kind: 'noise', x: p.x, y: p.y, r: moveNoise, t: 0, life: 0.8 }); }
    }
  },

  updateInteract(dt, input) {
    const p = this.player;
    const pressed = input.interact && !this.prevInteract;
    this.prevInteract = input.interact;
    this.prompt = null;
    const kind = this.story.objective.kind;
    const open = this.targets.filter((t) => !t.done && !t.broken);
    let target = null, best = INTERACT_RANGE;
    for (const t of open) { const d = dist(p, t.anchor); if (d < best) { best = d; target = t; } }
    for (const t of open) if (t !== target) t.progress = Math.max(0, t.progress - dt * 0.5);

    if (target) {
      const touch = isTouchDevice();
      this.prompt = { target: target.anchor, text: `${touch ? '按住「互動」' : '按住 E '}${VERB[kind]}`, progress: target.progress };
      if (input.interact) {
        target.progress += dt / this.story.objective.holdSeconds;
        this.progressSfxT -= dt;
        if (this.progressSfxT <= 0) { sfx.progress(); this.progressSfxT = 0.22; }
        this.behavior.onTargetProgress?.(this, this.monster, target);
        if (target.broken) return;
        if (target.progress >= 1) this.completeTarget(target);
      } else {
        target.progress = Math.max(0, target.progress - dt * 0.5);
      }
      return;
    }

    const note = this.notes.find((n) => dist(p, n) < 40);
    if (note) {
      this.prompt = { target: note, text: isTouchDevice() ? '點「互動」閱讀' : '按 E 閱讀' };
      if (pressed) this.showNote(note);
    }
    if (this.noteT > 0) { this.noteT -= dt; if (this.noteT <= 0) this.hideNote(); }
  },

  completeTarget(t) {
    t.done = true;
    t.progress = 1;
    this.done++;
    (sfx[TARGET_SFX[this.story.objective.kind]] || sfx.windowClose)();
    buzz(40);
    this.shake = 0.35;
    if (this.done >= this.need) {
      this.toast('……', 2);
      this.end('win');
      return;
    }
    const msgs = this.story.messages.progress;
    const left = this.need - this.done;
    this.toast(left === 1 ? msgs[msgs.length - 1] : msgs[Math.min(this.done - 1, msgs.length - 2)]);
    this.behavior.onProgress?.(this, this.monster);
  },

  showNote(note) {
    note.read = true;
    this.activeNote = note;
    this.hud.note.textContent = note.text;
    this.hud.note.classList.remove('hidden');
    this.noteT = 7;
    sfx.paper();
  },

  hideNote() {
    this.hud.note.classList.add('hidden');
    this.activeNote = null;
    this.noteT = 0;
  },

  useItem() {
    const it = this.item, def = it.def, msgs = this.story.messages;
    const m = this.monster, p = this.player;
    const d = dist(p, m);
    this.game.run.usedItem = true;

    if (def.kind === 'toggle') {
      it.on = !it.on;
      it.on ? sfx.flashOn() : sfx.flashOff();
      if (it.on) {
        if (it.effect === 'provoked') {
          this.toast(msgs.toggleProvoked);
          this.behavior.onItem(this, m, 'provoked', d);
        } else if (!it.announced) {
          this.toast(it.effect === 'effective' ? msgs.effective : '光照亮了四周。');
        }
        it.announced = true;
      }
      return;
    }

    if (it.uses <= 0) { this.toast('已經用完了。', 1.6); return; }
    it.uses--;
    (sfx[def.id] || sfx.click)();
    this.fx.push({ kind: def.id, x: p.x, y: p.y, t: 0, life: def.id === 'matches' ? 5 : 1.4 });
    if (def.tags.includes('sound')) this.makeNoise(600);

    const res = this.behavior.onItem(this, m, it.effect, d);
    const text = { effective: msgs.effective, provoked: msgs.provoked, none: msgs.none, far: '牠離得太遠了。', nothing: '什麼也沒有發生。' }[res];
    if (text) this.toast(text, res === 'far' ? 1.8 : 2.4);
  },

  checkContact(dt) {
    this.invuln = Math.max(0, this.invuln - dt);
    const m = this.monster, p = this.player;
    if (this.invuln > 0 || !this.behavior.canHit(this, m)) return;
    if (dist(m, p) >= this.cfg.radius + PLAYER_R - 4) return;
    this.fear += this.cfg.fearOnHit;
    this.invuln = 1.4;
    this.shake = 1;
    this.hitFlash = 1;
    sfx.hit();
    buzz([80, 40, 120]);
    const ax = p.x - m.x, ay = p.y - m.y, l = Math.hypot(ax, ay) || 1;
    p.x += (ax / l) * 40; p.y += (ay / l) * 40;
    collideWorld(p, PLAYER_R, this.map);
    this.behavior.onHit(this, m);
  },

  presence() {
    const d = this.behavior.presenceDistance ? this.behavior.presenceDistance(this, this.monster) : dist(this.monster, this.player);
    return Number.isFinite(d) ? d : 9999;
  },

  updateFear(dt) {
    const d = this.presence();
    const near = clamp(1 - d / 230, 0, 1);
    this.fear += dt * (0.28 + near * 3.6 - (this.lightOn ? 0.15 : 0));
    this.fear = clamp(this.fear, 0, 100);
    updateAmbience(dt, this.fear / 100, clamp(1 - d / 450, 0, 1));
    if (this.fear >= 100) this.end('caught');
  },

  updateHud() {
    const h = this.hud;
    const left = Math.max(0, this.story.timeLimit - this.t);
    h.objective.textContent = `${this.story.objective.label} ${this.done}/${this.need}`;
    h.timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    h.timer.style.color = left < 30 ? '#e55' : '';
    h.fear.style.width = this.fear + '%';
    const it = this.item;
    h.item.textContent = it.def.kind === 'toggle'
      ? `${it.def.icon} ${it.def.name}（${it.on ? '開' : '關'}）`
      : `${it.def.icon} ${it.def.name} ×${it.uses}`;
  },

  // ======================== 繪製 ========================
  render(game, dt) {
    const { ctx, canvas } = game;
    const W = canvas.width, H = canvas.height;
    const S = game.worldScale();
    const vw = W / S, vh = H / S;
    const p = this.player, map = this.map, kind = this.story.objective.kind;

    // 鏡頭跟隨；手機底部預留按鈕的空間
    const padB = isTouchDevice() ? (150 * game.dpr) / S : 0;
    let cx = map.width > vw ? clamp(p.x - vw / 2, 0, map.width - vw) : (map.width - vw) / 2;
    let cy = map.height + padB > vh ? clamp(p.y - (vh - padB) / 2, 0, map.height + padB - vh) : (map.height - vh) / 2;
    if (this.shake > 0) { cx += (Math.random() - 0.5) * 10 * this.shake; cy += (Math.random() - 0.5) * 10 * this.shake; }
    const toS = (x, y) => [(x - cx) * S, (y - cy) * S];
    const world = () => ctx.setTransform(S, 0, 0, S, -cx * S, -cy * S);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    world();
    ctx.drawImage(this.staticLayer, 0, 0, map.width, map.height);

    for (const t of this.targets) drawTarget(ctx, t, kind, this.t);
    for (const n of this.notes) {
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(0.2);
      ctx.fillStyle = n.read ? '#8a8070' : '#e6dcc3';
      ctx.fillRect(-9, -11, 18, 22);
      ctx.fillStyle = 'rgba(60,40,30,.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-6, -7 + i * 5, 12, 1);
      ctx.restore();
    }
    for (const f of this.fx) if (f.kind !== 'noise') drawFx(ctx, f);
    drawPlayer(ctx, p, this.invuln);
    this.behavior.draw(ctx, this, this.monster);

    const lamp = this.theme.lamp;
    const flick = lamp ? this.lampFlicker() : 0;
    if (lamp) {
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lamp.x, 0); ctx.lineTo(lamp.x, lamp.y - 8); ctx.stroke();
      ctx.fillStyle = `rgba(255, 240, 190, ${0.3 + flick * 0.7})`;
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2); ctx.fill();
    }

    // ---- 黑暗遮罩 ----
    if (this.dark.width !== W || this.dark.height !== H) { this.dark.width = W; this.dark.height = H; }
    const dc = this.darkCtx;
    dc.globalCompositeOperation = 'source-over';
    dc.setTransform(1, 0, 0, 1, 0, 0);
    dc.clearRect(0, 0, W, H);
    dc.fillStyle = `rgba(3, 2, 5, ${this.theme.darkness})`;
    dc.fillRect(0, 0, W, H);
    dc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => {
      if (r <= 0) return;
      const [sx, sy] = toS(x, y);
      const g = dc.createRadialGradient(sx, sy, 0, sx, sy, r * S);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g;
      dc.beginPath(); dc.arc(sx, sy, r * S, 0, Math.PI * 2); dc.fill();
    };
    hole(p.x, p.y, this.lightOn ? 230 : 95 - this.fear * 0.25);
    if (lamp) hole(lamp.x, lamp.y, 170 * flick, 0.9 * flick);
    for (const t of this.targets) {
      if (kind === 'window' && !t.done) hole(t.anchor.x, t.anchor.y, 105, 0.75);
      if (kind === 'candle' && t.done) hole(t.x, t.y, 150 + Math.sin(this.t * 9 + t.x) * 6, 0.85);
    }
    for (const f of this.fx) {
      const k = 1 - f.t / f.life;
      if (f.kind === 'mirror') hole(f.x, f.y, 320 * k, k);
      if (f.kind === 'matches') hole(f.x, f.y, 90, 0.6 * k);
      if (f.kind === 'charm') hole(f.x, f.y, 120 * k, 0.5 * k);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.dark, 0, 0);

    // ---- 黑暗之上：眼睛、目標微光、噪音圈、互動提示 ----
    world();
    for (const t of this.targets) drawTargetGlint(ctx, t, kind, this.t);
    for (const f of this.fx) if (f.kind === 'noise') drawFx(ctx, f);
    this.behavior.drawAbove(ctx, this, this.monster);
    if (this.prompt && !this.ended) {
      const t = this.prompt.target;
      if (this.prompt.progress > 0) {
        ctx.strokeStyle = 'rgba(232,223,207,.9)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(t.x, t.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.prompt.progress); ctx.stroke();
      }
      ctx.font = '13px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(232,223,207,.85)';
      ctx.fillText(this.prompt.text, p.x, p.y - 26);
    }

    // ---- 後製 ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const f01 = this.fear / 100;
    const pulse = 0.5 + Math.sin(this.t * (3 + f01 * 6)) * 0.5;
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.45 - f01 * 0.2), W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(${Math.floor(40 + f01 * 80)},0,0,${0.35 + f01 * 0.4 * pulse})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (this.hitFlash > 0) { ctx.fillStyle = `rgba(160,0,0,${this.hitFlash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    if (this.ended) {
      const k = clamp(this.endT / 2.4, 0, 1);
      ctx.fillStyle = this.ended === 'win' ? `rgba(225,215,195,${k})` : `rgba(0,0,0,${k})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  lampFlicker() {
    const base = 0.75 + Math.sin(this.t * 3.1) * 0.1;
    if (Math.random() < 0.04 + (this.fear / 100) * 0.08) this.lampOff = 0.05 + Math.random() * 0.15;
    if (this.lampOff > 0) { this.lampOff -= 1 / 60; return 0.15; }
    return base;
  },
};

function collideWorld(p, r, map) {
  const wl = map.wall;
  p.x = clamp(p.x, wl + r, map.width - wl - r);
  p.y = clamp(p.y, wl + r, map.height - wl - r);
  for (const o of map.obstacles) {
    const nx = clamp(p.x, o.x, o.x + o.w), ny = clamp(p.y, o.y, o.y + o.h);
    const dx = p.x - nx, dy = p.y - ny, d = Math.hypot(dx, dy);
    if (d < r) {
      if (d === 0) { p.y = o.y - r; continue; }
      p.x = nx + (dx / d) * r; p.y = ny + (dy / d) * r;
    }
  }
}
