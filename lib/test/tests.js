import { test_cartesian_product, test_complex_numbers, test_gen_primes, test_generate_general_linear_group_zn_m, test_get_primitive_root, test_inner_product, test_matrix_add, test_matrix_inverse, test_matrix_multiply, test_mod } from "./test_math.js";
export function get_tests() {
    let tests = [test_matrix_multiply, test_matrix_add, test_matrix_inverse, test_cartesian_product, test_inner_product, test_mod, test_generate_general_linear_group_zn_m, test_complex_numbers, test_gen_primes, test_get_primitive_root];
    return tests;
}
function test(test_case) {
    let result = test_case();
    console.log(test_case.name + ": " + (result ? "passed" : "failed"));
}
function test_all() {
    console.log("hi");
    for (let test_case of get_tests()) {
        test(test_case);
    }
}
test(() => test_get_primitive_root(10));
