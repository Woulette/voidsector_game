import { clamp } from "./drawing.js";

const angleDelta = (a, b)=>Math.atan2(Math.sin(b - a), Math.cos(b - a));

// One pose shared by the two panes. A virtual camera follows forward travel
// while the ship stays in frame, so its old exhaust drifts behind it.
export function advanceEngineFlight(state, {ship, motion, time, path, power, dt}){
  const turning = motion === "turn" || motion === "cycle" && time % 12 >= 5.3 && time % 12 < 8.4;
  const desired = power === 0 && state.angle !== undefined ? state.angle : Math.PI / 2 + (turning ? Math.sin(path * 1.3) * .9 : Math.sin(path * .8) * .2);
  state.angle ??= desired;
  state.vx ??= 0;
  state.vy ??= 0;
  state.travelX ??= 0;
  state.travelY ??= 0;
  if(dt > 0){
    const previous = state.angle;
    state.angle += angleDelta(previous, desired) * (1 - Math.exp(-dt * 7));
    state.angularVelocity = angleDelta(previous, state.angle) / dt;
    const speed = (ship.stats?.vitesse || 300) * .34 * power;
    const response = 1 - Math.exp(-dt * 5);
    state.vx += (Math.sin(state.angle) * speed - state.vx) * response;
    state.vy += (-Math.cos(state.angle) * speed - state.vy) * response;
    state.travelX += state.vx * dt;
    state.travelY += state.vy * dt;
  }
  state.engineAngle = Math.hypot(state.vx, state.vy) > 2 ? Math.atan2(state.vx, -state.vy) : state.angle;
  state.bend = clamp((state.angularVelocity || 0) * .42 - angleDelta(state.angle, state.engineAngle) * .65, -1, 1);
  return state;
}
