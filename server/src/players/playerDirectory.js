export function createPlayerDirectoryEmitter({
  io,
  players,
  publicPlayer,
  canSharePlayerState
} = {}){
  return function emitPlayers(){
    const candidates = [...(players?.values?.() || [])].filter(player=>Boolean(player?.accountId));
    if(!candidates.length) return;

    const publicEntries = new Map(candidates.map(candidate=>[
      candidate.id,
      publicPlayer(candidate, {includeState:true})
    ]));

    for(const recipient of candidates){
      const list = candidates.map(candidate=>{
        const entry = publicEntries.get(candidate.id);
        if(canSharePlayerState(recipient, candidate)) return entry;
        return {...entry, state:null};
      });
      io.to(recipient.id).emit("players:list", list);
    }
  };
}
