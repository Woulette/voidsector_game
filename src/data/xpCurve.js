export const XP_CURVE_VERSION = 4;

const XP_FIXED_NEXT_BY_LEVEL = {
  1:3000,
  2:12000,
  3:35000,
  4:51000,
  5:80000,
  6:113000,
  7:169000,
  8:220000,
  9:314000,
  10:580000,
  11:984000,
  12:1432000,
  13:1899000
};

const XP_FIXED_LAST_LEVEL = 13;
const XP_TARGET_LEVEL = 49;
const XP_TARGET_NEXT = 2000000000;
const XP_GROWTH_AFTER_FIXED = Math.pow(
  XP_TARGET_NEXT / XP_FIXED_NEXT_BY_LEVEL[XP_FIXED_LAST_LEVEL],
  1 / (XP_TARGET_LEVEL - XP_FIXED_LAST_LEVEL)
);

export function getXpNextForLevel(level = 1){
  const targetLevel = Math.max(1, Math.floor(Number(level || 1)));
  if(XP_FIXED_NEXT_BY_LEVEL[targetLevel]) return XP_FIXED_NEXT_BY_LEVEL[targetLevel];
  return Math.round(
    XP_FIXED_NEXT_BY_LEVEL[XP_FIXED_LAST_LEVEL]
      * Math.pow(XP_GROWTH_AFTER_FIXED, targetLevel - XP_FIXED_LAST_LEVEL)
  );
}
