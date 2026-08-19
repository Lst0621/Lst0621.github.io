/**
 * Exhaustive starting-bubble analysis for level validation.
 */

import {
    cloneState,
    createState,
    simulateToIdle,
    startBubble,
} from "./model.js";
import type { LevelDefinition, SolverEntry, SolverReport } from "./types.js";

/** Simulate starting from each bubble and collect win/loss results. */
export function solveLevel(level: LevelDefinition): SolverReport {
    const entries: SolverEntry[] = [];

    for (const definition of level.bubbles) {
        const state = createState(level);
        if (!startBubble(state, definition.id)) {
            entries.push({ bubbleId: definition.id, won: false });
            continue;
        }
        simulateToIdle(state);
        entries.push({ bubbleId: definition.id, won: state.phase === "won" });
    }

    entries.sort((left, right) => left.bubbleId - right.bubbleId);
    const winningIds = entries.filter((entry) => entry.won).map((entry) => entry.bubbleId);
    return {
        entries,
        winningIds,
        uniqueWin: winningIds.length === 1,
    };
}

/** Human-readable report for development consoles. */
export function formatSolverReport(report: SolverReport): string {
    return report.entries
        .map((entry) => `Bubble ${entry.bubbleId}: ${entry.won ? "WIN" : "fail"}`)
        .join("\n");
}

/** Return whether a single starting bubble clears the level. */
export function simulateStart(level: LevelDefinition, bubbleId: number): boolean {
    const state = createState(level);
    if (!startBubble(state, bubbleId)) {
        return false;
    }
    simulateToIdle(state);
    return state.phase === "won";
}

/** Clone-level helper used by tests. */
export function freshState(level: LevelDefinition) {
    return cloneState(createState(level));
}
