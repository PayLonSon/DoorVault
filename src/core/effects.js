// 道具效果判定：只比對標籤，新增道具或故事都不用改這裡
// 判定順序：反效果 > 無效（抗性）> 有效 > 其他一律無效
export function resolveEffect(item, story) {
  const t = story.tags;
  const has = (list) => item.tags.some((tag) => (list || []).includes(tag));
  if (has(t.provoked)) return 'provoked';
  if (has(t.immune)) return 'none';
  if (has(t.weak)) return 'effective';
  return 'none';
}

export const EFFECT_LABEL = {
  effective: '有效',
  none: '無效',
  provoked: '反效果',
};
