// 如影隨形：影子會一步不差地走你走過的路。點亮四根蠟燭才能醒來。
export const shadowFollows = {
  id: 'shadow-follows',
  idiom: '如影隨形',
  door: { hint: '門上的影子，比門本身還要長一點。', color: '#2a2a2e', glow: '#d8d0ff' },
  tags: { weak: ['salt', 'holy'], immune: ['sound', 'smoke'], provoked: ['light', 'reflect'] },
  intro: ['醫院的走廊很長，燈全滅了。', '你走一步，後面也響一步。', '回頭看，地上有兩個影子。'],
  tip: '影子會走你走過的路。不要停太久。',
  objective: { label: '點亮蠟燭', kind: 'candle', holdSeconds: 1.1 },
  timeLimit: 150,
  theme: { floor: 'hospital', base: '#1a1d20', obstacle: 'bed', darkness: 0.9 },
  // 醫院的長廊：你從中間出發，兩頭都得去。回頭時不換一條路，就會撞上自己的影子
  map: {
    width: 1800, height: 460, wall: 24,
    playerStart: { x: 950, y: 230 },
    obstacles: [
      { x: 260, y: 205, w: 240, h: 50, type: 'bench' }, { x: 640, y: 205, w: 240, h: 50, type: 'bench' },
      { x: 1020, y: 205, w: 240, h: 50, type: 'bench' }, { x: 1400, y: 205, w: 240, h: 50, type: 'bench' },
      { x: 1690, y: 50, w: 70, h: 130, type: 'bed' },
    ],
    decor: [{ type: 'cane', x: 1672, y: 120 }, { type: 'doors', y: 24, w: 1600 }],
    targets: [{ x: 150, y: 330 }, { x: 570, y: 100 }, { x: 1330, y: 330 }, { x: 1700, y: 300 }],
    notes: [
      { x: 980, y: 100, text: '影子會走你走過的路，一步也不會錯。回頭的時候，換一條路走。' },
      { x: 760, y: 360, text: '奶奶說：撒一把鹽，影子就認不得路了。別拿燈照它，光會讓它長大。' },
      { x: 1600, y: 340, kind: 'memory', text: '走廊盡頭是奶奶的病房。那天我走得很慢，因為我知道，走到了就要說再見。' },
    ],
  },
  monster: {
    behavior: 'trail', radius: 13, delay: 4.2, delayPerObjective: 0.6, minDelay: 1.6, fearOnHit: 24,
  },
  messages: {
    effective: '影子愣住了，認不得路。', none: '影子毫無反應。', provoked: '光一照，影子貼得更近了！',
    toggleProvoked: '光一照，影子貼得更近了！',
    progress: ['燭光亮起，影子退了一步。', '影子的腳步，跟得更緊了。', '只剩最後一根。'],
  },
  endings: {
    win: '四根蠟燭都亮了，影子無處可躲。\n你醒來時，看見床邊的地上有兩個影子。\n可是房間裡，只有你一個人。',
    caught: '影子踩上了你的腳跟。\n從今以後，走在前面的，是它。',
    timeout: '蠟燭燒完了。\n黑暗裡，你分不清哪一個才是自己。',
  },
  fragment: '醫院走廊的燈很亮。我的影子，一直跟在奶奶的病床後面。',
};
