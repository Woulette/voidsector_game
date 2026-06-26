#!/usr/bin/env node
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { registerAccount } from "../src/auth/accounts.js";
import { closeDatabase, initializeDatabase } from "../src/db/client.js";
import {
  findAccountByEmail,
  findAccountById,
  findAccountByUsername,
  saveAccount
} from "../src/storage/authStore.js";

const ALLOWED_ROLES = new Set(["moderator", "admin", "owner"]);

function readArg(argv, name){
  const prefix = `${name}=`;
  const direct = argv.find(arg=>String(arg || "").startsWith(prefix));
  if(direct) return direct.slice(prefix.length);
  const index = argv.indexOf(name);
  if(index >= 0 && index + 1 < argv.length) return argv[index + 1];
  return "";
}

function hasFlag(argv, name){
  return argv.includes(name);
}

function clean(value){
  return String(value || "").trim();
}

function cleanEmail(value){
  return clean(value).toLowerCase();
}

function cleanRole(value){
  const role = clean(value || "owner").toLowerCase();
  if(!ALLOWED_ROLES.has(role)){
    throw new Error("Role invalide. Utilise moderator, admin ou owner.");
  }
  return role;
}

export function parseAdminBootstrapArgs(argv = [], env = process.env){
  const login = readArg(argv, "--login") || env.ADMIN_BOOTSTRAP_LOGIN || "";
  const email = readArg(argv, "--email") || env.ADMIN_BOOTSTRAP_EMAIL || (String(login).includes("@") ? login : "");
  const username = readArg(argv, "--username") || env.ADMIN_BOOTSTRAP_USERNAME || (!String(login).includes("@") ? login : "");
  return {
    accountId:readArg(argv, "--account-id") || env.ADMIN_BOOTSTRAP_ACCOUNT_ID || "",
    email:cleanEmail(email),
    username:clean(username),
    password:readArg(argv, "--password") || env.ADMIN_BOOTSTRAP_PASSWORD || "",
    role:cleanRole(readArg(argv, "--role") || env.ADMIN_BOOTSTRAP_ROLE || "owner"),
    create:hasFlag(argv, "--create") || String(env.ADMIN_BOOTSTRAP_CREATE || "").toLowerCase() === "true",
    yes:hasFlag(argv, "--yes") || String(env.ADMIN_BOOTSTRAP_YES || "").toLowerCase() === "true"
  };
}

async function resolveAccount(config, store){
  if(config.accountId) return store.findAccountById(config.accountId);
  if(config.email) return store.findAccountByEmail(config.email);
  if(config.username) return store.findAccountByUsername(config.username);
  return null;
}

export async function bootstrapAdminAccount(config = {}, store = {}){
  const role = cleanRole(config.role || "owner");
  if(!config.yes) throw new Error("Ajoute --yes pour confirmer la promotion admin.");

  const api = {
    findAccountById,
    findAccountByEmail,
    findAccountByUsername,
    registerAccount,
    saveAccount,
    ...store
  };

  let account = await resolveAccount(config, api);
  let created = false;
  if(!account && config.create){
    if(!config.email || !config.username || !config.password){
      throw new Error("--create demande --email, --username et --password.");
    }
    await api.registerAccount({
      email:config.email,
      username:config.username,
      password:config.password
    });
    account = await api.findAccountByEmail(config.email);
    created = true;
  }
  if(!account){
    throw new Error("Compte introuvable. Cree le compte, ou utilise --create.");
  }
  if(!account.passwordHash){
    throw new Error("Compte incomplet: impossible de sauvegarder le role sans passwordHash.");
  }

  const previousRole = String(account.role || "player");
  account.role = role;
  await api.saveAccount(account);
  return {
    ok:true,
    created,
    account:{
      id:account.id,
      email:account.email,
      username:account.username,
      previousRole,
      role
    }
  };
}

export async function main(argv = process.argv.slice(2), env = process.env, options = {}){
  const config = parseAdminBootstrapArgs(argv, env);
  await (options.initializeDatabase || initializeDatabase)();
  try{
    const result = await bootstrapAdminAccount(config, options.store);
    if(options.logger) options.logger.log(`Admin bootstrap OK: ${result.account.username} (${result.account.email}) role=${result.account.role}`);
    else console.log(JSON.stringify(result, null, 2));
    return 0;
  }finally{
    await (options.closeDatabase || closeDatabase)();
  }
}

if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  main().then(code=>process.exit(code)).catch(error=>{
    console.error(`Admin bootstrap FAILED: ${error?.message || String(error)}`);
    process.exit(1);
  });
}
