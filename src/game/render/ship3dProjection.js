export const SHIP_FLIGHT_CAMERA_TILT = Math.PI / 4;

const clamp = (value, min, max)=>Math.max(min, Math.min(max, value));

export function getShipFlightPose({angle = 0, engineAngle = angle} = {}){
  const pitch = 0;
  const turn = Math.atan2(Math.sin(engineAngle - angle), Math.cos(engineAngle - angle));
  // Compensate the camera's foreshortening so the nose still follows the 2D steering bearing.
  const heading = Math.atan2(Math.sin(angle) * Math.cos(SHIP_FLIGHT_CAMERA_TILT), Math.cos(angle));
  return {angle, yaw:-heading, pitch, roll:clamp(turn * .45, -.18, .18), tilt:SHIP_FLIGHT_CAMERA_TILT};
}

export function projectShipFlightPoint({x = 0, y = 0, height = 0}, pose){
  const rollCos = Math.cos(pose.roll), rollSin = Math.sin(pose.roll);
  const pitchCos = Math.cos(pose.pitch), pitchSin = Math.sin(pose.pitch);
  const yawCos = Math.cos(pose.yaw), yawSin = Math.sin(pose.yaw);
  const rolledX = x * rollCos - height * rollSin;
  const rolledHeight = x * rollSin + height * rollCos;
  const bankedHeight = rolledHeight * pitchCos - y * pitchSin;
  const bankedY = rolledHeight * pitchSin + y * pitchCos;
  const worldX = rolledX * yawCos + bankedY * yawSin;
  const worldY = -rolledX * yawSin + bankedY * yawCos;
  return {x:worldX, y:worldY * Math.cos(pose.tilt) - bankedHeight * Math.sin(pose.tilt)};
}

export function projectShipEnginePorts(ports, pose){
  if(!pose) return ports;
  const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle);
  return ports.map(port=>{
    const point = projectShipFlightPoint(port, pose);
    return {...port, x:point.x * cos + point.y * sin, y:-point.x * sin + point.y * cos};
  });
}
