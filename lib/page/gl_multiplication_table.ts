import {array_eq_2d} from "../tsl/math/math"
import {draw_multiplication_table, matrix_to_cell} from "../tsl/visual";
import {always} from "../tsl/func";
import {get_sub} from "../tsl/util";
import {gen_general_linear_n_zm} from "../tsl/math/group";
import {matrix_multiply_zn} from "../tsl/math/matrix";

let m: number = 2;
let n: number = 2;

export function update_gl_group_table(n_val: number, m_val: number) {
    n = n_val;
    m = m_val;
    let mul_text = document.getElementById("mul_text_gl") as HTMLSpanElement;
    mul_text.innerHTML = ("GL(" + n.toString() + ",Z" + get_sub(m.toString()) + ")");
    let table: HTMLTableElement
        = document.getElementById("multiplication_table_gl") as HTMLTableElement;
    let gl: number[][][] = gen_general_linear_n_zm(n, m);
    draw_multiplication_table(
        table,
        gl,
        (a: number[][], b: number[][]) => matrix_multiply_zn(a, b, m),
        matrix_to_cell,
        always("lightblue"),
        (a, b, c) =>
            (array_eq_2d(c, [[1, 0], [0, 1]])) ? "lightgreen" : "lightblue"
    );
}

export function init() {
    update_gl_group_table(n, m);
}
