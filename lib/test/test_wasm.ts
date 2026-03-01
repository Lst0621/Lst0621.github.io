import { wasmNumberOfSequences } from "../tsl/wasm_api.js";

export function test_wasm_number_of_sequences() {
    try {
        // Input: [2,3,6,7,8] and [7,10], expected: 1158
        const result = wasmNumberOfSequences([2, 3, 6, 7, 8], [7, 10]);
        console.log("wasmNumberOfSequences([2,3,6,7,8], [7,10]) =", result);
        return result === 1158;
    } catch (err: any) {
        console.error("test_wasm_number_of_sequences error:", err.message);
        return false;
    }
}

