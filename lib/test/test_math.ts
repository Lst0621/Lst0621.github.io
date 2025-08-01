import {
    array_eq_2d,
    cartesian_product, gen_general_linear_zn_m_by_m,
    get_add_inverse_mod_n_function,
    inner_product,
    matrix_multiply_number
} from "../tsl/math.js";

export function test_matrix_multiply() {
    let a: number[][] = [[1, 2], [3, 4]]
    let b: number[][] = [[5, 6], [7, 8]]
    let c = matrix_multiply_number(a, b)
    let d = [[19, 22], [43, 50]]
    return array_eq_2d(c, d)
}

export function test_cartesian_product() {
    let a = [1, 2]
    let b = [3, 4]
    let expected_product = [[1, 3], [1, 4], [2, 3], [2, 4]]
    let result = cartesian_product([a, b])
    return array_eq_2d(expected_product, result)
}

export function test_inner_product() {
    let a = [1, 2]
    let b = [3, 4]
    return 11 == inner_product(a, b)
}

export function test_mod() {
    let add_inverse = get_add_inverse_mod_n_function(7)
    if (add_inverse(0) != 0) {
        return false;
    }

    for (let i = 1; i < 7; i++) {
        if (add_inverse(i) != 7 - i) {
            return false;
        }
    }

    return true;
}

export function test_generate_general_linear_group_zn_m() {
    let gl_z2_2 = gen_general_linear_zn_m_by_m(2, 2)
    if (gl_z2_2.length != 6) {
        return false
    }
    let gl_z3_3 = gen_general_linear_zn_m_by_m(3, 3)
    if (gl_z3_3.length != 11232) {
        return false
    }
    return true;
}
