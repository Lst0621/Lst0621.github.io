// tsl/wasm_api.ts
import wasmSample from "../tsl/wasm/wasm_out_v1/wasm_sample.js";
var moduleInstance = null;
function isNodeRuntime() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  const proc = g && g.process;
  return typeof proc?.versions?.node === "string";
}
async function loadWasmSampleInNode() {
  const nodeFs = "node:fs";
  const nodeUrl = "node:url";
  const nodePath = "node:path";
  const fs = await import(nodeFs);
  const url = await import(nodeUrl);
  const path = await import(nodePath);
  const nodeLoaderPath = "./wasm/wasm_out_v1/wasm_sample.js";
  const { default: wasmSampleNode } = await import(nodeLoaderPath);
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const wasmPath = path.join(__dirname, "wasm", "wasm_out_v1", "wasm_sample.wasm");
  const wasmBinary = fs.readFileSync(wasmPath);
  return wasmSampleNode({ wasmBinary });
}
async function loadWasmSampleInBrowser() {
  return wasmSample();
}
async function createModulePromise() {
  const mod = isNodeRuntime() ? await loadWasmSampleInNode() : await loadWasmSampleInBrowser();
  moduleInstance = mod;
  return mod;
}
var modulePromise = createModulePromise();
function initWasm() {
  return modulePromise;
}
await initWasm();
function getHeap32() {
  if (!moduleInstance) {
    throw new Error(
      "WASM module not initialized. Call and await initWasm() before using WASM functions."
    );
  }
  const m = moduleInstance;
  const HEAP32 = m.HEAP32;
  if (!HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return HEAP32;
}
function toInt32Array(input) {
  return input instanceof Int32Array ? input : new Int32Array(input);
}
function requireModuleFunctions(...names) {
  if (!moduleInstance) {
    throw new Error("WASM module not initialized.");
  }
  const m = moduleInstance;
  for (const name of names) {
    if (typeof m[name] !== "function") {
      throw new Error(`WASM function not available: ${name}`);
    }
  }
}
function copyToHeap(HEAP32, data, offsetInInts) {
  for (let i = 0; i < data.length; i++) {
    HEAP32[offsetInInts + i] = data[i];
  }
}
function wasmGraphEdgeCount(adj01, n2, directed) {
  requireModuleFunctions("_wasm_graph_edge_count", "_malloc", "_free");
  const m = moduleInstance;
  const HEAP32 = getHeap32();
  const a32 = toInt32Array(adj01);
  const needed = n2 * n2;
  if (a32.length !== needed) {
    throw new Error(`wasmGraphEdgeCount: expected ${needed} entries for ${n2}\xD7${n2} adjacency, got ${a32.length}`);
  }
  const bytes = needed * 4;
  const ptr = m._malloc(bytes);
  if (ptr === 0) {
    throw new Error("wasmGraphEdgeCount: malloc failed");
  }
  try {
    const base = ptr / 4;
    copyToHeap(HEAP32, a32, base);
    return m._wasm_graph_edge_count(n2, directed ? 1 : 0, ptr);
  } finally {
    m._free(ptr);
  }
}
function wasmGraphRandomizeUndirectedAdj01(n2, seed) {
  requireModuleFunctions("_wasm_graph_randomize_undirected_adj01", "_malloc", "_free");
  const m = moduleInstance;
  const HEAP32 = getHeap32();
  const needed = n2 * n2;
  const bytesAdj = needed * 4;
  const bytesEdgeCount = 4;
  const bytesThresholdMilli = 4;
  const adjPtr = m._malloc(bytesAdj);
  const edgeCountPtr = m._malloc(bytesEdgeCount);
  const thresholdMilliPtr = m._malloc(bytesThresholdMilli);
  if (adjPtr === 0 || edgeCountPtr === 0 || thresholdMilliPtr === 0) {
    if (adjPtr) {
      m._free(adjPtr);
    }
    if (edgeCountPtr) {
      m._free(edgeCountPtr);
    }
    if (thresholdMilliPtr) {
      m._free(thresholdMilliPtr);
    }
    throw new Error("wasmGraphRandomizeUndirectedAdj01: malloc failed");
  }
  try {
    m._wasm_graph_randomize_undirected_adj01(
      n2,
      seed >>> 0,
      adjPtr,
      edgeCountPtr,
      thresholdMilliPtr
    );
    const out = [];
    const base = adjPtr / 4;
    for (let i = 0; i < needed; i++) {
      out.push(HEAP32[base + i]);
    }
    const edgeCount = HEAP32[edgeCountPtr / 4];
    const thresholdMilli = HEAP32[thresholdMilliPtr / 4];
    return { adj01: out, edgeCount, threshold: thresholdMilli / 1e3 };
  } finally {
    m._free(adjPtr);
    m._free(edgeCountPtr);
    m._free(thresholdMilliPtr);
  }
}
function wasmGraphAllPairsDistances(adj01, n2, directed) {
  requireModuleFunctions("_wasm_graph_all_pairs_bfs_distances", "_malloc", "_free");
  const m = moduleInstance;
  const HEAP32 = getHeap32();
  const a32 = toInt32Array(adj01);
  const needed = n2 * n2;
  if (a32.length !== needed) {
    throw new Error(`wasmGraphAllPairsDistances: expected ${needed} entries for ${n2}\xD7${n2} adjacency, got ${a32.length}`);
  }
  const bytesAdj = needed * 4;
  const bytesOut = needed * 4;
  const adjPtr = m._malloc(bytesAdj);
  const outPtr = m._malloc(bytesOut);
  if (adjPtr === 0 || outPtr === 0) {
    if (adjPtr) {
      m._free(adjPtr);
    }
    if (outPtr) {
      m._free(outPtr);
    }
    throw new Error("wasmGraphAllPairsDistances: malloc failed");
  }
  try {
    copyToHeap(HEAP32, a32, adjPtr / 4);
    m._wasm_graph_all_pairs_bfs_distances(n2, directed ? 1 : 0, adjPtr, outPtr);
    const out = [];
    const base = outPtr / 4;
    for (let i = 0; i < needed; i++) {
      out.push(HEAP32[base + i]);
    }
    return out;
  } finally {
    m._free(adjPtr);
    m._free(outPtr);
  }
}
function wasmGraphResolvingSubsetsCacheCreate() {
  requireModuleFunctions(
    "_wasm_graph_resolving_subsets_cache_create",
    "_wasm_graph_resolving_subsets_cache_destroy",
    "_wasm_graph_resolving_subsets_cache_set_graph",
    "_wasm_graph_resolving_subsets_cache_get_page",
    "_malloc",
    "_free"
  );
  const m = moduleInstance;
  const handle = m._wasm_graph_resolving_subsets_cache_create();
  if (handle === 0) {
    throw new Error("wasmGraphResolvingSubsetsCacheCreate: create failed");
  }
  let released = false;
  let graphN = 0;
  return {
    setGraph(adj01, distFlat, n2) {
      if (released) {
        throw new Error("wasmGraphResolvingSubsetsCacheHandle: cache already freed");
      }
      const HEAP32 = getHeap32();
      const a32 = toInt32Array(adj01);
      const d32 = toInt32Array(distFlat);
      const needed = n2 * n2;
      if (a32.length !== needed) {
        throw new Error(`wasmGraphResolvingSubsetsCacheHandle.setGraph: expected ${needed} adjacency entries, got ${a32.length}`);
      }
      if (d32.length !== needed) {
        throw new Error(`wasmGraphResolvingSubsetsCacheHandle.setGraph: expected ${needed} distance entries, got ${d32.length}`);
      }
      const bytes = needed * 4;
      const adjPtr = m._malloc(bytes);
      const distPtr = m._malloc(bytes);
      if (adjPtr === 0 || distPtr === 0) {
        if (adjPtr) {
          m._free(adjPtr);
        }
        if (distPtr) {
          m._free(distPtr);
        }
        throw new Error("wasmGraphResolvingSubsetsCacheHandle.setGraph: malloc failed");
      }
      try {
        copyToHeap(HEAP32, a32, adjPtr / 4);
        copyToHeap(HEAP32, d32, distPtr / 4);
        const ok = m._wasm_graph_resolving_subsets_cache_set_graph(
          handle,
          n2,
          adjPtr,
          distPtr
        );
        if (ok === 0) {
          throw new Error("wasmGraphResolvingSubsetsCacheHandle.setGraph: wasm call failed");
        }
        graphN = n2;
      } finally {
        m._free(adjPtr);
        m._free(distPtr);
      }
    },
    getPage(pageSize, pageIndexByMode) {
      if (released) {
        throw new Error("wasmGraphResolvingSubsetsCacheHandle: cache already freed");
      }
      if (graphN <= 0) {
        throw new Error("wasmGraphResolvingSubsetsCacheHandle.getPage: setGraph must be called first");
      }
      if (pageSize < 0) {
        pageSize = 0;
      }
      const HEAP32 = getHeap32();
      const modeCount = 3;
      const bytesPageIndex3 = modeCount * 4;
      const bytesMinDim3 = modeCount * 4;
      const bytesSmallest3 = modeCount * graphN * 4;
      const bytesTotalCount3 = modeCount * 4;
      const bytesPageCount3 = modeCount * 4;
      const bytesPageListCount3 = modeCount * 4;
      const bytesPageUsed3 = modeCount * 4;
      const bytesPageTrunc3 = modeCount * 4;
      const pageListFlatMaxIntsPerMode = Math.max(1, pageSize * (graphN + 1));
      const bytesPageFlat3 = modeCount * pageListFlatMaxIntsPerMode * 4;
      const minListFlatMaxIntsPerMode = Math.max(1, graphN * graphN * (graphN + 1));
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
      if (pageIndex3Ptr === 0 || minDim3Ptr === 0 || smallest3Ptr === 0 || totalCount3Ptr === 0 || pageCount3Ptr === 0 || pageListCount3Ptr === 0 || pageUsed3Ptr === 0 || pageTrunc3Ptr === 0 || pageFlat3Ptr === 0 || minListCount3Ptr === 0 || minUsed3Ptr === 0 || minTrunc3Ptr === 0 || minFlat3Ptr === 0) {
        if (pageIndex3Ptr) {
          m._free(pageIndex3Ptr);
        }
        if (minDim3Ptr) {
          m._free(minDim3Ptr);
        }
        if (smallest3Ptr) {
          m._free(smallest3Ptr);
        }
        if (totalCount3Ptr) {
          m._free(totalCount3Ptr);
        }
        if (pageCount3Ptr) {
          m._free(pageCount3Ptr);
        }
        if (pageListCount3Ptr) {
          m._free(pageListCount3Ptr);
        }
        if (pageUsed3Ptr) {
          m._free(pageUsed3Ptr);
        }
        if (pageTrunc3Ptr) {
          m._free(pageTrunc3Ptr);
        }
        if (pageFlat3Ptr) {
          m._free(pageFlat3Ptr);
        }
        if (minListCount3Ptr) {
          m._free(minListCount3Ptr);
        }
        if (minUsed3Ptr) {
          m._free(minUsed3Ptr);
        }
        if (minTrunc3Ptr) {
          m._free(minTrunc3Ptr);
        }
        if (minFlat3Ptr) {
          m._free(minFlat3Ptr);
        }
        throw new Error("wasmGraphResolvingSubsetsCacheHandle.getPage: malloc failed");
      }
      try {
        const pageIndexBase = pageIndex3Ptr / 4;
        HEAP32[pageIndexBase] = Math.max(0, pageIndexByMode[0] | 0);
        HEAP32[pageIndexBase + 1] = Math.max(0, pageIndexByMode[1] | 0);
        HEAP32[pageIndexBase + 2] = Math.max(0, pageIndexByMode[2] | 0);
        const ok = m._wasm_graph_resolving_subsets_cache_get_page(
          handle,
          pageSize,
          pageIndex3Ptr,
          minDim3Ptr,
          smallest3Ptr,
          graphN,
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
        if (ok === 0) {
          throw new Error("wasmGraphResolvingSubsetsCacheHandle.getPage: wasm call failed");
        }
        const parseMode = (modeIdx) => {
          const minDim = HEAP32[minDim3Ptr / 4 + modeIdx];
          const smallestBasis = [];
          const smallestBase = smallest3Ptr / 4 + modeIdx * graphN;
          for (let i = 0; i < minDim; i++) {
            smallestBasis.push(HEAP32[smallestBase + i]);
          }
          const totalCount = HEAP32[totalCount3Ptr / 4 + modeIdx];
          const pageCount = HEAP32[pageCount3Ptr / 4 + modeIdx];
          const usedInts = HEAP32[pageUsed3Ptr / 4 + modeIdx];
          const truncated = HEAP32[pageTrunc3Ptr / 4 + modeIdx] !== 0;
          const subsets = [];
          const flatBase = pageFlat3Ptr / 4 + modeIdx * pageListFlatMaxIntsPerMode;
          let idx = 0;
          while (idx < usedInts) {
            const k = HEAP32[flatBase + idx];
            idx++;
            const subset = [];
            for (let i = 0; i < k; i++) {
              subset.push(HEAP32[flatBase + idx]);
              idx++;
            }
            subsets.push(subset);
          }
          const minUsedInts = HEAP32[minUsed3Ptr / 4 + modeIdx];
          const minSizeTruncated = HEAP32[minTrunc3Ptr / 4 + modeIdx] !== 0;
          const minSizeSubsets = [];
          const minFlatBase = minFlat3Ptr / 4 + modeIdx * minListFlatMaxIntsPerMode;
          let minIdx = 0;
          while (minIdx < minUsedInts) {
            const k = HEAP32[minFlatBase + minIdx];
            minIdx++;
            const subset = [];
            for (let i = 0; i < k; i++) {
              subset.push(HEAP32[minFlatBase + minIdx]);
              minIdx++;
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
            minSizeTruncated
          };
        };
        return {
          node: parseMode(0),
          edge: parseMode(1),
          mixed: parseMode(2)
        };
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
      }
    },
    free() {
      if (released) {
        return;
      }
      m._wasm_graph_resolving_subsets_cache_destroy(handle);
      released = true;
      graphN = 0;
    }
  };
}

// page/graph_demo.ts
var n = 8;
var PAGE_SIZE = 500;
var highlightMode = "node";
var currentRandomSeed = 0;
var currentRandomThreshold = 0;
var graphVersion = 0;
var nodePageIndex = 0;
var edgePageIndex = 0;
var mixedPageIndex = 0;
var cachedResolveKey = "";
var cachedNodeRes = null;
var cachedEdgeRes = null;
var cachedMixedRes = null;
var wasmResolveCache = null;
var wasmResolveCacheGraphVersion = -1;
var graphIoText = "";
var graphIoStatus = "";
var graphIoIsEditing = false;
function ensureWasmResolveCache() {
  if (wasmResolveCache) {
    return wasmResolveCache;
  }
  wasmResolveCache = wasmGraphResolvingSubsetsCacheCreate();
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (wasmResolveCache) {
        wasmResolveCache.free();
        wasmResolveCache = null;
        wasmResolveCacheGraphVersion = -1;
      }
    });
  }
  return wasmResolveCache;
}
var adj = [];
var theme = {
  // Solarized Light-inspired
  panelBorder: "#93a1a1",
  headerBg: "#eee8d5",
  headerText: "#073642",
  basisHeaderBg: "#b58900",
  basisHeaderText: "#fdf6e3",
  cellOn: "#268bd2",
  cellOff: "#fdf6e3",
  cellDisabled: "#e4ddc8",
  cellText: "#073642",
  canvasEdge: "#268bd2",
  canvasNodeFill: "#fdf6e3",
  canvasNodeStroke: "#268bd2",
  canvasNodeText: "#073642",
  canvasBasisFill: "#b58900",
  canvasBasisStroke: "#b58900",
  canvasArrow: "#268bd2"
};
function initAdj(size) {
  adj = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      row.push(false);
    }
    adj.push(row);
  }
}
function invalidateResolveCache() {
  graphVersion++;
  cachedResolveKey = "";
  cachedNodeRes = null;
  cachedEdgeRes = null;
  cachedMixedRes = null;
  wasmResolveCacheGraphVersion = -1;
  nodePageIndex = 0;
  edgePageIndex = 0;
  mixedPageIndex = 0;
}
function setAdjFromAdj01Flat(flatAdj01) {
  const needed = n * n;
  if (flatAdj01.length !== needed) {
    throw new Error(`setAdjFromAdj01Flat: expected ${needed} entries, got ${flatAdj01.length}`);
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      adj[i][j] = flatAdj01[i * n + j] !== 0;
    }
  }
  invalidateResolveCache();
}
function createRandomSeed() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0];
  }
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
function randomizeGraphWithSeed(seed) {
  const rnd = wasmGraphRandomizeUndirectedAdj01(n, seed);
  setAdjFromAdj01Flat(rnd.adj01);
  currentRandomSeed = seed >>> 0;
  currentRandomThreshold = rnd.threshold;
}
function ensureElements() {
  const graphText = document.getElementById("graph_text");
  const controls = document.getElementById("controls");
  const canvas = document.getElementById("graph_canvas");
  const adjTable = document.getElementById("adj_table");
  const distTable = document.getElementById("dist_table");
  const edgeDistTable = document.getElementById("edge_dist_table");
  if (!graphText || !controls || !canvas || !adjTable || !distTable || !edgeDistTable) {
    throw new Error("Required DOM elements not found.");
  }
  return { graphText, controls, canvas, adjTable, distTable, edgeDistTable };
}
function clearTable(table) {
  while (table.rows.length > 0) {
    table.deleteRow(0);
  }
}
function renderControls(container, pageInfo) {
  container.innerHTML = "";
  const sizeLabel = document.createElement("span");
  sizeLabel.innerText = `n=${n}`;
  sizeLabel.style.fontFamily = "ui-monospace, Courier";
  const decBtn = document.createElement("button");
  decBtn.innerText = "-";
  decBtn.onclick = () => {
    if (n <= 2) {
      return;
    }
    n--;
    initAdj(n);
    randomizeGraphWithSeed(createRandomSeed());
    renderAll();
  };
  const incBtn = document.createElement("button");
  incBtn.innerText = "+";
  incBtn.onclick = () => {
    if (n >= 25) {
      return;
    }
    n++;
    initAdj(n);
    randomizeGraphWithSeed(createRandomSeed());
    renderAll();
  };
  const presetLabel = document.createElement("span");
  presetLabel.innerText = "presets:";
  presetLabel.style.fontFamily = "ui-monospace, Courier";
  const btnPath = document.createElement("button");
  btnPath.innerText = "P_n";
  btnPath.onclick = () => {
    setPathGraph();
    renderAll();
  };
  const btnCycle = document.createElement("button");
  btnCycle.innerText = "C_n";
  btnCycle.onclick = () => {
    setCycleGraph();
    renderAll();
  };
  const btnComplete = document.createElement("button");
  btnComplete.innerText = "K_n";
  btnComplete.onclick = () => {
    setCompleteGraph();
    renderAll();
  };
  const btnRandom = document.createElement("button");
  btnRandom.innerText = "Randomize";
  btnRandom.onclick = () => {
    const seed = createRandomSeed();
    randomizeGraphWithSeed(seed);
    renderAll();
  };
  const randomInfo = document.createElement("span");
  randomInfo.style.fontFamily = "ui-monospace, Courier";
  randomInfo.innerText = `seed=${currentRandomSeed} thres=${currentRandomThreshold.toFixed(3)}`;
  const spacer = (w) => {
    const s = document.createElement("span");
    s.style.display = "inline-block";
    s.style.width = `${w}px`;
    return s;
  };
  container.appendChild(decBtn);
  container.appendChild(incBtn);
  container.appendChild(sizeLabel);
  container.appendChild(spacer(8));
  container.appendChild(presetLabel);
  container.appendChild(btnPath);
  container.appendChild(btnCycle);
  container.appendChild(btnComplete);
  container.appendChild(btnRandom);
  container.appendChild(randomInfo);
  container.appendChild(spacer(8));
  const highlightLabel = document.createElement("span");
  highlightLabel.innerText = "highlight:";
  highlightLabel.style.fontFamily = "ui-monospace, Courier";
  container.appendChild(highlightLabel);
  const mkHighlightBtn = (label, val) => {
    const b = document.createElement("button");
    b.innerText = label;
    b.onclick = () => {
      highlightMode = val;
      renderAll();
    };
    if (highlightMode === val) {
      b.style.fontWeight = "700";
    }
    return b;
  };
  container.appendChild(mkHighlightBtn("node", "node"));
  container.appendChild(mkHighlightBtn("edge", "edge"));
  container.appendChild(mkHighlightBtn("mixed", "mixed"));
  container.appendChild(spacer(8));
  const pageSizeText = document.createElement("span");
  pageSizeText.style.fontFamily = "ui-monospace, Courier";
  pageSizeText.innerText = `pageSize=${PAGE_SIZE}`;
  container.appendChild(pageSizeText);
  const appendModePager = (modeLabel, pageIndex, pageCountRaw, setPageIndex) => {
    const pageCount = pageCountRaw > 0 ? pageCountRaw : 1;
    container.appendChild(spacer(6));
    const label = document.createElement("span");
    label.style.fontFamily = "ui-monospace, Courier";
    label.innerText = `${modeLabel} ${Math.min(pageIndex + 1, pageCount)}/${pageCount}`;
    container.appendChild(label);
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "\u25C0";
    prevBtn.disabled = pageIndex <= 0;
    prevBtn.onclick = () => {
      if (pageIndex <= 0) {
        return;
      }
      setPageIndex(pageIndex - 1);
      renderAll();
    };
    container.appendChild(prevBtn);
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "\u25B6";
    nextBtn.disabled = pageIndex + 1 >= pageCount;
    nextBtn.onclick = () => {
      if (pageIndex + 1 >= pageCount) {
        return;
      }
      setPageIndex(pageIndex + 1);
      renderAll();
    };
    container.appendChild(nextBtn);
  };
  appendModePager("node", nodePageIndex, pageInfo.nodePageCount, (next) => {
    nodePageIndex = next;
    cachedResolveKey = "";
  });
  appendModePager("edge", edgePageIndex, pageInfo.edgePageCount, (next) => {
    edgePageIndex = next;
    cachedResolveKey = "";
  });
  appendModePager("mixed", mixedPageIndex, pageInfo.mixedPageCount, (next) => {
    mixedPageIndex = next;
    cachedResolveKey = "";
  });
  container.appendChild(spacer(10));
  const ioWrap = document.createElement("div");
  ioWrap.style.display = "flex";
  ioWrap.style.flexWrap = "wrap";
  ioWrap.style.gap = "8px";
  ioWrap.style.alignItems = "center";
  ioWrap.style.justifyContent = "center";
  const ioLabel = document.createElement("span");
  ioLabel.innerText = "edges JSON:";
  ioLabel.style.fontFamily = "ui-monospace, Courier";
  ioWrap.appendChild(ioLabel);
  const ta = document.createElement("textarea");
  ta.rows = 3;
  ta.cols = 46;
  ta.placeholder = `[[1,2],[2,3]]`;
  ta.value = graphIoText;
  ta.style.fontFamily = "ui-monospace, Courier";
  ta.style.fontSize = "12px";
  ta.style.border = `1px solid ${theme.panelBorder}`;
  ta.style.borderRadius = "8px";
  ta.style.padding = "6px 8px";
  ta.style.background = "#f7f0dc";
  ta.style.color = theme.headerText;
  ta.onfocus = () => {
    graphIoIsEditing = true;
  };
  ta.onblur = () => {
    graphIoIsEditing = false;
  };
  ta.oninput = () => {
    graphIoText = ta.value;
    graphIoStatus = "";
  };
  ioWrap.appendChild(ta);
  const status = document.createElement("span");
  status.style.fontFamily = "ui-monospace, Courier";
  status.style.fontSize = "12px";
  status.style.color = graphIoStatus ? "#dc322f" : "#586e75";
  status.innerText = graphIoStatus || "format: [[u,v], ...] (1-based or 0-based accepted)";
  const copyBtn = document.createElement("button");
  copyBtn.innerText = "Copy";
  copyBtn.onclick = async () => {
    graphIoText = ta.value;
    try {
      await writeClipboardText(graphIoText);
      graphIoStatus = "Copied.";
    } catch (e) {
      graphIoStatus = e.message;
    }
    renderAll();
  };
  ioWrap.appendChild(copyBtn);
  const importBtn = document.createElement("button");
  importBtn.innerText = "Import";
  importBtn.onclick = () => {
    graphIoText = ta.value;
    try {
      const parsed = parseEdgeListJson(graphIoText);
      setGraphFromEdgeList(parsed.edges, parsed.base);
      graphIoStatus = `Imported (base=${parsed.base}, n=${n}).`;
      renderAll();
    } catch (e) {
      graphIoStatus = e.message;
      renderAll();
    }
  };
  ioWrap.appendChild(importBtn);
  ioWrap.appendChild(status);
  container.appendChild(ioWrap);
}
function clearEdges() {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      adj[i][j] = false;
    }
  }
  invalidateResolveCache();
}
function edgeListFromAdj01Based() {
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (adj[i][j] || adj[j][i]) {
        edges.push([i + 1, j + 1]);
      }
    }
  }
  return edges;
}
function isFiniteInt(x) {
  return typeof x === "number" && Number.isFinite(x) && Number.isInteger(x);
}
function parseEdgeListJson(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { edges: [], base: 1 };
  }
  let v;
  try {
    v = JSON.parse(trimmed);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }
  if (!Array.isArray(v)) {
    throw new Error("Expected a JSON array of edges, e.g. [[1,2],[2,3]].");
  }
  const edges = [];
  let sawZero = false;
  let minVal = Number.POSITIVE_INFINITY;
  let maxVal = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < v.length; i++) {
    const item = v[i];
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
  const base = sawZero ? 0 : minVal >= 1 ? 1 : 0;
  if (edges.length > 0 && maxVal < (base === 1 ? 1 : 0)) {
    throw new Error("Edge list contains invalid vertex indices.");
  }
  return { edges, base };
}
function setGraphFromEdgeList(edges, base) {
  let maxVertex = base === 1 ? 1 : 0;
  for (const [aRaw, bRaw] of edges) {
    maxVertex = Math.max(maxVertex, aRaw, bRaw);
  }
  const nextN = edges.length === 0 ? n : base === 1 ? maxVertex : maxVertex + 1;
  if (nextN < 2) {
    clearEdges();
    return;
  }
  if (nextN !== n) {
    n = nextN;
    initAdj(n);
  } else {
    clearEdges();
  }
  for (const [aRaw, bRaw] of edges) {
    const a = base === 1 ? aRaw - 1 : aRaw;
    const b = base === 1 ? bRaw - 1 : bRaw;
    if (a < 0 || b < 0 || a >= n || b >= n) {
      throw new Error(`Vertex index out of range after base=${base} conversion: [${aRaw}, ${bRaw}]`);
    }
    if (a === b) {
      continue;
    }
    setUndirectedEdge(a, b, true);
  }
}
async function writeClipboardText(text) {
  const nav = typeof navigator !== "undefined" ? navigator : void 0;
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
function setUndirectedEdge(i, j, value) {
  if (i === j) {
    return;
  }
  if (adj[i][j] === value && adj[j][i] === value) {
    return;
  }
  adj[i][j] = value;
  adj[j][i] = value;
  invalidateResolveCache();
}
function setPathGraph() {
  clearEdges();
  for (let i = 0; i + 1 < n; i++) {
    setUndirectedEdge(i, i + 1, true);
  }
}
function setCycleGraph() {
  clearEdges();
  if (n <= 1) {
    return;
  }
  for (let i = 0; i + 1 < n; i++) {
    setUndirectedEdge(i, i + 1, true);
  }
  if (n > 2) {
    setUndirectedEdge(n - 1, 0, true);
  }
}
function setCompleteGraph() {
  clearEdges();
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        continue;
      }
      if (j > i) {
        setUndirectedEdge(i, j, true);
      }
    }
  }
}
function drawGraph(canvas, basis, distFlat, basisList) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const fallbackW = Number(canvas.getAttribute("width")) || 760;
  const fallbackH = Number(canvas.getAttribute("height")) || 560;
  const logicalW = canvas.clientWidth > 0 ? canvas.clientWidth : fallbackW;
  const logicalH = canvas.clientHeight > 0 ? canvas.clientHeight : fallbackH;
  if (!canvas.style.width) {
    canvas.style.width = `${logicalW}px`;
  }
  if (!canvas.style.height) {
    canvas.style.height = `${logicalH}px`;
  }
  const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
  const pixelW = Math.max(1, Math.round(logicalW * dpr));
  const pixelH = Math.max(1, Math.round(logicalH * dpr));
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = logicalW;
  const h = logicalH;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.38;
  const nodeR = Math.max(8, Math.min(16, Math.floor(Math.min(w, h) / 35)));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const theta = -Math.PI / 2 + 2 * Math.PI * i / n;
    pts.push({ x: cx + R * Math.cos(theta), y: cy + R * Math.sin(theta) });
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme.canvasEdge;
  ctx.fillStyle = theme.canvasArrow;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!(adj[i][j] || adj[j][i])) {
        continue;
      }
      const a = pts[i];
      const b = pts[j];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const isBasis = basis.has(i);
    ctx.fillStyle = isBasis ? theme.canvasBasisFill : theme.canvasNodeFill;
    ctx.strokeStyle = isBasis ? theme.canvasBasisStroke : theme.canvasNodeStroke;
    ctx.beginPath();
    ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.canvasNodeText;
    const fontMain = Math.max(10, nodeR);
    ctx.font = `${fontMain}px ui-monospace, Courier`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((i + 1).toString(), p.x, p.y);
    if (basisList.length > 0) {
      const coords = [];
      for (let t = 0; t < basisList.length; t++) {
        const b = basisList[t];
        const d = distFlat[b * n + i];
        coords.push(d === -1 ? "\u221E" : d.toString());
      }
      const text = `(${coords.join(",")})`;
      const coordFontPx = Math.max(16, Math.floor(fontMain * 1.2));
      ctx.font = `${coordFontPx}px ui-monospace, Courier`;
      ctx.textBaseline = "top";
      const m = ctx.measureText(text);
      const textW = m.width;
      const padX = 4;
      const padY = 2;
      const boxW = textW + padX * 2;
      const boxH = coordFontPx + padY * 2;
      let boxX = p.x - boxW / 2;
      let boxY = p.y + nodeR + 8;
      const margin = 2;
      if (boxX < margin) {
        boxX = margin;
      }
      if (boxY < margin) {
        boxY = margin;
      }
      if (boxX + boxW > w - margin) {
        boxX = w - margin - boxW;
      }
      if (boxY + boxH > h - margin) {
        boxY = h - margin - boxH;
      }
      ctx.fillStyle = "rgba(253, 246, 227, 0.94)";
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = "rgba(147, 161, 161, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = theme.canvasNodeText;
      ctx.textAlign = "left";
      ctx.fillText(text, boxX + padX, boxY + padY);
    }
  }
}
function adjToAdj01Flat() {
  const flat = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      flat.push(adj[i][j] ? 1 : 0);
    }
  }
  return flat;
}
function styleHeaderCell(cell, isBasis) {
  cell.style.background = isBasis ? theme.basisHeaderBg : theme.headerBg;
  cell.style.color = isBasis ? theme.basisHeaderText : theme.headerText;
  cell.style.fontWeight = "600";
}
function renderAdjacencyTable(adjTable, basis) {
  clearTable(adjTable);
  adjTable.style.alignSelf = "center";
  adjTable.style.textAlign = "center";
  {
    const row = adjTable.insertRow();
    for (let j = -1; j < n; j++) {
      const cell = row.insertCell();
      if (j === -1) {
        cell.style.borderStyle = "none";
        cell.innerText = "";
        continue;
      }
      cell.innerText = (j + 1).toString();
      styleHeaderCell(cell, basis.has(j));
    }
  }
  for (let i = 0; i < n; i++) {
    const row = adjTable.insertRow();
    const head = row.insertCell();
    head.innerText = (i + 1).toString();
    styleHeaderCell(head, basis.has(i));
    for (let j = 0; j < n; j++) {
      const cell = row.insertCell();
      cell.style.color = theme.cellText;
      if (i === j) {
        cell.innerText = "\u2014";
        cell.style.background = theme.cellDisabled;
        continue;
      }
      const updateCell = () => {
        cell.innerText = adj[i][j] ? "1" : "0";
        cell.style.background = adj[i][j] ? theme.cellOn : theme.cellOff;
      };
      updateCell();
      cell.onclick = () => {
        const next = !(adj[i][j] || adj[j][i]);
        setUndirectedEdge(i, j, next);
        renderAll();
      };
    }
  }
  for (const row of adjTable.rows) {
    for (const cell of row.cells) {
      cell.style.fontSize = "14px";
    }
  }
}
function renderDistancesTable(distTable, distFlat, basis) {
  clearTable(distTable);
  distTable.style.alignSelf = "center";
  distTable.style.textAlign = "center";
  {
    const row = distTable.insertRow();
    for (let j = -1; j < n; j++) {
      const cell = row.insertCell();
      if (j === -1) {
        cell.style.borderStyle = "none";
        cell.innerText = "";
        continue;
      }
      cell.innerText = (j + 1).toString();
      styleHeaderCell(cell, basis.has(j));
    }
  }
  for (let i = 0; i < n; i++) {
    const row = distTable.insertRow();
    const head = row.insertCell();
    head.innerText = (i + 1).toString();
    styleHeaderCell(head, basis.has(i));
    for (let j = 0; j < n; j++) {
      const cell = row.insertCell();
      cell.style.color = theme.cellText;
      cell.style.background = theme.cellOff;
      const d = distFlat[i * n + j];
      cell.innerText = d === -1 ? "\u221E" : d.toString();
      if (basis.has(i) || basis.has(j)) {
        cell.style.background = "#eee8d5";
      }
    }
  }
  for (const row of distTable.rows) {
    for (const cell of row.cells) {
      cell.style.fontSize = "13px";
    }
  }
}
function renderEdgeToNodeDistancesTable(edgeDistTable, distFlat, edges, basis) {
  clearTable(edgeDistTable);
  edgeDistTable.style.alignSelf = "center";
  edgeDistTable.style.textAlign = "center";
  {
    const row = edgeDistTable.insertRow();
    for (let j = -1; j < n; j++) {
      const cell = row.insertCell();
      if (j === -1) {
        cell.style.borderStyle = "none";
        cell.innerText = "";
        continue;
      }
      cell.innerText = (j + 1).toString();
      styleHeaderCell(cell, basis.has(j));
    }
  }
  for (let ei = 0; ei < edges.length; ei++) {
    const e = edges[ei];
    const row = edgeDistTable.insertRow();
    const head = row.insertCell();
    head.innerText = `${e.a + 1}-${e.b + 1}`;
    head.style.background = theme.headerBg;
    head.style.color = theme.headerText;
    head.style.fontWeight = "600";
    for (let v = 0; v < n; v++) {
      const cell = row.insertCell();
      cell.style.color = theme.cellText;
      cell.style.background = theme.cellOff;
      const da = distFlat[e.a * n + v];
      const db = distFlat[e.b * n + v];
      const d = da === -1 && db === -1 ? -1 : da === -1 ? db : db === -1 ? da : Math.min(da, db);
      cell.innerText = d === -1 ? "\u221E" : d.toString();
      if (basis.has(v)) {
        cell.style.background = "#eee8d5";
      }
    }
  }
  for (const row of edgeDistTable.rows) {
    for (const cell of row.cells) {
      cell.style.fontSize = "13px";
    }
  }
}
function renderSummary(graphText, edgeCount, mdText) {
  graphText.innerHTML = `Graph on n=${n} vertices (undirected)<br>Edges: ${edgeCount}<br>` + mdText;
}
function subsetToString1Based(subset) {
  return `{${subset.map((x) => (x + 1).toString()).join(", ")}}`;
}
function renderResolvingSubsetsPanel(modeName, pageIndex, res) {
  const smallest = subsetToString1Based(res.smallestBasis);
  const shownCount = res.subsets.length;
  const minSizeSubsets = res.minSizeSubsets;
  const minCount = minSizeSubsets.length;
  const pageCountSafe = res.pageCount > 0 ? res.pageCount : 1;
  const pageShown = Math.min(pageIndex + 1, pageCountSafe);
  const smallestLine = `Min dimension (${modeName}): ${res.minDimension}<br>Smallest set: ${smallest}<br>Page ${pageShown}/${pageCountSafe}, showing ${shownCount} of total ${res.totalCount}<br>`;
  const note = res.truncated ? `<span style="color:#586e75">Note: subset list truncated (too many subsets to fit buffer).</span><br>` : "";
  const minNote = res.minSizeTruncated ? `<span style="color:#586e75">Note: min-size subset list truncated.</span><br>` : "";
  const minHtml = minSizeSubsets.map((s) => subsetToString1Based(s)).join("<br>");
  const allHtml = res.subsets.map((s) => subsetToString1Based(s)).join("<br>");
  const minDetails = `<details><summary>Resolving subsets of min size with a non-resolving (k-1) subset (${modeName}, k=${res.minDimension}, all): ${minCount}</summary><div style="font-family:ui-monospace, Courier; font-size:13px; line-height:1.35; margin-top:6px;">${minHtml || "(none)"}</div></details>`;
  const allDetails = `<details><summary>Resolving subsets with a non-resolving (k-1) subset (${modeName}, current page): ${shownCount}</summary><div style="font-family:ui-monospace, Courier; font-size:13px; line-height:1.35; margin-top:6px;">${allHtml || "(none)"}</div></details><br>`;
  return smallestLine + note + minNote + minDetails + "<br>" + allDetails;
}
function renderAll() {
  const { graphText, controls, canvas, adjTable, distTable, edgeDistTable } = ensureElements();
  if (!graphIoIsEditing) {
    graphIoText = JSON.stringify(edgeListFromAdj01Based());
    if (graphIoStatus === "Copied.") {
    } else if (graphIoStatus.startsWith("Imported")) {
    } else {
      graphIoStatus = "";
    }
  }
  const adj01 = adjToAdj01Flat();
  const edgeCount = wasmGraphEdgeCount(adj01, n, false);
  const distFlat = wasmGraphAllPairsDistances(adj01, n, false);
  const cacheHandle = ensureWasmResolveCache();
  if (wasmResolveCacheGraphVersion !== graphVersion) {
    cacheHandle.setGraph(adj01, distFlat, n);
    wasmResolveCacheGraphVersion = graphVersion;
    cachedResolveKey = "";
  }
  const resolveKey = `${graphVersion}:${nodePageIndex}:${edgePageIndex}:${mixedPageIndex}`;
  if (cachedResolveKey !== resolveKey || !cachedNodeRes || !cachedEdgeRes || !cachedMixedRes) {
    const allModesRes = cacheHandle.getPage(
      PAGE_SIZE,
      [nodePageIndex, edgePageIndex, mixedPageIndex]
    );
    cachedNodeRes = allModesRes.node;
    cachedEdgeRes = allModesRes.edge;
    cachedMixedRes = allModesRes.mixed;
    cachedResolveKey = resolveKey;
    if (cachedNodeRes.pageCount > 0 && nodePageIndex >= cachedNodeRes.pageCount) {
      nodePageIndex = cachedNodeRes.pageCount - 1;
      cachedResolveKey = "";
    }
    if (cachedEdgeRes.pageCount > 0 && edgePageIndex >= cachedEdgeRes.pageCount) {
      edgePageIndex = cachedEdgeRes.pageCount - 1;
      cachedResolveKey = "";
    }
    if (cachedMixedRes.pageCount > 0 && mixedPageIndex >= cachedMixedRes.pageCount) {
      mixedPageIndex = cachedMixedRes.pageCount - 1;
      cachedResolveKey = "";
    }
    if (cachedResolveKey === "") {
      renderAll();
      return;
    }
  }
  const nodeRes = cachedNodeRes;
  const edgeRes = cachedEdgeRes;
  const mixedRes = cachedMixedRes;
  renderControls(controls, {
    nodePageCount: nodeRes.pageCount,
    edgePageCount: edgeRes.pageCount,
    mixedPageCount: mixedRes.pageCount
  });
  const highlightBasisList = highlightMode === "node" ? nodeRes.smallestBasis : highlightMode === "edge" ? edgeRes.smallestBasis : mixedRes.smallestBasis;
  const basis = /* @__PURE__ */ new Set();
  for (const v of highlightBasisList) {
    basis.add(v);
  }
  renderAdjacencyTable(adjTable, basis);
  renderDistancesTable(distTable, distFlat, basis);
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (adj[i][j] || adj[j][i]) {
        edges.push({ a: i, b: j });
      }
    }
  }
  renderEdgeToNodeDistancesTable(edgeDistTable, distFlat, edges, basis);
  drawGraph(canvas, basis, distFlat, highlightBasisList);
  renderSummary(
    graphText,
    edgeCount,
    `Highlight mode: ${highlightMode}<br>Highlight basis: ${subsetToString1Based(highlightBasisList)}<br><br>` + renderResolvingSubsetsPanel("node", nodePageIndex, nodeRes) + renderResolvingSubsetsPanel("edge", edgePageIndex, edgeRes) + renderResolvingSubsetsPanel("mixed", mixedPageIndex, mixedRes)
  );
}
initAdj(n);
randomizeGraphWithSeed(createRandomSeed());
renderAll();
