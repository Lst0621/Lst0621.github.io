/**
 * Layout helpers — bubble separation and torus-tour construction.
 *
 * Torus topology: bubble `i` aims at `(i + 1) mod n`, so the direction graph
 * is a single closed cycle (the last bubble wraps back to the first).
 */

import { distance } from "./model.js";
import type { BubbleDefinition, Direction, LevelDefinition } from "./types.js";

export const MIN_BUBBLE_GAP = 10;

export function bubbleGridSpacing(radius: number): number {
    return radius * 2 + MIN_BUBBLE_GAP;
}

export function snapToBubbleGrid(value: number, radius: number, minimum: number): number {
    const spacing = bubbleGridSpacing(radius);
    const snapped = minimum + Math.round((value - minimum) / spacing) * spacing;
    return snapped;
}

/** Minimum center distance so two bubble discs never overlap or touch. */
export function minBubbleCenterDistance(a: BubbleDefinition, b: BubbleDefinition): number {
    return a.radius + b.radius + MIN_BUBBLE_GAP;
}

/** True when every pair of bubbles is separated by at least one bubble radius + gap. */
export function bubblesAreSeparated(
    bubbles: readonly BubbleDefinition[],
    minGap = MIN_BUBBLE_GAP,
): boolean {
    for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
            const a = bubbles[i]!;
            const b = bubbles[j]!;
            const needed = a.radius + b.radius + minGap;
            if (distance(a.x, a.y, b.x, b.y) < needed) {
                return false;
            }
        }
    }
    return true;
}

/** True when a bubble disc lies fully inside the level canvas. */
export function bubbleDiscOnCanvas(
    bubble: Pick<BubbleDefinition, "x" | "y" | "radius">,
    width: number,
    height: number,
): boolean {
    return bubble.x - bubble.radius >= 0
        && bubble.x + bubble.radius <= width
        && bubble.y - bubble.radius >= 0
        && bubble.y + bubble.radius <= height;
}

export function bubblesFullyOnCanvas(
    bubbles: readonly BubbleDefinition[],
    width: number,
    height: number,
): boolean {
    return bubbles.every((bubble) => bubbleDiscOnCanvas(bubble, width, height));
}

export function assertLevelLayout(level: LevelDefinition): void {
    if (!bubblesAreSeparated(level.bubbles)) {
        throw new Error("Bubble Chain level has overlapping or touching bubbles");
    }
    if (!bubblesFullyOnCanvas(level.bubbles, level.width, level.height)) {
        throw new Error("Bubble Chain level has bubbles outside the canvas");
    }
}

/** Snap a vector to a cardinal direction; null when too diagonal or too short. */
export function cardinalDirection(
    from: { x: number; y: number },
    to: { x: number; y: number },
): Direction | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.hypot(dx, dy) < 8) {
        return null;
    }
    if (Math.abs(dx) >= Math.abs(dy) * 1.15) {
        return dx >= 0 ? "right" : "left";
    }
    if (Math.abs(dy) >= Math.abs(dx) * 1.15) {
        return dy >= 0 ? "down" : "up";
    }
    return null;
}

export interface TorusTourOptions {
    count: number;
    width: number;
    height: number;
    radius: number;
    ringRx?: number;
    ringRy?: number;
    startAngle?: number;
    /** 0–1 fraction of angular step used to jitter each bubble (breaks symmetry). */
    angleJitter?: number;
    /** Supply to jitter angles deterministically. */
    rng?: () => number;
}

/**
 * Place `count` bubbles on an elliptical ring.  Each bubble aims at the next
 * neighbour clockwise; the last wraps to bubble 0 (torus topology).
 */
export function buildTorusTourLevel(options: TorusTourOptions): LevelDefinition | null {
    const {
        count,
        width,
        height,
        radius,
        ringRx = width * 0.31,
        ringRy = height * 0.34,
        startAngle = -Math.PI / 2,
        angleJitter = 0,
        rng,
    } = options;

    if (count < 3) {
        return null;
    }

    const cx = width / 2;
    const cy = height / 2;
    const minimum = radius + 40;
    const step = (2 * Math.PI) / count;
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
        let angle = startAngle + step * i;
        if (rng !== undefined && angleJitter > 0) {
            angle += (rng() - 0.5) * step * angleJitter;
        }
        points.push({
            x: snapToBubbleGrid(cx + ringRx * Math.cos(angle), radius, minimum),
            y: snapToBubbleGrid(cy + ringRy * Math.sin(angle), radius, minimum),
        });
    }

    const bubbles: BubbleDefinition[] = [];
    for (let i = 0; i < count; i++) {
        const point = points[i]!;
        const next = points[(i + 1) % count]!;
        const direction = cardinalDirection(point, next);
        if (direction === null) {
            return null;
        }
        bubbles.push({
            id: i,
            x: Math.round(point.x),
            y: Math.round(point.y),
            radius,
            direction,
        });
    }

    if (!bubblesAreSeparated(bubbles)) {
        return null;
    }

    return { width, height, bubbles };
}

/** Rectangular ring with torus wrap — bubble 9 aims back at bubble 0. */
export function buildRectTorusTourLevel(
    count: number,
    width: number,
    height: number,
    radius: number,
): LevelDefinition | null {
    if (count !== 10) {
        return buildTorusTourLevel({ count, width, height, radius });
    }

    const bubbles: BubbleDefinition[] = [
        { id: 0, x: 200, y: 140, radius, direction: "right" },
        { id: 1, x: 320, y: 140, radius, direction: "right" },
        { id: 2, x: 440, y: 140, radius, direction: "right" },
        { id: 3, x: 560, y: 140, radius, direction: "down" },
        { id: 4, x: 560, y: 260, radius, direction: "down" },
        { id: 5, x: 560, y: 380, radius, direction: "left" },
        { id: 6, x: 440, y: 380, radius, direction: "left" },
        { id: 7, x: 320, y: 380, radius, direction: "left" },
        { id: 8, x: 200, y: 380, radius, direction: "up" },
        { id: 9, x: 200, y: 260, radius, direction: "up" },
    ];

    if (!bubblesAreSeparated(bubbles)) {
        return null;
    }

    return { width, height, bubbles };
}

/** @deprecated Use buildTorusTourLevel */
export const buildDonutTourLevel = buildTorusTourLevel;

/** @deprecated Use buildRectTorusTourLevel */
export const buildRectDonutTourLevel = buildRectTorusTourLevel;
