/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope & typeof globalThis;

let moduleInstance: any = null;
let modulePromise: Promise<any> | null = null;

async function ensureGraphModule(): Promise<any> {
    if (!modulePromise) {
        modulePromise = (async () => {
            const graphApi = await import("../tsl/wasm/ts/wasm_api_graph_demo");
            const mod = await graphApi.modulePromise;
            moduleInstance = mod;
            return mod;
        })();
    }
    return modulePromise;
}

function copyToHeap(HEAP32: Int32Array, data: Int32Array, offsetInInts: number) {
    for (let i = 0; i < data.length; i++) HEAP32[offsetInInts + i] = data[i];
}

self.onmessage = async (ev: MessageEvent) => {
    const msg = ev.data as any;
    if (msg && msg.cmd === 'start') {
        await ensureGraphModule();
        try {
            const m = moduleInstance;
            // Detect WASM memory size: HEAP32.length * 4 = total bytes
            const wasmMemoryBytes = m.HEAP32.length * 4;
            self.postMessage({ stage: 'init', progress: 5, wasmMemoryBytes });
            const cacheHandle = m._wasm_graph_resolving_subsets_cache_create();
            if (cacheHandle === 0) throw new Error('cache create failed');

            const adj01 = new Int32Array(msg.adj01);
            const needed = msg.n * msg.n;
            const bytes = needed * 4;
            const adjPtr = m._malloc(bytes);
            const distPtr = m._malloc(bytes);
            let distFlatOut: number[] = [];
            try {
                copyToHeap(m.HEAP32, adj01, adjPtr / 4);
                m._wasm_graph_all_pairs_bfs_distances(msg.n, 0, adjPtr, distPtr);
                const distBase = distPtr / 4;
                distFlatOut = new Array(needed);
                for (let i = 0; i < needed; i++) {
                    distFlatOut[i] = m.HEAP32[distBase + i];
                }
                const ok = m._wasm_graph_resolving_subsets_cache_set_graph(cacheHandle, msg.n, adjPtr, distPtr);
                if (ok === 0) throw new Error('setGraph wasm call failed');
            } finally {
                m._free(adjPtr);
                m._free(distPtr);
            }
            self.postMessage({ stage: 'graph_set', progress: 25 });

            const modeCount = 3;
            const pageListFlatMaxIntsPerMode = Math.max(1, msg.pageSize * (msg.n + 1));
            const minListFlatMaxIntsPerMode = Math.max(1, msg.n * msg.n * (msg.n + 1));

            const bytesPageIndex3 = modeCount * 4;
            const bytesMinDim3 = modeCount * 4;
            const bytesSmallest3 = modeCount * msg.n * 4;
            const bytesTotalCount3 = modeCount * 4;
            const bytesPageCount3 = modeCount * 4;
            const bytesPageListCount3 = modeCount * 4;
            const bytesPageUsed3 = modeCount * 4;
            const bytesPageTrunc3 = modeCount * 4;
            const bytesPageFlat3 = modeCount * pageListFlatMaxIntsPerMode * 4;
            const bytesMinListCount3 = modeCount * 4;
            const bytesMinUsed3 = modeCount * 4;
            const bytesMinTrunc3 = modeCount * 4;
            const bytesMinFlat3 = modeCount * minListFlatMaxIntsPerMode * 4;

            const pageIndex3Ptr = m._malloc(bytesPageIndex3);
            const minDim3Ptr = m._malloc(bytesMinDim3);
            const smallest3Ptr = m._malloc(bytesSmallest3);
            const totalCount3Ptr = m._malloc(bytesTotalCount3);
            const pageCount3Ptr = m._malloc(bytesPageCount3);
            const pageListCount3Ptr = m._malloc(bytesPageListCount3);
            const pageUsed3Ptr = m._malloc(bytesPageUsed3);
            const pageTrunc3Ptr = m._malloc(bytesPageTrunc3);
            const pageFlat3Ptr = m._malloc(bytesPageFlat3);
            const minListCount3Ptr = m._malloc(bytesMinListCount3);
            const minUsed3Ptr = m._malloc(bytesMinUsed3);
            const minTrunc3Ptr = m._malloc(bytesMinTrunc3);
            const minFlat3Ptr = m._malloc(bytesMinFlat3);

            if (!pageIndex3Ptr || !minDim3Ptr || !smallest3Ptr || !totalCount3Ptr || !pageCount3Ptr || !pageListCount3Ptr || !pageUsed3Ptr || !pageTrunc3Ptr || !pageFlat3Ptr || !minListCount3Ptr || !minUsed3Ptr || !minTrunc3Ptr || !minFlat3Ptr) {
                self.postMessage({ error: 'malloc failed in worker' });
                return;
            }

            try {
                const base = pageIndex3Ptr / 4;
                m.HEAP32[base] = Math.max(0, msg.resolvePageIndices[0] | 0);
                m.HEAP32[base + 1] = Math.max(0, msg.resolvePageIndices[1] | 0);
                m.HEAP32[base + 2] = Math.max(0, msg.resolvePageIndices[2] | 0);

                const ok1 = m._wasm_graph_resolving_subsets_cache_get_page(
                    cacheHandle,
                    msg.pageSize,
                    pageIndex3Ptr,
                    minDim3Ptr,
                    smallest3Ptr,
                    msg.n,
                    totalCount3Ptr,
                    pageCount3Ptr,
                    pageListCount3Ptr,
                    pageUsed3Ptr,
                    pageFlat3Ptr,
                    pageListFlatMaxIntsPerMode,
                    pageTrunc3Ptr,
                    minListCount3Ptr,
                    minUsed3Ptr,
                    minFlat3Ptr,
                    minListFlatMaxIntsPerMode,
                    minTrunc3Ptr
                );
                if (ok1 === 0) throw new Error('getPage wasm call failed');
                self.postMessage({ stage: 'resolved_page', progress: 70 });

                const parseMode = (modeIdx: number) => {
                    const minDim = m.HEAP32[minDim3Ptr / 4 + modeIdx];
                    const smallestBasis: number[] = [];
                    const smallestBase = smallest3Ptr / 4 + modeIdx * msg.n;
                    for (let i = 0; i < minDim; i++) smallestBasis.push(m.HEAP32[smallestBase + i]);
                    const totalCount = m.HEAP32[totalCount3Ptr / 4 + modeIdx];
                    const pageCount = m.HEAP32[pageCount3Ptr / 4 + modeIdx];
                    const usedInts = m.HEAP32[pageUsed3Ptr / 4 + modeIdx];
                    const truncated = m.HEAP32[pageTrunc3Ptr / 4 + modeIdx] !== 0;
                    const subsets: number[][] = [];
                    const flatBase = pageFlat3Ptr / 4 + modeIdx * pageListFlatMaxIntsPerMode;
                    let idx = 0;
                    while (idx < usedInts) {
                        const k = m.HEAP32[flatBase + idx];
                        idx++;
                        const subset: number[] = [];
                        for (let i = 0; i < k; i++) {
                            subset.push(m.HEAP32[flatBase + idx]);
                            idx++;
                        }
                        subsets.push(subset);
                    }
                    const minUsedInts = m.HEAP32[minUsed3Ptr / 4 + modeIdx];
                    const minSizeSubsets: number[][] = [];
                    const minFlatBase = minFlat3Ptr / 4 + modeIdx * minListFlatMaxIntsPerMode;
                    let midx = 0;
                    while (midx < minUsedInts) {
                        const k = m.HEAP32[minFlatBase + midx];
                        midx++;
                        const subset: number[] = [];
                        for (let i = 0; i < k; i++) {
                            subset.push(m.HEAP32[minFlatBase + midx]);
                            midx++;
                        }
                        minSizeSubsets.push(subset);
                    }
                    return {
                        minDimension: minDim,
                        smallestBasis,
                        totalCount,
                        pageCount,
                        subsets,
                        truncated,
                        minSizeSubsets,
                        minSizeTruncated: m.HEAP32[minTrunc3Ptr / 4 + modeIdx] !== 0
                    };
                };

                const allModesRes = {
                    node: parseMode(0),
                    edge: parseMode(1),
                    mixed: parseMode(2)
                };

                self.postMessage({ stage: 'resolved_parsed', progress: 80, allModesRes });

                m.HEAP32[pageIndex3Ptr / 4] = Math.max(0, msg.nonResolvePageIndices[0] | 0);
                m.HEAP32[pageIndex3Ptr / 4 + 1] = Math.max(0, msg.nonResolvePageIndices[1] | 0);
                m.HEAP32[pageIndex3Ptr / 4 + 2] = Math.max(0, msg.nonResolvePageIndices[2] | 0);

                const ok2 = m._wasm_graph_non_resolving_subsets_cache_get_page(
                    cacheHandle,
                    msg.pageSize,
                    pageIndex3Ptr,
                    totalCount3Ptr,
                    pageCount3Ptr,
                    pageListCount3Ptr,
                    pageUsed3Ptr,
                    pageFlat3Ptr,
                    pageListFlatMaxIntsPerMode,
                    pageTrunc3Ptr
                );
                if (ok2 === 0) throw new Error('getNonResolvingPage wasm call failed');

                const parseNonMode = (modeIdx: number) => {
                    const totalCount = m.HEAP32[totalCount3Ptr / 4 + modeIdx];
                    const pageCount = m.HEAP32[pageCount3Ptr / 4 + modeIdx];
                    const usedInts = m.HEAP32[pageUsed3Ptr / 4 + modeIdx];
                    const truncated = m.HEAP32[pageTrunc3Ptr / 4 + modeIdx] !== 0;
                    const subsets: number[][] = [];
                    const flatBase = pageFlat3Ptr / 4 + modeIdx * pageListFlatMaxIntsPerMode;
                    let idx = 0;
                    while (idx < usedInts) {
                        const k = m.HEAP32[flatBase + idx];
                        idx++;
                        const subset: number[] = [];
                        for (let i = 0; i < k; i++) {
                            subset.push(m.HEAP32[flatBase + idx]);
                            idx++;
                        }
                        subsets.push(subset);
                    }
                    return { totalCount, pageCount, subsets, truncated };
                };

                const allModesNonResolveRes = {
                    node: parseNonMode(0),
                    edge: parseNonMode(1),
                    mixed: parseNonMode(2)
                };

                // Compute PDim using adj01 from msg
                const pdimBytesAdj = msg.n * msg.n * 4;
                const pdimBytesOut = 128 * 3;
                const pdimAdjPtr = m._malloc(pdimBytesAdj);
                const pdimOutPtr = m._malloc(pdimBytesOut);
                const pdimRes: any = { node: "error", edge: "error", mixed: "error" };
                if (pdimAdjPtr !== 0 && pdimOutPtr !== 0) {
                    try {
                        copyToHeap(m.HEAP32, adj01, pdimAdjPtr / 4);
                        const ok = m._wasm_graph_pdim_all_modes(msg.n, pdimAdjPtr, pdimOutPtr, 128);
                        if (ok) {
                            const readStr = (offset: number) => {
                                let result = "";
                                for (let i = 0; i < 128; i++) {
                                    const c = m.HEAP8[pdimOutPtr + offset + i];
                                    if (c === 0) break;
                                    result += String.fromCharCode(c);
                                }
                                return result;
                            };
                            pdimRes.node = readStr(0);
                            pdimRes.edge = readStr(128);
                            pdimRes.mixed = readStr(256);
                        }
                    } finally {
                        if (pdimAdjPtr) m._free(pdimAdjPtr);
                        if (pdimOutPtr) m._free(pdimOutPtr);
                    }
                }

                self.postMessage({ stage: 'done', progress: 100, allModesRes, allModesNonResolveRes, distFlat: distFlatOut, pdimRes });
            } finally {
                m._free(pageIndex3Ptr);
                m._free(minDim3Ptr);
                m._free(smallest3Ptr);
                m._free(totalCount3Ptr);
                m._free(pageCount3Ptr);
                m._free(pageListCount3Ptr);
                m._free(pageUsed3Ptr);
                m._free(pageTrunc3Ptr);
                m._free(pageFlat3Ptr);
                m._free(minListCount3Ptr);
                m._free(minUsed3Ptr);
                m._free(minTrunc3Ptr);
                m._free(minFlat3Ptr);
                m._wasm_graph_resolving_subsets_cache_destroy(cacheHandle);
            }
        } catch (err: any) {
            const errorMsg = err?.message ?? String(err);
            const isOOM = errorMsg.includes('OOM') || errorMsg.includes('out of memory') || errorMsg.includes('Aborted');
            self.postMessage({ 
                error: errorMsg,
                isOOM: isOOM
            });
        }
    } else if (msg && msg.cmd === 'cancel') {
        self.postMessage({ cancelled: true });
    }
};
