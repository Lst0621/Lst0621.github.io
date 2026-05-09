import { wasmLayeredDagGenerator, WasmLayeredDAGResult } from "../tsl/wasm/ts/wasm_api_dag";

// Configuration and state
interface DAGConfig {
    numLevels: number;
    minNodesPerLevel: number;
    maxNodesPerLevel: number;
    maxDegreeK: number;
}

let currentConfig: DAGConfig = {
    numLevels: 10,
    minNodesPerLevel: 3,
    maxNodesPerLevel: 6,
    maxDegreeK: 3
};

let currentSeed: number = 42;
let currentDAG: WasmLayeredDAGResult | null = null;
let selectedPath: number[] = [];

// Colors (Solarized-ish, consistent with other pages)
const COLOR_BG = "#fdf6e3";
// Edges use one consistent color (selected/unselected differ by dash/width only)
// and should not match the chosen node color.
const COLOR_EDGE = "#586e75";
const COLOR_NODE_OUTLINE_CHOSEN = "#2aa198";
const COLOR_NODE_UNCHOSEN = "#fdf6e3";
const COLOR_NODE_CHOSEN = "#268bd2";
const COLOR_NODE_SOURCE = "#b58900";
const COLOR_NODE_SINK = "#dc322f";
const COLOR_NODE_TEXT = "#073642";
const COLOR_LEVEL_TEXT = "#657b83";

// Canvas setup and rendering
const PADDING = 50;
const NODE_RADIUS = 15;
const LEVEL_HEIGHT = 55; // preferred spacing; may shrink to fit all levels
const MIN_CANVAS_WIDTH = 700;
const MIN_CANVAS_HEIGHT = 500;
const NODE_SPACING = 120;

interface DOMElements {
    canvas: HTMLCanvasElement;
    numLevelsInput: HTMLInputElement;
    minNodesInput: HTMLInputElement;
    maxNodesInput: HTMLInputElement;
    maxDegreeInput: HTMLInputElement;
    seedInput: HTMLInputElement;
    generateBtn: HTMLButtonElement;
    randomSeedBtn: HTMLButtonElement;
    resetPathBtn: HTMLButtonElement;
    statsDiv: HTMLDivElement;
}

let domElements: DOMElements | null = null;
let lastClickTime: number = 0;
let lastClickedNode: number | null = null;

function initializeDOM(): DOMElements {
    const canvas = document.getElementById("dag_canvas") as HTMLCanvasElement;
    const numLevelsInput = document.getElementById("num_levels_input") as HTMLInputElement;
    const minNodesInput = document.getElementById("min_nodes_input") as HTMLInputElement;
    const maxNodesInput = document.getElementById("max_nodes_input") as HTMLInputElement;
    const maxDegreeInput = document.getElementById("max_degree_input") as HTMLInputElement;
    const seedInput = document.getElementById("seed_input") as HTMLInputElement;
    const generateBtn = document.getElementById("generate_btn") as HTMLButtonElement;
    const randomSeedBtn = document.getElementById("random_seed_btn") as HTMLButtonElement;
    const resetPathBtn = document.getElementById("reset_path_btn") as HTMLButtonElement;
    const statsDiv = document.getElementById("dag_stats") as HTMLDivElement;

    if (
        !canvas ||
        !numLevelsInput ||
        !minNodesInput ||
        !maxNodesInput ||
        !maxDegreeInput ||
        !seedInput ||
        !generateBtn ||
        !randomSeedBtn ||
        !resetPathBtn ||
        !statsDiv
    ) {
        throw new Error("Missing required DOM elements");
    }

    return {
        canvas,
        numLevelsInput,
        minNodesInput,
        maxNodesInput,
        maxDegreeInput,
        seedInput,
        generateBtn,
        randomSeedBtn,
        resetPathBtn,
        statsDiv
    };
}

function updateConfigFromInputs(els: DOMElements): void {
    currentConfig.numLevels = Math.max(2, parseInt(els.numLevelsInput.value, 10) || 5);
    currentConfig.minNodesPerLevel = Math.max(1, parseInt(els.minNodesInput.value, 10) || 3);
    currentConfig.maxNodesPerLevel = Math.max(
        currentConfig.minNodesPerLevel,
        parseInt(els.maxNodesInput.value, 10) || 6
    );
    currentConfig.maxDegreeK = Math.max(1, parseInt(els.maxDegreeInput.value, 10) || 3);
    currentSeed = Math.max(0, parseInt(els.seedInput.value, 10) || 0);
}

function resetSelection(): void {
    selectedPath = [];
}

function resizeCanvasToDAG(els: DOMElements): void {
    // Keep width fixed so changing nodes/level doesn't resize horizontally.
    // Allow height to grow with number of levels for readability.
    els.canvas.width = MIN_CANVAS_WIDTH;
    const levels = Math.max(2, currentConfig.numLevels | 0);
    const neededH = 2 * PADDING + (levels - 1) * LEVEL_HEIGHT;
    els.canvas.height = Math.max(MIN_CANVAS_HEIGHT, neededH);
}

function generateDAG(els: DOMElements): void {
    updateConfigFromInputs(els);
    resetSelection();

    try {
        currentDAG = wasmLayeredDagGenerator(
            currentConfig.numLevels,
            currentConfig.minNodesPerLevel,
            currentConfig.maxNodesPerLevel,
            currentConfig.maxDegreeK,
            currentSeed
        );
        resizeCanvasToDAG(els);
        renderDAG(els);
        updateStats(els);
    } catch (error) {
        console.error("Error generating DAG:", error);
        els.statsDiv.textContent = `Error: ${String(error)}`;
    }
}

function randomSeed(els: DOMElements): void {
    currentSeed = Math.floor(Math.random() * 1000000);
    els.seedInput.value = currentSeed.toString();
    generateDAG(els);
}

function computeNodeLayout(dag: WasmLayeredDAGResult, width: number, height: number): {
    nodesPerLevel: number[];
    nodePos: Array<{ x: number; y: number }>;
} {
    const levels = currentConfig.numLevels;
    const nodesPerLevel: number[] = Array(levels).fill(0);
    for (let i = 0; i < dag.nodeCount; i++) {
        const level = dag.nodeLevels[i];
        if (level >= 0 && level < levels) {
            nodesPerLevel[level]++;
        }
    }

    const nodePos: Array<{ x: number; y: number }> = Array(dag.nodeCount);
    for (let i = 0; i < dag.nodeCount; i++) {
        const level = dag.nodeLevels[i];
        const rank = dag.nodeRanks[i];
        const nodesInLevel = nodesPerLevel[level];

        const levelWidth = width - 2 * PADDING;
        const xSpacing = nodesInLevel > 1 ? levelWidth / (nodesInLevel + 1) : levelWidth / 2;
        const x = PADDING + (rank + 1) * xSpacing;
        const y = PADDING + level * LEVEL_HEIGHT;

        nodePos[i] = { x, y };
    }

    return { nodesPerLevel, nodePos };
}

function getSelectedEdgeSet(): Set<string> {
    const selectedEdges = new Set<string>();
    for (let i = 0; i + 1 < selectedPath.length; i++) {
        selectedEdges.add(`${selectedPath[i]}:${selectedPath[i + 1]}`);
    }
    return selectedEdges;
}

function renderDAG(els: DOMElements): void {
    if (!currentDAG) {
        return;
    }

    const ctx = els.canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    const width = els.canvas.width;
    const height = els.canvas.height;

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, width, height);

    const dag = currentDAG;
    const levels = currentConfig.numLevels;

    const { nodesPerLevel, nodePos } = computeNodeLayout(dag, width, height);
    const selectedEdgeSet = getSelectedEdgeSet();

    ctx.strokeStyle = COLOR_EDGE;
    ctx.lineWidth = 1;
    for (const [from, to] of dag.edges) {
        const p1 = nodePos[from];
        const p2 = nodePos[to];

        if (p1 && p2) {
            const edgeKey = `${from}:${to}`;
            if (selectedEdgeSet.has(edgeKey)) {
                // Selected edges: solid lines
                ctx.save();
                ctx.setLineDash([]);
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = COLOR_EDGE;
                ctx.fillStyle = COLOR_EDGE;
            } else {
                // Unselected edges: dashed
                ctx.save();
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 1;
                ctx.strokeStyle = COLOR_EDGE;
                ctx.fillStyle = COLOR_EDGE;
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const arrowSize = 8;
            const arrowX = p2.x - arrowSize * Math.cos(angle);
            const arrowY = p2.y - arrowSize * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(arrowX - arrowSize * Math.cos(angle + Math.PI / 6), arrowY - arrowSize * Math.sin(angle + Math.PI / 6));
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI / 6), arrowY - arrowSize * Math.sin(angle - Math.PI / 6));
            ctx.fillStyle = COLOR_EDGE;
            ctx.fill();
            ctx.restore();
        }
    }

    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < dag.nodeCount; i++) {
        const pos = nodePos[i];
        const level = dag.nodeLevels[i];
        const isSource = level === 0;
        const isSink = level === levels - 1;
        const isChosen = selectedPath.includes(i);

        // Default: unchosen nodes use neutral fill; source/sink are indicated
        // by outline, and switch to strong fill only when chosen.
        if (isSource) {
            ctx.fillStyle = isChosen ? COLOR_NODE_SOURCE : COLOR_NODE_UNCHOSEN;
        } else if (isSink) {
            ctx.fillStyle = isChosen ? COLOR_NODE_SINK : COLOR_NODE_UNCHOSEN;
        } else {
            ctx.fillStyle = isChosen ? COLOR_NODE_CHOSEN : COLOR_NODE_UNCHOSEN;
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();

        // Outline: source/sink get distinctive stroke even when unchosen.
        if (isSource) {
            ctx.strokeStyle = COLOR_NODE_SOURCE;
        } else if (isSink) {
            ctx.strokeStyle = COLOR_NODE_SINK;
        } else if (isChosen) {
            ctx.strokeStyle = COLOR_NODE_OUTLINE_CHOSEN;
        } else {
            ctx.strokeStyle = COLOR_EDGE;
        }
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.fillStyle = COLOR_LEVEL_TEXT;
    ctx.font = "12px sans-serif";
    for (let level = 0; level < levels; level++) {
        const y = PADDING + level * LEVEL_HEIGHT;
        // Draw the label inside the canvas so "Level 10+" never clips.
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`Level ${level + 1}`, 8, y);
    }
}

function updateStats(els: DOMElements): void {
    if (!currentDAG) {
        els.statsDiv.textContent = "No DAG generated";
        return;
    }

    const dag = currentDAG;
    const nodeCount = dag.nodeCount;
    const edgeCount = dag.edges.length;

    els.statsDiv.innerHTML = `
        <div style="max-width:260px; line-height:1.25;">
            <div><strong>Click:</strong> start at top dot, then 1 connected dot each level.</div>
            <div><strong>Undo:</strong> right‑click.</div>
            <div><strong>${selectedPath.length}/${currentConfig.numLevels}</strong> levels</div>
            <div style="color:#657b83;">n=${nodeCount}, m=${edgeCount}</div>
        </div>
    `;
}

function getNodeAtCanvasPoint(els: DOMElements, x: number, y: number): number | null {
    if (!currentDAG) {
        return null;
    }

    const dag = currentDAG;
    const width = els.canvas.width;
    const height = els.canvas.height;
    const { nodePos, nodesPerLevel } = computeNodeLayout(dag, width, height);
    for (let i = 0; i < nodePos.length; i++) {
        const pos = nodePos[i];
        const level = dag.nodeLevels[i];
        const nodesInLevel = nodesPerLevel[level] ?? 1;

        // Expand clickable area up to 1.3x, but cap so hit areas don't overlap.
        // Horizontal cap: based on per-level spacing; Vertical cap: based on level gap.
        const levelWidth = width - 2 * PADDING;
        const xSpacing = nodesInLevel > 1 ? levelWidth / (nodesInLevel + 1) : levelWidth / 2;
        const hitR = Math.max(
            NODE_RADIUS,
            Math.min(NODE_RADIUS * 1.3, xSpacing * 0.45, LEVEL_HEIGHT * 0.45),
        );
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy <= hitR * hitR) {
            return i;
        }
    }

    return null;
}

function getSelectedNodeByLevel(level: number): number | null {
    for (const nodeId of selectedPath) {
        if (currentDAG && currentDAG.nodeLevels[nodeId] === level) {
            return nodeId;
        }
    }
    return null;
}

function isValidNextSelection(candidateNode: number): boolean {
    if (!currentDAG) {
        return false;
    }

    const dag = currentDAG;
    const candidateLevel = dag.nodeLevels[candidateNode];
    const expectedLevel = selectedPath.length;

    // Can only select at the next level
    if (candidateLevel !== expectedLevel) {
        return false;
    }

    // First click must be the source (level 0).
    if (selectedPath.length === 0) {
        return candidateLevel === 0;
    }

    // Check if it's a direct child of the last selected node
    const parent = selectedPath[selectedPath.length - 1];
    for (const [from, to] of dag.edges) {
        if (from === parent && to === candidateNode) {
            return true;
        }
    }

    return false;
}

function handleCanvasClick(els: DOMElements, event: MouseEvent): void {
    if (!currentDAG) {
        return;
    }

    const rect = els.canvas.getBoundingClientRect();
    const scaleX = els.canvas.width / rect.width;
    const scaleY = els.canvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    const clickedNode = getNodeAtCanvasPoint(els, canvasX, canvasY);
    if (clickedNode === null) {
        return;
    }

    const clickedLevel = currentDAG.nodeLevels[clickedNode];
    const existingOnLevel = getSelectedNodeByLevel(clickedLevel);
    if (existingOnLevel !== null && existingOnLevel !== clickedNode) {
        return;
    }

    if (!isValidNextSelection(clickedNode)) {
        return;
    }

    selectedPath.push(clickedNode);
    renderDAG(els);
    updateStats(els);
}

function handleCanvasRightClick(els: DOMElements, event: MouseEvent): void {
    if (!currentDAG) {
        return;
    }
    event.preventDefault();

    const rect = els.canvas.getBoundingClientRect();
    const scaleX = els.canvas.width / rect.width;
    const scaleY = els.canvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    const clickedNode = getNodeAtCanvasPoint(els, canvasX, canvasY);

    if (clickedNode !== null && selectedPath.includes(clickedNode)) {
        const nodeIndex = selectedPath.indexOf(clickedNode);
        selectedPath = selectedPath.slice(0, nodeIndex);
    } else if (selectedPath.length > 0) {
        // Right-click empty space: undo last step
        selectedPath = selectedPath.slice(0, selectedPath.length - 1);
    } else {
        return;
    }

    renderDAG(els);
    updateStats(els);
}

function setupEventListeners(els: DOMElements): void {
    els.generateBtn.addEventListener("click", () => generateDAG(els));
    els.randomSeedBtn.addEventListener("click", () => randomSeed(els));
    els.resetPathBtn.addEventListener("click", () => {
        resetSelection();
        renderDAG(els);
        updateStats(els);
    });
    els.canvas.addEventListener("click", (event) => handleCanvasClick(els, event));
    els.canvas.addEventListener("contextmenu", (event) => handleCanvasRightClick(els, event as MouseEvent));
}

window.addEventListener("DOMContentLoaded", async () => {
    try {
        domElements = initializeDOM();

        domElements.numLevelsInput.value = currentConfig.numLevels.toString();
        domElements.minNodesInput.value = currentConfig.minNodesPerLevel.toString();
        domElements.maxNodesInput.value = currentConfig.maxNodesPerLevel.toString();
        domElements.maxDegreeInput.value = currentConfig.maxDegreeK.toString();
        domElements.seedInput.value = currentSeed.toString();

        setupEventListeners(domElements);
        generateDAG(domElements);
    } catch (error) {
        console.error("Initialization error:", error);
        document.body.innerHTML += `<p style="color: red;">Error: ${String(error)}</p>`;
    }
});

if (document.readyState !== "loading") {
    try {
        domElements = initializeDOM();
        domElements.numLevelsInput.value = currentConfig.numLevels.toString();
        domElements.minNodesInput.value = currentConfig.minNodesPerLevel.toString();
        domElements.maxNodesInput.value = currentConfig.maxNodesPerLevel.toString();
        domElements.maxDegreeInput.value = currentConfig.maxDegreeK.toString();
        domElements.seedInput.value = currentSeed.toString();
        setupEventListeners(domElements);
        generateDAG(domElements);
    } catch (error) {
        console.error("Initialization error:", error);
        const statsDiv = document.getElementById("dag_stats");
        if (statsDiv) {
            statsDiv.innerHTML = `<p style="color: red;">Error: ${String(error)}</p>`;
        }
    }
}