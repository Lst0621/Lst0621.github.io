import { wasm_number_of_sequences, wasm_number_of_sequences_all, wasm_get_gl_n_zm_size, wasm_matrix_det } from "../tsl/wasm_api.js";
export function test_wasm_number_of_sequences() {
    try {
        // Input: [2,3,6,7,8] and [7,10], expected: 1158
        const result = wasm_number_of_sequences([2, 3, 6, 7, 8], [7, 10]);
        console.log("wasm_number_of_sequences([2,3,6,7,8], [7,10]) =", result);
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
        const result = wasm_number_of_sequences_all([2, 3, 6, 7, 8], [7, 10]);
        console.log("wasm_number_of_sequences_all([2,3,6,7,8], [7,10]) result:", result);
        // Verify result is a 2D array with correct dimensions
        const isArray = Array.isArray(result);
        const hasCorrectRows = result.length === 8; // (7 + 1)
        const hasCorrectCols = result[0] && result[0].length === 11; // (10 + 1)
        console.log("Result is array:", isArray);
        console.log("Correct row count (8):", hasCorrectRows);
        console.log("Correct col count (11):", hasCorrectCols);
        // Verify all entries in the multi-dimensional array match individual wasm_number_of_sequences calls
        let allMatch = true;
        let mismatchCount = 0;
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 10; j++) {
                const resultValue = result[i][j];
                const expectedValue = wasm_number_of_sequences([2, 3, 6, 7, 8], [i, j]);
                if (resultValue !== expectedValue) {
                    console.error(`Mismatch at [${i}][${j}]: got ${resultValue}, expected ${expectedValue}`);
                    allMatch = false;
                    mismatchCount++;
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
export function test_wasm_get_gl_n_zm_size() {
    try {
        // Test cases with expected sizes from test_generate_general_linear_group_zn_m
        let test_cases = [
            { n: 2, m: 2, expected: 6 }, // gl_2_z2.length
            { n: 3, m: 2, expected: 168 }, // gl_3_z2.length
            { n: 2, m: 3, expected: 48 }, // gl_2_z3.length
            { n: 3, m: 3, expected: 11232 }, // gl_z3_3.length
        ];
        for (let { n, m, expected } of test_cases) {
            let result = wasm_get_gl_n_zm_size(n, m);
            if (result !== expected) {
                console.error(`Mismatch: wasm_get_gl_n_zm_size(${n}, ${m}): expected ${expected}, got ${result}`);
                return false;
            }
        }
        return true;
    }
    catch (err) {
        console.error("test_wasm_get_gl_n_zm_size error:", err.message);
        return false;
    }
}
export function test_wasm_matrix_det() {
    try {
        // Helper: flatten 2D matrix to 1D array
        const flatten = (matrix) => matrix.flat();
        // Test case 1: 2x2 matrix with non-trivial determinant
        const mat2x2 = [
            [3, 8],
            [4, 6]
        ];
        // det = 3*6 - 8*4 = 18 - 32 = -14
        const det2x2 = wasm_matrix_det(flatten(mat2x2), 2);
        if (det2x2 !== -14) {
            console.error(`2x2 matrix: expected -14, got ${det2x2}`);
            return false;
        }
        // Test case 2: 3x3 random matrix with mixed values
        const mat3x3 = [
            [2, 5, 1],
            [3, 1, 4],
            [1, 2, 3]
        ];
        // det = 2*(1*3 - 4*2) - 5*(3*3 - 4*1) + 1*(3*2 - 1*1)
        //     = 2*(3 - 8) - 5*(9 - 4) + 1*(6 - 1)
        //     = 2*(-5) - 5*5 + 1*5 = -10 - 25 + 5 = -30
        const det3x3 = wasm_matrix_det(flatten(mat3x3), 3);
        if (det3x3 !== -30) {
            console.error(`3x3 matrix: expected -30, got ${det3x3}`);
            return false;
        }
        // Test case 3: 5x5 random matrix
        const mat5x5 = [
            [1, 2, 3, 4, 5],
            [2, 3, 4, 5, 1],
            [3, 4, 5, 1, 2],
            [4, 5, 1, 2, 3],
            [5, 1, 2, 3, 4]
        ];
        // This is a circulant matrix - det can be computed but complex
        // We'll just verify it computes without error and is non-zero
        const det5x5 = wasm_matrix_det(flatten(mat5x5), 5);
        if (det5x5 === 0) {
            console.error(`5x5 matrix: got zero determinant (matrix should be invertible)`);
            return false;
        }
        // Test case 4: 10x10 random matrix with varied structure
        const mat10x10 = [
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            [2, 3, 4, 5, 6, 7, 8, 9, 10, 1],
            [3, 4, 5, 6, 7, 8, 9, 10, 1, 2],
            [4, 5, 6, 7, 8, 9, 10, 1, 2, 3],
            [5, 6, 7, 8, 9, 10, 1, 2, 3, 4],
            [6, 7, 8, 9, 10, 1, 2, 3, 4, 5],
            [7, 8, 9, 10, 1, 2, 3, 4, 5, 6],
            [8, 9, 10, 1, 2, 3, 4, 5, 6, 7],
            [9, 10, 1, 2, 3, 4, 5, 6, 7, 8],
            [10, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        ];
        // Circulant matrix - determinant exists but complex
        const det10x10 = wasm_matrix_det(flatten(mat10x10), 10);
        if (det10x10 === 0) {
            console.error(`10x10 matrix: got zero determinant (matrix should be invertible)`);
            return false;
        }
        // Test case 5: 10x10 matrix with negative values and mixed structure
        const mat10x10Complex = [
            [-1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            [2, -3, 4, 5, 6, 7, 8, 9, 10, 1],
            [3, 4, -5, 6, 7, 8, 9, 10, 1, 2],
            [4, 5, 6, -7, 8, 9, 10, 1, 2, 3],
            [5, 6, 7, 8, -9, 10, 1, 2, 3, 4],
            [6, 7, 8, 9, 10, -1, 2, 3, 4, 5],
            [7, 8, 9, 10, 1, 2, -3, 4, 5, 6],
            [8, 9, 10, 1, 2, 3, 4, -5, 6, 7],
            [9, 10, 1, 2, 3, 4, 5, 6, -7, 8],
            [10, 1, 2, 3, 4, 5, 6, 7, 8, -9]
        ];
        const det10x10Complex = wasm_matrix_det(flatten(mat10x10Complex), 10);
        // Just verify it computes without error
        console.log(`10x10 complex matrix det = ${det10x10Complex}`);
        return true;
    }
    catch (err) {
        console.error("test_wasm_matrix_det error:", err.message);
        return false;
    }
}
