const goldArtwork = {
  7:"assets/store/premium-or-7.png",
  30:"assets/store/premium-or-30.png"
};

export function premiumPassArtwork(pack){
  return pack?.tier === "gold" && Object.hasOwn(goldArtwork,pack.days)
    ? goldArtwork[pack.days]
    : pack?.img || "";
}
