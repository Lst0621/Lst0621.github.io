import { catalogEntryById, levelSpiralRelay, type LevelDefinition } from "../bubble_chain/levels.js";
import { bubbleGridSpacing } from "../bubble_chain/layout.js";
import {
    generateLevel,
    pathSelfIntersects,
    randomSeed,
    tryGenerateLevel,
} from "../bubble_chain/generator.js";
import { isSurfaceTopology, surfaceTopologyLabel } from "../common/topology.js";
import {
    createState,
    directionVector,
    hitTest,
    isIdle,
    isLost,
    isWon,
    resetState,
    startBubble,
    step,
    visibleTopologyCopies,
    type PuzzleState,
} from "../bubble_chain/model.js";
import type { BubbleState, Direction, Topology } from "../bubble_chain/types.js";

const CANVAS_ID = "bubble-chain-canvas";
const STATUS_ID = "bubble-chain-status";
const ATTEMPTS_ID = "bubble-chain-attempts";
const RESET_ID = "bubble-chain-reset";
const RESTART_ID = "bubble-chain-restart";
const LEVEL_NAME_ID = "bubble-chain-level-name";
const LEVEL_BUTTONS_ID = "bubble-chain-level-buttons";
const TOPOLOGY_BUTTONS_ID = "bubble-chain-topology-buttons";
const RANDOM_ID = "bubble-chain-random";
const SEED_ID = "bubble-chain-seed";
const BUBBLES_ID = "bubble-chain-bubble-count";

const POP_DURATION_MS = 320;

type PopEffect = {
    x: number;
    y: number;
    radius: number;
    hue: number;
    startTime: number;
};

type LevelSource =
    | { kind: "catalog"; catalogId: string; name: string }
    | { kind: "random"; seed: number; name: string };

type PaletteEntry = {
    fill: string;
    stroke: string;
    arrow: string;
    activeGlow: string;
};

const PALETTE: readonly PaletteEntry[] = [
    { fill: "rgba(72, 186, 205, 0.34)", stroke: "rgba(8, 96, 114, 0.72)", arrow: "#056e83", activeGlow: "rgba(72, 186, 205, 0.55)" },
    { fill: "rgba(129, 140, 248, 0.34)", stroke: "rgba(67, 56, 202, 0.72)", arrow: "#4338ca", activeGlow: "rgba(129, 140, 248, 0.55)" },
    { fill: "rgba(244, 114, 182, 0.34)", stroke: "rgba(190, 24, 93, 0.72)", arrow: "#be185d", activeGlow: "rgba(244, 114, 182, 0.55)" },
    { fill: "rgba(52, 211, 153, 0.34)", stroke: "rgba(4, 120, 87, 0.72)", arrow: "#047857", activeGlow: "rgba(52, 211, 153, 0.55)" },
    { fill: "rgba(251, 191, 36, 0.34)", stroke: "rgba(180, 83, 9, 0.72)", arrow: "#b45309", activeGlow: "rgba(251, 191, 36, 0.55)" },
    { fill: "rgba(167, 139, 250, 0.34)", stroke: "rgba(109, 40, 217, 0.72)", arrow: "#6d28d9", activeGlow: "rgba(167, 139, 250, 0.55)" },
];

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let topologyMode: Topology = "bounded";
let currentLevel: LevelDefinition = withTerminalBubble({ ...levelSpiralRelay, topology: topologyMode });
let levelSource: LevelSource = {
    kind: "random",
    seed: 0,
    name: "Random",
};
let state: PuzzleState = createState(currentLevel);
let attempts = 0;
let hoverBubbleId: number | null = null;
let pointerPress: { pointerId: number; bubbleId: number | null } | null = null;
let popEffects: PopEffect[] = [];
let previousRemoved = new Set<number>();
let lastFrameTime = 0;
let animationHandle = 0;
// After the player clicks a bubble to start the chain, we lock further
// bubble clicks until they manually Reset attempt / Restart level / switch levels.
let starterLocked = false;

function paletteFor(id: number): PaletteEntry {
    return PALETTE[id % PALETTE.length]!;
}

function logBubbleLocations(context: string, level: LevelDefinition): void {
    const radius = level.bubbles[0]?.radius ?? 26;
    const spacing = bubbleGridSpacing(radius);
    const margin = radius + 40;
    const topology = level.topology ?? "bounded";
    const cols = Math.floor((level.width - margin * 2) / spacing) + 1;
    const gridRows = Math.floor((level.height - margin * 2) / spacing) + 1;
    const xOrigin = topology === "klein"
        ? (level.width - (cols - 1) * spacing) / 2
        : margin;
    const yOrigin = topology === "mobius"
        ? (level.height - (gridRows - 1) * spacing) / 2
        : margin;
    const cells = level.bubbles.map((bubble) => ({
        c: Math.round((bubble.x - xOrigin) / spacing),
        r: Math.round((bubble.y - yOrigin) / spacing),
    }));
    const rows = level.bubbles.map((bubble) => ({
        id: bubble.id,
        x: bubble.x,
        y: bubble.y,
        direction: bubble.direction,
        movable: bubble.movable ?? true,
        onCanvas: bubble.x - bubble.radius >= 0
            && bubble.x + bubble.radius <= level.width
            && bubble.y - bubble.radius >= 0
            && bubble.y + bubble.radius <= level.height,
    }));
    console.log(`[bubble-chain] ${context}`, {
        width: level.width,
        height: level.height,
        topology,
        count: level.bubbles.length,
        selfIntersects: pathSelfIntersects(cells),
        bubbles: rows,
    });
}

function withTerminalBubble(level: LevelDefinition): LevelDefinition {
    if (level.bubbles.length === 0) {
        return level;
    }
    const terminalId = Math.max(...level.bubbles.map((bubble) => bubble.id));
    return {
        ...level,
        bubbles: level.bubbles.map((bubble) => ({
            ...bubble,
            movable: bubble.id === terminalId ? false : (bubble.movable ?? true),
        })),
    };
}

function logicalSize(): { width: number; height: number } {
    return { width: currentLevel.width, height: currentLevel.height };
}

function syncCanvasSize(): void {
    const { width, height } = logicalSize();
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    const wrap = canvas.parentElement;
    if (wrap instanceof HTMLElement) {
        wrap.style.aspectRatio = `${width} / ${height}`;
    }
}

function canvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function updateLevelButtons(): void {
    const container = document.getElementById(LEVEL_BUTTONS_ID);
    if (!(container instanceof HTMLElement)) {
        return;
    }
    for (const button of container.querySelectorAll("button[data-level-id]")) {
        if (!(button instanceof HTMLButtonElement)) {
            continue;
        }
        const selected = levelSource.kind === "catalog" && levelSource.catalogId === button.dataset.levelId;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    const randomButton = document.getElementById(RANDOM_ID);
    if (randomButton instanceof HTMLButtonElement) {
        const selected = levelSource.kind === "random";
        randomButton.classList.toggle("selected", selected);
        randomButton.setAttribute("aria-pressed", selected ? "true" : "false");
    }
}

function updateTopologyButtons(): void {
    const container = document.getElementById(TOPOLOGY_BUTTONS_ID);
    if (!(container instanceof HTMLElement)) {
        return;
    }
    for (const button of container.querySelectorAll("button[data-topology]")) {
        if (!(button instanceof HTMLButtonElement)) {
            continue;
        }
        const selected = button.dataset.topology === topologyMode;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
    }
}

function updateStatus(): void {
    const status = document.getElementById(STATUS_ID);
    const attemptsEl = document.getElementById(ATTEMPTS_ID);
    const levelName = document.getElementById(LEVEL_NAME_ID);
    const seedEl = document.getElementById(SEED_ID);
    const bubbleCountEl = document.getElementById(BUBBLES_ID);
    const topoNameEl = document.getElementById("bubble-chain-topology-name");
    if (topoNameEl) {
        topoNameEl.textContent = surfaceTopologyLabel(topologyMode);
    }
    if (levelName) {
        levelName.textContent = levelSource.name;
    }
    if (seedEl) {
        seedEl.textContent = levelSource.kind === "random" ? String(levelSource.seed) : "—";
    }
    if (bubbleCountEl) {
        bubbleCountEl.textContent = String(currentLevel.bubbles.length);
    }
    if (attemptsEl) {
        attemptsEl.textContent = String(attempts);
    }
    updateLevelButtons();
    updateTopologyButtons();
    if (!status) {
        return;
    }
    if (isWon(state)) {
        status.textContent = "Success — every bubble cleared. Try another level or roll random.";
        return;
    }
    if (isLost(state)) {
        status.textContent = "Attempt failed. Press Reset attempt or Restart level to try again.";
        return;
    }
    if (state.phase === "simulating") {
        status.textContent = "Chain reaction in progress…";
        return;
    }
    if (starterLocked) {
        status.textContent = "Attempt ended. Press Reset attempt or Restart level to try again.";
        return;
    }
    status.textContent = "Click a bubble to start the chain and try to clear the board.";
}

function loadCatalogLevel(catalogId: string): void {
    const entry = catalogEntryById(catalogId);
    if (entry === undefined) {
        return;
    }
    currentLevel = withTerminalBubble({ ...entry.level, topology: topologyMode });
    levelSource = { kind: "catalog", catalogId: entry.id, name: entry.name };
    restartLevel();
}

function loadRandomLevel(seed = randomSeed()): void {
    // A seed that works for one topology may fail for another (by design).
    // Probe deterministic nearby seeds instead of throwing and freezing UI.
    let generated = tryGenerateLevel({ seed, topology: topologyMode });
    if (generated === null) {
        const maxProbe = 2048;
        for (let i = 1; i <= maxProbe; i++) {
            generated = tryGenerateLevel({ seed: (seed + i) >>> 0, topology: topologyMode });
            if (generated !== null) {
                break;
            }
        }
    }
    if (generated === null) {
        // Last fallback: try fresh random seeds before giving up.
        for (let i = 0; i < 24; i++) {
            generated = tryGenerateLevel({ seed: randomSeed(), topology: topologyMode });
            if (generated !== null) {
                break;
            }
        }
    }
    if (generated === null) {
        // Last-resort: keep current level and surface a clear status.
        const status = document.getElementById(STATUS_ID);
        if (status) {
            status.textContent = "Could not generate a random map for this topology. Try again.";
        }
        return;
    }
    currentLevel = withTerminalBubble(generated.level);
    levelSource = { kind: "random", seed: generated.seed, name: generated.name };
    restartLevel();
}

function trackPopEffects(now: number): void {
    const removedNow = new Set(state.bubbles.filter((bubble) => bubble.removed).map((bubble) => bubble.id));
    for (const bubble of state.bubbles) {
        if (removedNow.has(bubble.id) && !previousRemoved.has(bubble.id)) {
            popEffects.push({
                x: bubble.x,
                y: bubble.y,
                radius: bubble.radius,
                hue: (bubble.id * 47) % 360,
                startTime: now,
            });
        }
    }
    previousRemoved = removedNow;
    popEffects = popEffects.filter((effect) => now - effect.startTime < POP_DURATION_MS);
}

function drawBackground(width: number, height: number): void {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#edf7f6");
    gradient.addColorStop(0.55, "#f6f4eb");
    gradient.addColorStop(1, "#e9eff9");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(21, 33, 61, 0.08)";
    context.lineWidth = 1;
    const grid = 40;
    for (let x = 0; x <= width; x += grid) {
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, height);
        context.stroke();
    }
    for (let y = 0; y <= height; y += grid) {
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
        context.stroke();
    }

    context.strokeStyle = "rgba(21, 33, 61, 0.18)";
    context.lineWidth = 2;
    context.strokeRect(1, 1, width - 2, height - 2);
}

function drawDirectionArrow(
    bubble: BubbleState,
    color: string,
    scale: number,
    drawX: number,
    drawY: number,
    flipX: boolean,
    flipY: boolean,
): void {
    if (!bubble.movable) {
        return;
    }
    let { vx, vy } = directionVector(bubble.direction);
    if (flipX) {
        vx = -vx;
    }
    if (flipY) {
        vy = -vy;
    }
    const shaft = bubble.radius * 0.72 * scale;
    const head = bubble.radius * 0.34 * scale;
    const tipX = drawX + vx * shaft;
    const tipY = drawY + vy * shaft;
    const baseX = drawX - vx * bubble.radius * 0.12;
    const baseY = drawY - vy * bubble.radius * 0.12;

    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = Math.max(2.4, bubble.radius * 0.11);
    context.lineCap = "round";
    context.lineJoin = "round";

    context.beginPath();
    context.moveTo(baseX, baseY);
    context.lineTo(tipX, tipY);
    context.stroke();

    const px = -vy;
    const py = vx;
    context.beginPath();
    context.moveTo(tipX, tipY);
    context.lineTo(tipX - vx * head + px * head * 0.55, tipY - vy * head + py * head * 0.55);
    context.lineTo(tipX - vx * head - px * head * 0.55, tipY - vy * head - py * head * 0.55);
    context.closePath();
    context.fill();
}

function drawBubble(bubble: BubbleState, now: number): void {
    if (bubble.removed) {
        return;
    }
    const copies = visibleTopologyCopies(
        bubble.x,
        bubble.y,
        bubble.radius,
        state.width,
        state.height,
        state.topology,
    );
    for (const copy of copies) {
        drawBubbleCopy(bubble, now, copy.x, copy.y, copy.flipX, copy.flipY);
    }
}

function drawBubbleCopy(
    bubble: BubbleState,
    now: number,
    drawX: number,
    drawY: number,
    flipX: boolean,
    flipY: boolean,
): void {
    const palette = paletteFor(bubble.id);
    const hovered = hoverBubbleId === bubble.id && isIdle(state);
    const moving = bubble.active;
    const scale = hovered ? 1.04 : 1;
    const lost = isLost(state);
    const shineX = drawX + (flipX ? 1 : -1) * bubble.radius * 0.28;
    const shineY = drawY + (flipY ? 1 : -1) * bubble.radius * 0.32;

    if (lost) {
        context.save();
        context.globalAlpha = 0.28;
    }

    if (moving) {
        context.save();
        context.shadowColor = palette.activeGlow;
        context.shadowBlur = 18;
    }

    const gradient = context.createRadialGradient(
        shineX,
        shineY,
        bubble.radius * 0.15,
        drawX,
        drawY,
        bubble.radius * scale,
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.72)");
    gradient.addColorStop(0.35, palette.fill);
    gradient.addColorStop(1, palette.fill);

    context.beginPath();
    context.arc(drawX, drawY, bubble.radius * scale, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    context.lineWidth = moving ? 3 : 2;
    context.strokeStyle = moving ? palette.arrow : palette.stroke;
    context.stroke();

    drawDirectionArrow(bubble, palette.arrow, scale, drawX, drawY, flipX, flipY);

    context.beginPath();
    context.arc(shineX, shineY, bubble.radius * 0.16, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,0.45)";
    context.fill();

    if (moving) {
        context.restore();
    }

    if (moving) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 120);
        context.beginPath();
        context.arc(drawX, drawY, bubble.radius * (1.12 + pulse * 0.06), 0, Math.PI * 2);
        context.strokeStyle = palette.activeGlow;
        context.lineWidth = 2;
        context.stroke();
    }

    if (lost) {
        context.restore();
    }
}

function drawPopEffects(now: number): void {
    for (const effect of popEffects) {
        const t = (now - effect.startTime) / POP_DURATION_MS;
        const radius = effect.radius * (1 + t * 1.35);
        const alpha = 1 - t;
        context.beginPath();
        context.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        context.strokeStyle = `hsla(${effect.hue}, 82%, 52%, ${alpha * 0.85})`;
        context.lineWidth = 3 * (1 - t * 0.4);
        context.stroke();

        context.beginPath();
        context.arc(effect.x, effect.y, radius * 0.55, 0, Math.PI * 2);
        context.fillStyle = `hsla(${effect.hue}, 90%, 88%, ${alpha * 0.35})`;
        context.fill();
    }
}

function drawOverlay(width: number, height: number): void {
    if (isWon(state)) {
        context.fillStyle = "rgba(255, 255, 255, 0.55)";
        context.fillRect(0, 0, width, height);
        context.fillStyle = "#056e83";
        context.font = "700 34px ui-sans-serif, system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("Board cleared!", width / 2, height / 2 - 12);
        context.font = "500 16px ui-sans-serif, system-ui, sans-serif";
        context.fillStyle = "#5f6d83";
        context.fillText("Every bubble was removed in one chain.", width / 2, height / 2 + 22);
    }
}

function render(now: number): void {
    syncCanvasSize();
    const { width, height } = logicalSize();
    context.clearRect(0, 0, width, height);
    drawBackground(width, height);

    for (const bubble of state.bubbles) {
        drawBubble(bubble, now);
    }
    drawPopEffects(now);
    drawOverlay(width, height);
}

function resetAttempt(): void {
    // Manual reset unlocks pointer input for the next attempt.
    starterLocked = false;
    resetState(state, currentLevel);
    previousRemoved = new Set();
    popEffects = [];
    hoverBubbleId = null;
    updateStatus();
    render(performance.now());
}

function restartLevel(): void {
    attempts = 0;
    starterLocked = false;
    state = createState(currentLevel);
    previousRemoved = new Set();
    popEffects = [];
    hoverBubbleId = null;
    logBubbleLocations("level", currentLevel);
    updateStatus();
    render(performance.now());
}

function beginAttempt(bubbleId: number): void {
    if (!isIdle(state) || isWon(state)) {
        return;
    }
    if (!startBubble(state, bubbleId)) {
        return;
    }
    starterLocked = true;
    attempts++;
    updateStatus();
}

function animationFrame(now: number): void {
    const dt = lastFrameTime === 0 ? 0 : Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (state.phase === "simulating") {
        step(state, dt);
        trackPopEffects(now);
        if (isIdle(state)) {
            updateStatus();
        }
    }

    render(now);
    animationHandle = requestAnimationFrame(animationFrame);
}

function bindControls(): void {
    document.getElementById(RESET_ID)?.addEventListener("click", () => {
        resetAttempt();
    });
    document.getElementById(RESTART_ID)?.addEventListener("click", () => {
        restartLevel();
    });
    document.getElementById(RANDOM_ID)?.addEventListener("click", () => {
        loadRandomLevel();
    });
    const levelButtons = document.getElementById(LEVEL_BUTTONS_ID);
    levelButtons?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) {
            return;
        }
        const catalogId = target.dataset.levelId;
        if (catalogId !== undefined) {
            loadCatalogLevel(catalogId);
        }
    });

    const topologyButtons = document.getElementById(TOPOLOGY_BUTTONS_ID);
    topologyButtons?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) {
            return;
        }
        const topo = target.dataset.topology;
        if (topo === undefined || !isSurfaceTopology(topo)) {
            return;
        }
        if (topo === topologyMode) {
            return;
        }
        topologyMode = topo;
        // Re-load the currently selected starter, but with the new topology.
        if (levelSource.kind === "catalog") {
            loadCatalogLevel(levelSource.catalogId);
        } else {
            // Regenerate random with the same seed under the new topology.
            loadRandomLevel(levelSource.seed);
        }
    });
}

function bindPointerInput(): void {
    canvas.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
            return;
        }
        if (!isIdle(state)) {
            return;
        }
        const point = canvasPoint(event);
        const bubble = hitTest(state, point.x, point.y);
        pointerPress = { pointerId: event.pointerId, bubbleId: bubble?.id ?? null };
        canvas.setPointerCapture(event.pointerId);
        canvas.focus({ preventScroll: true });
        event.preventDefault();
    });

    canvas.addEventListener("pointermove", (event) => {
        const point = canvasPoint(event);
        const bubble = hitTest(state, point.x, point.y);
        const nextId = bubble?.id ?? null;
        if (hoverBubbleId !== nextId) {
            hoverBubbleId = nextId;
            render(performance.now());
        }
    });

    canvas.addEventListener("pointerup", (event) => {
        const press = pointerPress;
        if (press === null || press.pointerId !== event.pointerId) {
            return;
        }
        pointerPress = null;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
        const point = canvasPoint(event);
        const bubble = hitTest(state, point.x, point.y);
        if (press.bubbleId !== null && bubble?.id === press.bubbleId) {
            beginAttempt(press.bubbleId);
        }
    });

    const cancel = (event: PointerEvent): void => {
        if (pointerPress?.pointerId !== event.pointerId) {
            return;
        }
        pointerPress = null;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", () => {
        pointerPress = null;
    });
    canvas.addEventListener("pointerleave", () => {
        if (hoverBubbleId !== null) {
            hoverBubbleId = null;
            render(performance.now());
        }
    });
}

function init(): void {
    const canvasEl = document.getElementById(CANVAS_ID);
    if (!(canvasEl instanceof HTMLCanvasElement)) {
        throw new Error(`Missing canvas #${CANVAS_ID}`);
    }
    canvas = canvasEl;
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
        throw new Error("Could not acquire 2D context");
    }
    context = ctx;

    bindControls();
    bindPointerInput();
    loadRandomLevel();
    lastFrameTime = performance.now();
    animationHandle = requestAnimationFrame(animationFrame);

    window.addEventListener("beforeunload", () => {
        cancelAnimationFrame(animationHandle);
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

export type { Direction };
