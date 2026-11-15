// 故事清單：新增故事時在這裡加一行 import，並放進 STORIES
import { mothToFlame } from './moth-to-flame/story.js';
import { snakeInCup } from './snake-in-cup/story.js';
import { sealedLips } from './sealed-lips/story.js';
import { shadowFollows } from './shadow-follows/story.js';
import { intoTheUrn } from './into-the-urn/story.js';
import { everyBush } from './every-bush/story.js';
import { mendThePen } from './mend-the-pen/story.js';
import { longNight } from './long-night/story.js';
import { dragonEyes } from './dragon-eyes/story.js';
import { mirrorMoon } from './mirror-moon/story.js';

export const STORIES = [
  mothToFlame, snakeInCup, sealedLips, shadowFollows, intoTheUrn,
  everyBush, mendThePen, longNight, dragonEyes, mirrorMoon,
];

// 所有故事都走出來後才會看到的隱藏結局
export const SECRET_ENDING = '所有的門都關上了。\n你終於想起來，教你這些成語的人，已經不在了。\n可是今晚，床邊那張空椅子上，\n有人替你把被子蓋好了。';
