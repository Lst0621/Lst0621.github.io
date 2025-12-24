import {
    test_cartesian_product,
    test_complex_numbers,
    test_gen_primes,
    test_generate_general_linear_group_zn_m,
    test_get_primitive_root,
    test_inner_product,
    test_matrix_add,
    test_matrix_inverse,
    test_matrix_multiply,
    test_mod, test_set_union
} from "./test_math.js";
import {test_definite_k} from "./test_lang.js";


export function get_tests() {
    let tests = [test_matrix_multiply, test_matrix_add, test_matrix_inverse, test_cartesian_product, test_inner_product, test_mod, test_generate_general_linear_group_zn_m, test_complex_numbers, test_gen_primes, test_get_primitive_root, test_definite_k, test_set_union]
    return tests
}

function test(test_case: () => boolean) {
    let result = test_case()
    console.log(test_case.name + ": " + (result ? "passed" : "failed"))
}

function test_all() {
    console.log("hi")
    for (let test_case of get_tests()) {
        test(test_case)
    }
}