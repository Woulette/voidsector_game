export const SERVER_ACTION_BURST_INTERVAL_MS = 450;
export const SERVER_ACTION_BURST_MAX_REPEAT = 20;

export function createServerActionBurstQueue({
  intervalMs = SERVER_ACTION_BURST_INTERVAL_MS,
  maxRepeat = SERVER_ACTION_BURST_MAX_REPEAT,
  now = ()=>Date.now(),
  setTimer = (callback, delay)=>setTimeout(callback, delay),
  clearTimer = handle=>clearTimeout(handle),
  onSendFailure = ()=>{}
} = {}){
  const safeInterval = Math.max(1, Math.floor(Number(intervalMs || SERVER_ACTION_BURST_INTERVAL_MS)));
  const safeMaxRepeat = Math.max(1, Math.floor(Number(maxRepeat || SERVER_ACTION_BURST_MAX_REPEAT)));
  const channels = new Map();

  function getChannel(channel){
    const id = String(channel || "");
    let state = channels.get(id);
    if(!state){
      state = {lastSentAt:Number.NEGATIVE_INFINITY, timer:null, entries:[]};
      channels.set(id, state);
    }
    return state;
  }

  function pendingCount(state){
    return state.entries.reduce((total, entry)=>total + entry.count, 0);
  }

  function schedule(channel, state){
    if(state.timer || !state.entries.length) return;
    const delay = Math.max(0, state.lastSentAt + safeInterval - Number(now()));
    state.timer = setTimer(()=>{
      state.timer = null;
      flush(channel, state);
    }, delay);
  }

  function flush(channel, state = channels.get(String(channel || ""))){
    if(!state || !state.entries.length) return false;
    const currentTime = Number(now());
    const remainingDelay = state.lastSentAt + safeInterval - currentTime;
    if(remainingDelay > 0){
      schedule(channel, state);
      return false;
    }
    const entry = state.entries[0];
    const repeat = Math.min(safeMaxRepeat, entry.count);
    const sent = entry.send(repeat) === true;
    if(sent){
      entry.count -= repeat;
      if(entry.count <= 0) state.entries.shift();
      state.lastSentAt = currentTime;
    }else{
      state.entries.shift();
      onSendFailure({channel:String(channel || ""), key:entry.key, repeat});
    }
    if(state.entries.length) schedule(channel, state);
    return sent;
  }

  function enqueue({channel, key, send} = {}){
    const channelId = String(channel || "");
    const entryKey = String(key || "");
    if(!channelId || !entryKey || typeof send !== "function") return false;
    const state = getChannel(channelId);
    const currentTime = Number(now());
    if(!state.timer && !state.entries.length && currentTime >= state.lastSentAt + safeInterval){
      const sent = send(1) === true;
      if(sent) state.lastSentAt = currentTime;
      return sent;
    }
    const tail = state.entries.at(-1);
    if(tail?.key === entryKey) tail.count += 1;
    else state.entries.push({key:entryKey, count:1, send});
    schedule(channelId, state);
    return true;
  }

  function clear(){
    for(const state of channels.values()){
      if(state.timer) clearTimer(state.timer);
    }
    channels.clear();
  }

  return {
    clear,
    enqueue,
    flush:channel=>flush(String(channel || "")),
    pending:channel=>pendingCount(channels.get(String(channel || "")) || {entries:[]})
  };
}
