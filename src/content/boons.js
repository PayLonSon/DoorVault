// 成長：每過一扇門三選一。只在這一晚有效，不存檔。
const W = (inner) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const BOONS = [
  { id: 'quiet', name: '腳步輕', desc: '走路的聲音變小，牠更難聽見你。',
    icon: W('<path d="M7 20c-2-3-2-7 0-9s3-5 2-7M13 20c-2-3-1-6 1-8s2-4 1-6"/><path d="M18 9l3 3M21 9l-3 3"/>'),
    apply: (run) => { run.mods.noise *= 0.6; } },
  { id: 'swift', name: '腿變快', desc: '移動速度提高。',
    icon: W('<path d="M4 18l5-5 3 3 7-9"/><path d="M15 7h4v4"/>'),
    apply: (run) => { run.mods.speed *= 1.12; } },
  { id: 'eyes', name: '眼睛亮', desc: '在黑暗裡看得更遠。',
    icon: W('<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>'),
    apply: (run) => { run.mods.light += 32; } },
  { id: 'steady', name: '手變穩', desc: '按住互動所需的時間縮短。',
    icon: W('<path d="M8 12V5.5a1.5 1.5 0 013 0V11M11 10V4.5a1.5 1.5 0 013 0V11M14 11V6.5a1.5 1.5 0 013 0V15c0 3-2 5-5 5s-4-1-6-4l-1.5-3a1.5 1.5 0 012.6-1.4L8 13"/>'),
    apply: (run) => { run.mods.hold *= 0.72; } },
  { id: 'brave', name: '膽子大', desc: '恐懼累積得比較慢。',
    icon: W('<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>'),
    apply: (run) => { run.mods.fearRate *= 0.78; } },
  { id: 'breath', name: '深呼吸', desc: '立刻讓恐懼降低一大截。',
    icon: W('<path d="M3 9h10a3 3 0 10-3-3M3 14h14a3 3 0 11-3 3M3 11.5h7"/>'),
    apply: (run) => { run.fear = Math.max(0, run.fear - 35); } },
  { id: 'spare', name: '多帶一份', desc: '道具可以多用兩次。', needsUses: true,
    icon: W('<rect x="4" y="8" width="16" height="12" rx="1.5"/><path d="M9 8V6a3 3 0 016 0v2M12 12v4M10 14h4"/>'),
    apply: (run) => { run.itemUses += 2; run.itemMax += 2; } },
];
