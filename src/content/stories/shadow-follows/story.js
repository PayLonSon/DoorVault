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
  theme: { floor: 'hospital', base: '#1a1d20', obstacle: 'bed', darkness: 0.97 },
  map: {
    width: 1200, height: 800, wall: 24,
    playerStart: { x: 100, y: 400 },
    obstacles: [
      { x: 150, y: 110, w: 70, h: 130 }, { x: 350, y: 110, w: 70, h: 130 }, { x: 550, y: 110, w: 70, h: 130 },
      { x: 750, y: 110, w: 70, h: 130 }, { x: 950, y: 110, w: 70, h: 130 },
      { x: 150, y: 560, w: 70, h: 130 }, { x: 350, y: 560, w: 70, h: 130 }, { x: 550, y: 560, w: 70, h: 130 },
      { x: 750, y: 560, w: 70, h: 130 }, { x: 950, y: 560, w: 70, h: 130 },
    ],
    targets: [{ x: 285, y: 175 }, { x: 885, y: 175 }, { x: 485, y: 625 }, { x: 1090, y: 625 }],
    notes: [
      { x: 650, y: 330, text: '影子會走你走過的路，一步也不會錯。' },
      { x: 1100, y: 300, text: '站著不動的人，會被自己的影子追上。' },
      { x: 300, y: 470, text: '奶奶說：撒一把鹽，影子就認不得路了。別拿燈照它，光會讓它長大。' },
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
