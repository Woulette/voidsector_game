import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import test from "node:test";
import {createPlatformAuthHttpHandler} from "../src/auth/platformHttpApi.js";

function createReq({method = "POST", url = "/platform/auth/login", origin = "https://absyrion.com", token = "", body = null} = {}){
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = {
    origin,
    ...(token ? {authorization:`Bearer ${token}`} : {})
  };
  req.setEncoding = ()=>{};
  req.destroy = ()=>{};
  queueMicrotask(()=>{
    if(body !== null) req.emit("data", JSON.stringify(body));
    req.emit("end");
  });
  return req;
}

function createRes(){
  return {
    statusCode:0,
    headers:null,
    body:"",
    writeHead(statusCode, headers){
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = ""){
      this.body = String(body || "");
    },
    json(){
      return this.body ? JSON.parse(this.body) : null;
    }
  };
}

function createFixture(){
  const sessions = [];
  const calls = [];
  const account = {
    id:"account-1",
    email:"player@absyrion.com",
    username:"Pilot",
    role:"player",
    createdAt:1000,
    lastLoginAt:1000
  };
  const handler = createPlatformAuthHttpHandler({
    allowedOrigin:["https://absyrion.com", "https://avosoma.absyrion.com"],
    async registerAccount(payload){
      calls.push(["register", payload]);
      return account;
    },
    async loginAccount(payload){
      calls.push(["login", payload]);
      if(payload?.login === "bad") throw new Error("Identifiants invalides.");
      return account;
    },
    async createSession(accountId){
      calls.push(["createSession", accountId]);
      const session = {token:`token-${sessions.length + 1}`, expiresAt:5000};
      sessions.push(session);
      return session;
    },
    async getSessionAccount(token){
      calls.push(["getSession", token]);
      if(token !== "token-1") return null;
      return {account, expiresAt:5000};
    },
    async revokeSessionByToken(token){
      calls.push(["revokeToken", token]);
    },
    async revokeSessionsForAccount(accountId){
      calls.push(["revokeAccount", accountId]);
    }
  });
  return {account, calls, handler};
}

test("platform auth login creates an Absyrion session with CORS for allowed origins", async ()=>{
  const fixture = createFixture();
  const req = createReq({body:{login:"player@absyrion.com", password:"secret123"}});
  const res = createRes();

  assert.equal(await fixture.handler(req, res), true);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["access-control-allow-origin"], "https://absyrion.com");
  assert.deepEqual(res.json(), {
    ok:true,
    account:fixture.account,
    token:"token-1",
    expiresAt:5000
  });
  assert.deepEqual(fixture.calls.map(call=>call[0]), ["login", "revokeAccount", "createSession"]);
});

test("platform auth session validates a bearer token", async ()=>{
  const fixture = createFixture();
  const req = createReq({method:"GET", url:"/platform/auth/session", token:"token-1", body:null});
  const res = createRes();

  assert.equal(await fixture.handler(req, res), true);

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().account.id, "account-1");
  assert.equal(res.json().token, "token-1");
});

test("platform auth refuses unknown origins before reading credentials", async ()=>{
  const fixture = createFixture();
  const req = createReq({origin:"https://evil.example", body:{login:"player@absyrion.com", password:"secret123"}});
  const res = createRes();

  assert.equal(await fixture.handler(req, res), true);

  assert.equal(res.statusCode, 403);
  assert.equal(res.json().message, "Origine refusee.");
  assert.equal(fixture.calls.length, 0);
});

test("platform auth keeps expected login errors public", async ()=>{
  const fixture = createFixture();
  const req = createReq({body:{login:"bad", password:"secret123"}});
  const res = createRes();

  assert.equal(await fixture.handler(req, res), true);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.json(), {ok:false, message:"Identifiants invalides."});
});
