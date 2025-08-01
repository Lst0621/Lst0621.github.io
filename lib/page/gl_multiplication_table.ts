import {gen_general_linear_zn_m_by_m, matrix_multiply_zn} from "../tsl/math.js"
import {draw_multiplication_table, matrix_to_cell} from "../tsl/visual.js";
import {always} from "../tsl/func.js";
import {get_sub} from "../tsl/util.js";

let m: number = 2
let n: number = 2

export function update_table() {
    let mul_text = document.getElementById("mul_text") as HTMLSpanElement
    mul_text.innerHTML = ("Multiplication for GL (" + m.toString() + ",Z" + get_sub(n.toString()) + ")");
    let table: HTMLTableElement
        = document.getElementById("multiplication_table") as HTMLTableElement
    let gl: number[][][] = gen_general_linear_zn_m_by_m(n, m)
    console.log(gl[0])
    draw_multiplication_table(
        table,
        gl,
        (a: number[][], b: number[][]) => matrix_multiply_zn(a, b, n),
        matrix_to_cell,
        always("lightblue"),
        always("lightyellow")
    )
}

export function increment() {
    if (n < 3) {
        n += 1
    }
    update_table()
}

export function decrement() {
    if (n > 2) {
        n -= 1
    }
    update_table()
}