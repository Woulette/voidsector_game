export function createSessionCleanupScheduler({
  deleteExpired,
  intervalMs = 5 * 60 * 1000,
  now = ()=>Date.now()
} = {}){
  let nextCleanupAt = 0;
  let pending = null;

  async function cleanup({force = false} = {}){
    const at = Number(now()) || Date.now();
    if(pending) return pending;
    if(!force && at < nextCleanupAt) return false;
    nextCleanupAt = at + Math.max(1000, Number(intervalMs || 0));
    pending = Promise.resolve()
      .then(()=>deleteExpired?.(at))
      .then(()=>true)
      .catch(error=>{
        nextCleanupAt = Math.min(nextCleanupAt, at + 10_000);
        throw error;
      })
      .finally(()=>{
        pending = null;
      });
    return pending;
  }

  return {cleanup};
}
