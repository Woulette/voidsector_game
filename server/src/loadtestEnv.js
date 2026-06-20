import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// LOAD_TEST_LOCAL_FIX: optional dev overrides — must load before config.js
// so that LOAD_TEST_ENABLED / LOAD_TEST_SECRET are visible to runtime config.
// See LOAD_TEST_LOCAL_FIXES.md
if(String(process.env.NODE_ENV || "development").toLowerCase() !== "production"){
  dotenv.config({
    path:path.join(path.dirname(fileURLToPath(import.meta.url)), "../loadtest.local.env"),
    override:true
  });
}
