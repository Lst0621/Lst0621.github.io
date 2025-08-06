import {array_eq, array_eq_2d} from "../tsl/math/math.js";
import {
    inner_product,
    matrix_add_number,
    matrix_inverse, matrix_inverse_number,
    matrix_multiply_number,
    matrix_multiply_zn
} from "../tsl/math/matrix.js";
import {
    complex_add, complex_inverse,
    complex_multiply,
    get_add_inverse_mod_n_function,
    get_add_mod_n_function,
    get_conjugate,
    get_mul_inverse_mod_n_function,
    get_multiply_mod_n_function
} from "../tsl/math/number.js";
import {cartesian_product} from "../tsl/math/set.js";
import {gen_general_linear_n_zm, generate_group} from "../tsl/math/group.js";

export function test_matrix_multiply() {
    let a: number[][] = [[1, 2], [3, 4]]
    let b: number[][] = [[5, 6], [7, 8]]
    let c = matrix_multiply_number(a, b)
    let d = [[19, 22], [43, 50]]
    return array_eq_2d(c, d)
}

export function test_matrix_add() {
    let a: number[][] = [[1, 2], [3, 4]]
    let b: number[][] = [[5, 6], [7, 8]]
    let c = matrix_add_number(a, b)
    let d = [[6, 8], [10, 12]]
    return array_eq_2d(c, d)
}

export function test_matrix_inverse() {
    let a: number[][] = [[1, 0], [0, -1]]
    let a_inverse: number[][] = matrix_inverse_number(a)
    return array_eq_2d(a, a_inverse)
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

    for (let i = 0; i < gl_2_z3.length; ++i) {
        let mat = gl_2_z3[i]
        let inv = matrix_inverse(mat,
            get_add_mod_n_function(3),
            get_multiply_mod_n_function(3),
            get_add_inverse_mod_n_function(3),
            get_mul_inverse_mod_n_function(3)
        )
        if (!array_eq_2d(matrix_multiply_zn(mat, inv, 3), [[1, 0], [0, 1]])) {
            return false;
        }
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

    let step = 40;
    for (let i = 0; step * i < gl_z3_3.length; ++i) {
        let mat = gl_z3_3[step * i]
        let inv = matrix_inverse(mat,
            get_add_mod_n_function(3),
            get_multiply_mod_n_function(3),
            get_add_inverse_mod_n_function(3),
            get_mul_inverse_mod_n_function(3)
        )
        if (!array_eq_2d(matrix_multiply_zn(mat, inv, 3), [[1, 0, 0], [0, 1, 0], [0, 0, 1]])) {
            return false;
        }
    }

    return true;
}

export function test_complex_numbers() {
    let a = [1, 2]
    let b = [3, 4]
    let c = 4
    let i: number[] = [0, 1]
    let ab = complex_multiply(a, b)
    if (!array_eq([-5, 10], ab)) {
        return false;
    }

    let ac = complex_multiply(a, c)
    if (!array_eq([4, 8], ac)) {
        console.log(ac)
        return false;
    }

    let a_plus_b = complex_add(a, b)
    if (!array_eq([4, 6], a_plus_b)) {
        console.log(a_plus_b)
        return false;
    }

    let a_conjugate = get_conjugate(a)
    if (!array_eq([1, -2], a_conjugate)) {
        return false;
    }

    let minus_i = complex_inverse(i)
    if (!array_eq(minus_i, [0, -1])) {
        return false;
    }

    if (!array_eq([1, 0], complex_inverse(1))) {
        return false;
    }

    return true;
}
