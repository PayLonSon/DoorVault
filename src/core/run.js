import { createRng, newSeed } from './rng.js';
import { resolveEffect } from './effects.js';
import { ITEMS } from '../content/items.js';
import { STORIES } from '../content/stories/index.js';
import { BOONS } from '../content/boons.js';

export const NIGHT_SECONDS = 300;   // 一晚只有五分鐘，三扇門共用
export const DOORS_PER_NIGHT = 3;

// 今晚（這次打開頁面）做過的夢。只存在記憶體，重新整理就清空，不算存檔
export const session = {
  nights: 0,
  runs: 0,
  seen: new Set(),      // 打開過的門
  woke: new Set(),      // 成功走出來的故事
  fragments: [],        // 收集到的記憶碎片（依取得順序）
};

// 一晚的所有狀態都只存在記憶體裡，關掉頁面就消失（不存檔）
export function createRun(seed = newSeed()) {
  const rng = createRng(seed);
  const run = {
    seed, rng,
    depth: 0,            // 正在第幾扇門（0 起算）
    played: [],          // 這一晚已經走出來的故事
    doors: [], offered: [],
    item: null, itemUses: null, story: null,
    fear: 0,             // 恐懼會帶到下一扇門
    nightLeft: NIGHT_SECONDS,
    boons: [],
    mods: { speed: 1, light: 0, noise: 1, hold: 1, fearRate: 1 },
    memories: 0,
    usedItem: false, result: null, elapsed: 0, progress: 0, need: 0,
  };
  session.nights++;
  drawDoors(run);

  // 抽道具：三個，保證至少一個對第一輪的其中一扇門有效
  const offered = rng.shuffle(ITEMS).slice(0, 3);
  const helps = (item) => run.doors.some((s) => resolveEffect(item, s) === 'effective');
  if (!offered.some(helps)) {
    const good = rng.shuffle(ITEMS.filter(helps))[0];
    if (good) offered[rng.int(0, 2)] = good;
  }
  run.offered = offered;
  return run;
}

// 從這一晚還沒走過的故事裡抽最多三扇門
export function drawDoors(run) {
  const pool = run.rng.shuffle(STORIES.filter((s) => !run.played.includes(s.id)));
  const doors = pool.slice(0, 3);
  const unseen = pool.slice(3).find((st) => !session.seen.has(st.id));
  if (unseen && doors.every((st) => session.seen.has(st.id))) doors[run.rng.int(0, doors.length - 1)] = unseen;
  run.doors = doors;
}

export function chooseItem(run, item) {
  run.item = item;
  run.itemUses = item.uses ?? Infinity;
  run.itemMax = run.itemUses;
}

export function offerBoons(run) {
  const pool = BOONS.filter((b) => !(b.needsUses && run.item.kind === 'toggle'));
  return run.rng.shuffle(pool).slice(0, 3);
}

export function applyBoon(run, boon) {
  run.boons.push(boon);
  boon.apply(run);
}
