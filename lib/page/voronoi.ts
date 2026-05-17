import {
    voronoiCreate,
    voronoiDestroy,
    voronoiAddPoint,
    voronoiRemovePoint,
    voronoiClear,
    voronoiCompute,
    voronoiSetDistanceMode,
    voronoiNumSites,
    voronoiGetSite,
    voronoiGetCellBoundaries,
    voronoiGetCellBoundariesExact,
    exactRationalToNumber,
    modulePromise,
    VoronoiCellBoundary,
    VoronoiCellBoundaryExact,
    type VoronoiBoundaryPointExact,
} from "../tsl/wasm/ts/wasm_api_voronoi";

type DistanceMode = "euclidean" | "torus" | "cylinder" | "mobius" | "klein" | "chebyshev" | "chebyshev-tie" | "raw";
type RgbColor = { r: number; g: number; b: number };

// Canvas setup
const canvas = document.getElementById("voronoi-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// UI elements
const pointCountElem = document.getElementById("point-count");
const randomBtn = document.getElementById("random-btn");
const clearBtn = document.getElementById("clear-btn");
const toggleBoundariesBtn = document.getElementById("toggle-boundaries-btn");
const distanceRawBtn = document.getElementById("distance-raw-btn");
const distanceEuclidBtn = document.getElementById("distance-euclidean-btn");
const distanceTorusBtn = document.getElementById("distance-torus-btn");
const distanceCylinderBtn = document.getElementById("distance-cylinder-btn");
const distanceMobiusBtn = document.getElementById("distance-mobius-btn");
const distanceKleinBtn = document.getElementById("distance-klein-btn");
const distanceChebyshevBtn = document.getElementById("distance-chebyshev-btn");
const distanceChebyshevTieBtn = document.getElementById("distance-chebyshev-tie-btn");
const viewLayoutBtn = document.getElementById("view-layout-btn");

// State
let drawBoundaries = true;
// DEBUG: start in Chebyshev mode for local testing
let distanceMode: DistanceMode = "chebyshev";
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

type CachedGeometry = {
    boundaries: VoronoiCellBoundary[];
    exactBoundaries: VoronoiCellBoundaryExact[];
    siteColors: Map<number, number>;
};

// Per-mode cache: kept across mode switches when sites haven't changed, so
// flipping back-and-forth between Euclidean and Torus doesn't trigger a
// recompute. Any seed-set mutation (add/remove/clear) invalidates BOTH
// entries — only the active mode is recomputed at that point.
const geometryByMode: Partial<Record<DistanceMode, CachedGeometry>> = {};

function emptyGeometry(): CachedGeometry {
    return { boundaries: [], exactBoundaries: [], siteColors: new Map<number, number>() };
}

function invalidateGeometryCache(): void {
    delete geometryByMode.euclidean;
    delete geometryByMode.torus;
    delete geometryByMode.cylinder;
    delete geometryByMode.mobius;
    delete geometryByMode.klein;
    delete geometryByMode.chebyshev;
    delete geometryByMode["chebyshev-tie"];
    delete geometryByMode.raw;
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
    invalidateGeometryCache();
}

function rgbToCss(color: RgbColor): string {
    return `rgb(${color.r} ${color.g} ${color.b})`;
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
    mode: DistanceMode,
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
    for (let i = 0; i < n; i++) {
        const { x, y } = voronoiGetSite(i);
        const sid = siteIds[i];
        const cidx = sid !== undefined ? (colorsByStableId.get(sid) ?? 0) : 0;
        const cellBoundary = boundaries.find((c) => c.site === i);
        const polys = (cellBoundary?.polygons ?? []).map((loop) => loop.map((p) => p));
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
    }
    console.table(rows);
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

/** Exact-rational vertex key used by adjacency building (shared-edge detection). */
function exactVertexKey(p: VoronoiBoundaryPointExact): string {
    return `${p.x.num}:${p.x.den}:${p.y.num}:${p.y.den}`;
}

function normalizeExactLoop(loop: VoronoiBoundaryPointExact[]): VoronoiBoundaryPointExact[] {
    if (loop.length === 0) {
        return [];
    }
    const deduped: VoronoiBoundaryPointExact[] = [];
    for (const v of loop) {
        const last = deduped[deduped.length - 1];
        if (!last || exactVertexKey(last) !== exactVertexKey(v)) {
            deduped.push(v);
        }
    }
    if (deduped.length > 1 && exactVertexKey(deduped[0]!) === exactVertexKey(deduped[deduped.length - 1]!)) {
        deduped.pop();
    }
    return deduped;
}

function addPoint(x: number, y: number): void {
    voronoiAddPoint(x, y);
    siteIds.push(nextSiteId++);
    invalidateGeometryCache();
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
 * testing. Chebyshev uses strict pixel-center dominance (ties return -1).
 * Chebyshev-tie assigns ties to smallest-index closest site.
 */
function findSiteIndexByRegion(
    x: number,
    y: number,
    metric: DistanceMode = distanceMode,
): number {
    const n = voronoiNumSites();
    if (n <= 0) {
        return -1;
    }
    if (metric === "chebyshev" || metric === "raw") {
        return strictChebyshevUniqueSiteIndex(x, y);
    }
    if (metric === "chebyshev-tie") {
        const gx = Math.floor(x);
        const gy = Math.floor(y);
        const sites = Array.from({ length: n }, (_, i) => voronoiGetSite(i));
        return strictChebyshevFirstTieOwner(gx, gy, sites);
    }
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
        const s = voronoiGetSite(i);
        const d = metric === "torus"
            ? torusDistSq(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT)
            : euclideanDistSq(x, y, s.x, s.y);
        if (d < bestD || (d === bestD && i < bestIdx)) {
            bestD = d;
            bestIdx = i;
        }
    }
    return bestIdx;
}

function undirectedExactEdgeKey(a: VoronoiBoundaryPointExact, b: VoronoiBoundaryPointExact): string {
    const ka = exactVertexKey(a);
    const kb = exactVertexKey(b);
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/**
 * Adjacency for graph coloring: two sites are neighbors if they share a cell
 * edge. Uses exact rational endpoints so torus pieces agree with neighbors
 * (float rounding was dropping links or pairing wrong edges).
 *
 * For Chebyshev, cells are unions of multiple convex pieces whose edge
 * decompositions may not align — use pixel-center sampling instead.
 */
function buildAdjacencyFromCellsExact(
    cells: VoronoiCellBoundaryExact[],
    mode: DistanceMode = distanceMode,
): Map<number, Set<number>> {
    if (mode === "chebyshev" || mode === "chebyshev-tie" || mode === "raw") {
        return buildChebyshevAdjacency(mode);
    }

    const adjacency = new Map<number, Set<number>>();
    const edgeOwner = new Map<string, number>();

    const link = (siteA: number, siteB: number): void => {
        if (siteA === siteB) {
            return;
        }
        const idA = siteIds[siteA];
        const idB = siteIds[siteB];

        let neighborsA = adjacency.get(idA);
        if (!neighborsA) {
            neighborsA = new Set<number>();
            adjacency.set(idA, neighborsA);
        }
        let neighborsB = adjacency.get(idB);
        if (!neighborsB) {
            neighborsB = new Set<number>();
            adjacency.set(idB, neighborsB);
        }

        neighborsA.add(idB);
        neighborsB.add(idA);
    };

    for (const cell of cells) {
        for (const loop of cell.polygons) {
            const vertices = normalizeExactLoop(loop);
            if (vertices.length < 2) {
                continue;
            }
            const m = vertices.length;
            for (let i = 0; i < m; i++) {
                const p1 = vertices[i]!;
                const p2 = vertices[(i + 1) % m]!;
                if (exactVertexKey(p1) === exactVertexKey(p2)) {
                    continue;
                }
                const key = undirectedExactEdgeKey(p1, p2);
                const owner = edgeOwner.get(key);
                if (owner === undefined) {
                    edgeOwner.set(key, cell.site);
                } else {
                    link(owner, cell.site);
                }
            }
        }
    }

    return adjacency;
}

/**
 * Chebyshev-mode adjacency: sample pixel centers on a grid, detect
 * neighboring pixels that belong to different sites (strict, no ties).
 * Grid step of 8 gives 100×75 ≈ 7500 samples for 800×600 — fast enough.
 */
function buildChebyshevAdjacency(mode: DistanceMode): Map<number, Set<number>> {
    const n = voronoiNumSites();
    if (n <= 1) {
        return new Map();
    }

    const sites = Array.from({ length: n }, (_, i) => voronoiGetSite(i));
    const gridStep = 8;
    const cols = Math.ceil(CANVAS_WIDTH / gridStep);
    const rows = Math.ceil(CANVAS_HEIGHT / gridStep);
    const ownerFn = mode === "chebyshev-tie"
        ? strictChebyshevFirstTieOwner
        : strictChebyshevPixelCenterOwner;

    // Compute ownership for each grid cell center
    const ownership: number[][] = [];
    for (let gy = 0; gy < rows; gy++) {
        const row: number[] = [];
        const iy = gy * gridStep;
        for (let gx = 0; gx < cols; gx++) {
            const ix = gx * gridStep;
            row.push(ownerFn(ix, iy, sites));
        }
        ownership.push(row);
    }

    // Detect adjacency from grid neighbors (4-connected)
    const adjacency = new Map<number, Set<number>>();
    const link = (a: number, b: number): void => {
        if (a === b || a < 0 || b < 0) {
            return;
        }
        const idA = siteIds[a];
        const idB = siteIds[b];
        if (idA === undefined || idB === undefined) {
            return;
        }

        let neighborsA = adjacency.get(idA);
        if (!neighborsA) {
            neighborsA = new Set<number>();
            adjacency.set(idA, neighborsA);
        }
        let neighborsB = adjacency.get(idB);
        if (!neighborsB) {
            neighborsB = new Set<number>();
            adjacency.set(idB, neighborsB);
        }

        neighborsA.add(idB);
        neighborsB.add(idA);
    };

    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            const owner = ownership[gy]![gx]!;
            if (owner < 0) {
                continue;
            }
            // Right neighbor
            if (gx + 1 < cols) {
                link(owner, ownership[gy]![gx + 1]!);
            }
            // Down neighbor
            if (gy + 1 < rows) {
                link(owner, ownership[gy + 1]![gx]!);
            }
            // Down-right diagonal (catch checkerboard corner touches)
            if (gx + 1 < cols && gy + 1 < rows) {
                const diag = ownership[gy + 1]![gx + 1]!;
                if (diag >= 0 && diag !== owner) {
                    const right = ownership[gy]![gx + 1]!;
                    const down = ownership[gy + 1]![gx]!;
                    if (right !== owner || down !== owner) {
                        link(owner, diag);
                    }
                }
            }
        }
    }

    return adjacency;
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

function buildGeometryForMode(mode: DistanceMode, previousColors: Map<number, number>): CachedGeometry {
    // Map frontend modes to WASM distance modes:
    //   "chebyshev-tie" → "chebyshev"
    //   "raw"          → "chebyshev-raw"
    const wasmModeLookup: Record<DistanceMode, string> = {
        euclidean: "euclidean",
        torus: "torus",
        cylinder: "cylinder",
        mobius: "mobius",
        klein: "klein",
        chebyshev: "chebyshev",
        "chebyshev-tie": "chebyshev",
        raw: "chebyshev-raw",
    };
    const wasmMode = wasmModeLookup[mode] ?? "euclidean";
    voronoiSetDistanceMode(wasmMode as "euclidean" | "torus" | "cylinder" | "mobius" | "klein" | "chebyshev" | "chebyshev-raw");
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
            `voronoi: ${mode} compute=${(tCompute1 - tCompute0).toFixed(1)} ms fetch=${(tFetch1 - tCompute1).toFixed(1)} ms`,
        );
    }
    const boundaries: VoronoiCellBoundary[] = exactBoundaries.map((cell) => ({
        site: cell.site,
        polygons: cell.polygons.map((polygon) =>
            polygon.map((p) => ({
                x: exactRationalToNumber(p.x),
                y: exactRationalToNumber(p.y),
            })),
        ),
    }));
    const adjacency = buildAdjacencyFromCellsExact(exactBoundaries, mode);

    const savedColors = siteColors;
    siteColors = new Map(previousColors);
    recolorSites(adjacency);
    const recolored = new Map(siteColors);
    siteColors = savedColors;

    logVoronoiGeometryDebug(mode, boundaries, exactBoundaries, recolored);
    return { boundaries, exactBoundaries, siteColors: recolored };
}

function syncActiveGeometry(): void {
    const active = geometryByMode[distanceMode] ?? emptyGeometry();
    latestBoundaries = active.boundaries;
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
    if (geometryByMode[distanceMode]) {
        syncActiveGeometry();
        return;
    }

    const previousColors = new Map(
        (geometryByMode[distanceMode] ??
            geometryByMode.euclidean ??
            geometryByMode.torus ??
            geometryByMode.cylinder ??
            emptyGeometry()).siteColors,
    );
    const t0 =
        typeof performance !== "undefined" && typeof performance.now === "function"
            ? performance.now()
            : 0;
    geometryByMode[distanceMode] = buildGeometryForMode(distanceMode, previousColors);
    if (t0 !== 0) {
        const elapsed = performance.now() - t0;
        console.debug(
            `voronoi: ${distanceMode} compute+fetch took ${elapsed.toFixed(1)} ms (sites=${voronoiNumSites()})`,
        );
    }
    syncActiveGeometry();
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

/**
 * Draw one copy of the diagram in fundamental-domain coordinates
 * (0…W × 0…H). Caller sets `ctx` transform; `modelLineWidth` / `modelSeedR`
 * compensate when the tile is scaled down (3×3 view).
 */
function drawOneTile(modelLineWidth: number, modelSeedR: number): void {
    // Pass 1: fill every cell (nonzero = geometric union of overlapping loops).
    if (latestBoundaries.length > 0) {
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

    ctx.lineWidth = modelLineWidth;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
    // C++ already returns merged polygons (merge_polygons_drop_contained) for
    // all modes except raw. Raw mode keeps individual convex pieces.
    if (drawBoundaries && latestBoundaries.length > 0) {
        for (const cell of latestBoundaries) {
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
                
                switch (distanceMode) {
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
    
    switch (distanceMode) {
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

    const isChebLike = distanceMode === "chebyshev" || distanceMode === "chebyshev-tie" || distanceMode === "raw";

    const entries: { idx: number; sx: number; sy: number; d: number }[] = [];
    let bestD = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < n; i++) {
        const s = voronoiGetSite(i);
        let d: number;
        if (isChebLike) {
            // Chebyshev: pixel-center distance (half-integer grid)
            const cx = Math.floor(x);
            const cy = Math.floor(y);
            const pcx = cx * 2 + 1;
            const pcy = cy * 2 + 1;
            const ssx = s.x * 2 + 1;
            const ssy = s.y * 2 + 1;
            d = Math.max(Math.abs(pcx - ssx), Math.abs(pcy - ssy)) / 2;
        } else if (distanceMode === "torus") {
            d = Math.sqrt(torusDistSq(x, y, s.x, s.y, CANVAS_WIDTH, CANVAS_HEIGHT));
        } else {
            // euclidean, cylinder, mobius, klein — locally Euclidean in fundamental domain
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
        if (distanceMode === "chebyshev-tie") {
            const firstTie = entries.filter(e => Math.abs(e.d - bestD) < 1e-9)[0]!;
            text += `\n(tie → site ${firstTie.idx})`;
        } else if (isChebLike) {
            text += "\n(tie)";
        }
        // Euclidean metrics: ties are naturally possible, don't annotate
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

if (toggleBoundariesBtn) {
    toggleBoundariesBtn.style.display = "none";
}

function updateDistanceModeButtons(): void {
    switch (distanceMode) {
        case "euclidean":
            if (distanceEuclidBtn) {
                (distanceEuclidBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceEuclidBtn) {
                (distanceEuclidBtn as HTMLButtonElement).disabled = false;
            }
    }
    
    switch (distanceMode) {
        case "torus":
            if (distanceTorusBtn) {
                (distanceTorusBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceTorusBtn) {
                (distanceTorusBtn as HTMLButtonElement).disabled = false;
            }
    }
    
    switch (distanceMode) {
        case "cylinder":
            if (distanceCylinderBtn) {
                (distanceCylinderBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceCylinderBtn) {
                (distanceCylinderBtn as HTMLButtonElement).disabled = false;
            }
    }
    
    switch (distanceMode) {
        case "mobius":
            if (distanceMobiusBtn) {
                (distanceMobiusBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceMobiusBtn) {
                (distanceMobiusBtn as HTMLButtonElement).disabled = false;
            }
    }
    
    switch (distanceMode) {
        case "klein":
            if (distanceKleinBtn) {
                (distanceKleinBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceKleinBtn) {
                (distanceKleinBtn as HTMLButtonElement).disabled = false;
            }
    }

    switch (distanceMode) {
        case "chebyshev":
            if (distanceChebyshevBtn) {
                (distanceChebyshevBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceChebyshevBtn) {
                (distanceChebyshevBtn as HTMLButtonElement).disabled = false;
            }
    }

    switch (distanceMode) {
        case "chebyshev-tie":
            if (distanceChebyshevTieBtn) {
                (distanceChebyshevTieBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceChebyshevTieBtn) {
                (distanceChebyshevTieBtn as HTMLButtonElement).disabled = false;
            }
    }

    switch (distanceMode) {
        case "raw":
            if (distanceRawBtn) {
                (distanceRawBtn as HTMLButtonElement).disabled = true;
            }
            break;
        default:
            if (distanceRawBtn) {
                (distanceRawBtn as HTMLButtonElement).disabled = false;
            }
    }
}

if (distanceEuclidBtn) {
    distanceEuclidBtn.addEventListener("click", () => {
        distanceMode = "euclidean";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

if (distanceTorusBtn) {
    distanceTorusBtn.addEventListener("click", () => {
        distanceMode = "torus";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

if (distanceCylinderBtn) {
    distanceCylinderBtn.addEventListener("click", () => {
        distanceMode = "cylinder";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

if (distanceMobiusBtn) {
    distanceMobiusBtn.addEventListener("click", () => {
        distanceMode = "mobius";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

if (distanceKleinBtn) {
    distanceKleinBtn.addEventListener("click", () => {
        distanceMode = "klein";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

if (distanceChebyshevBtn) {
    distanceChebyshevBtn.addEventListener("click", () => {
        distanceMode = "chebyshev";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

if (distanceChebyshevTieBtn) {
    distanceChebyshevTieBtn.addEventListener("click", () => {
        distanceMode = "chebyshev-tie";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

if (distanceRawBtn) {
    distanceRawBtn.addEventListener("click", () => {
        distanceMode = "raw";
        updateDistanceModeButtons();
        recomputeAndDraw();
    });
}

updateDistanceModeButtons();

if (viewLayoutBtn) {
    viewLayoutBtn.addEventListener("click", () => {
        viewLayout = viewLayout === "1x1" ? "3x3" : "1x1";
        updateViewLayoutButton();
        draw();
    });
}
updateViewLayoutButton();

export function restart(): void {
    // DEBUG: start with 4 points for local Chebyshev testing
    generateRandomPoints(4);
}

export function toggleBoundaries(): void {
    drawBoundaries = !drawBoundaries;
    draw();
}

export function clearPoints(): void {
    clearAllPoints();
}

async function init(): Promise<void> {
    await modulePromise;
    voronoiCreate(CANVAS_WIDTH, CANVAS_HEIGHT);
    // DEBUG: start with 4 points for local Chebyshev testing
    generateRandomPoints(4);
}

init().catch(console.error);
