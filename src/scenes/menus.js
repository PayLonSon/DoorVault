import { drawBackdrop } from '../world/backdrop.js';
import { createRun } from '../core/run.js';
import { initAudio, sfx } from '../core/audio.js';
import { resolveEffect, EFFECT_LABEL } from '../core/effects.js';
import { isTouchDevice } from '../core/input.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lines = (s) => esc(s).replace(/\n/g, '<br>');

function backdropScene(build) {
  return {
    enter(game, ...args) { game.ui.innerHTML = ''; build(game, ...args); },
    exit(game) { game.ui.innerHTML = ''; },
    update() {},
    render(game, dt) { drawBackdrop(game.ctx, game.canvas.width, game.canvas.height, dt); },
  };
}

const canFullscreen = () => isTouchDevice() && !!document.documentElement.requestFullscreen
  && document.fullscreenEnabled && !matchMedia('(display-mode: standalone)').matches;

// ---------- 標題 ----------
export const titleScene = backdropScene((game) => {
  const controls = isTouchDevice()
    ? '左半邊拖曳移動・右下「互動」按住・「道具」使用'
    : 'WASD／方向鍵移動・按住 E 互動・空白鍵使用道具';
  game.ui.innerHTML = `
    <div class="panel">
      <h1>三扇門</h1>
      <p class="sub">閉上眼睛。<br>每一次入睡，都是不同的惡夢。</p>
      <button class="btn" id="start">入睡</button>
      ${canFullscreen() ? '<br><button class="btn ghost" id="fs">全螢幕</button>' : ''}
      <p class="hint">${controls}<br>建議戴耳機${isTouchDevice() ? '・iPhone 請關掉靜音開關才聽得到聲音' : ''}</p>
    </div>`;
  const fs = game.ui.querySelector('#fs');
  if (fs) fs.onclick = () => {
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (e) { /* 略過 */ }
  };
  game.ui.querySelector('#start').onclick = () => {
    initAudio(); sfx.select();
    game.run = createRun();
    game.go('items');
  };
});

// ---------- 選道具（3 選 1） ----------
export const itemsScene = backdropScene((game) => {
  const run = game.run;
  game.ui.innerHTML = `
    <div class="panel">
      <h2>床邊有三樣東西</h2>
      <p class="sub" style="margin-bottom:0">只能帶一樣入睡。</p>
      <div class="cards">
        ${run.offered.map((it, i) => `
          <div class="card" data-i="${i}">
            <div class="icon">${it.icon}</div>
            <div class="name">${esc(it.name)}</div>
            <div class="desc">${esc(it.desc)}</div>
          </div>`).join('')}
      </div>
      <button class="btn" id="go" disabled>帶著它入睡</button>
    </div>`;
  const cards = [...game.ui.querySelectorAll('.card')];
  const go = game.ui.querySelector('#go');
  cards.forEach((c) => c.onclick = () => {
    cards.forEach((x) => x.classList.remove('selected'));
    c.classList.add('selected');
    run.item = run.offered[+c.dataset.i];
    go.disabled = false;
    sfx.click();
  });
  go.onclick = () => { sfx.select(); game.go('doors'); };
});

// ---------- 選門 ----------
export const doorsScene = backdropScene((game) => {
  const run = game.run;
  game.ui.innerHTML = `
    <div class="panel">
      <h2>夢裡出現了${run.doors.length === 1 ? '一扇' : run.doors.length === 2 ? '兩扇' : '三扇'}門</h2>
      <p class="sub" style="margin-bottom:0">你手上握著 ${run.item.icon} ${esc(run.item.name)}</p>
      <div class="doors">
        ${run.doors.map((s, i) => `
          <div class="door-wrap" data-i="${i}">
            <div class="door" style="--door:${s.door.color};--glow:${s.door.glow}"><div class="gap"></div></div>
            <div class="door-title">${esc(s.title)}</div>
            <div class="door-hint">${esc(s.door.hint)}</div>
          </div>`).join('')}
      </div>
      <p class="hint">門後的東西，可能怕你手上的道具，也可能不怕。</p>
    </div>`;
  game.ui.querySelectorAll('.door-wrap').forEach((d) => d.onclick = () => {
    run.story = run.doors[+d.dataset.i];
    sfx.door();
    game.go('intro');
  });
});

// ---------- 開場字幕 ----------
export const introScene = {
  enter(game) {
    const s = game.run.story;
    this.t = 0;
    this.total = s.intro.length * 1.7 + 1.6;
    game.ui.innerHTML = `
      <div class="panel" id="intro">
        ${s.intro.map((l, i) => `<div class="intro-line" style="animation-delay:${i * 1.7}s">${esc(l)}</div>`).join('')}
        <p class="hint" style="margin-top:40px">點一下跳過</p>
      </div>`;
    this.skip = () => { this.t = this.total; };
    game.ui.querySelector('#intro').onclick = this.skip;
    addEventListener('keydown', this.skip);
  },
  exit(game) { removeEventListener('keydown', this.skip); game.ui.innerHTML = ''; },
  update(game, dt) { this.t += dt; if (this.t >= this.total) game.go('dream'); },
  render(game, dt) {
    const { ctx, canvas } = game;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#020102';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },
};

// ---------- 結算 ----------
const RESULT_TITLE = { win: '醒來了', caught: '沒能醒來', timeout: '天沒有亮' };

export const resultScene = backdropScene((game) => {
  const run = game.run, s = run.story;
  game.ui.innerHTML = `
    <div class="panel">
      <h2>${RESULT_TITLE[run.result]}</h2>
      <p class="ending">${lines(s.endings[run.result])}</p>
      <p class="sub" style="margin:0 0 10px">「${esc(s.title)}」對這三樣道具的反應</p>
      <div class="reveal">
        ${run.offered.map((it, i) => {
          const e = resolveEffect(it, s);
          const chosen = it === run.item;
          return `<div class="r ${chosen ? 'chosen' : ''}" style="animation-delay:${0.4 + i * 0.35}s">
            <span class="icon">${it.icon}</span>${esc(it.name)}${chosen ? '<br><small style="opacity:.6">你帶的</small>' : '<br><small>&nbsp;</small>'}
            <br><span class="tag ${e}">${EFFECT_LABEL[e]}</span></div>`;
        }).join('')}
      </div>
      <button class="btn" id="again">再睡一次</button>
      <p class="seed">夢的編號 #${run.seed.toString(36).toUpperCase()}・用時 ${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')}</p>
    </div>`;
  game.ui.querySelector('#again').onclick = () => {
    initAudio(); sfx.select();
    game.run = createRun();
    game.go('items');
  };
});
