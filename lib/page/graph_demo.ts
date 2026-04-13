import { wasmGraphAllPairsDistances, wasmGraphEdgeCount, wasmGraphMetricDimension } from "../tsl/wasm_api";

type Mode = "undirected" | "directed";

let n = 8;
let mode: Mode = "undirected";

// Internal representation is always directed adjacency:
// adj[i][j] === true means edge i -> j exists.
let adj: boolean[][] = [];

type Theme = {
    panelBorder: string;
    headerBg: string;
    headerText: string;
    basisHeaderBg: string;
    basisHeaderText: string;
    cellOn: string;
    cellOff: string;
    cellDisabled: string;
    cellText: string;
    canvasEdge: string;
    canvasNodeFill: string;
    canvasNodeStroke: string;
    canvasNodeText: string;
    canvasBasisFill: string;
    canvasBasisStroke: string;
    canvasArrow: string;
};

const theme: Theme = {
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
    canvasArrow: "#268bd2",
};

function initAdj(size: number): void {
    adj = [];
    for (let i = 0; i < size; i++) {
        const row: boolean[] = [];
        for (let j = 0; j < size; j++) {
            row.push(false);
        }
        adj.push(row);
    }
}

function ensureElements(): {
    graphText: HTMLSpanElement;
    controls: HTMLDivElement;
    canvas: HTMLCanvasElement;
    adjTable: HTMLTableElement;
    distTable: HTMLTableElement;
} {
    const graphText = document.getElementById("graph_text") as HTMLSpanElement | null;
    const controls = document.getElementById("controls") as HTMLDivElement | null;
    const canvas = document.getElementById("graph_canvas") as HTMLCanvasElement | null;
    const adjTable = document.getElementById("adj_table") as HTMLTableElement | null;
    const distTable = document.getElementById("dist_table") as HTMLTableElement | null;
    if (!graphText || !controls || !canvas || !adjTable || !distTable) {
        throw new Error("Required DOM elements not found.");
    }
    return { graphText, controls, canvas, adjTable, distTable };
}

function clearTable(table: HTMLTableElement): void {
    while (table.rows.length > 0) {
        table.deleteRow(0);
    }
}

function renderControls(container: HTMLDivElement): void {
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
        renderAll();
    };

    const modeLabel = document.createElement("label");
    modeLabel.style.display = "inline-flex";
    modeLabel.style.gap = "6px";
    modeLabel.style.alignItems = "center";

    const modeToggle = document.createElement("input");
    modeToggle.type = "checkbox";
    modeToggle.checked = mode === "directed";
    modeToggle.onchange = () => {
        const wantDirected = modeToggle.checked;
        if (wantDirected) {
            // Undirected -> Directed: expand each undirected edge into both directions.
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        continue;
                    }
                    if (adj[i][j] || adj[j][i]) {
                        adj[i][j] = true;
                        adj[j][i] = true;
                    }
                }
            }
            mode = "directed";
        } else {
            // Directed -> Undirected: OR-merge each pair then store symmetrically.
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        continue;
                    }
                    const has = adj[i][j] || adj[j][i];
                    adj[i][j] = has;
                    adj[j][i] = has;
                }
            }
            mode = "undirected";
        }
        renderAll();
    };

    const modeText = document.createElement("span");
    modeText.innerText = "directed";
    modeText.style.fontFamily = "ui-monospace, Courier";

    modeLabel.appendChild(modeToggle);
    modeLabel.appendChild(modeText);

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

    const spacer = (w: number) => {
        const s = document.createElement("span");
        s.style.display = "inline-block";
        s.style.width = `${w}px`;
        return s;
    };

    container.appendChild(decBtn);
    container.appendChild(incBtn);
    container.appendChild(sizeLabel);
    container.appendChild(spacer(8));
    container.appendChild(modeLabel);
    container.appendChild(spacer(8));
    container.appendChild(presetLabel);
    container.appendChild(btnPath);
    container.appendChild(btnCycle);
    container.appendChild(btnComplete);
}

function clearEdges(): void {
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            adj[i][j] = false;
        }
    }
}

function setUndirectedEdge(i: number, j: number, value: boolean): void {
    if (i === j) {
        return;
    }
    adj[i][j] = value;
    adj[j][i] = value;
}

function setDirectedEdge(i: number, j: number, value: boolean): void {
    if (i === j) {
        return;
    }
    adj[i][j] = value;
}

function setPathGraph(): void {
    clearEdges();
    for (let i = 0; i + 1 < n; i++) {
        if (mode === "undirected") {
            setUndirectedEdge(i, i + 1, true);
        } else {
            setDirectedEdge(i, i + 1, true);
        }
    }
}

function setCycleGraph(): void {
    clearEdges();
    if (n <= 1) {
        return;
    }
    for (let i = 0; i + 1 < n; i++) {
        if (mode === "undirected") {
            setUndirectedEdge(i, i + 1, true);
        } else {
            setDirectedEdge(i, i + 1, true);
        }
    }
    if (mode === "undirected") {
        if (n > 2) {
            setUndirectedEdge(n - 1, 0, true);
        }
    } else {
        setDirectedEdge(n - 1, 0, true);
    }
}

function setCompleteGraph(): void {
    clearEdges();
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                continue;
            }
            if (mode === "undirected") {
                if (j > i) {
                    setUndirectedEdge(i, j, true);
                }
            } else {
                setDirectedEdge(i, j, true);
            }
        }
    }
}

function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, headLen: number): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const ang = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    const a1 = ang + Math.PI * 0.85;
    const a2 = ang - Math.PI * 0.85;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX + headLen * Math.cos(a1), toY + headLen * Math.sin(a1));
    ctx.lineTo(toX + headLen * Math.cos(a2), toY + headLen * Math.sin(a2));
    ctx.closePath();
    ctx.fill();
}

function drawGraph(canvas: HTMLCanvasElement, basis: ReadonlySet<number>): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.38;
    const nodeR = Math.max(8, Math.min(16, Math.floor(Math.min(w, h) / 35)));

    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
        const theta = -Math.PI / 2 + (2 * Math.PI * i) / n;
        pts.push({ x: cx + R * Math.cos(theta), y: cy + R * Math.sin(theta) });
    }

    // Edges
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.canvasEdge;
    ctx.fillStyle = theme.canvasArrow;

    if (mode === "undirected") {
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
    } else {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    continue;
                }
                if (!adj[i][j]) {
                    continue;
                }
                const a = pts[i];
                const b = pts[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.hypot(dx, dy);
                if (len <= 1e-6) {
                    continue;
                }
                const ux = dx / len;
                const uy = dy / len;
                const fromX = a.x + ux * nodeR;
                const fromY = a.y + uy * nodeR;
                const toX = b.x - ux * nodeR;
                const toY = b.y - uy * nodeR;
                drawArrow(ctx, fromX, fromY, toX, toY, 10);
            }
        }
    }

    // Nodes
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
        ctx.font = `${Math.max(10, nodeR)}px ui-monospace, Courier`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((i + 1).toString(), p.x, p.y);
    }
}

function adjToAdj01Flat(): number[] {
    const flat: number[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            flat.push(adj[i][j] ? 1 : 0);
        }
    }
    return flat;
}

function styleHeaderCell(cell: HTMLTableCellElement, isBasis: boolean): void {
    cell.style.background = isBasis ? theme.basisHeaderBg : theme.headerBg;
    cell.style.color = isBasis ? theme.basisHeaderText : theme.headerText;
    cell.style.fontWeight = "600";
}

function renderAdjacencyTable(adjTable: HTMLTableElement, basis: ReadonlySet<number>): void {
    clearTable(adjTable);
    adjTable.style.alignSelf = "center";
    adjTable.style.textAlign = "center";

    // Header row
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
                cell.innerText = "—";
                cell.style.background = theme.cellDisabled;
                continue;
            }

            const updateCell = () => {
                cell.innerText = adj[i][j] ? "1" : "0";
                cell.style.background = adj[i][j] ? theme.cellOn : theme.cellOff;
            };

            updateCell();

            cell.onclick = () => {
                if (mode === "undirected") {
                    const next = !(adj[i][j] || adj[j][i]);
                    adj[i][j] = next;
                    adj[j][i] = next;
                } else {
                    adj[i][j] = !adj[i][j];
                }
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

function renderDistancesTable(distTable: HTMLTableElement, distFlat: number[], basis: ReadonlySet<number>): void {
    clearTable(distTable);
    distTable.style.alignSelf = "center";
    distTable.style.textAlign = "center";

    // Header row
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
            cell.innerText = d === -1 ? "∞" : d.toString();
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

function renderSummary(graphText: HTMLSpanElement, edgeCount: number, mdText: string): void {
    graphText.innerHTML =
        `Graph on n=${n} vertices (${mode})<br>` +
        `Edges: ${edgeCount}<br>` +
        mdText;
}

function renderAll(): void {
    const { graphText, controls, canvas, adjTable, distTable } = ensureElements();

    renderControls(controls);

    const adj01 = adjToAdj01Flat();
    const directed = mode === "directed";

    const edgeCount = wasmGraphEdgeCount(adj01, n, directed);
    const distFlat = wasmGraphAllPairsDistances(adj01, n, directed);
    const basis = new Set<number>();

    if (directed) {
        renderAdjacencyTable(adjTable, basis);
        renderDistancesTable(distTable, distFlat, basis);
        drawGraph(canvas, basis);
        renderSummary(graphText, edgeCount, "Metric dimension: N/A (undirected only)<br>");
        return;
    }

    const md = wasmGraphMetricDimension(adj01, n);
    for (const v of md.basis) {
        basis.add(v);
    }

    renderAdjacencyTable(adjTable, basis);
    renderDistancesTable(distTable, distFlat, basis);
    drawGraph(canvas, basis);
    renderSummary(
        graphText,
        edgeCount,
        `Metric dimension: ${md.dimension}<br>` +
        `Basis: {${md.basis.map((x) => (x + 1).toString()).join(", ")}}<br>`,
    );
}

initAdj(n);
renderAll();

