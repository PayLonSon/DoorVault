import { createRng, newSeed } from './rng.js';
import { resolveEffect } from './effects.js';
import { ITEMS } from '../content/items.js';
import { STORIES } from '../content/stories/index.js';

// 今晚（這次打開頁面）做過的夢。只存在記憶體，重新整理就清空，不算存檔
export const session = {
  runs: 0,
  seen: new Set(),      // 打開過的門
  woke: new Set(),      // 成功醒來的故事
  fragments: [],        // 收集到的記憶碎片（依取得順序）
};

// 一局的所有狀態都只存在記憶體裡，關掉頁面就消失（不存檔）
export function createRun(seed = newSeed()) {
  const rng = createRng(seed);

  // 抽門：最多三扇
  const shuffled = rng.shuffle(STORIES);
  const doors = shuffled.slice(0, Math.min(3, STORIES.length));
  // 至少放一扇今晚還沒打開過的門（新鮮感）
  const unseen = shuffled.slice(3).find((st) => !session.seen.has(st.id));
  if (unseen && doors.every((st) => session.seen.has(st.id))) doors[rng.int(0, doors.length - 1)] = unseen;

  // 抽道具：三個，保證至少一個對其中一扇門有效
  let offered = rng.shuffle(ITEMS).slice(0, 3);
  const helps = (item) => doors.some((s) => resolveEffect(item, s) === 'effective');
  if (!offered.some(helps)) {
    const good = rng.shuffle(ITEMS.filter(helps))[0];
    if (good) offered[rng.int(0, 2)] = good;
  }

  return {
    seed,
    rng,
    offered,
    doors,
    item: null,      // 玩家選的道具
    story: null,     // 玩家選的門
    usedItem: false,
    result: null,    // 'win' | 'caught' | 'timeout'
    elapsed: 0,
    progress: 0,     // 完成了幾個目標
    need: 0,         // 需要完成幾個
  };
}
