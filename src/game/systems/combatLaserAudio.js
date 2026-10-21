const LASER_SOUND_URL = new URL("../../../assets/audio/laser-double-v3.wav", import.meta.url);

export function createCombatLaserAudio({
  getAudioSettings,
  isActive,
  windowRef = globalThis.window,
  documentRef = globalThis.document,
  fetchRef = globalThis.fetch
}){
  let context = null;
  let output = null;
  let buffer = null;
  let loading = null;
  let retryAfter = 0;
  let disposed = false;
  const voices = new Set();

  function syncSettings(){
    const settings = getAudioSettings();
    const volume = key=>Math.max(0, Math.min(100, Number(settings?.[key]) || 0)) / 100;
    const gain = settings?.muted ? 0 : volume("master") * volume("effects");
    output?.gain.setTargetAtTime(gain, context.currentTime, .005);
    return gain;
  }

  async function load(){
    if(buffer || Date.now() < retryAfter) return;
    if(!loading){
      loading = (async()=>{
        const response = await fetchRef(LASER_SOUND_URL);
        if(!response.ok) throw new Error("Laser audio unavailable");
        const bytes = await response.arrayBuffer();
        const decoded = await context.decodeAudioData(bytes);
        if(!disposed) buffer = decoded;
      })().catch(()=>{
        retryAfter = Date.now() + 5000;
      }).finally(()=>{ loading = null; });
    }
    await loading;
  }

  async function unlock(){
    if(disposed) return false;
    try{
      if(!context){
        const AudioContext = windowRef?.AudioContext || windowRef?.webkitAudioContext;
        if(!AudioContext) return false;
        context = new AudioContext({latencyHint:"interactive"});
        output = context.createGain();
        output.connect(context.destination);
        syncSettings();
      }
      // Resume directly inside the input handler to satisfy browser autoplay rules.
      const resumed = context.state === "running" ? null : context.resume();
      await Promise.all([resumed, load()]);
      return !disposed && context.state === "running" && Boolean(buffer);
    }catch{
      return false;
    }
  }

  function release(source){
    voices.delete(source);
    source.disconnect();
  }

  function stop(){
    for(const source of voices){
      try{ source.stop(); }catch{}
      release(source);
    }
  }

  function play(){
    // Never queue a late shot while a file loads or the browser is suspended.
    if(disposed || !isActive() || documentRef?.hidden || !buffer || context?.state !== "running") return false;
    if(syncSettings() <= 0) return false;
    let source;
    try{
      if(voices.size >= 4){
        const oldest = voices.values().next().value;
        oldest.stop();
        release(oldest);
      }
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(output);
      source.onended = ()=>release(source);
      voices.add(source);
      // The WAV contains both pulses (120 ms apart). One source per attack.
      source.start();
      return true;
    }catch{
      if(source) release(source);
      return false;
    }
  }

  function onVisibilityChange(){
    if(documentRef.hidden) stop();
  }

  function dispose(){
    disposed = true;
    stop();
    windowRef?.removeEventListener("pointerdown", unlock, true);
    windowRef?.removeEventListener("keydown", unlock, true);
    windowRef?.removeEventListener("voidsector:settings-applied", syncSettings);
    documentRef?.removeEventListener("visibilitychange", onVisibilityChange);
    output?.disconnect();
    context?.close().catch(()=>{});
  }

  windowRef?.addEventListener("pointerdown", unlock, {capture:true, passive:true});
  windowRef?.addEventListener("keydown", unlock, {capture:true, passive:true});
  windowRef?.addEventListener("voidsector:settings-applied", syncSettings);
  documentRef?.addEventListener("visibilitychange", onVisibilityChange);
  return {unlock, play, stop, syncSettings, dispose};
}
