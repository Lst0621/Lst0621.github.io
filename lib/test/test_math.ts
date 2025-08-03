import {
    array_eq,
    array_eq_2d,
    cartesian_product, complex_multiply, gen_general_linear_n_zm, generate_group,
    get_add_inverse_mod_n_function,
    inner_product,
    matrix_multiply_number, matrix_multiply_zn
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
    let gl_2_z2 = gen_general_linear_n_zm(2, 2)
    if (gl_2_z2.length != 6) {
        return false
    }
    let gl_z2_2_to_group = generate_group(gl_2_z2, (a: number[][], b: number[][]) => matrix_multiply_zn(a, b, 2), array_eq_2d,
        20)
    if (gl_z2_2_to_group.length != gl_2_z2.length) {
        return false
    }

    let gl_3_z2 = gen_general_linear_n_zm(3, 2)
    if (gl_3_z2.length != 168) {
        return false
    }
    let gl_3_z2_to_group = generate_group(gl_3_z2, (a: number[][], b: number[][]) => matrix_multiply_zn(a, b, 2), array_eq_2d,
        1000)
    if (gl_3_z2_to_group.length != gl_3_z2.length) {
        return false
    }

    let gl_2_z3 = gen_general_linear_n_zm(2, 3)
    if (gl_2_z3.length != 48) {
        return false
    }
    let gl_2_z3_to_group = generate_group(gl_2_z3, (a: number[][], b: number[][]) => matrix_multiply_zn(a, b, 3), array_eq_2d,
        1000)
    if (gl_2_z3_to_group.length != gl_2_z3.length) {
        return false
    }


    let gl_z3_3 = gen_general_linear_n_zm(3, 3)
    if (gl_z3_3.length != 11232) {
        return false
    }
    return true;
}

export function test_complex_numbers() {
    let a = [1, 2]
    let b = [3, 4]
    let c = 4
    let ab = complex_multiply(a, b)
    if (!array_eq([-5, 10], ab)) {
        return false;
    }
    let ac = complex_multiply(a, c)
    if (!array_eq([4, 8], ac)) {
        console.log(ac)
        return false;
    }
    return true;
}
