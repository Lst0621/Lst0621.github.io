/**
 * Deterministic bubble-chain puzzle simulation.
 *
 * Rendering and DOM input live outside this module.  All exported functions are
 * pure with respect to their arguments except `step`, which mutates the supplied
 * state in place for performance during animation and solver loops.
 */

import type {
    BubbleDefinition,
    BubbleState,
    Direction,
    GamePhase,
    LevelDefinition,
    LossReason,
    PuzzleState,
} from "./types.js";

export const DEFAULT_SPEED = 280;
/** Fixed integration step for deterministic simulation. */
export const SIMULATION_DT = 1 / 600;
/** Safety cap so a tab backgrounded for minutes does not spiral. */
export const MAX_STEP_ACCUMULATOR = 0.25;

export function directionVector(direction: Direction): { vx: number; vy: number } {
    switch (direction) {
        case "up":
            return { vx: 0, vy: -1 };
        case "down":
            return { vx: 0, vy: 1 };
        case "left":
            return { vx: -1, vy: 0 };
        case "right":
            return { vx: 1, vy: 0 };
    }
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.hypot(dx, dy);
}

export function circlesOverlap(
    ax: number,
    ay: number,
    ar: number,
    bx: number,
    by: number,
    br: number,
): boolean {
    return distance(ax, ay, bx, by) <= ar + br;
}

function mod(value: number, modBy: number): number {
    // JS % keeps the sign, so normalize for negative values.
    return ((value % modBy) + modBy) % modBy;
}

function wrapCoordinate(value: number, limit: number): number {
    return mod(value, limit);
}

function torusDelta(a: number, b: number, length: number): number {
    const raw = Math.abs(a - b);
    return Math.min(raw, length - raw);
}

function circlesOverlapInTopology(state: PuzzleState, ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
    if (state.topology === "wrap") {
        const dx = torusDelta(ax, bx, state.width);
        const dy = torusDelta(ay, by, state.height);
        return Math.hypot(dx, dy) <= ar + br;
    }
    if (state.topology === "mobius") {
        // Möbius: identify x-edges with y mirrored; y itself is not periodic.
        const dx = torusDelta(ax, bx, state.width);
        const dyDirect = ay - by;
        const dyMirrored = ay - (state.height - by);
        return Math.min(Math.hypot(dx, dyDirect), Math.hypot(dx, dyMirrored)) <= ar + br;
    }
    if (state.topology === "klein") {
        // Klein: identify y-edges with x mirrored.
        const dx0 = torusDelta(ax, bx, state.width);
        const dy = torusDelta(ay, by, state.height);
        const dx1 = torusDelta(ax, state.width - bx, state.width);
        return Math.min(Math.hypot(dx0, dy), Math.hypot(dx1, dy)) <= ar + br;
    }
    return circlesOverlap(ax, ay, ar, bx, by, br);
}

export function isOffBoard(
    x: number,
    y: number,
    radius: number,
    width: number,
    height: number,
): boolean {
    return x + radius < 0 || x - radius > width || y + radius < 0 || y - radius > height;
}

export function cloneBubble(bubble: BubbleState): BubbleState {
    return { ...bubble };
}

export function cloneState(state: PuzzleState): PuzzleState {
    return {
        width: state.width,
        height: state.height,
        speed: state.speed,
        topology: state.topology,
        bubbles: state.bubbles.map(cloneBubble),
        phase: state.phase,
        attemptStarted: state.attemptStarted,
        lossReason: state.lossReason,
        loopGuard: state.loopGuard ? new Set(state.loopGuard) : undefined,
        simulationSteps: state.simulationSteps,
    };
}

function endSimulation(state: PuzzleState, lossReason: LossReason): void {
    for (const bubble of state.bubbles) {
        bubble.active = false;
    }
    state.phase = "lost";
    state.lossReason = lossReason;
}

export function createState(level: LevelDefinition): PuzzleState {
    const speed = level.speed ?? DEFAULT_SPEED;
    const topology = level.topology ?? "bounded";
    const bubbles: BubbleState[] = level.bubbles.map((definition) => ({
        id: definition.id,
        x: definition.x,
        y: definition.y,
        radius: definition.radius,
        direction: definition.direction,
        movable: definition.movable ?? true,
        active: false,
        removed: false,
        travelDistance: 0,
    }));
    bubbles.sort((left, right) => left.id - right.id);
    return {
        width: level.width,
        height: level.height,
        speed,
        topology,
        bubbles,
        phase: "idle",
        attemptStarted: false,
        lossReason: undefined,
        loopGuard: undefined,
        simulationSteps: undefined,
    };
}

export function resetState(state: PuzzleState, level: LevelDefinition): void {
    const fresh = createState(level);
    state.width = fresh.width;
    state.height = fresh.height;
    state.speed = fresh.speed;
    state.topology = fresh.topology;
    state.bubbles = fresh.bubbles;
    state.phase = fresh.phase;
    state.attemptStarted = fresh.attemptStarted;
    state.lossReason = fresh.lossReason;
    state.loopGuard = fresh.loopGuard;
    state.simulationSteps = fresh.simulationSteps;
}

export function remainingBubbleCount(state: PuzzleState): number {
    return state.bubbles.filter((bubble) => !bubble.removed).length;
}

export function hasActiveBubble(state: PuzzleState): boolean {
    return state.bubbles.some((bubble) => bubble.active && !bubble.removed);
}

export function isIdle(state: PuzzleState): boolean {
    return state.phase === "idle" || state.phase === "won" || state.phase === "lost";
}

export function isWon(state: PuzzleState): boolean {
    return state.phase === "won";
}

export function isLost(state: PuzzleState): boolean {
    return state.phase === "lost";
}

/** Activate one stationary bubble to begin an attempt. Returns false when disallowed. */
export function startBubble(state: PuzzleState, bubbleId: number): boolean {
    if (!isIdle(state) || state.phase === "won") {
        return false;
    }

    const bubble = state.bubbles.find((candidate) => candidate.id === bubbleId);
    if (bubble === undefined || bubble.removed || bubble.active) {
        return false;
    }

    state.attemptStarted = true;
    state.phase = "simulating";
    state.lossReason = undefined;
    state.loopGuard = undefined;
    state.simulationSteps = undefined;
    if (!bubble.movable) {
        bubble.removed = true;
        bubble.active = false;
        finalizePhase(state);
        return true;
    }
    bubble.active = true;
    bubble.travelDistance = 0;
    return true;
}

function finalizePhase(state: PuzzleState): void {
    if (hasActiveBubble(state)) {
        return;
    }
    if (state.phase !== "simulating") {
        return;
    }
    state.phase = remainingBubbleCount(state) === 0 ? "won" : "lost";
    if (state.phase === "lost") {
        state.lossReason = "remaining";
    }
}

function moveActiveBubbles(state: PuzzleState, dt: number): void {
    const delta = state.speed * dt;
    for (const bubble of state.bubbles) {
        if (!bubble.active || bubble.removed) {
            continue;
        }
        const { vx, vy } = directionVector(bubble.direction);
        bubble.x += vx * delta;
        bubble.y += vy * delta;

        bubble.travelDistance += Math.abs(delta);

        if (state.topology === "wrap") {
            bubble.x = wrapCoordinate(bubble.x, state.width);
            bubble.y = wrapCoordinate(bubble.y, state.height);
        } else if (state.topology === "mobius") {
            // Wrap x with mirrored y.
            if (bubble.x < 0 || bubble.x > state.width) {
                bubble.x = wrapCoordinate(bubble.x, state.width);
                bubble.y = state.height - bubble.y;
            }
            // y is otherwise bounded (no wrap).
        } else if (state.topology === "klein") {
            // x is periodic; y is periodic but flips x when crossing.
            if (bubble.y < 0) {
                bubble.y = wrapCoordinate(bubble.y, state.height);
                bubble.x = state.width - bubble.x;
            } else if (bubble.y > state.height) {
                bubble.y = wrapCoordinate(bubble.y, state.height);
                bubble.x = state.width - bubble.x;
            }
            bubble.x = wrapCoordinate(bubble.x, state.width);
        }

        if (state.topology !== "bounded") {
            const travelLimit = (bubble.direction === "left" || bubble.direction === "right")
                ? state.width
                : state.height;
            // Keep levels winnable by ensuring each moving bubble eventually disappears.
            if (bubble.travelDistance >= travelLimit) {
                bubble.removed = true;
                bubble.active = false;
            }
        }
    }
}

function removeOffBoardBubbles(state: PuzzleState): void {
    if (state.topology === "wrap" || state.topology === "klein") {
        // Fully periodic in space.
        return;
    }
    if (state.topology === "mobius") {
        for (const bubble of state.bubbles) {
            if (bubble.removed) continue;
            if (bubble.y + bubble.radius < 0 || bubble.y - bubble.radius > state.height) {
                bubble.removed = true;
                bubble.active = false;
            }
        }
        return;
    }
    for (const bubble of state.bubbles) {
        if (bubble.removed) {
            continue;
        }
        if (!isOffBoard(bubble.x, bubble.y, bubble.radius, state.width, state.height)) {
            continue;
        }
        bubble.removed = true;
        bubble.active = false;
    }
}

interface CollisionEvent {
    moverId: number;
    targetId: number;
}

function findCollisions(state: PuzzleState): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    const collidedMovers = new Set<number>();

    for (const mover of state.bubbles) {
        if (!mover.active || mover.removed || collidedMovers.has(mover.id)) {
            continue;
        }

        for (const target of state.bubbles) {
            if (target.id === mover.id || target.removed) {
                continue;
            }
            // In bounded mode, the chain only reacts on inactive targets.
            if (state.topology === "bounded" && target.active) {
                continue;
            }
            if (circlesOverlapInTopology(state, mover.x, mover.y, mover.radius, target.x, target.y, target.radius)) {
                events.push({ moverId: mover.id, targetId: target.id });
                collidedMovers.add(mover.id);
                break;
            }
        }
    }

    return events;
}

function resolveCollisions(state: PuzzleState, events: CollisionEvent[]): void {
    for (const event of events) {
        const mover = state.bubbles.find((bubble) => bubble.id === event.moverId);
        const target = state.bubbles.find((bubble) => bubble.id === event.targetId);
        if (mover === undefined || target === undefined) {
            continue;
        }
        if (mover.removed || target.removed || !mover.active) {
            continue;
        }
        if (state.topology === "bounded" && target.active) {
            continue;
        }

        mover.removed = true;
        mover.active = false;
        if (!target.movable) {
            target.removed = true;
            target.active = false;
            target.travelDistance = 0;
            continue;
        }
        target.active = true;
        target.travelDistance = 0;
    }
}

/** Advance the simulation by one fixed sub-step. */
export function stepOnce(state: PuzzleState, dt: number): void {
    if (state.phase !== "simulating") {
        return;
    }

    moveActiveBubbles(state, dt);
    removeOffBoardBubbles(state);
    resolveCollisions(state, findCollisions(state));
    finalizePhase(state);
}

/** Advance the simulation, subdividing `dt` into fixed deterministic steps. */
export function step(state: PuzzleState, dt: number): void {
    if (state.phase !== "simulating" || dt <= 0) {
        return;
    }

    let remaining = Math.min(dt, MAX_STEP_ACCUMULATOR);
    while (remaining > 0) {
        const slice = Math.min(remaining, SIMULATION_DT);
        stepOnce(state, slice);
        remaining -= slice;
        if (state.phase !== "simulating") {
            break;
        }
    }
}

/** Run the simulation to completion from the current state. */
export function simulateToIdle(state: PuzzleState, maxSteps = 200_000): GamePhase {
    let steps = 0;
    while (state.phase === "simulating" && steps < maxSteps) {
        stepOnce(state, SIMULATION_DT);
        steps++;
    }
    if (state.phase === "simulating") {
        endSimulation(state, "loop");
    }
    return state.phase;
}

/** Return the bubble under a canvas point, or null. */
export function hitTest(state: PuzzleState, x: number, y: number): BubbleState | null {
    let hit: BubbleState | null = null;
    let bestRadius = Infinity;

    for (const bubble of state.bubbles) {
        if (bubble.removed) {
            continue;
        }
        const d = distance(x, y, bubble.x, bubble.y);
        if (d <= bubble.radius && bubble.radius <= bestRadius) {
            hit = bubble;
            bestRadius = bubble.radius;
        }
    }

    return hit;
}

/** Create a tiny test level from bubble definitions. */
export function levelFromBubbles(
    bubbles: BubbleDefinition[],
    width = 800,
    height = 560,
    speed = DEFAULT_SPEED,
): LevelDefinition {
    return { width, height, bubbles, speed };
}
