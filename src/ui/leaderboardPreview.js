export const LEADERBOARD_PREVIEW_SIZE = 10;

export function getLeaderboardPreviewRows(rows = [], limit = LEADERBOARD_PREVIEW_SIZE){
  return (Array.isArray(rows) ? rows : []).slice(0, Math.max(0, Number(limit || 0)));
}
