export function createTypewriterTextController({charactersPerSecond = 34} = {}){
  let activeKey = "";
  let fullText = "";
  let visibleLength = 0;
  let elapsed = 0;
  let element = null;

  function paint(){
    if(element) element.textContent = fullText.slice(0, visibleLength);
  }

  function sync(root){
    const next = root?.querySelector?.("[data-typewriter-text]") || null;
    element = next;
    if(!next) return false;
    const nextKey = String(next.dataset?.typewriterKey || "");
    const nextText = String(next.dataset?.typewriterText || "");
    if(nextKey !== activeKey || nextText !== fullText){
      activeKey = nextKey;
      fullText = nextText;
      visibleLength = 0;
      elapsed = 0;
    }
    paint();
    return true;
  }

  function update(dt){
    if(!element || visibleLength >= fullText.length) return false;
    elapsed += Math.max(0, Number(dt || 0)) * Math.max(1, Number(charactersPerSecond || 1));
    const characters = Math.floor(elapsed);
    if(characters <= 0) return false;
    elapsed -= characters;
    visibleLength = Math.min(fullText.length, visibleLength + characters);
    paint();
    return true;
  }

  function complete(){
    visibleLength = fullText.length;
    elapsed = 0;
    paint();
  }

  function reset(){
    activeKey = "";
    fullText = "";
    visibleLength = 0;
    elapsed = 0;
    element = null;
  }

  return {
    sync,
    update,
    complete,
    reset,
    isComplete:()=>visibleLength >= fullText.length,
    visibleText:()=>fullText.slice(0, visibleLength)
  };
}
