// 守口如瓶：怪物看不見，只聽得見。撿回四把鑰匙才能醒來。
export const sealedLips = {
  id: 'sealed-lips',
  idiom: '守口如瓶',
  door: { hint: '門後一點聲音都沒有，安靜得像在屏住呼吸。', color: '#1f2630', glow: '#9fb6d6' },
  tags: { weak: ['smoke', 'holy'], immune: ['light', 'reflect'], provoked: ['sound'] },
  intro: ['客廳很暗，大人們在低聲說話。', '有個東西，聽得見你的每一步。', '輕一點。再輕一點。'],
  tip: '輕推搖桿慢慢走，牠就聽不見（電腦：按住 Shift）',
  objective: { label: '撿回鑰匙', kind: 'key', holdSeconds: 0.5 },
  timeLimit: 180,
  theme: { floor: 'tiles', base: '#171b20', obstacle: 'furniture', darkness: 0.97 },
  map: {
    width: 1200, height: 800, wall: 24,
    playerStart: { x: 600, y: 700 },
    obstacles: [
      { x: 400, y: 24, w: 24, h: 300, wall: true }, { x: 400, y: 440, w: 24, h: 336, wall: true },
      { x: 780, y: 24, w: 24, h: 220, wall: true }, { x: 780, y: 360, w: 24, h: 416, wall: true },
      { x: 520, y: 540, w: 160, h: 60 }, { x: 180, y: 150, w: 110, h: 70 },
      { x: 900, y: 600, w: 180, h: 40 }, { x: 960, y: 110, w: 140, h: 90 },
    ],
    targets: [{ x: 120, y: 700 }, { x: 600, y: 120 }, { x: 1100, y: 460 }, { x: 300, y: 420 }],
    notes: [
      { x: 560, y: 380, text: '牠沒有眼睛。牠只用聽的。' },
      { x: 200, y: 280, text: '跑步的聲音，牠在屋子另一頭都聽得見。' },
      { x: 1000, y: 330, text: '媽媽點香的時候，牠就不見了。可是千萬別出聲。' },
    ],
  },
  monster: {
    behavior: 'blind', radius: 22, start: { x: 1000, y: 300 },
    wanderSpeed: 50, huntSpeed: 128, speedPerObjective: 8, enragedSpeed: 165, fearOnHit: 26,
  },
  messages: {
    effective: '牠摀住耳朵，退回黑暗裡。', none: '牠毫無反應。', provoked: '牠聽見了，正朝你衝過來！',
    toggleProvoked: '牠聽見了！',
    progress: ['鑰匙碰出了一聲輕響。', '牠在附近停了下來。', '只剩最後一把。'],
  },
  endings: {
    win: '第四把鑰匙轉開了房門。\n你躲進被子裡，聽見門外有人小聲說：\n「先別告訴孩子。」',
    caught: '你忍不住叫出聲。\n黑暗裡，有一張沒有眼睛的臉，慢慢轉向你。',
    timeout: '天亮了，可是沒有人來叫你起床。\n屋子安靜得可怕。',
  },
  fragment: '大人們說，這件事不能讓我知道。我一直假裝沒聽見。',
};
