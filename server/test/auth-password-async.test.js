import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/auth/accounts.js";

test("password hashing stays compatible while using the asynchronous scrypt API", async ()=>{
  const pendingHash = hashPassword("correct horse battery staple", "00112233445566778899aabbccddeeff");
  assert.equal(typeof pendingHash?.then, "function");
  const hash = await pendingHash;
  assert.match(hash, /^scrypt:00112233445566778899aabbccddeeff:[0-9a-f]+$/);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});
