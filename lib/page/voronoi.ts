import {
    voronoiCreate,
    voronoiDestroy,
    voronoiAddPoint,
    voronoiRemovePoint,
    voronoiClear,
    voronoiCompute,
    voronoiSetMode,
    voronoiSetChebyshevNoTie,
    voronoiNumSites,
    voronoiGetSite,
    voronoiGetCellBoundariesInternal,
    voronoiGetCellBoundariesExact,
    voronoiGetNeighbors,
    exactRationalToNumber,
    modulePromise,
    VoronoiCellBoundary,
    VoronoiCellBoundaryExact,
    type VoronoiMetric,
    type VoronoiTopology,
} from "../tsl/wasm/ts/wasm_api_voronoi";
type RgbColor = { r: number; g: number; b: number };

// Canvas setup
const canvas = document.getElementById("voronoi-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// UI elements
const pointCountElem = document.getElementById("point-count");
const randomBtn = document.getElementById("random-btn");
const clearBtn = document.getElementById("clear-btn");
const edgeDisplayRadios = document.querySelectorAll<HTMLInputElement>(
    'input[name="edge-display"]',
);
const metricRadios = document.querySelectorAll<HTMLInputElement>('input[name="voronoi-metric"]');
const topologyRadios = document.querySelectorAll<HTMLInputElement>('input[name="voronoi-topology"]');
const chebyshevTieCheckbox = document.getElementById("chebyshev-tie-break") as HTMLInputElement | null;
const modeStatusElem = document.getElementById("voronoi-mode-status");
const viewLayoutBtn = document.getElementById("view-layout-btn");
const debugModeCheckbox = document.getElementById("voronoi-debug-mode") as HTMLInputElement | null;
const controlsDebugElem = document.getElementById("controls-debug");
const debugCoordXInput = document.getElementById("debug-coord-x") as HTMLInputElement | null;
const debugCoordYInput = document.getElementById("debug-coord-y") as HTMLInputElement | null;
const debugAddSiteBtn = document.getElementById("debug-add-site-btn");
const debugCoordStatusElem = document.getElementById("debug-coord-status");

/** What to stroke on top of filled cells. */
type EdgeDisplayMode = "none" | "outline" | "pieces";
let edgeDisplay: EdgeDisplayMode = "outline";
let voronoiMetric: VoronoiMetric = "l2";
let voronoiTopology: VoronoiTopology = "plane";
let chebyshevTieBreak = false;

const SUPPORTED = new Set<string>([
    "l2:plane",
    "l2:torus",
    "l2:cylinder",
    "l2:mobius",
    "l2:klein",
    "l1:plane",
    "l1:torus",
    "l1:cylinder",
    "l1:mobius",
    "l1:klein",
    "linf:plane",
    "linf:torus",
    "linf:cylinder",
    "linf:mobius",
    "linf:klein",
]);

function pairKey(metric: VoronoiMetric, topology: VoronoiTopology): string {
    return `${metric}:${topology}`;
}

function isPairSupported(metric: VoronoiMetric, topology: VoronoiTopology): boolean {
    return SUPPORTED.has(pairKey(metric, topology));
}

function activeCacheKey(): string {
    return `${pairKey(voronoiMetric, voronoiTopology)}:${chebyshevTieBreak ? "tie" : "notie"}`;
}
/** `1x1` = full fundamental domain; `3x3` = nine equal tiles (same diagram, shrunk). */
let viewLayout: "1x1" | "3x3" = "1x1";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
/** Radius of each seed marker (pixels), drawn on top after fills and edges. */
const SEED_POINT_RADIUS = 5;

const colors: RgbColor[] = [
    { r: 181, g: 137, b: 0 },
    { r: 203, g: 75, b: 22 },
    { r: 220, g: 50, b: 47 },
    { r: 211, g: 54, b: 130 },
    { r: 108, g: 113, b: 196 },
    { r: 38, g: 139, b: 210 },
    { r: 42, g: 161, b: 152 },
    { r: 133, g: 153, b: 0 },
    { r: 147, g: 161, b: 161 },
    { r: 101, g: 123, b: 131 },
    { r: 88, g: 110, b: 117 },
    { r: 7, g: 54, b: 66 },
    { r: 238, g: 232, b: 213 },
    { r: 253, g: 246, b: 227 },
    { r: 194, g: 210, b: 212 },
    { r: 225, g: 232, b: 214 },
    { r: 217, g: 196, b: 166 },
    { r: 239, g: 210, b: 136 },
    { r: 214, g: 181, b: 133 },
    { r: 203, g: 158, b: 123 },
    { r: 190, g: 174, b: 212 },
    { r: 190, g: 203, b: 210 },
    { r: 181, g: 191, b: 175 },
    { r: 208, g: 216, b: 184 },
];
let nextSiteId = 1;
let siteIds: number[] = [];
let siteColors = new Map<number, number>();
let latestBoundaries: VoronoiCellBoundary[] = [];
let latestInternalBoundaries: VoronoiCellBoundary[] = [];

type CachedGeometry = {
    boundaries: VoronoiCellBoundary[];
    internalBoundaries: VoronoiCellBoundary[];
    exactBoundaries: VoronoiCellBoundaryExact[];
    siteColors: Map<number, number>;
};

// Per (metric, topology, tie) cache — invalidated when seeds change.
const geometryByCacheKey: Record<string, CachedGeometry> = {};

function emptyGeometry(): CachedGeometry {
    return {
        boundaries: [],
        internalBoundaries: [],
        exactBoundaries: [],
        siteColors: new Map<number, number>(),
    };
}

function invalidateGeometryCache(): void {
    for (const key of Object.keys(geometryByCacheKey)) {
        delete geometryByCacheKey[key];
    }
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
    const hue = ((h % 360) + 360) % 360;
    const sat = s / 100;
    const light = l / 100;

    const chroma = (1 - Math.abs(2 * light - 1)) * sat;
    const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
    const match = light - chroma / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    switch (Math.floor(hue / 60)) {
        case 0:
            r1 = chroma;
            g1 = x;
            break;
        case 1:
            r1 = x;
            g1 = chroma;
            break;
        case 2:
            g1 = chroma;
            b1 = x;
            break;
        case 3:
            g1 = x;
            b1 = chroma;
            break;
        case 4:
            r1 = x;
            b1 = chroma;
            break;
        default:
            r1 = chroma;
            b1 = x;
    }

    return {
        r: Math.round((r1 + match) * 255),
        g: Math.round((g1 + match) * 255),
        b: Math.round((b1 + match) * 255),
    };
}

function getColor(idx: number): RgbColor {
    return colors[idx % colors.length];
}

function resetSiteState(): void {
    siteIds = [];
    siteColors = new Map<number, number>();
    latestBoundaries = [];
    latestInternalBoundaries = [];
    invalidateGeometryCache();
}

function rgbToCss(color: RgbColor): string {
    return `rgb(${color.r} ${color.g} ${color.b})`;
}

function countBoundaryLoops(boundaries: VoronoiCellBoundary[]): number {
    let n = 0;
    for (const cell of boundaries) {
        n += cell.polygons.length;
    }
    return n;
}

function applyEdgeDisplay(mode: EdgeDisplayMode): void {
    edgeDisplay = mode;
    for (const radio of edgeDisplayRadios) {
        radio.checked = radio.value === mode;
    }
}

function modeLabel(): string {
    const m =
        voronoiMetric === "l2" ? "L₂" : voronoiMetric === "l1" ? "L₁" : "L∞";
    const t =
        voronoiTopology === "plane"
            ? "Plane"
            : voronoiTopology.charAt(0).toUpperCase() + voronoiTopology.slice(1);
    return `${m} · ${t}`;
}

function logEdgeDataSummary(label: string): void {
    const outlineLoops = countBoundaryLoops(latestBoundaries);
    const pieceLoops = countBoundaryLoops(latestInternalBoundaries);
    console.debug(
        `voronoi edges [${label}]: outline loops=${outlineLoops}, clip-piece loops=${pieceLoops}` +
            (pieceLoops <= outlineLoops
                ? " (no extra internal edges for this metric/sites — try Chebyshev or Manhattan)"
                : ""),
    );
}

/** Compute approximate signed area (double) for a polygon loop. */
function polygonAreaDouble(loop: { x: number; y: number }[]): number {
    const n = loop.length;
    if (n < 3) return 0;
    let a = 0;
    for (let i = 0; i < n; i++) {
        const p0 = loop[i]!;
        const p1 = loop[(i + 1) % n]!;
        a += p0.x * p1.y - p1.x * p0.y;
    }
    return a * 0.5;
}

/** Debug log: one collapsible group per mode with site table + compact polygon strings. */
function logVoronoiGeometryDebug(
    mode: string,
    boundaries: VoronoiCellBoundary[],
    exactBoundaries: VoronoiCellBoundaryExact[],
    colorsByStableId: Map<number, number>,
): void {
    const n = voronoiNumSites();
    if (n === 0) {
        return;
    }
    console.group(`voronoi ${mode} geometry`);
    const rows: Record<string, unknown>[] = [];
    const fullRows: Record<string, unknown>[] = [];
    for (let i = 0; i < n; i++) {
        const { x, y } = voronoiGetSite(i);
        const sid = siteIds[i];
        const cidx = sid !== undefined ? (colorsByStableId.get(sid) ?? 0) : 0;
        const cellBoundary = boundaries.find((c) => c.site === i);
        const polys = (cellBoundary?.polygons ?? []).map((loop) => loop.map((p) => ({ x: p.x, y: p.y })));
        const polyCount = polys.length;
        const areas = polys.map((loop) => Math.abs(polygonAreaDouble(loop)).toFixed(0));
        const polySummary = polys
            .map((loop, pi) => {
                const nv = loop.length;
                const pts = loop
                    .slice(0, Math.min(nv, 8))
                    .map((p) => `[${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}]`)
                    .join(",");
                return nv > 8 ? `(${nv}v)[${pts},…]` : `(${nv}v)[${pts}]`;
            })
            .join(" ") || "∅";

        rows.push({
            site: i,
            pos: `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`,
            fill: rgbToCss(getColor(cidx)),
            n: polyCount,
            area: areas.join(" "),
            polys: polySummary,
        });
        fullRows.push({
            site: i,
            pos: `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`,
            fill: rgbToCss(getColor(cidx)),
            n: polyCount,
            area: areas.join(" "),
            polys,
        });
    }
    console.table(rows);
    console.groupCollapsed("Full JSON geometry");
    console.log(JSON.stringify(fullRows, null, 2));
    console.groupEnd();
    console.log(`voronoi ${mode} geometry loaded`);
    console.groupEnd();
}

function normalizeVertices(vertices: { x: number; y: number }[]): { x: number; y: number }[] {
    if (vertices.length < 3) {
        return vertices.slice();
    }

    const deduped: { x: number; y: number }[] = [];
    for (const vertex of vertices) {
        const last = deduped[deduped.length - 1];
        if (!last || Math.abs(last.x - vertex.x) > 1e-6 || Math.abs(last.y - vertex.y) > 1e-6) {
            deduped.push(vertex);
        }
    }

    if (deduped.length > 1) {
        const first = deduped[0];
        const last = deduped[deduped.length - 1];
        if (Math.abs(first.x - last.x) <= 1e-6 && Math.abs(first.y - last.y) <= 1e-6) {
            deduped.pop();
        }
    }

    return deduped;
}

function addPoint(x: number, y: number): void {
    voronoiAddPoint(x, y);
    siteIds.push(nextSiteId++);
    invalidateGeometryCache();
}

function setDebugCoordStatus(message: string): void {
    if (debugCoordStatusElem) {
        debugCoordStatusElem.textContent = message;
    }
}

function applyDebugModeUi(enabled: boolean): void {
    if (controlsDebugElem) {
        controlsDebugElem.classList.toggle("is-on", enabled);
    }
    if (!enabled) {
        setDebugCoordStatus("");
    }
}

/** Parse integer site coordinates for the fundamental domain [0,W)×[0,H). */
function parseSiteCoordInput(raw: string, maxInclusive: number): number | null {
    const trimmed = raw.trim();
    if (!/^-?\d+$/.test(trimmed)) {
        return null;
    }
    const v = Number(trimmed);
    if (!Number.isInteger(v) || v < 0 || v > maxInclusive) {
        return null;
    }
    return v;
}

function addSiteFromCoordInputs(): void {
    if (!debugCoordXInput || !debugCoordYInput) {
        return;
    }
    const x = parseSiteCoordInput(
        debugCoordXInput.value,
        CANVAS_WIDTH - 1,
    );
    const y = parseSiteCoordInput(
        debugCoordYInput.value,
        CANVAS_HEIGHT - 1,
    );
    if (x === null || y === null) {
        setDebugCoordStatus(
            `invalid (use integers 0–${CANVAS_WIDTH - 1}, 0–${CANVAS_HEIGHT - 1})`,
        );
        return;
    }
    addPoint(x, y);
    refreshGeometry();
    updateUI();
    draw();
    setDebugCoordStatus(`added (${x}, ${y})`);
    console.debug(`voronoi debug: added site (${x}, ${y})`);
}

function removePoint(idx: number): void {
    voronoiRemovePoint(idx);
    const removedId = siteIds[idx];
    siteIds.splice(idx, 1);
    siteColors.delete(removedId);
    invalidateGeometryCache();
}

function euclideanDistSq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

/** Shortest axial delta on a periodic domain of length `period` (flat torus). */
function torusComponentDelta(p: number, s: number, period: number): number {
    let d = p - s;
    d -= Math.round(d / period) * period;
    return d;
}

function torusDistSq(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    const dx = torusComponentDelta(px, sx, w);
    const dy = torusComponentDelta(py, sy, h);
    return dx * dx + dy * dy;
}

/** Lift window for brute periodic/Klein/Möbius distance (matches gtests). */
const LIFT_RADIUS = 4;

function kleinDistSq(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    let best = Infinity;
    for (let k = -LIFT_RADIUS; k <= LIFT_RADIUS; k++) {
        for (let l = -LIFT_RADIUS; l <= LIFT_RADIUS; l++) {
            const flip = (l & 1) !== 0;
            const sxl = flip ? w - sx : sx;
            const dx = px - (sxl + k * w);
            const dy = py - (sy + l * h);
            best = Math.min(best, dx * dx + dy * dy);
        }
    }
    return best;
}

function kleinChebDist(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    let best = Infinity;
    for (let k = -LIFT_RADIUS; k <= LIFT_RADIUS; k++) {
        for (let l = -LIFT_RADIUS; l <= LIFT_RADIUS; l++) {
            const flip = (l & 1) !== 0;
            const sxl = flip ? w - sx : sx;
            const dx = Math.abs(px - (sxl + k * w));
            const dy = Math.abs(py - (sy + l * h));
            best = Math.min(best, Math.max(dx, dy));
        }
    }
    return best;
}

function kleinManhattanDist(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    let best = Infinity;
    for (let k = -LIFT_RADIUS; k <= LIFT_RADIUS; k++) {
        for (let l = -LIFT_RADIUS; l <= LIFT_RADIUS; l++) {
            const flip = (l & 1) !== 0;
            const sxl = flip ? w - sx : sx;
            const dx = Math.abs(px - (sxl + k * w));
            const dy = Math.abs(py - (sy + l * h));
            best = Math.min(best, dx + dy);
        }
    }
    return best;
}

function mobiusDistSq(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    let best = Infinity;
    for (let k = -LIFT_RADIUS; k <= LIFT_RADIUS; k++) {
        const flip = (k & 1) !== 0;
        const syl = flip ? h - sy : sy;
        const dx = px - (sx + k * w);
        const dy = py - syl;
        best = Math.min(best, dx * dx + dy * dy);
    }
    return best;
}

function mobiusChebDist(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    let best = Infinity;
    for (let k = -LIFT_RADIUS; k <= LIFT_RADIUS; k++) {
        const flip = (k & 1) !== 0;
        const syl = flip ? h - sy : sy;
        const dx = Math.abs(px - (sx + k * w));
        const dy = Math.abs(py - syl);
        best = Math.min(best, Math.max(dx, dy));
    }
    return best;
}

function mobiusManhattanDist(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    let best = Infinity;
    for (let k = -LIFT_RADIUS; k <= LIFT_RADIUS; k++) {
        const flip = (k & 1) !== 0;
        const syl = flip ? h - sy : sy;
        const dx = Math.abs(px - (sx + k * w));
        const dy = Math.abs(py - syl);
        best = Math.min(best, dx + dy);
    }
    return best;
}

/**
 * Closest seed by the active metric (brute force). Used for context-menu hit
 * testing; diagram ownership comes from exported cell polygons.
 */
/** Chebyshev: unique strict minimizer of Chebyshev distance, or -1 if tie. */
function strictChebyshevUniqueSiteIndex(x: number, y: number): number {
    const n = voronoiNumSites();
    if (n <= 0) {
        return -1;
    }
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const sites = Array.from({ length: n }, (_, i) => voronoiGetSite(i));
    return strictChebyshevPixelCenterOwner(gx, gy, sites);
}

function strictChebyshevPixelCenterOwner(
    ix: number,
    iy: number,
    sites: readonly { x: number; y: number }[],
): number {
    const n = sites.length;
    if (n === 0) {
        return -1;
    }
    const px = ix * 2 + 1;
    const py = iy * 2 + 1;
    let best = Number.MAX_SAFE_INTEGER;
    let second = Number.MAX_SAFE_INTEGER;
    let bestIdx = -1;
    for (let i = 0; i < n; i++) {
        const s = sites[i]!;
        const sx = s.x * 2 + 1;
        const sy = s.y * 2 + 1;
        const d = Math.max(Math.abs(px - sx), Math.abs(py - sy));
        if (d < best) {
            second = best;
            best = d;
            bestIdx = i;
        } else if (d < second) {
            second = d;
        }
    }
    return best < second ? bestIdx : -1;
}

/**
 * Chebyshev-tie variant: returns the smallest-index site among those at
 * minimum Chebyshev distance. Never returns -1 (unless no sites).
 */
function strictChebyshevFirstTieOwner(
    ix: number,
    iy: number,
    sites: readonly { x: number; y: number }[],
): number {
    const n = sites.length;
    if (n === 0) {
        return -1;
    }
    const px = ix * 2 + 1;
    const py = iy * 2 + 1;
    let best = Number.MAX_SAFE_INTEGER;
    let bestIdx = 0;
    for (let i = 0; i < n; i++) {
        const s = sites[i]!;
        const sx = s.x * 2 + 1;
        const sy = s.y * 2 + 1;
        const d = Math.max(Math.abs(px - sx), Math.abs(py - sy));
        if (d < best) {
            best = d;
            bestIdx = i;
        }
    }
    return bestIdx;
}

/**
 * Closest seed by the active metric (brute force). Used for context-menu hit
 * testing. L∞/L1 default: strict (ties return -1, white gaps). With tie-break
 * checked, ties go to the smallest-index closest site.
 */
function cylinderDistSq(px: number, py: number, sx: number, sy: number, w: number): number {
    const dx = torusComponentDelta(px, sx, w);
    const dy = py - sy;
    return dx * dx + dy * dy;
}

function torusChebDist(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    const dx = Math.abs(torusComponentDelta(px, sx, w));
    const dy = Math.abs(torusComponentDelta(py, sy, h));
    return Math.max(dx, dy);
}

function torusManhattanDist(px: number, py: number, sx: number, sy: number, w: number, h: number): number {
    return (
        Math.abs(torusComponentDelta(px, sx, w)) + Math.abs(torusComponentDelta(py, sy, h))
    );
}

function manhattanDistAt(
    x: number,
    y: number,
    sx: number,
    sy: number,
    topology: VoronoiTopology = voronoiTopology,
): number {
    if (topology === "torus") {
        return torusManhattanDist(x, y, sx, sy, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    if (topology === "cylinder") {
        return Math.abs(torusComponentDelta(x, sx, CANVAS_WIDTH)) + Math.abs(y - sy);
    }
    if (topology === "klein") {
        return kleinManhattanDist(x, y, sx, sy, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    if (topology === "mobius") {
        return mobiusManhattanDist(x, y, sx, sy, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    return Math.abs(x - sx) + Math.abs(y - sy);
}

/** L1: unique strict minimizer, or -1 on tie (white gap). */
function strictManhattanUniqueSiteIndex(
    x: number,
    y: number,
    topology: VoronoiTopology = voronoiTopology,
): number {
    const n = voronoiNumSites();
    if (n <= 0) {
        return -1;
    }
    let best = Number.MAX_SAFE_INTEGER;
    let second = Number.MAX_SAFE_INTEGER;
    let bestIdx = -1;
    for (let i = 0; i < n; i++) {
        const s = voronoiGetSite(i);
        const d = manhattanDistAt(x, y, s.x, s.y, topology);
        if (d < best) {
            second = best;
            best = d;
            bestIdx = i;
        } else if (d < second) {
            second = d;
        }
    }
    return best < second ? bestIdx : -1;
}

/** L1 tie-break: smallest-index site among those at minimum L1 distance. */
function manhattanFirstTieOwner(
    x: number,
    y: number,
    topology: VoronoiTopology = voronoiTopology,
): number {
    const n = voronoiNumSites();
    if (n <= 0) {
        return -1;
    }
    let best = Number.MAX_SAFE_INTEGER;
    let bestIdx = 0;
    for (let i = 0; i < n; i++) {
        const s = voronoiGetSite(i);
        const d = manhattanDistAt(x, y, s.x, s.y, topology);
        if (d < best) {
            best = d;
            bestIdx = i;
        }
    }
    return bestIdx;
}

function findSiteIndexByRegion(
    x: number,
    y: number,
    metric: VoronoiMetric = voronoiMetric,
    topology: VoronoiTopology = voronoiTopology,
): number {
    const n = voronoiNumSites();
    if (n <= 0) {
        return -1;
    }
    if (metric === "linf") {
        if (chebyshevTieBreak) {
            const gx = Math.floor(x);
            const gy = Math.floor(y);
            const sites = Array.from({ length: n }, (_, i) => voronoiGetSite(i));
            return strictChebyshevFirstTieOwner(gx, gy, sites);
        }
        return strictChebyshevUniqueSiteIndex(x, y);
    }
    if (metric === "l1") {
        if (chebyshevTieBreak) {
            return manhattanFirstTieOwner(x, y, topology);
        }
        return strictManhattanUniqueSiteIndex(x, y, topology);
    }
    if (metric === "linf" && topology !== "plane") {
        let bestIdx = 0;
        let bestD = Infinity;
        for (let i = 0; i < n; i++) {
            const s = voronoiGetSite(i);
            let d: number;
            if (topology === "torus") {
                d = torusChebDist(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else if (topology === "cylinder") {
                d = Math.max(
                    Math.abs(torusComponentDelta(x, s.x, CANVAS_WIDTH)),
                    Math.abs(y - s.y),
                );
            } else if (topology === "klein") {
                d = kleinChebDist(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else if (topology === "mobius") {
                d = mobiusChebDist(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else {
                d = Math.max(Math.abs(x - s.x), Math.abs(y - s.y));
            }
            if (d < bestD || (d === bestD && i < bestIdx)) {
                bestD = d;
                bestIdx = i;
            }
        }
        return bestIdx;
    }
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
        const s = voronoiGetSite(i);
        let d: number;
        if (topology === "torus") {
            d = torusDistSq(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else if (topology === "cylinder") {
            d = cylinderDistSq(x, y, s.x, s.y, CANVAS_WIDTH);
        } else if (topology === "klein") {
            d = kleinDistSq(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else if (topology === "mobius") {
            d = mobiusDistSq(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            d = euclideanDistSq(x, y, s.x, s.y);
        }
        if (d < bestD || (d === bestD && i < bestIdx)) {
            bestD = d;
            bestIdx = i;
        }
    }
    return bestIdx;
}

function recolorSites(adjacency: Map<number, Set<number>>): void {
    const previousColors = new Map(siteColors);
    siteColors = new Map<number, number>();

    for (const id of siteIds) {
        const usedColors = new Set<number>();
        const neighbors = adjacency.get(id);
        if (neighbors) {
            for (const neighborId of neighbors) {
                const neighborColor = siteColors.get(neighborId);
                if (neighborColor !== undefined) {
                    usedColors.add(neighborColor);
                }
            }
        }

        const preferredColor = previousColors.get(id);
        if (preferredColor !== undefined && !usedColors.has(preferredColor)) {
            siteColors.set(id, preferredColor);
            continue;
        }

        let chosenColor = 0;
        while (usedColors.has(chosenColor)) {
            chosenColor++;
        }
        siteColors.set(id, chosenColor);
    }

    // Resolve any remaining conflicts deterministically with a few refinement passes.
    for (let pass = 0; pass < 3; pass++) {
        let changed = false;
        for (const id of siteIds) {
            const neighbors = adjacency.get(id);
            if (!neighbors) {
                continue;
            }

            const usedColors = new Set<number>();
            for (const neighborId of neighbors) {
                const neighborColor = siteColors.get(neighborId);
                if (neighborColor !== undefined) {
                    usedColors.add(neighborColor);
                }
            }

            const currentColor = siteColors.get(id);
            if (currentColor !== undefined && !usedColors.has(currentColor)) {
                continue;
            }

            let chosenColor = 0;
            while (usedColors.has(chosenColor)) {
                chosenColor++;
            }
            if (currentColor !== chosenColor) {
                siteColors.set(id, chosenColor);
                changed = true;
            }
        }
        if (!changed) {
            break;
        }
    }
}

function buildGeometry(
    metric: VoronoiMetric,
    topology: VoronoiTopology,
    previousColors: Map<number, number>,
): CachedGeometry {
    voronoiSetMode(metric, topology);
    voronoiSetChebyshevNoTie(!chebyshevTieBreak);
    const nSites = voronoiNumSites();
    const tCompute0 =
        typeof performance !== "undefined" && typeof performance.now === "function"
            ? performance.now()
            : 0;
    voronoiCompute();
    const tCompute1 =
        tCompute0 !== 0 ? performance.now() : 0;
    let exactBoundaries = voronoiGetCellBoundariesExact();
    if (nSites > 0 && exactBoundaries.length !== nSites) {
        console.warn(
            `voronoi: expected ${nSites} cells from WASM, got ${exactBoundaries.length} — using canvas fallback`,
        );
        exactBoundaries = fallbackCellBoundariesExact(nSites);
    }
    const tFetch1 = tCompute1 !== 0 ? performance.now() : 0;
    if (tCompute0 !== 0) {
        console.debug(
            `voronoi: ${pairKey(metric, topology)} compute=${(tCompute1 - tCompute0).toFixed(1)} ms fetch=${(tFetch1 - tCompute1).toFixed(1)} ms`,
        );
    }
    const boundaries = exactBoundaries.map((cell) => ({
        site: cell.site,
        polygons: cell.polygons.map((polygon) =>
            polygon.map((p) => ({
                x: exactRationalToNumber(p.x),
                y: exactRationalToNumber(p.y),
            })),
        ),
    }));
    const internalBoundaries = voronoiGetCellBoundariesInternal();
    const adjacency = voronoiGetNeighbors(siteIds);

    const savedColors = siteColors;
    siteColors = new Map(previousColors);
    recolorSites(adjacency);
    const recolored = new Map(siteColors);
    siteColors = savedColors;

    logVoronoiGeometryDebug(pairKey(metric, topology), boundaries, exactBoundaries, recolored);
    return { boundaries, internalBoundaries, exactBoundaries, siteColors: recolored };
}

function syncActiveGeometry(): void {
    const active = geometryByCacheKey[activeCacheKey()] ?? emptyGeometry();
    latestBoundaries = active.boundaries;
    latestInternalBoundaries = active.internalBoundaries;
    siteColors = new Map(active.siteColors);
}

// Compute geometry for the active distance mode only.
//
// Cache semantics: when the user just toggles between Euclidean and Torus
// without touching the seed set, the cached entry for the new active mode (if
// any) is reused. Any seed-set mutation (add/remove/clear) calls
// invalidateGeometryCache() so the next refresh recomputes for the active
// mode but still skips the inactive one.
function refreshGeometry(): void {
    const key = activeCacheKey();
    if (!geometryByCacheKey[key]) {
        const prevKey = Object.keys(geometryByCacheKey)[0];
        const previousColors = new Map(
            (prevKey ? geometryByCacheKey[prevKey] : emptyGeometry()).siteColors,
        );
        const t0 =
            typeof performance !== "undefined" && typeof performance.now === "function"
                ? performance.now()
                : 0;
        geometryByCacheKey[key] = buildGeometry(voronoiMetric, voronoiTopology, previousColors);
        if (t0 !== 0) {
            const elapsed = performance.now() - t0;
            console.debug(
                `voronoi: ${key} compute+fetch took ${elapsed.toFixed(1)} ms (sites=${voronoiNumSites()})`,
            );
        }
    }
    syncActiveGeometry();
    if (voronoiNumSites() > 0) {
        logEdgeDataSummary(modeLabel());
    }
}

function recomputeAndDraw(): void {
    refreshGeometry();
    updateUI();
    draw();
}

function generateRandomPoints(count: number): void {
    voronoiClear();
    resetSiteState();
    for (let i = 0; i < count; i++) {
        const x = Math.random() * CANVAS_WIDTH;
        const y = Math.random() * CANVAS_HEIGHT;
        addPoint(Math.round(x), Math.round(y));
    }
    recomputeAndDraw();
}

function clearAllPoints(): void {
    voronoiClear();
    resetSiteState();
    refreshGeometry();
    updateUI();
    draw();
}

/** String rationals for exact-boundary fallback (WASM parse-compatible). */
function qStr(n: number, d: number): { num: string; den: string } {
    return { num: String(n), den: String(d) };
}

/**
 * If WASM cell count desyncs (should not happen), single-site diagrams are
 * always the full canvas; for more sites we only show seeds (no bogus cells).
 */
function fallbackCellBoundariesExact(nSites: number): VoronoiCellBoundaryExact[] {
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const rectLoop: VoronoiBoundaryPointExact[] = [
        { x: qStr(0, 1), y: qStr(0, 1) },
        { x: qStr(W, 1), y: qStr(0, 1) },
        { x: qStr(W, 1), y: qStr(H, 1) },
        { x: qStr(0, 1), y: qStr(H, 1) },
    ];
    if (nSites === 1) {
        return [{ site: 0, polygons: [rectLoop] }];
    }
    return Array.from({ length: nSites }, (_, site) => ({ site, polygons: [] as VoronoiBoundaryPointExact[][] }));
}

/** Klein/Möbius cells from WASM can gap/overlap; fill by metric instead of polygons. */
function useMetricRasterFill(): boolean {
    return voronoiTopology === "klein" || voronoiTopology === "mobius";
}

/**
 * Fill the fundamental domain by brute metric distance. Draws in model space
 * (0…W × 0…H) so the caller's transform applies — required for 3×3 tiling.
 */
function fillByMetricOwnership(): void {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const step = viewLayout === "3x3" ? 2 : 1;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    for (let my = 0; my < h; my += step) {
        for (let mx = 0; mx < w; mx += step) {
            const site = findSiteIndexByRegion(mx + 0.5, my + 0.5);
            if (site < 0) {
                continue;
            }
            const colorIdx = siteColors.get(siteIds[site]) ?? 0;
            ctx.fillStyle = rgbToCss(getColor(colorIdx));
            ctx.fillRect(mx, my, step, step);
        }
    }
    ctx.imageSmoothingEnabled = prevSmoothing;
}

function fillCellsFromPolygons(): void {
    for (const cell of latestBoundaries) {
        const colorIdx = siteColors.get(siteIds[cell.site]) ?? 0;
        ctx.fillStyle = rgbToCss(getColor(colorIdx));
        ctx.beginPath();
        for (const loop of cell.polygons) {
            const polygon = normalizeVertices(loop);
            if (polygon.length === 0) {
                continue;
            }
            ctx.moveTo(polygon[0].x, polygon[0].y);
            for (let i = 1; i < polygon.length; i++) {
                ctx.lineTo(polygon[i].x, polygon[i].y);
            }
            ctx.closePath();
        }
        ctx.fill("nonzero");
    }
}

/**
 * Draw one copy of the diagram in fundamental-domain coordinates
 * (0…W × 0…H). Caller sets `ctx` transform; `modelLineWidth` / `modelSeedR`
 * compensate when the tile is scaled down (3×3 view).
 */
function drawOneTile(modelLineWidth: number, modelSeedR: number): void {
    // Pass 1: fill cells. Klein/Möbius use metric raster (polygon clips can gap);
    // plane/torus/cylinder use exported polygons (works with 3×3 transforms).
    if (latestBoundaries.length > 0) {
        if (useMetricRasterFill()) {
            fillByMetricOwnership();
        } else {
            fillCellsFromPolygons();
        }
    }

    if (edgeDisplay !== "none") {
        const usePieces = edgeDisplay === "pieces";
        const strokeBoundaries = usePieces ? latestInternalBoundaries : latestBoundaries;
        ctx.lineWidth = modelLineWidth;
        ctx.strokeStyle = usePieces ? "rgba(0, 0, 0, 0.28)" : "rgba(0, 0, 0, 0.18)";
        ctx.setLineDash(usePieces ? [5, 4] : []);
        if (strokeBoundaries.length > 0) {
            for (const cell of strokeBoundaries) {
                ctx.beginPath();
                for (const loop of cell.polygons) {
                    const poly = normalizeVertices(loop);
                    if (poly.length < 2) continue;
                    ctx.moveTo(poly[0].x, poly[0].y);
                    for (let i = 1; i < poly.length; i++) {
                        ctx.lineTo(poly[i].x, poly[i].y);
                    }
                    ctx.closePath();
                }
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
    }

    const n = voronoiNumSites();
    if (n > 0 && modelSeedR > 0) {
        for (let i = 0; i < n; i++) {
            const { x, y } = voronoiGetSite(i);
            const colorIdx = siteColors.get(siteIds[i]) ?? 0;
            ctx.beginPath();
            ctx.arc(x, y, modelSeedR, 0, Math.PI * 2);
            ctx.fillStyle = rgbToCss(getColor(colorIdx));
            ctx.fill();
            ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
            ctx.lineWidth = Math.max(0.5, modelLineWidth * 1.25);
            ctx.stroke();
        }
    }
}

function draw(): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (viewLayout === "1x1") {
        drawOneTile(1, SEED_POINT_RADIUS);
    } else {
        const cellW = CANVAS_WIDTH / 3;
        const cellH = CANVAS_HEIGHT / 3;
        const sx = cellW / CANVAS_WIDTH;
        const sy = cellH / CANVAS_HEIGHT;
        for (let tj = 0; tj < 3; tj++) {
            for (let ti = 0; ti < 3; ti++) {
                ctx.save();
                ctx.translate(ti * cellW, tj * cellH);
                ctx.scale(sx, sy);
                // Möbius strip tiling: across an odd x-wrap, y is reflected.
                // Klein bottle tiling: across an odd y-wrap, x is reflected.
                // Our 3×3 view represents shifts (ti-1, tj-1)
                const shiftX = ti - 1;
                const shiftY = tj - 1;
                
                switch (voronoiTopology) {
                    case "mobius":
                        if ((shiftX & 1) !== 0) {
                            ctx.translate(0, CANVAS_HEIGHT);
                            ctx.scale(1, -1);
                        }
                        break;
                    case "klein":
                        if ((shiftY & 1) !== 0) {
                            ctx.translate(CANVAS_WIDTH, 0);
                            ctx.scale(-1, 1);
                        }
                        break;
                    default:
                        break;
                }
                drawOneTile(1 / Math.min(sx, sy), SEED_POINT_RADIUS / Math.min(sx, sy));
                ctx.restore();
            }
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i <= 2; i++) {
            ctx.moveTo(i * cellW, 0);
            ctx.lineTo(i * cellW, CANVAS_HEIGHT);
            ctx.moveTo(0, i * cellH);
            ctx.lineTo(CANVAS_WIDTH, i * cellH);
        }
        ctx.stroke();
    }
}

function updateUI(): void {
    const count = voronoiNumSites();
    if (pointCountElem) {
        pointCountElem.textContent = `Points: ${count}`;
    }
}

/** Map canvas pixel to fundamental-domain coordinates (same as 1×1 hit testing). */
function canvasToModel(px: number, py: number): { x: number; y: number } {
    if (viewLayout === "1x1") {
        return { x: px, y: py };
    }
    const cellW = CANVAS_WIDTH / 3;
    const cellH = CANVAS_HEIGHT / 3;
    const ti = Math.min(2, Math.max(0, Math.floor(px / cellW)));
    const tj = Math.min(2, Math.max(0, Math.floor(py / cellH)));
    const u = (px - ti * cellW) / cellW;
    const v = (py - tj * cellH) / cellH;
    const shiftX = ti - 1;
    const shiftY = tj - 1;
    
    // In Möbius mode, odd x-shift tiles are drawn with vertical reflection.
    // In Klein mode, odd y-shift tiles are drawn with horizontal reflection.
    let yFrac = v;
    let xFrac = u;
    
    switch (voronoiTopology) {
        case "mobius":
            if ((shiftX & 1) !== 0) {
                yFrac = 1 - v;
            }
            break;
        case "klein":
            if ((shiftY & 1) !== 0) {
                xFrac = 1 - u;
            }
            break;
        default:
            break;
    }
    return {
        x: xFrac * CANVAS_WIDTH,
        y: yFrac * CANVAS_HEIGHT,
    };
}

function updateViewLayoutButton(): void {
    if (viewLayoutBtn) {
        viewLayoutBtn.textContent = viewLayout === "1x1" ? "View: 1×1" : "View: 3×3";
    }
}

canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = Math.round(e.clientX - rect.left);
    const py = Math.round(e.clientY - rect.top);
    const { x, y } = canvasToModel(px, py);
    addPoint(Math.round(x), Math.round(y));
    refreshGeometry();
    updateUI();
    draw();
});

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = Math.round(e.clientX - rect.left);
    const py = Math.round(e.clientY - rect.top);
    const { x, y } = canvasToModel(px, py);

    const idx = findSiteIndexByRegion(x, y);
    if (idx >= 0) {
        removePoint(idx);
        refreshGeometry();
        updateUI();
        draw();
    }
});

function buildHoverText(px: number, py: number): string {
    const { x, y } = canvasToModel(px, py);
    const n = voronoiNumSites();
    if (n === 0) {
        return `pos: (${x.toFixed(1)}, ${y.toFixed(1)})\n\nno sites`;
    }

    const entries: { idx: number; sx: number; sy: number; d: number }[] = [];
    let bestD = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < n; i++) {
        const s = voronoiGetSite(i);
        let d: number;
        if (voronoiMetric === "linf") {
            const cx = Math.floor(x);
            const cy = Math.floor(y);
            const pcx = cx * 2 + 1;
            const pcy = cy * 2 + 1;
            const ssx = s.x * 2 + 1;
            const ssy = s.y * 2 + 1;
            if (voronoiTopology === "torus") {
                d = torusChebDist(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else if (voronoiTopology === "cylinder") {
                const dx = Math.abs(torusComponentDelta(x, s.x, CANVAS_WIDTH));
                d = Math.max(dx, Math.abs(y - s.y));
            } else {
                d = Math.max(Math.abs(pcx - ssx), Math.abs(pcy - ssy)) / 2;
            }
        } else if (voronoiMetric === "l1") {
            if (voronoiTopology === "torus") {
                d = torusManhattanDist(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else if (voronoiTopology === "cylinder") {
                d =
                    Math.abs(torusComponentDelta(x, s.x, CANVAS_WIDTH)) + Math.abs(y - s.y);
            } else {
                d = Math.abs(x - s.x) + Math.abs(y - s.y);
            }
        } else if (voronoiTopology === "torus") {
            d = Math.sqrt(torusDistSq(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT));
        } else if (voronoiTopology === "cylinder") {
            d = Math.sqrt(cylinderDistSq(x, y, s.x, s.y, CANVAS_WIDTH));
        } else {
            d = Math.sqrt(euclideanDistSq(x, y, s.x, s.y));
        }
        if (d < bestD) bestD = d;
        entries.push({ idx: i, sx: s.x, sy: s.y, d });
    }

    let text = `pos: (${x.toFixed(0)}, ${y.toFixed(0)})\n\n`;
    for (const e of entries) {
        const tied = Math.abs(e.d - bestD) < 1e-9;
        const marker = tied ? " ← closest" : "";
        const dDisplay = e.d.toFixed(2);
        text += `site ${e.idx} (${e.sx},${e.sy}): d=${dDisplay}${marker}\n`;
    }
    if (entries.filter(e => Math.abs(e.d - bestD) < 1e-9).length > 1) {
        if (
            (voronoiMetric === "linf" || voronoiMetric === "l1") &&
            chebyshevTieBreak
        ) {
            const firstTie = entries.filter(e => Math.abs(e.d - bestD) < 1e-9)[0]!;
            text += `\n(tie → site ${firstTie.idx})`;
        } else if (voronoiMetric === "linf" || voronoiMetric === "l1") {
            text += "\n(tie → white)";
        }
    }
    return text;
}

// DEBUG: hover info showing cursor position and distance to all sites (mode-aware)
const hoverInfo = document.getElementById("hover-info");
canvas.addEventListener("mousemove", (e) => {
    if (!hoverInfo) {
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const px = Math.round(e.clientX - rect.left);
    const py = Math.round(e.clientY - rect.top);
    hoverInfo.textContent = buildHoverText(px, py);
});

canvas.addEventListener("mouseleave", () => {
    if (hoverInfo) {
        hoverInfo.textContent = "";
    }
});

// Middle-click: dump current hover info to console
canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 1) return;  // middle button only
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = Math.round(e.clientX - rect.left);
    const py = Math.round(e.clientY - rect.top);
    console.log(buildHoverText(px, py));
});

if (randomBtn) {
    randomBtn.addEventListener("click", () => {
        // Uniform in [10, 19]; label in article/voronoi.html should match.
        const count = Math.floor(Math.random() * 10) + 10;
        generateRandomPoints(count);
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        clearAllPoints();
    });
}

if (debugModeCheckbox) {
    applyDebugModeUi(debugModeCheckbox.checked);
    debugModeCheckbox.addEventListener("change", () => {
        applyDebugModeUi(debugModeCheckbox.checked);
    });
}

if (debugAddSiteBtn) {
    debugAddSiteBtn.addEventListener("click", () => {
        addSiteFromCoordInputs();
    });
}

for (const input of [debugCoordXInput, debugCoordYInput]) {
    input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addSiteFromCoordInputs();
        }
    });
}

for (const radio of edgeDisplayRadios) {
    radio.addEventListener("change", () => {
        if (!radio.checked) {
            return;
        }
        const v = radio.value;
        if (v === "none" || v === "outline" || v === "pieces") {
            applyEdgeDisplay(v);
            logEdgeDataSummary(modeLabel());
            draw();
        }
    });
}

function readMetricFromRadios(): VoronoiMetric {
    for (const radio of metricRadios) {
        if (radio.checked) {
            return radio.value as VoronoiMetric;
        }
    }
    return "l2";
}

function readTopologyFromRadios(): VoronoiTopology {
    for (const radio of topologyRadios) {
        if (radio.checked) {
            return radio.value as VoronoiTopology;
        }
    }
    return "plane";
}

function setMetricRadio(metric: VoronoiMetric): void {
    for (const radio of metricRadios) {
        radio.checked = radio.value === metric;
    }
}

function setTopologyRadio(topology: VoronoiTopology): void {
    for (const radio of topologyRadios) {
        radio.checked = radio.value === topology;
    }
}

function refreshControlAvailability(): void {
    for (const radio of metricRadios) {
        const m = radio.value as VoronoiMetric;
        radio.disabled = !isPairSupported(m, voronoiTopology);
    }
    for (const radio of topologyRadios) {
        const t = radio.value as VoronoiTopology;
        radio.disabled = !isPairSupported(voronoiMetric, t);
    }
    if (chebyshevTieCheckbox) {
        const tieMetric =
            voronoiMetric === "linf" || voronoiMetric === "l1";
        chebyshevTieCheckbox.disabled =
            !tieMetric || !isPairSupported(voronoiMetric, voronoiTopology);
    }
    if (modeStatusElem) {
        modeStatusElem.textContent = modeLabel();
    }
}

function applyModeFromControls(): void {
    let metric = readMetricFromRadios();
    let topology = readTopologyFromRadios();
    if (!isPairSupported(metric, topology)) {
        metric = "l2";
        setMetricRadio("l2");
    }
    voronoiMetric = metric;
    voronoiTopology = topology;
    chebyshevTieBreak = chebyshevTieCheckbox?.checked ?? false;
    refreshControlAvailability();
}

function onModeControlChange(): void {
    applyModeFromControls();
    recomputeAndDraw();
}

for (const radio of metricRadios) {
    radio.addEventListener("change", () => {
        if (radio.checked) {
            onModeControlChange();
        }
    });
}

for (const radio of topologyRadios) {
    radio.addEventListener("change", () => {
        if (radio.checked) {
            onModeControlChange();
        }
    });
}

if (chebyshevTieCheckbox) {
    chebyshevTieCheckbox.addEventListener("change", () => {
        onModeControlChange();
    });
}

refreshControlAvailability();

if (viewLayoutBtn) {
    viewLayoutBtn.addEventListener("click", () => {
        viewLayout = viewLayout === "1x1" ? "3x3" : "1x1";
        updateViewLayoutButton();
        draw();
    });
}
updateViewLayoutButton();

export function restart(): void {
    generateRandomPoints(4);
}

/** @deprecated Use edge display select in the page UI. */
export function toggleBoundaries(): void {
    applyEdgeDisplay(edgeDisplay === "none" ? "outline" : "none");
    draw();
}

/** @deprecated Use edge display select in the page UI. */
export function toggleInternalBoundaries(): void {
    applyEdgeDisplay(edgeDisplay === "pieces" ? "outline" : "pieces");
    logEdgeDataSummary(modeLabel());
    draw();
}

export function clearPoints(): void {
    clearAllPoints();
}

function disposeVoronoi(): void {
    voronoiDestroy();
}

function onPageHide(ev: PageTransitionEvent): void {
    // Skip when entering bfcache; the page (and WASM handle) may be restored.
    if (!ev.persisted) {
        disposeVoronoi();
    }
}

async function init(): Promise<void> {
    await modulePromise;
    voronoiCreate(CANVAS_WIDTH, CANVAS_HEIGHT);
    window.addEventListener("pagehide", onPageHide);
    applyModeFromControls();
    generateRandomPoints(4);
}

init().catch(console.error);
