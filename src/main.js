import { createInput } from './core/input.js';
import { titleScene, itemsScene, doorsScene, introScene, resultScene } from './scenes/menus.js';
import { dreamScene } from './scenes/dream.js';
import { isTouchDevice } from './core/input.js';

// 流程：標題 → 選道具 → 選門 → 開場 → 夢境 → 結算 → 再睡一次
const SCENES = {
  title: titleScene,
  items: itemsScene,
  doors: doorsScene,
  intro: introScene,
  dream: dreamScene,
  result: resultScene,
};

const canvas = document.getElementById('game');
const game = {
  canvas,
  ctx: canvas.getContext('2d'),
  ui: document.getElementById('ui'),
  input: createInput(),
  run: null,
  scene: null,
  dpr: 1,
  go(name, ...args) {
    if (this.scene) this.scene.exit(this);
    this.scene = SCENES[name];
    this.scene.enter(this, ...args);
  },
  // 依螢幕大小決定一次看得到多大的範圍（手機直式、橫式、電腦都可玩）
  worldScale() {
    const w = innerWidth, h = innerHeight;
    // 手機拉近一點，角色和怪物比較看得清楚
    const near = isTouchDevice() ? 320 : 380;
    return Math.min(Math.max(w, h) / (isTouchDevice() ? 760 : 900), Math.min(w, h) / near) * this.dpr;
  },
};

function resize() {
  game.dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * game.dpr);
  canvas.height = Math.floor(innerHeight * game.dpr);
}
addEventListener('resize', resize);
resize();

// 切到別的 App、鎖螢幕時自動暫停
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.scene?.pause?.(game);
});
// iOS 會在雙擊時放大畫面，這裡擋掉
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd < 300 && !e.target.closest('button, .card, .door-wrap')) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.scene.update(game, dt);
  game.scene.render(game, dt);
  requestAnimationFrame(frame);
}

game.go('title');
window.__game = game; // 除錯用：可在瀏覽器主控台查看狀態
requestAnimationFrame(frame);
