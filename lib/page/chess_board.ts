import {
    chessBoardCreate,
    chessBoardDestroy,
    chessBoardGetCellState,
    chessBoardGetExample,
    chessBoardGetMode,
    chessBoardGetSize,
    chessBoardMaxAdditional,
    chessBoardBestCount,
    chessBoardPieceCount,
    chessBoardSetMode,
    chessBoardSetSize,
    chessBoardTryPlace,
    modulePromise,
    type ChessBoardMode,
} from "../tsl/wasm/ts/wasm_api_chess_board";

const CANVAS_ID = "chess-board-canvas";
const SIZE_ID = "chess-board-size";
const SIZE_VALUE_ID = "chess-board-size-value";
const RESET_ID = "chess-board-reset";
const EXAMPLE_TOGGLE_ID = "chess-board-example-toggle";
const UNDO_ID = "chess-board-undo";
const REDO_ID = "chess-board-redo";
const PIECE_COUNT_ID = "chess-board-piece-count";
const MAX_ADD_ID = "chess-board-max-add";
const EXAMPLE_ID = "chess-board-example";
const BEST_COUNT_ID = "chess-board-best-count";
const STATUS_ID = "chess-board-status";
const MODE_BUTTONS: Array<{ id: string; mode: ChessBoardMode; label: string }> = [
    { id: "chess-board-mode-bishop", mode: 0, label: "Bishop" },
    { id: "chess-board-mode-queen", mode: 1, label: "Queen" },
    { id: "chess-board-mode-knight", mode: 2, label: "Knight" },
];

const BOARD_MIN = 4;
const BOARD_MAX = 14;
const BOARD_DEFAULT = 8;

const SAFE_A = "#eef2ff";
const SAFE_B = "#e2e8f0";
const ATTACKED_A = "#fed7d7";
const ATTACKED_B = "#fbcfe8";
const EXAMPLE_COLOR = "rgba(74, 222, 128, 0.95)";

const PIECE_COLORS: Record<ChessBoardMode, string> = {
    0: "#2563eb",
    1: "#dc2626",
    2: "#7c3aed",
};

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let boardSize = BOARD_DEFAULT;
let boardMode: ChessBoardMode = 0;
let exampleCells = new Set<string>();
let showExampleOverlay = false;
let history: { row: number; col: number }[] = [];
let redoStack: { row: number; col: number }[] = [];

function coordKey(row: number, col: number): string {
    return `${row},${col}`;
}

function getCanvasCellSize(): number {
    return canvas.width / boardSize;
}

function updateStats(): void {
    const pieceCountEl = document.getElementById(PIECE_COUNT_ID);
    const maxAddEl = document.getElementById(MAX_ADD_ID);
    const bestCountEl = document.getElementById(BEST_COUNT_ID);
    const exampleEl = document.getElementById(EXAMPLE_ID);
    if (pieceCountEl) {
        pieceCountEl.textContent = `${chessBoardPieceCount()} pieces on board`;
    }
    if (maxAddEl) {
        maxAddEl.textContent = `${chessBoardMaxAdditional()} more pieces can be added`;
    }
    if (bestCountEl) {
        const c = chessBoardBestCount();
        bestCountEl.textContent = c >= 0 ? String(c) : "—";
    }
    if (exampleEl) {
        const example = chessBoardGetExample();
        const coords = example.map((p) => `(${p.row},${p.col})`);
        const preview = coords.slice(0, 16).join(", ");
        exampleEl.textContent = !showExampleOverlay
            ? "Overlay hidden. Toggle it on to preview a completion."
            : coords.length === 0
                ? "No legal completion was returned."
                : `${coords.length} cells: ${preview}${coords.length > 16 ? " ..." : ""}`;
    }
}

function updateStatus(text: string): void {
    const el = document.getElementById(STATUS_ID);
    if (el) {
        el.textContent = text;
    }
}

function drawCell(row: number, col: number): void {
    const cellSize = getCanvasCellSize();
    const x = col * cellSize;
    const y = row * cellSize;
    const state = chessBoardGetCellState(row, col);
    const baseColor = (row + col) % 2 === 0 ? SAFE_A : SAFE_B;
    const attackColor = (row + col) % 2 === 0 ? ATTACKED_A : ATTACKED_B;
    const fill = state === 2 ? PIECE_COLORS[chessBoardGetMode()] : state === 1 ? attackColor : baseColor;

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, cellSize, cellSize);

    if (showExampleOverlay && exampleCells.has(coordKey(row, col)) && state !== 2) {
        ctx.strokeStyle = EXAMPLE_COLOR;
        ctx.lineWidth = Math.max(2, cellSize * 0.05);
        ctx.strokeRect(x + cellSize * 0.1, y + cellSize * 0.1, cellSize * 0.8, cellSize * 0.8);
    }

    if (state === 2) {
        ctx.fillStyle = "white";
        ctx.font = `${Math.floor(cellSize * 0.46)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const glyph = chessBoardGetMode() === 0 ? "B" : chessBoardGetMode() === 1 ? "Q" : "N";
        ctx.fillText(glyph, x + cellSize / 2, y + cellSize / 2 + 1);
    }
}

function drawBoard(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            drawCell(row, col);
        }
    }
    ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= boardSize; i++) {
        const p = Math.round(i * getCanvasCellSize()) + 0.5;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(canvas.width, p);
        ctx.stroke();
    }
}

function refreshExample(): void {
    exampleCells = new Set(chessBoardGetExample().map((p) => coordKey(p.row, p.col)));
}

function redraw(): void {
    refreshExample();
    drawBoard();
    updateStats();
}

function updateModeButtons(): void {
    for (const entry of MODE_BUTTONS) {
        const btn = document.getElementById(entry.id);
        if (btn) {
            btn.classList.toggle("active", entry.mode === boardMode);
        }
    }
}

function resetBoard(size: number, mode: ChessBoardMode): void {
    chessBoardDestroy();
    chessBoardCreate(size, mode);
    boardSize = chessBoardGetSize();
    boardMode = chessBoardGetMode();
    const sizeInput = document.getElementById(SIZE_ID) as HTMLInputElement | null;
    const sizeValue = document.getElementById(SIZE_VALUE_ID);
    if (sizeInput) {
        sizeInput.value = String(boardSize);
    }
    if (sizeValue) {
        sizeValue.textContent = String(boardSize);
    }
    updateModeButtons();
    updateStatus("Board reset.");
    // clear history on full reset
    history = [];
    redoStack = [];
    updateUndoRedoButtons();
    redraw();
}

function placeAtCanvasPoint(x: number, y: number): void {
    const cellSize = getCanvasCellSize();
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
        return;
    }
    const ok = chessBoardTryPlace(row, col);
    if (ok) {
        updateStatus(`Placed ${chessBoardGetMode() === 0 ? "bishop" : chessBoardGetMode() === 1 ? "queen" : "knight"} at (${row},${col}).`);
        history.push({ row, col });
        // new action clears redo history
        redoStack = [];
        updateUndoRedoButtons();
    } else {
        updateStatus(`Illegal placement at (${row},${col}).`);
    }
    redraw();
}

function replayHistory(): void {
    // rebuild board from history
    chessBoardDestroy();
    chessBoardCreate(boardSize, boardMode);
    for (const p of history) {
        chessBoardTryPlace(p.row, p.col);
    }
}

function updateUndoRedoButtons(): void {
    const undoBtn = document.getElementById(UNDO_ID) as HTMLButtonElement | null;
    const redoBtn = document.getElementById(REDO_ID) as HTMLButtonElement | null;
    if (undoBtn) {
        undoBtn.disabled = history.length === 0;
    }
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
    }
}

function bindUi(): void {
    const sizeInput = document.getElementById(SIZE_ID) as HTMLInputElement | null;
    const sizeValue = document.getElementById(SIZE_VALUE_ID);
    if (!sizeInput) {
        throw new Error(`Missing element #${SIZE_ID}`);
    }

    sizeInput.min = String(BOARD_MIN);
    sizeInput.max = String(BOARD_MAX);
    sizeInput.value = String(BOARD_DEFAULT);
    if (sizeValue) {
        sizeValue.textContent = sizeInput.value;
    }

    sizeInput.addEventListener("input", () => {
        if (sizeValue) {
            sizeValue.textContent = sizeInput.value;
        }
    });
    sizeInput.addEventListener("change", () => {
        const nextSize = Math.max(BOARD_MIN, Math.min(BOARD_MAX, Number(sizeInput.value) || BOARD_DEFAULT));
        resetBoard(nextSize, boardMode);
    });

    for (const entry of MODE_BUTTONS) {
        const btn = document.getElementById(entry.id);
        if (!btn) {
            throw new Error(`Missing mode button ${entry.id}`);
        }
        btn.textContent = entry.label;
        btn.addEventListener("click", () => {
            boardMode = entry.mode;
            resetBoard(boardSize, boardMode);
        });
    }

    const resetButton = document.getElementById(RESET_ID);
    if (!resetButton) {
        throw new Error(`Missing reset button #${RESET_ID}`);
    }
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => {
        resetBoard(boardSize, boardMode);
    });

    const undoButton = document.getElementById(UNDO_ID);
    if (!undoButton) {
        throw new Error(`Missing undo button #${UNDO_ID}`);
    }
    undoButton.textContent = "Undo";
    undoButton.addEventListener("click", () => {
        if (history.length === 0) {
            return;
        }
        const last = history.pop()!;
        redoStack.push(last);
        replayHistory();
        updateStatus(`Undid placement at (${last.row},${last.col}).`);
        updateUndoRedoButtons();
        redraw();
    });

    const redoButton = document.getElementById(REDO_ID);
    if (!redoButton) {
        throw new Error(`Missing redo button #${REDO_ID}`);
    }
    redoButton.textContent = "Redo";
    redoButton.addEventListener("click", () => {
        if (redoStack.length === 0) {
            return;
        }
        const next = redoStack.pop()!;
        history.push(next);
        // directly place the redone move
        const ok = chessBoardTryPlace(next.row, next.col);
        updateStatus(ok ? `Redid placement at (${next.row},${next.col}).` : `Redo failed at (${next.row},${next.col}).`);
        updateUndoRedoButtons();
        redraw();
    });
    updateUndoRedoButtons();

    const exampleToggle = document.getElementById(EXAMPLE_TOGGLE_ID) as HTMLInputElement | null;
    if (!exampleToggle) {
        throw new Error(`Missing example toggle #${EXAMPLE_TOGGLE_ID}`);
    }
    exampleToggle.checked = showExampleOverlay;
    exampleToggle.addEventListener("change", () => {
        showExampleOverlay = exampleToggle.checked;
        redraw();
    });

    canvas.addEventListener("click", (evt) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        placeAtCanvasPoint((evt.clientX - rect.left) * scaleX, (evt.clientY - rect.top) * scaleY);
    });

    canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());
}

async function main(): Promise<void> {
    await modulePromise;
    const canvasEl = document.getElementById(CANVAS_ID);
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
        throw new Error(`Missing canvas #${CANVAS_ID}`);
    }
    canvas = canvasEl;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas 2D context unavailable");
    }
    ctx = context;
    bindUi();
    resetBoard(BOARD_DEFAULT, boardMode);
}

void main();
