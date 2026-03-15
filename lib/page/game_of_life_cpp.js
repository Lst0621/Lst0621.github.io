// lib/tsl/wasm_api.ts
import wasmSample from "../tsl/wasm/wasm_out_v1/wasm_sample.js";
var moduleInstance = null;
var modulePromise = wasmSample().then((m) => {
  moduleInstance = m;
  return m;
});
function initWasm() {
  return modulePromise;
}
await initWasm();
function getHeap32() {
  if (!moduleInstance) {
    throw new Error(
      "WASM module not initialized. Call and await initWasm() before using WASM functions."
    );
  }
  const m = moduleInstance;
  const HEAP32 = m.HEAP32;
  if (!HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return HEAP32;
}
var GOL_DEFAULT_SIZE = 40;
var golHandle = null;
var golSize = GOL_DEFAULT_SIZE;
function golCreate(size) {
  if (!moduleInstance) throw new Error("WASM module not initialized.");
  if (golHandle !== null) {
    moduleInstance._gol_destroy(golHandle);
  }
  golHandle = moduleInstance._gol_create(size);
  golSize = size;
}
function golDestroy() {
  if (moduleInstance && golHandle !== null) {
    moduleInstance._gol_destroy(golHandle);
    golHandle = null;
  }
}
function golInit() {
  if (!moduleInstance || golHandle === null) throw new Error("GoL not created. Call golCreate first.");
  moduleInstance._gol_init(golHandle);
}
function golRandomInitWithSeed(liveProb, seed) {
  if (!moduleInstance || golHandle === null) throw new Error("GoL not created. Call golCreate first.");
  moduleInstance._gol_random_init_seed(golHandle, liveProb, seed);
}
function golGetSeed() {
  if (!moduleInstance || golHandle === null) return 0;
  return moduleInstance._gol_get_seed(golHandle);
}
function golEvolve() {
  if (!moduleInstance || golHandle === null) throw new Error("GoL not created. Call golCreate first.");
  moduleInstance._gol_evolve(golHandle);
}
function golGetLiveCells() {
  if (!moduleInstance || golHandle === null) throw new Error("GoL not created. Call golCreate first.");
  const HEAP32 = getHeap32();
  const maxCount = golSize * golSize;
  const bytes = 2 * maxCount * 4;
  const ptr = moduleInstance._malloc(bytes);
  if (ptr === 0) throw new Error("WASM malloc failed for GoL live cells.");
  try {
    const count = moduleInstance._gol_get_live_cells(golHandle, ptr, maxCount);
    const out = [];
    const base = ptr / 4;
    for (let i = 0; i < count; i++) {
      out.push({ x: HEAP32[base + 2 * i], y: HEAP32[base + 2 * i + 1] });
    }
    return out;
  } finally {
    moduleInstance._free(ptr);
  }
}
function golGetSize() {
  return golSize;
}
function golIsCreated() {
  return golHandle !== null;
}

// lib/page/game_of_life_cpp.ts
var CANVAS_ID = "gol-cpp";
var BTN_RANDOM_ID = "gol-cpp-random";
var BTN_RESET_ID = "gol-cpp-reset";
var HEAD_SPAN_ID = "head_span";
var SCALE_VALUE_ID = "gol-cpp-scale-value";
var SCALE_DOWN_ID = "gol-cpp-scale-down";
var SCALE_UP_ID = "gol-cpp-scale-up";
var BASE_GRID_SIZE = 40;
var LIVE_PROB = 0.2;
var FPS_SAMPLES = 30;
var SCALE_FACTORS = [1, 2, 4];
var scaleIndex = 1;
var CHECKER_SIZE_AT_SCALE_2 = 8;
function getCheckerSize() {
  return CHECKER_SIZE_AT_SCALE_2 * getNFactor() / 2;
}
var REGION_BG = ["#1a1a1a", "#2d2d2d"];
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
function getCanvas() {
  const el = document.getElementById(CANVAS_ID);
  if (!el || !(el instanceof HTMLCanvasElement)) {
    throw new Error(`Canvas #${CANVAS_ID} not found`);
  }
  return el;
}
function getButtons() {
  const random = document.getElementById(BTN_RANDOM_ID);
  const reset = document.getElementById(BTN_RESET_ID);
  if (!random || !(random instanceof HTMLButtonElement) || !reset || !(reset instanceof HTMLButtonElement)) {
    throw new Error(`Buttons #${BTN_RANDOM_ID}, #${BTN_RESET_ID} not found`);
  }
  return { random, reset };
}
function draw(liveCells) {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = golGetSize();
  const scale = canvas.width / size;
  const checkerSize = getCheckerSize();
  const blockPx = checkerSize * scale;
  ctx.fillStyle = REGION_BG[0];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = REGION_BG[1];
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
  if (lastFrameTime !== null) {
    frameTimes.push(now - lastFrameTime);
    if (frameTimes.length > FPS_SAMPLES) frameTimes.shift();
  }
  lastFrameTime = now;
  golEvolve();
  gen += 1;
  const liveCells = golGetLiveCells();
  draw(liveCells);
  const total = golGetSize() * golGetSize();
  const liveCount = liveCells.length;
  const deadCount = total - liveCount;
  updateStatsDisplay(liveCount, deadCount, golGetSeed());
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
function updateStatsDisplay(liveCount, deadCount, seed) {
  const el = document.getElementById(HEAD_SPAN_ID);
  if (!el) return;
  const total = golIsCreated() ? golGetSize() * golGetSize() : 0;
  const seedStr = seed !== null ? String(seed) : "\u2014";
  let fpsStr = "\u2014";
  if (frameTimes.length >= 1) {
    const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    fpsStr = (1e3 / avgMs).toFixed(1);
  }
  const genStr = String(gen).padStart(GEN_WIDTH, " ");
  const aliveStr = String(liveCount).padStart(ALIVE_DEAD_WIDTH, " ");
  const deadStr = String(deadCount).padStart(ALIVE_DEAD_WIDTH, " ");
  const mono = "font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums";
  const line1 = `gen: ${genStr} alive: ${aliveStr} dead: ${deadStr} total: ${total}`;
  const line2 = `scale: ${getNFactor()} Seed: ${seedStr} fps: ${fpsStr}`;
  el.innerHTML = `Game of Life (C++ / WASM)<br><span style="${mono}">${line1}</span><br><span style="${mono}">${line2}</span>`;
}
function updateScaleDisplay() {
  const el = document.getElementById(SCALE_VALUE_ID);
  if (el) el.textContent = String(getNFactor());
}
function onRandom() {
  if (!golIsCreated()) {
    golCreate(getGridSize());
  }
  gen = 0;
  frameTimes.length = 0;
  lastFrameTime = null;
  const seed = Date.now() >>> 0 ^ crypto.getRandomValues(new Uint32Array(1))[0];
  golRandomInitWithSeed(LIVE_PROB, seed);
  startLoop();
}
function onReset() {
  stopLoop();
  gen = 0;
  frameTimes.length = 0;
  lastFrameTime = null;
  if (golIsCreated()) {
    golInit();
    draw([]);
    updateStatsDisplay(0, golGetSize() * golGetSize(), null);
  }
}
function applyScaleAndReset() {
  stopLoop();
  if (golIsCreated()) {
    golDestroy();
  }
  golCreate(getGridSize());
  onRandom();
  updateScaleDisplay();
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
  const { random: btnRandom, reset: btnReset } = getButtons();
  btnRandom.addEventListener("click", onRandom);
  btnReset.addEventListener("click", onReset);
  const scaleDown = document.getElementById(SCALE_DOWN_ID);
  const scaleUp = document.getElementById(SCALE_UP_ID);
  if (scaleDown) scaleDown.addEventListener("click", onScaleDown);
  if (scaleUp) scaleUp.addEventListener("click", onScaleUp);
  updateScaleDisplay();
  if (!golIsCreated()) {
    golCreate(getGridSize());
  }
  onRandom();
}
main().catch((err) => {
  console.error("Game of Life (C++) init failed:", err);
});
