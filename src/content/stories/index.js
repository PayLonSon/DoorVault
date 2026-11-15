// 故事清單：新增故事時在這裡加一行 import，並放進 STORIES
import { mothToFlame } from './moth-to-flame/story.js';
import { snakeInCup } from './snake-in-cup/story.js';
import { sealedLips } from './sealed-lips/story.js';
import { shadowFollows } from './shadow-follows/story.js';
import { intoTheUrn } from './into-the-urn/story.js';

export const STORIES = [mothToFlame, snakeInCup, sealedLips, shadowFollows, intoTheUrn];

// 五個故事都醒來後才會看到的隱藏結局
export const SECRET_ENDING = '五扇門都關上了。\n你終於想起來，教你這些成語的人，已經不在了。\n可是今晚，床邊那張空椅子上，\n有人替你把被子蓋好了。';
