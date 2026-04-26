// tsl/wasm/ts/wasm_api_game_of_life.ts
import wasmGol from "../tsl/wasm/wasm_out_v1/wasm_gol.js";

// tsl/wasm/ts/wasm_loader.ts
function isNodeRuntime() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  const proc = g && g.process;
  return typeof proc?.versions?.node === "string";
}
async function loadEmscriptenModule(browserInit, nodeLoaderPath, wasmRelativePathFromThisFile) {
  if (!isNodeRuntime()) {
    return browserInit();
  }
  const nodeFs = "node:fs";
  const nodeUrl = "node:url";
  const nodePath = "node:path";
  const fs = await import(nodeFs);
  const url = await import(nodeUrl);
  const path = await import(nodePath);
  const { default: nodeInit } = await import(nodeLoaderPath);
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const wasmPath = path.join(__dirname, wasmRelativePathFromThisFile);
  const wasmBinary = fs.readFileSync(wasmPath);
  return nodeInit({ wasmBinary });
}

// tsl/wasm/ts/wasm_api_game_of_life.ts
var moduleInstance = null;
var modulePromise = (async () => {
  const mod = await loadEmscriptenModule(
    wasmGol,
    "../wasm_out_v1/wasm_gol.js",
    "../wasm_out_v1/wasm_gol.wasm"
  );
  moduleInstance = mod;
  return mod;
})();
await modulePromise;
function getHeap32() {
  if (!moduleInstance) {
    throw new Error("WASM module not initialized.");
  }
  const m = moduleInstance;
  if (!m.HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return m.HEAP32;
}
var GOL_DEFAULT_SIZE = 40;
var golHandle = null;
var golSize = GOL_DEFAULT_SIZE;
var golLiveCellsPtr = null;
var golLiveCellsCap = 0;
function golCreate(size) {
  if (!moduleInstance) {
    throw new Error("WASM module not initialized.");
  }
  if (golHandle !== null) {
    moduleInstance._gol_destroy(golHandle);
  }
  if (golLiveCellsPtr !== null) {
    moduleInstance._free(golLiveCellsPtr);
    golLiveCellsPtr = null;
    golLiveCellsCap = 0;
  }
  golHandle = moduleInstance._gol_create(size);
  golSize = size;
}
function golDestroy() {
  if (moduleInstance && golHandle !== null) {
    moduleInstance._gol_destroy(golHandle);
    golHandle = null;
  }
  if (moduleInstance && golLiveCellsPtr !== null) {
    moduleInstance._free(golLiveCellsPtr);
    golLiveCellsPtr = null;
    golLiveCellsCap = 0;
  }
}
function golRandomInitWithSeed(liveProb, seed) {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  moduleInstance._gol_random_init_seed(golHandle, liveProb, seed);
}
function golEvolve() {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  moduleInstance._gol_evolve(golHandle);
}
function golSetTopology(mode) {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  moduleInstance._gol_set_topology(golHandle, mode);
}
function golSetWormholeSeed(seed) {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  moduleInstance._gol_set_wormhole_seed(golHandle, seed >>> 0);
}
function golSetWormholeCount(count) {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  moduleInstance._gol_set_wormhole_count(golHandle, count | 0);
}
function golGetWormholeEdges() {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  return moduleInstance._gol_get_wormhole_edges(golHandle);
}
function golSetCutSeed(seed) {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  moduleInstance._gol_set_cut_seed(golHandle, seed >>> 0);
}
function golSetCutCount(count) {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  moduleInstance._gol_set_cut_count(golHandle, count | 0);
}
function golGetCutEdges() {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  return moduleInstance._gol_get_cut_edges(golHandle);
}
function golGetLiveCells() {
  if (!moduleInstance || golHandle === null) {
    throw new Error("GoL not created. Call golCreate first.");
  }
  const HEAP32 = getHeap32();
  const maxCount = golSize * golSize;
  const bytes = 2 * maxCount * 4;
  if (golLiveCellsPtr === null || golLiveCellsCap < bytes) {
    if (golLiveCellsPtr !== null) {
      moduleInstance._free(golLiveCellsPtr);
    }
    const ptr = moduleInstance._malloc(bytes);
    if (ptr === 0) {
      throw new Error("WASM malloc failed for GoL live cells.");
    }
    golLiveCellsPtr = ptr;
    golLiveCellsCap = bytes;
  }
  const count = moduleInstance._gol_get_live_cells(golHandle, golLiveCellsPtr, maxCount);
  const out = [];
  const base = golLiveCellsPtr / 4;
  for (let i = 0; i < count; i++) {
    out.push({ x: HEAP32[base + 2 * i], y: HEAP32[base + 2 * i + 1] });
  }
  return out;
}
function golGetSize() {
  return golSize;
}
function golIsCreated() {
  return golHandle !== null;
}

// page/game_of_life_cpp.ts
var CANVAS_ID = "gol-cpp";
var BTN_RESTART_ID = "gol-cpp-restart";
var BTN_PAUSE_ID = "gol-cpp-pause";
var HEAD_SPAN_ID = "head_span";
var STATS_ID = "gol-cpp-stats";
var STATS_TEXT_ID = "gol-cpp-stats-text";
var METER_ID = "gol-cpp-meter";
var SCALE_VALUE_ID = "gol-cpp-scale-value";
var SCALE_DOWN_ID = "gol-cpp-scale-down";
var SCALE_UP_ID = "gol-cpp-scale-up";
var TOPO_TORUS_ID = "gol-cpp-topo-torus";
var TOPO_FINITE_ID = "gol-cpp-topo-finite";
var TOPO_CYLINDER_ID = "gol-cpp-topo-cylinder";
var WH_VALUE_ID = "gol-cpp-wh-value";
var WH_DOWN_ID = "gol-cpp-wh-down";
var WH_UP_ID = "gol-cpp-wh-up";
var CUT_VALUE_ID = "gol-cpp-cut-value";
var CUT_DOWN_ID = "gol-cpp-cut-down";
var CUT_UP_ID = "gol-cpp-cut-up";
var START_VALUE_ID = "gol-cpp-start-value";
var START_DOWN_ID = "gol-cpp-start-down";
var START_UP_ID = "gol-cpp-start-up";
var SEED_USE_ID = "gol-cpp-seed-use";
var SEED_VALUE_ID = "gol-cpp-seed-value";
var SEED_APPLY_ID = "gol-cpp-seed-apply";
var BASE_GRID_SIZE = 40;
var FPS_SAMPLES = 30;
var TARGET_WORMHOLE_DELTA_PER_CLICK = 50;
var TARGET_CUT_DELTA_PER_CLICK = 20;
var TARGET_START_DELTA_PER_CLICK = 5;
var DEFAULT_START_PERCENT = 35;
var SHA_HISTORY_MAX = 1e4;
var CYCLE_SHA_MAX_PERIOD = 8;
var SCALE_FACTORS = [1, 2, 4];
var scaleIndex = 2;
var CHECKER_SIZE_AT_SCALE_2 = 8;
function getCheckerSize() {
  return CHECKER_SIZE_AT_SCALE_2 * getNFactor() / 2;
}
var LIVE_CELL_RGBA = "rgba(160, 160, 160, 0.82)";
function getNFactor() {
  return SCALE_FACTORS[scaleIndex];
}
function getGridSize() {
  return BASE_GRID_SIZE * getNFactor();
}
var animationId = null;
var gen = 0;
var frameTimes = [];
var lastFrameTime = null;
var paused = false;
var lastFpsStr = "\u2014";
var lastLiveCells = [];
var lastSeedUsed = null;
var startPercent = DEFAULT_START_PERCENT;
var lastShaShort = "\u2014";
var shaInFlightGen = null;
var shaHistoryQueue = [];
var shaFirstSeenGen = /* @__PURE__ */ new Map();
var shaCycleStartGen = null;
var shaCyclePeriod = null;
var shaCyclePhaseShorts = null;
var shaBitsetBytes = null;
var shaInputBytes = null;
var shaInputSize = null;
var topology = 1;
var targetWormholes = 0;
var wormholeProb = 0;
var wormholeSeed = 0;
var targetCuts = 0;
var cutSeed = 0;
function getCanvas() {
  const el = document.getElementById(CANVAS_ID);
  if (!el || !(el instanceof HTMLCanvasElement)) {
    throw new Error(`Canvas #${CANVAS_ID} not found`);
  }
  return el;
}
function getTopologyButtons() {
  const torus = document.getElementById(TOPO_TORUS_ID);
  const finite = document.getElementById(TOPO_FINITE_ID);
  const cylinder = document.getElementById(TOPO_CYLINDER_ID);
  if (!torus || !(torus instanceof HTMLButtonElement) || !finite || !(finite instanceof HTMLButtonElement) || !cylinder || !(cylinder instanceof HTMLButtonElement)) {
    throw new Error("Topology buttons not found");
  }
  return { torus, finite, cylinder };
}
function getButtons() {
  const restart = document.getElementById(BTN_RESTART_ID);
  const pauseBtn = document.getElementById(BTN_PAUSE_ID);
  if (!restart || !(restart instanceof HTMLButtonElement) || !pauseBtn || !(pauseBtn instanceof HTMLButtonElement)) {
    throw new Error(`Buttons #${BTN_RESTART_ID}, #${BTN_PAUSE_ID} not found`);
  }
  return { restart, pause: pauseBtn };
}
function getWormholeControls() {
  const down = document.getElementById(WH_DOWN_ID);
  const up = document.getElementById(WH_UP_ID);
  const value = document.getElementById(WH_VALUE_ID);
  if (!down || !(down instanceof HTMLButtonElement) || !up || !(up instanceof HTMLButtonElement) || !value || !(value instanceof HTMLInputElement)) {
    throw new Error("Wormhole controls not found");
  }
  return { down, up, value };
}
function getCutControls() {
  const down = document.getElementById(CUT_DOWN_ID);
  const up = document.getElementById(CUT_UP_ID);
  const value = document.getElementById(CUT_VALUE_ID);
  if (!down || !(down instanceof HTMLButtonElement) || !up || !(up instanceof HTMLButtonElement) || !value || !(value instanceof HTMLInputElement)) {
    throw new Error("Cut controls not found");
  }
  return { down, up, value };
}
function getStartControls() {
  const down = document.getElementById(START_DOWN_ID);
  const up = document.getElementById(START_UP_ID);
  const value = document.getElementById(START_VALUE_ID);
  if (!down || !(down instanceof HTMLButtonElement) || !up || !(up instanceof HTMLButtonElement) || !value || !(value instanceof HTMLInputElement)) {
    throw new Error("Start controls not found");
  }
  return { down, up, value };
}
function getSeedControls() {
  const use = document.getElementById(SEED_USE_ID);
  const value = document.getElementById(SEED_VALUE_ID);
  const apply = document.getElementById(SEED_APPLY_ID);
  if (!use || !(use instanceof HTMLInputElement) || !value || !(value instanceof HTMLInputElement) || !apply || !(apply instanceof HTMLButtonElement)) {
    throw new Error("Seed controls not found");
  }
  return { use, value, apply };
}
function clamp01(x) {
  if (x < 0) {
    return 0;
  }
  if (x > 1) {
    return 1;
  }
  return x;
}
function bytesToHex(bytes) {
  const u8 = new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < u8.length; i++) {
    out += u8[i].toString(16).padStart(2, "0");
  }
  return out;
}
function ensureShaBuffers(size) {
  const bits = size * size;
  const bytes = bits + 7 >> 3;
  if (shaInputSize === size && shaBitsetBytes && shaInputBytes) {
    if (shaBitsetBytes.length === bytes && shaInputBytes.length === 4 + bytes) {
      return;
    }
  }
  shaInputSize = size;
  shaBitsetBytes = new Uint8Array(bytes);
  shaInputBytes = new Uint8Array(4 + bytes);
  const dv = new DataView(shaInputBytes.buffer);
  dv.setUint32(0, size >>> 0, true);
}
async function computeBoardSha256(liveCells, size) {
  ensureShaBuffers(size);
  if (!shaBitsetBytes || !shaInputBytes) {
    return "\u2014";
  }
  shaBitsetBytes.fill(0);
  for (const { x, y } of liveCells) {
    const idx = x * size + y;
    const bi = idx >> 3;
    const bit = idx & 7;
    shaBitsetBytes[bi] |= 1 << bit;
  }
  shaInputBytes.set(shaBitsetBytes, 4);
  if (!crypto.subtle || typeof crypto.subtle.digest !== "function") {
    return "\u2014";
  }
  const digest = await crypto.subtle.digest("SHA-256", shaInputBytes);
  return bytesToHex(digest);
}
function recordSha(sha, g) {
  shaHistoryQueue.push({ sha, gen: g });
  if (!shaFirstSeenGen.has(sha)) {
    shaFirstSeenGen.set(sha, g);
  } else if (shaCycleStartGen === null || shaCyclePeriod === null) {
    const first = shaFirstSeenGen.get(sha);
    if (first !== void 0 && first !== g) {
      shaCycleStartGen = first;
      shaCyclePeriod = g - first;
      if (shaCyclePeriod > 0 && shaCyclePeriod <= CYCLE_SHA_MAX_PERIOD) {
        shaCyclePhaseShorts = new Array(shaCyclePeriod).fill("\u2014");
      } else {
        shaCyclePhaseShorts = null;
      }
    }
  }
  if (shaCycleStartGen !== null && shaCyclePeriod !== null && shaCyclePhaseShorts) {
    const p = shaCyclePeriod;
    if (p > 0) {
      const phase = ((g - shaCycleStartGen) % p + p) % p;
      shaCyclePhaseShorts[phase] = sha.slice(0, 16);
    }
  }
  while (shaHistoryQueue.length > SHA_HISTORY_MAX) {
    const ev = shaHistoryQueue.shift();
    if (!ev) {
      break;
    }
    if (shaFirstSeenGen.get(ev.sha) === ev.gen) {
      shaFirstSeenGen.delete(ev.sha);
    }
  }
}
function maybeUpdateSha(liveCells, size, g) {
  if (paused) {
    return;
  }
  if (shaInFlightGen !== null) {
    return;
  }
  shaInFlightGen = g;
  void computeBoardSha256(liveCells, size).then((sha) => {
    if (shaInFlightGen !== g) {
      return;
    }
    shaInFlightGen = null;
    if (sha !== "\u2014") {
      lastShaShort = sha.slice(0, 16);
      recordSha(sha, g);
    } else {
      lastShaShort = "\u2014";
    }
  }).catch(() => {
    shaInFlightGen = null;
    lastShaShort = "\u2014";
  });
}
function computeWormholeProbForCurrentSize() {
  const size = getGridSize();
  const n = size * size;
  const pairs = n * (n - 1) / 2;
  if (!(pairs > 0)) {
    return 0;
  }
  return clamp01(targetWormholes / pairs);
}
function syncWormholeProbToTarget() {
  wormholeProb = computeWormholeProbForCurrentSize();
}
function backgroundColors(nowMs) {
  const t = nowMs / 1e3;
  const cycle = 240;
  const a = 2 * Math.PI * (t % cycle) / cycle;
  const hue = (220 + 80 * Math.sin(a)) % 360;
  const hue2 = (hue + 25) % 360;
  const l0 = 10 + 6 * (0.5 + 0.5 * Math.sin(a * 0.9 + 1.3));
  const l1 = l0 + 8;
  const bg0 = `hsl(${hue.toFixed(1)} 18% ${l0.toFixed(1)}%)`;
  const bg1 = `hsl(${hue2.toFixed(1)} 18% ${l1.toFixed(1)}%)`;
  return { bg0, bg1 };
}
function draw(liveCells, nowMs) {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = golGetSize();
  const scale = canvas.width / size;
  const checkerSize = getCheckerSize();
  const blockPx = checkerSize * scale;
  const { bg0, bg1 } = backgroundColors(nowMs);
  ctx.fillStyle = bg0;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bg1;
  const nBlock = Math.ceil(size / checkerSize);
  for (let bi = 0; bi < nBlock; bi++) {
    for (let bj = 0; bj < nBlock; bj++) {
      if ((bi + bj) % 2 !== 1) continue;
      ctx.fillRect(bi * blockPx, bj * blockPx, blockPx, blockPx);
    }
  }
  ctx.fillStyle = LIVE_CELL_RGBA;
  for (const { x, y } of liveCells) {
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }
}
function tick() {
  if (!golIsCreated()) return;
  const now = performance.now();
  if (!paused) {
    if (lastFrameTime !== null) {
      frameTimes.push(now - lastFrameTime);
      if (frameTimes.length > FPS_SAMPLES) {
        frameTimes.shift();
      }
    }
    lastFrameTime = now;
  }
  if (!paused) {
    golEvolve();
    gen += 1;
  }
  const liveCells = paused ? lastLiveCells : golGetLiveCells();
  if (!paused) {
    lastLiveCells = liveCells;
  }
  draw(liveCells, now);
  maybeUpdateSha(liveCells, golGetSize(), gen);
  const total = golGetSize() * golGetSize();
  const liveCount = liveCells.length;
  const deadCount = total - liveCount;
  updateStatsDisplay(liveCount, deadCount, lastSeedUsed);
  animationId = requestAnimationFrame(tick);
}
function startLoop() {
  if (animationId !== null) return;
  tick();
}
function stopLoop() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}
var GEN_WIDTH = 4;
var ALIVE_DEAD_WIDTH = 6;
function getMeterCanvas() {
  const el = document.getElementById(METER_ID);
  if (!el || !(el instanceof HTMLCanvasElement)) {
    throw new Error(`Meter canvas #${METER_ID} not found`);
  }
  return el;
}
function clamp01f(x) {
  if (x < 0) {
    return 0;
  }
  if (x > 1) {
    return 1;
  }
  return x;
}
function drawLiveDeadMeter(liveCount, deadCount, total) {
  const canvas = getMeterCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = Math.floor(w * 0.5);
  const cy = Math.floor(h * 0.58);
  const r = Math.floor(Math.min(w, h) * 0.38);
  const ring = Math.max(10, Math.floor(r * 0.22));
  const aliveFrac = total > 0 ? clamp01f(liveCount / total) : 0;
  const deadFrac = total > 0 ? clamp01f(deadCount / total) : 0;
  const start = -Math.PI * 0.5;
  const aliveEnd = start + aliveFrac * Math.PI * 2;
  const colAlive = "#859900";
  const colDead = "#dc322f";
  const colRing = "rgba(7,54,66,0.25)";
  const colNeedle = "rgba(38,139,210,0.95)";
  ctx.lineWidth = ring;
  ctx.lineCap = "round";
  ctx.strokeStyle = colRing;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colAlive;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, aliveEnd);
  ctx.stroke();
  ctx.strokeStyle = "rgba(220,50,47,0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, aliveEnd, start + (aliveFrac + deadFrac) * Math.PI * 2);
  ctx.stroke();
  const needleA = aliveEnd;
  const nx = cx + Math.cos(needleA) * (r + ring * 0.1);
  const ny = cy + Math.sin(needleA) * (r + ring * 0.1);
  ctx.strokeStyle = colNeedle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.stroke();
  ctx.fillStyle = colNeedle;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  const alivePct = Math.round(aliveFrac * 100);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(7,54,66,0.8)";
  ctx.font = "700 16px ui-monospace, monospace";
  ctx.fillText(`alive ${alivePct}%`, cx, Math.floor(h * 0.12));
}
function topologyLabel() {
  if (topology === 2) {
    return "Cylinder";
  }
  if (topology === 0) {
    return "Finite";
  }
  return "Torus";
}
function updateStatsDisplay(liveCount, deadCount, seed) {
  const head = document.getElementById(HEAD_SPAN_ID);
  if (head) {
    head.textContent = "Game of Life (C++ / WASM)";
  }
  const el = document.getElementById(STATS_ID);
  if (!el) {
    return;
  }
  drawLiveDeadMeter(liveCount, deadCount, golIsCreated() ? golGetSize() * golGetSize() : 0);
  const total = golIsCreated() ? golGetSize() * golGetSize() : 0;
  const seedStr = seed !== null ? String(seed) : "\u2014";
  let fpsStr = "\u2014";
  if (paused) {
    fpsStr = lastFpsStr;
  } else if (frameTimes.length >= 1) {
    const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    fpsStr = (1e3 / avgMs).toFixed(1);
  }
  if (!paused) {
    lastFpsStr = fpsStr;
  }
  const genStr = String(gen).padStart(GEN_WIDTH, " ");
  const aliveStr = String(liveCount).padStart(ALIVE_DEAD_WIDTH, " ");
  const deadStr = String(deadCount).padStart(ALIVE_DEAD_WIDTH, " ");
  const mono = "font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums";
  const lineTopo = `topo: ${topologyLabel()}`;
  const lineScale = `scale: ${getNFactor()}`;
  const lineWormholes = `wormholes: ${golIsCreated() ? golGetWormholeEdges() : 0}`;
  const lineCuts = `cuts(nodes): ${golIsCreated() ? golGetCutEdges() : 0}`;
  const stableSha = shaCyclePeriod !== null && shaCyclePeriod > 0 && shaCyclePeriod <= CYCLE_SHA_MAX_PERIOD && shaCyclePhaseShorts && shaCyclePhaseShorts.every((s) => s !== "\u2014") ? shaCyclePhaseShorts.join(" / ") : lastShaShort;
  const lineSha = `sha: ${stableSha}`;
  const lineRepeat = shaCycleStartGen !== null && shaCyclePeriod !== null ? `repeat: g${shaCycleStartGen}->g${gen} (p=${shaCyclePeriod})` : "repeat: \u2014";
  const lineSeed = `seed: ${seedStr}`;
  const lineGen = `gen: ${genStr}`;
  const lineTotal = `total: ${total}`;
  const lineAlive = `alive: ${aliveStr}`;
  const lineDead = `dead:  ${deadStr}`;
  const lineFps = `fps: ${fpsStr}`;
  const text = document.getElementById(STATS_TEXT_ID);
  if (text) {
    text.innerHTML = `<span style="${mono}">${lineTopo}</span><br><span style="${mono}">${lineScale}</span><br><span style="${mono}">${lineWormholes}</span><br><span style="${mono}">${lineCuts}</span><br><span style="${mono}">${lineSha}</span><br><span style="${mono}">${lineRepeat}</span><br><span style="${mono}">${lineSeed}</span><br><span style="${mono}">${lineGen}</span><br><span style="${mono}">${lineTotal}</span><br><span style="${mono}">${lineAlive}</span><br><span style="${mono}">${lineDead}</span><br><span style="${mono}">${lineFps}</span>`;
  } else {
    el.innerHTML = `<span style="${mono}">${lineTopo}</span><br><span style="${mono}">${lineScale}</span><br><span style="${mono}">${lineWormholes}</span><br><span style="${mono}">${lineCuts}</span><br><span style="${mono}">${lineSha}</span><br><span style="${mono}">${lineRepeat}</span><br><span style="${mono}">${lineSeed}</span><br><span style="${mono}">${lineGen}</span><br><span style="${mono}">${lineTotal}</span><br><span style="${mono}">${lineAlive}</span><br><span style="${mono}">${lineDead}</span><br><span style="${mono}">${lineFps}</span>`;
  }
}
function updateScaleDisplay() {
  const el = document.getElementById(SCALE_VALUE_ID);
  if (el) el.textContent = String(getNFactor());
}
function computeSeedFromControls() {
  const seed = getSeedControls();
  if (seed.use.checked) {
    const v = Number(seed.value.value);
    if (Number.isFinite(v)) {
      return v >>> 0;
    }
  }
  return (Date.now() >>> 0 ^ crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
}
function applySeedControls(seedValue) {
  const seed = getSeedControls();
  seed.value.value = String(seedValue >>> 0);
}
function onRestart() {
  if (!golIsCreated()) {
    golCreate(getGridSize());
  }
  paused = false;
  const pauseBtn = document.getElementById(BTN_PAUSE_ID);
  if (pauseBtn instanceof HTMLButtonElement) {
    pauseBtn.textContent = "Pause";
  }
  const seedValue = computeSeedFromControls();
  if (!getSeedControls().use.checked) {
    applySeedControls(seedValue);
  }
  golSetTopology(topology);
  wormholeSeed = (seedValue ^ 2654435769) >>> 0;
  golSetWormholeCount(targetWormholes);
  golSetWormholeSeed(wormholeSeed);
  cutSeed = (seedValue ^ 608135816) >>> 0;
  golSetCutCount(targetCuts);
  golSetCutSeed(cutSeed);
  gen = 0;
  frameTimes.length = 0;
  lastFrameTime = null;
  lastFpsStr = "\u2014";
  lastSeedUsed = seedValue >>> 0;
  lastShaShort = "\u2014";
  shaInFlightGen = null;
  shaHistoryQueue = [];
  shaFirstSeenGen = /* @__PURE__ */ new Map();
  shaCycleStartGen = null;
  shaCyclePeriod = null;
  shaCyclePhaseShorts = null;
  const liveProb = clamp01(startPercent / 100);
  golRandomInitWithSeed(liveProb, seedValue >>> 0);
  lastLiveCells = golGetLiveCells();
  startLoop();
}
function onPauseToggle() {
  paused = !paused;
  const { pause } = getButtons();
  pause.textContent = paused ? "Resume" : "Pause";
  if (!paused) {
    lastFrameTime = null;
  }
}
function applyScaleAndReset() {
  stopLoop();
  if (golIsCreated()) {
    golDestroy();
  }
  golCreate(getGridSize());
  onRestart();
  updateScaleDisplay();
  syncWormholeProbToTarget();
}
function onScaleDown() {
  if (scaleIndex <= 0) return;
  scaleIndex -= 1;
  applyScaleAndReset();
}
function onScaleUp() {
  if (scaleIndex >= SCALE_FACTORS.length - 1) return;
  scaleIndex += 1;
  applyScaleAndReset();
}
async function main() {
  await modulePromise;
  getCanvas();
  const { restart, pause } = getButtons();
  const topoBtns = getTopologyButtons();
  const wh = getWormholeControls();
  const cut = getCutControls();
  const start = getStartControls();
  const seed = getSeedControls();
  restart.addEventListener("click", onRestart);
  pause.addEventListener("click", onPauseToggle);
  topoBtns.torus.addEventListener("click", () => {
    topology = 1;
    applyScaleAndReset();
  });
  topoBtns.finite.addEventListener("click", () => {
    topology = 0;
    applyScaleAndReset();
  });
  topoBtns.cylinder.addEventListener("click", () => {
    topology = 2;
    applyScaleAndReset();
  });
  wh.down.addEventListener("click", () => {
    targetWormholes = Math.max(0, targetWormholes - TARGET_WORMHOLE_DELTA_PER_CLICK);
    wh.value.value = String(targetWormholes);
    syncWormholeProbToTarget();
  });
  wh.up.addEventListener("click", () => {
    targetWormholes = Math.max(0, targetWormholes + TARGET_WORMHOLE_DELTA_PER_CLICK);
    wh.value.value = String(targetWormholes);
    syncWormholeProbToTarget();
  });
  wh.value.addEventListener("change", () => {
    const v = Number(wh.value.value);
    if (Number.isFinite(v)) {
      targetWormholes = Math.max(0, Math.floor(v));
      wh.value.value = String(targetWormholes);
      syncWormholeProbToTarget();
    }
  });
  cut.down.addEventListener("click", () => {
    targetCuts = Math.max(0, targetCuts - TARGET_CUT_DELTA_PER_CLICK);
    cut.value.value = String(targetCuts);
  });
  cut.up.addEventListener("click", () => {
    targetCuts = Math.max(0, targetCuts + TARGET_CUT_DELTA_PER_CLICK);
    cut.value.value = String(targetCuts);
  });
  cut.value.addEventListener("change", () => {
    const v = Number(cut.value.value);
    if (Number.isFinite(v)) {
      targetCuts = Math.max(0, Math.floor(v));
      cut.value.value = String(targetCuts);
    }
  });
  start.down.addEventListener("click", () => {
    startPercent = Math.max(0, Math.min(100, startPercent - TARGET_START_DELTA_PER_CLICK));
    start.value.value = String(startPercent);
  });
  start.up.addEventListener("click", () => {
    startPercent = Math.max(0, Math.min(100, startPercent + TARGET_START_DELTA_PER_CLICK));
    start.value.value = String(startPercent);
  });
  start.value.addEventListener("change", () => {
    const v = Number(start.value.value);
    if (Number.isFinite(v)) {
      startPercent = Math.max(0, Math.min(100, Math.floor(v)));
      start.value.value = String(startPercent);
    }
  });
  seed.apply.addEventListener("click", () => {
    seed.use.checked = true;
    const v = Number(seed.value.value);
    if (Number.isFinite(v)) {
      seed.value.value = String(v >>> 0);
    }
  });
  seed.use.addEventListener("change", () => {
    if (!seed.use.checked) {
      seed.value.value = "";
    }
  });
  const scaleDown = document.getElementById(SCALE_DOWN_ID);
  const scaleUp = document.getElementById(SCALE_UP_ID);
  if (scaleDown) scaleDown.addEventListener("click", onScaleDown);
  if (scaleUp) scaleUp.addEventListener("click", onScaleUp);
  updateScaleDisplay();
  wh.value.value = String(targetWormholes);
  syncWormholeProbToTarget();
  cut.value.value = String(targetCuts);
  start.value.value = String(startPercent);
  seed.use.checked = false;
  seed.value.value = "";
  if (!golIsCreated()) {
    golCreate(getGridSize());
  }
  onRestart();
}
main().catch((err) => {
  console.error("Game of Life (C++) init failed:", err);
});
