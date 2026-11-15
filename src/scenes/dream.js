import { resolveEffect } from '../core/effects.js';
import { sfx, startAmbience, stopAmbience, updateAmbience, suspendAudio, resumeAudio } from '../core/audio.js';
import { isTouchDevice } from '../core/input.js';

// 夢境場景：讀取故事資料來建立房間、怪物與醒來條件
// 目前支援的醒來條件：close-windows（關上所有窗戶）

const PLAYER_SPEED = 140;
const PLAYER_R = 12;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// 手機震動（不支援或被瀏覽器擋下時就略過）
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch (e) { /* 略過 */ } };

export const dreamScene = {
  enter(game) {
    const run = game.run;
    const story = run.story;
    const map = story.map;
    this.game = game;
    this.story = story;
    this.map = map;
    this.cfg = story.monster;
    this.t = 0;
    this.fear = 0;
    this.ended = null;
    this.endT = 0;
    this.shake = 0;
    this.hitFlash = 0;
    this.invuln = 0;
    this.prevInteract = false;
    this.fx = [];
    this.toastT = 0;
    this.noteT = 0;
    this.activeNote = null;
    this.progressSfxT = 0;

    this.player = { x: map.playerStart.x, y: map.playerStart.y, face: 1, step: 0 };
    this.monster = {
      x: map.lamp.x + 80, y: map.lamp.y, vx: 0, vy: 0,
      state: 'hover', timer: 0, angle: 0, loseT: 0, flap: 0,
    };
    this.windows = map.windows.map((w) => ({ ...w, closed: false, progress: 0, anchor: windowAnchor(w, map) }));
    this.notes = map.notes.map((n) => ({ ...n, read: false }));
    this.item = { def: run.item, uses: run.item.uses ?? Infinity, on: false, effect: resolveEffect(run.item, story), announced: false };

    this.staticLayer = buildStaticLayer(map);
    this.dark = document.createElement('canvas');
    this.darkCtx = this.dark.getContext('2d');

    // HUD
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
    game.input.reset();
    this.paused = false;
    this.moved = 0;
    const hint = document.getElementById('stick-hint');
    hint.classList.remove('fade');
    this.hint = hint;
    document.getElementById('btn-pause').onclick = () => this.pause(game);
    document.getElementById('btn-resume').onclick = () => this.resume(game);
    startAmbience();
    this.toast('……', 1.5);
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

  exit() {
    document.getElementById('pause').classList.add('hidden');
    this.paused = false;
    this.hud.root.classList.add('hidden');
    this.hud.toast.classList.remove('show');
    document.getElementById('touch').classList.add('hidden');
    stopAmbience();
  },

  toast(text, secs = 2.4) {
    this.hud.toast.textContent = text;
    this.hud.toast.classList.add('show');
    this.toastT = secs;
  },

  end(result) {
    if (this.ended) return;
    this.ended = result;
    this.endT = 0;
    this.game.run.result = result;
    this.game.run.elapsed = this.t;
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
    const input = game.input.read();
    this.updatePlayer(dt, input);
    this.updateInteract(dt, input);
    if (input.item) this.useItem();
    this.updateMonster(dt);
    this.updateFear(dt);
    this.updateHud();

    if (this.t >= this.story.timeLimit) this.end('timeout');
  },

  updatePlayer(dt, input) {
    const p = this.player;
    const reading = this.activeNote && !this.hud.note.classList.contains('hidden');
    p.x += input.x * PLAYER_SPEED * dt;
    p.y += input.y * PLAYER_SPEED * dt;
    if (input.x) p.face = Math.sign(input.x);
    p.moving = !!(input.x || input.y);
    if (p.moving) {
      p.step += dt * 10;
      this.moved += dt;
      if (this.moved > 1.5) this.hint.classList.add('fade');
    }
    collideWorld(p, PLAYER_R, this.map);
    if (reading && dist(p, this.activeNote) > 60) this.hideNote();
  },

  updateInteract(dt, input) {
    const p = this.player;
    const pressed = input.interact && !this.prevInteract;
    this.prevInteract = input.interact;
    this.prompt = null;

    // 窗戶：按住關上
    const win = this.windows.find((w) => !w.closed && dist(p, w.anchor) < 52);
    for (const w of this.windows) if (w !== win && !w.closed) w.progress = Math.max(0, w.progress - dt * 0.5);
    if (win) {
      this.prompt = { target: win.anchor, text: isTouchDevice() ? '按住「互動」關窗' : '按住 E 關窗', progress: win.progress };
      if (input.interact) {
        win.progress += dt / this.story.objective.holdSeconds;
        this.progressSfxT -= dt;
        if (this.progressSfxT <= 0) { sfx.progress(); this.progressSfxT = 0.22; }
        if (win.progress >= 1) this.closeWindow(win);
      } else {
        win.progress = Math.max(0, win.progress - dt * 0.5);
      }
      return;
    }

    // 紙條：按一下閱讀
    const note = this.notes.find((n) => dist(p, n) < 40);
    if (note) {
      this.prompt = { target: note, text: isTouchDevice() ? '點「互動」閱讀' : '按 E 閱讀' };
      if (pressed) this.showNote(note);
    }
    if (this.noteT > 0) { this.noteT -= dt; if (this.noteT <= 0) this.hideNote(); }
  },

  closeWindow(win) {
    win.closed = true;
    win.progress = 1;
    sfx.windowClose();
    buzz(40);
    this.shake = 0.4;
    const closed = this.windows.filter((w) => w.closed).length;
    if (closed >= this.windows.length) {
      this.toast('最後一扇窗關上了。', 2);
      this.end('win');
      return;
    }
    const msgs = this.story.messages.objectiveDone;
    this.toast(msgs[Math.min(closed - 1, msgs.length - 1)]);
    // 關窗的聲音會引來牠
    const m = this.monster;
    if (m.state === 'hover') { m.state = 'chase'; m.loseT = 0; sfx.screech(); }
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
          this.toast(msgs.toggleProvoked); sfx.screech();
          m.state = 'enraged'; m.timer = 2.5;
        } else if (it.effect === 'effective' && !it.announced) {
          this.toast(msgs.effective);
        } else if (!it.announced) {
          this.toast('光照亮了四周。');
        }
        it.announced = true;
      }
      return;
    }

    if (it.uses <= 0) { this.toast('已經用完了。', 1.6); return; }
    it.uses--;
    (sfx[def.id] || sfx.click)();
    this.fx.push({ kind: def.id, x: p.x, y: p.y, t: 0, life: def.id === 'matches' ? 5 : 1.4 });

    const RANGE = 280;
    if (it.effect === 'effective') {
      if (d < RANGE) {
        m.state = 'flee'; m.timer = 4.5;
        this.toast(msgs.effective);
      } else {
        this.toast('牠離得太遠了。', 1.8);
      }
    } else if (it.effect === 'provoked') {
      m.state = 'enraged'; m.timer = 5;
      sfx.screech();
      this.toast(msgs.provoked);
    } else {
      this.toast(d < 400 ? msgs.none : '什麼也沒有發生。');
    }
  },

  updateMonster(dt) {
    const m = this.monster, p = this.player, cfg = this.cfg, lamp = this.map.lamp;
    const d = dist(m, p);
    const closed = this.windows.filter((w) => w.closed).length;
    const lightOn = this.item.def.kind === 'toggle' && this.item.on;
    const lightProvokes = lightOn && this.item.effect === 'provoked';
    const lightRepels = lightOn && this.item.effect === 'effective';
    const chaseSpeed = cfg.chaseSpeed + closed * cfg.speedPerObjective;

    let tx = m.x, ty = m.y, speed = 90;
    m.flap += dt * (m.state === 'enraged' ? 34 : 22);

    switch (m.state) {
      case 'hover': {
        m.angle += dt * 0.9;
        tx = lamp.x + Math.cos(m.angle) * cfg.hoverRadius;
        ty = lamp.y + Math.sin(m.angle * 1.3) * cfg.hoverRadius * 0.6;
        speed = 85;
        if (d < cfg.detectRadius || lightProvokes) { m.state = 'chase'; m.loseT = 0; sfx.screech(); }
        break;
      }
      case 'chase': {
        tx = p.x; ty = p.y;
        speed = lightProvokes ? Math.max(chaseSpeed, 150) : chaseSpeed;
        if (d > cfg.loseRadius && !lightProvokes) { m.loseT += dt; if (m.loseT > 2) m.state = 'hover'; }
        else m.loseT = 0;
        break;
      }
      case 'enraged': {
        tx = p.x; ty = p.y; speed = cfg.enragedSpeed;
        m.timer -= dt;
        if (m.timer <= 0) { m.state = 'chase'; m.loseT = 0; }
        break;
      }
      case 'flee':
      case 'recover': {
        const ax = m.x - p.x, ay = m.y - p.y, l = Math.hypot(ax, ay) || 1;
        tx = m.x + ax / l * 100; ty = m.y + ay / l * 100;
        speed = m.state === 'flee' ? 170 : 120;
        m.timer -= dt;
        if (m.timer <= 0) m.state = 'hover';
        break;
      }
    }
    if (lightRepels && d < 200 && m.state !== 'flee') { m.state = 'flee'; m.timer = 1.5; }

    // 搖搖晃晃的飛行
    const dx = tx - m.x, dy = ty - m.y, l = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(this.t * 7 + m.angle) * 0.6;
    const want = { x: (dx / l - dy / l * wob) * speed, y: (dy / l + dx / l * wob) * speed };
    const k = Math.min(1, dt * 4);
    m.vx += (want.x - m.vx) * k;
    m.vy += (want.y - m.vy) * k;
    m.x = clamp(m.x + m.vx * dt, 40, this.map.width - 40);
    m.y = clamp(m.y + m.vy * dt, 40, this.map.height - 40);

    // 碰到玩家
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.invuln <= 0 && (m.state === 'chase' || m.state === 'enraged' || m.state === 'hover')
        && d < cfg.radius + PLAYER_R - 4) {
      this.fear += cfg.fearOnHit;
      this.invuln = 1.4;
      this.shake = 1;
      this.hitFlash = 1;
      sfx.hit();
      buzz([80, 40, 120]);
      const ax = p.x - m.x, ay = p.y - m.y, ll = Math.hypot(ax, ay) || 1;
      p.x += ax / ll * 40; p.y += ay / ll * 40;
      collideWorld(p, PLAYER_R, this.map);
      m.state = 'recover'; m.timer = 1.6;
    }
  },

  updateFear(dt) {
    const d = dist(this.monster, this.player);
    const near = clamp(1 - d / 230, 0, 1);
    const lightOn = this.item.def.kind === 'toggle' && this.item.on;
    this.fear += dt * (0.28 + near * 3.6 - (lightOn ? 0.15 : 0));
    this.fear = clamp(this.fear, 0, 100);
    this.near = clamp(1 - d / 450, 0, 1);
    updateAmbience(dt, this.fear / 100, this.near);
    if (this.fear >= 100) this.end('caught');
  },

  updateHud() {
    const h = this.hud;
    const closed = this.windows.filter((w) => w.closed).length;
    const left = Math.max(0, this.story.timeLimit - this.t);
    h.objective.textContent = `${this.story.objective.label} ${closed}/${this.windows.length}`;
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
    const S = game.worldScale();                 // 每個世界單位對應多少實體像素
    const vw = W / S, vh = H / S;
    const p = this.player, map = this.map;

    // 鏡頭跟隨玩家
    // 手機：底部有搖桿和按鈕，鏡頭往下多留一段空間，角色才不會被手指擋住
    const padB = isTouchDevice() ? (150 * game.dpr) / S : 0;
    let cx = map.width > vw ? clamp(p.x - vw / 2, 0, map.width - vw) : (map.width - vw) / 2;
    let cy = map.height + padB > vh
      ? clamp(p.y - (vh - padB) / 2, 0, map.height + padB - vh)
      : (map.height - vh) / 2;
    if (this.shake > 0) { cx += (Math.random() - 0.5) * 10 * this.shake; cy += (Math.random() - 0.5) * 10 * this.shake; }
    const toS = (x, y) => [(x - cx) * S, (y - cy) * S];

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(S, 0, 0, S, -cx * S, -cy * S);

    // 靜態地板、箱子、牆
    ctx.drawImage(this.staticLayer, 0, 0, map.width, map.height);

    // 窗戶
    for (const w of this.windows) drawWindow(ctx, w, this.t);

    // 紙條
    for (const n of this.notes) {
      ctx.save();
      ctx.translate(n.x, n.y); ctx.rotate(0.2);
      ctx.fillStyle = n.read ? '#8a8070' : '#e6dcc3';
      ctx.fillRect(-9, -11, 18, 22);
      ctx.fillStyle = 'rgba(60,40,30,.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-6, -7 + i * 5, 12, 1);
      ctx.restore();
    }

    // 道具特效（煙、鹽、波紋）
    for (const f of this.fx) drawFx(ctx, f);

    // 玩家
    drawPlayer(ctx, p, this.invuln);

    // 怪物本體
    drawMoth(ctx, this.monster, this.cfg.radius);

    // 燈泡
    const lamp = map.lamp;
    const flick = this.lampFlicker(dt);
    ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lamp.x, 0); ctx.lineTo(lamp.x, lamp.y - 8); ctx.stroke();
    ctx.fillStyle = `rgba(255, 240, 190, ${0.3 + flick * 0.7})`;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2); ctx.fill();

    // ---- 黑暗遮罩 ----
    if (this.dark.width !== W || this.dark.height !== H) { this.dark.width = W; this.dark.height = H; }
    const dc = this.darkCtx;
    dc.globalCompositeOperation = 'source-over';
    dc.setTransform(1, 0, 0, 1, 0, 0);
    dc.clearRect(0, 0, W, H);
    dc.fillStyle = 'rgba(3, 2, 5, 0.965)';
    dc.fillRect(0, 0, W, H);
    dc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => {
      const [sx, sy] = toS(x, y);
      const g = dc.createRadialGradient(sx, sy, 0, sx, sy, r * S);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g;
      dc.beginPath(); dc.arc(sx, sy, r * S, 0, Math.PI * 2); dc.fill();
    };
    const lightOn = this.item.def.kind === 'toggle' && this.item.on;
    hole(p.x, p.y, lightOn ? 230 : 95 - this.fear * 0.25);
    hole(lamp.x, lamp.y, 170 * flick, 0.9 * flick);
    for (const w of this.windows) if (!w.closed) hole(w.anchor.x, w.anchor.y, 105, 0.75);
    for (const f of this.fx) {
      const k = 1 - f.t / f.life;
      if (f.kind === 'mirror') hole(f.x, f.y, 320 * k, k);
      if (f.kind === 'matches') hole(f.x, f.y, 90, 0.6 * k);
      if (f.kind === 'charm') hole(f.x, f.y, 120 * k, 0.5 * k);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.dark, 0, 0);

    // ---- 黑暗之上：怪物發光的眼睛、互動提示 ----
    ctx.setTransform(S, 0, 0, S, -cx * S, -cy * S);
    drawMothEyes(ctx, this.monster, this.t);
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

    // ---- 後製：暈影、恐懼紅光、受擊閃爍、結束淡出 ----
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

// ======================== 輔助函式 ========================

function windowAnchor(w, map) {
  const m = map.wall + 22;
  if (w.side === 'top') return { x: w.x, y: m };
  if (w.side === 'bottom') return { x: w.x, y: map.height - m };
  if (w.side === 'left') return { x: m, y: w.y };
  return { x: map.width - m, y: w.y };
}

function collideWorld(p, r, map) {
  const wl = map.wall;
  p.x = clamp(p.x, wl + r, map.width - wl - r);
  p.y = clamp(p.y, wl + r, map.height - wl - r);
  for (const o of map.obstacles) {
    const nx = clamp(p.x, o.x, o.x + o.w), ny = clamp(p.y, o.y, o.y + o.h);
    const dx = p.x - nx, dy = p.y - ny, d = Math.hypot(dx, dy);
    if (d < r) {
      if (d === 0) { p.y = o.y - r; continue; }
      p.x = nx + dx / d * r; p.y = ny + dy / d * r;
    }
  }
}

// 地板、箱子、牆只畫一次，存成圖片
function buildStaticLayer(map) {
  const SCALE = 2;
  const c = document.createElement('canvas');
  c.width = map.width * SCALE; c.height = map.height * SCALE;
  const g = c.getContext('2d');
  g.scale(SCALE, SCALE);
  g.fillStyle = '#211a15';
  g.fillRect(0, 0, map.width, map.height);
  // 木板
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < map.height; y += 36) {
    g.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.15})`;
    g.fillRect(0, y, map.width, 2);
    let x = -rnd() * 200;
    while (x < map.width) {
      const len = 120 + rnd() * 180;
      g.fillStyle = `rgba(${rnd() < 0.5 ? '255,220,180' : '0,0,0'},${rnd() * 0.05})`;
      g.fillRect(x, y + 2, len, 34);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(x + len, y, 2, 36);
      x += len;
    }
  }
  // 污漬
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(0,0,0,${rnd() * 0.18})`;
    g.beginPath(); g.ellipse(rnd() * map.width, rnd() * map.height, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  // 箱子
  for (const o of map.obstacles) {
    g.fillStyle = 'rgba(0,0,0,.45)';
    g.fillRect(o.x + 6, o.y + 8, o.w, o.h);
    g.fillStyle = '#4a3828';
    g.fillRect(o.x, o.y, o.w, o.h);
    g.strokeStyle = '#2c2017'; g.lineWidth = 3;
    g.strokeRect(o.x + 1.5, o.y + 1.5, o.w - 3, o.h - 3);
    g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + o.w, o.y + o.h);
    g.moveTo(o.x + o.w, o.y); g.lineTo(o.x, o.y + o.h); g.stroke();
  }
  // 牆
  g.fillStyle = '#0f0b09';
  g.fillRect(0, 0, map.width, map.wall);
  g.fillRect(0, map.height - map.wall, map.width, map.wall);
  g.fillRect(0, 0, map.wall, map.height);
  g.fillRect(map.width - map.wall, 0, map.wall, map.height);
  return c;
}

function drawWindow(ctx, w, t) {
  const horiz = w.side === 'top' || w.side === 'bottom';
  const L = 76, T = 20;
  ctx.save();
  ctx.translate(w.x, w.y);
  if (!horiz) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = w.closed ? '#15100c' : '#3c4a5e';
  ctx.fillRect(-L / 2, -T / 2, L, T);
  if (!w.closed) {
    // 被風吹動的窗簾
    const sway = Math.sin(t * 2.4 + w.x) * 6;
    ctx.fillStyle = 'rgba(200,190,170,.35)';
    ctx.fillRect(-L / 2, -T / 2, 14 + sway, T);
    ctx.fillRect(L / 2 - 14 + sway, -T / 2, 14 - sway, T);
  } else {
    ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -T / 2); ctx.lineTo(0, T / 2); ctx.stroke();
  }
  ctx.strokeStyle = '#4a3828'; ctx.lineWidth = 3;
  ctx.strokeRect(-L / 2, -T / 2, L, T);
  ctx.restore();
}

function drawPlayer(ctx, p, invuln) {
  if (invuln > 0 && Math.floor(invuln * 12) % 2 === 0) return;
  const bob = p.moving ? Math.sin(p.step) * 1.5 : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath(); ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  // 睡衣
  ctx.fillStyle = '#9fb3c8';
  ctx.beginPath(); ctx.ellipse(0, 3 + bob, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
  // 頭
  ctx.fillStyle = '#e8d6c0';
  ctx.beginPath(); ctx.arc(0, -9 + bob, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1f18';
  ctx.beginPath(); ctx.arc(0, -11 + bob, 7, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(p.face * 2 - 1, -9 + bob, 2, 2);
  ctx.restore();
}

function drawMoth(ctx, m, r) {
  const flap = Math.abs(Math.sin(m.flap));
  const ang = Math.atan2(m.vy, m.vx) + Math.PI / 2;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(ang);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(6, 14, r * 1.4, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = m.state === 'enraged' ? '#5a3434' : '#4a443c';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.ellipse(r * 0.75 * (0.4 + flap * 0.6), -4, r * 1.05 * (0.35 + flap * 0.65), r * 0.85, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.55 * (0.4 + flap * 0.6), 10, r * 0.6 * (0.35 + flap * 0.65), r * 0.55, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#2b2622';
  ctx.beginPath(); ctx.ellipse(0, 2, r * 0.3, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2622'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-2, -r * 0.6); ctx.quadraticCurveTo(-8, -r * 1.2, -12, -r * 1.1);
  ctx.moveTo(2, -r * 0.6); ctx.quadraticCurveTo(8, -r * 1.2, 12, -r * 1.1); ctx.stroke();
  ctx.restore();
}

function drawMothEyes(ctx, m, t) {
  const ang = Math.atan2(m.vy, m.vx) + Math.PI / 2;
  const glow = m.state === 'enraged' ? 1 : m.state === 'chase' ? 0.85 : 0.5;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(ang);
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(s * 4, -10, 0, s * 4, -10, 9);
    g.addColorStop(0, `rgba(255,60,40,${glow})`);
    g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s * 4, -10, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,200,180,${glow})`;
    ctx.beginPath(); ctx.arc(s * 4, -10, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawFx(ctx, f) {
  const k = f.t / f.life;
  ctx.save();
  if (f.kind === 'harmonica' || f.kind === 'charm') {
    const color = f.kind === 'charm' ? '255,210,120' : '200,220,255';
    for (let i = 0; i < 3; i++) {
      const kk = clamp(k * 1.4 - i * 0.18, 0, 1);
      if (kk <= 0 || kk >= 1) continue;
      ctx.strokeStyle = `rgba(${color},${(1 - kk) * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, 20 + kk * 260, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (f.kind === 'matches') {
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + f.t * 0.6, rr = 20 + (i % 5) * 18 + f.t * 12;
      ctx.fillStyle = `rgba(150,140,130,${0.18 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr - f.t * 8, 26 + (i % 3) * 8, 0, Math.PI * 2); ctx.fill();
    }
    if (f.t < 1.2) {
      ctx.fillStyle = `rgba(255,170,60,${1 - f.t / 1.2})`;
      ctx.beginPath(); ctx.arc(f.x, f.y - 6, 4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (f.kind === 'salt') {
    for (let i = 0; i < 26; i++) {
      const a = i * 0.9, rr = k * (60 + (i % 7) * 18);
      ctx.fillStyle = `rgba(240,240,240,${1 - k})`;
      ctx.fillRect(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, 2, 2);
    }
  } else if (f.kind === 'mirror') {
    ctx.fillStyle = `rgba(255,255,240,${(1 - k) * 0.5})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, 40 + k * 200, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
