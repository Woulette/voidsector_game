// Shared category silhouettes approved for the quest relay. No gameplay state.
const SWORD = '<path d="m3 1 5 2 14 14-3 3L5 6Z"/><path d="m16 22 7-7 2 2-7 7Z"/><path d="m21 22 6 6 2-2-6-6Z"/><circle cx="28" cy="27" r="2"/>';
const CATEGORY_GLYPHS = {
  combat:'<g stroke="#07131d" stroke-width="1.2" stroke-linejoin="round">'+SWORD+'<g transform="translate(32 0) scale(-1 1)">'+SWORD+'</g></g>',
  collect:'<path d="m15 2 6 7-3 12-8-2-3-11Zm-3 19 6 2 5 7H8L3 18l5-4ZM23 12l6-2 2 9-6 10-5-7Z"/><path fill="none" stroke="#06131e" stroke-width="1.3" stroke-linecap="round" d="m15 7-2 10m14-2-3 8"/>',
  ship:'<path d="m16 2 5 14 9 9v5l-11-5-3 5-3-5-11 5v-5l9-9Z"/><path fill="none" stroke="#06131e" stroke-width="1.3" stroke-linecap="round" d="M16 8v14m-8 2 4-5m12 5-4-5"/>',
  drone:'<path fill-rule="evenodd" d="m10 3-7 7v12l7 7h12l7-7V10l-7-7Zm6 6a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z"/><circle cx="16" cy="16" r="3.5"/><path d="M0 11h3v10H0Zm29 0h3v10h-3Z"/>',
  laser:'<path d="m7 15 9-9 8 8-9 9ZM3 20l4-4 8 8-4 4Z"/><path d="m16 5 3-3 11 11-3 3ZM2 29l4-4 2 2-4 4Z"/><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="m24 3 5-2m-3 6 5-1"/>',
  upgrade:'<path fill-rule="evenodd" d="m13 1 6 0 1 4 4 2 4-1 3 5-3 3v4l3 3-3 5-4-1-4 2-1 4h-6l-1-4-4-2-4 1-3-5 3-3v-4l-3-3 3-5 4 1 4-2Zm3 7-7 8h4v8h6v-8h4Z"/>',
  explore:'<path fill-rule="evenodd" d="M16 1a11 11 0 0 0-11 11c0 8 11 19 11 19s11-11 11-19A11 11 0 0 0 16 1Zm0 6a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/>',
  deliver:'<path d="M2 7 14 2l12 5-12 5Z"/><path d="M2 10 13 15v15L2 25Zm14 5 10-5v6h-5v7h-5Z"/><path d="M19 19h7v-4l6 7-6 7v-4h-7Z"/>',
  portal:'<circle fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" cx="16" cy="16" r="12"/><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M11 7c12-3 17 12 6 17-9 4-15-9-7-13 6-3 10 5 5 8"/><path d="M2 14h5l-5 6ZM25 12h5l-4 7Z"/>',
};

const CATEGORIES = Object.freeze(Object.fromEntries([
  ['combat','Combat'], ['collect','Récolte'], ['ship','Vaisseau'], ['drone','Drone'],
  ['laser','Laser'], ['upgrade','Amélioration'], ['explore','Exploration'],
  ['deliver','Livraison'], ['portal','Portail'],
].map(([id,label])=>[id,Object.freeze({id,icon:id,label})])));

export function getQuestActivityCategory(quest = {}){
  // An authored category can describe the primary purpose of future mixed quests.
  if(Object.hasOwn(CATEGORIES, quest?.activityCategory)) return CATEGORIES[quest.activityCategory];
  const types = (Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective])
    .filter(Boolean).map(objective=>objective.type || '');
  let id = 'explore';
  if(types.includes('kill')) id = 'combat';
  else if(types.some(type=>type.startsWith('refinery_'))) id = 'upgrade';
  else if(types.includes('owned_combat_drone')) id = 'drone';
  else if(types.some(type=>['owned_ship','equipped_ship'].includes(type))) id = 'ship';
  else if(types.includes('equipped_ship_lasers')) id = 'laser';
  else if(types.some(type=>['portal_complete','space_caster_use'].includes(type))) id = 'portal';
  else if(types.includes('quest_item_drop')) id = 'collect';
  else if(types.includes('deliver_item')) id = 'deliver';
  return CATEGORIES[id];
}

export function renderQuestCategoryIcon(name, className = ''){
  const id = ({location:'explore', refinery:'upgrade'})[name] || name;
  if(!Object.hasOwn(CATEGORY_GLYPHS, id)) return null;
  return `<svg class="quest-icon quest-category-icon ${className}" data-quest-category-icon="${id}" viewBox="0 0 32 32" fill="currentColor" stroke="none" aria-hidden="true">${CATEGORY_GLYPHS[id]}</svg>`;
}
