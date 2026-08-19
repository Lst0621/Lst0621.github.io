import {
    modulePromise,
    SymbolPuzzleDirection,
    SymbolPuzzleMoveStatus,
    symbolPuzzleBoardSize,
    symbolPuzzleCreate,
    symbolPuzzleDestroy,
    symbolPuzzleGetPieceCol,
    symbolPuzzleGetPieceRow,
    symbolPuzzleGetTargetCol,
    symbolPuzzleGetTargetRow,
    symbolPuzzleIsSolved,
    symbolPuzzleMove,
    symbolPuzzleMoveCount,
    symbolPuzzlePieceCount,
    symbolPuzzleReset,
    symbolPuzzleShortestPath,
    symbolPuzzleShortestPathLength,
} from "../tsl/wasm/ts/wasm_api_symbol_puzzle";
import { createLoadingIndicator, type LoadingIndicatorController } from "../tsl/ts/loading_indicator";

const CANVAS_ID = "symbol-puzzle-canvas";
const RESET_ID = "symbol-puzzle-reset";
const STATUS_ID = "symbol-puzzle-status";
const MOVES_ID = "symbol-puzzle-moves";
const GOAL_ID = "symbol-puzzle-goal";
const SELECTED_ID = "symbol-puzzle-selected";
const SOLUTION_TOGGLE_ID = "symbol-puzzle-solution-toggle";
const SOLUTION_ID = "symbol-puzzle-solution";
const SOLUTION_LIST_ID = "symbol-puzzle-solution-list";
const RANDOM_TARGETS_ID = "symbol-puzzle-random-targets";

const DIRECTION_BUTTONS: ReadonlyArray<{ id: string; direction: Direction; label: string }> = [
    { id: "symbol-puzzle-north", direction: SymbolPuzzleDirection.North, label: "north" },
    { id: "symbol-puzzle-east", direction: SymbolPuzzleDirection.East, label: "east" },
    { id: "symbol-puzzle-south", direction: SymbolPuzzleDirection.South, label: "south" },
    { id: "symbol-puzzle-west", direction: SymbolPuzzleDirection.West, label: "west" },
];

type Direction = SymbolPuzzleDirection;

const SHORTEST_SOLUTION: ReadonlyArray<{ piece: number; direction: Direction }> = [
    { piece: 1, direction: SymbolPuzzleDirection.East },
    { piece: 0, direction: SymbolPuzzleDirection.South },
    { piece: 0, direction: SymbolPuzzleDirection.East },
    { piece: 4, direction: SymbolPuzzleDirection.East },
    { piece: 3, direction: SymbolPuzzleDirection.South },
    { piece: 3, direction: SymbolPuzzleDirection.East },
    { piece: 3, direction: SymbolPuzzleDirection.North },
    { piece: 0, direction: SymbolPuzzleDirection.West },
    { piece: 1, direction: SymbolPuzzleDirection.West },
    { piece: 2, direction: SymbolPuzzleDirection.East },
    { piece: 0, direction: SymbolPuzzleDirection.South },
    { piece: 0, direction: SymbolPuzzleDirection.East },
    { piece: 3, direction: SymbolPuzzleDirection.South },
    { piece: 0, direction: SymbolPuzzleDirection.West },
    { piece: 0, direction: SymbolPuzzleDirection.North },
];

const CANVAS_SIZE = 760;
const CANVAS_HEIGHT = 800;
const GRID_X = 50;
const GRID_Y = 80;
const GRID_SIZE = 660;

type Rune = {
    name: string;
    color: string;
    pale: string;
};

// These are original vector glyphs, deliberately unlike the reference image.
const RUNES: readonly Rune[] = [
    { name: "Tide", color: "#14b8c4", pale: "#d5f5f4" },
    { name: "Fork", color: "#8b5cf6", pale: "#ede7ff" },
    { name: "Flare", color: "#f05a7e", pale: "#ffe2e9" },
    { name: "Leaf", color: "#65a30d", pale: "#e9f8cb" },
    { name: "Bolt", color: "#e69a13", pale: "#fff0c9" },
];

type TargetPosition = { row: number; col: number };
let targetPositions: TargetPosition[] = [];
let targetsMode: "fixed" | "random" = "fixed";

function initTargetsFixed(): void {
    const pieces = symbolPuzzlePieceCount();
    targetPositions = Array.from({ length: pieces }, (_, piece) => ({
        row: piece,
        col: piece,
    }));
    targetsMode = "fixed";
}

const MIN_RANDOM_SOLUTION_LENGTH = 12;

let solutionWorker: Worker | null = null;
let solutionRequestId = 0;
let solutionLoadingIndicator: LoadingIndicatorController | null = null;

// Cache the last computed shortest-solution moves so we can avoid re-solving
// when the player follows the exact next move.
let lastComputedSolutionMoves: Array<{ piece: number; direction: Direction }> | null = null;

function startSolutionLoadingAnimation(titleEl: HTMLElement): void {
    if (solutionLoadingIndicator === null) {
        solutionLoadingIndicator = createLoadingIndicator(
            titleEl,
            (frame) => `Shortest solution · ${frame} solving`,
            () => "Shortest solution · solving…",
            { delayMs: 150, tickMs: 100, framePeriodMs: 80 },
        );
    }
    solutionLoadingIndicator.start();
}

function stopSolutionLoadingAnimation(): void {
    solutionLoadingIndicator?.stop();
}

function setSolutionToggleLoading(panel: HTMLElement, isLoading: boolean): void {
    const button = document.getElementById(SOLUTION_TOGGLE_ID) as HTMLButtonElement | null;
    if (!button) return;
    if (!isLoading) {
        const nowVisible = !panel.hidden;
        button.textContent = nowVisible ? "Hide shortest solution" : "Show shortest solution";
        return;
    }
    const nowVisible = !panel.hidden;
    button.textContent = nowVisible ? "Hide shortest solution (solving…)" : "Show shortest solution (solving…)";
}

function randomizeTargets(): void {
    const size = symbolPuzzleBoardSize();
    const pieces = symbolPuzzlePieceCount();

    // The fixed layout is the diagonal: piece i targets (i, i).
    const isFixedDiagonalTargets = (positions: Array<{ row: number; col: number }>): boolean => {
        for (let i = 0; i < pieces; i++) {
            if (positions[i].row !== i || positions[i].col !== i) return false;
        }
        return true;
    };

    const rnd = (): number => {
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            crypto.getRandomValues(arr);
            return arr[0] / 2 ** 32;
        }
        return Math.random();
    };

    const startPositions = Array.from({ length: pieces }, (_, piece) => ({
        row: symbolPuzzleGetPieceRow(piece),
        col: symbolPuzzleGetPieceCol(piece),
    }));

    const directions: Direction[] = [
        SymbolPuzzleDirection.North,
        SymbolPuzzleDirection.East,
        SymbolPuzzleDirection.South,
        SymbolPuzzleDirection.West,
    ];

    // Generate Random Targets by scrambling from the current (reset) state using only
    // legal slide moves. This guarantees the targets are reachable.
    //
    // Note: We intentionally do *not* force a min-solution-length filter here yet;
    // earlier filtering caused Random Targets to collapse to the fixed diagonal in practice.
    const maxAttempts = 30;
    const minScrambleMoves = 180;
    const maxScrambleMoves = 320;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const positions = startPositions.map((p) => ({ ...p }));
        const scrambleMoves = minScrambleMoves + Math.floor(rnd() * (maxScrambleMoves - minScrambleMoves + 1));
        for (let step = 0; step < scrambleMoves; step++) {
            const piece = Math.floor(rnd() * pieces);
            const direction = directions[Math.floor(rnd() * 4)];
            positions[piece] = bfsSlideDestination(positions, piece, direction, size);
        }

        // Reject trivial/no-op layouts.
        const sameAsStart = positions.every((p, i) => p.row === startPositions[i].row && p.col === startPositions[i].col);
        if (sameAsStart) continue;
        if (isFixedDiagonalTargets(positions)) continue;

        targetPositions = positions;
        targetsMode = "random";
        return;
    }

    // Last-resort fallback: do one forced move from the fixed diagonal guard.
    const fallbackPositions = startPositions.map((p) => ({ ...p }));
    fallbackPositions[0] = bfsSlideDestination(
        fallbackPositions,
        0,
        SymbolPuzzleDirection.East,
        size
    );
    if (isFixedDiagonalTargets(fallbackPositions)) {
        // If that somehow still produced the fixed layout, try one more piece move.
        fallbackPositions[1] = bfsSlideDestination(
            fallbackPositions,
            1,
            SymbolPuzzleDirection.East,
            size
        );
    }
    targetPositions = fallbackPositions;
    targetsMode = "random";
}

function puzzleIsSolved(): boolean {
    if (targetPositions.length === 0) {
        return false;
    }
    for (let piece = 0; piece < symbolPuzzlePieceCount(); piece++) {
        if (!pieceOnTarget(piece)) {
            return false;
        }
    }
    return true;
}

type SlideMove = { direction: Direction; row: number; col: number };

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let selectedPiece: number | null = null;
let canvasHasFocus = false;
let activePointerDrag: {
    pointerId: number;
    piece: number;
    startRow: number;
    startCol: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    direction: Direction | null;
} | null = null;
let slideAnimation: {
    piece: number;
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    fromOffsetX: number;
    fromOffsetY: number;
    direction: Direction;
    startTime: number;
    duration: number;
} | null = null;

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
    const r = Math.min(radius, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
}

function drawText(text: string, x: number, y: number, options: {
    color?: string;
    size?: number;
    weight?: number;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    letterSpacing?: number;
} = {}): void {
    const {
        color = "#17243a",
        size = 16,
        weight = 600,
        align = "left",
        baseline = "alphabetic",
        letterSpacing = 0,
    } = options;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (letterSpacing === 0) {
        ctx.fillText(text, x, y);
        return;
    }
    const characters = Array.from(text);
    const width = characters.reduce((total, char) => total + ctx.measureText(char).width, 0)
        + Math.max(0, characters.length - 1) * letterSpacing;
    let cursor = x;
    if (align === "center") {
        cursor -= width / 2;
    } else if (align === "right" || align === "end") {
        cursor -= width;
    }
    for (const character of characters) {
        ctx.fillText(character, cursor, y);
        cursor += ctx.measureText(character).width + letterSpacing;
    }
}

function drawRune(piece: number, centerX: number, centerY: number, size: number, color: string): void {
    const half = size / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size * 0.09);

    switch (piece) {
        case 0: { // Tide
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
                const t = i / 24;
                const x = centerX - half + size * t;
                const y = centerY + Math.sin(t * Math.PI * 4) * size * 0.18;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
                const t = i / 24;
                const x = centerX - half + size * t;
                const y = centerY + size * 0.24 + Math.sin(t * Math.PI * 4) * size * 0.12;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            break;
        }
        case 1: { // Fork
            ctx.beginPath();
            ctx.moveTo(centerX, centerY + half * 0.75);
            ctx.lineTo(centerX, centerY - half * 0.05);
            ctx.lineTo(centerX - half * 0.58, centerY - half * 0.72);
            ctx.moveTo(centerX, centerY - half * 0.05);
            ctx.lineTo(centerX, centerY - half * 0.84);
            ctx.moveTo(centerX, centerY - half * 0.05);
            ctx.lineTo(centerX + half * 0.58, centerY - half * 0.72);
            ctx.stroke();
            break;
        }
        case 2: { // Flare
            ctx.beginPath();
            ctx.moveTo(centerX - half * 0.4, centerY + half * 0.72);
            ctx.bezierCurveTo(centerX - half * 0.72, centerY + half * 0.08, centerX - half * 0.08, centerY - half * 0.15, centerX - half * 0.16, centerY - half * 0.82);
            ctx.bezierCurveTo(centerX + half * 0.5, centerY - half * 0.32, centerX + half * 0.72, centerY + half * 0.04, centerX + half * 0.34, centerY + half * 0.7);
            ctx.bezierCurveTo(centerX + half * 0.05, centerY + half * 0.98, centerX - half * 0.18, centerY + half * 0.98, centerX - half * 0.4, centerY + half * 0.72);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX - half * 0.1, centerY + half * 0.5);
            ctx.bezierCurveTo(centerX - half * 0.25, centerY + half * 0.14, centerX + half * 0.18, centerY + half * 0.02, centerX + half * 0.02, centerY - half * 0.4);
            ctx.stroke();
            break;
        }
        case 3: { // Leaf
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(-0.56);
            ctx.beginPath();
            ctx.moveTo(-half * 0.78, 0);
            ctx.bezierCurveTo(-half * 0.2, -half * 0.86, half * 0.64, -half * 0.64, half * 0.78, 0);
            ctx.bezierCurveTo(half * 0.2, half * 0.86, -half * 0.64, half * 0.64, -half * 0.78, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-half * 0.65, 0);
            ctx.lineTo(half * 0.67, 0);
            ctx.stroke();
            ctx.restore();
            break;
        }
        default: { // Bolt
            ctx.beginPath();
            ctx.moveTo(centerX + half * 0.12, centerY - half * 0.9);
            ctx.lineTo(centerX - half * 0.55, centerY + half * 0.02);
            ctx.lineTo(centerX - half * 0.08, centerY + half * 0.02);
            ctx.lineTo(centerX - half * 0.22, centerY + half * 0.88);
            ctx.lineTo(centerX + half * 0.62, centerY - half * 0.2);
            ctx.lineTo(centerX + half * 0.12, centerY - half * 0.2);
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.restore();
}

function boardCellSize(): number {
    return GRID_SIZE / symbolPuzzleBoardSize();
}

function getElement<T extends HTMLElement>(id: string, type: { new(): T }): T {
    const element = document.getElementById(id);
    if (!element || !(element instanceof type)) {
        throw new Error(`Missing element #${id}`);
    }
    return element;
}

function pieceAt(row: number, col: number): number | null {
    for (let piece = 0; piece < symbolPuzzlePieceCount(); piece++) {
        if (symbolPuzzleGetPieceRow(piece) === row && symbolPuzzleGetPieceCol(piece) === col) {
            return piece;
        }
    }
    return null;
}

function pieceOnTarget(piece: number): boolean {
    const target = targetPositions[piece];
    if (!target) {
        return false;
    }
    return symbolPuzzleGetPieceRow(piece) === target.row
        && symbolPuzzleGetPieceCol(piece) === target.col;
}

function slideDestination(piece: number, direction: Direction): { row: number; col: number } {
    const size = symbolPuzzleBoardSize();
    const rowDelta = direction === SymbolPuzzleDirection.North ? -1
        : direction === SymbolPuzzleDirection.South ? 1 : 0;
    const colDelta = direction === SymbolPuzzleDirection.West ? -1
        : direction === SymbolPuzzleDirection.East ? 1 : 0;
    let row = symbolPuzzleGetPieceRow(piece);
    let col = symbolPuzzleGetPieceCol(piece);
    while (true) {
        const nextRow = row + rowDelta;
        const nextCol = col + colDelta;
        if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size
            || pieceAt(nextRow, nextCol) !== null) {
            break;
        }
        row = nextRow;
        col = nextCol;
    }
    return { row, col };
}

function availableMoves(piece: number): SlideMove[] {
    const row = symbolPuzzleGetPieceRow(piece);
    const col = symbolPuzzleGetPieceCol(piece);
    const moves: SlideMove[] = [];
    for (const direction of [
        SymbolPuzzleDirection.North,
        SymbolPuzzleDirection.East,
        SymbolPuzzleDirection.South,
        SymbolPuzzleDirection.West,
    ]) {
        const destination = slideDestination(piece, direction);
        if (destination.row !== row || destination.col !== col) {
            moves.push({ direction, row: destination.row, col: destination.col });
        }
    }
    return moves;
}

function slidePathCells(piece: number, direction: Direction): Array<{ row: number; col: number }> {
    const size = symbolPuzzleBoardSize();
    const rowDelta = direction === SymbolPuzzleDirection.North ? -1
        : direction === SymbolPuzzleDirection.South ? 1 : 0;
    const colDelta = direction === SymbolPuzzleDirection.West ? -1
        : direction === SymbolPuzzleDirection.East ? 1 : 0;
    const cells: Array<{ row: number; col: number }> = [];
    let row = symbolPuzzleGetPieceRow(piece);
    let col = symbolPuzzleGetPieceCol(piece);
    while (true) {
        const nextRow = row + rowDelta;
        const nextCol = col + colDelta;
        if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size
            || pieceAt(nextRow, nextCol) !== null) {
            break;
        }
        cells.push({ row: nextRow, col: nextCol });
        row = nextRow;
        col = nextCol;
    }
    return cells;
}

function directionForDestination(piece: number, row: number, col: number): Direction | null {
    const pieceRow = symbolPuzzleGetPieceRow(piece);
    const pieceCol = symbolPuzzleGetPieceCol(piece);
    if (row === pieceRow && col === pieceCol) {
        return null;
    }
    for (const move of availableMoves(piece)) {
        const path = slidePathCells(piece, move.direction);
        if (path.some((cell) => cell.row === row && cell.col === col)) {
            return move.direction;
        }
    }
    return null;
}

function cellPixelOrigin(row: number, col: number): { x: number; y: number } {
    const cell = boardCellSize();
    return {
        x: GRID_X + col * cell,
        y: GRID_Y + row * cell,
    };
}

function clampDragOffset(
    piece: number,
    startRow: number,
    startCol: number,
    deltaX: number,
    deltaY: number,
): { offsetX: number; offsetY: number; direction: Direction | null } {
    const cell = boardCellSize();
    const minAxis = cell * 0.04;
    if (Math.abs(deltaX) < minAxis && Math.abs(deltaY) < minAxis) {
        return { offsetX: 0, offsetY: 0, direction: null };
    }
    const direction = Math.abs(deltaX) >= Math.abs(deltaY)
        ? (deltaX >= 0 ? SymbolPuzzleDirection.East : SymbolPuzzleDirection.West)
        : (deltaY >= 0 ? SymbolPuzzleDirection.South : SymbolPuzzleDirection.North);
    const destination = slideDestination(piece, direction);
    if (destination.row === startRow && destination.col === startCol) {
        return { offsetX: 0, offsetY: 0, direction: null };
    }
    const origin = cellPixelOrigin(startRow, startCol);
    const target = cellPixelOrigin(destination.row, destination.col);
    let offsetX = 0;
    let offsetY = 0;
    if (direction === SymbolPuzzleDirection.East) {
        offsetX = Math.max(0, Math.min(target.x - origin.x, deltaX));
    } else if (direction === SymbolPuzzleDirection.West) {
        offsetX = Math.min(0, Math.max(target.x - origin.x, deltaX));
    } else if (direction === SymbolPuzzleDirection.South) {
        offsetY = Math.max(0, Math.min(target.y - origin.y, deltaY));
    } else {
        offsetY = Math.min(0, Math.max(target.y - origin.y, deltaY));
    }
    return { offsetX, offsetY, direction };
}

function shouldCommitDrag(
    piece: number,
    direction: Direction,
    offsetX: number,
    offsetY: number,
): boolean {
    const cell = boardCellSize();
    const row = symbolPuzzleGetPieceRow(piece);
    const col = symbolPuzzleGetPieceCol(piece);
    const destination = slideDestination(piece, direction);
    const totalDistance = Math.max(
        Math.abs(destination.col - col),
        Math.abs(destination.row - row),
    ) * cell;
    const currentDistance = Math.hypot(offsetX, offsetY);
    // Be more permissive: shorter drags should still commit a slide.
    // (Scale with both a small absolute threshold and a smaller fraction of the full slide.)
    return currentDistance >= Math.max(cell * 0.10, totalDistance * 0.05);
}

function easeOutCubic(progress: number): number {
    return 1 - Math.pow(1 - progress, 3);
}

function drawBackground(): void {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#17243a");
    gradient.addColorStop(0.52, "#202e45");
    gradient.addColorStop(1, "#19283d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_HEIGHT);

    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    for (let x = -110; x < CANVAS_SIZE + 120; x += 53) {
        ctx.fillRect(x, 0, 1, CANVAS_HEIGHT);
    }

    drawText("GLYPH GLIDE", 50, 43, { color: "#f9fafb", size: 24, weight: 800, letterSpacing: 1.5 });
    drawText("5 × 5 endpoint slider", 710, 43, { color: "#bbc8d9", size: 13, weight: 700, align: "right", letterSpacing: 0.7 });
}

function drawTarget(piece: number, x: number, y: number, cell: number): void {
    const rune = RUNES[piece];
    roundedRect(ctx, x + 13, y + 13, cell - 26, cell - 26, 18);
    ctx.fillStyle = rune.pale;
    ctx.globalAlpha = 0.58;
    ctx.fill();
    ctx.globalAlpha = 0.68;
    ctx.strokeStyle = rune.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.28;
    drawRune(piece, x + cell / 2, y + cell / 2, cell * 0.49, rune.color);
    ctx.globalAlpha = 1;
}

function drawPiece(
    piece: number,
    x: number,
    y: number,
    cell: number,
    options: { selected?: boolean; lifted?: boolean } = {},
): void {
    const rune = RUNES[piece];
    const isSelected = options.selected ?? selectedPiece === piece;
    const onTarget = pieceOnTarget(piece);
    if (options.lifted) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
    }
    if (isSelected) {
        roundedRect(ctx, x + 6, y + 6, cell - 12, cell - 12, 18);
        ctx.strokeStyle = rune.color;
        ctx.lineWidth = 4;
        ctx.stroke();
    } else if (onTarget) {
        roundedRect(ctx, x + 11, y + 11, cell - 22, cell - 22, 17);
        ctx.strokeStyle = rune.color;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    ctx.save();
    ctx.shadowColor = `${rune.color}8c`;
    ctx.shadowBlur = isSelected || options.lifted ? 24 : 12;
    drawRune(piece, x + cell / 2, y + cell / 2, cell * 0.52, rune.color);
    ctx.restore();
    if (options.lifted) {
        ctx.restore();
    }
}

function drawBoard(): void {
    const size = symbolPuzzleBoardSize();
    const cell = boardCellSize();
    roundedRect(ctx, GRID_X - 12, GRID_Y - 12, GRID_SIZE + 24, GRID_SIZE + 24, 17);
    ctx.fillStyle = "#293a53";
    ctx.fill();
    ctx.strokeStyle = "rgba(225, 236, 247, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const x = GRID_X + col * cell;
            const y = GRID_Y + row * cell;
            ctx.fillStyle = (row + col) % 2 === 0 ? "#f5f0e5" : "#ede7d9";
            ctx.fillRect(x, y, cell, cell);
            ctx.strokeStyle = "rgba(34, 49, 71, 0.28)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        }
    }

    for (let piece = 0; piece < symbolPuzzlePieceCount(); piece++) {
        const target = targetPositions[piece];
        const x = GRID_X + (target?.col ?? 0) * cell;
        const y = GRID_Y + (target?.row ?? 0) * cell;
        drawTarget(piece, x, y, cell);
    }

    const animatingPiece = slideAnimation?.piece ?? null;
    const draggingPiece = activePointerDrag?.piece ?? null;
    const liftedPiece = animatingPiece ?? draggingPiece;

    for (let piece = 0; piece < symbolPuzzlePieceCount(); piece++) {
        if (piece === liftedPiece) {
            continue;
        }
        const x = GRID_X + symbolPuzzleGetPieceCol(piece) * cell;
        const y = GRID_Y + symbolPuzzleGetPieceRow(piece) * cell;
        drawPiece(piece, x, y, cell);
    }

    if (slideAnimation !== null) {
        const animation = slideAnimation;
        const progress = easeOutCubic(
            Math.min(1, (performance.now() - animation.startTime) / animation.duration),
        );
        const fromOrigin = cellPixelOrigin(animation.fromRow, animation.fromCol);
        const toOrigin = cellPixelOrigin(animation.toRow, animation.toCol);
        const startX = fromOrigin.x + animation.fromOffsetX;
        const startY = fromOrigin.y + animation.fromOffsetY;
        const endX = toOrigin.x;
        const endY = toOrigin.y;
        drawPiece(
            animation.piece,
            startX + (endX - startX) * progress,
            startY + (endY - startY) * progress,
            cell,
            { selected: true, lifted: true },
        );
    } else if (activePointerDrag !== null) {
        const drag = activePointerDrag;
        const origin = cellPixelOrigin(drag.startRow, drag.startCol);
        drawPiece(
            drag.piece,
            origin.x + drag.offsetX,
            origin.y + drag.offsetY,
            cell,
            { selected: true, lifted: true },
        );
    }
}

function drawFooter(): void {
    roundedRect(ctx, 50, 755, 660, 28, 12);
    ctx.fillStyle = "rgba(207, 223, 240, 0.12)";
    ctx.fill();
    const message = puzzleIsSolved()
        ? "All five marks are aligned. Puzzle solved."
        : canvasHasFocus
            ? "Arrow keys slide the selected rune. R resets the board."
            : "Select a rune, then drag it or use the arrow pad.";
    drawText(message, 65, 769, { color: "#d7e2ed", size: 12, weight: 650, baseline: "middle" });
}

function draw(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBoard();
    drawFooter();
}

function setStatus(message: string): void {
    getElement(STATUS_ID, HTMLParagraphElement).textContent = message;
}

function directionLabel(direction: Direction): string {
    return ["north", "east", "south", "west"][direction];
}

function updateSelected(): void {
    const element = getElement(SELECTED_ID, HTMLDivElement);
    element.replaceChildren();
    if (selectedPiece === null) {
        element.textContent = "Select a rune";
        return;
    }
    const text = document.createTextNode("Selected: ");
    const name = document.createElement("strong");
    name.textContent = RUNES[selectedPiece].name;
    const suffix = document.createTextNode(pieceOnTarget(selectedPiece) ? " · on target" : "");
    element.append(text, name, suffix);
}

function updateStatusPanel(): void {
    const moves = getElement(MOVES_ID, HTMLParagraphElement);
    const goal = getElement(GOAL_ID, HTMLParagraphElement);
    if (puzzleIsSolved()) {
        moves.textContent = `Solved in ${symbolPuzzleMoveCount()} moves.`;
        goal.textContent = "Every rune is resting on its matching etched mark.";
        return;
    }
    moves.textContent = `${symbolPuzzleMoveCount()} ${symbolPuzzleMoveCount() === 1 ? "move" : "moves"} made`;
    const placed = Array.from({ length: symbolPuzzlePieceCount() }, (_, piece) => pieceOnTarget(piece)).filter(Boolean).length;
    goal.textContent = `${placed} of ${symbolPuzzlePieceCount()} runes on their marks.`;
}

function updateControls(): void {
    const locked = puzzleIsSolved() || selectedPiece === null || slideAnimation !== null;
    for (const entry of DIRECTION_BUTTONS) {
        getElement(entry.id, HTMLButtonElement).disabled = locked;
    }
    getElement(RESET_ID, HTMLButtonElement).disabled = slideAnimation !== null;
}

function refresh(): void {
    draw();
    updateSelected();
    updateStatusPanel();
    updateControls();
}

function beginSlideAnimation(
    piece: number,
    direction: Direction,
    fromOffsetX = 0,
    fromOffsetY = 0,
): void {
    const row = symbolPuzzleGetPieceRow(piece);
    const col = symbolPuzzleGetPieceCol(piece);
    const destination = slideDestination(piece, direction);
    slideAnimation = {
        piece,
        fromRow: row,
        fromCol: col,
        toRow: destination.row,
        toCol: destination.col,
        fromOffsetX,
        fromOffsetY,
        direction,
        startTime: performance.now(),
        duration: 190,
    };
    selectedPiece = piece;
    requestAnimationFrame(tickSlideAnimation);
    draw();
    updateControls();
}

function finishSlideAnimation(): void {
    if (slideAnimation === null) {
        return;
    }
    const { piece, direction } = slideAnimation;
    slideAnimation = null;
    selectedPiece = piece;
    tryMove(direction);
}

function tickSlideAnimation(now: number): void {
    if (slideAnimation === null) {
        return;
    }
    const progress = (now - slideAnimation.startTime) / slideAnimation.duration;
    draw();
    if (progress < 1) {
        requestAnimationFrame(tickSlideAnimation);
        return;
    }
    finishSlideAnimation();
}

function tryMove(direction: Direction): void {
    if (selectedPiece === null) {
        setStatus("Select a rune before choosing a direction.");
        return;
    }
    if (puzzleIsSolved()) {
        setStatus("The puzzle is solved. Reset it to play again.");
        return;
    }
    const moveStatus = symbolPuzzleMove(selectedPiece, direction);
    const moved = moveStatus === SymbolPuzzleMoveStatus.Ok || moveStatus === SymbolPuzzleMoveStatus.Solved;
    if (!moved) {
        setStatus(`${RUNES[selectedPiece].name} cannot move ${directionLabel(direction)}; it is already stopped.`);
    } else if (puzzleIsSolved()) {
        setStatus(`Solved! ${RUNES[selectedPiece].name} completed the last target.`);
    } else {
        setStatus(`${RUNES[selectedPiece].name} glided ${directionLabel(direction)} until it stopped.`);
    }

    // Optimization: if we're in Random Targets mode and the move matches the
    // first step of the currently displayed shortest solution, we can just
    // drop that first move without re-searching.
    if (moved && targetsMode === "random" && lastComputedSolutionMoves && lastComputedSolutionMoves.length > 0) {
        const first = lastComputedSolutionMoves[0];
        if (first.piece === selectedPiece && first.direction === direction) {
            lastComputedSolutionMoves = lastComputedSolutionMoves.slice(1);
            const panel = getElement(SOLUTION_ID, HTMLElement);
            const titleEl = panel.querySelector<HTMLElement>(".solution-title");
            const copyEl = panel.querySelector<HTMLElement>(".solution-copy");
            const list = getElement(SOLUTION_LIST_ID, HTMLOListElement);
            const remaining = lastComputedSolutionMoves;
            if (titleEl) {
                const n = remaining.length;
                titleEl.textContent = n === 0 ? "Shortest solution · solved" : `Shortest solution · ${n} moves`;
            }
            list.replaceChildren(...remaining.map((move) => {
                const item = document.createElement("li");
                item.textContent = `${RUNES[move.piece].name} ${directionLabel(move.direction)}`;
                return item;
            }));
            if (copyEl) {
                copyEl.textContent = "These moves solve the board from current state.";
            }
            refresh();
            return;
        }
    }

    updateShortestSolutionForCurrentState();
    refresh();
}

function resetPuzzle(doRandomizeTargets = true): void {
    selectedPiece = null;
    activePointerDrag = null;
    slideAnimation = null;
    symbolPuzzleReset();
    if (doRandomizeTargets && targetsMode === "random") {
        randomizeTargets();
    }
    setStatus("Board reset. Pick a rune to begin again.");
    updateShortestSolutionForCurrentState();
    refresh();
}

function canvasPoint(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function canvasCell(event: { clientX: number; clientY: number }): { row: number; col: number } | null {
    const { x, y } = canvasPoint(event);
    const cell = boardCellSize();
    const col = Math.floor((x - GRID_X) / cell);
    const row = Math.floor((y - GRID_Y) / cell);
    const size = symbolPuzzleBoardSize();
    if (row < 0 || row >= size || col < 0 || col >= size) {
        return null;
    }
    return { row, col };
}

function renderShortestSolution(): void {
    const list = getElement(SOLUTION_LIST_ID, HTMLOListElement);
    const moves = SHORTEST_SOLUTION.map((move) => {
        const item = document.createElement("li");
        item.textContent = `${RUNES[move.piece].name} ${directionLabel(move.direction)}`;
        return item;
    });
    list.replaceChildren(...moves);
}

function stateSignatureFromCurrent(): string {
    const pieces = symbolPuzzlePieceCount();
    return Array.from({ length: pieces }, (_, piece) => {
        const row = symbolPuzzleGetPieceRow(piece);
        const col = symbolPuzzleGetPieceCol(piece);
        return `${row},${col}`;
    }).join("|");
}

function stateSignatureAfterPrefix(prefixLen: number): string {
    const pieces = symbolPuzzlePieceCount();
    const size = symbolPuzzleBoardSize();

    // Initial positions for this fixed puzzle: (row=piece, col=0).
    const positions = Array.from({ length: pieces }, (_, piece) => ({
        row: piece,
        col: 0,
    }));

    const deltaForDirection = (direction: Direction): { rowDelta: number; colDelta: number } => {
        switch (direction) {
            case SymbolPuzzleDirection.North:
                return { rowDelta: -1, colDelta: 0 };
            case SymbolPuzzleDirection.East:
                return { rowDelta: 0, colDelta: 1 };
            case SymbolPuzzleDirection.South:
                return { rowDelta: 1, colDelta: 0 };
            case SymbolPuzzleDirection.West:
                return { rowDelta: 0, colDelta: -1 };
        }
    };

    for (let i = 0; i < prefixLen; i++) {
        const move = SHORTEST_SOLUTION[i];
        const { rowDelta, colDelta } = deltaForDirection(move.direction);
        const movedPiece = move.piece;
        const start = positions[movedPiece];
        let destination = { ...start };

        while (true) {
            const nextRow = destination.row + rowDelta;
            const nextCol = destination.col + colDelta;
            if (
                nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size
                || positions.some((p, piece) => piece !== movedPiece && p.row === nextRow && p.col === nextCol)
            ) {
                break;
            }
            destination = { row: nextRow, col: nextCol };
        }

        positions[movedPiece] = destination;
    }

    return positions.map((p) => `${p.row},${p.col}`).join("|");
}

type BfsPos = ReadonlyArray<{ row: number; col: number }>;

function bfsSlideDestination(
    positions: BfsPos,
    piece: number,
    direction: Direction,
    size: number,
): { row: number; col: number } {
    const rowDelta = direction === SymbolPuzzleDirection.North ? -1
        : direction === SymbolPuzzleDirection.South ? 1 : 0;
    const colDelta = direction === SymbolPuzzleDirection.West ? -1
        : direction === SymbolPuzzleDirection.East ? 1 : 0;
    let row = positions[piece].row;
    let col = positions[piece].col;
    while (true) {
        const nr = row + rowDelta;
        const nc = col + colDelta;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
            break;
        }
        if (positions.some((p, i) => i !== piece && p.row === nr && p.col === nc)) {
            break;
        }
        row = nr;
        col = nc;
    }
    return { row, col };
}

function updateShortestSolutionForCurrentState(): void {
    const panel = getElement(SOLUTION_ID, HTMLElement);
    const titleEl = panel.querySelector<HTMLElement>(".solution-title");
    const copyEl = panel.querySelector<HTMLElement>(".solution-copy");
    const list = getElement(SOLUTION_LIST_ID, HTMLOListElement);

    // If we're recomputing (or switching back to the fast fixed-prefix path),
    // ensure any in-flight worker can't overwrite the UI later.
    if (solutionWorker) {
        try {
            solutionWorker.terminate();
        } catch {}
        solutionWorker = null;
    }
    stopSolutionLoadingAnimation();
    setSolutionToggleLoading(panel, false);
    lastComputedSolutionMoves = null;

    if (targetsMode === "fixed") {
        const currentSig = stateSignatureFromCurrent();
        const fullLen = SHORTEST_SOLUTION.length;
        let bestPrefixLen = -1;
        for (let k = fullLen; k >= 0; k--) {
            if (stateSignatureAfterPrefix(k) === currentSig) {
                bestPrefixLen = k;
                break;
            }
        }
        if (bestPrefixLen >= 0) {
            const remaining = SHORTEST_SOLUTION.slice(bestPrefixLen);
            lastComputedSolutionMoves = remaining;
            list.replaceChildren(...remaining.map((move) => {
                const item = document.createElement("li");
                item.textContent = `${RUNES[move.piece].name} ${directionLabel(move.direction)}`;
                return item;
            }));
            if (titleEl) {
                const n = remaining.length;
                titleEl.textContent = n === 0 ? "Shortest solution · solved" : `Shortest solution · ${n} moves`;
            }
            if (copyEl) {
                copyEl.textContent = "These moves solve the board from current state.";
            }
            return;
        }
    }

    // Off the fixed precomputed path (or in random mode): compute shortest path
    // in a Web Worker so the UI never freezes.
    const count = symbolPuzzlePieceCount();
    const startPositions = Array.from({ length: count }, (_, piece) => ({
        row: symbolPuzzleGetPieceRow(piece),
        col: symbolPuzzleGetPieceCol(piece),
    }));

    if (titleEl) {
        startSolutionLoadingAnimation(titleEl);
    }
    setSolutionToggleLoading(panel, true);
    if (copyEl) {
        copyEl.textContent = "Searching shortest solution…";
    }
    // Keep a tiny placeholder so the panel doesn't look empty while loading.
    list.replaceChildren();
    const placeholder = document.createElement("li");
    placeholder.textContent = "…";
    list.appendChild(placeholder);

    const requestId = ++solutionRequestId;
    solutionWorker = new Worker("/assets/js/page/symbol_puzzle_solution_worker.js", { type: "module" });
    solutionWorker.onmessage = (ev: MessageEvent) => {
        const msg = ev.data as any;
        if (!msg) return;
        if (msg.type === "debug") {
            // Keep this in console so you can watch solving progress.
            // Example: [SymbolPuzzleSolver 12] solve_start ...
            if (msg.requestId === requestId) {
                // eslint-disable-next-line no-console
                console.log(`[SymbolPuzzleSolver ${requestId}] ${msg.stage}${msg.message ? `: ${msg.message}` : ""}`);
            }
            return;
        }
        if (msg.requestId !== requestId) return;

        stopSolutionLoadingAnimation();
        setSolutionToggleLoading(panel, false);
        solutionWorker = null;

        if (msg.error) {
            lastComputedSolutionMoves = null;
            if (titleEl) {
                titleEl.textContent = "Shortest solution · too complex";
            }
            if (copyEl) {
                copyEl.textContent = "This layout is too complex to solve automatically. Try resetting for a new random layout.";
            }
            list.replaceChildren();
            return;
        }

        const moves = msg.moves as Array<{ piece: number; direction: number }>;
        const solutionMoves = moves.map((move) => ({
            piece: move.piece,
            direction: move.direction as Direction,
        }));
        lastComputedSolutionMoves = solutionMoves;
        if (titleEl) {
            const n = solutionMoves.length;
            titleEl.textContent = n === 0 ? "Shortest solution · solved" : `Shortest solution · ${n} moves`;
        }
        list.replaceChildren(...solutionMoves.map((move) => {
            const item = document.createElement("li");
            item.textContent = `${RUNES[move.piece].name} ${directionLabel(move.direction)}`;
            return item;
        }));
        if (copyEl) {
            copyEl.textContent = "These moves solve the board from current state.";
        }
    };

    solutionWorker.onerror = () => {
        stopSolutionLoadingAnimation();
        setSolutionToggleLoading(panel, false);
        solutionWorker = null;
        lastComputedSolutionMoves = null;
        if (titleEl) {
            titleEl.textContent = "Shortest solution · too complex";
        }
        if (copyEl) {
            copyEl.textContent = "Shortest-solution worker failed. Try resetting.";
        }
        list.replaceChildren();
    };

    solutionWorker.postMessage({
        cmd: "solve",
        requestId,
        startPositions,
        targetPositions,
        maxStates: 5_000_000,
    } satisfies any);
}

function toggleShortestSolution(): void {
    const panel = getElement(SOLUTION_ID, HTMLElement);
    const button = getElement(SOLUTION_TOGGLE_ID, HTMLButtonElement);
    const nowVisible = panel.hidden;
    panel.hidden = !nowVisible;
    button.setAttribute("aria-expanded", String(nowVisible));
    button.textContent = nowVisible ? "Hide shortest solution" : "Show shortest solution";
}

function bindUi(): void {
    getElement(RESET_ID, HTMLButtonElement).addEventListener("click", () => resetPuzzle());
    getElement(SOLUTION_TOGGLE_ID, HTMLButtonElement).addEventListener("click", toggleShortestSolution);
    const randomTargetsToggle = getElement(RANDOM_TARGETS_ID, HTMLInputElement);
    // Use `input` instead of `change` so the checkbox `checked` value is updated
    // reliably when the handler runs.
    randomTargetsToggle.addEventListener("input", () => {
        targetsMode = randomTargetsToggle.checked ? "random" : "fixed";
        if (targetsMode === "fixed") {
            initTargetsFixed();
        } else {
            randomizeTargets();
        }
        // We already generated the targets above; just reset the pieces/state.
        resetPuzzle(false);
    });
    for (const entry of DIRECTION_BUTTONS) {
        getElement(entry.id, HTMLButtonElement).addEventListener("click", () => tryMove(entry.direction));
    }
    canvas.addEventListener("pointerdown", (event) => {
        if (slideAnimation !== null) {
            return;
        }
        if (activePointerDrag !== null) {
            if (activePointerDrag.pointerId === event.pointerId) {
                return;
            }
            activePointerDrag = null;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        if (puzzleIsSolved()) {
            canvas.focus();
            setStatus("The puzzle is solved. Reset it to play again.");
            return;
        }
        const cell = canvasCell(event);
        if (!cell) {
            return;
        }
        canvas.focus();
        const piece = pieceAt(cell.row, cell.col);
        if (piece === null) {
            if (selectedPiece !== null) {
                const direction = directionForDestination(selectedPiece, cell.row, cell.col);
                if (direction !== null) {
                    beginSlideAnimation(selectedPiece, direction);
                    return;
                }
            }
            setStatus(selectedPiece === null
                ? "That cell is empty. Tap a rune to select it."
                : "That cell is not a valid slide target for the selected rune.");
            return;
        }
        selectedPiece = piece;
        const point = canvasPoint(event);
        activePointerDrag = {
            pointerId: event.pointerId,
            piece,
            startRow: cell.row,
            startCol: cell.col,
            startX: point.x,
            startY: point.y,
            offsetX: 0,
            offsetY: 0,
            direction: null,
        };
        canvas.setPointerCapture(event.pointerId);
        setStatus(`${RUNES[piece].name} selected. Drag it in a direction to slide it.`);
        refresh();
    });
    canvas.addEventListener("pointermove", (event) => {
        const drag = activePointerDrag;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        const point = canvasPoint(event);
        const deltaX = point.x - drag.startX;
        const deltaY = point.y - drag.startY;
        const clamped = clampDragOffset(drag.piece, drag.startRow, drag.startCol, deltaX, deltaY);
        drag.offsetX = clamped.offsetX;
        drag.offsetY = clamped.offsetY;
        drag.direction = clamped.direction;
        draw();
    });
    canvas.addEventListener("pointerup", (event) => {
        const drag = activePointerDrag;
        if (!drag) {
            return;
        }
        activePointerDrag = null;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
        selectedPiece = drag.piece;
        if (drag.direction !== null
            && shouldCommitDrag(drag.piece, drag.direction, drag.offsetX, drag.offsetY)) {
            beginSlideAnimation(
                drag.piece,
                drag.direction,
                drag.offsetX,
                drag.offsetY,
            );
            return;
        }
        refresh();
    });
    window.addEventListener("pointerup", () => {
        if (activePointerDrag === null) {
            return;
        }
        selectedPiece = activePointerDrag.piece;
        activePointerDrag = null;
        refresh();
    });
    canvas.addEventListener("pointercancel", (event) => {
        if (activePointerDrag?.pointerId === event.pointerId) {
            activePointerDrag = null;
        }
    });
    canvas.addEventListener("lostpointercapture", (event) => {
        if (activePointerDrag?.pointerId === event.pointerId) {
            activePointerDrag = null;
        }
    });
    canvas.addEventListener("focus", () => {
        canvasHasFocus = true;
        draw();
    });
    canvas.addEventListener("blur", () => {
        canvasHasFocus = false;
        draw();
    });
    canvas.addEventListener("keydown", (event) => {
        const directions: Record<string, Direction> = {
            ArrowUp: SymbolPuzzleDirection.North,
            ArrowRight: SymbolPuzzleDirection.East,
            ArrowDown: SymbolPuzzleDirection.South,
            ArrowLeft: SymbolPuzzleDirection.West,
        };
        if (event.key in directions) {
            event.preventDefault();
            tryMove(directions[event.key]);
            return;
        }
        if (event.key.toLowerCase() === "r") {
            event.preventDefault();
            resetPuzzle();
        }
    });
}

async function main(): Promise<void> {
    await modulePromise;
    canvas = getElement(CANVAS_ID, HTMLCanvasElement);
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas 2D context is unavailable.");
    }
    ctx = context;
    symbolPuzzleCreate();
    initTargetsFixed();
    updateShortestSolutionForCurrentState();
    bindUi();
    setStatus("Select a rune and send it to an edge or another rune.");
    refresh();
    window.addEventListener("pagehide", (event) => {
        if (!event.persisted) {
            symbolPuzzleDestroy();
        }
    });
}

void main().catch((error: unknown) => {
    console.error("Glyph Glide failed to start", error);
    const status = document.getElementById(STATUS_ID);
    if (status) {
        status.textContent = "The puzzle engine could not start. Reload the page and try again.";
    }
});
