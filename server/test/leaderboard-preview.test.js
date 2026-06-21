import assert from "node:assert/strict";
import test from "node:test";
import { getLeaderboardPreviewRows } from "../../src/ui/leaderboardPreview.js";

test("leaderboard preview displays only the first ten players", ()=>{
  const rows = Array.from({length:158}, (_, index)=>({position:index + 1}));
  const preview = getLeaderboardPreviewRows(rows);

  assert.equal(preview.length, 10);
  assert.deepEqual(preview.map(row=>row.position), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(rows.length, 158);
});
