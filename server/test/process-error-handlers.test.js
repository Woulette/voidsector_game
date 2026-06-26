import assert from "node:assert/strict";
import test from "node:test";
import { createProcessErrorHandlers, installProcessErrorHandlers } from "../src/lifecycle/processErrorHandlers.js";

test("process error handlers record unhandled rejections without exiting", ()=>{
  const logs = [];
  const recorded = [];
  const exits = [];
  const handlers = createProcessErrorHandlers({
    logger:{
      error:(message, payload)=>logs.push({message, payload}),
      warn:(message, payload)=>logs.push({message, payload})
    },
    onError:error=>recorded.push(error),
    exit:code=>exits.push(code),
    now:()=>123
  });

  handlers.handleUnhandledRejection(new Error("background save rejected"));

  assert.equal(exits.length, 0);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].message, "[process] unhandledRejection");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].source, "process");
  assert.equal(recorded[0].eventName, "unhandledRejection");
  assert.equal(recorded[0].error.includes("background save rejected"), true);
  assert.equal(recorded[0].at, 123);
});

test("process error handlers shut down and exit after an uncaught exception", async ()=>{
  const recorded = [];
  const shutdownSignals = [];
  const exits = [];
  const handlers = createProcessErrorHandlers({
    logger:{error(){}, warn(){}},
    onError:error=>recorded.push(error),
    shutdown:async signal=>shutdownSignals.push(signal),
    exit:code=>exits.push(code),
    now:()=>456
  });

  await handlers.handleUncaughtException(new Error("fatal tick escape"));

  assert.deepEqual(shutdownSignals, ["uncaughtException"]);
  assert.deepEqual(exits, [1]);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].source, "process");
  assert.equal(recorded[0].eventName, "uncaughtException");
  assert.equal(recorded[0].error.includes("fatal tick escape"), true);
});

test("process error handlers record fatal shutdown failures before exiting", async ()=>{
  const recorded = [];
  const exits = [];
  const handlers = createProcessErrorHandlers({
    logger:{error(){}, warn(){}},
    onError:error=>recorded.push(error),
    shutdown:async ()=>{
      throw new Error("shutdown write failed");
    },
    exit:code=>exits.push(code),
    now:()=>789
  });

  await handlers.handleUncaughtException(new Error("fatal socket escape"));

  assert.deepEqual(exits, [1]);
  assert.deepEqual(recorded.map(entry=>entry.eventName), ["uncaughtException", "fatalShutdown"]);
  assert.equal(recorded[1].source, "process");
  assert.equal(recorded[1].error.includes("shutdown write failed"), true);
});

test("installProcessErrorHandlers registers and unregisters process listeners", ()=>{
  const listeners = new Map();
  const processObject = {
    on(eventName, handler){
      listeners.set(eventName, handler);
    },
    off(eventName, handler){
      if(listeners.get(eventName) === handler) listeners.delete(eventName);
    }
  };

  const remove = installProcessErrorHandlers({
    processObject,
    logger:{error(){}, warn(){}},
    onError(){},
    exit(){}
  });

  assert.equal(typeof listeners.get("unhandledRejection"), "function");
  assert.equal(typeof listeners.get("uncaughtException"), "function");
  remove();
  assert.equal(listeners.size, 0);
});
