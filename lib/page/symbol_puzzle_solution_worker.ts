/// <reference lib="webworker" />

import { modulePromise, symbolPuzzleShortestPath } from "../tsl/wasm/ts/wasm_api_symbol_puzzle";

type SymbolPuzzleSolverPosition = { row: number; col: number };

type SolveRequest = {
    cmd: "solve";
    requestId: number;
    startPositions: ReadonlyArray<SymbolPuzzleSolverPosition>;
    targetPositions: ReadonlyArray<SymbolPuzzleSolverPosition>;
    maxStates: number;
};

type SolveResponse =
    | { requestId: number; moves: { piece: number; direction: number }[] }
    | { requestId: number; error: string };

type DebugMessage = { type: "debug"; requestId: number; stage: string; message?: string };

async function ensureModuleReady(): Promise<void> {
    await modulePromise;
}

self.onmessage = async (ev: MessageEvent) => {
    const msg = ev.data as SolveRequest;
    if (!msg || msg.cmd !== "solve") {
        return;
    }

    try {
        const postDebug = (stage: string, message?: string) => {
            (self as any).postMessage({ type: "debug", requestId: msg.requestId, stage, message } satisfies DebugMessage);
        };

        postDebug("start");
        await ensureModuleReady();
        postDebug("wasm_ready");

        postDebug("solve_start");
        const moves = symbolPuzzleShortestPath(msg.startPositions, msg.targetPositions, msg.maxStates);
        postDebug("solve_done", moves === null ? "too_complex" : `moves=${moves.length}`);

        const response: SolveResponse = moves === null
            ? { requestId: msg.requestId, error: "too_complex" }
            : {
                requestId: msg.requestId,
                moves: moves.map((m) => ({
                    piece: m.piece,
                    direction: m.direction as unknown as number,
                })),
            };
        (self as any).postMessage(response);
    } catch (err: unknown) {
        (self as any).postMessage({
            type: "debug",
            requestId: msg.requestId,
            stage: "error",
            message: err instanceof Error ? err.message : String(err),
        } satisfies DebugMessage);
        (self as any).postMessage({
            requestId: msg.requestId,
            error: err instanceof Error ? err.message : String(err),
        } satisfies SolveResponse);
    }
};

