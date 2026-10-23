import { getNovaDiscountedPrice } from "../data/premium.js";

const BRANCH_META = {
  damage:{label:"Dégâts", icon:"damage", nodeIcon:"target", description:"Augmentez votre puissance de feu."},
  shield:{label:"Bouclier", icon:"shield", nodeIcon:"shield", description:"Renforcez votre survie en combat."},
  utility:{label:"Utilitaire", icon:"utility", nodeIcon:"rocket", description:"Améliorez votre efficacité tactique."}
};

const NODE_DESCRIPTIONS = {
  damage:["Améliore la puissance de vos lasers principaux.", "Augmente les dégâts de vos roquettes.", "Augmente les dégâts de vos missiles.", "Réduit le délai entre les tirs de roquettes.", "Renforce la puissance de vos lasers principaux."],
  shield:["Augmente la capacité de votre bouclier.", "Améliore vos chances d'esquiver les tirs.", "Renforce l'absorption des dégâts par votre bouclier.", "Améliore la régénération de votre bouclier.", "Augmente les points de vie de votre vaisseau."],
  utility:["Améliore la vitesse de votre vaisseau.", "Augmente les crédits obtenus.", "Augmente la capacité de votre soute.", "Améliore les soins de votre drone de réparation.", "Augmente les gains de NOVA."]
};

function amount(value){
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function skillTreeRoman(index){
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][index] || String(index + 1);
}

export function resolveSkillTreeSelection(catalog, selection){
  const branch = catalog.find(skill=>skill.id === selection?.branchId);
  const index = Number(selection?.nodeIndex);
  if(branch && Number.isInteger(index) && index >= 0 && index < (branch.levels?.length || 0)){
    return {branchId:branch.id, nodeIndex:index};
  }
  const first = catalog.find(skill=>skill.levels?.length);
  return first ? {branchId:first.id, nodeIndex:0} : null;
}

function rankDefinitions(node){
  return Array.isArray(node?.ranks) ? node.ranks : node ? [node] : [];
}

function costEntries(step, player, cargoHold, materials){
  if(!step) return [];
  const entries = [{id:"points", label:"de compétence", amount:amount(step.skillPoints), available:amount(player.skillPoints), icon:"point"}];
  const cost = step.costs && typeof step.costs === "object"
    ? step.costs
    : {credits:step.priceType === "credits" ? step.price : 0, premium:step.priceType === "premium" ? step.price : 0};
  if(amount(cost.credits)) entries.push({id:"credits", label:"crédits", amount:amount(cost.credits), available:amount(player.credits), currency:"credits"});
  if(amount(cost.premium)){
    const base = amount(cost.premium);
    const price = getNovaDiscountedPrice(base, player);
    entries.push({id:"premium", label:price < base ? "NOVA · tarif Premium" : "NOVA", amount:price, baseAmount:base, available:amount(player.premium), currency:"premium"});
  }
  for(const [id, quantity] of Object.entries(cost.materials || {})){
    if(!amount(quantity)) continue;
    const material = materials.find(entry=>entry.id === id);
    entries.push({id, label:material?.name || id, amount:amount(quantity), available:amount(cargoHold[id]), image:material?.img, icon:"material"});
  }
  return entries.map(entry=>({...entry, insufficient:entry.available < entry.amount}));
}

// Presentation only: eligibility and sequential progression come from the existing skill getters.
export function createSkillTreeModel({catalog, selection, player = {}, cargoHold = {}, materials = [], getProgress, getUpgradeData, getLockReason, isUnlocked, canAffordCost, portalRequirement, portalComplete}){
  const selected = resolveSkillTreeSelection(catalog, selection);
  const ordered = ["damage", "shield", "utility"].map(id=>catalog.find(skill=>skill.id === id)).filter(Boolean);
  const branches = [...ordered, ...catalog.filter(skill=>!ordered.includes(skill))].map(skill=>{
    const progress = getProgress(skill.id);
    const next = getUpgradeData(skill.id);
    const meta = BRANCH_META[skill.id] || {label:skill.short || skill.name, icon:"target", nodeIcon:"target", description:skill.desc};
    const nodes = (skill.levels || []).map((node, index)=>{
      const definitions = rankDefinitions(node);
      const maxRank = definitions.length;
      const rank = Math.min(maxRank, Math.floor(amount(progress.ranks?.[index])));
      const done = rank >= maxRank;
      const nextRank = definitions[rank] || null;
      const lockReason = getLockReason(index) || "";
      const unlocked = isUnlocked(index);
      const isNext = !done && next?.nodeIndex === index && next?.rankIndex === rank;
      const hasPoints = amount(player.skillPoints) >= amount(nextRank?.skillPoints);
      const affordable = !!nextRank && canAffordCost(nextRank);
      const canUpgrade = isNext && unlocked && !lockReason && hasPoints && affordable;
      const reason = done ? "Compétence au rang maximum."
        : lockReason || (!isNext ? "Termine les rangs précédents de cette branche."
          : !hasPoints ? "Points de compétence insuffisants."
            : !affordable ? "Ressources insuffisantes." : "");
      return {
        branchId:skill.id, index, name:node.name || `Palier ${index + 1}`, rank, maxRank,
        icon:meta.nodeIcon, selected:selected?.branchId === skill.id && selected.nodeIndex === index,
        done, locked:!done && (!unlocked || !!lockReason || !isNext), available:isNext && unlocked && !lockReason,
        canUpgrade, reason, currentLabel:rank ? definitions[rank - 1]?.label || "Bonus actif" : "Aucun bonus",
        nextLabel:nextRank?.label || "Rang maximum atteint", description:NODE_DESCRIPTIONS[skill.id]?.[index] || skill.desc || "",
        costs:costEntries(nextRank, player, cargoHold, materials),
        ranks:definitions.map((definition, rankIndex)=>({index:rankIndex, label:definition.label || "Bonus", earned:rankIndex < rank, next:rankIndex === rank}))
      };
    });
    return {id:skill.id, ...meta, nodes};
  });
  const selectedBranch = branches.find(branch=>branch.id === selected?.branchId);
  return {
    selection:selected, points:amount(player.skillPoints), branches,
    tierCount:Math.max(0, ...branches.map(branch=>branch.nodes.length)),
    portal:{label:portalRequirement?.label || "Portail requis", completed:!!portalComplete},
    selected:selectedBranch ? {...selectedBranch.nodes[selected.nodeIndex], branchLabel:selectedBranch.label} : null
  };
}
