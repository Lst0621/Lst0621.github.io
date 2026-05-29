export type EdgeList = Array<[number, number]>;

export function isFiniteInt(x: unknown): x is number {
    return typeof x === "number" && Number.isFinite(x) && Number.isInteger(x);
}

export function parseEdgeListJson(raw: string): { edges: EdgeList; base: 0 | 1 } {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return { edges: [], base: 1 };
    }

    let v: unknown;
    try {
        v = JSON.parse(trimmed);
    } catch (e) {
        throw new Error(`Invalid JSON: ${(e as Error).message}`);
    }

    if (!Array.isArray(v)) {
        throw new Error("Expected a JSON array of edges, e.g. [[1,2],[2,3]].");
    }

    const edges: EdgeList = [];
    let sawZero = false;
    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < v.length; i++) {
        const item = (v as unknown[])[i];
        if (!Array.isArray(item) || item.length !== 2) {
            throw new Error(`Edge #${i + 1} must be a 2-element array, like [u,v].`);
        }
        const a = item[0];
        const b = item[1];
        if (!isFiniteInt(a) || !isFiniteInt(b)) {
            throw new Error(`Edge #${i + 1} must contain integers, got ${JSON.stringify(item)}.`);
        }
        if (a === 0 || b === 0) {
            sawZero = true;
        }
        minVal = Math.min(minVal, a, b);
        maxVal = Math.max(maxVal, a, b);
        edges.push([a, b]);
    }

    // Heuristic:
    // - If any 0 appears, treat as 0-based.
    // - Else, if all are >= 1, treat as 1-based (matches UI labels).
    // - Else fall back to 0-based.
    const base: 0 | 1 = sawZero ? 0 : (minVal >= 1 ? 1 : 0);
    if (edges.length > 0 && maxVal < (base === 1 ? 1 : 0)) {
        throw new Error("Edge list contains invalid vertex indices.");
    }

    return { edges, base };
}

export function edgeListFromAdj01Based(
    adj01: readonly number[] | Int32Array,
    n: number,
): EdgeList {
    const needed = n * n;
    if (adj01.length !== needed) {
        throw new Error(`edgeListFromAdj01Based: expected ${needed} entries, got ${adj01.length}`);
    }
    const edges: EdgeList = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (adj01[i * n + j] !== 0 || adj01[j * n + i] !== 0) {
                edges.push([i + 1, j + 1]);
            }
        }
    }
    return edges;
}

export async function writeClipboardText(text: string): Promise<void> {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand && document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) {
        throw new Error("Clipboard API not available.");
    }
}
