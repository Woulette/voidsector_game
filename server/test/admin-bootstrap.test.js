import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapAdminAccount,
  parseAdminBootstrapArgs
} from "../tools/admin-bootstrap.js";

function makeStore(){
  const accounts = new Map([
    ["account-1", {
      id:"account-1",
      email:"pilot@example.com",
      username:"Pilot",
      usernameKey:"pilot",
      passwordHash:"scrypt:salt:hash",
      role:"player"
    }]
  ]);
  return {
    accounts,
    async findAccountById(id){
      return accounts.get(String(id || "")) || null;
    },
    async findAccountByEmail(email){
      return [...accounts.values()].find(account=>account.email === String(email || "").toLowerCase()) || null;
    },
    async findAccountByUsername(username){
      const key = String(username || "").toLowerCase();
      return [...accounts.values()].find(account=>account.usernameKey === key) || null;
    },
    async registerAccount({email, username}){
      const account = {
        id:"account-created",
        email:String(email || "").toLowerCase(),
        username:String(username || ""),
        usernameKey:String(username || "").toLowerCase(),
        passwordHash:"scrypt:new:hash",
        role:"player"
      };
      accounts.set(account.id, account);
      return {id:account.id, email:account.email, username:account.username, role:account.role};
    },
    async saveAccount(account){
      accounts.set(account.id, {...account});
      return account;
    }
  };
}

test("admin bootstrap args support login aliases and explicit confirmation", ()=>{
  const byEmail = parseAdminBootstrapArgs(["--login", "Pilot@Example.com", "--role", "admin", "--yes"], {});
  assert.equal(byEmail.email, "pilot@example.com");
  assert.equal(byEmail.username, "");
  assert.equal(byEmail.role, "admin");
  assert.equal(byEmail.yes, true);

  const byUsername = parseAdminBootstrapArgs(["--login=Pilot"], {});
  assert.equal(byUsername.email, "");
  assert.equal(byUsername.username, "Pilot");
  assert.equal(byUsername.role, "owner");

  assert.throws(
    ()=>parseAdminBootstrapArgs(["--role=player"], {}),
    /Role invalide/
  );
});

test("admin bootstrap promotes an existing account without changing its password hash", async ()=>{
  const store = makeStore();
  const result = await bootstrapAdminAccount({
    email:"pilot@example.com",
    role:"owner",
    yes:true
  }, store);

  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  assert.equal(result.account.previousRole, "player");
  assert.equal(store.accounts.get("account-1").role, "owner");
  assert.equal(store.accounts.get("account-1").passwordHash, "scrypt:salt:hash");
});

test("admin bootstrap can create an owner when explicitly requested", async ()=>{
  const store = makeStore();
  const result = await bootstrapAdminAccount({
    email:"owner@example.com",
    username:"Owner",
    password:"super-secret",
    role:"owner",
    create:true,
    yes:true
  }, store);

  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(store.accounts.get("account-created").role, "owner");
});

test("admin bootstrap fails closed without confirmation or a complete account", async ()=>{
  await assert.rejects(
    bootstrapAdminAccount({email:"pilot@example.com", role:"owner"}, makeStore()),
    /--yes/
  );

  const brokenStore = makeStore();
  brokenStore.accounts.get("account-1").passwordHash = "";
  await assert.rejects(
    bootstrapAdminAccount({email:"pilot@example.com", role:"owner", yes:true}, brokenStore),
    /Compte incomplet/
  );
});
