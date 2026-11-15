import { drawBackdrop } from '../world/backdrop.js';
import { createRun, session } from '../core/run.js';
import { STORIES, SECRET_ENDING } from '../content/stories/index.js';
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

// 今晚做過的夢：成語一字排開，沒打開過的顯示「？？？？」（只存在記憶體，重新整理就清空）
function dreamLog() {
  if (session.runs === 0) return '';
  return `<div class="log">${STORIES.map((st) => {
    const cls = session.woke.has(st.id) ? 'woke' : session.seen.has(st.id) ? 'seen' : '';
    return `<span class="${cls}">${cls ? esc(st.idiom) : '？？？？'}</span>`;
  }).join('')}</div>
  <p class="log-count">今晚醒來過 ${session.woke.size}/${STORIES.length} 場夢</p>`;
}

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
      <p class="sub" style="margin-bottom:0">只能帶一樣入睡。${session.runs ? `<br>今晚的第 ${session.runs + 1} 場夢。` : ''}</p>
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
      <h2>夢裡出現了${['', '一', '兩', '三'][run.doors.length]}扇門</h2>
      <p class="sub" style="margin-bottom:0">你手上握著 ${run.item.icon} ${esc(run.item.name)}</p>
      <div class="doors">
        ${run.doors.map((s, i) => `
          <div class="door-wrap" data-i="${i}">
            <div class="door" style="--door:${s.door.color};--glow:${s.door.glow}">
              <div class="plaque">${esc(s.idiom)}</div><div class="gap"></div>
              ${session.woke.has(s.id) ? '<div class="stamp">醒過</div>' : ''}
            </div>
            <div class="door-hint">${esc(s.door.hint)}</div>
          </div>`).join('')}
      </div>
      <p class="hint">門後的東西，可能怕你手上的道具，也可能不怕。</p>
      ${dreamLog()}
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
    this.total = s.intro.length * 1.6 + 2.2;
    game.ui.innerHTML = `
      <div class="panel" id="intro">
        <div class="intro-idiom">${esc(s.idiom)}</div>
        ${s.intro.map((l, i) => `<div class="intro-line" style="animation-delay:${0.8 + i * 1.6}s">${esc(l)}</div>`).join('')}
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
  const win = run.result === 'win';
  const effects = run.offered.map((it) => ({ it, e: resolveEffect(it, s) }));
  // 差一點：失敗時顯示離醒來有多近（接近成功的失敗最讓人想再試一次）
  const near = !win && run.need ? `
    <div class="near"><div class="near-bar"><i style="width:${(run.progress / run.need) * 100}%"></i></div>
    <span>${run.need - run.progress <= 1 ? '只差一步就醒來了' : `離醒來還差 ${run.need - run.progress} 步`}（${run.progress}/${run.need}）</span></div>` : '';
  // 如果當初：揭曉你沒帶的那樣道具其實有效
  const better = effects.find((x) => x.it !== run.item && x.e === 'effective');
  const mine = effects.find((x) => x.it === run.item);
  const ifOnly = better && mine.e !== 'effective'
    ? `<p class="ifonly">如果當初帶的是 ${better.it.icon} ${esc(better.it.name)}……</p>` : '';
  // 記憶碎片：醒來才拿得到，五片拼起來是完整的故事
  const fragIndex = session.fragments.indexOf(s.fragment);
  const fragment = win ? `
    <div class="fragment"><small>記憶碎片 ${fragIndex + 1}／${STORIES.length}</small>${esc(s.fragment)}</div>` : '';
  const secret = win && session.woke.size === STORIES.length ? `<div class="secret">${lines(SECRET_ENDING)}</div>` : '';

  game.ui.innerHTML = `
    <div class="panel">
      <div class="result-idiom">${esc(s.idiom)}</div>
      <h2>${RESULT_TITLE[run.result]}</h2>
      <p class="ending">${lines(s.endings[run.result])}</p>
      ${near}${fragment}${secret}
      <div class="reveal">
        ${effects.map(({ it, e }, i) => {
          const chosen = it === run.item;
          return `<div class="r ${chosen ? 'chosen' : ''}" style="animation-delay:${0.3 + i * 0.3}s">
            <span class="icon">${it.icon}</span>${esc(it.name)}${chosen ? '<br><small style="opacity:.6">你帶的</small>' : '<br><small>&nbsp;</small>'}
            <br><span class="tag ${e}">${EFFECT_LABEL[e]}</span></div>`;
        }).join('')}
      </div>
      ${ifOnly}
      <button class="btn" id="again">再睡一次</button>
      ${dreamLog()}
      <p class="seed">夢的編號 #${run.seed.toString(36).toUpperCase()}・用時 ${Math.floor(run.elapsed / 60)}:${String(Math.floor(run.elapsed % 60)).padStart(2, '0')}</p>
    </div>`;
  game.ui.querySelector('#again').onclick = () => {
    initAudio(); sfx.select();
    game.run = createRun();
    game.go('items');
  };
});
