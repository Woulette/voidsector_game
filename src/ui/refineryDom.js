function key(node){
  return node.nodeType === 1 ? node.getAttribute("data-refinery-key") : null;
}

function compatible(current, next){
  return current && current.nodeType === next.nodeType
    && (current.nodeType !== 1 || (current.tagName === next.tagName && key(current) === key(next)));
}

function patchNode(current, next){
  if(current.nodeType !== 1){
    if(current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    return;
  }
  const editing = current === current.ownerDocument.activeElement;
  for(const attribute of Array.from(current.attributes)){
    if(!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for(const attribute of Array.from(next.attributes)){
    if(editing && attribute.name === "value") continue;
    if(current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
  patchChildren(current, next);
  // Preserve the actual input node, its caret and transient edits while the
  // server refreshes stocks or an upgrade countdown updates every second.
  if((current.tagName === "INPUT" || current.tagName === "TEXTAREA") && !editing){
    const value = next.getAttribute("value") ?? next.value;
    if(current.value !== value) current.value = value;
  }
  if(current.tagName === "SELECT" && !editing && current.value !== next.value) current.value = next.value;
}

function patchChildren(parent, nextParent){
  let cursor = parent.firstChild;
  for(const next of Array.from(nextParent.childNodes)){
    let current = compatible(cursor, next) ? cursor : null;
    if(!current && key(next)){
      current = Array.from(parent.childNodes).find(child=>compatible(child, next)) || null;
    }
    if(!current){
      current = next.cloneNode(true);
      parent.insertBefore(current, cursor);
    }else{
      if(current !== cursor) parent.insertBefore(current, cursor);
      patchNode(current, next);
    }
    cursor = current.nextSibling;
  }
  while(cursor){
    const remove = cursor;
    cursor = cursor.nextSibling;
    remove.remove();
  }
}

export function updateRefineryDom(element, html){
  const template = element.ownerDocument.createElement("template");
  template.innerHTML = html;
  patchChildren(element, template.content);
}
