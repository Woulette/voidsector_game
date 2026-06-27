import assert from "node:assert/strict";
import test from "node:test";
import { createPlatformAuthClient } from "../src/auth/platformAuthClient.js";

function jsonResponse(payload, status = 200){
  return {
    ok:status >= 200 && status < 300,
    status,
    async json(){
      return payload;
    }
  };
}

test("platform auth client calls Absyrion auth routes and normalizes payloads", async ()=>{
  const calls = [];
  const client = createPlatformAuthClient({
    baseUrl:"https://api.absyrion.com/",
    fetchImpl:async (url, options)=>{
      calls.push({url, options});
      return jsonResponse({
        ok:true,
        account:{id:"account-1", username:"Pilot", email:"pilot@example.com"},
        token:"token-1",
        expiresAt:123
      });
    }
  });

  const result = await client.login({login:"Pilot", password:"secret"});

  assert.equal(result.account.id, "account-1");
  assert.equal(result.token, "token-1");
  assert.equal(result.session.token, "token-1");
  assert.equal(calls[0].url, "https://api.absyrion.com/platform/auth/login");
  assert.equal(calls[0].options.method, "POST");
});

test("platform auth client forwards bearer tokens for session restore", async ()=>{
  const calls = [];
  const client = createPlatformAuthClient({
    baseUrl:"https://api.absyrion.com",
    fetchImpl:async (url, options)=>{
      calls.push({url, options});
      return jsonResponse({
        ok:true,
        account:{id:"account-1", username:"Pilot"},
        token:"token-1",
        expiresAt:456
      });
    }
  });

  await client.session("token-1");

  assert.equal(calls[0].url, "https://api.absyrion.com/platform/auth/session");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.authorization, "Bearer token-1");
});

test("platform auth client exposes server auth errors", async ()=>{
  const client = createPlatformAuthClient({
    baseUrl:"https://api.absyrion.com",
    fetchImpl:async ()=>jsonResponse({ok:false, message:"Identifiants invalides."}, 400)
  });

  await assert.rejects(
    ()=>client.login({login:"Pilot", password:"bad"}),
    /Identifiants invalides/
  );
});
