import {array_eq_2d} from "../tsl/ts/math/math"
import {draw_multiplication_table, matrix_to_cell} from "../tsl/ts/visual";
import {always} from "../tsl/ts/func";
import {get_sub} from "../tsl/ts/util";
import {gen_general_linear_n_zm} from "../tsl/ts/math/group";
import {matrix_multiply_zn} from "../tsl/ts/math/matrix";

let m: number = 2
let n: number = 2

export function update_table() {
    let mul_text = document.getElementById("mul_text") as HTMLSpanElement
    mul_text.innerHTML = ("Multiplication for GL (" + n.toString() + ",Z" + get_sub(m.toString()) + ")");
    let table: HTMLTableElement
        = document.getElementById("multiplication_table") as HTMLTableElement
    let gl: number[][][] = gen_general_linear_n_zm(n, m)
    console.log(gl[0])
    draw_multiplication_table(
        table,
        gl,
        (a: number[][], b: number[][]) => matrix_multiply_zn(a, b, m),
        matrix_to_cell,
        always("lightblue"),
        (a, b, c) => {
            void a;
            void b;
            return (array_eq_2d(c, [[1, 0], [0, 1]])) ? "lightgreen" : "lightblue";
        }
    )
}

export function increment() {
    if (m < 3) {
        m += 1
    }
    update_table()
}

export function decrement() {
    if (m > 2) {
        m -= 1
    }
    update_table()
}