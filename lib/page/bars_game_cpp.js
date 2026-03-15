// lib/tsl/wasm_api.ts
import wasmSample from "../tsl/wasm/wasm_out_v1/wasm_sample.js";
var moduleInstance = null;
async function createModulePromise() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  const proc = g && g.process;
  const inNode = typeof proc?.versions?.node === "string";
  if (inNode) {
    const nodeFs = "node:fs";
    const nodeUrl = "node:url";
    const nodePath = "node:path";
    const fs = await import(nodeFs);
    const url = await import(nodeUrl);
    const path = await import(nodePath);
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wasmPath = path.join(__dirname, "wasm", "wasm_out_v1", "wasm_sample.wasm");
    const wasmBinary = fs.readFileSync(wasmPath);
    const mod2 = await wasmSample({ wasmBinary });
    moduleInstance = mod2;
    return mod2;
  }
  const mod = await wasmSample();
  moduleInstance = mod;
  return mod;
}
var modulePromise = createModulePromise();
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
  const m2 = moduleInstance;
  const HEAP32 = m2.HEAP32;
  if (!HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return HEAP32;
}
var BARS_GAME_BASE_INTS = 1280;
var barsGameHandle = null;
var m = () => moduleInstance;
function barsGameCreate() {
  if (!moduleInstance) throw new Error("WASM module not initialized.");
  if (barsGameHandle !== null) {
    m()._bars_game_destroy(barsGameHandle);
  }
  barsGameHandle = m()._bars_game_create();
}
function barsGameSetSeed(seed) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_set_seed(barsGameHandle, seed);
}
function barsGameInit() {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_init(barsGameHandle);
}
function barsGameGetState() {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  const HEAP32 = getHeap32();
  const size = m()._bars_game_state_size(barsGameHandle);
  if (HEAP32.length < BARS_GAME_BASE_INTS + size) throw new Error("WASM memory exhausted");
  m()._bars_game_get_state(barsGameHandle, BARS_GAME_BASE_INTS * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[BARS_GAME_BASE_INTS + i]);
  return out;
}
function barsGameGetFutureState(choiceIndex) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  const HEAP32 = getHeap32();
  const size = m()._bars_game_state_size(barsGameHandle);
  if (HEAP32.length < BARS_GAME_BASE_INTS + size) throw new Error("WASM memory exhausted");
  m()._bars_game_get_future_state(barsGameHandle, choiceIndex, BARS_GAME_BASE_INTS * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[BARS_GAME_BASE_INTS + i]);
  return out;
}
function barsGameApplyChoice(index) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_apply_choice(barsGameHandle, index);
}
function barsGameIsEnded() {
  if (!moduleInstance || barsGameHandle === null) return true;
  return m()._bars_game_is_ended(barsGameHandle) !== 0;
}
function barsGameStateSize() {
  if (!moduleInstance || barsGameHandle === null) return 0;
  return m()._bars_game_state_size(barsGameHandle);
}
function barsGameMaxVal() {
  if (!moduleInstance || barsGameHandle === null) return 2e3;
  return m()._bars_game_max_val(barsGameHandle);
}

// lib/page/bars_game_cpp.ts
var CANVAS_ID = "bars-game-canvas";
var BTN_0_ID = "bars-game-btn-0";
var BTN_1_ID = "bars-game-btn-1";
var RESTART_ID = "bars-game-restart";
var STATUS_ID = "bars-game-status";
var PREVIEW_ID = "bars-game-preview";
var SEED_ID = "bars-game-seed";
var SHOW_NUMBERS_ID = "bars-game-show-numbers";
var HEAD_SPAN_ID = "head_span";
var BAR_COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b"];
var LIGHT_BAR_COLORS = ["rgba(96, 165, 250, 0.95)", "rgba(244, 114, 182, 0.95)", "rgba(52, 211, 153, 0.95)", "rgba(251, 191, 36, 0.95)"];
var INCREASE_BAR_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"];
var DECREASE_BAR_COLORS = ["#2563eb", "#db2777", "#059669", "#d97706"];
var BAR_REGION_COLOR = "#000000";
var hoverChoice = null;
var currentSeed = 0;
var showNumbers = false;
function getCanvas() {
  const el = document.getElementById(CANVAS_ID);
  if (!el || !(el instanceof HTMLCanvasElement)) {
    throw new Error(`Canvas #${CANVAS_ID} not found`);
  }
  return el;
}
function getButtons() {
  const btn0 = document.getElementById(BTN_0_ID);
  const btn1 = document.getElementById(BTN_1_ID);
  const restart2 = document.getElementById(RESTART_ID);
  if (!btn0 || !(btn0 instanceof HTMLButtonElement) || !btn1 || !(btn1 instanceof HTMLButtonElement) || !restart2 || !(restart2 instanceof HTMLButtonElement)) {
    throw new Error(`Buttons not found`);
  }
  return { btn0, btn1, restart: restart2 };
}
function barLayout(width, height, n) {
  const barWidth = width * 0.8 / n;
  const gap = (width - barWidth * n) / (n + 1);
  const scale = height / Math.max(1, barsGameMaxVal());
  return { barWidth, gap, scale, n };
}
function drawBars(ctx, values, x, width, height, maxVal) {
  const n = values.length;
  if (n === 0) {
    return;
  }
  const { barWidth, gap, scale } = barLayout(width, height, n);
  const fullHeight = height;
  for (let i = 0; i < n; i++) {
    const bx = x + gap + i * (barWidth + gap);
    const barHeight = Math.max(0, values[i] / maxVal * fullHeight);
    const by = height - barHeight;
    ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length];
    ctx.fillRect(bx, by, barWidth, barHeight);
    if (showNumbers) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(values[i]), bx + barWidth / 2, by + barHeight / 2 + 4);
      ctx.textAlign = "left";
    }
  }
}
function drawBarsWithDiff(ctx, state, future, width, height, maxVal) {
  const n = state.length;
  if (n === 0) {
    return;
  }
  const { barWidth, gap, scale } = barLayout(width, height, n);
  const fullHeight = height;
  const bottom = height;
  for (let i = 0; i < n; i++) {
    const bx = gap + i * (barWidth + gap);
    const s = state[i];
    const f = future[i];
    const hCurrent = s / maxVal * fullHeight;
    const hFuture = f / maxVal * fullHeight;
    const yCurrent = bottom - hCurrent;
    const yFuture = bottom - hFuture;
    const idx = i % BAR_COLORS.length;
    const baseColor = LIGHT_BAR_COLORS[idx];
    const increaseColor = INCREASE_BAR_COLORS[idx];
    const decreaseColor = DECREASE_BAR_COLORS[idx];
    if (f < s) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yFuture, barWidth, hFuture);
      ctx.fillStyle = decreaseColor;
      ctx.fillRect(bx, yCurrent, barWidth, yFuture - yCurrent);
    } else if (f > s) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yCurrent, barWidth, hCurrent);
      ctx.fillStyle = increaseColor;
      ctx.fillRect(bx, yFuture, barWidth, hFuture - hCurrent);
    } else {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yCurrent, barWidth, hCurrent);
    }
    if (f === 0 || f === maxVal) {
      ctx.strokeStyle = "#c00";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, yFuture, barWidth, hFuture);
    }
    const val = future[i];
    if (showNumbers) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      const by = bottom - hFuture;
      const barHeight = hFuture;
      ctx.fillText(String(val), bx + barWidth / 2, by + barHeight / 2 + 4);
      ctx.textAlign = "left";
    }
  }
}
function draw() {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const width = canvas.width;
  const height = canvas.height;
  const maxVal = Math.max(1, barsGameMaxVal());
  const stateSize = barsGameStateSize();
  if (stateSize === 0) {
    return;
  }
  ctx.fillStyle = BAR_REGION_COLOR;
  ctx.fillRect(0, 0, width, height);
  const state = barsGameGetState();
  if (hoverChoice !== null && !barsGameIsEnded()) {
    const future = barsGameGetFutureState(hoverChoice);
    drawBarsWithDiff(ctx, state, future, width, height, maxVal);
    const previewEl = document.getElementById(PREVIEW_ID);
    if (previewEl) {
      previewEl.textContent = `Preview: Choice ${hoverChoice} (lighter = up, darker = down)`;
    }
  } else {
    drawBars(ctx, state, 0, width, height, maxVal);
    const previewEl = document.getElementById(PREVIEW_ID);
    if (previewEl) {
      previewEl.textContent = "";
    }
  }
}
function logState() {
  if (barsGameStateSize() === 0) {
    return;
  }
  console.log("bars", barsGameGetState());
}
function updateSeedDisplay() {
  const el = document.getElementById(SEED_ID);
  if (el) {
    el.textContent = `Seed: ${currentSeed}  `;
  }
}
function updateStatus() {
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.textContent = barsGameIsEnded() ? " Game over." : "";
  }
  const head = document.getElementById(HEAD_SPAN_ID);
  if (head) {
    head.textContent = barsGameIsEnded() ? "Bars game (C++ / WASM) \u2014 Game over" : "Bars game (C++ / WASM)";
  }
  updateSeedDisplay();
}
function setButtonsEnabled(enabled) {
  const { btn0, btn1 } = getButtons();
  btn0.disabled = !enabled;
  btn1.disabled = !enabled;
}
function onChoice(index) {
  if (barsGameIsEnded()) {
    return;
  }
  barsGameApplyChoice(index);
  logState();
  updateStatus();
  if (barsGameIsEnded()) {
    setButtonsEnabled(false);
    hoverChoice = null;
  } else {
    hoverChoice = index;
  }
  draw();
}
function restart() {
  const seed = Date.now() >>> 0 ^ (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : 0);
  currentSeed = seed;
  barsGameSetSeed(seed);
  barsGameInit();
  logState();
  setButtonsEnabled(true);
  updateStatus();
  draw();
}
async function main() {
  await modulePromise;
  barsGameCreate();
  currentSeed = Date.now() >>> 0 ^ (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : 0);
  barsGameSetSeed(currentSeed);
  barsGameInit();
  logState();
  const showNumbersEl = document.getElementById(SHOW_NUMBERS_ID);
  if (showNumbersEl && showNumbersEl instanceof HTMLInputElement) {
    showNumbers = showNumbersEl.checked;
    showNumbersEl.addEventListener("change", () => {
      showNumbers = showNumbersEl.checked;
      draw();
    });
  }
  draw();
  updateStatus();
  setButtonsEnabled(true);
  const { btn0, btn1, restart: restartBtn } = getButtons();
  btn0.addEventListener("click", () => onChoice(0));
  btn1.addEventListener("click", () => onChoice(1));
  restartBtn.addEventListener("click", restart);
  btn0.addEventListener("mouseenter", () => {
    hoverChoice = 0;
    draw();
  });
  btn0.addEventListener("mouseleave", () => {
    hoverChoice = null;
    draw();
  });
  btn1.addEventListener("mouseenter", () => {
    hoverChoice = 1;
    draw();
  });
  btn1.addEventListener("mouseleave", () => {
    hoverChoice = null;
    draw();
  });
  document.addEventListener("keydown", (e) => {
    if (barsGameIsEnded()) {
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (hoverChoice === 0) {
        onChoice(0);
      } else {
        hoverChoice = 0;
      }
      draw();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (hoverChoice === 1) {
        onChoice(1);
      } else {
        hoverChoice = 1;
      }
      draw();
    }
  });
}
main().catch((err) => {
  console.error(err);
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.textContent = " Error loading game.";
  }
});
