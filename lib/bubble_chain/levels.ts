/**
 * Hand-authored bubble-chain levels.
 */

import { bubbleTrajectoriesAvoidNearMisses, bubblesAreSeparated } from "./layout.js";
import { DEFAULT_SPEED } from "./model.js";
import type { LevelDefinition, Topology } from "./types.js";

const R = 26;
const W = 800;
const H = 560;
const SELECTABLE_TOPOLOGIES: readonly Topology[] = ["bounded", "wrap", "mobius", "klein"];

// Every catalog center lies on x = 90 + 62c, y = 94 + 62r. This pitch is
// larger than 2R, and both reflected topologies map the grid onto itself.

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
        { id: 0, x: 276, y: 156, radius: R, direction: "right" },
        { id: 1, x: 338, y: 156, radius: R, direction: "right" },
        { id: 2, x: 400, y: 156, radius: R, direction: "right" },
        { id: 3, x: 462, y: 156, radius: R, direction: "down" },
        { id: 4, x: 462, y: 218, radius: R, direction: "down" },
        { id: 5, x: 462, y: 280, radius: R, direction: "down" },
        { id: 6, x: 462, y: 342, radius: R, direction: "left" },
        { id: 7, x: 400, y: 342, radius: R, direction: "left" },
        { id: 8, x: 338, y: 342, radius: R, direction: "left" },
        { id: 9, x: 276, y: 342, radius: R, direction: "up" },
        { id: 10, x: 276, y: 280, radius: R, direction: "up" },
        { id: 11, x: 276, y: 218, radius: R, direction: "up", movable: false },
    ],
};

export const levelSpiralRelay: LevelDefinition = {
    width: W,
    height: H,
    speed: DEFAULT_SPEED,
    bubbles: [
        { id: 0, x: 90, y: 280, radius: R, direction: "right" },
        { id: 1, x: 214, y: 280, radius: R, direction: "down" },
        { id: 2, x: 214, y: 404, radius: R, direction: "right" },
        { id: 3, x: 338, y: 404, radius: R, direction: "up" },
        { id: 4, x: 338, y: 280, radius: R, direction: "right" },
        { id: 5, x: 462, y: 280, radius: R, direction: "down" },
        { id: 6, x: 462, y: 404, radius: R, direction: "right" },
        { id: 7, x: 586, y: 404, radius: R, direction: "up" },
        { id: 8, x: 586, y: 280, radius: R, direction: "right" },
        { id: 9, x: 710, y: 280, radius: R, direction: "right", movable: false },
    ],
};

export const levelPingPong: LevelDefinition = {
    width: W,
    height: H,
    speed: DEFAULT_SPEED,
    bubbles: [
        { id: 0, x: 90, y: 156, radius: R, direction: "right" },
        { id: 1, x: 214, y: 156, radius: R, direction: "right" },
        { id: 2, x: 338, y: 156, radius: R, direction: "down" },
        { id: 3, x: 338, y: 280, radius: R, direction: "left" },
        { id: 4, x: 214, y: 280, radius: R, direction: "left" },
        { id: 5, x: 90, y: 280, radius: R, direction: "down" },
        { id: 6, x: 90, y: 404, radius: R, direction: "right" },
        { id: 7, x: 214, y: 404, radius: R, direction: "right" },
        { id: 8, x: 338, y: 404, radius: R, direction: "right" },
        { id: 9, x: 462, y: 404, radius: R, direction: "right", movable: false },
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
    return CATALOG.every((entry) => bubblesAreSeparated(entry.level.bubbles)
        && SELECTABLE_TOPOLOGIES.every((topology) => bubbleTrajectoriesAvoidNearMisses({
            ...entry.level,
            topology,
        })));
}
