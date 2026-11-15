import { createRng, newSeed } from './rng.js';
import { resolveEffect } from './effects.js';
import { ITEMS } from '../content/items.js';
import { STORIES } from '../content/stories/index.js';

// 一局的所有狀態都只存在記憶體裡，關掉頁面就消失（不存檔）
export function createRun(seed = newSeed()) {
  const rng = createRng(seed);

  // 抽門：最多三扇
  const doors = rng.shuffle(STORIES).slice(0, Math.min(3, STORIES.length));

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
  };
}
