import { array_eq_2d, cartesian_product, inner_product, matrix_multiply_number } from "../tsl/math.js";
export function test_matrix_multiply() {
    let a = [[1, 2], [3, 4]];
    let b = [[5, 6], [7, 8]];
    let c = matrix_multiply_number(a, b);
    let d = [[19, 22], [43, 50]];
    return array_eq_2d(c, d);
}
export function test_cartesian_product() {
    let a = [1, 2];
    let b = [3, 4];
    let expected_product = [[1, 3], [1, 4], [2, 3], [2, 4]];
    let result = cartesian_product([a, b]);
    console.log(expected_product, result);
    return array_eq_2d(expected_product, result);
}
export function test_inner_product() {
    let a = [1, 2];
    let b = [3, 4];
    return (1 * 3 + 2 * 4) == inner_product(a, b);
}
