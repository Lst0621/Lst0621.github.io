import type { SurfaceTopology } from "../common/topology.js";

/** Cardinal direction for bubble movement. */
export type Direction = "up" | "down" | "left" | "right";

/** Static puzzle data for one bubble. */
export interface BubbleDefinition {
    id: number;
    x: number;
    y: number;
    radius: number;
    direction: Direction;
    /** When false, the bubble is terminal: it never starts moving. */
    movable?: boolean;
}

/** Level layout and simulation parameters. */
export interface LevelDefinition {
    width: number;
    height: number;
    bubbles: BubbleDefinition[];
    /** Movement speed in logical pixels per second. Default 280. */
    speed?: number;
    /**
     * Spatial topology:
     * - "bounded": leaving the rectangle removes the bubble.
     * - "wrap": wrap positions across edges (tours), and collisions use torus distance.
     */
    topology?: Topology;
}

/** Runtime bubble state inside the simulation. */
export interface BubbleState {
    id: number;
    x: number;
    y: number;
    radius: number;
    direction: Direction;
    movable: boolean;
    active: boolean;
    removed: boolean;
    /** Distance moved since this bubble became active (reset on activation). */
    travelDistance: number;
}

export type GamePhase = "idle" | "simulating" | "won" | "lost";

export type Topology = SurfaceTopology;

export type LossReason = "remaining" | "loop";

/** Full puzzle simulation state. */
export interface PuzzleState {
    width: number;
    height: number;
    speed: number;
    topology: Topology;
    bubbles: BubbleState[];
    phase: GamePhase;
    /** True once the player has started an attempt this round. */
    attemptStarted: boolean;
    /** Why the latest attempt ended in loss, when applicable. */
    lossReason?: LossReason;
    /** Internal guard against infinite simulation loops. */
    loopGuard?: Set<string>;
    simulationSteps?: number;
}

export interface SolverEntry {
    bubbleId: number;
    won: boolean;
}

export interface SolverReport {
    entries: SolverEntry[];
    winningIds: number[];
    uniqueWin: boolean;
}
