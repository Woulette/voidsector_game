import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { writeJsonAtomically } from "../src/storage/authStore.js";

test("auth JSON writes are atomic and leave valid JSON on disk", ()=>{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "voidsector-auth-store-"));
  const dataDirUrl = pathToFileURL(`${tempDir}${path.sep}`);
  const targetUrl = pathToFileURL(path.join(tempDir, "accounts.json"));

  writeJsonAtomically(targetUrl, {account1:{id:"account1"}}, {dataDirUrl});
  writeJsonAtomically(targetUrl, {account2:{id:"account2"}}, {dataDirUrl});

  assert.deepEqual(JSON.parse(fs.readFileSync(targetUrl, "utf8")), {
    account2:{id:"account2"}
  });
  assert.deepEqual(
    fs.readdirSync(tempDir).filter(file=>file.includes(".tmp")),
    []
  );

  fs.rmSync(tempDir, {recursive:true, force:true});
});

test("auth JSON write failures remove the temporary file and surface the error", ()=>{
  const calls = [];
  const fileSystem = {
    mkdirSync(){ calls.push("mkdir"); },
    openSync(){ calls.push("open"); return 7; },
    writeFileSync(){ calls.push("write"); throw new Error("disk full"); },
    closeSync(){ calls.push("close"); },
    rmSync(url){ calls.push(`rm:${String(url.pathname || "")}`); },
    renameSync(){ calls.push("rename"); }
  };

  assert.throws(
    ()=>writeJsonAtomically(
      new URL("file:///tmp/accounts.json"),
      {account1:{id:"account1"}},
      {dataDirUrl:new URL("file:///tmp/"), fileSystem}
    ),
    /disk full/
  );

  assert.deepEqual(calls.slice(0, 4), ["mkdir", "open", "write", "close"]);
  assert.equal(calls.length, 5);
  assert.equal(calls[4].startsWith("rm:/tmp/accounts.json."), true);
  assert.equal(calls[4].endsWith(".tmp"), true);
});
