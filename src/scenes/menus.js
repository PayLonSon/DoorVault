import { drawBackdrop } from '../world/backdrop.js';
import { createRun, session, drawDoors, chooseItem, offerBoons, applyBoon, DOORS_PER_NIGHT } from '../core/run.js';
import { STORIES, SECRET_ENDING } from '../content/stories/index.js';
import { initAudio, sfx } from '../core/audio.js';
import { resolveEffect, EFFECT_LABEL } from '../core/effects.js';
import { isTouchDevice } from '../core/input.js';
import { openHowto } from '../ui/howto.js';

// 流程：標題 → 選道具 → [選門 → 開場 → 夢境 → 選成長] ×3 → 結算
// 一晚要連過三扇門才算真正醒來，三扇門共用五分鐘。

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lines = (s) => esc(s).replace(/\n/g, '<br>');
const clock = (t) => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0')}`;
const NUM = ['一', '二', '三'];

function backdropScene(build) {
  return {
    enter(game, ...args) { game.ui.innerHTML = ''; build(game, ...args); },
    exit(game) { game.ui.innerHTML = ''; },
    update() {},
    render(game, dt) { drawBackdrop(game.ctx, game.canvas.width, game.canvas.height, dt); },
  };
}

// 今晚做過的夢：成語一字排開，沒打開過的顯示「？？？？」（只存在記憶體，重新整理就清空）
function dreamLog() {
  if (session.runs === 0) return '';
  return `<div class="log">${STORIES.map((st) => {
    const cls = session.woke.has(st.id) ? 'woke' : session.seen.has(st.id) ? 'seen' : '';
    return `<span class="${cls}">${cls ? esc(st.idiom) : '？？？？'}</span>`;
  }).join('')}</div>
  <p class="log-count">今晚走出過 ${session.woke.size}/${STORIES.length} 個夢</p>`;
}

// 三扇門的進度：走過的、正在走的、還沒到的
function steps(run, failed = false) {
  const cells = [];
  for (let i = 0; i < DOORS_PER_NIGHT; i++) {
    const st = STORIES.find((s) => s.id === run.played[i]);
    const now = i === run.played.length && run.story && (failed || i === run.depth);
    cells.push(`<span class="${st ? 'done' : now ? 'now' : ''}">${st ? esc(st.idiom) : now && failed ? esc(run.story.idiom) : `第${NUM[i]}扇`}</span>`);
  }
  return `<div class="steps">${cells.join('')}</div>`;
}

const boonList = (run) => (run.boons.length
  ? `<p class="boon-list">${run.boons.map((b) => `${b.icon} ${esc(b.name)}`).join('　')}</p>` : '');

const canFullscreen = () => isTouchDevice() && !!document.documentElement.requestFullscreen
  && document.fullscreenEnabled && !matchMedia('(display-mode: standalone)').matches;

function newNight(game) {
  initAudio(); sfx.select();
  game.run = createRun();
  game.go('items');
}

// ---------- 標題 ----------
export const titleScene = backdropScene((game) => {
  const controls = isTouchDevice()
    ? '左邊拖曳移動（輕推是靜步）・右邊按住「互動」・點道具鍵使用'
    : 'WASD／方向鍵移動・Shift 慢走・按住空白鍵互動・E 使用道具';
  game.ui.innerHTML = `
    <div class="panel">
      <h1>三扇門</h1>
      <p class="sub">閉上眼睛。<br>天亮之前，走過三扇門，才能真正醒來。</p>
      <button class="btn" id="start">入睡</button>
      <br><button class="btn ghost" id="howto-open">怎麼玩</button>${canFullscreen() ? ' <button class="btn ghost" id="fs">全螢幕</button>' : ''}
      <p class="hint">${controls}<br>一晚只有五分鐘・建議戴耳機${isTouchDevice() ? '・iPhone 請關掉靜音開關才聽得到聲音' : ''}</p>
    </div>`;
  const fs = game.ui.querySelector('#fs');
  if (fs) fs.onclick = () => {
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (e) { /* 略過 */ }
  };
  game.ui.querySelector('#start').onclick = () => newNight(game);
  game.ui.querySelector('#howto-open').onclick = () => { initAudio(); sfx.click(); openHowto(); };
});

// ---------- 選道具（3 選 1） ----------
export const itemsScene = backdropScene((game) => {
  const run = game.run;
  game.ui.innerHTML = `
    <div class="panel">
      <h2>床邊有三樣東西</h2>
      <p class="sub" style="margin-bottom:0">只能帶一樣，陪你走完三扇門。${session.nights > 1 ? `<br>今晚第 ${session.nights} 次入睡。` : ''}</p>
      <div class="cards">
        ${run.offered.map((it, i) => `
          <div class="card" data-i="${i}">
            <div class="icon">${it.icon}</div>
            <div class="name">${esc(it.name)}</div>
            <div class="desc">${esc(it.desc)}</div>
          </div>`).join('')}
      </div>
      <button class="btn" id="go" disabled>帶著它入睡</button>
      <p class="hint"><a href="#" id="howto-items" class="howto-link">不知道怎麼選？看玩法</a></p>
    </div>`;
  const cards = [...game.ui.querySelectorAll('.card')];
  const go = game.ui.querySelector('#go');
  cards.forEach((c) => c.onclick = () => {
    cards.forEach((x) => x.classList.remove('selected'));
    c.classList.add('selected');
    chooseItem(run, run.offered[+c.dataset.i]);
    go.disabled = false;
    sfx.click();
  });
  go.onclick = () => { sfx.select(); game.go('doors'); };
  game.ui.querySelector('#howto-items').onclick = (e) => { e.preventDefault(); openHowto(); };
});

// ---------- 選門 ----------
export const doorsScene = backdropScene((game) => {
  const run = game.run;
  run.story = null;
  game.ui.innerHTML = `
    <div class="panel">
      <p class="night">離天亮還有 ${clock(run.nightLeft)}</p>
      <h2>第${NUM[run.depth]}扇門</h2>
      ${steps(run)}
      <p class="sub" style="margin:0">你手上握著 ${run.item.icon} ${esc(run.item.name)}</p>
      <div class="doors">
        ${run.doors.map((s, i) => `
          <div class="door-wrap" data-i="${i}">
            <div class="door" style="--door:${s.door.color};--glow:${s.door.glow}">
              <div class="plaque">${esc(s.idiom)}</div><div class="gap"></div>
              ${session.woke.has(s.id) ? '<div class="stamp">走過</div>' : ''}
            </div>
            <div class="door-hint">${esc(s.door.hint)}</div>
          </div>`).join('')}
      </div>
      ${boonList(run)}
      <p class="hint">門後的東西，可能怕你手上的道具，也可能不怕。${run.depth ? '越裡面的門，越難走出來。' : ''}</p>
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
    this.total = s.intro.length * 1.3 + 1.8;
    game.ui.innerHTML = `
      <div class="panel" id="intro">
        <div class="intro-idiom">${esc(s.idiom)}</div>
        ${s.intro.map((l, i) => `<div class="intro-line" style="animation-delay:${0.6 + i * 1.3}s">${esc(l)}</div>`).join('')}
        <p class="hint" style="margin-top:40px">點一下跳過</p>
      </div>`;
    this.skip = () => { this.t = this.total; };
    game.ui.querySelector('#intro').onclick = this.skip;
    addEventListener('keydown', this.skip);
  },
  exit(game) { removeEventListener('keydown', this.skip); game.ui.innerHTML = ''; },
  update(game, dt) { this.t += dt; if (this.t >= this.total) game.go('dream'); },
  render(game) {
    const { ctx, canvas } = game;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#020102';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },
};

// ---------- 過門之後：三選一成長 ----------
export const boonScene = backdropScene((game) => {
  const run = game.run, s = run.story;
  const options = offerBoons(run);
  const fragIndex = session.fragments.indexOf(s.fragment);
  game.ui.innerHTML = `
    <div class="panel">
      <p class="night">離天亮還有 ${clock(run.nightLeft)}</p>
      <h2>門在身後關上了</h2>
      ${steps(run)}
      <div class="fragment"><small>記憶碎片 ${fragIndex + 1}／${STORIES.length}</small>${esc(s.fragment)}</div>
      <p class="sub" style="margin:0">走出來的你，有一點不一樣了。選一樣：</p>
      <div class="cards">
        ${options.map((b, i) => `
          <div class="card boon" data-i="${i}">
            <div class="icon">${b.icon}</div>
            <div class="name">${esc(b.name)}</div>
            <div class="desc">${esc(b.desc)}</div>
          </div>`).join('')}
      </div>
      ${boonList(run)}
    </div>`;
  game.ui.querySelectorAll('.card').forEach((c) => c.onclick = () => {
    applyBoon(run, options[+c.dataset.i]);
    sfx.select();
    run.depth++;
    drawDoors(run);
    game.go('doors');
  });
});

// ---------- 結算 ----------
const RESULT_TITLE = { win: '真正醒來了', caught: '驚醒', timeout: '天亮了，你還沒醒' };

export const resultScene = backdropScene((game) => {
  const run = game.run, s = run.story;
  const win = run.result === 'win';
  const effects = run.offered.map((it) => ({ it, e: resolveEffect(it, s) }));
  // 差一點：失敗時顯示離醒來有多近（接近成功的失敗最讓人想再試一次）
  const passed = run.played.length;
  const pct = ((passed + (run.need ? run.progress / run.need : 0)) / DOORS_PER_NIGHT) * 100;
  const lastStep = passed === DOORS_PER_NIGHT - 1 && run.need - run.progress <= 1;
  const near = win ? '' : `
    <div class="near"><div class="near-bar"><i style="width:${pct}%"></i></div>
    <span>${lastStep ? '只差最後一步就真正醒來了' : `倒在第${NUM[passed]}扇門（${run.progress}/${run.need}）`}</span></div>`;
  // 如果當初：揭曉你沒帶的那樣道具其實對這扇門有效
  const better = effects.find((x) => x.it !== run.item && x.e === 'effective');
  const mine = effects.find((x) => x.it === run.item);
  const ifOnly = !win && better && mine.e !== 'effective'
    ? `<p class="ifonly">如果當初帶的是 ${better.it.icon} ${esc(better.it.name)}……</p>` : '';
  // 記憶碎片：這一晚走出來的每一扇門各一片
  const fragments = run.played.map((id) => {
    const st = STORIES.find((x) => x.id === id);
    return `<div class="fragment"><small>記憶碎片 ${session.fragments.indexOf(st.fragment) + 1}／${STORIES.length}・${esc(st.idiom)}</small>${esc(st.fragment)}</div>`;
  }).join('');
  const secret = win && session.woke.size === STORIES.length ? `<div class="secret">${lines(SECRET_ENDING)}</div>` : '';

  game.ui.innerHTML = `
    <div class="panel">
      <div class="result-idiom">${esc(s.idiom)}</div>
      <h2>${RESULT_TITLE[run.result]}</h2>
      ${steps(run, !win)}
      <p class="ending">${lines(s.endings[run.result])}</p>
      ${near}${win ? fragments : ''}${secret}
      <p class="sub" style="margin:0 0 10px">「${esc(s.idiom)}」對這三樣道具的反應</p>
      <div class="reveal">
        ${effects.map(({ it, e }, i) => {
          const chosen = it === run.item;
          return `<div class="r ${chosen ? 'chosen' : ''}" style="animation-delay:${0.3 + i * 0.3}s">
            <span class="icon">${it.icon}</span>${esc(it.name)}${chosen ? '<br><small style="opacity:.6">你帶的</small>' : '<br><small>&nbsp;</small>'}
            <br><span class="tag ${e}">${EFFECT_LABEL[e]}</span></div>`;
        }).join('')}
      </div>
      ${ifOnly}
      ${boonList(run)}
      <button class="btn" id="again">再睡一次</button>
      ${win ? '' : fragments}
      ${dreamLog()}
      <p class="seed">夢的編號 #${run.seed.toString(36).toUpperCase()}・用時 ${clock(run.elapsed)}</p>
    </div>`;
  game.ui.querySelector('#again').onclick = () => newNight(game);
});
