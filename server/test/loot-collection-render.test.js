import assert from "node:assert/strict";
import test from "node:test";
import {drawGroundMaterials} from "../../src/game/render/entities.js";
import {drawLootCollection, getLootCollectionProgress, isLootCollectionVisible} from "../../src/game/render/lootCollection.js";

const IMAGE_PATH = "assets/materials/refinery-v2/cuivre_orbital.png";
const READY_IMAGE = Object.freeze({complete:true, naturalWidth:1254, naturalHeight:1254});
const INITIAL_STATE = Object.freeze({
  globalAlpha:.71, globalCompositeOperation:"source-over", shadowBlur:0,
  shadowColor:"#123456", fillStyle:"#234567", strokeStyle:"#345678", lineWidth:1.75,
  lineCap:"butt"
});

// This canvas fake rejects non-finite geometry and models the drawing-state
// stack. It also records transformed image centres, rather than relying on one
// particular arrangement of translate/rotate calls inside the renderer.
function canvasFixture({drawImageError = null} = {}){
  const calls = [], stack = [];
  let transform = [1, 0, 0, 1, 0, 0];
  let lineDash = [3, 2];
  const ctx = {canvas:{width:800, height:600}, ...INITIAL_STATE};
  const point = (x, y)=>({x:transform[0] * x + transform[2] * y + transform[4], y:transform[1] * x + transform[3] * y + transform[5]});
  const state = ()=>Object.fromEntries(Object.keys(INITIAL_STATE).map(key=>[key, ctx[key]]));
  const record = (method, args = [], extra = {})=>calls.push({method, args, state:state(), ...extra});
  const numbers = (method, values)=>{
    for(const value of values) assert.equal(Number.isFinite(value), true, `${method} received non-finite geometry: ${value}`);
  };
  const gradient = method=>(...args)=>{
    numbers(method, args);
    record(method, args);
    return {addColorStop(offset, color){
      assert.ok(Number.isFinite(offset) && offset >= 0 && offset <= 1);
      assert.equal(typeof color, "string");
      record("addColorStop", [offset, color]);
    }};
  };
  ctx.save = ()=>{stack.push({state:state(), transform:[...transform], lineDash:[...lineDash]}); record("save");};
  ctx.restore = ()=>{
    assert.ok(stack.length, "canvas restore must have a matching save");
    const saved = stack.pop(); Object.assign(ctx, saved.state); transform = saved.transform; lineDash = saved.lineDash;
    record("restore");
  };
  ctx.translate = (x, y)=>{
    numbers("translate", [x, y]); record("translate", [x, y]);
    transform[4] += transform[0] * x + transform[2] * y;
    transform[5] += transform[1] * x + transform[3] * y;
  };
  ctx.rotate = angle=>{
    numbers("rotate", [angle]); record("rotate", [angle]);
    const [a, b, c, d, e, f] = transform, cosine = Math.cos(angle), sine = Math.sin(angle);
    transform = [a * cosine + c * sine, b * cosine + d * sine, c * cosine - a * sine, d * cosine - b * sine, e, f];
  };
  for(const method of ["beginPath", "closePath", "fill", "stroke"]){
    ctx[method] = (...args)=>record(method, args);
  }
  for(const method of ["moveTo", "lineTo", "arc", "ellipse", "fillRect"]){
    ctx[method] = (...args)=>{
      numbers(method, args.filter(value=>typeof value !== "boolean"));
      if(method === "arc" || method === "ellipse") assert.ok(args[2] >= 0, `${method} radius must be non-negative`);
      if(method === "ellipse") assert.ok(args[3] >= 0, "ellipse second radius must be non-negative");
      record(method, args, {point:point(args[0], args[1])});
    };
  }
  ctx.drawImage = (image, x, y, width, height)=>{
    numbers("drawImage", [x, y, width, height]);
    assert.ok(width >= 0 && height >= 0);
    record("drawImage", [image, x, y, width, height], {centre:point(x + width / 2, y + height / 2)});
    if(drawImageError) throw drawImageError;
  };
  ctx.createRadialGradient = gradient("createRadialGradient");
  ctx.createLinearGradient = gradient("createLinearGradient");
  ctx.setLineDash = values=>{
    numbers("setLineDash", values);
    assert.ok(values.every(value=>value >= 0));
    lineDash = [...values]; record("setLineDash", [...values]);
  };
  ctx.getLineDash = ()=>[...lineDash];
  return {ctx, calls, state, get depth(){return stack.length;}, get transform(){return [...transform];}};
}

function material(overrides = {}){
  return {
    id:37, x:180, y:240, size:42, phase:.3, img:IMAGE_PATH,
    glow:"rgba(219,120,35,.3)", glowCore:"rgba(255,203,110,.7)", fallback:"#c87926",
    suctionActive:true, suctionProgress:.5,
    suctionStartX:180, suctionStartY:240, suctionTargetX:420, suctionTargetY:300,
    renderX:300, renderY:270, renderSize:25,
    ...overrides
  };
}

function render(node, {camera = {x:100, y:50}, image = READY_IMAGE, fixture = canvasFixture()} = {}){
  const cache = image ? {[IMAGE_PATH]:image} : {};
  drawGroundMaterials({ctx:fixture.ctx, camera, cache, materials:[node]});
  return fixture;
}

function assertRestored(fixture){
  assert.equal(fixture.depth, 0, "all nested saves must be restored");
  assert.deepEqual(fixture.state(), INITIAL_STATE, "rendering must not leak alpha, blending, stroke or shadow state");
  assert.deepEqual(fixture.transform, [1, 0, 0, 1, 0, 0]);
  assert.deepEqual(fixture.ctx.getLineDash(), [3, 2], "pickup rings must not clear the following renderer's line dash");
}

test("collection progress preserves endpoints and clamps the animation interval", ()=>{
  for(const [value, expected] of [[-.4, 0], [0, 0], [.5, .5], [1, 1], [1.4, 1]]){
    assert.equal(getLootCollectionProgress(material({suctionProgress:value})), expected);
  }
});

test("collection effects are absent while idle and at the exact start and finish", ()=>{
  for(const overrides of [{suctionActive:false}, {suctionProgress:0}, {suctionProgress:1}]){
    const fixture = canvasFixture();
    assert.equal(drawLootCollection({ctx:fixture.ctx, node:material(overrides), camera:{x:100, y:50}}), false);
    assert.equal(fixture.calls.length, 0);
    assertRestored(fixture);
  }
});

test("the active pickup cue draws a bounded cone, rings and particles in its rarity colours", ()=>{
  const fixture = canvasFixture(), node = Object.freeze(material());
  assert.equal(drawLootCollection({ctx:fixture.ctx, node, camera:Object.freeze({x:100, y:50})}), true);
  const rings = fixture.calls.filter(call=>call.method === "ellipse").length;
  const particles = fixture.calls.filter(call=>call.method === "arc").length;
  assert.ok(rings >= 1 && rings <= 5, "collection rings have a fixed, small drawing budget");
  assert.ok(particles >= 1 && particles <= 9, "collection particles have a fixed, small drawing budget");
  assert.ok(fixture.calls.some(call=>call.method === "closePath"), "the collection cone must be a filled, closed shape");
  assert.ok(fixture.calls.filter(call=>call.method === "beginPath").length <= 16, "one pickup has a fixed, small path budget");
  assert.ok(fixture.calls.filter(call=>call.method === "lineTo").length <= 8);
  const colourStops = fixture.calls.filter(call=>call.method === "addColorStop").map(call=>call.args[1]);
  assert.ok(colourStops.includes(node.glow));
  assert.ok(colourStops.includes(node.glowCore));
  assert.ok(fixture.calls.every(call=>call.state.shadowBlur === 0), "pickup glow must not enable expensive canvas shadow blur");
  assertRestored(fixture);
});

test("the pickup effect connects its world-space drop and exact ship target after the camera offset", ()=>{
  const fixture = canvasFixture();
  drawLootCollection({ctx:fixture.ctx, node:Object.freeze(material()), camera:Object.freeze({x:100, y:50})});
  const start = fixture.calls.find(call=>call.method === "moveTo" && call.args[1] === 0);
  assert.ok(start);
  assert.ok(Math.abs(start.point.x - 80) < 1e-9);
  assert.ok(Math.abs(start.point.y - 190) < 1e-9);
  assert.ok(fixture.calls.some(call=>["lineTo", "arc", "ellipse"].includes(call.method)
    && Math.abs(call.point.x - 320) < 1e-9 && Math.abs(call.point.y - 250) < 1e-9), "the focus must reach the pickup target, not the animated sprite centre");
  assertRestored(fixture);
});

test("a zero-length collection path has finite geometry and restores canvas state", ()=>{
  const fixture = canvasFixture();
  assert.equal(drawLootCollection({ctx:fixture.ctx, node:Object.freeze(material({
    x:0, y:0, suctionStartX:0, suctionStartY:0, suctionTargetX:0, suctionTargetY:0, renderX:0, renderY:0
  })), camera:{x:0, y:0}}), true);
  assertRestored(fixture);
});

test("a collecting material draws at its supplied render coordinates rather than its physical drop", ()=>{
  const node = Object.freeze(material({x:-3000, y:-2000, renderX:270.25, renderY:180.75, renderSize:19.5}));
  const fixture = render(node), [draw] = fixture.calls.filter(call=>call.method === "drawImage");
  assert.ok(draw, "a visible animated position must survive canonical-position culling");
  assert.deepEqual(draw.centre, {x:170.25, y:130.75});
  assert.deepEqual(draw.args.slice(3), [19.5, 19.5]);
  assertRestored(fixture);
});

test("zero render coordinates are valid and do not fall back to the physical drop", ()=>{
  const fixture = render(Object.freeze(material({renderX:0, renderY:0, renderSize:20})), {camera:{x:0, y:0}});
  const draws = fixture.calls.filter(call=>call.method === "drawImage");
  assert.equal(draws.length, 1);
  for(const draw of draws){
    assert.deepEqual(draw.centre, {x:0, y:0});
    assert.deepEqual(draw.args.slice(3), [20, 20]);
  }
  assertRestored(fixture);
});

test("an explicitly zero render size hides the sprite instead of using its idle size", ()=>{
  const fixture = render(Object.freeze(material({suctionProgress:0, renderSize:0})));
  assert.equal(fixture.calls.length, 0, "zero size must never fall back to the idle bitmap or fallback circle");
  assertRestored(fixture);
});

test("idle materials ignore stale suction coordinates and size", t=>{
  t.mock.method(performance, "now", ()=>840);
  const node = Object.freeze(material({suctionActive:false, x:180, y:240, phase:.3, renderX:700, renderY:500, renderSize:1}));
  const fixture = render(node), [draw] = fixture.calls.filter(call=>call.method === "drawImage");
  assert.ok(draw);
  assert.deepEqual(draw.centre, {x:80, y:Math.round(190 + Math.sin(2.3) * 3)});
  assert.deepEqual(draw.args.slice(3), [42, 42]);
  assertRestored(fixture);
});

test("active collection has no idle vertical oscillation at progress zero or halfway", t=>{
  t.mock.method(performance, "now", ()=>840);
  for(const progress of [0, .5]){
    const fixture = render(Object.freeze(material({suctionProgress:progress, renderX:300, renderY:270})));
    const [draw] = fixture.calls.filter(call=>call.method === "drawImage");
    assert.ok(draw);
    assert.deepEqual(draw.centre, {x:200, y:220});
    assertRestored(fixture);
  }
});

test("finished collection hides both the material sprite and pickup effect", ()=>{
  const fixture = render(Object.freeze(material({suctionProgress:1})));
  assert.equal(fixture.calls.length, 0);
  assertRestored(fixture);
});

test("active culling accepts physical, rendered and target positions independently", ()=>{
  const camera = {x:100, y:50}, visible = (node)=>isLootCollectionVisible({node, camera, width:800, height:600, margin:0});
  assert.equal(visible(material({x:200, y:200, renderX:-2000, renderY:-2000, suctionStartX:-2000, suctionStartY:-2000, suctionTargetX:-3000, suctionTargetY:-3000})), true);
  assert.equal(visible(material({x:-2000, y:-2000, renderX:250, renderY:250, suctionStartX:-2000, suctionStartY:-2000, suctionTargetX:-3000, suctionTargetY:-3000})), true);
  assert.equal(visible(material({x:-2000, y:-2000, renderX:-1500, renderY:-1500, suctionStartX:-2000, suctionStartY:-2000, suctionTargetX:300, suctionTargetY:200})), true);
});

test("ground rendering keeps the visible pickup focus when the physical drop and sprite are outside", ()=>{
  const fixture = render(Object.freeze(material({
    x:-2000, y:-2000, renderX:-1500, renderY:-1500,
    suctionStartX:-2000, suctionStartY:-2000, suctionTargetX:300, suctionTargetY:200
  })));
  assert.ok(fixture.calls.some(call=>call.method === "fill"
    && call.state.globalCompositeOperation === "lighter"), "offscreen drops still show their visible target-side collection cue");
  assertRestored(fixture);
});

test("active culling keeps a collection segment crossing the view but rejects an entirely distant effect", ()=>{
  const camera = {x:100, y:50}, visible = (node)=>isLootCollectionVisible({node, camera, width:800, height:600, margin:0});
  assert.equal(visible(material({x:-500, y:300, renderX:-200, renderY:300, suctionStartX:-500, suctionStartY:300, suctionTargetX:1500, suctionTargetY:300})), true);
  assert.equal(visible(material({x:-5000, y:-5000, renderX:-4500, renderY:-4500, suctionStartX:-5000, suctionStartY:-5000, suctionTargetX:-3000, suctionTargetY:-3000})), false);
  const offscreen = render(Object.freeze(material({x:-5000, y:-5000, renderX:-4500, renderY:-4500, suctionStartX:-5000, suctionStartY:-5000, suctionTargetX:-3000, suctionTargetY:-3000})));
  assert.equal(offscreen.calls.length, 0);
});

test("idle culling does not keep an invisible material alive through stale collection fields", ()=>{
  const node = material({suctionActive:false, x:-3000, y:-3000, renderX:300, renderY:250, suctionTargetX:300, suctionTargetY:250});
  assert.equal(isLootCollectionVisible({node, camera:{x:0, y:0}, width:800, height:600, margin:0}), false);
  assert.equal(render(Object.freeze(node)).calls.length, 0);
});

test("absent, loading and broken images retain a visible fallback instead of drawing an invalid bitmap", ()=>{
  for(const image of [null, {complete:false, naturalWidth:1254, naturalHeight:1254}, {complete:true, naturalWidth:0, naturalHeight:0}]){
    for(const suctionActive of [false, true]){
      const node = Object.freeze(material({suctionActive})), fixture = render(node, {image});
      assert.equal(fixture.calls.filter(call=>call.method === "drawImage").length, 0);
      assert.ok(fixture.calls.some(call=>call.method === "fill" && call.state.fillStyle === node.fallback), "a missing bitmap must leave the material collectible visibly represented");
      assertRestored(fixture);
    }
  }
});

test("a complete transparent PNG with intrinsic dimensions is drawn normally", ()=>{
  const fixture = render(Object.freeze(material()), {image:READY_IMAGE});
  const images = fixture.calls.filter(call=>call.method === "drawImage");
  assert.equal(images.length, 1);
  assert.equal(images[0].args[0], READY_IMAGE);
  assertRestored(fixture);
});

test("rendering does not mutate physical drops, animation inputs or camera coordinates", ()=>{
  const node = Object.freeze(material()), camera = Object.freeze({x:100, y:50}), before = {...node};
  const fixture = render(node, {camera});
  assert.deepEqual(node, before);
  assert.deepEqual(camera, {x:100, y:50});
  assertRestored(fixture);
});

test("an image draw failure restores every nested canvas state before propagating", ()=>{
  const failure = new Error("intentional bitmap draw failure"), fixture = canvasFixture({drawImageError:failure});
  assert.throws(()=>render(Object.freeze(material()), {fixture}), error=>error === failure);
  assertRestored(fixture);
});
