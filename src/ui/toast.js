let toastTimer = null;

const CURRENCY_WORD = /\b(NOVA|CR(?:ÉDITS?)?|CREDITS?)\b(?!-\d)/giu;

function setToastContent(element, message){
  const text = String(message ?? "");
  const nodes = [];
  let cursor = 0;
  for(const match of text.matchAll(CURRENCY_WORD)){
    if(match.index > cursor) nodes.push(document.createTextNode(text.slice(cursor, match.index)));
    const premium = match[0].toUpperCase() === "NOVA";
    const img = document.createElement("img");
    img.className = `currency-icon currency-icon-${premium ? "premium" : "credits"}`;
    img.src = premium ? "assets/icons/premium.svg" : "assets/icons/credits.svg";
    img.alt = premium ? "NOVA" : "Crédits";
    img.title = img.alt;
    nodes.push(img);
    cursor = match.index + match[0].length;
  }
  if(cursor < text.length) nodes.push(document.createTextNode(text.slice(cursor)));
  element.replaceChildren(...nodes);
}

export function showToast(msg){
  const el = document.getElementById("toast");
  setToastContent(el, msg);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove("show"), 2600);
}
