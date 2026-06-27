import assert from "node:assert/strict";
import test from "node:test";
import { renderCombatFirmPanel } from "../../src/game/ui/combatFirmPanel.js";

function firmSnapshot(){
  const now = Date.now();
  return {
    seasonEndsAt:now + 86_400_000,
    collectiveMinimumContribution:10_000,
    individualPlayerCount:100,
    firms:[
      {id:"astra", label:"Astra", rank:1, points:1_200, color:"#ef4444", collectiveReward:{boxes:{mythic:1}}},
      {id:"cyan", label:"Cygnus", rank:2, points:900, color:"#22d3ee"},
      {id:"jaune", label:"Solarys", rank:3, points:600, color:"#facc15"},
      {id:"verte", label:"Verdantis", rank:4, points:300, color:"#22c55e"}
    ],
    individualRanking:[
      {key:"pilot-1", name:"Pilote 1", firmId:"astra", rank:1, points:20_000, rewardLabel:"Top 1"}
    ],
    dailyQuests:[
      {
        id:"daily-orbs",
        kind:"daily",
        label:"Chasse aux orbes",
        target:"sentinel_orb",
        targetLabel:"Orbes sentinelles",
        goal:20,
        firmPoints:100,
        currentFirmPoints:100,
        claimFirmatons:5,
        endsAt:now + 3_600_000,
        firms:{astra:{progress:10}, cyan:{progress:5}, jaune:{progress:2}, verte:{progress:1}},
        player:{contribution:3, rank:2}
      }
    ],
    seasonalQuests:[
      {
        id:"weekly-raiders",
        kind:"weekly",
        label:"Raid astral",
        target:"raider_astral",
        targetLabel:"Raiders astraux",
        goal:50,
        claimable:true,
        claimFirmatons:15,
        endsAt:now + 7_200_000,
        firms:{astra:{progress:50, completedAt:now, firmPointsAwarded:300}},
        player:{contribution:8, rank:1}
      }
    ],
    seasonObjectives:[
      {
        id:"season-monsters",
        label:"Chasseur de saison",
        target:"*",
        targetLabel:"Monstres",
        goal:100,
        progress:100,
        completedAt:now,
        claimable:true,
        firmPoints:250,
        reward:{firmatons:25, ammo:{ammo_x2:1_000}}
      }
    ],
    personal:{
      key:"pilot-1",
      firmId:"astra",
      contribution:500,
      rank:1,
      rewardLabel:"Top 1",
      expectedReward:{premium:200_000, ammo:{ammo_x6:30_000}, firmatons:2_000},
      pendingRewards:[{label:"Saison precedente", reward:{firmatons:100}}]
    }
  };
}

test("combat firm panel uses the updated quest and reward format", ()=>{
  const snapshot = firmSnapshot();
  const quests = renderCombatFirmPanel({snapshot, selectedTab:"quests"});
  const weekly = renderCombatFirmPanel({snapshot, selectedTab:"weekly-quests"});
  const seasonal = renderCombatFirmPanel({snapshot, selectedTab:"seasonal-objectives"});
  const rewards = renderCombatFirmPanel({snapshot, selectedTab:"rewards"});

  assert.match(quests, /assets\/enemies\/generated\/orbe_vorak_lowlevel_01\/low_orbe_01\.png/);
  assert.match(quests, /Top quete/);
  assert.match(quests, /Firme <b>\+100<\/b>/);
  assert.match(weekly, /data-social-action="firm-quest-claim"/);
  assert.match(seasonal, /data-social-action="firm-season-objective-claim"/);
  assert.match(rewards, /Top 1/);
  assert.match(rewards, /combat-firm-reward-gift/);
  assert.match(rewards, /data-firm-reward-gift/);
  assert.match(rewards, /assets\/icons\/season-gift\.svg/);
  assert.match(rewards, /combat-firm-reward-tooltip-source/);
  assert.doesNotMatch(rewards, /class="combat-firm-reward-tooltip"/);
  assert.match(rewards, /assets\/icons\/premium\.svg/);
  assert.match(rewards, /assets\/icons\/firmaton\.svg/);
});
