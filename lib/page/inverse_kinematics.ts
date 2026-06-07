import {
    IkSolveStatus,
    ikSolveEqual,
    modulePromise,
    type IkPoint,
} from "../tsl/wasm/ts/wasm_api_inverse_kinematics";

const CANVAS_ID = "ik-canvas";
const STATUS_ID = "ik-status";
const SEGMENTS_ID = "ik-segments";
const LENGTH_ID = "ik-length";
const ITERATIONS_ID = "ik-iterations";
const TOLERANCE_ID = "ik-tolerance";
const SPEED_ID = "ik-speed";
const RESET_ID = "ik-reset";

const CANVAS_W = 760;
const CANVAS_H = 520;
const BASE: IkPoint = { x: CANVAS_W / 2, y: CANVAS_H / 2 };

let segmentCount = 5;
let segmentLength = 56;
let iterationsPerFrame = 1;
let tolerance = 0.75;
let targetSpeed = 4;
let joints: IkPoint[] = [];
let target: IkPoint = { x: BASE.x + segmentLength * segmentCount * 0.65, y: BASE.y - 90 };
let solverTarget: IkPoint = { ...target };
let animationId: number | null = null;
let lastStatus = "ready";

function getCanvas(): HTMLCanvasElement {
    const el = document.getElementById(CANVAS_ID);
    if (!el || !(el instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas #${CANVAS_ID} not found`);
    }
    return el;
}

function getInput(id: string): HTMLInputElement {
    const el = document.getElementById(id);
    if (!el || !(el instanceof HTMLInputElement)) {
        throw new Error(`Input #${id} not found`);
    }
    return el;
}

function getButton(id: string): HTMLButtonElement {
    const el = document.getElementById(id);
    if (!el || !(el instanceof HTMLButtonElement)) {
        throw new Error(`Button #${id} not found`);
    }
    return el;
}

function setStatus(text: string): void {
    lastStatus = text;
    const el = document.getElementById(STATUS_ID);
    if (el) {
        el.textContent = text;
    }
}

function clampInt(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.trunc(value)));
}

function clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function syncControlsFromInputs(): void {
    segmentCount = clampInt(Number(getInput(SEGMENTS_ID).value), 1, 18);
    segmentLength = clampNumber(Number(getInput(LENGTH_ID).value), 12, 120);
    iterationsPerFrame = clampInt(Number(getInput(ITERATIONS_ID).value), 1, 12);
    tolerance = clampNumber(Number(getInput(TOLERANCE_ID).value), 0.05, 20);
    targetSpeed = clampNumber(Number(getInput(SPEED_ID).value), 0.5, 60);
}

function initializeJoints(): void {
    joints = [];
    for (let i = 0; i <= segmentCount; i++) {
        joints.push({ x: BASE.x + i * segmentLength, y: BASE.y });
    }
}

function resetChain(): void {
    syncControlsFromInputs();
    initializeJoints();
    target = {
        x: BASE.x + segmentLength * segmentCount * 0.65,
        y: BASE.y - Math.min(110, segmentLength * segmentCount * 0.35),
    };
    solverTarget = { ...target };
    stopAnimation();
    setStatus("ready");
    draw();
}

function stopAnimation(): void {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function canvasPointFromEvent(canvas: HTMLCanvasElement, event: MouseEvent): IkPoint {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function statusText(status: IkSolveStatus, error: number, iterations: number): string {
    const errorText = error.toFixed(3);
    if (status === IkSolveStatus.Converged) {
        return `converged · error ${errorText} · ${iterations} iter`;
    }
    if (status === IkSolveStatus.Unreachable) {
        return `unreachable · error ${errorText}`;
    }
    if (status === IkSolveStatus.MaxIterations) {
        return `moving · error ${errorText}`;
    }
    return "invalid input";
}

function moveSolverTarget(): boolean {
    const dx = target.x - solverTarget.x;
    const dy = target.y - solverTarget.y;
    const d = Math.hypot(dx, dy);
    if (d <= targetSpeed) {
        solverTarget = { ...target };
        return true;
    }
    solverTarget = {
        x: solverTarget.x + dx * targetSpeed / d,
        y: solverTarget.y + dy * targetSpeed / d,
    };
    return false;
}

function animationStep(): void {
    const targetReached = moveSolverTarget();
    const result = ikSolveEqual(joints, segmentLength, solverTarget, iterationsPerFrame, tolerance);
    joints = result.joints;
    setStatus(statusText(result.status, result.endError, result.iterations));
    draw();

    if (
        targetReached &&
        (result.status === IkSolveStatus.Converged ||
            result.status === IkSolveStatus.Unreachable ||
            result.endError <= tolerance)
    ) {
        animationId = null;
        return;
    }
    animationId = requestAnimationFrame(animationStep);
}

function startAnimation(): void {
    stopAnimation();
    animationId = requestAnimationFrame(animationStep);
}

function drawGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.save();
    ctx.strokeStyle = "#e2ded0";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPoint(ctx: CanvasRenderingContext2D, p: IkPoint, radius: number, fill: string, stroke = "#586e75"): void {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function draw(): void {
    const canvas = getCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get 2D canvas context.");
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fdf6e3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas);

    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#268bd2";
    ctx.beginPath();
    ctx.moveTo(joints[0].x, joints[0].y);
    for (let i = 1; i < joints.length; i++) {
        ctx.lineTo(joints[i].x, joints[i].y);
    }
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "#b58900";
    ctx.beginPath();
    ctx.moveTo(joints[joints.length - 1].x, joints[joints.length - 1].y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    drawPoint(ctx, target, 8, "#dc322f", "#8b1a1a");
    for (let i = 1; i < joints.length; i++) {
        drawPoint(ctx, joints[i], 6, "#eee8d5");
    }
    drawPoint(ctx, BASE, 9, "#859900", "#586e75");

    ctx.fillStyle = "#586e75";
    ctx.font = "14px sans-serif";
    ctx.fillText(lastStatus, 16, canvas.height - 18);
}

function bindControls(): void {
    const reset = getButton(RESET_ID);
    reset.addEventListener("click", resetChain);
    for (const id of [SEGMENTS_ID, LENGTH_ID, ITERATIONS_ID, TOLERANCE_ID, SPEED_ID]) {
        getInput(id).addEventListener("change", resetChain);
    }

    const canvas = getCanvas();
    canvas.addEventListener("click", (event) => {
        syncControlsFromInputs();
        target = canvasPointFromEvent(canvas, event);
        solverTarget = { ...joints[joints.length - 1] };
        startAnimation();
        draw();
    });
}

async function main(): Promise<void> {
    setStatus("loading");
    await modulePromise;
    bindControls();
    resetChain();
}

main().catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err));
});
