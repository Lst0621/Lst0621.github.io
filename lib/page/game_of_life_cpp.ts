/**
 * Driver for C++ Game of Life (WASM): canvas, game loop, Random/Reset buttons.
 */
import {
    modulePromise,
    golCreate,
    golDestroy,
    golInit,
    golRandomInitWithSeed,
    golGetSeed,
    golEvolve,
    golGetLiveCells,
    golGetSize,
    golIsCreated,
} from "../tsl/wasm_api.js";

const CANVAS_ID = "gol-cpp";
const BTN_RANDOM_ID = "gol-cpp-random";
const BTN_RESET_ID = "gol-cpp-reset";
const HEAD_SPAN_ID = "head_span";
const SCALE_VALUE_ID = "gol-cpp-scale-value";
const SCALE_DOWN_ID = "gol-cpp-scale-down";
const SCALE_UP_ID = "gol-cpp-scale-up";
const BASE_GRID_SIZE = 40;
const LIVE_PROB = 0.2;
const FPS_SAMPLES = 30;

/** Scale factors that divide canvas evenly (640 / (40*n) integer). Use 1, 2, 4 for 16, 8, 4 px/cell. */
const SCALE_FACTORS = [1, 2, 4];
let scaleIndex = 1; // nFactor = SCALE_FACTORS[scaleIndex] = 2

function getNFactor(): number {
    return SCALE_FACTORS[scaleIndex];
}

function getGridSize(): number {
    return BASE_GRID_SIZE * getNFactor();
}

let animationId: number | null = null;
let gen = 0;
const frameTimes: number[] = [];
let lastFrameTime: number | null = null;

function getCanvas(): HTMLCanvasElement {
    const el = document.getElementById(CANVAS_ID);
    if (!el || !(el instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas #${CANVAS_ID} not found`);
    }
    return el;
}

function getButtons(): { random: HTMLButtonElement; reset: HTMLButtonElement } {
    const random = document.getElementById(BTN_RANDOM_ID);
    const reset = document.getElementById(BTN_RESET_ID);
    if (!random || !(random instanceof HTMLButtonElement) || !reset || !(reset instanceof HTMLButtonElement)) {
        throw new Error(`Buttons #${BTN_RANDOM_ID}, #${BTN_RESET_ID} not found`);
    }
    return { random, reset };
}

function draw(liveCells: { x: number; y: number }[]): void {
    const canvas = getCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = golGetSize();
    const scale = canvas.width / size;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "darkgray";
    for (const { x, y } of liveCells) {
        ctx.fillRect(x * scale, y * scale, scale, scale);
    }
}

function tick(): void {
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

function startLoop(): void {
    if (animationId !== null) return;
    tick();
}

function stopLoop(): void {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

const GEN_WIDTH = 4;
const ALIVE_DEAD_WIDTH = 6;

function updateStatsDisplay(liveCount: number, deadCount: number, seed: number | null): void {
    const el = document.getElementById(HEAD_SPAN_ID);
    if (!el) return;
    const total = golIsCreated() ? golGetSize() * golGetSize() : 0;
    const seedStr = seed !== null ? String(seed) : "—";
    let fpsStr = "—";
    if (frameTimes.length >= 1) {
        const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        fpsStr = (1000 / avgMs).toFixed(1);
    }
    const genStr = String(gen).padStart(GEN_WIDTH, " ");
    const aliveStr = String(liveCount).padStart(ALIVE_DEAD_WIDTH, " ");
    const deadStr = String(deadCount).padStart(ALIVE_DEAD_WIDTH, " ");
    el.innerHTML =
        "Game of Life (C++ / WASM)<br>" +
        `gen: ${genStr} alive: ${aliveStr} dead: ${deadStr} total: ${total} scale: ${getNFactor()} Seed: ${seedStr} fps: ${fpsStr}`;
}

function updateScaleDisplay(): void {
    const el = document.getElementById(SCALE_VALUE_ID);
    if (el) el.textContent = String(getNFactor());
}

function onRandom(): void {
    if (!golIsCreated()) {
        golCreate(getGridSize());
    }
    gen = 0;
    frameTimes.length = 0;
    lastFrameTime = null;
    const seed =
        (Date.now() >>> 0) ^ crypto.getRandomValues(new Uint32Array(1))[0];
    golRandomInitWithSeed(LIVE_PROB, seed);
    startLoop();
}

function onReset(): void {
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

function applyScaleAndReset(): void {
    stopLoop();
    if (golIsCreated()) {
        golDestroy();
    }
    golCreate(getGridSize());
    onRandom();
    updateScaleDisplay();
}

function onScaleDown(): void {
    if (scaleIndex <= 0) return;
    scaleIndex -= 1;
    applyScaleAndReset();
}

function onScaleUp(): void {
    if (scaleIndex >= SCALE_FACTORS.length - 1) return;
    scaleIndex += 1;
    applyScaleAndReset();
}

async function main(): Promise<void> {
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
