/**
 * Seeded bubble-chain level generator.
 *
 * Random levels are generated as a single cardinal path on a snapped grid
 * (not a rectangular/ring cycle). Bubble i points to bubble i+1 so one clean
 * chain starter exists; other starters are typically failures.
 */

import { bubbleGridSpacing, bubblesAreSeparated, bubblesFullyOnCanvas } from "./layout.js";
import { DEFAULT_SPEED } from "./model.js";
import { solveLevel } from "./solver.js";
import type { BubbleDefinition, Direction, LevelDefinition, Topology } from "./types.js";

export const MIN_GENERATED_BUBBLES = 8;
export const MAX_GENERATED_BUBBLES = 12;

export interface GeneratorOptions {
    seed: number;
    bubbleCount?: number;
    width?: number;
    height?: number;
    radius?: number;
    topology?: Topology;
    /** Max layout attempts before giving up. */
    maxAttempts?: number;
    /** Require the bubble path polyline to cross itself (default: true). */
    requireSelfIntersecting?: boolean;
}

export interface GeneratedLevel {
    level: LevelDefinition;
    seed: number;
    bubbleCount: number;
    winningBubbleId: number;
    name: string;
}

type Rng = () => number;
type Cell = { c: number; r: number };
type Point = { x: number; y: number };

function createRng(seed: number): Rng {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function randomSeed(): number {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return buffer[0]!;
    }
    return (Date.now() ^ (Math.random() * 0x1_0000_0000)) >>> 0;
}

function clampBubbleCount(value: number | undefined, rng: Rng): number {
    if (value !== undefined) {
        if (!Number.isInteger(value) || value < MIN_GENERATED_BUBBLES || value > MAX_GENERATED_BUBBLES) {
            throw new Error(
                `bubbleCount must be an integer between ${MIN_GENERATED_BUBBLES} and ${MAX_GENERATED_BUBBLES}`,
            );
        }
        return value;
    }
    return MIN_GENERATED_BUBBLES + Math.floor(rng() * (MAX_GENERATED_BUBBLES - MIN_GENERATED_BUBBLES + 1));
}

function shuffleInPlace<T>(items: T[], rng: Rng): void {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [items[i], items[j]] = [items[j]!, items[i]!];
    }
}

function cellKey(cell: Cell): string {
    return `${cell.c},${cell.r}`;
}

function applyGridStep(
    cell: Cell,
    dc: number,
    dr: number,
    cols: number,
    rows: number,
    topology: Topology,
): Cell | null {
    let c = cell.c + dc;
    let r = cell.r + dr;
    if (topology === "bounded") {
        if (c < 0 || c >= cols || r < 0 || r >= rows) {
            return null;
        }
        return { c, r };
    }
    if (topology === "wrap") {
        return { c: ((c % cols) + cols) % cols, r: ((r % rows) + rows) % rows };
    }
    if (topology === "mobius") {
        const wrapsX = Math.floor(c / cols);
        c -= wrapsX * cols;
        if (Math.abs(wrapsX) % 2 === 1) {
            r = rows - 1 - r;
        }
        if (r < 0 || r >= rows) {
            return null;
        }
        return { c, r };
    }
    const wrapsY = Math.floor(r / rows);
    r -= wrapsY * rows;
    if (Math.abs(wrapsY) % 2 === 1) {
        c = cols - 1 - c;
    }
    c = ((c % cols) + cols) % cols;
    return { c, r };
}

function directionFrom(a: Cell, b: Cell, cols: number, rows: number, topology: Topology): Direction | null {
    const steps: Array<{ dc: number; dr: number; direction: Direction }> = [
        { dc: 1, dr: 0, direction: "right" },
        { dc: -1, dr: 0, direction: "left" },
        { dc: 0, dr: 1, direction: "down" },
        { dc: 0, dr: -1, direction: "up" },
        { dc: 2, dr: 0, direction: "right" },
        { dc: -2, dr: 0, direction: "left" },
        { dc: 0, dr: 2, direction: "down" },
        { dc: 0, dr: -2, direction: "up" },
    ];
    const allowed = topology === "bounded" ? steps.slice(0, 4) : steps;
    for (const step of allowed) {
        const next = applyGridStep(a, step.dc, step.dr, cols, rows, topology);
        if (next !== null && next.c === b.c && next.r === b.r) {
            return step.direction;
        }
    }
    if (a.r === b.r && a.c !== b.c) {
        return b.c > a.c ? "right" : "left";
    }
    if (a.c === b.c && a.r !== b.r) {
        return b.r > a.r ? "down" : "up";
    }
    return null;
}

/** Reject paths that hug the grid edge (common when forcing a boundary-crossing step). */
function pathTooCloseToGridEdge(
    cells: readonly Cell[],
    cols: number,
    rows: number,
    minInteriorCount: number,
): boolean {
    let edgeCount = 0;
    for (const cell of cells) {
        const onEdge = cell.c === 0 || cell.c === cols - 1 || cell.r === 0 || cell.r === rows - 1;
        if (onEdge) {
            edgeCount++;
        }
    }
    const interiorCount = cells.length - edgeCount;
    if (interiorCount < minInteriorCount) {
        return true;
    }
    // Avoid tiny clusters: at least half the bubbles should not sit on the outer ring.
    if (edgeCount > Math.ceil(cells.length * 0.55)) {
        return true;
    }
    return false;
}

function pathUsesTopologyBoundary(
    cells: readonly Cell[],
    cols: number,
    rows: number,
    topology: Topology,
): boolean {
    if (topology === "bounded" || cells.length < 2) {
        return false;
    }
    for (let i = 0; i < cells.length - 1; i++) {
        const a = cells[i]!;
        const b = cells[i + 1]!;
        const dcRaw = Math.abs(a.c - b.c);
        const drRaw = Math.abs(a.r - b.r);
        if (topology === "wrap" && (dcRaw > 2 || drRaw > 2)) {
            return true;
        }
        if (topology === "mobius") {
            const flipped = a.r + b.r === rows - 1;
            if (flipped && dcRaw > 2) {
                return true;
            }
        }
        if (topology === "klein") {
            const flipped = a.c + b.c === cols - 1;
            if (flipped && drRaw > 2) {
                return true;
            }
        }
    }
    return false;
}

function farthestBoundaryDirection(p: Point, width: number, height: number, rng: Rng): Direction {
    const left = p.x;
    const right = width - p.x;
    const up = p.y;
    const down = height - p.y;
    const options: Array<{ d: Direction; dist: number }> = [
        { d: "left", dist: left },
        { d: "right", dist: right },
        { d: "up", dist: up },
        { d: "down", dist: down },
    ];
    const maxDist = Math.max(...options.map((o) => o.dist));
    const best = options.filter((o) => Math.abs(o.dist - maxDist) < 1e-9);
    return best[Math.floor(rng() * best.length)]!.d;
}

type PathSegment =
    | { axis: "h"; row: number; lo: number; hi: number }
    | { axis: "v"; col: number; lo: number; hi: number };

/** Merge consecutive colinear steps into horizontal/vertical segments. */
export function extractPathSegments(cells: readonly Cell[]): PathSegment[] {
    if (cells.length < 2) {
        return [];
    }
    const segments: PathSegment[] = [];
    let start = 0;
    for (let i = 1; i < cells.length; i++) {
        const prev = cells[i - 1]!;
        const cur = cells[i]!;
        const next = i + 1 < cells.length ? cells[i + 1]! : null;
        const horizontal = prev.r === cur.r;
        const vertical = prev.c === cur.c;
        if (!horizontal && !vertical) {
            continue;
        }
        const continues = next !== null
            && ((horizontal && next.r === cur.r) || (vertical && next.c === cur.c));
        if (continues) {
            continue;
        }
        const a = cells[start]!;
        const b = cur;
        if (a.r === b.r) {
            segments.push({ axis: "h", row: a.r, lo: Math.min(a.c, b.c), hi: Math.max(a.c, b.c) });
        } else {
            segments.push({ axis: "v", col: a.c, lo: Math.min(a.r, b.r), hi: Math.max(a.r, b.r) });
        }
        start = i;
    }
    return segments;
}

function segmentsProperlyCross(a: PathSegment, b: PathSegment): boolean {
    if (a.axis === b.axis) {
        return false;
    }
    const h = a.axis === "h" ? a : b;
    const v = a.axis === "v" ? a : b;
    if (h.axis !== "h" || v.axis !== "v") {
        return false;
    }
    return h.lo < v.col && v.col < h.hi && v.lo < h.row && h.row < v.hi;
}

/** True when two non-adjacent path legs cross at an interior grid point. */
export function pathSelfIntersects(cells: readonly Cell[]): boolean {
    const segments = extractPathSegments(cells);
    if (segments.length < 4) {
        return false;
    }
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 2; j < segments.length; j++) {
            if (segmentsProperlyCross(segments[i]!, segments[j]!)) {
                return true;
            }
        }
    }
    return false;
}

function unitSegmentCrossesPath(from: Cell, to: Cell, path: readonly Cell[]): number {
    if (from.r === to.r) {
        const seg: PathSegment = {
            axis: "h",
            row: from.r,
            lo: Math.min(from.c, to.c),
            hi: Math.max(from.c, to.c),
        };
        const existing = extractPathSegments(path);
        let score = 0;
        for (let i = 0; i < existing.length - 1; i++) {
            if (segmentsProperlyCross(seg, existing[i]!)) {
                score += 12;
            }
        }
        return score;
    }
    if (from.c === to.c) {
        const seg: PathSegment = {
            axis: "v",
            col: from.c,
            lo: Math.min(from.r, to.r),
            hi: Math.max(from.r, to.r),
        };
        const existing = extractPathSegments(path);
        let score = 0;
        for (let i = 0; i < existing.length - 1; i++) {
            if (segmentsProperlyCross(seg, existing[i]!)) {
                score += 12;
            }
        }
        return score;
    }
    return 0;
}

/** Build a figure-eight path known to self-intersect and admit a chain win from bubble 0. */
function tryBuildFigureEightPath(
    count: number,
    cols: number,
    rows: number,
    topology: Topology,
    rng: Rng,
): Cell[] | null {
    if (topology !== "bounded" || count < 8) {
        return null;
    }

    for (let attempt = 0; attempt < 48; attempt++) {
        const w = 2 + Math.floor(rng() * 2);
        const h = 2 + Math.floor(rng() * 2);
        const cx = w + 1 + Math.floor(rng() * Math.max(1, cols - 2 * w - 2));
        const cy = h + 1 + Math.floor(rng() * Math.max(1, rows - 2 * h - 1));
        const xL = cx - w;
        const xLi = cx - w + 1;
        const xRi = cx + w - 1;
        const xRo = cx + w;
        const yT = cy - h;
        const yM = cy;
        const yB = cy + h;
        const pierceY = yT + 1 + Math.floor(rng() * Math.max(1, yM - yT));
        const pierceEnd = xRi - 1 - Math.floor(rng() * Math.max(1, w));

        const core: Cell[] = [
            { c: xL, r: yM },
            { c: xRi, r: yM },
            { c: xRi, r: yT },
            { c: xLi, r: yT },
            { c: xLi, r: yB },
            { c: xRo, r: yB },
            { c: xRo, r: pierceY },
            { c: pierceEnd, r: pierceY },
        ];

        if (!cellsWithinGrid(core, cols, rows)) {
            continue;
        }
        if (new Set(core.map(cellKey)).size !== core.length) {
            continue;
        }
        if (!pathSelfIntersects(core)) {
            continue;
        }

        const path = [...core];
        const used = new Set(path.map(cellKey));
        const steps: Cell[] = [
            { c: 1, r: 0 },
            { c: -1, r: 0 },
            { c: 0, r: 1 },
            { c: 0, r: -1 },
        ];

        while (path.length < count) {
            const current = path[path.length - 1]!;
            const candidates = steps
                .map((s) => ({ c: current.c + s.c, r: current.r + s.r }))
                .filter((next) => next.c >= 0 && next.c < cols && next.r >= 0 && next.r < rows
                    && !used.has(cellKey(next))
                    && !tooCloseToExistingPath(path, next, topology, cols, rows));
            shuffleInPlace(candidates, rng);
            if (candidates.length === 0) {
                break;
            }
            const next = candidates[0]!;
            path.push(next);
            used.add(cellKey(next));
        }

        if (path.length === count && pathSelfIntersects(path)) {
            return path;
        }
    }

    return null;
}

function cellsWithinGrid(cells: readonly Cell[], cols: number, rows: number): boolean {
    return cells.every((cell) => cell.c >= 0 && cell.c < cols && cell.r >= 0 && cell.r < rows);
}

function tooCloseToExistingPath(
    path: readonly Cell[],
    next: Cell,
    topology: Topology,
    cols: number,
    rows: number,
): boolean {
    for (let i = 0; i < path.length - 1; i++) {
        const prior = path[i]!;
        const dcRaw = Math.abs(prior.c - next.c);
        const drRaw = Math.abs(prior.r - next.r);
        const dc = (topology === "wrap" || topology === "klein" || topology === "mobius")
            ? Math.min(dcRaw, cols - dcRaw)
            : dcRaw;
        const dr = (topology === "wrap" || topology === "klein")
            ? Math.min(drRaw, rows - drRaw)
            : drRaw;
        if (dc + dr < 2) {
            return true;
        }
    }
    return false;
}

function buildPathCells(
    count: number,
    cols: number,
    rows: number,
    topology: Topology,
    rng: Rng,
    preferSelfIntersecting: boolean,
): Cell[] | null {
    if (count <= 0 || cols <= 0 || rows <= 0) {
        return null;
    }

    if (preferSelfIntersecting) {
        const bowtie = tryBuildFigureEightPath(count, cols, rows, topology, rng);
        if (bowtie !== null) {
            return bowtie;
        }
    }

    // Bias starts toward the interior so random maps don't collapse near one boundary.
    const edgeInset = Math.min(2, Math.floor(Math.min(cols, rows) / 4));
    const start: Cell = {
        c: edgeInset + Math.floor(rng() * Math.max(1, cols - edgeInset * 2)),
        r: edgeInset + Math.floor(rng() * Math.max(1, rows - edgeInset * 2)),
    };
    const path: Cell[] = [start];
    const used = new Set<string>([cellKey(start)]);

    const steps: Cell[] = [
        { c: 1, r: 0 },
        { c: -1, r: 0 },
        { c: 0, r: 1 },
        { c: 0, r: -1 },
    ];
    if (topology === "wrap" || topology === "mobius" || topology === "klein") {
        steps.push(
            { c: 2, r: 0 },
            { c: -2, r: 0 },
            { c: 0, r: 2 },
            { c: 0, r: -2 },
        );
    }

    function dfs(): boolean {
        if (path.length === count) {
            return true;
        }
        const current = path[path.length - 1]!;
        const candidates = steps
            .map((s) => applyGridStep(current, s.c, s.r, cols, rows, topology))
            .filter((next): next is Cell => next !== null);
        shuffleInPlace(candidates, rng);
        if (preferSelfIntersecting && path.length >= 4) {
            candidates.sort((a, b) => {
                const current = path[path.length - 1]!;
                const scoreA = unitSegmentCrossesPath(current, a, path) + rng() * 0.01;
                const scoreB = unitSegmentCrossesPath(current, b, path) + rng() * 0.01;
                return scoreB - scoreA;
            });
        }

        for (const next of candidates) {
            if (topology === "bounded"
                && (next.c < 0 || next.c >= cols || next.r < 0 || next.r >= rows)) {
                continue;
            }
            if (topology === "mobius"
                && (next.r < 0 || next.r >= rows)) {
                continue;
            }
            const key = cellKey(next);
            if (used.has(key)) {
                continue;
            }
            // Keep good spacing between non-consecutive path points.
            if (tooCloseToExistingPath(path, next, topology, cols, rows)) {
                continue;
            }

            path.push(next);
            used.add(key);
            if (dfs()) {
                return true;
            }
            used.delete(key);
            path.pop();
        }
        return false;
    }

    return dfs() ? path : null;
}

function buildPathLevel(
    rng: Rng,
    count: number,
    width: number,
    height: number,
    radius: number,
    topology: Topology,
    requireSelfIntersecting: boolean,
): LevelDefinition | null {
    const spacing = bubbleGridSpacing(radius);
    const margin = radius + 40;
    const cols = Math.floor((width - margin * 2) / spacing) + 1;
    const rows = Math.floor((height - margin * 2) / spacing) + 1;
    if (cols < 4 || rows < 4) {
        return null;
    }

    const cells = buildPathCells(count, cols, rows, topology, rng, requireSelfIntersecting);
    if (cells === null) {
        return null;
    }
    if (requireSelfIntersecting && !pathSelfIntersects(cells)) {
        return null;
    }
    if ((topology === "wrap" || topology === "mobius" || topology === "klein")
        && !pathUsesTopologyBoundary(cells, cols, rows, topology)) {
        return null;
    }
    const minInterior = Math.max(3, Math.floor(count * 0.45));
    if (pathTooCloseToGridEdge(cells, cols, rows, minInterior)) {
        return null;
    }

    const points: Point[] = cells.map((cell) => ({
        x: Math.round(margin + cell.c * spacing),
        y: Math.round(margin + cell.r * spacing),
    }));

    const bubbles: BubbleDefinition[] = [];
    for (let i = 0; i < cells.length; i++) {
        let direction: Direction;
        if (i < cells.length - 1) {
            const d = directionFrom(cells[i]!, cells[i + 1]!, cols, rows, topology);
            if (d === null) {
                return null;
            }
            direction = d;
        } else {
            direction = farthestBoundaryDirection(points[i]!, width, height, rng);
        }

        bubbles.push({
            id: i,
            x: points[i]!.x,
            y: points[i]!.y,
            radius,
            direction,
            movable: i !== cells.length - 1,
        });
    }

    if (!bubblesAreSeparated(bubbles)) {
        return null;
    }
    if (!bubblesFullyOnCanvas(bubbles, width, height)) {
        return null;
    }

    return { width, height, bubbles };
}

function generateLevelInternal(options: GeneratorOptions, requireSelfIntersecting: boolean): GeneratedLevel {
    const seed = options.seed >>> 0;
    const topology: Topology = options.topology ?? "bounded";
    const width = options.width ?? 800;
    const height = options.height ?? 560;
    const radius = options.radius ?? 26;
    const maxAttempts = options.maxAttempts ?? 160;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const attemptSeed = (seed + attempt * 0x9e3779b9) >>> 0;
        const rng = createRng(attemptSeed);
        const bubbleCount = clampBubbleCount(options.bubbleCount, rng);
        const candidate = buildPathLevel(
            rng,
            bubbleCount,
            width,
            height,
            radius,
            topology,
            requireSelfIntersecting,
        );
        if (candidate === null) {
            continue;
        }

        const level: LevelDefinition = {
            ...candidate,
            speed: DEFAULT_SPEED,
            topology,
        };

        const report = solveLevel(level);
        if (report.winningIds.length === 0) {
            continue;
        }

        return {
            level,
            seed,
            bubbleCount,
            winningBubbleId: report.winningIds[0]!,
            name: `Random #${seed}`,
        };
    }

    throw new Error(`Could not generate a bubble-chain level for seed ${seed}`);
}

export function generateLevel(options: GeneratorOptions): GeneratedLevel {
    const requireSelfIntersecting = options.requireSelfIntersecting ?? true;
    try {
        return generateLevelInternal(options, requireSelfIntersecting);
    } catch (error) {
        if (!requireSelfIntersecting) {
            throw error;
        }
        return generateLevelInternal(
            { ...options, maxAttempts: Math.max(80, Math.floor((options.maxAttempts ?? 160) / 2)) },
            false,
        );
    }
}

export function tryGenerateLevel(options: GeneratorOptions): GeneratedLevel | null {
    try {
        return generateLevel(options);
    } catch {
        return null;
    }
}

