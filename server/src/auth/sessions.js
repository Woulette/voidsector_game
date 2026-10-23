import crypto from "node:crypto";
import {
  deleteExpiredSessions,
  deleteSession,
  deleteSessionsForAccount,
  findAccountById,
  findSessionByTokenHash,
  saveSession
} from "../storage/authStore.js";
import { isAccountBanned, publicAccount } from "./accounts.js";
import { createSessionCleanupScheduler } from "./sessionCleanup.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const expiredSessionCleanup = createSessionCleanupScheduler({
  deleteExpired:deleteExpiredSessions
});

function tokenHash(token){
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export async function createSession(accountId){
  await expiredSessionCleanup.cleanup();
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const session = {
    id:crypto.randomUUID(),
    accountId,
    tokenHash:tokenHash(token),
    createdAt:now,
    expiresAt:now + SESSION_TTL_MS
  };
  await saveSession(session);
  return {
    token,
    expiresAt:session.expiresAt
  };
}

export async function getSessionAccount(token){
  await expiredSessionCleanup.cleanup();
  const session = await findSessionByTokenHash(tokenHash(token));
  if(!session) return null;
  if(Number(session.expiresAt || 0) <= Date.now()){
    await deleteSession(session.id);
    return null;
  }
  const account = await findAccountById(session.accountId);
  if(!account){
    await deleteSession(session.id);
    return null;
  }
  if(isAccountBanned(account)){
    await deleteSession(session.id);
    return null;
  }
  return {
    sessionId:session.id,
    expiresAt:session.expiresAt,
    account:publicAccount(account)
  };
}

export async function revokeSessionByToken(token){
  const session = await findSessionByTokenHash(tokenHash(token));
  if(session) await deleteSession(session.id);
}

export async function revokeSessionsForAccount(accountId){
  await deleteSessionsForAccount(accountId);
}
