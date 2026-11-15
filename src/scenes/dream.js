import { resolveEffect } from '../core/effects.js';
import { sfx, startAmbience, stopAmbience, updateAmbience, suspendAudio, resumeAudio } from '../core/audio.js';
import { isTouchDevice, setLefty, isLefty } from '../core/input.js';
import { session, NIGHT_SECONDS, DOORS_PER_NIGHT } from '../core/run.js';
import { BEHAVIORS } from '../world/monsters.js';
import { buildStaticLayer, targetAnchor, drawTarget, drawTargetGlint, drawPlayer, drawNote, drawFx } from '../world/draw.js';

// 夢境場景：讀取故事資料，建立房間、目標物與怪物。
// 怪物怎麼動由 world/monsters.js 的行為決定；這裡負責玩家、互動、道具、恐懼值與畫面。

const PLAYER_SPEED = 140;
const PLAYER_R = 12;
const INTERACT_RANGE = 52;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch (e) { /* 不支援就略過 */ } };

const TARGET_SFX = { window: 'windowClose', cup: 'cup', key: 'key', candle: 'candle', jar: 'seal', lantern: 'lantern', patch: 'nail', clock: 'clockStop', scroll: 'scroll', cover: 'cloth' };
const VERB = { window: '關窗', cup: '打翻', key: '撿起', candle: '點燃', jar: '封住', lantern: '點亮', patch: '補上', clock: '停下', scroll: '捲起', cover: '蓋上' };

export const dreamScene = {
  enter(game) {
    const run = game.run, story = run.story;
    Object.assign(this, {
      game, story, map: story.map, theme: story.theme, cfg: scaleMonster(story.monster, run.depth), mods: run.mods, itemLabel: null, actLabel: null,
      behavior: BEHAVIORS[story.monster.behavior],
      t: 0, fear: run.fear, ended: null, endT: 0, shake: 0, hitFlash: 0, invuln: 0,
      prevInteract: false, fx: [], toastT: 0, noteT: 0, activeNote: null, progressSfxT: 0,
      noise: 0, noiseEvent: 0, noiseFxT: 0, done: 0, paused: false, moved: 0, tipShown: false,
      lampOff: 0,
    });
    this.player = { x: this.map.playerStart.x, y: this.map.playerStart.y, face: 1, step: 0, moving: false, mag: 0 };
    // 越深的門，目標越多：第一扇 3 個、第二扇 4 個、第三扇全部
    const all = this.map.targets.map((t) => ({ ...t, done: false, progress: 0, anchor: targetAnchor(t, this.map) }));
    const extra = all.length - (story.objective.need ?? all.length);   // 例如甕：多一個是陷阱
    const count = Math.min(all.length, [3, 4, 99][run.depth] + extra);
    this.targets = run.rng.shuffle(all).slice(0, count);
    this.need = count - extra;
    this.notes = this.map.notes.map((n) => ({ ...n, read: false }));
    this.item = {
      def: run.item, uses: run.itemUses, on: false,
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
    const lefty = document.getElementById('btn-lefty');
    lefty.classList.toggle('hidden', !isTouchDevice());
    lefty.onclick = () => { setLefty(!isLefty()); lefty.textContent = `左手模式：${isLefty() ? '開' : '關'}`; };
    this.btnAct = document.getElementById('btn-act');
    this.btnItem = document.getElementById('btn-item');
    this.hud.boons = document.getElementById('hud-boons');
    this.hud.boons.innerHTML = run.boons.map((b) => `<span title="${b.name}">${b.icon}</span>`).join('');
    document.getElementById('hud-keys').textContent = isTouchDevice() ? '' : 'WASD 移動・Shift 慢走・按住空白鍵 互動・E 道具';
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
    run.elapsed = NIGHT_SECONDS - run.nightLeft;
    run.progress = this.done;
    if (result === 'win') {
      // 帶著走進下一扇門：恐懼退掉四成，道具補回一次
      run.fear = this.fear * 0.6;
      run.itemUses = Math.min(run.itemMax, this.item.uses + 1);
      run.played.push(this.story.id);
    }
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
      if (this.endT > 2.2) game.go(this.ended === 'win' && game.run.depth < DOORS_PER_NIGHT - 1 ? 'boon' : 'result');
      return;
    }

    this.t += dt;
    game.run.nightLeft -= dt;
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
    if (game.run.nightLeft <= 0) this.end('timeout');
  },

  updatePlayer(dt, input) {
    const p = this.player;
    const mag = Math.min(1, Math.hypot(input.x, input.y));
    p.x += input.x * PLAYER_SPEED * this.mods.speed * dt;
    p.y += input.y * PLAYER_SPEED * this.mods.speed * dt;
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
    const moveNoise = p.moving ? (30 + p.mag * p.mag * 330) * this.mods.noise : 0;
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
      this.prompt = { target: target.anchor, text: touch ? '' : `按住空白鍵${VERB[kind]}`, verb: VERB[kind], progress: target.progress };
      if (input.interact) {
        target.progress += dt / (this.story.objective.holdSeconds * this.mods.hold);
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

    // 紙條與記憶：走近就自動打開，走開就收起來
    const note = this.notes.find((n) => dist(p, n) < 40);
    if (note && this.activeNote !== note) this.showNote(note);
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

  // 被怪物拆掉的目標（亡羊補牢）：變回未完成
  reopenTarget(t) {
    if (!t.done || this.ended) return;
    t.done = false;
    t.progress = 0;
    this.done--;
    sfx.nail();
    this.shake = 0.5;
    this.toast(this.story.messages.undo || '有一個被拆開了！', 2);
  },

  showNote(note) {
    if (!note.read && note.kind === 'memory') {
      // 想起奶奶：這一晚都比較不容易害怕
      this.mods.fearRate *= 0.92;
      this.fear = Math.max(0, this.fear - 8);
      this.game.run.memories++;
      this.toast('想起了奶奶。沒那麼怕了。', 2.2);
    }
    note.read = true;
    this.activeNote = note;
    this.hud.note.textContent = note.text;
    this.hud.note.classList.toggle('memory', note.kind === 'memory');
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
    this.fear += this.cfg.fearOnHit * this.mods.fearRate;
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
    this.fear += dt * this.mods.fearRate * (0.15 + near * 3.6 - (this.lightOn ? 0.1 : 0));
    this.fear = clamp(this.fear, 0, 100);
    updateAmbience(dt, this.fear / 100, clamp(1 - d / 450, 0, 1));
    if (this.fear >= 100) this.end('caught');
  },

  updateHud() {
    const h = this.hud;
    const left = Math.max(0, this.game.run.nightLeft);
    h.objective.textContent = `第 ${this.game.run.depth + 1}/${DOORS_PER_NIGHT} 扇門・${this.story.objective.label} ${this.done}/${this.need}`;
    h.timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    h.timer.style.color = left < 45 ? '#e55' : '';
    h.fear.style.width = this.fear + '%';
    const it = this.item;
    const label = it.def.kind === 'toggle' ? `${it.def.name}（${it.on ? '開' : '關'}）` : `${it.def.name} ×${it.uses}`;
    if (label !== this.itemLabel) {
      this.itemLabel = label;
      h.item.innerHTML = `${it.def.icon} ${label}`;
      // 手機的道具鍵：顯示圖示與剩餘次數，用完變灰
      const n = it.def.kind === 'toggle' ? (it.on ? '開' : '關') : `×${it.uses}`;
      this.btnItem.innerHTML = `${it.def.icon}<small>${n}</small>`;
      this.btnItem.classList.toggle('empty', it.uses <= 0);
    }
    // 手機的互動鍵：靠近什麼就顯示什麼動作，附近沒東西時變暗
    const act = this.prompt?.verb || '';
    if (act !== this.actLabel) {
      this.actLabel = act;
      this.btnAct.innerHTML = act ? `${act}<small>按住</small>` : '互動';
      this.btnAct.classList.toggle('idle', !act);
    }
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
    for (const n of this.notes) drawNote(ctx, n);
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
    hole(p.x, p.y, (this.lightOn ? 250 : 125 - this.fear * 0.3) + this.mods.light);
    if (lamp) hole(lamp.x, lamp.y, 170 * flick, 0.9 * flick);
    for (const t of this.targets) {
      if (kind === 'window' && !t.done) hole(t.anchor.x, t.anchor.y, 105, 0.75);
      if ((kind === 'candle' || kind === 'lantern') && t.done) hole(t.x, t.y, 150 + Math.sin(this.t * 9 + t.x) * 6, 0.85);
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
    // 還沒看過的紙條與記憶，在黑暗裡微微發亮
    for (const n of this.notes) {
      if (n.read) continue;
      const mem = n.kind === 'memory';
      const a = (mem ? 0.3 : 0.16) + Math.sin(this.t * 2 + n.x) * 0.08;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, mem ? 20 : 14);
      g.addColorStop(0, `rgba(${mem ? '255,170,150' : '235,225,200'},${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, 20, 0, Math.PI * 2); ctx.fill();
    }
    // 怪物靠近時，身形會從黑暗裡浮出來
    const ghost = clamp(1 - this.presence() / 340, 0, 1) * 0.6;
    if (ghost > 0.02) { ctx.globalAlpha = ghost; this.behavior.draw(ctx, this, this.monster); ctx.globalAlpha = 1; }
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
      const k = clamp(this.endT / 1.8, 0, 1);
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

// 越深的門，怪物越快
function scaleMonster(cfg, depth) {
  const k = [0.9, 1, 1.12][depth] ?? 1.12, c = { ...cfg };
  for (const f of ['chaseSpeed', 'enragedSpeed', 'speed', 'huntSpeed']) if (c[f]) c[f] *= k;
  if (c.delay) c.delay *= [1.2, 1, 0.85][depth] ?? 0.85;
  if (c.burstAfter) c.burstAfter = [70, 55, 40][depth] ?? 40;
  return c;
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
      p.x = nx + (dx / d) * r; p.y = ny + (dy / d) * r;
    }
  }
}
