/// <reference lib="webworker" />

type ModeStatsResult = {
    node: string;
    edge: string;
    mixed: string;
};

type PolynomialResult = {
    node: number[];
    edge: number[];
    mixed: number[];
};

let moduleReady: Promise<void> | null = null;

async function ensureModule(): Promise<typeof import("../tsl/wasm/ts/wasm_api_graph_demo")> {
    const graphApi = await import("../tsl/wasm/ts/wasm_api_graph_demo");
    if (!moduleReady) {
        moduleReady = graphApi.modulePromise.then(() => undefined);
    }
    await moduleReady;
    return graphApi;
}

self.onmessage = async (ev: MessageEvent) => {
    const msg = ev.data as any;
    if (!msg || msg.cmd !== "start") {
        return;
    }

    const token = Number(msg.token ?? 0);
    try {
        const graphApi = await ensureModule();
        const adj01 = new Int32Array(msg.adj01);
        const n = Number(msg.n);
        const pdim: ModeStatsResult = {
            node: graphApi.wasmGraphTreePdimFormula(adj01, n, 0, true),
            edge: graphApi.wasmGraphTreePdimFormula(adj01, n, 1, true),
            mixed: graphApi.wasmGraphTreePdimFormula(adj01, n, 2, true),
        };
        const polynomial: PolynomialResult = {
            node: graphApi.wasmGraphTreeResolvingPolynomialCoeffs(adj01, n, 0),
            edge: graphApi.wasmGraphTreeResolvingPolynomialCoeffs(adj01, n, 1),
            mixed: graphApi.wasmGraphTreeResolvingPolynomialCoeffs(adj01, n, 2),
        };
        self.postMessage({ token, pdim, polynomial });
    } catch (err) {
        self.postMessage({ token, error: (err as Error).message });
    }
};
