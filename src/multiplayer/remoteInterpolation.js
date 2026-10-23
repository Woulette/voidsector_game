const FRAME_MS_60 = 1000 / 60;
const DEFAULT_POSITION_BLEND_60_FPS = .55;
const DEFAULT_POWER_BLEND_60_FPS = .5;
const MIN_INTERPOLATION_DELAY_MS = 75;
const MAX_INTERPOLATION_DELAY_MS = 220;
const FULL_EXTRAPOLATION_MS = 120;
const EXTRAPOLATION_DECAY_MS = 180;
const PLAYBACK_REBASE_GAP_MS = 1000;

function finite(value, fallback = 0){
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function sourceTime(sample){
  if(Number.isFinite(Number(sample?.sourceAt))) return Number(sample.sourceAt);
  if(Number.isFinite(Number(sample?.updatedAt))) return Number(sample.updatedAt);
  return finite(sample?.receivedAt);
}

export function resolveAdaptiveDelayMs({intervalMs = 50, jitterMs = 0} = {}){
  return clamp(finite(intervalMs, 50) * 1.35 + finite(jitterMs) * 2 + 10, MIN_INTERPOLATION_DELAY_MS, MAX_INTERPOLATION_DELAY_MS);
}

function lerp(a, b, t){
  return a + (b - a) * t;
}

function lerpAngle(a, b, t){
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

export function frameRateIndependentBlend(frameMs, blendAt60Fps = DEFAULT_POSITION_BLEND_60_FPS){
  const elapsed = clamp(finite(frameMs, FRAME_MS_60), 0, 250);
  const baseBlend = clamp(finite(blendAt60Fps, DEFAULT_POSITION_BLEND_60_FPS), 0, .999);
  if(elapsed <= 0 || baseBlend <= 0) return 0;
  return 1 - Math.pow(1 - baseBlend, elapsed / FRAME_MS_60);
}

function writeInterpolatedState(target, from, to, t){
  Object.assign(target, to);
  target.x = lerp(finite(from.x), finite(to.x), t);
  target.y = lerp(finite(from.y), finite(to.y), t);
  target.angle = lerpAngle(finite(from.angle), finite(to.angle), t);
  target.engineAngle = lerpAngle(
    finite(from.engineAngle, finite(from.angle)),
    finite(to.engineAngle, finite(to.angle)),
    t
  );
  target.vx = lerp(finite(from.vx), finite(to.vx), t);
  target.vy = lerp(finite(from.vy), finite(to.vy), t);
  target.enginePower = lerp(finite(from.enginePower), finite(to.enginePower), t);
  target.engineTrailLocked = Boolean(to.engineTrailLocked || to.attackTargetId);
  return target;
}

function updateDiagnosticMode(timing, diagnostics, mode){
  if(timing.mode === mode) return;
  timing.mode = mode;
  if(!diagnostics) return;
  if(mode === "underrun") diagnostics.bufferUnderruns += 1;
  if(mode === "extrapolate") diagnostics.extrapolations += 1;
}

function preventBackwardCorrection(target, timing){
  if(!Number.isFinite(timing.lastOutputX) || !Number.isFinite(timing.lastOutputY)){
    timing.lastOutputX = finite(target.x);
    timing.lastOutputY = finite(target.y);
    timing.lastOutputVx = finite(target.vx);
    timing.lastOutputVy = finite(target.vy);
    return;
  }
  let directionX = finite(target.vx);
  let directionY = finite(target.vy);
  if(Math.hypot(directionX, directionY) <= 1){
    directionX = finite(timing.lastOutputVx);
    directionY = finite(timing.lastOutputVy);
  }
  const speed = Math.hypot(directionX, directionY);
  if(speed > 1){
    directionX /= speed;
    directionY /= speed;
    const dx = finite(target.x) - timing.lastOutputX;
    const dy = finite(target.y) - timing.lastOutputY;
    const backwards = dx * directionX + dy * directionY;
    if(backwards < 0){
      target.x -= directionX * backwards;
      target.y -= directionY * backwards;
    }
  }
  timing.lastOutputX = finite(target.x);
  timing.lastOutputY = finite(target.y);
  timing.lastOutputVx = finite(target.vx);
  timing.lastOutputVy = finite(target.vy);
}

export function sampleBufferedState(samples, {
  delayMs,
  now = globalThis.performance?.now?.() ?? Date.now(),
  target = {},
  timing = {},
  diagnostics = null
} = {}){
  if(!Array.isArray(samples) || samples.length <= 0) return null;
  let first = null;
  let latest = null;
  let previous = null;
  let observedOffset = Infinity;
  let intervalTotal = 0;
  let intervalCount = 0;
  let jitterTotal = 0;

  for(const sample of samples){
    const receivedAt = Number(sample?.receivedAt);
    const at = sourceTime(sample);
    if(!Number.isFinite(receivedAt) || !Number.isFinite(at)) continue;
    if(!first) first = sample;
    if(previous){
      const sourceDelta = at - sourceTime(previous);
      const arrivalDelta = receivedAt - finite(previous.receivedAt);
      if(sourceDelta > 0 && arrivalDelta >= 0){
        intervalTotal += sourceDelta;
        intervalCount += 1;
        jitterTotal += Math.abs(arrivalDelta - sourceDelta);
      }
    }
    observedOffset = Math.min(observedOffset, receivedAt - at);
    latest = sample;
    previous = sample;
  }
  if(!first || !latest) return null;

  if(Number.isFinite(observedOffset)){
    // The minimum comes from the bounded recent sample window, so it can follow
    // a sustained latency increase without reacting to every jitter spike.
    timing.clockOffset = observedOffset;
  }
  const rawFrameMs = Number.isFinite(timing.lastNow)
    ? Math.max(0, finite(now) - timing.lastNow)
    : FRAME_MS_60;
  const fallbackInterval = intervalCount ? intervalTotal / intervalCount : 50;
  const interval = finite(diagnostics?.observedIntervalMs, fallbackInterval);
  const jitter = finite(diagnostics?.jitterMs, intervalCount ? jitterTotal / intervalCount : 0);
  const desiredDelay = delayMs === undefined
    ? resolveAdaptiveDelayMs({intervalMs:interval, jitterMs:jitter})
    : clamp(finite(delayMs, 115), 0, MAX_INTERPOLATION_DELAY_MS);
  const frameMs = clamp(rawFrameMs, 0, 250);
  timing.lastNow = finite(now);
  if(!Number.isFinite(timing.delayMs) || delayMs !== undefined){
    timing.delayMs = desiredDelay;
  }else if(desiredDelay > timing.delayMs){
    timing.delayMs += Math.min(desiredDelay - timing.delayMs, Math.max(2, frameMs * .75));
  }else{
    timing.delayMs -= Math.min(timing.delayMs - desiredDelay, Math.max(.5, frameMs * .12));
  }
  if(diagnostics) diagnostics.adaptiveDelayMs = timing.delayMs;

  const desiredPlaybackAt = finite(now) - finite(timing.clockOffset) - timing.delayMs;
  const firstAt = sourceTime(first);
  const playbackFellBehindBuffer = Number.isFinite(timing.playbackAt)
    && timing.playbackAt < firstAt - MAX_INTERPOLATION_DELAY_MS;
  const shouldRebasePlayback = rawFrameMs > PLAYBACK_REBASE_GAP_MS || playbackFellBehindBuffer;
  if(!Number.isFinite(timing.playbackAt) || delayMs !== undefined){
    timing.playbackAt = desiredPlaybackAt;
  }else if(shouldRebasePlayback){
    timing.playbackAt = clamp(desiredPlaybackAt, firstAt, sourceTime(latest));
  }else{
    const baseline = timing.playbackAt + frameMs;
    const error = desiredPlaybackAt - baseline;
    const rate = clamp(1 + error / Math.max(180, timing.delayMs * 2), .35, 1.2);
    timing.playbackAt += frameMs * rate;
  }
  const playbackAt = timing.playbackAt;

  if(playbackAt <= firstAt){
    Object.assign(target, first);
    updateDiagnosticMode(timing, diagnostics, "underrun");
    preventBackwardCorrection(target, timing);
    return target;
  }

  previous = null;
  for(const sample of samples){
    if(!Number.isFinite(Number(sample?.receivedAt))) continue;
    if(previous && playbackAt >= sourceTime(previous) && playbackAt <= sourceTime(sample)){
      const span = Math.max(1, sourceTime(sample) - sourceTime(previous));
      writeInterpolatedState(target, previous, sample, clamp((playbackAt - sourceTime(previous)) / span, 0, 1));
      updateDiagnosticMode(timing, diagnostics, "interpolate");
      preventBackwardCorrection(target, timing);
      return target;
    }
    previous = sample;
  }

  Object.assign(target, latest);
  const extrapolateMs = Math.max(0, playbackAt - sourceTime(latest));
  const beyond = Math.max(0, extrapolateMs - FULL_EXTRAPOLATION_MS);
  const travelMs = Math.min(extrapolateMs, FULL_EXTRAPOLATION_MS)
    + EXTRAPOLATION_DECAY_MS * (1 - Math.exp(-beyond / EXTRAPOLATION_DECAY_MS));
  const velocityScale = extrapolateMs <= FULL_EXTRAPOLATION_MS
    ? 1
    : Math.exp(-beyond / EXTRAPOLATION_DECAY_MS);
  target.x = finite(latest.x) + finite(latest.vx) * travelMs / 1000;
  target.y = finite(latest.y) + finite(latest.vy) * travelMs / 1000;
  target.vx = finite(latest.vx) * velocityScale;
  target.vy = finite(latest.vy) * velocityScale;
  target.enginePower = finite(latest.enginePower) * velocityScale;
  target.engineTrailLocked = Boolean(latest.engineTrailLocked || latest.attackTargetId);
  updateDiagnosticMode(timing, diagnostics, "extrapolate");
  preventBackwardCorrection(target, timing);
  return target;
}

export function updateRemoteRenderState(remote, buffered, now = globalThis.performance?.now?.() ?? Date.now()){
  if(!remote || !buffered) return null;
  if(!remote.renderState){
    remote.renderState = {
      x:finite(buffered.x),
      y:finite(buffered.y),
      angle:finite(buffered.angle),
      engineAngle:finite(buffered.engineAngle, finite(buffered.angle)),
      enginePower:finite(buffered.enginePower),
      updatedAt:finite(now)
    };
    return remote.renderState;
  }

  const render = remote.renderState;
  const frameMs = Math.max(0, finite(now) - finite(render.updatedAt, finite(now) - FRAME_MS_60));
  const positionBlend = frameRateIndependentBlend(frameMs, DEFAULT_POSITION_BLEND_60_FPS);
  const powerBlend = frameRateIndependentBlend(frameMs, DEFAULT_POWER_BLEND_60_FPS);
  render.updatedAt = finite(now);
  const dx = (finite(buffered.x) - finite(render.x)) * positionBlend;
  const dy = (finite(buffered.y) - finite(render.y)) * positionBlend;
  const distance = Math.hypot(dx, dy);
  // A buffer rebase after a lost burst must not turn into a one-frame teleport.
  // Actual map transfers/teleports reset renderState in socketState instead.
  const motionSpeed = Math.max(120, finite(buffered.speed, 300), Math.hypot(finite(buffered.vx), finite(buffered.vy)));
  const maxStep = motionSpeed * 1.5 * Math.min(frameMs, 250) / 1000;
  const scale = distance > maxStep ? maxStep / distance : 1;
  render.x = finite(render.x) + dx * scale;
  render.y = finite(render.y) + dy * scale;
  render.angle = lerpAngle(finite(render.angle), finite(buffered.angle), positionBlend);
  render.engineAngle = lerpAngle(
    finite(render.engineAngle, finite(render.angle)),
    finite(buffered.engineAngle, finite(buffered.angle)),
    positionBlend
  );
  const speed = Math.hypot(finite(buffered.vx), finite(buffered.vy));
  const targetPower = Math.max(finite(buffered.enginePower), Math.min(1, speed / 120));
  render.enginePower = lerp(finite(render.enginePower), targetPower, powerBlend);
  return render;
}

export function isRemoteStateInViewport({render, camera, canvas, radius = 48, margin = 140} = {}){
  if(!render || !camera || !canvas) return true;
  const dpr = Math.max(1, finite(canvas.__dpr, 1));
  const width = Math.max(1, finite(canvas.__viewWidth, finite(canvas.clientWidth, finite(canvas.width) / dpr)));
  const height = Math.max(1, finite(canvas.__viewHeight, finite(canvas.clientHeight, finite(canvas.height) / dpr)));
  const padding = Math.max(0, finite(margin, 140)) + Math.max(0, finite(radius, 48));
  const x = finite(render.x) - finite(camera.x);
  const y = finite(render.y) - finite(camera.y);
  return x >= -padding && x <= width + padding && y >= -padding && y <= height + padding;
}
