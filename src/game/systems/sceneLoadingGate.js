export function createSceneLoadingGate({prepare, show, hide, onError}){
  let activeKey = null, generation = 0, phase = "idle";
  function reset(){activeKey = null;generation++;phase = "idle";hide();}
  function begin(key, options){
    if(key !== activeKey){
      activeKey = key;phase = "loading";
      const ticket = ++generation;
      show(options);
      Promise.resolve().then(()=>prepare(options,()=>ticket === generation)).then(()=>{
        if(ticket === generation) phase = "first-frame";
      }).catch(error=>{
        if(ticket !== generation) return;
        phase = "error";onError(error, ()=>{activeKey = null;});
      });
    }
    return phase === "ready" || phase === "first-frame";
  }
  function completeFrame(key){
    if(key !== activeKey || phase !== "first-frame") return;
    phase = "ready";hide();
  }
  return {begin, completeFrame, reset, get phase(){return phase;}};
}
