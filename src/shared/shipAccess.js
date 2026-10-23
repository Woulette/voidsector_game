// Compatibility entrypoint for clients that still have an older render module cached.
export {
  canAccountRoleAccessShip,
  getShipAllowedRoles,
  getShipRoleLockReason,
  normalizeShipAccessRole
} from "../data/ships.js?v=20260726-imperial2";
