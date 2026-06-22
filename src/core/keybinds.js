export const DEFAULT_SLOT_KEYBINDS = ["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9"];
export const DEFAULT_ABILITY_KEYBINDS = ["KeyC", "KeyV", "KeyB"];

export function keyCodeToLabel(code){
  if(!code) return "-";
  if(code === "Space") return "Espace";
  if(code.startsWith("Digit")) return code.replace("Digit", "");
  if(code.startsWith("Numpad")) return `Pavé ${code.replace("Numpad", "")}`;
  if(code.startsWith("Key")) return code.replace("Key", "").toUpperCase();
  if(code.startsWith("Arrow")) return code.replace("Arrow", "Flèche ");
  return code.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function normalizeSlotKeybinds(raw){
  const result = [];
  const used = new Set();
  const source = Array.isArray(raw) ? raw : [];
  for(let i=0;i<DEFAULT_SLOT_KEYBINDS.length;i++){
    const candidate = typeof source[i] === "string" && source[i] ? source[i] : DEFAULT_SLOT_KEYBINDS[i];
    if(!used.has(candidate)){
      result[i] = candidate;
      used.add(candidate);
    }else{
      const fallback = DEFAULT_SLOT_KEYBINDS.find(code=>!used.has(code)) || DEFAULT_SLOT_KEYBINDS[i];
      result[i] = fallback;
      used.add(fallback);
    }
  }
  return result;
}

export function eventToCode(event){
  return event?.code || (event?.key?.length === 1 ? `Key${event.key.toUpperCase()}` : event?.key || "");
}

export function normalizeAbilityKeybinds(raw, blockedCodes = []){
  const result = [];
  const used = new Set(Array.isArray(blockedCodes) ? blockedCodes.filter(Boolean) : []);
  const source = Array.isArray(raw) ? raw : [];
  const fallbacks = [...DEFAULT_ABILITY_KEYBINDS, "KeyX", "KeyN", "KeyM", "KeyL", "KeyK"];
  for(let i = 0; i < DEFAULT_ABILITY_KEYBINDS.length; i++){
    const candidate = typeof source[i] === "string" && source[i] ? source[i] : DEFAULT_ABILITY_KEYBINDS[i];
    const code = !used.has(candidate) ? candidate : fallbacks.find(value=>!used.has(value));
    result[i] = code || DEFAULT_ABILITY_KEYBINDS[i];
    used.add(result[i]);
  }
  return result;
}

export function slotIndexFromEvent(event, keybinds){
  const code = eventToCode(event);
  return normalizeSlotKeybinds(keybinds).indexOf(code);
}

export function abilityIndexFromEvent(event, keybinds, slotKeybinds = []){
  const code = eventToCode(event);
  return normalizeAbilityKeybinds(keybinds, slotKeybinds).indexOf(code);
}

export function isEditableTarget(target){
  if(!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}
