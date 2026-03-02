import { wasmNumberOfSequences, wasmNumberOfSequencesAll } from "../tsl/wasm_api.js";
export function test_wasm_number_of_sequences() {
    try {
        // Input: [2,3,6,7,8] and [7,10], expected: 1158
        const result = wasmNumberOfSequences([2, 3, 6, 7, 8], [7, 10]);
        console.log("wasmNumberOfSequences([2,3,6,7,8], [7,10]) =", result);
        return result === 1158;
    }
    catch (err) {
        console.error("test_wasm_number_of_sequences error:", err.message);
        return false;
    }
}
export function test_wasm_number_of_sequences_all() {
    try {
        // Input: [2,3,6,7,8] and [7,10], should return multi-dimensional array
        // Dimensions: (7+1) x (10+1) = 8 x 11
        const result = wasmNumberOfSequencesAll([2, 3, 6, 7, 8], [7, 10]);
        console.log("wasmNumberOfSequencesAll([2,3,6,7,8], [7,10]) result:", result);
        // Verify result is a 2D array with correct dimensions
        const isArray = Array.isArray(result);
        const hasCorrectRows = result.length === 8; // (7 + 1)
        const hasCorrectCols = result[0] && result[0].length === 11; // (10 + 1)
        console.log("Result is array:", isArray);
        console.log("Correct row count (8):", hasCorrectRows);
        console.log("Correct col count (11):", hasCorrectCols);
        // Verify all entries in the multi-dimensional array match individual wasmNumberOfSequences calls
        let allMatch = true;
        let mismatchCount = 0;
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 10; j++) {
                const resultValue = result[i][j];
                const expectedValue = wasmNumberOfSequences([2, 3, 6, 7, 8], [i, j]);
                if (resultValue !== expectedValue) {
                    console.error(`Mismatch at [${i}][${j}]: got ${resultValue}, expected ${expectedValue}`);
                    allMatch = false;
                    mismatchCount++;
                }
                else {
                    console.log(`✓ [${i}][${j}]: ${resultValue}`);
                }
            }
        }
        if (mismatchCount > 0) {
            console.log(`\nFound ${mismatchCount} mismatches out of 88 entries`);
        }
        else {
            console.log("\n✓ All 88 entries match perfectly!");
        }
        return isArray && hasCorrectRows && hasCorrectCols && allMatch;
    }
    catch (err) {
        console.error("test_wasm_number_of_sequences_all error:", err.message);
        return false;
    }
}
