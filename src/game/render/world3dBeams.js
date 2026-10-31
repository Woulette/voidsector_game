export function sampleWorld3dBeam(beam){
  if(beam.monochrome || beam.age < 0 || beam.age >= beam.duration) return null;
  const progress=Math.max(0,Math.min(1,beam.age/beam.duration));
  const distance=Math.hypot(beam.toX-beam.fromX,beam.toY-beam.fromY) || 1;
  const head=(1-(1-progress)**3)*distance;
  const tail=Math.max(0,head-(beam.beamLength || 160));
  const fade=progress<.76 ? 1 : Math.max(0,1-(progress-.76)/.24);
  return {head:Math.min(1,head/distance),tail:tail/distance,fade,width:Math.max(.4,Number(beam.widthScale || 1))};
}
