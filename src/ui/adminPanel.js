import { fmt } from "../core/utils.js";
import { ammoTypes, droneCatalog, droneFormations, equipment } from "../data/equipment.js";
import { portals, rawMaterialCatalog } from "../data/progression.js";
import { ships } from "../data/ships.js";
import { currencyIconHtml } from "./currencyIcons.js";
import {
  adjustAdminPlayer,
  grantAdminPlayer,
  inspectAdminPlayer,
  kickAdminPlayer,
  moderateAdminAccount,
  multiplayer,
  removeAdminInventoryItem,
  requestAdminSync,
  resetAdminInstance
} from "../multiplayer/client.js";

const STAFF_ROLES = new Set(["moderator", "admin", "owner"]);
const ADMIN_ACTIONS = new Set(["kick", "mute", "ban", "unmute", "unban", "adjust", "grant"]);

const FIRM_BOXES = [
  {id:"common", name:"Coffre commun", short:"Commun", rarity:"COMMUN", img:"assets/firm/chests/chest_common.svg"},
  {id:"rare", name:"Coffre rare", short:"Rare", rarity:"RARE", img:"assets/firm/chests/chest_rare.svg"},
  {id:"veryRare", name:"Coffre tres rare", short:"Tres rare", rarity:"TRES RARE", img:"assets/firm/chests/chest_veryRare.svg"},
  {id:"elite", name:"Coffre elite", short:"Elite", rarity:"ELITE", img:"assets/firm/chests/chest_elite.svg"},
  {id:"mythic", name:"Coffre mythique", short:"Mythique", rarity:"MYTHIQUE", img:"assets/firm/chests/chest_mythic.svg"}
];

const GRANT_TYPES = [
  ["item", "Equipement / extra"],
  ["ammo", "Munitions"],
  ["resource", "Ressources"],
  ["ship", "Vaisseaux"],
  ["drone", "Drones"],
  ["formation", "Formations"],
  ["portalPiece", "Pieces portail"],
  ["firmBox", "Coffres firme"]
];

const adminUi = {
  open:false,
  filter:"all",
  query:"",
  selected:null,
  action:null,
  inventoryFilter:"all",
  selectedInventory:null,
  actionReason:"",
  actionDuration:"10",
  adjustField:"credits",
  adjustMode:"add",
  adjustAmount:"0",
  inventoryDeleteReason:"",
  grantType:"item",
  grantId:"",
  grantAmount:"1",
  grantDestination:"cargoHold",
  grantShipId:"",
  grantReason:"",
  grantQuery:""
};

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

function selectedAttr(value, current){
  return String(value) === String(current) ? " selected" : "";
}

function resetActionDraft(){
  adminUi.actionReason = "";
  adminUi.actionDuration = "10";
  adminUi.adjustField = "credits";
  adminUi.adjustMode = "add";
  adminUi.adjustAmount = "0";
}

function resetInventoryDeleteDraft(){
  adminUi.inventoryDeleteReason = "";
}

function resetGrantDraft(){
  adminUi.grantType = "item";
  adminUi.grantId = "";
  adminUi.grantAmount = "1";
  adminUi.grantDestination = "cargoHold";
  adminUi.grantShipId = "";
  adminUi.grantReason = "";
  adminUi.grantQuery = "";
}

function role(){
  return String(multiplayer.auth?.account?.role || "player").toLowerCase();
}

function canUseAdminPanel(){
  return STAFF_ROLES.has(role());
}

function canUseAdminAction(action){
  const current = role();
  if(current === "owner") return true;
  if(action === "ban" || action === "unban" || action === "adjust" || action === "grant" || action === "inventory-remove" || action === "reset-instance") return current === "admin";
  return current === "admin" || current === "moderator";
}

function staffLabel(value){
  const clean = String(value || "player").toLowerCase();
  if(clean === "owner") return "OWN";
  if(clean === "admin") return "ADM";
  if(clean === "moderator") return "MOD";
  return "Joueur";
}

function formatDate(value){
  const timestamp = Number(value || 0);
  if(!timestamp) return "--";
  return new Date(timestamp).toLocaleString("fr-FR");
}

function formatHours(seconds){
  return `${Math.floor(Math.max(0, Number(seconds || 0)) / 3600)}h`;
}

function setPending(pending){
  multiplayer.admin.pending = Boolean(pending);
}

function requestSnapshot(){
  if(!canUseAdminPanel()) return false;
  setPending(true);
  const sent = requestAdminSync({profileLimit:0, auditLimit:50});
  if(!sent) setPending(false);
  return sent;
}

function rowKeyFromOnline(player){
  return player.accountId ? `account:${player.accountId}` : `socket:${player.id}`;
}

function buildRows(){
  const snapshot = multiplayer.admin?.snapshot || {};
  const rows = new Map();
  for(const player of snapshot.onlinePlayers || []){
    const key = rowKeyFromOnline(player);
    rows.set(key, {
      key,
      profileKey:player.accountId ? `account:${player.accountId}` : "",
      targetId:player.id,
      accountId:player.accountId || null,
      name:player.name || "Pilote",
      role:player.role || "player",
      level:player.level || 1,
      firmId:player.firmId || "astra",
      status:player.connected === false ? "offline" : "online",
      clientMode:player.clientMode || "",
      mapId:player.mapId || "--",
      hp:player.hp,
      maxHp:player.maxHp,
      groupId:player.groupId || "",
      credits:player.credits || 0,
      premium:player.premium || 0,
      totalXp:player.totalXp || 0,
      sessionCount:player.sessionCount || 1,
      clientModes:player.clientModes || [player.clientMode || ""],
      suspicion:player.suspicion || {suspicious:false, score:0, reasons:[]},
      updatedAt:0
    });
  }
  for(const profile of snapshot.recentProfiles || []){
    const key = profile.key || `profile:${profile.name}`;
    const existing = rows.get(key);
    rows.set(key, {
      ...(existing || {}),
      key,
      profileKey:profile.key || existing?.profileKey || "",
      accountId:profile.accountId || existing?.accountId || null,
      name:existing?.name || profile.name || "Pilote",
      role:existing?.role || "player",
      level:existing?.level || profile.level || 1,
      firmId:existing?.firmId || profile.firmId || "astra",
      status:existing?.status || "offline",
      clientMode:existing?.clientMode || "offline",
      mapId:existing?.mapId || "--",
      credits:existing?.credits ?? profile.credits ?? 0,
      premium:existing?.premium ?? profile.premium ?? 0,
      totalXp:existing?.totalXp ?? profile.totalXp ?? 0,
      totalKills:profile.totalKills || 0,
      suspicion:existing?.suspicion || profile.suspicion || {suspicious:false, score:0, reasons:[]},
      updatedAt:profile.updatedAt || 0
    });
  }
  const query = adminUi.query.trim().toLowerCase();
  return [...rows.values()]
    .filter(row=>adminUi.filter === "all"
      || (adminUi.filter === "suspects" ? row.suspicion?.suspicious : row.status === adminUi.filter))
    .filter(row=>!query || String(row.name || "").toLowerCase().includes(query) || String(row.accountId || "").toLowerCase().includes(query))
    .sort((a, b)=>{
      const suspectDelta = Number(Boolean(b.suspicion?.suspicious)) - Number(Boolean(a.suspicion?.suspicious));
      if(suspectDelta) return suspectDelta;
      if(a.status !== b.status) return a.status === "online" ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

function snapshotSuspectCount(snapshot = {}){
  if(!snapshot || typeof snapshot !== "object") return 0;
  const suspects = new Set();
  for(const player of snapshot.onlinePlayers || []){
    if(player.suspicion?.suspicious) suspects.add(player.accountId ? `account:${player.accountId}` : `socket:${player.id}`);
  }
  for(const profile of snapshot.recentProfiles || []){
    if(profile.suspicion?.suspicious) suspects.add(profile.key || `profile:${profile.name}`);
  }
  return suspects.size;
}

function selectedTarget(){
  const rows = buildRows();
  if(adminUi.selected?.key){
    const row = rows.find(candidate=>candidate.key === adminUi.selected.key);
    if(row) return {...row, ...adminUi.selected};
    return adminUi.selected;
  }
  return rows[0] || null;
}

function inspectMatchesTarget(inspect, target){
  if(!inspect || !target) return false;
  const inspectProfileKey = inspect.profile?.key || inspect.details?.key || "";
  if(target.profileKey && inspectProfileKey && target.profileKey === inspectProfileKey) return true;
  if(target.targetId && inspect.player?.id && target.targetId === inspect.player.id) return true;
  if(target.accountId && (inspect.player?.accountId === target.accountId || inspect.profile?.accountId === target.accountId)) return true;
  return false;
}

function renderDock(){
  const root = document.getElementById("adminDock");
  if(!root) return;
  if(!canUseAdminPanel()){
    root.innerHTML = "";
    return;
  }
  const snapshot = multiplayer.admin?.snapshot;
  const suspectCount = snapshotSuspectCount(snapshot);
  root.innerHTML = `<button class="admin-dock-button ${adminUi.open ? "active" : ""}" data-admin-open type="button">
    <span>ADMIN</span>
    <b>${suspectCount > 0 ? `${suspectCount} alerte${suspectCount > 1 ? "s" : ""}` : "Panel"}</b>
  </button>`;
}

function renderStat(label, value, className = "", allowHtml = false){
  return `<div class="${className}"><span>${allowHtml ? label : escapeHtml(label)}</span><b>${allowHtml ? value : escapeHtml(value)}</b></div>`;
}

function renderRows(rows){
  if(!rows.length) return `<div class="admin-empty">Aucun joueur pour ce filtre.</div>`;
  return rows.map(row=>{
    const selected = adminUi.selected?.key === row.key;
    const suspicious = Boolean(row.suspicion?.suspicious);
    const statusLabel = row.status === "online" ? "Connecte" : "Deconnecte";
    return `<button class="admin-player-row ${selected ? "active" : ""} ${suspicious ? "suspect" : ""}" type="button"
        data-admin-select
        data-admin-key="${escapeHtml(row.key)}"
        data-admin-profile-key="${escapeHtml(row.profileKey || "")}"
        data-admin-target-id="${escapeHtml(row.targetId || "")}"
        data-admin-account-id="${escapeHtml(row.accountId || "")}">
      <strong>${escapeHtml(row.name)}</strong>
      <span>${escapeHtml(statusLabel)} - Niv. ${fmt(row.level || 1)}</span>
      <i>${escapeHtml(staffLabel(row.role))}</i>
      ${suspicious ? `<em>Suspicion ${Math.round(row.suspicion.score || 0)}</em>` : ""}
    </button>`;
  }).join("");
}

function renderActionForm(target){
  if(!adminUi.action || adminUi.action === "inventory-remove" || adminUi.action === "grant" || !target) return "";
  const action = adminUi.action;
  const needsDuration = action === "ban" || action === "mute";
  const needsAdjust = action === "adjust";
  const title = {
    kick:"Kick joueur",
    mute:"Mute compte",
    ban:"Ban compte",
    unmute:"Unmute compte",
    unban:"Unban compte",
    adjust:"Correction profil"
  }[action] || "Action admin";
  return `<section class="admin-action-box">
    <div class="admin-section-head">
      <span class="tiny">CONFIRMATION</span>
      <h3>${escapeHtml(title)}</h3>
    </div>
    ${needsDuration ? `<label><span>Duree</span><select id="adminActionDuration">
      <option value="10"${selectedAttr("10", adminUi.actionDuration)}>10 minutes</option>
      <option value="60"${selectedAttr("60", adminUi.actionDuration)}>1 heure</option>
      <option value="1440"${selectedAttr("1440", adminUi.actionDuration)}>24 heures</option>
      <option value="10080"${selectedAttr("10080", adminUi.actionDuration)}>7 jours</option>
      <option value="43200"${selectedAttr("43200", adminUi.actionDuration)}>30 jours</option>
    </select></label>` : ""}
    ${needsAdjust ? `<div class="admin-adjust-grid">
      <label><span>Champ</span><select id="adminAdjustField">
        <option value="credits"${selectedAttr("credits", adminUi.adjustField)}>Credits</option>
        <option value="premium"${selectedAttr("premium", adminUi.adjustField)}>NOVA</option>
        <option value="xp"${selectedAttr("xp", adminUi.adjustField)}>XP</option>
      </select></label>
      <label><span>Mode</span><select id="adminAdjustMode">
        <option value="add"${selectedAttr("add", adminUi.adjustMode)}>Ajouter / retirer</option>
        <option value="set"${selectedAttr("set", adminUi.adjustMode)}>Fixer</option>
      </select></label>
      <label><span>Montant</span><input id="adminAdjustAmount" type="number" step="1" value="${escapeHtml(adminUi.adjustAmount)}"></label>
    </div>` : ""}
    <label><span>Raison</span><textarea id="adminActionReason" maxlength="240" placeholder="Raison obligatoire pour garder une trace propre">${escapeHtml(adminUi.actionReason)}</textarea></label>
    <div class="admin-action-buttons">
      <button class="blue-button danger small" data-admin-confirm-action="${escapeHtml(action)}" type="button">CONFIRMER</button>
      <button class="blue-button secondary small" data-admin-cancel-action type="button">ANNULER</button>
    </div>
  </section>`;
}

function grantTypeLabel(type){
  return GRANT_TYPES.find(([id])=>id === type)?.[1] || type;
}

function normalizeGrantEntry(entry, type, extra = {}){
  return {
    type,
    id:String(entry.id || ""),
    name:String(entry.name || entry.short || entry.id || ""),
    short:String(entry.short || entry.name || entry.id || ""),
    category:String(entry.category || entry.kind || extra.category || ""),
    rarity:String(entry.rarity || extra.rarity || ""),
    img:String(entry.img || entry.pieceImg || extra.img || ""),
    desc:String(entry.desc || entry.className || extra.desc || ""),
    meta:String(extra.meta || "")
  };
}

function grantCatalog(){
  if(adminUi.grantType === "ammo") return ammoTypes.map(entry=>normalizeGrantEntry(entry, "ammo", {meta:entry.weaponClass || "munition"}));
  if(adminUi.grantType === "resource") return rawMaterialCatalog.map(entry=>normalizeGrantEntry(entry, "resource", {meta:entry.kind || "ressource"}));
  if(adminUi.grantType === "ship") return ships.map(entry=>normalizeGrantEntry(entry, "ship", {meta:entry.className || "vaisseau"}));
  if(adminUi.grantType === "drone") return droneCatalog.map(entry=>normalizeGrantEntry(entry, "drone", {meta:`Max ${entry.maxOwned || 0}`}));
  if(adminUi.grantType === "formation") return droneFormations.map(entry=>normalizeGrantEntry(entry, "formation", {meta:"formation drone"}));
  if(adminUi.grantType === "portalPiece") return portals.map(entry=>normalizeGrantEntry(entry, "portalPiece", {
    img:entry.pieceImg || entry.img,
    meta:`${entry.piecesRequired || 0} requises`
  }));
  if(adminUi.grantType === "firmBox") return FIRM_BOXES.map(entry=>normalizeGrantEntry(entry, "firmBox", {meta:"coffre firme"}));
  return equipment.map(entry=>normalizeGrantEntry(entry, "item", {meta:entry.slotType || entry.category || "objet"}));
}

function ensureGrantSelection(){
  const catalog = grantCatalog();
  if(!catalog.some(entry=>entry.id === adminUi.grantId)){
    adminUi.grantId = catalog[0]?.id || "";
  }
  return catalog.find(entry=>entry.id === adminUi.grantId) || null;
}

function grantMatchesQuery(entry, query){
  if(!query) return true;
  const haystack = [entry.id, entry.name, entry.short, entry.category, entry.rarity, entry.meta].join(" ").toLowerCase();
  return haystack.includes(query);
}

function renderGrantForm(target, inventory = {}){
  if(adminUi.action !== "grant" || !target) return "";
  const selected = ensureGrantSelection();
  const query = adminUi.grantQuery.trim().toLowerCase();
  const entries = grantCatalog().filter(entry=>grantMatchesQuery(entry, query));
  const amountLocked = adminUi.grantType === "ship" || adminUi.grantType === "formation";
  const shipOptions = ships.map(ship=>`<option value="${escapeHtml(ship.id)}"${selectedAttr(ship.id, adminUi.grantShipId)}>${escapeHtml(ship.name)}</option>`).join("");
  return `<section class="admin-action-box admin-grant-box">
    <div class="admin-section-head">
      <div><span class="tiny">DON SERVEUR</span><h3>Ajouter au profil</h3></div>
      ${selected ? `<strong>${escapeHtml(selected.short || selected.name)}</strong>` : ""}
    </div>
    <div class="admin-grant-layout">
      <div class="admin-grant-controls">
        <label><span>Categorie</span><select id="adminGrantType">
          ${GRANT_TYPES.map(([value, label])=>`<option value="${escapeHtml(value)}"${selectedAttr(value, adminUi.grantType)}>${escapeHtml(label)}</option>`).join("")}
        </select></label>
        <label><span>Recherche</span><input id="adminGrantQuery" value="${escapeHtml(adminUi.grantQuery)}" placeholder="Nom ou id"></label>
        <div class="admin-grant-inline">
          <label><span>Quantite</span><input id="adminGrantAmount" type="number" min="1" step="1" value="${escapeHtml(amountLocked ? "1" : adminUi.grantAmount)}"${amountLocked ? " disabled" : ""}></label>
          ${adminUi.grantType === "resource" ? `<label><span>Destination</span><select id="adminGrantDestination">
            <option value="cargoHold"${selectedAttr("cargoHold", adminUi.grantDestination)}>Hangar</option>
            <option value="shipCargo"${selectedAttr("shipCargo", adminUi.grantDestination)}>Soute vaisseau</option>
          </select></label>` : ""}
        </div>
        ${adminUi.grantType === "resource" && adminUi.grantDestination === "shipCargo" ? `<label><span>Vaisseau</span><select id="adminGrantShipId">
          <option value=""${selectedAttr("", adminUi.grantShipId)}>Actif joueur</option>
          ${shipOptions}
        </select></label>` : ""}
        <label><span>Raison</span><textarea id="adminGrantReason" maxlength="240" placeholder="Raison obligatoire pour l'audit">${escapeHtml(adminUi.grantReason)}</textarea></label>
        <div class="admin-action-buttons">
          <button class="blue-button small" data-admin-confirm-grant type="button">DONNER</button>
          <button class="blue-button secondary small" data-admin-cancel-action type="button">ANNULER</button>
        </div>
      </div>
      <div class="admin-grant-catalog">
        ${entries.map(entry=>`<button class="admin-grant-pick ${entry.id === adminUi.grantId ? "active" : ""}" data-admin-grant-pick="${escapeHtml(entry.id)}" type="button">
          ${entry.img ? `<img src="${escapeHtml(entry.img)}" alt="">` : `<span class="admin-inventory-placeholder">?</span>`}
          <strong>${escapeHtml(entry.short || entry.name)}</strong>
          <span>${escapeHtml(entry.rarity || entry.meta || grantTypeLabel(entry.type))}</span>
        </button>`).join("") || `<div class="admin-empty">Aucun resultat.</div>`}
      </div>
    </div>
  </section>`;
}

function inventoryEntryKey(entry){
  return `${entry.source}:${entry.uid || entry.id}`;
}

function allInventoryEntries(inventory = {}){
  const items = (inventory.items || []).map(item=>({
    ...item,
    source:"inventory",
    resourceLike:item.category === "quest_item"
  }));
  const resources = (inventory.resources || []).map(resource=>({
    ...resource,
    source:"resource",
    resourceLike:true,
    category:"resource"
  }));
  return [...items, ...resources];
}

function selectedInventoryEntry(inventory = {}){
  const key = adminUi.selectedInventory?.key || "";
  return allInventoryEntries(inventory).find(entry=>inventoryEntryKey(entry) === key) || null;
}

function renderInventoryStats(entry){
  const stats = Object.entries(entry?.stats || {}).slice(0, 3);
  if(!stats.length) return "";
  return `<span>${stats.map(([key, value])=>`${escapeHtml(key)} ${escapeHtml(value)}`).join(" - ")}</span>`;
}

function renderAdminInventory(target, inventory = {}){
  const entries = allInventoryEntries(inventory).filter(entry=>{
    if(adminUi.inventoryFilter === "equipment") return !entry.resourceLike;
    if(adminUi.inventoryFilter === "resources") return entry.resourceLike;
    return true;
  });
  const selected = selectedInventoryEntry(inventory);
  const ship = inventory.activeShip;
  const deleting = adminUi.action === "inventory-remove" && selected;
  return `<section class="admin-section admin-inventory-section">
    <div class="admin-section-head">
      <div><span class="tiny">INVENTAIRE JOUEUR</span><h3>${escapeHtml(ship?.name || "Vaisseau inconnu")}</h3></div>
      <div class="admin-inventory-counts">
        <b>${fmt(inventory.totals?.items || 0)} objets</b>
        <span>${fmt(inventory.totals?.equipped || 0)} equipes</span>
      </div>
    </div>
    <div class="admin-inventory-layout">
      <article class="admin-ship-mini">
        ${ship?.img ? `<img src="${escapeHtml(ship.img)}" alt="${escapeHtml(ship.name || "Vaisseau")}">` : ""}
        <div>
          <strong>${escapeHtml(ship?.name || "Vaisseau inconnu")}</strong>
          <span>${escapeHtml(ship?.className || "Profil non synchronise")}</span>
          <small>${ship?.stats ? `${fmt(ship.stats.vie || 0)} PV - ${fmt(ship.stats.vitesse || 0)} vitesse - ${fmt(ship.stats.cargo || 0)} cargo` : ""}</small>
        </div>
      </article>
      <div class="admin-inventory-browser">
        <div class="admin-inventory-tabs">
          ${[
            ["all", "TOUT"],
            ["equipment", "EQUIPEMENT"],
            ["resources", "RESSOURCES"]
          ].map(([value, label])=>`<button class="${adminUi.inventoryFilter === value ? "active" : ""}" data-admin-inventory-filter="${value}" type="button">${label}</button>`).join("")}
        </div>
        <div class="admin-inventory-grid">
          ${entries.map(entry=>`<button class="admin-inventory-cell ${entry.equipped ? "equipped" : ""} ${adminUi.selectedInventory?.key === inventoryEntryKey(entry) ? "active" : ""}"
              data-admin-inventory-select
              data-admin-inventory-source="${escapeHtml(entry.source)}"
              data-admin-inventory-id="${escapeHtml(entry.uid || entry.id)}"
              type="button">
            ${entry.img ? `<img src="${escapeHtml(entry.img)}" alt="">` : `<span class="admin-inventory-placeholder">?</span>`}
            <strong>${escapeHtml(entry.short || entry.name || entry.id)}</strong>
            <b>x${fmt(entry.quantity || 1)}</b>
            ${entry.equipped ? `<em>EQUIPE</em>` : ""}
          </button>`).join("") || `<div class="admin-empty">Aucun objet dans ce filtre.</div>`}
        </div>
      </div>
      <aside class="admin-inventory-selected">
        ${selected ? `<div class="admin-selected-item">
          ${selected.img ? `<img src="${escapeHtml(selected.img)}" alt="">` : `<span class="admin-inventory-placeholder">?</span>`}
          <div>
            <strong>${escapeHtml(selected.name || selected.id)}</strong>
            <span>${escapeHtml(selected.category || selected.kind || "objet")} - x${fmt(selected.quantity || 1)}</span>
            ${selected.equipped ? `<span>Equipe sur ${escapeHtml(selected.equipped.location || "vaisseau")} ${selected.equipped.index !== undefined ? `#${fmt(Number(selected.equipped.index) + 1)}` : ""}</span>` : ""}
            ${renderInventoryStats(selected)}
          </div>
          ${!deleting && canUseAdminAction("inventory-remove") ? `<button class="blue-button danger small" data-admin-prepare-inventory-remove type="button">SUPPRIMER</button>` : ""}
        </div>` : `<span>Selectionne un objet ou une ressource.</span>`}
        ${deleting ? `<div class="admin-inventory-delete">
          <strong>Suppression definitive</strong>
          <span>${escapeHtml(selected.name || selected.id)} x${fmt(selected.quantity || 1)}</span>
          <textarea id="adminInventoryDeleteReason" maxlength="240" placeholder="Raison obligatoire pour l'audit">${escapeHtml(adminUi.inventoryDeleteReason)}</textarea>
          <div class="admin-action-buttons">
            <button class="blue-button danger small" data-admin-confirm-inventory-remove type="button">CONFIRMER</button>
            <button class="blue-button secondary small" data-admin-cancel-action type="button">ANNULER</button>
          </div>
        </div>` : ""}
      </aside>
    </div>
  </section>`;
}

function renderDetails(){
  const target = selectedTarget();
  if(!target) return `<div class="admin-detail-empty">Selectionne un joueur.</div>`;
  const inspect = inspectMatchesTarget(multiplayer.admin?.inspect, target) ? multiplayer.admin.inspect : null;
  const details = inspect?.details || null;
  const profile = inspect?.profile || target;
  const activity = inspect?.activity || {};
  const suspicion = activity.suspicion || profile?.suspicion || target.suspicion || {suspicious:false, reasons:[]};
  const progression = details?.progression || {};
  const inventory = inspect?.inventory || {};
  const logs = activity.logs || [];
  const kills = activity.kills || [];
  return `<div class="admin-detail-scroll">
    <section class="admin-detail-hero ${suspicion.suspicious ? "suspect" : ""}">
      <div>
        <span class="tiny">${target.status === "online" ? "JOUEUR CONNECTE" : "PROFIL SAUVEGARDE"}</span>
        <h2>${escapeHtml(target.name || profile?.name || "Pilote")}</h2>
        <p>${escapeHtml(staffLabel(target.role || "player"))} - Niv. ${fmt(target.level || profile?.level || 1)} - ${escapeHtml(target.firmId || profile?.firmId || "astra")}</p>
      </div>
      <strong>${suspicion.suspicious ? "A VERIFIER" : "RAS"}</strong>
    </section>
    <section class="admin-stat-grid">
      ${renderStat("Etat", target.status === "online" ? `Connecte${target.sessionCount > 1 ? ` (${target.sessionCount} fenetres)` : ""}` : "Deconnecte")}
      ${renderStat("Map", target.mapId || "--")}
      ${renderStat("HP", target.maxHp ? `${fmt(target.hp || 0)} / ${fmt(target.maxHp)}` : "--")}
      ${renderStat(currencyIconHtml("credits"), fmt(target.credits || profile?.credits || 0), "", true)}
      ${renderStat(currencyIconHtml("premium"), fmt(target.premium || profile?.premium || 0), "", true)}
      ${renderStat("XP totale", fmt(target.totalXp || profile?.totalXp || 0))}
      ${renderStat("Temps", formatHours(progression.playSeconds))}
      ${renderStat("Kills", fmt(progression.totalKills || target.totalKills || 0))}
    </section>
    <section class="admin-actions-row">
      <button class="blue-button secondary small" data-admin-jump-logs type="button">Logs / suspicion</button>
      ${target.targetId && canUseAdminAction("kick") ? `<button class="blue-button small" data-admin-prepare-action="kick" type="button">Kick</button>` : ""}
      ${(target.targetId || target.profileKey) && canUseAdminAction("adjust") ? `<button class="blue-button small" data-admin-prepare-action="adjust" type="button">Correction</button>` : ""}
      ${(target.targetId || target.profileKey) && canUseAdminAction("grant") ? `<button class="blue-button small" data-admin-prepare-action="grant" type="button">Donner</button>` : ""}
      ${target.accountId && canUseAdminAction("mute") ? `<button class="blue-button small" data-admin-prepare-action="mute" type="button">Mute</button>` : ""}
      ${target.accountId && canUseAdminAction("ban") ? `<button class="blue-button danger small" data-admin-prepare-action="ban" type="button">Ban</button>` : ""}
      ${target.accountId && canUseAdminAction("unmute") ? `<button class="blue-button secondary small" data-admin-prepare-action="unmute" type="button">Unmute</button>` : ""}
      ${target.accountId && canUseAdminAction("unban") ? `<button class="blue-button secondary small" data-admin-prepare-action="unban" type="button">Unban</button>` : ""}
    </section>
    ${renderActionForm(target)}
    ${renderGrantForm(target, inventory)}
    ${renderAdminInventory(target, inventory)}
    <section class="admin-section">
      <div class="admin-section-head"><span class="tiny">SUSPICION</span><h3>Analyse automatique</h3></div>
      <div class="admin-suspicion-box ${suspicion.suspicious ? "suspect" : ""}">
        <strong>${suspicion.suspicious ? `Score ${Math.round(suspicion.score || 0)}` : "Aucun signal automatique"}</strong>
        ${(suspicion.reasons || []).map(reason=>`<p>${escapeHtml(reason)}</p>`).join("") || "<p>Rien d'anormal avec les regles actuelles.</p>"}
      </div>
    </section>
    <section class="admin-section">
      <div class="admin-section-head"><span class="tiny">MOBS TUES</span><h3>Bestiaire joueur</h3></div>
      <div class="admin-kill-list">${kills.map(kill=>`<div><span>${escapeHtml(kill.name)}</span><b>${fmt(kill.count)}</b></div>`).join("") || "<p>Aucun kill enregistre.</p>"}</div>
    </section>
    <section class="admin-section">
      <div class="admin-section-head"><span class="tiny">LOGS</span><h3>Activite connue</h3></div>
      <div class="admin-log-list">${logs.map(log=>`<article class="${escapeHtml(log.severity || "info")}">
        <strong>${escapeHtml(log.label)}</strong>
        <span>${escapeHtml(log.detail)}</span>
        ${log.at ? `<small>${formatDate(log.at)}</small>` : ""}
      </article>`).join("") || "<p>Aucun log detaille pour ce profil.</p>"}</div>
    </section>
  </div>`;
}

function renderGroups(snapshot){
  const groups = snapshot?.groups || [];
  if(!groups.length) return "";
  return `<section class="admin-groups">
    <div class="admin-section-head"><span class="tiny">GROUPES</span><h3>Instances</h3></div>
    ${groups.map(group=>`<div class="admin-group-row">
      <span>${escapeHtml(group.id)} - ${group.members?.length || 0} membre(s)</span>
      <b>${group.instance ? `Instance ${group.instance.id || "--"} - vague ${group.instance.wave || 0}` : "Aucune instance"}</b>
      ${group.instance && canUseAdminAction("reset-instance") ? `<button class="blue-button secondary small" data-admin-reset-instance="${escapeHtml(group.id)}" type="button">Reset</button>` : ""}
    </div>`).join("")}
  </section>`;
}

function renderPanel(){
  let root = document.getElementById("adminPanelRoot");
  if(!root){
    root = document.createElement("div");
    root.id = "adminPanelRoot";
    document.body.appendChild(root);
  }
  if(!canUseAdminPanel() || !adminUi.open){
    root.innerHTML = "";
    return;
  }
  const snapshot = multiplayer.admin?.snapshot || null;
  const rows = buildRows();
  const totals = snapshot?.totals || {};
  root.innerHTML = `<div class="admin-modal-backdrop">
    <section class="admin-modal frame">
      <header class="admin-modal-head">
        <div><span class="tiny">OUTILS STAFF</span><h2>Panel admin</h2></div>
        <div class="admin-head-actions">
          <button class="blue-button small" data-admin-refresh type="button">${multiplayer.admin.pending ? "SYNC..." : "RAFRAICHIR"}</button>
          <button class="blue-button secondary small" data-admin-close type="button">FERMER</button>
        </div>
      </header>
      <div class="admin-summary-strip">
        ${renderStat("Sockets", fmt(totals.sockets || 0))}
        ${renderStat("Online", fmt(totals.online || 0))}
        ${renderStat("En jeu", fmt(totals.game || 0))}
        ${renderStat("Profils", fmt(totals.profiles || 0))}
        ${renderStat("Instances", fmt(totals.instances || 0))}
      </div>
      ${multiplayer.admin.error ? `<div class="admin-error">${escapeHtml(multiplayer.admin.error)}</div>` : ""}
      <div class="admin-layout">
        <aside class="admin-list-panel">
          <div class="admin-filter-tabs">
            ${[
              ["all", "TOUS"],
              ["online", "CONNECTES"],
              ["offline", "DECONNECTES"],
              ["suspects", "SUSPECTS"]
            ].map(([filter, label])=>`<button class="${adminUi.filter === filter ? "active" : ""}" data-admin-filter="${filter}" type="button">${label}</button>`).join("")}
          </div>
          <input class="admin-search" data-admin-search value="${escapeHtml(adminUi.query)}" placeholder="Chercher pseudo / compte">
          <div class="admin-player-list">${renderRows(rows)}</div>
          ${renderGroups(snapshot)}
        </aside>
        <main class="admin-detail-panel">${renderDetails()}</main>
      </div>
    </section>
  </div>`;
}

export function renderAdminPanel(){
  renderDock();
  renderPanel();
}

export function handleAdminPanelClick(event, {showToast, renderAll} = {}){
  const open = event.target.closest("[data-admin-open]");
  if(open){
    adminUi.open = true;
    requestSnapshot();
    renderAll?.();
    return true;
  }
  if(!adminUi.open) return false;
  if(event.target.closest("[data-admin-close]")){
    adminUi.open = false;
    adminUi.action = null;
    renderAll?.();
    return true;
  }
  if(event.target.closest("[data-admin-refresh]")){
    if(!requestSnapshot()) showToast?.("Connexion serveur requise pour synchroniser le panel admin.");
    renderAll?.();
    return true;
  }
  const filter = event.target.closest("[data-admin-filter]");
  if(filter){
    adminUi.filter = filter.dataset.adminFilter || "all";
    renderAll?.();
    return true;
  }
  const selected = event.target.closest("[data-admin-select]");
  if(selected){
    adminUi.selected = {
      key:selected.dataset.adminKey || "",
      profileKey:selected.dataset.adminProfileKey || "",
      targetId:selected.dataset.adminTargetId || "",
      accountId:selected.dataset.adminAccountId || "",
      name:selected.querySelector("strong")?.textContent || "Pilote"
    };
    adminUi.action = null;
    adminUi.selectedInventory = null;
    resetActionDraft();
    resetInventoryDeleteDraft();
    resetGrantDraft();
    setPending(true);
    multiplayer.admin.inspect = null;
    const sent = inspectAdminPlayer({
      targetId:adminUi.selected.targetId,
      accountId:adminUi.selected.accountId,
      profileKey:adminUi.selected.profileKey
    });
    if(!sent) setPending(false);
    renderAll?.();
    return true;
  }
  if(event.target.closest("[data-admin-jump-logs]")){
    document.querySelector(".admin-log-list")?.scrollIntoView({block:"nearest"});
    return true;
  }
  const inventoryFilter = event.target.closest("[data-admin-inventory-filter]");
  if(inventoryFilter){
    adminUi.inventoryFilter = inventoryFilter.dataset.adminInventoryFilter || "all";
    renderAll?.();
    return true;
  }
  const inventorySelect = event.target.closest("[data-admin-inventory-select]");
  if(inventorySelect){
    adminUi.selectedInventory = {
      source:inventorySelect.dataset.adminInventorySource || "inventory",
      id:inventorySelect.dataset.adminInventoryId || "",
      key:`${inventorySelect.dataset.adminInventorySource || "inventory"}:${inventorySelect.dataset.adminInventoryId || ""}`
    };
    adminUi.action = null;
    resetActionDraft();
    resetInventoryDeleteDraft();
    resetGrantDraft();
    renderAll?.();
    return true;
  }
  if(event.target.closest("[data-admin-prepare-inventory-remove]")){
    if(adminUi.action !== "inventory-remove") resetInventoryDeleteDraft();
    resetActionDraft();
    resetGrantDraft();
    adminUi.action = "inventory-remove";
    renderAll?.();
    return true;
  }
  if(event.target.closest("[data-admin-confirm-inventory-remove]")){
    const target = selectedTarget();
    const selectedInventory = adminUi.selectedInventory;
    const reason = document.getElementById("adminInventoryDeleteReason")?.value ?? adminUi.inventoryDeleteReason;
    adminUi.inventoryDeleteReason = reason || "";
    if(!selectedInventory?.id) return true;
    if(reason.trim().length < 4){
      showToast?.("Raison admin obligatoire.");
      return true;
    }
    setPending(true);
    const sent = removeAdminInventoryItem({
      targetId:target?.targetId,
      accountId:target?.accountId,
      profileKey:target?.profileKey,
      source:selectedInventory.source,
      inventoryUid:selectedInventory.source === "inventory" ? selectedInventory.id : "",
      resourceId:selectedInventory.source === "resource" ? selectedInventory.id : "",
      reason
    });
    if(!sent) setPending(false);
    adminUi.action = null;
    adminUi.selectedInventory = null;
    resetInventoryDeleteDraft();
    renderAll?.();
    return true;
  }
  const grantPick = event.target.closest("[data-admin-grant-pick]");
  if(grantPick){
    adminUi.grantId = grantPick.dataset.adminGrantPick || "";
    renderAll?.();
    return true;
  }
  if(event.target.closest("[data-admin-confirm-grant]")){
    const target = selectedTarget();
    const selected = ensureGrantSelection();
    const reason = document.getElementById("adminGrantReason")?.value ?? adminUi.grantReason;
    const type = document.getElementById("adminGrantType")?.value || adminUi.grantType || "item";
    const amount = type === "ship" || type === "formation"
      ? 1
      : Number(document.getElementById("adminGrantAmount")?.value || adminUi.grantAmount || 1);
    const destination = document.getElementById("adminGrantDestination")?.value || adminUi.grantDestination || "cargoHold";
    const shipId = document.getElementById("adminGrantShipId")?.value || adminUi.grantShipId || "";
    adminUi.grantReason = reason || "";
    adminUi.grantAmount = String(amount || 1);
    if(!selected?.id){
      showToast?.("Selectionne un objet a donner.");
      return true;
    }
    if(reason.trim().length < 4){
      showToast?.("Raison admin obligatoire.");
      return true;
    }
    setPending(true);
    const sent = grantAdminPlayer({
      targetId:target?.targetId,
      accountId:target?.accountId,
      profileKey:target?.profileKey,
      type,
      id:selected.id,
      amount,
      destination,
      shipId,
      reason
    });
    if(!sent) setPending(false);
    adminUi.action = null;
    resetGrantDraft();
    renderAll?.();
    return true;
  }
  const prepare = event.target.closest("[data-admin-prepare-action]");
  if(prepare){
    const action = prepare.dataset.adminPrepareAction || "";
    if(ADMIN_ACTIONS.has(action)){
      if(adminUi.action !== action){
        resetActionDraft();
        if(action === "grant") resetGrantDraft();
      }
      resetInventoryDeleteDraft();
      if(action !== "grant") resetGrantDraft();
      adminUi.action = action;
      renderAll?.();
      return true;
    }
  }
  if(event.target.closest("[data-admin-cancel-action]")){
    adminUi.action = null;
    resetActionDraft();
    resetInventoryDeleteDraft();
    resetGrantDraft();
    renderAll?.();
    return true;
  }
  const confirm = event.target.closest("[data-admin-confirm-action]");
  if(confirm){
    const action = confirm.dataset.adminConfirmAction || "";
    const target = selectedTarget();
    const reason = document.getElementById("adminActionReason")?.value ?? adminUi.actionReason;
    adminUi.actionReason = reason || "";
    const durationMinutes = Number(document.getElementById("adminActionDuration")?.value || adminUi.actionDuration || 0);
    if((action === "kick" || action === "ban" || action === "mute" || action === "adjust") && reason.trim().length < 4){
      showToast?.("Raison admin obligatoire.");
      return true;
    }
    setPending(true);
    let sent = false;
    if(action === "kick"){
      sent = kickAdminPlayer({targetId:target?.targetId, accountId:target?.accountId, reason});
    }else if(action === "adjust"){
      const field = document.getElementById("adminAdjustField")?.value || adminUi.adjustField || "credits";
      const mode = document.getElementById("adminAdjustMode")?.value || adminUi.adjustMode || "add";
      const amount = Number(document.getElementById("adminAdjustAmount")?.value || adminUi.adjustAmount || 0);
      sent = adjustAdminPlayer({
        targetId:target?.targetId,
        profileKey:target?.profileKey,
        field,
        mode,
        amount,
        reason
      });
    }else{
      sent = moderateAdminAccount({accountId:target?.accountId, action, durationMinutes, reason});
    }
    if(!sent) setPending(false);
    adminUi.action = null;
    resetActionDraft();
    renderAll?.();
    return true;
  }
  const resetInstance = event.target.closest("[data-admin-reset-instance]");
  if(resetInstance){
    const reason = window.prompt("Raison du reset instance ?", "Instance bloquee");
    if(!reason) return true;
    resetAdminInstance({groupId:resetInstance.dataset.adminResetInstance, reason});
    renderAll?.();
    return true;
  }
  return false;
}

export function handleAdminPanelInput(event, {renderAll} = {}){
  const search = event.target.closest("[data-admin-search]");
  if(search){
    adminUi.query = search.value || "";
    renderAll?.();
    return true;
  }
  const actionReason = event.target.closest("#adminActionReason");
  if(actionReason){
    adminUi.actionReason = actionReason.value || "";
    return true;
  }
  const deleteReason = event.target.closest("#adminInventoryDeleteReason");
  if(deleteReason){
    adminUi.inventoryDeleteReason = deleteReason.value || "";
    return true;
  }
  const adjustAmount = event.target.closest("#adminAdjustAmount");
  if(adjustAmount){
    adminUi.adjustAmount = adjustAmount.value || "";
    return true;
  }
  const grantQuery = event.target.closest("#adminGrantQuery");
  if(grantQuery){
    adminUi.grantQuery = grantQuery.value || "";
    renderAll?.();
    return true;
  }
  const grantAmount = event.target.closest("#adminGrantAmount");
  if(grantAmount){
    adminUi.grantAmount = grantAmount.value || "";
    return true;
  }
  const grantReason = event.target.closest("#adminGrantReason");
  if(grantReason){
    adminUi.grantReason = grantReason.value || "";
    return true;
  }
  return false;
}

export function handleAdminPanelChange(event, {renderAll} = {}){
  const duration = event.target.closest("#adminActionDuration");
  if(duration){
    adminUi.actionDuration = duration.value || "10";
    return true;
  }
  const adjustField = event.target.closest("#adminAdjustField");
  if(adjustField){
    adminUi.adjustField = adjustField.value || "credits";
    return true;
  }
  const adjustMode = event.target.closest("#adminAdjustMode");
  if(adjustMode){
    adminUi.adjustMode = adjustMode.value || "add";
    return true;
  }
  const grantType = event.target.closest("#adminGrantType");
  if(grantType){
    adminUi.grantType = grantType.value || "item";
    adminUi.grantId = "";
    adminUi.grantQuery = "";
    adminUi.grantAmount = "1";
    adminUi.grantDestination = "cargoHold";
    adminUi.grantShipId = "";
    renderAll?.();
    return true;
  }
  const grantDestination = event.target.closest("#adminGrantDestination");
  if(grantDestination){
    adminUi.grantDestination = grantDestination.value || "cargoHold";
    renderAll?.();
    return true;
  }
  const grantShipId = event.target.closest("#adminGrantShipId");
  if(grantShipId){
    adminUi.grantShipId = grantShipId.value || "";
    return true;
  }
  return false;
}

export function handleAdminPanelServerChange(reason){
  if(!String(reason || "").startsWith("admin:")) return false;
  if(["admin:kicked", "admin:moderated", "admin:adjusted", "admin:granted", "admin:inventory-removed", "admin:instance-reset"].includes(reason)) requestSnapshot();
  if(["admin:granted", "admin:inventory-removed"].includes(reason) && adminUi.selected){
    inspectAdminPlayer({
      targetId:adminUi.selected.targetId,
      accountId:adminUi.selected.accountId,
      profileKey:adminUi.selected.profileKey
    });
  }
  return adminUi.open;
}
