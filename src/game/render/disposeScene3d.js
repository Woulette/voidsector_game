// Clones keep their shared GLB resources; only private resources are released.
export function disposeScene3d(root, sharedResources = new WeakSet()){
  const released = new Set();
  const release = resource=>{
    if(!resource || released.has(resource) || sharedResources.has(resource)) return;
    released.add(resource);resource.dispose?.();
  };
  root.traverse(object=>{
    release(object.geometry);
    for(const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []){
      if(sharedResources.has(material)) continue;
      for(const value of Object.values(material)) if(value?.isTexture) release(value);
      release(material);
    }
  });
}
