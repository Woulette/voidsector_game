export function cloneProfileSnapshot(profile){
  return profile ? JSON.parse(JSON.stringify(profile)) : null;
}

export function restoreProfileSnapshot(profiles, key, snapshot){
  const cleanKey = String(key || "");
  if(!cleanKey) return;
  if(snapshot) profiles.set(cleanKey, cloneProfileSnapshot(snapshot));
  else profiles.delete(cleanKey);
}

export function attachProfileSave(result, savePromise){
  if(!result || typeof result !== "object" || !savePromise) return result;
  const trackedSave = Promise.resolve(savePromise);
  trackedSave.catch(()=>{});
  Object.defineProperty(result, "save", {
    value:trackedSave,
    enumerable:false,
    configurable:true
  });
  return result;
}

export async function waitForProfileSave(result){
  if(result?.save && typeof result.save.then === "function") await result.save;
  return result;
}
