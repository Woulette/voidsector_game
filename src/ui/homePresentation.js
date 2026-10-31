function nonnegative(value){
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function buildHomeRanking(snapshot, {accountId = "", name = "", connected = false} = {}){
  if(!Array.isArray(snapshot?.rows)) return {status:connected ? "loading" : "offline", top:[], player:null};
  const currentKey = accountId ? `account:${accountId}` : "";
  const playerName = String(name).trim().toLocaleLowerCase();
  const rows = snapshot.rows.map((row, index)=>{
    const key = String(row.key || row.id || "");
    const pilot = String(row.pilot || row.name || "Pilote").trim() || "Pilote";
    return {
      key,
      pilot,
      rankId:String(row.rankId || row.publicProfile?.rank?.id || ""),
      position:Math.max(1, Math.floor(nonnegative(row.position || row.rank) || index + 1)),
      points:Math.floor(nonnegative(row.points)),
      isPlayer:currentKey
        ? key === currentKey
        : Boolean(row.isPlayer || (playerName && pilot.toLocaleLowerCase() === playerName))
    };
  }).sort((a,b)=>a.position - b.position);
  return {status:connected ? "ready" : "cached", top:rows.slice(0,3), player:rows.find(row=>row.isPlayer) || null};
}

export function buildHomeQuest(quest, getProgress){
  if(!quest) return null;
  const source = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  const objectives = source.filter(Boolean).map((objective, index)=>{
    const target = nonnegative(objective.count);
    const progress = Math.min(target, nonnegative(getProgress(quest.id, objective, index)));
    return {label:String(objective.label || "Progression de l’objectif"), progress, target, complete:progress >= target};
  });
  const complete = objectives.length > 0 && objectives.every(objective=>objective.complete);
  const current = objectives.find(objective=>!objective.complete) || objectives[objectives.length - 1] || null;
  const percent = objectives.length
    ? Math.round(objectives.reduce((sum, objective)=>sum + (objective.target > 0 ? objective.progress / objective.target : 1), 0) / objectives.length * 100)
    : 0;
  return {id:quest.id, title:String(quest.title || "Quête en cours"), objectives, current, percent, complete};
}
