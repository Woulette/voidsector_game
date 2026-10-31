export const SHIP_FLIGHT_CAMERA_TILT = Math.PI / 4;

const clamp = (value, min, max)=>Math.max(min, Math.min(max, value));

export const SHIP_FLIGHT_MAX_ROLL = Math.PI / 6;

export function advanceShipFlightMotion(state, targetAngle, now){
  const elapsed = state.time === undefined ? 0 : now - state.time;
  if(state.time === undefined || elapsed < 0 || elapsed > .25){
    Object.assign(state, {time:now, angle:targetAngle, roll:0});
    return state;
  }
  if(elapsed <= 0) return state;
  const difference = Math.atan2(Math.sin(targetAngle - state.angle), Math.cos(targetAngle - state.angle));
  const step = difference * (1 - Math.exp(-elapsed * 10));
  state.angle += step;
  const desiredRoll = clamp(-step / elapsed * .14, -SHIP_FLIGHT_MAX_ROLL, SHIP_FLIGHT_MAX_ROLL);
  const response = Math.abs(desiredRoll) > Math.abs(state.roll) ? 11 : 6;
  state.roll += (desiredRoll - state.roll) * (1 - Math.exp(-elapsed * response));
  state.time = now;
  return state;
}

export function getShipFlightPose({angle = 0, roll = 0, enginePortScale = 1} = {}){
  const pitch = 0;
  // Compensate the camera's foreshortening so the nose still follows the 2D steering bearing.
  const heading = Math.atan2(Math.sin(angle) * Math.cos(SHIP_FLIGHT_CAMERA_TILT), Math.cos(angle));
  return {angle, yaw:-heading, pitch, roll:clamp(roll, -SHIP_FLIGHT_MAX_ROLL, SHIP_FLIGHT_MAX_ROLL), tilt:SHIP_FLIGHT_CAMERA_TILT, enginePortScale};
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
    const scale = pose.enginePortScale ?? 1;
    const point = projectShipFlightPoint({...port,x:port.x * scale,y:port.y * scale}, pose);
    return {...port, x:point.x * cos + point.y * sin, y:-point.x * sin + point.y * cos};
  });
}
