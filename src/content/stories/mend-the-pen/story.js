// 亡羊補牢：你補好的洞，牠會再拆開。破洞要全部同時補好才能醒來。
export const mendThePen = {
  id: 'mend-the-pen',
  idiom: '亡羊補牢',
  door: { hint: '門板上滿是抓痕，有幾道已經被木板釘住了。', color: '#3a2a18', glow: '#e0b070' },
  tags: { weak: ['holy'], immune: ['fire', 'sound'], provoked: ['reflect'] },
  intro: ['奶奶的羊圈，羊早就不見了。', '圍欄上破了好幾個洞。', '洞外，有東西在扒。'],
  tip: '你補好的洞，牠會再拆開。要全部同時補好才行。',
  objective: { label: '補上破洞', kind: 'patch', holdSeconds: 1.0 },
  theme: { floor: 'straw', base: '#1e180e', obstacle: 'hay', darkness: 0.9 },
  // 羊圈：四面是圍欄，破洞開在圍欄上；中間有乾草堆、食槽和一間小棚子
  map: {
    width: 1100, height: 800, wall: 24,
    playerStart: { x: 550, y: 700 },
    obstacles: [
      { x: 180, y: 160, w: 90, h: 60 }, { x: 780, y: 600, w: 100, h: 60 }, { x: 250, y: 560, w: 70, h: 70 },
      { x: 470, y: 330, w: 160, h: 40, type: 'crate' }, { x: 850, y: 120, w: 160, h: 130, type: 'crate' },
    ],
    decor: [{ type: 'cane', x: 1000, y: 285 }],
    targets: [
      { x: 330, y: 12, side: 'top' }, { x: 680, y: 12, side: 'top' }, { x: 1088, y: 430, side: 'right' },
      { x: 520, y: 788, side: 'bottom' }, { x: 12, y: 350, side: 'left' },
    ],
    notes: [
      { x: 600, y: 520, text: '牠會去拆你補好的地方。先補離牠遠的那個。' },
      { x: 150, y: 470, text: '奶奶在每塊木板上都貼了符，牠就不敢碰。別拿鏡子照牠。' },
      { x: 960, y: 300, kind: 'memory', text: '奶奶養的最後一隻羊叫小白。牠走丟那晚，奶奶一個人修圍欄修到天亮。' },
    ],
  },
  monster: {
    behavior: 'undo', radius: 22, start: { x: 950, y: 420 },
    prowlSpeed: 70, seekSpeed: 95, chaseSpeed: 112, detectRadius: 150, loseRadius: 300,
    tearTime: 2.4, speedPerObjective: 6, enragedSpeed: 168, fearOnHit: 24,
  },
  messages: {
    effective: '牠看見符紙，夾著尾巴退開了。', none: '牠毫無反應。', provoked: '牠看見鏡子裡的自己，發狂了！',
    toggleProvoked: '牠發狂了！',
    undo: '有一塊木板被扯開了！',
    progress: ['木板釘上了。', '扒門的聲音，換了一個方向。', '只剩最後一個洞。'],
  },
  endings: {
    win: '最後一塊木板釘上，扒門的聲音停了。\n你醒來，聽見窗外有羊在叫。\n可是奶奶的羊圈，早就拆掉了。',
    caught: '圍欄倒了。\n你終於知道，羊是怎麼不見的。',
    timeout: '洞越來越多，你補不完。\n天亮時，圍欄裡什麼也不剩。',
  },
  fragment: '大人們說，現在才後悔已經太晚了。可是奶奶說過，羊跑了，補牢也還來得及。',
};
