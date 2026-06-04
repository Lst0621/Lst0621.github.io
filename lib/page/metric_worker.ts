/// <reference lib="webworker" />

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

function readCString(HEAPU8: Uint8Array, ptr: number, maxBytes: number): string {
    let end = ptr;
    const limit = ptr + maxBytes;
    while (end < limit && HEAPU8[end] !== 0) {
        end++;
    }
    const decoder = new TextDecoder();
    return decoder.decode(HEAPU8.subarray(ptr, end));
}

self.onmessage = async (ev: MessageEvent) => {
    const msg = ev.data as any;
    if (msg && msg.cmd === 'start') {
        await ensureGraphModule();
        try {
            const m = moduleInstance;
            const mode = msg.mode as number;
            if (mode < 0 || mode > 2) throw new Error(`Invalid mode: ${mode}`);

            // Detect WASM memory size: HEAP32.length * 4 = total bytes
            const wasmMemoryBytes = m.HEAP32.length * 4;
            self.postMessage({ stage: 'init', progress: 5, wasmMemoryBytes, mode });

            // create a cache dedicated to this mode and populate only that mode
            const cacheHandle = m._wasm_graph_resolving_subsets_cache_create_mode(mode);
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
                const ok = m._wasm_graph_resolving_subsets_cache_set_graph_mode(cacheHandle, msg.n, adjPtr, distPtr, mode);
                if (ok === 0) throw new Error('setGraphMode wasm call failed');
            } catch (err) {
                m._free(adjPtr);
                m._free(distPtr);
                throw err;
            }
            self.postMessage({ stage: 'graph_set', progress: 25, mode });

            const pageListFlatMaxIntsPerMode = Math.max(1, msg.pageSize * (msg.n + 1));
            const minListFlatMaxIntsPerMode = Math.max(1, msg.n * msg.n * (msg.n + 1));

            const bytesPageIndex = 4;
            const bytesMinDim = 4;
            const bytesSmallest = msg.n * 4;
            const bytesTotalCount = 4;
            const bytesPageCount = 4;
            const bytesPageListCount = 4;
            const bytesPageUsed = 4;
            const bytesPageTrunc = 4;
            const bytesPageFlat = pageListFlatMaxIntsPerMode * 4;
            const bytesMinListCount = 4;
            const bytesMinUsed = 4;
            const bytesMinTrunc = 4;
            const bytesMinFlat = minListFlatMaxIntsPerMode * 4;

            const pageIndexPtr = m._malloc(bytesPageIndex);
            const minDimPtr = m._malloc(bytesMinDim);
            const smallestPtr = m._malloc(bytesSmallest);
            const totalCountPtr = m._malloc(bytesTotalCount);
            const pageCountPtr = m._malloc(bytesPageCount);
            const pageListCountPtr = m._malloc(bytesPageListCount);
            const pageUsedPtr = m._malloc(bytesPageUsed);
            const pageTruncPtr = m._malloc(bytesPageTrunc);
            const pageFlatPtr = m._malloc(bytesPageFlat);
            const minListCountPtr = m._malloc(bytesMinListCount);
            const minUsedPtr = m._malloc(bytesMinUsed);
            const minTruncPtr = m._malloc(bytesMinTrunc);
            const minFlatPtr = m._malloc(bytesMinFlat);

            if (!pageIndexPtr || !minDimPtr || !smallestPtr || !totalCountPtr || !pageCountPtr || !pageListCountPtr || !pageUsedPtr || !pageTruncPtr || !pageFlatPtr || !minListCountPtr || !minUsedPtr || !minTruncPtr || !minFlatPtr) {
                self.postMessage({ error: 'malloc failed in worker', mode });
                return;
            }

            try {
                // set page index for this mode
                m.HEAP32[pageIndexPtr / 4] = Math.max(0, msg.resolvePageIndices[mode] | 0);

                const ok1 = m._wasm_graph_resolving_subsets_cache_get_page_mode(
                    cacheHandle,
                    mode,
                    msg.pageSize,
                    Math.max(0, msg.resolvePageIndices[mode] | 0),
                    minDimPtr,
                    smallestPtr,
                    msg.n,
                    totalCountPtr,
                    pageCountPtr,
                    pageListCountPtr,
                    pageUsedPtr,
                    pageFlatPtr,
                    pageListFlatMaxIntsPerMode,
                    pageTruncPtr,
                    minListCountPtr,
                    minUsedPtr,
                    minFlatPtr,
                    minListFlatMaxIntsPerMode,
                    minTruncPtr
                );
                if (ok1 === 0) throw new Error('getPageMode wasm call failed');
                self.postMessage({ stage: 'resolved_page', progress: 70, mode });

                const parseMode = () => {
                    const minDim = m.HEAP32[minDimPtr / 4];
                    const smallestBasis: number[] = [];
                    const smallestBase = smallestPtr / 4;
                    for (let i = 0; i < minDim; i++) smallestBasis.push(m.HEAP32[smallestBase + i]);
                    const totalCount = m.HEAP32[totalCountPtr / 4];
                    const pageCount = m.HEAP32[pageCountPtr / 4];
                    const usedInts = m.HEAP32[pageUsedPtr / 4];
                    const truncated = m.HEAP32[pageTruncPtr / 4] !== 0;
                    const subsets: number[][] = [];
                    const flatBase = pageFlatPtr / 4;
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
                    const minUsedInts = m.HEAP32[minUsedPtr / 4];
                    const minSizeSubsets: number[][] = [];
                    const minFlatBase = minFlatPtr / 4;
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
                        minSizeTruncated: m.HEAP32[minTruncPtr / 4] !== 0
                    };
                };

                const modeRes = parseMode();
                self.postMessage({ stage: 'resolved_parsed', progress: 80, mode, modeRes });

                // Non-resolving page for this mode
                const ok2 = m._wasm_graph_non_resolving_subsets_cache_get_page_mode(
                    cacheHandle,
                    mode,
                    msg.pageSize,
                    Math.max(0, msg.nonResolvePageIndices[mode] | 0),
                    totalCountPtr,
                    pageCountPtr,
                    pageListCountPtr,
                    pageUsedPtr,
                    pageFlatPtr,
                    pageListFlatMaxIntsPerMode,
                    pageTruncPtr
                );
                if (ok2 === 0) throw new Error('getNonResolvingPageMode wasm call failed');

                const parseNonMode = () => {
                    const totalCount = m.HEAP32[totalCountPtr / 4];
                    const pageCount = m.HEAP32[pageCountPtr / 4];
                    const usedInts = m.HEAP32[pageUsedPtr / 4];
                    const truncated = m.HEAP32[pageTruncPtr / 4] !== 0;
                    const subsets: number[][] = [];
                    const flatBase = pageFlatPtr / 4;
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

                const nonModeRes = parseNonMode();
                self.postMessage({ stage: 'non_resolved_parsed', progress: 95, mode, nonModeRes });

                // Compute pdim for this mode (with and without replacement)
                self.postMessage({ stage: 'computing_pdim', progress: 98, mode });
                const stride = 128;
                const outPtr = m._malloc(stride);
                if (outPtr === 0) throw new Error('malloc failed for pdim output');
                try {
                    const okWr = m._wasm_graph_pdim_mode(
                        msg.n,
                        adjPtr,
                        mode | 0,
                        1,
                        outPtr,
                        stride,
                    );
                    if (!okWr) {
                        throw new Error(
                            `wasm_graph_pdim_mode (with replacement) failed for mode ${mode}`,
                        );
                    }
                    const pdimStrWithReplacement = readCString(m.HEAPU8, outPtr, stride);

                    const okWo = m._wasm_graph_pdim_mode(
                        msg.n,
                        adjPtr,
                        mode | 0,
                        0,
                        outPtr,
                        stride,
                    );
                    if (!okWo) {
                        throw new Error(
                            `wasm_graph_pdim_mode (without replacement) failed for mode ${mode}`,
                        );
                    }
	                    const pdimStrWithoutReplacement = readCString(
	                        m.HEAPU8,
	                        outPtr,
	                        stride,
	                    );

	                    const coeffLen = msg.n + 1;
	                    const coeffPtr = m._malloc(coeffLen * 4);
	                    if (coeffPtr === 0) {
	                        throw new Error('malloc failed for resolving polynomial coefficients');
	                    }
	                    let resolvingPolynomialCoeffs: number[] = [];
	                    try {
	                        const written = m._wasm_graph_resolving_polynomial_coeffs(
	                            msg.n,
	                            adjPtr,
	                            mode | 0,
	                            coeffPtr,
	                            coeffLen,
	                        );
	                        if (written !== coeffLen) {
	                            throw new Error(
	                                `wasm_graph_resolving_polynomial_coeffs failed for mode ${mode}`,
	                            );
	                        }
	                        const coeffBase = coeffPtr / 4;
	                        resolvingPolynomialCoeffs = new Array(coeffLen);
	                        for (let i = 0; i < coeffLen; i++) {
	                            resolvingPolynomialCoeffs[i] = m.HEAP32[coeffBase + i];
	                        }
	                    } finally {
	                        m._free(coeffPtr);
	                    }

	                    self.postMessage({
	                        stage: 'done',
	                        progress: 100,
	                        mode,
                        modeRes,
                        modeNonRes: nonModeRes,
	                        distFlat: distFlatOut,
	                        pdimStrWithReplacement,
	                        pdimStrWithoutReplacement,
	                        resolvingPolynomialCoeffs,
	                    });
	                } finally {
                    m._free(outPtr);
                }
            } finally {
                m._free(pageIndexPtr);
                m._free(minDimPtr);
                m._free(smallestPtr);
                m._free(totalCountPtr);
                m._free(pageCountPtr);
                m._free(pageListCountPtr);
                m._free(pageUsedPtr);
                m._free(pageTruncPtr);
                m._free(pageFlatPtr);
                m._free(minListCountPtr);
                m._free(minUsedPtr);
                m._free(minTruncPtr);
                m._free(minFlatPtr);
                m._free(adjPtr);
                m._free(distPtr);
                m._wasm_graph_resolving_subsets_cache_destroy(cacheHandle);
            }
        } catch (err: any) {
            const errorMsg = err?.message ?? String(err);
            const isOOM = errorMsg.includes('OOM') || errorMsg.includes('out of memory') || errorMsg.includes('Aborted');
            self.postMessage({ 
                error: errorMsg,
                isOOM: isOOM,
                mode: ev.data?.mode
            });
        }
    } else if (msg && msg.cmd === 'cancel') {
        self.postMessage({ cancelled: true });
    }
};
