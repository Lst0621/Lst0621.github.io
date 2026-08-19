/**
 * Hand-authored bubble-chain levels.
 */

import { bubblesAreSeparated } from "./layout.js";
import { DEFAULT_SPEED } from "./model.js";
import type { LevelDefinition } from "./types.js";

const R = 26;
const W = 800;
const H = 560;

/**
 * Spatial-wrap ("tours") topology on a clean diameter-based grid.
 * Bubble `i` moves toward the next one; movement re-enters from the opposite edge.
 */
export const levelTorusTour: LevelDefinition = {
    width: W,
    height: H,
    speed: DEFAULT_SPEED,
    topology: "wrap",
    bubbles: [
        { id: 0, x: 252, y: 128, radius: R, direction: "right" },
        { id: 1, x: 314, y: 128, radius: R, direction: "right" },
        { id: 2, x: 376, y: 128, radius: R, direction: "right" },
        { id: 3, x: 438, y: 128, radius: R, direction: "down" },
        { id: 4, x: 438, y: 190, radius: R, direction: "down" },
        { id: 5, x: 438, y: 252, radius: R, direction: "down" },
        { id: 6, x: 438, y: 314, radius: R, direction: "left" },
        { id: 7, x: 376, y: 314, radius: R, direction: "left" },
        { id: 8, x: 314, y: 314, radius: R, direction: "left" },
        { id: 9, x: 252, y: 314, radius: R, direction: "up" },
        { id: 10, x: 252, y: 252, radius: R, direction: "up" },
        { id: 11, x: 252, y: 190, radius: R, direction: "up", movable: false },
    ],
};

export const levelSpiralRelay: LevelDefinition = {
    width: W,
    height: H,
    speed: DEFAULT_SPEED,
    bubbles: [
        { id: 0, x: 70, y: 280, radius: R, direction: "right" },
        { id: 1, x: 190, y: 280, radius: R, direction: "down" },
        { id: 2, x: 190, y: 420, radius: R, direction: "right" },
        { id: 3, x: 330, y: 420, radius: R, direction: "up" },
        { id: 4, x: 330, y: 280, radius: R, direction: "right" },
        { id: 5, x: 450, y: 280, radius: R, direction: "down" },
        { id: 6, x: 450, y: 420, radius: R, direction: "right" },
        { id: 7, x: 590, y: 420, radius: R, direction: "up" },
        { id: 8, x: 590, y: 280, radius: R, direction: "right" },
        { id: 9, x: 710, y: 280, radius: R, direction: "right", movable: false },
    ],
};

export const levelPingPong: LevelDefinition = {
    width: W,
    height: H,
    speed: DEFAULT_SPEED,
    bubbles: [
        { id: 0, x: 70, y: 130, radius: R, direction: "right" },
        { id: 1, x: 190, y: 130, radius: R, direction: "right" },
        { id: 2, x: 310, y: 130, radius: R, direction: "down" },
        { id: 3, x: 310, y: 270, radius: R, direction: "left" },
        { id: 4, x: 190, y: 270, radius: R, direction: "left" },
        { id: 5, x: 70, y: 270, radius: R, direction: "down" },
        { id: 6, x: 70, y: 410, radius: R, direction: "right" },
        { id: 7, x: 190, y: 410, radius: R, direction: "right" },
        { id: 8, x: 310, y: 410, radius: R, direction: "right" },
        { id: 9, x: 430, y: 410, radius: R, direction: "right", movable: false },
    ],
};

export interface CatalogEntry {
    id: string;
    name: string;
    level: LevelDefinition;
}

export const CATALOG: readonly CatalogEntry[] = [
    { id: "torus-tour", name: "Wrap (tours)", level: levelTorusTour },
    { id: "spiral-relay", name: "Spiral Relay", level: levelSpiralRelay },
    { id: "ping-pong", name: "Ping Pong", level: levelPingPong },
];

export const DEFAULT_CATALOG_ID = "torus-tour";

export function catalogEntryById(id: string): CatalogEntry | undefined {
    return CATALOG.find((entry) => entry.id === id);
}

export const DEFAULT_LEVEL = levelTorusTour;

/** @deprecated Use levelTorusTour */
export const levelDonutTour = levelTorusTour;

/** @deprecated Use CATALOG instead. */
export const LEVELS: ReadonlyArray<{ name: string; level: LevelDefinition }> = CATALOG.map(
    ({ name, level }) => ({ name, level }),
);

export function catalogLayoutsAreValid(): boolean {
    return CATALOG.every((entry) => bubblesAreSeparated(entry.level.bubbles));
}
