/**
 * Driver for C++ Bars game (WASM): canvas with 4 bars, two choice buttons, future-state preview.
 */
import { modulePromise, barsGameCreate, barsGameSetSeed, barsGameInit, barsGameGetState, barsGameGetFutureState, barsGameApplyChoice, barsGameIsEnded, barsGameStateSize, barsGameMaxVal, } from "../tsl/wasm_api.js";
const CANVAS_ID = "bars-game-canvas";
const BTN_0_ID = "bars-game-btn-0";
const BTN_1_ID = "bars-game-btn-1";
const RESTART_ID = "bars-game-restart";
const STATUS_ID = "bars-game-status";
const PREVIEW_ID = "bars-game-preview";
const SEED_ID = "bars-game-seed";
const SHOW_NUMBERS_ID = "bars-game-show-numbers";
const HEAD_SPAN_ID = "head_span";
// Blue, pink, emerald, amber — high contrast on dark
const BAR_COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b"];
const LIGHT_BAR_COLORS = ["rgba(96, 165, 250, 0.95)", "rgba(244, 114, 182, 0.95)", "rgba(52, 211, 153, 0.95)", "rgba(251, 191, 36, 0.95)"];
const INCREASE_BAR_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"];
const DECREASE_BAR_COLORS = ["#2563eb", "#db2777", "#059669", "#d97706"];
const BAR_REGION_COLOR = "#000000";
let hoverChoice = null;
let currentSeed = 0;
let showNumbers = false;
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
    const restart = document.getElementById(RESTART_ID);
    if (!btn0 || !(btn0 instanceof HTMLButtonElement) || !btn1 || !(btn1 instanceof HTMLButtonElement) ||
        !restart || !(restart instanceof HTMLButtonElement)) {
        throw new Error(`Buttons not found`);
    }
    return { btn0, btn1, restart };
}
function barLayout(width, height, n) {
    const barWidth = (width * 0.8) / n;
    const gap = (width - barWidth * n) / (n + 1);
    const scale = height / Math.max(1, barsGameMaxVal());
    return { barWidth, gap, scale, n };
}
function drawBars(ctx, values, x, width, height, maxVal) {
    const n = values.length;
    if (n === 0)
        return;
    const { barWidth, gap, scale } = barLayout(width, height, n);
    const fullHeight = height;
    for (let i = 0; i < n; i++) {
        const bx = x + gap + i * (barWidth + gap);
        const barHeight = Math.max(0, (values[i] / maxVal) * fullHeight);
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
    if (n === 0)
        return;
    const { barWidth, gap, scale } = barLayout(width, height, n);
    const fullHeight = height;
    const bottom = height;
    for (let i = 0; i < n; i++) {
        const bx = gap + i * (barWidth + gap);
        const s = state[i];
        const f = future[i];
        const hCurrent = (s / maxVal) * fullHeight;
        const hFuture = (f / maxVal) * fullHeight;
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
        }
        else if (f > s) {
            ctx.fillStyle = baseColor;
            ctx.fillRect(bx, yCurrent, barWidth, hCurrent);
            ctx.fillStyle = increaseColor;
            ctx.fillRect(bx, yFuture, barWidth, hFuture - hCurrent);
        }
        else {
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
function wouldChoiceEndGame(future) {
    if (future.length === 0)
        return false;
    const maxVal = barsGameMaxVal();
    return future.some((v) => v === 0 || v === maxVal);
}
function draw() {
    const canvas = getCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    const width = canvas.width;
    const height = canvas.height;
    const maxVal = Math.max(1, barsGameMaxVal());
    const stateSize = barsGameStateSize();
    if (stateSize === 0)
        return;
    ctx.fillStyle = BAR_REGION_COLOR;
    ctx.fillRect(0, 0, width, height);
    const state = barsGameGetState();
    if (hoverChoice !== null && !barsGameIsEnded()) {
        const future = barsGameGetFutureState(hoverChoice);
        drawBarsWithDiff(ctx, state, future, width, height, maxVal);
        const previewEl = document.getElementById(PREVIEW_ID);
        if (previewEl)
            previewEl.textContent = `Preview: Choice ${hoverChoice} (lighter = up, darker = down)`;
    }
    else {
        drawBars(ctx, state, 0, width, height, maxVal);
        const previewEl = document.getElementById(PREVIEW_ID);
        if (previewEl)
            previewEl.textContent = "";
    }
}
function logState() {
    if (barsGameStateSize() === 0)
        return;
    console.log("bars", barsGameGetState());
}
function updateSeedDisplay() {
    const el = document.getElementById(SEED_ID);
    if (el)
        el.textContent = `Seed: ${currentSeed}  `;
}
function updateStatus() {
    const el = document.getElementById(STATUS_ID);
    if (el) {
        el.textContent = barsGameIsEnded() ? " Game over." : "";
    }
    const head = document.getElementById(HEAD_SPAN_ID);
    if (head) {
        head.textContent = barsGameIsEnded()
            ? "Bars game (C++ / WASM) — Game over"
            : "Bars game (C++ / WASM)";
    }
    updateSeedDisplay();
}
function setButtonsEnabled(enabled) {
    const { btn0, btn1 } = getButtons();
    btn0.disabled = !enabled;
    btn1.disabled = !enabled;
}
function onChoice(index) {
    if (barsGameIsEnded())
        return;
    barsGameApplyChoice(index);
    logState();
    updateStatus();
    if (barsGameIsEnded()) {
        setButtonsEnabled(false);
        hoverChoice = null;
    }
    else {
        hoverChoice = index;
    }
    draw();
}
function restart() {
    const seed = (Date.now() >>> 0) ^ (typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : 0);
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
    currentSeed = (Date.now() >>> 0) ^ (typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : 0);
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
    btn0.addEventListener("mouseenter", () => { hoverChoice = 0; draw(); });
    btn0.addEventListener("mouseleave", () => { hoverChoice = null; draw(); });
    btn1.addEventListener("mouseenter", () => { hoverChoice = 1; draw(); });
    btn1.addEventListener("mouseleave", () => { hoverChoice = null; draw(); });
    document.addEventListener("keydown", (e) => {
        if (barsGameIsEnded())
            return;
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            if (hoverChoice === 0) {
                onChoice(0);
            }
            else {
                hoverChoice = 0;
            }
            draw();
        }
        else if (e.key === "ArrowRight") {
            e.preventDefault();
            if (hoverChoice === 1) {
                onChoice(1);
            }
            else {
                hoverChoice = 1;
            }
            draw();
        }
    });
}
main().catch((err) => {
    console.error(err);
    const el = document.getElementById(STATUS_ID);
    if (el)
        el.textContent = " Error loading game.";
});
