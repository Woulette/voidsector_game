import crypto from "node:crypto";
import {
  findAccountByEmail,
  findAccountByUsername,
  saveAccount
} from "../storage/authStore.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_ALGO = "scrypt";
const PASSWORD_KEYLEN = 64;

function cleanEmail(value){
  return String(value || "").trim().toLowerCase();
}

function cleanUsername(value){
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 24);
}

function publicAccount(account){
  if(!account) return null;
  return {
    id:account.id,
    email:account.email,
    username:account.username,
    role:account.role || "player",
    createdAt:account.createdAt,
    lastLoginAt:account.lastLoginAt || null,
    bannedUntil:Math.max(0, Number(account.bannedUntil || 0)),
    banReason:String(account.banReason || ""),
    mutedUntil:Math.max(0, Number(account.mutedUntil || 0)),
    muteReason:String(account.muteReason || "")
  };
}

export function isAccountBanned(account, at = Date.now()){
  return Math.max(0, Number(account?.bannedUntil || 0)) > at;
}

export function isAccountMuted(account, at = Date.now()){
  return Math.max(0, Number(account?.mutedUntil || 0)) > at;
}

function moderationDateText(timestamp){
  if(!timestamp) return "";
  return new Date(timestamp).toLocaleString("fr-FR");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")){
  const hash = crypto.scryptSync(String(password || ""), salt, PASSWORD_KEYLEN).toString("hex");
  return `${PASSWORD_ALGO}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash){
  const [algo, salt, expected] = String(storedHash || "").split(":");
  if(algo !== PASSWORD_ALGO || !salt || !expected) return false;
  const actual = crypto.scryptSync(String(password || ""), salt, PASSWORD_KEYLEN);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export async function registerAccount({email, username, password} = {}){
  const cleanMail = cleanEmail(email);
  const cleanName = cleanUsername(username);
  const rawPassword = String(password || "");

  if(!EMAIL_RE.test(cleanMail)) throw new Error("Email invalide.");
  if(cleanName.length < 3) throw new Error("Pseudo trop court.");
  if(rawPassword.length < 8) throw new Error("Mot de passe trop court.");
  if(await findAccountByEmail(cleanMail)) throw new Error("Email deja utilise.");
  if(await findAccountByUsername(cleanName)) throw new Error("Pseudo deja utilise.");

  const now = Date.now();
  const account = {
    id:crypto.randomUUID(),
    email:cleanMail,
    username:cleanName,
    usernameKey:cleanName.toLowerCase(),
    passwordHash:hashPassword(rawPassword),
    role:"player",
    createdAt:now,
    lastLoginAt:now,
    bannedUntil:0,
    banReason:"",
    mutedUntil:0,
    muteReason:""
  };
  await saveAccount(account);
  return publicAccount(account);
}

export async function loginAccount({login, password} = {}){
  const cleanLogin = String(login || "").trim();
  const account = cleanLogin.includes("@")
    ? await findAccountByEmail(cleanLogin)
    : await findAccountByUsername(cleanLogin);
  if(!account || !verifyPassword(password, account.passwordHash)) throw new Error("Identifiants invalides.");
  if(isAccountBanned(account)){
    throw new Error(`Compte banni jusqu'au ${moderationDateText(account.bannedUntil)}.`);
  }
  account.lastLoginAt = Date.now();
  await saveAccount(account);
  return publicAccount(account);
}

export { publicAccount };
