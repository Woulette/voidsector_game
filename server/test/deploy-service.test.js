import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SERVICE_URL = new URL("../deploy/voidsector.service", import.meta.url);
const INSTALL_URL = new URL("../deploy/install.sh", import.meta.url);
const DEPLOY_PS1_URL = new URL("../deploy/deploy.ps1", import.meta.url);

function parseService(text){
  const entries = new Map();
  for(const line of String(text || "").split(/\r?\n/)){
    const clean = line.trim();
    if(!clean || clean.startsWith("[") || clean.startsWith("#")) continue;
    const index = clean.indexOf("=");
    if(index <= 0) continue;
    entries.set(clean.slice(0, index), clean.slice(index + 1));
  }
  return entries;
}

test("systemd service gives the server time and descriptors for beta shutdown/load", async ()=>{
  const service = parseService(await readFile(fileURLToPath(SERVICE_URL), "utf8"));

  assert.equal(service.get("Restart"), "on-failure");
  assert.equal(service.get("RestartSec"), "5");
  assert.equal(service.get("KillSignal"), "SIGTERM");
  assert.equal(service.get("TimeoutStopSec"), "30");
  assert.equal(service.get("LimitNOFILE"), "65535");
  assert.equal(service.get("Environment"), "NODE_ENV=production");
  assert.equal(service.get("User"), "__SERVICE_USER__");
  assert.equal(service.get("WorkingDirectory"), "__SERVER_DIR__");
  assert.equal(service.get("ExecStart"), "/usr/bin/node __SERVER_DIR__/src/index.js");
});

test("deploy scripts are not locked to the old ubuntu home path", async ()=>{
  const install = await readFile(fileURLToPath(INSTALL_URL), "utf8");
  const deployPs1 = await readFile(fileURLToPath(DEPLOY_PS1_URL), "utf8");

  assert.match(install, /SERVICE_USER="\$\{SERVICE_USER:-\$\{SUDO_USER:-\$\(id -un\)\}\}"/);
  assert.match(install, /sed -i "s\|__SERVICE_USER__\|\$SERVICE_USER\|g"/);
  assert.match(install, /DB_NAME invalide/);
  assert.equal(install.includes('PROJECT_DIR="/home/ubuntu/voidsector"'), false);

  assert.match(deployPs1, /\[string\]\$RemoteDir = "~"/);
  assert.match(deployPs1, /"\$RemoteUser@\$\{ServerIp\}:\$RemoteDir\/"/);
  assert.equal(deployPs1.includes("/home/$RemoteUser/"), false);
});
