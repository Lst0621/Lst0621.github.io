import {
    applyMove,
    cloneState,
    isLegalMove,
    isSolved,
    transferCount,
    type ColorId,
    type Move,
    type PuzzleState,
} from "../water_sort/model.js";
import { solve } from "../water_sort/solver.js";
import {
    MAX_WATER_SORT_CAPACITY,
    MAX_WATER_SORT_COLOR_COUNT,
    MIN_WATER_SORT_CAPACITY,
    MIN_WATER_SORT_COLOR_COUNT,
    WATER_SORT_EMPTY_BOTTLE_COUNT,
    decodeLevelCode,
    difficultyOptionsForBoard,
    encodeLevelCode,
    generateLevel,
    type DifficultyName,
    type GeneratedLevel,
    type GeneratorOptions,
    type ResolvedGeneratorOptions,
} from "../water_sort/generator.js";
import { createLoadingIndicator, type LoadingIndicatorController } from "../tsl/ts/loading_indicator.js";

const CANVAS_ID = "water-sort-canvas";
const STATUS_ID = "water-sort-status";
const MOVES_ID = "water-sort-moves";
const OPTIMAL_ID = "water-sort-optimal";
const VISITED_ID = "water-sort-visited";
const LEVEL_ID = "water-sort-level";
const CAPACITY_ID = "water-sort-capacity";
const COLOR_COUNT_ID = "water-sort-color-count";
const SETUP_CONTEXT_ID = "water-sort-setup-context";
const UNDO_ID = "water-sort-undo";
const RESTART_ID = "water-sort-restart";
const HINT_ID = "water-sort-hint";
const BEST_SOLUTION_TOGGLE_ID = "water-sort-best-solution-toggle";
const BEST_SOLUTION_ID = "water-sort-best-solution";
const BEST_SOLUTION_TITLE_ID = "water-sort-best-solution-title";
const BEST_SOLUTION_SUMMARY_ID = "water-sort-best-solution-summary";
const BEST_SOLUTION_LIST_ID = "water-sort-best-solution-list";
const NEW_ID = "water-sort-new";
const LEVEL_CODE_ID = "water-sort-level-code";
const COPY_CODE_ID = "water-sort-copy-code";
const LOAD_CODE_ID = "water-sort-load-code";

const LOGICAL_WIDTH = 1080;
const LOGICAL_HEIGHT = 720;
const POUR_DURATION_MS = 660;
const INVALID_FEEDBACK_MS = 620;
const MIN_CAPACITY = MIN_WATER_SORT_CAPACITY;
const MAX_CAPACITY = MAX_WATER_SORT_CAPACITY;
const MIN_COLOR_COUNT = MIN_WATER_SORT_COLOR_COUNT;
const MAX_COLOR_COUNT = MAX_WATER_SORT_COLOR_COUNT;
const EMPTY_BOTTLE_COUNT = WATER_SORT_EMPTY_BOTTLE_COUNT;

type Difficulty = DifficultyName;

type ColorPresentation = {
    name: string;
    color: string;
    light: string;
    dark: string;
};

type BottleGeometry = {
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
    neckHeight: number;
    innerX: number;
    innerY: number;
    innerWidth: number;
    innerHeight: number;
};

type PendingPour = {
    before: PuzzleState;
    after: PuzzleState;
    move: Move;
    movedColor: ColorId;
    movedCount: number;
    startedAt: number;
};

type InvalidFeedback = {
    index: number;
    expiresAt: number;
};

type LevelMetrics = {
    optimalMoves: number | null;
    statesVisited: number | null;
};

type BoardSetup = {
    capacity: number;
    colorCount: number;
    emptyBottleCount: typeof EMPTY_BOTTLE_COUNT;
};

const COLORS: readonly ColorPresentation[] = [
    { name: "Coral", color: "#ec6a71", light: "#ffb1a5", dark: "#bd3e50" },
    { name: "Cobalt", color: "#3775d6", light: "#8fc8ff", dark: "#234b9d" },
    { name: "Moss", color: "#55a87a", light: "#a6e4a9", dark: "#2c755b" },
    { name: "Amber", color: "#edab3e", light: "#ffe39b", dark: "#bf711e" },
    { name: "Violet", color: "#8d6ad9", light: "#d7bbff", dark: "#6041a5" },
    { name: "Berry", color: "#cf5f9f", light: "#ffa8d5", dark: "#993d78" },
    { name: "Lagoon", color: "#2aa9b5", light: "#8de7e7", dark: "#177784" },
    { name: "Tangerine", color: "#e78038", light: "#ffc083", dark: "#b85322" },
];

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let currentState: PuzzleState | null = null;
let initialState: PuzzleState | null = null;
let history: PuzzleState[] = [];
let selectedBottle: number | null = null;
let hoveredBottle: number | null = null;
let invalidFeedback: InvalidFeedback | null = null;
let hintMove: Move | null = null;
let pendingPour: PendingPour | null = null;
let pointerPress: { pointerId: number; bottle: number | null } | null = null;
let currentDifficulty: Difficulty = "easy";
let currentOptions: ResolvedGeneratorOptions | null = null;
let currentMetrics: LevelMetrics = { optimalMoves: null, statesVisited: null };
let generating = false;
let findingHint = false;
let findingBestSolution = false;
let bestSolutionVersion = 0;
let bestSolutionRequest = 0;
let bestSolutionRefreshDeferred = false;
let bestSolutionLoadingIndicator: LoadingIndicatorController | null = null;
let lastComputedSolutionMoves: Move[] | null = null;

function getElement<T extends HTMLElement>(id: string, type: { new(): T }): T {
    const element = document.getElementById(id);
    if (!element || !(element instanceof type)) {
        throw new Error(`Missing Water Sort element #${id}`);
    }
    return element;
}

function getCanvas(): HTMLCanvasElement {
    return getElement(CANVAS_ID, HTMLCanvasElement);
}

function getButton(id: string): HTMLButtonElement {
    return getElement(id, HTMLButtonElement);
}

function getStatus(): HTMLElement {
    return getElement(STATUS_ID, HTMLElement);
}

function getInput(): HTMLInputElement {
    return getElement(LEVEL_CODE_ID, HTMLInputElement);
}

function getSelect(id: string): HTMLSelectElement {
    return getElement(id, HTMLSelectElement);
}

function colorFor(colorId: ColorId): ColorPresentation {
    return COLORS[Math.abs(colorId) % COLORS.length];
}

function numberText(value: number | null): string {
    return value === null ? "—" : value.toLocaleString();
}

function setText(id: string, value: string): void {
    getElement(id, HTMLElement).textContent = value;
}

function setStatus(message: string): void {
    getStatus().textContent = message;
}

function selectedBoardSetup(): BoardSetup {
    return {
        capacity: Number(getSelect(CAPACITY_ID).value),
        colorCount: Number(getSelect(COLOR_COUNT_ID).value),
        emptyBottleCount: EMPTY_BOTTLE_COUNT,
    };
}

function boardSetupError(setup: BoardSetup): string | null {
    if (!Number.isInteger(setup.capacity) || setup.capacity < MIN_CAPACITY || setup.capacity > MAX_CAPACITY) {
        return `Choose between ${MIN_CAPACITY} and ${MAX_CAPACITY} layers per bottle.`;
    }
    if (!Number.isInteger(setup.colorCount) || setup.colorCount < MIN_COLOR_COUNT || setup.colorCount > MAX_COLOR_COUNT) {
        return `Choose between ${MIN_COLOR_COUNT} and ${MAX_COLOR_COUNT} colored bottles.`;
    }
    return null;
}

function setupSummary(setup: BoardSetup): string {
    const totalBottles = setup.colorCount + setup.emptyBottleCount;
    const bottleWord = totalBottles === 1 ? "bottle" : "bottles";
    const layerWord = setup.capacity === 1 ? "layer" : "layers";
    return `${setup.colorCount} colored bottles × ${setup.capacity} ${layerWord} + 1 empty spare = ${totalBottles} ${bottleWord}.`;
}

function updateSetupContext(): string | null {
    const setup = selectedBoardSetup();
    const error = boardSetupError(setup);
    const context = getElement(SETUP_CONTEXT_ID, HTMLElement);
    context.dataset.invalid = String(error !== null);
    context.textContent = error
        ?? `${setupSummary(setup)} The empty spare is fixed.`;
    return error;
}

function boardSetupErrorForOptions(options: Pick<GeneratorOptions, "capacity" | "colorCount" | "emptyBottleCount">): string | null {
    if (options.emptyBottleCount !== EMPTY_BOTTLE_COUNT) {
        return "This game uses exactly one empty spare bottle.";
    }
    return boardSetupError({
        capacity: options.capacity ?? Number.NaN,
        colorCount: options.colorCount ?? Number.NaN,
        emptyBottleCount: EMPTY_BOTTLE_COUNT,
    });
}

function setBoardSetup(options: Pick<ResolvedGeneratorOptions, "capacity" | "colorCount" | "emptyBottleCount">): void {
    const error = boardSetupErrorForOptions(options);
    if (error !== null) throw new Error(error);
    getSelect(CAPACITY_ID).value = String(options.capacity);
    getSelect(COLOR_COUNT_ID).value = String(options.colorCount);
    updateSetupContext();
}

function generationOptionsFor(
    difficulty: Difficulty,
    seed: number,
    setup: BoardSetup,
): GeneratorOptions {
    return {
        ...difficultyOptionsForBoard(difficulty, {
            colorCount: setup.colorCount,
            capacity: setup.capacity,
        }),
        seed,
    };
}

function bestSolutionPanel(): HTMLElement {
    return getElement(BEST_SOLUTION_ID, HTMLElement);
}

function bestSolutionPanelIsOpen(): boolean {
    return !bestSolutionPanel().hidden;
}

function formatSolutionMove(move: Move): string {
    return move.count === undefined
        ? `Pour bottle ${move.from + 1} into bottle ${move.to + 1}.`
        : `Pour ${move.count} layer${move.count === 1 ? "" : "s"} from bottle ${move.from + 1} into bottle ${move.to + 1}.`;
}

function movesMatchForState(state: PuzzleState, played: Move, expected: Move): boolean {
    if (played.from !== expected.from || played.to !== expected.to) return false;
    return transferCount(state, played) === transferCount(state, expected);
}

function renderSolutionList(moves: readonly Move[]): void {
    const list = getElement(BEST_SOLUTION_LIST_ID, HTMLOListElement);
    list.replaceChildren(...moves.map((move) => {
        const item = document.createElement("li");
        item.textContent = formatSolutionMove(move);
        return item;
    }));
}

function setSolutionLoadingPlaceholder(): void {
    const list = getElement(BEST_SOLUTION_LIST_ID, HTMLOListElement);
    list.replaceChildren();
    const placeholder = document.createElement("li");
    placeholder.textContent = "…";
    list.appendChild(placeholder);
}

function startBestSolutionLoadingAnimation(): void {
    const titleEl = getElement(BEST_SOLUTION_TITLE_ID, HTMLElement);
    if (bestSolutionLoadingIndicator === null) {
        bestSolutionLoadingIndicator = createLoadingIndicator(
            titleEl,
            (frame) => `Best solution · ${frame} solving`,
            () => "Best solution · solving…",
            { delayMs: 150, tickMs: 100, framePeriodMs: 80 },
        );
    }
    bestSolutionLoadingIndicator.start();
}

function stopBestSolutionLoadingAnimation(): void {
    bestSolutionLoadingIndicator?.stop();
}

function setBestSolutionToggleLoading(isLoading: boolean): void {
    const toggle = getButton(BEST_SOLUTION_TOGGLE_ID);
    const isOpen = bestSolutionPanelIsOpen();
    if (!isLoading) {
        toggle.textContent = isOpen ? "Hide best solution" : "Show best solution";
        return;
    }
    toggle.textContent = isOpen ? "Hide best solution (solving…)" : "Show best solution (solving…)";
}

function displayCachedSolution(copy = "These moves solve the board from the current state."): void {
    const moves = lastComputedSolutionMoves ?? [];
    const titleEl = getElement(BEST_SOLUTION_TITLE_ID, HTMLElement);
    const copyEl = getElement(BEST_SOLUTION_SUMMARY_ID, HTMLElement);
    const moveCount = moves.length;
    titleEl.textContent = moveCount === 0
        ? "Best solution · sorted"
        : `Best solution · ${moveCount} ${moveCount === 1 ? "pour" : "pours"}`;
    copyEl.textContent = copy;
    renderSolutionList(moves);
}

function setBestSolutionContent(
    title: string,
    copy: string,
    moves: readonly Move[] = [],
    options: { cache?: boolean; loading?: boolean } = {},
): void {
    const panel = bestSolutionPanel();
    panel.setAttribute("aria-busy", String(options.loading === true));
    if (options.cache !== false && moves.length > 0) {
        lastComputedSolutionMoves = [...moves];
    }
    if (options.loading) {
        startBestSolutionLoadingAnimation();
        setBestSolutionToggleLoading(true);
        setText(BEST_SOLUTION_SUMMARY_ID, copy);
        setSolutionLoadingPlaceholder();
        return;
    }
    stopBestSolutionLoadingAnimation();
    setBestSolutionToggleLoading(false);
    setText(BEST_SOLUTION_TITLE_ID, title);
    setText(BEST_SOLUTION_SUMMARY_ID, copy);
    renderSolutionList(moves);
}

function updateBestSolutionToggle(): void {
    const toggle = getButton(BEST_SOLUTION_TOGGLE_ID);
    const isOpen = bestSolutionPanelIsOpen();
    toggle.disabled = currentState === null;
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (!findingBestSolution) {
        toggle.textContent = isOpen ? "Hide best solution" : "Show best solution";
    }
}

function bestSolutionWaitMessage(): string {
    if (generating || currentState === null) {
        return "A puzzle is being prepared. The best solution will update when it is ready.";
    }
    if (pendingPour !== null) {
        return "Finish the pour to update the best solution for the new board.";
    }
    if (findingHint) {
        return "Finishing the hint search before calculating the full best solution.";
    }
    return "Finding the shortest route from the current board…";
}

function cancelBestSolutionSearch(): void {
    bestSolutionRequest++;
    findingBestSolution = false;
    stopBestSolutionLoadingAnimation();
    bestSolutionPanel().setAttribute("aria-busy", "false");
}

function invalidateBestSolution(): void {
    bestSolutionVersion++;
    cancelBestSolutionSearch();
    lastComputedSolutionMoves = null;
}

function deferBestSolution(message = bestSolutionWaitMessage()): void {
    bestSolutionRefreshDeferred = true;
    invalidateBestSolution();
    if (bestSolutionPanelIsOpen()) {
        setBestSolutionContent("Best solution", message, [], { cache: false });
    }
}

function requestBestSolutionRefresh(): void {
    if (!bestSolutionPanelIsOpen()) return;
    if (currentState === null || generating || pendingPour !== null || findingHint) {
        bestSolutionRefreshDeferred = true;
        setBestSolutionContent("Best solution", bestSolutionWaitMessage(), [], { loading: false, cache: false });
        return;
    }
    if (findingBestSolution) return;
    void findBestSolution();
}

function refreshBestSolutionAfterStateChange(): void {
    deferBestSolution();
    requestBestSolutionRefresh();
}

function tryBubbleUpSolution(playedMove: Move, stateBeforeMove: PuzzleState): boolean {
    if (!bestSolutionPanelIsOpen() || lastComputedSolutionMoves === null || lastComputedSolutionMoves.length === 0) {
        return false;
    }
    const first = lastComputedSolutionMoves[0];
    if (!movesMatchForState(stateBeforeMove, playedMove, first)) {
        return false;
    }
    lastComputedSolutionMoves = lastComputedSolutionMoves.slice(1);
    displayCachedSolution();
    return true;
}

async function findBestSolution(): Promise<void> {
    if (currentState === null) return;

    const request = ++bestSolutionRequest;
    const version = bestSolutionVersion;
    const state = cloneState(currentState);
    const maxStates = Math.min(currentOptions?.maxSolverStates ?? 150_000, 150_000);
    bestSolutionRefreshDeferred = false;
    findingBestSolution = true;
    setBestSolutionContent("Best solution", "Searching shortest route from the current board…", [], { loading: true, cache: false });
    updateUi();
    await nextFrame();

    if (request !== bestSolutionRequest || version !== bestSolutionVersion || !bestSolutionPanelIsOpen()) return;
    if (currentState === null || generating || pendingPour !== null || findingHint) {
        bestSolutionRefreshDeferred = true;
        findingBestSolution = false;
        stopBestSolutionLoadingAnimation();
        setBestSolutionToggleLoading(false);
        setBestSolutionContent("Best solution", bestSolutionWaitMessage(), [], { cache: false });
        updateUi();
        return;
    }

    try {
        const result = solve(state, { maxStates });
        if (request !== bestSolutionRequest || version !== bestSolutionVersion || !bestSolutionPanelIsOpen()) return;

        if (result.solvable && result.moves !== undefined) {
            const moveCount = result.moves.length;
            const stateCount = result.statesVisited.toLocaleString();
            const title = moveCount === 0
                ? "Best solution · sorted"
                : `Best solution · ${moveCount} ${moveCount === 1 ? "pour" : "pours"}`;
            const copy = moveCount === 0
                ? `This current is already sorted. Search checked ${stateCount} state${result.statesVisited === 1 ? "" : "s"}.`
                : `Search checked ${stateCount} state${result.statesVisited === 1 ? "" : "s"}.`;
            lastComputedSolutionMoves = [...result.moves];
            setBestSolutionContent(title, copy, result.moves);
        } else if (result.solvable) {
            lastComputedSolutionMoves = null;
            setBestSolutionContent("Best solution · unavailable", "The best solution could not be displayed for this board.");
        } else if (!result.complete) {
            lastComputedSolutionMoves = null;
            setBestSolutionContent(
                "Best solution · too complex",
                `The exact search reached its ${result.statesVisited.toLocaleString()}-state budget.`,
            );
        } else {
            lastComputedSolutionMoves = null;
            setBestSolutionContent("Best solution · unsolvable", "No solution exists from this current board.");
        }
    } catch (error) {
        if (request === bestSolutionRequest && version === bestSolutionVersion && bestSolutionPanelIsOpen()) {
            lastComputedSolutionMoves = null;
            setBestSolutionContent("Best solution · unavailable", "The best solution could not be calculated right now.");
            console.error(error);
        }
    } finally {
        if (request === bestSolutionRequest) {
            findingBestSolution = false;
            stopBestSolutionLoadingAnimation();
            setBestSolutionToggleLoading(false);
            bestSolutionPanel().setAttribute("aria-busy", "false");
            updateUi();
        }
    }
}

function toggleBestSolution(): void {
    const panel = bestSolutionPanel();
    panel.hidden = !panel.hidden;
    if (panel.hidden) {
        bestSolutionRefreshDeferred = true;
        invalidateBestSolution();
    } else {
        deferBestSolution();
        requestBestSolutionRefresh();
    }
    updateUi();
}

function isBusy(): boolean {
    return pendingPour !== null || generating || findingHint;
}

function isCompletedBottle(layers: readonly ColorId[], capacity: number): boolean {
    return layers.length === capacity && layers.every((color) => color === layers[0]);
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
}

function bottlePath(geometry: BottleGeometry): void {
    const { x, y, width, height, neckHeight } = geometry;
    const neckWidth = width * 0.48;
    const neckLeft = x + (width - neckWidth) / 2;
    const shoulderY = y + neckHeight;
    const baseY = y + height;
    const radius = width * 0.17;
    context.beginPath();
    context.moveTo(neckLeft, y + 1);
    context.lineTo(neckLeft + neckWidth, y + 1);
    context.lineTo(neckLeft + neckWidth, shoulderY - width * 0.05);
    context.bezierCurveTo(
        neckLeft + neckWidth, shoulderY + width * 0.04,
        x + width * 0.9, shoulderY + width * 0.12,
        x + width * 0.9, shoulderY + width * 0.31,
    );
    context.lineTo(x + width * 0.9, baseY - radius);
    context.quadraticCurveTo(x + width * 0.9, baseY, x + width * 0.9 - radius, baseY);
    context.lineTo(x + width * 0.1 + radius, baseY);
    context.quadraticCurveTo(x + width * 0.1, baseY, x + width * 0.1, baseY - radius);
    context.lineTo(x + width * 0.1, shoulderY + width * 0.31);
    context.bezierCurveTo(
        x + width * 0.1, shoulderY + width * 0.12,
        neckLeft, shoulderY + width * 0.04,
        neckLeft, shoulderY - width * 0.05,
    );
    context.lineTo(neckLeft, y + 1);
    context.closePath();
}

function drawText(
    text: string,
    x: number,
    y: number,
    options: {
        color?: string;
        size?: number;
        weight?: number;
        align?: CanvasTextAlign;
        baseline?: CanvasTextBaseline;
    } = {},
): void {
    const {
        color = "#eaf4ff",
        size = 16,
        weight = 700,
        align = "left",
        baseline = "alphabetic",
    } = options;
    context.fillStyle = color;
    context.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(text, x, y);
}

function drawBackground(): void {
    const background = context.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    background.addColorStop(0, "#142b50");
    background.addColorStop(0.52, "#203b63");
    background.addColorStop(1, "#172d50");
    context.fillStyle = background;
    context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const glow = context.createRadialGradient(135, 70, 0, 135, 70, 370);
    glow.addColorStop(0, "rgba(90, 230, 232, 0.17)");
    glow.addColorStop(1, "rgba(90, 230, 232, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const lowerGlow = context.createRadialGradient(950, 630, 0, 950, 630, 410);
    lowerGlow.addColorStop(0, "rgba(117, 133, 249, 0.16)");
    lowerGlow.addColorStop(1, "rgba(117, 133, 249, 0)");
    context.fillStyle = lowerGlow;
    context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    for (let index = 0; index < 34; index++) {
        const x = (index * 149 + 61) % LOGICAL_WIDTH;
        const y = 98 + ((index * 97 + 17) % 550);
        const radius = 1.3 + (index % 3) * 0.55;
        context.beginPath();
        context.fillStyle = "rgba(236, 249, 255, 0.15)";
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }

    drawText("WATER SORT", 48, 49, { size: 26, weight: 850 });
    drawText("ORDER THE CURRENT", LOGICAL_WIDTH - 48, 49, {
        color: "#b9cee4",
        size: 13,
        weight: 800,
        align: "right",
    });
    context.strokeStyle = "rgba(226, 240, 255, 0.2)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(48, 74);
    context.lineTo(LOGICAL_WIDTH - 48, 74);
    context.stroke();
}

function calculateLayout(state: PuzzleState): BottleGeometry[] {
    const count = state.bottles.length;
    const left = 30;
    const right = 30;
    const top = 112;
    const bottom = 50;
    const availableWidth = LOGICAL_WIDTH - left - right;
    const availableHeight = LOGICAL_HEIGHT - top - bottom;
    const columnWidth = availableWidth / count;
    const height = Math.min(287, availableHeight * 0.92);
    const width = Math.min(128, columnWidth * 0.82, height * 0.5);
    const neckHeight = Math.max(34, height * 0.18);

    return state.bottles.map((_bottle, index) => {
        const x = left + columnWidth * (index + 0.5) - width / 2;
        const y = top + (availableHeight - height) / 2;
        const innerInset = width * 0.16;
        return {
            index,
            x,
            y,
            width,
            height,
            neckHeight,
            innerX: x + innerInset,
            innerY: y + neckHeight + width * 0.22,
            innerWidth: width - innerInset * 2,
            innerHeight: height - neckHeight - width * 0.35,
        };
    });
}

function drawLayer(
    geometry: BottleGeometry,
    layerIndex: number,
    totalLayers: number,
    capacity: number,
    colorId: ColorId,
): void {
    const layerHeight = geometry.innerHeight / capacity;
    const x = geometry.innerX;
    const y = geometry.innerY + geometry.innerHeight - (layerIndex + 1) * layerHeight;
    const color = colorFor(colorId);
    const gradient = context.createLinearGradient(x, y, x + geometry.innerWidth, y + layerHeight);
    gradient.addColorStop(0, color.dark);
    gradient.addColorStop(0.28, color.color);
    gradient.addColorStop(0.68, color.light);
    gradient.addColorStop(1, color.color);
    context.fillStyle = gradient;
    context.fillRect(x - 2, y, geometry.innerWidth + 4, layerHeight + 0.7);

    if (layerIndex === totalLayers - 1) {
        const wave = Math.min(3.5, layerHeight * 0.11);
        context.beginPath();
        context.moveTo(x - 2, y + wave);
        context.bezierCurveTo(
            x + geometry.innerWidth * 0.25,
            y - wave,
            x + geometry.innerWidth * 0.62,
            y + wave * 1.6,
            x + geometry.innerWidth + 2,
            y + wave * 0.3,
        );
        context.strokeStyle = "rgba(255, 255, 255, 0.66)";
        context.lineWidth = 1.5;
        context.stroke();
    }
}

function drawLiquid(geometry: BottleGeometry, layers: readonly ColorId[], capacity: number): void {
    context.save();
    bottlePath(geometry);
    context.clip();
    layers.forEach((color, index) => drawLayer(geometry, index, layers.length, capacity, color));
    context.restore();
}

function drawGlass(geometry: BottleGeometry, completed: boolean): void {
    context.save();
    bottlePath(geometry);
    const fill = context.createLinearGradient(geometry.x, geometry.y, geometry.x + geometry.width, geometry.y + geometry.height);
    fill.addColorStop(0, "rgba(242, 252, 255, 0.24)");
    fill.addColorStop(0.45, "rgba(214, 236, 250, 0.07)");
    fill.addColorStop(1, "rgba(181, 220, 243, 0.16)");
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = completed ? "rgba(155, 255, 204, 0.95)" : "rgba(224, 243, 253, 0.84)";
    context.lineWidth = completed ? 3.2 : 2.4;
    context.stroke();
    context.restore();

    const neckWidth = geometry.width * 0.48;
    const neckLeft = geometry.x + (geometry.width - neckWidth) / 2;
    context.strokeStyle = "rgba(255, 255, 255, 0.65)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(neckLeft + 4, geometry.y + 9);
    context.lineTo(neckLeft + neckWidth - 4, geometry.y + 9);
    context.stroke();

    context.strokeStyle = "rgba(255, 255, 255, 0.28)";
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(geometry.x + geometry.width * 0.22, geometry.y + geometry.neckHeight + geometry.width * 0.44);
    context.lineTo(geometry.x + geometry.width * 0.22, geometry.y + geometry.height - geometry.width * 0.27);
    context.stroke();
}

function playerMove(from: number, to: number): Move {
    return { from, to };
}

function legalTarget(index: number): boolean {
    if (currentState === null || selectedBottle === null || index === selectedBottle) return false;
    return isLegalMove(currentState, playerMove(selectedBottle, index));
}

function drawBottle(
    geometry: BottleGeometry,
    layers: readonly ColorId[],
    options: { translateY?: number; rotation?: number } = {},
): void {
    if (currentState === null) return;
    const selected = selectedBottle === geometry.index;
    const completed = isCompletedBottle(layers, currentState.capacity);
    const translateY = options.translateY ?? 0;
    const rotation = options.rotation ?? 0;
    const centerX = geometry.x + geometry.width / 2;
    const centerY = geometry.y + geometry.height / 2;

    context.save();
    context.translate(centerX, centerY + translateY);
    context.rotate(rotation);
    context.translate(-centerX, -centerY);

    context.save();
    context.shadowColor = "rgba(2, 12, 29, 0.28)";
    context.shadowBlur = 16;
    context.shadowOffsetY = 8;
    bottlePath(geometry);
    context.fillStyle = "rgba(6, 18, 42, 0.24)";
    context.fill();
    context.restore();

    drawLiquid(geometry, layers, currentState.capacity);
    drawGlass(geometry, completed);
    context.restore();

    // Minimal selection cue: a thin underline under the selected bottle.
    if (selected && pendingPour === null) {
        context.save();
        context.strokeStyle = "rgba(140, 245, 237, 0.95)";
        context.lineWidth = 4;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(geometry.x + geometry.width * 0.20, geometry.y + geometry.height + 8);
        context.lineTo(geometry.x + geometry.width * 0.80, geometry.y + geometry.height + 8);
        context.stroke();
        context.restore();
    }

    drawText(String(geometry.index + 1), centerX, geometry.y + geometry.height + 27, {
        color: "#d5e4f1",
        size: 15,
        weight: 850,
        align: "center",
    });
}

function drawPourStream(source: BottleGeometry, destination: BottleGeometry, pending: PendingPour, progress: number): void {
    const flowProgress = Math.max(0, Math.min(1, (progress - 0.2) / 0.58));
    if (flowProgress <= 0) return;
    const color = colorFor(pending.movedColor);
    const sourceX = source.x + source.width / 2 + (destination.x > source.x ? source.width * 0.18 : -source.width * 0.18);
    const sourceY = source.y + source.neckHeight * 0.88 - 16;
    const destinationX = destination.x + destination.width / 2;
    const destinationY = destination.y + destination.neckHeight + destination.width * 0.2;
    const bendX = (sourceX + destinationX) / 2;
    const bendY = Math.min(sourceY, destinationY) - 44;
    const width = 6 + pending.movedCount * 2.4;

    context.save();
    context.globalAlpha = Math.min(1, flowProgress * 2.8, (1 - flowProgress) * 4.4 + 0.25);
    context.strokeStyle = color.light;
    context.lineWidth = width + 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(sourceX, sourceY);
    context.quadraticCurveTo(bendX, bendY, destinationX, destinationY);
    context.stroke();
    context.strokeStyle = color.color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(sourceX, sourceY);
    context.quadraticCurveTo(bendX, bendY, destinationX, destinationY);
    context.stroke();

    const dropDistance = flowProgress * 0.86;
    const dropX = sourceX + (destinationX - sourceX) * dropDistance;
    const dropY = sourceY + (destinationY - sourceY) * dropDistance - Math.sin(dropDistance * Math.PI) * 78;
    context.fillStyle = color.light;
    context.beginPath();
    context.arc(dropX, dropY, width * 0.57, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function drawEmptyState(): void {
    drawBackground();
    drawText("Mixing a new current…", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, {
        color: "#d7e5f4",
        size: 22,
        weight: 780,
        align: "center",
    });
}

function drawBoard(): void {
    if (currentState === null) {
        drawEmptyState();
        return;
    }
    drawBackground();
    const layout = calculateLayout(currentState);
    const pending = pendingPour;
    const progress = pending === null
        ? 0
        : Math.min(1, Math.max(0, (performance.now() - pending.startedAt) / POUR_DURATION_MS));
    const sourceIndex = pending?.move.from;
    const destinationIndex = pending?.move.to;

    for (const geometry of layout) {
        const bottle = currentState.bottles[geometry.index];
        let layers = bottle.layers;
        let translateY = 0;
        let rotation = 0;
        if (pending !== null && geometry.index === sourceIndex) {
            layers = bottle.layers.slice(0, bottle.layers.length - pending.movedCount);
            const lift = progress < 0.2
                ? progress / 0.2
                : progress > 0.83
                    ? (1 - progress) / 0.17
                    : 1;
            translateY = -23 * Math.max(0, lift);
            const destination = destinationIndex === undefined ? undefined : layout[destinationIndex];
            const direction = destination !== undefined && destination.x > geometry.x ? 1 : -1;
            const pour = Math.max(0, Math.min(1, (progress - 0.18) / 0.5));
            const settle = progress > 0.75 ? (1 - progress) / 0.25 : 1;
            rotation = direction * 0.34 * pour * Math.max(0, settle);
        }
        drawBottle(geometry, layers, { translateY, rotation });
    }

    if (pending !== null && sourceIndex !== undefined && destinationIndex !== undefined) {
        const source = layout[sourceIndex];
        const destination = layout[destinationIndex];
        if (source !== undefined && destination !== undefined) drawPourStream(source, destination, pending, progress);
    }

    if (isSolved(currentState) && pending === null) {
        roundedRect(LOGICAL_WIDTH / 2 - 190, 85, 380, 38, 19);
        context.fillStyle = "rgba(117, 245, 187, 0.17)";
        context.fill();
        drawText("CURRENT SORTED", LOGICAL_WIDTH / 2, 105, {
            color: "#b8ffcf",
            size: 15,
            weight: 850,
            align: "center",
            baseline: "middle",
        });
    }
}

function render(): void {
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
}

function canvasPoint(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function bottleAt(point: { x: number; y: number }): number | null {
    if (currentState === null) return null;
    const layout = calculateLayout(currentState);
    for (const geometry of layout) {
        const padX = geometry.width * 0.22;
        const padY = geometry.height * 0.08;
        if (point.x >= geometry.x - padX
            && point.x <= geometry.x + geometry.width + padX
            && point.y >= geometry.y - padY
            && point.y <= geometry.y + geometry.height + padY) {
            return geometry.index;
        }
    }
    return null;
}

function clearHint(): void {
    hintMove = null;
}

function showInvalid(index: number, message: string): void {
    invalidFeedback = { index, expiresAt: performance.now() + INVALID_FEEDBACK_MS };
    setStatus(message);
    window.setTimeout(() => {
        if (invalidFeedback !== null && invalidFeedback.index === index && invalidFeedback.expiresAt <= performance.now()) {
            invalidFeedback = null;
        }
    }, INVALID_FEEDBACK_MS + 20);
}

function moveDescription(move: Move): string {
    if (currentState === null) {
        return `bottle ${move.from + 1} into bottle ${move.to + 1}`;
    }
    const layers = transferCount(currentState, move);
    const layerWord = layers === 1 ? "layer" : "layers";
    return `${layers} top ${layerWord} from bottle ${move.from + 1} into bottle ${move.to + 1}`;
}

function playPour(move: Move): void {
    if (currentState === null || !isLegalMove(currentState, move)) return;
    const before = currentState;
    const after = applyMove(before, move);
    const beforeDestination = before.bottles[move.to].layers.length;
    const moved = after.bottles[move.to].layers.slice(beforeDestination);
    const movedColor = moved[0];
    if (movedColor === undefined || moved.length === 0) {
        throw new Error("Water Sort move did not transfer any layers");
    }
    clearHint();
    pendingPour = {
        before,
        after,
        move,
        movedColor,
        movedCount: moved.length,
        startedAt: performance.now(),
    };
    cancelBestSolutionSearch();
    setStatus(`Pouring ${moveDescription(move)}…`);
    updateUi();
    requestAnimationFrame(animationFrame);
}

function animationFrame(now: number): void {
    const pending = pendingPour;
    if (pending === null) return;
    if (now - pending.startedAt < POUR_DURATION_MS) {
        render();
        requestAnimationFrame(animationFrame);
        return;
    }
    history.push(cloneState(pending.before));
    currentState = pending.after;
    pendingPour = null;
    selectedBottle = null;
    if (!tryBubbleUpSolution(pending.move, pending.before)) {
        refreshBestSolutionAfterStateChange();
    }
    if (currentState !== null && isSolved(currentState)) {
        setStatus(`All currents are sorted in ${history.length} moves. Nicely done.`);
    } else {
        setStatus(`Poured ${moveDescription(pending.move)}. Choose another bottle.`);
    }
    updateUi();
    render();
}

function selectOrPour(index: number): void {
    if (isBusy() || currentState === null) return;
    if (isSolved(currentState)) {
        setStatus("This puzzle is sorted. Start a new current or restart the level.");
        return;
    }
    if (selectedBottle === null) {
        if (currentState.bottles[index].layers.length === 0) {
            showInvalid(index, `Bottle ${index + 1} is empty. Select a bottle holding liquid first.`);
            return;
        }
        selectedBottle = index;
        clearHint();
        setStatus(`Bottle ${index + 1} selected.`);
        render();
        return;
    }
    if (selectedBottle === index) {
        selectedBottle = null;
        clearHint();
        setStatus("Selection cleared.");
        render();
        return;
    }
    const move = playerMove(selectedBottle, index);
    if (!isLegalMove(currentState, move)) {
        showInvalid(index, `Bottle ${index + 1} is full. Choose another bottle.`);
        return;
    }
    playPour(move);
}

function undo(): void {
    if (isBusy() || history.length === 0) return;
    const previous = history.pop();
    if (previous === undefined) return;
    currentState = cloneState(previous);
    selectedBottle = null;
    clearHint();
    refreshBestSolutionAfterStateChange();
    setStatus("Last pour undone.");
    updateUi();
    render();
}

function restart(): void {
    if (isBusy() || initialState === null) return;
    currentState = cloneState(initialState);
    history = [];
    selectedBottle = null;
    clearHint();
    invalidFeedback = null;
    refreshBestSolutionAfterStateChange();
    setStatus("Level restarted.");
    updateUi();
    render();
}

function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function applyGeneratedLevel(level: GeneratedLevel, difficulty: Difficulty): void {
    // The generator has already run and replay-checked the exact solver.  The
    // UI consumes that result directly rather than blocking a second time.
    setBoardSetup(level.options);
    currentState = cloneState(level.state);
    initialState = cloneState(level.initialState);
    history = [];
    selectedBottle = null;
    clearHint();
    invalidFeedback = null;
    currentDifficulty = difficulty;
    currentOptions = level.options;
    currentMetrics = {
        optimalMoves: level.optimalMoves,
        statesVisited: level.statesVisited,
    };
    getInput().value = level.levelCode;
    refreshBestSolutionAfterStateChange();
    setStatus(`${difficulty[0].toUpperCase()}${difficulty.slice(1)} current ready. Select a bottle to begin.`);
    updateUi();
    render();
}

function retrySeed(seed: number, attempt: number): number {
    if (attempt === 0) return seed >>> 0;
    // A bounded deterministic stride makes a failed random seed recoverable
    // without undermining level-code reproduction for a chosen final seed.
    return (seed + Math.imul(attempt, 0x9e3779b9)) >>> 0;
}

async function makeNewPuzzle(difficulty: Difficulty, seed = randomSeed()): Promise<void> {
    if (isBusy()) return;
    const setup = selectedBoardSetup();
    const setupError = boardSetupError(setup);
    if (setupError !== null) {
        setStatus(setupError);
        updateUi();
        return;
    }
    generating = true;
    deferBestSolution();
    selectedBottle = null;
    clearHint();
    setStatus(`Mixing a ${difficulty} current…`);
    updateUi();
    render();
    await nextFrame();
    try {
        const retryLimit = 8;
        let level: GeneratedLevel | null = null;
        let lastError: unknown;
        for (let attempt = 0; attempt < retryLimit; attempt++) {
            try {
                level = generateLevel(generationOptionsFor(difficulty, retrySeed(seed, attempt), setup));
                break;
            } catch (error) {
                lastError = error;
            }
        }
        if (level === null) {
            const detail = lastError instanceof Error ? ` ${lastError.message}` : "";
            throw new Error(`No ${difficulty} puzzle could be mixed after ${retryLimit} deterministic seeds.${detail}`);
        }
        applyGeneratedLevel(level, difficulty);
    } catch (error) {
        setStatus(error instanceof Error ? `Could not generate a puzzle: ${error.message}` : "Could not generate a puzzle.");
        console.error(error);
    } finally {
        generating = false;
        updateUi();
        render();
        if (bestSolutionRefreshDeferred) requestBestSolutionRefresh();
    }
}

function difficultyForOptions(options: GeneratorOptions): Difficulty {
    const board = {
        colorCount: options.colorCount ?? Number.NaN,
        capacity: options.capacity ?? Number.NaN,
    };
    const match = (difficulty: Difficulty): boolean => {
        const profile = difficultyOptionsForBoard(difficulty, board);
        return options.minSolutionLength === profile.minSolutionLength
            && options.maxSolutionLength === profile.maxSolutionLength
            && options.maxAttempts === profile.maxAttempts
            && options.maxSolverStates === profile.maxSolverStates;
    };
    if (match("easy")) return "easy";
    if (match("medium")) return "medium";
    if (match("hard")) return "hard";
    return "medium";
}

async function loadLevelCode(): Promise<void> {
    if (isBusy()) return;
    const code = getInput().value.trim();
    if (code.length === 0) {
        setStatus("Enter a level code first.");
        return;
    }
    generating = true;
    deferBestSolution();
    setStatus("Recreating that current…");
    updateUi();
    await nextFrame();
    try {
        const options = decodeLevelCode(code);
        const setupError = boardSetupErrorForOptions(options);
        if (setupError !== null) throw new Error(setupError);
        const difficulty = difficultyForOptions(options);
        const level = generateLevel(options);
        applyGeneratedLevel(level, difficulty);
        setStatus("Shared current loaded. It will reproduce exactly from this code.");
    } catch (error) {
        setStatus(error instanceof Error ? `That level code is not valid: ${error.message}` : "That level code is not valid.");
    } finally {
        generating = false;
        updateUi();
        render();
        if (bestSolutionRefreshDeferred) requestBestSolutionRefresh();
    }
}

async function showHint(): Promise<void> {
    if (isBusy() || currentState === null) return;
    if (isSolved(currentState)) {
        setStatus("Everything is already sorted.");
        return;
    }
    findingHint = true;
    selectedBottle = null;
    setStatus("Finding the next optimal pour…");
    updateUi();
    render();
    await nextFrame();
    try {
        const result = solve(currentState, {
            maxStates: Math.min(currentOptions?.maxSolverStates ?? 150_000, 150_000),
        });
        const move = result.solvable ? result.moves?.[0] : undefined;
        if (move === undefined) {
            setStatus(result.complete ? "No solution was found for this position." : "The hint search needs more time.");
        } else {
            hintMove = move;
            setStatus(`Hint: pour ${moveDescription(move)}.`);
        }
    } catch (error) {
        setStatus("The hint could not be calculated right now.");
        console.error(error);
    } finally {
        findingHint = false;
        updateUi();
        render();
        if (bestSolutionRefreshDeferred) requestBestSolutionRefresh();
    }
}

async function copyLevelCode(): Promise<void> {
    if (isBusy() || currentOptions === null) return;
    const code = encodeLevelCode(currentOptions);
    getInput().value = code;
    try {
        await navigator.clipboard.writeText(code);
        setStatus("Level code copied. It contains the seed and generator settings only.");
    } catch {
        getInput().focus();
        getInput().select();
        setStatus("Level code selected. Copy it with your browser’s copy command.");
    }
}

function randomSeed(): number {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        return values[0];
    }
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function updateDifficultyButtons(canGenerate: boolean): void {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
        const button = getButton(`water-sort-${difficulty}`);
        button.setAttribute("aria-pressed", String(difficulty === currentDifficulty));
        button.disabled = !canGenerate;
    }
}

function updateUi(): void {
    const busy = isBusy();
    const setupError = updateSetupContext();
    const canGenerate = !busy && setupError === null;
    getButton(UNDO_ID).disabled = busy || history.length === 0;
    getButton(RESTART_ID).disabled = busy || initialState === null;
    getButton(HINT_ID).disabled = busy || currentState === null || isSolved(currentState);
    getButton(NEW_ID).disabled = !canGenerate;
    getButton(COPY_CODE_ID).disabled = busy || currentOptions === null;
    getButton(LOAD_CODE_ID).disabled = busy;
    getInput().disabled = busy;
    getSelect(CAPACITY_ID).disabled = busy;
    getSelect(COLOR_COUNT_ID).disabled = busy;
    updateBestSolutionToggle();
    updateDifficultyButtons(canGenerate);
    setText(MOVES_ID, String(history.length));
    setText(OPTIMAL_ID, numberText(currentMetrics.optimalMoves));
    setText(VISITED_ID, numberText(currentMetrics.statesVisited));
    setText(LEVEL_ID, `${currentDifficulty[0].toUpperCase()}${currentDifficulty.slice(1)}`);
}

function bindPointerInput(): void {
    canvas.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || isBusy() || (event.pointerType === "mouse" && event.button !== 0)) return;
        const bottle = bottleAt(canvasPoint(event));
        pointerPress = { pointerId: event.pointerId, bottle };
        canvas.setPointerCapture(event.pointerId);
        canvas.focus({ preventScroll: true });
        event.preventDefault();
    });
    canvas.addEventListener("pointermove", (event) => {
        const next = bottleAt(canvasPoint(event));
        if (hoveredBottle !== next) {
            hoveredBottle = next;
            render();
        }
    });
    canvas.addEventListener("pointerup", (event) => {
        const press = pointerPress;
        if (press === null || press.pointerId !== event.pointerId) return;
        pointerPress = null;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        const releaseBottle = bottleAt(canvasPoint(event));
        if (!isBusy() && press.bottle !== null && releaseBottle === press.bottle) {
            selectOrPour(releaseBottle);
        }
        event.preventDefault();
    });
    const cancel = (event: PointerEvent): void => {
        if (pointerPress?.pointerId !== event.pointerId) return;
        pointerPress = null;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", () => {
        pointerPress = null;
    });
    canvas.addEventListener("pointerleave", () => {
        if (hoveredBottle !== null) {
            hoveredBottle = null;
            render();
        }
    });
    canvas.addEventListener("keydown", (event) => {
        if (isBusy() || currentState === null) return;
        if (event.key === "Escape" && selectedBottle !== null) {
            selectedBottle = null;
            clearHint();
            setStatus("Selection cleared.");
            render();
            event.preventDefault();
            return;
        }
        if (!/^[1-9]$/.test(event.key)) return;
        const bottle = Number(event.key) - 1;
        if (bottle < currentState.bottles.length) {
            selectOrPour(bottle);
            event.preventDefault();
        }
    });
}

function bindUi(): void {
    bindPointerInput();
    getButton(UNDO_ID).addEventListener("click", undo);
    getButton(RESTART_ID).addEventListener("click", restart);
    getButton(HINT_ID).addEventListener("click", () => { void showHint(); });
    getButton(BEST_SOLUTION_TOGGLE_ID).addEventListener("click", toggleBestSolution);
    getButton(NEW_ID).addEventListener("click", () => { void makeNewPuzzle(currentDifficulty); });
    getButton(COPY_CODE_ID).addEventListener("click", () => { void copyLevelCode(); });
    getButton(LOAD_CODE_ID).addEventListener("click", () => { void loadLevelCode(); });
    for (const id of [CAPACITY_ID, COLOR_COUNT_ID]) {
        getSelect(id).addEventListener("change", () => {
            const setup = selectedBoardSetup();
            const error = boardSetupError(setup);
            updateUi();
            setStatus(error ?? `${setupSummary(setup)} New puzzles will use this setup.`);
        });
    }
    for (const difficulty of ["easy", "medium", "hard"] as const) {
        getButton(`water-sort-${difficulty}`).addEventListener("click", () => {
            void makeNewPuzzle(difficulty);
        });
    }
}

async function bootstrap(): Promise<void> {
    canvas = getCanvas();
    const canvasContext = canvas.getContext("2d");
    if (canvasContext === null) throw new Error("Water Sort requires a 2D Canvas context");
    context = canvasContext;
    bindUi();
    updateUi();
    render();
    await makeNewPuzzle("easy");
}

void bootstrap().catch((error: unknown) => {
    console.error("Water Sort failed to start", error);
    const status = document.getElementById(STATUS_ID);
    if (status instanceof HTMLElement) {
        status.textContent = "The puzzle could not start. Reload the page and try again.";
    }
});
