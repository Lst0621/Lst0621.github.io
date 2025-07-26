import {get_all_permutations, get_permutation_parity, perm_to_str, permutation_multiply} from "./tsl/math.js"
import {get_sub} from "./tsl/util.js";
import {draw_multiplication_table} from "./tsl/visual.js";

let table_sz: number = 4


export function update_table(sz: number) {
    let mul_text = document.getElementById("mul_text") as HTMLSpanElement
    mul_text.innerHTML = "Multiplication for A" + get_sub(sz.toString()) + " and S" + get_sub(sz.toString())
    let table_sn: HTMLTableElement = document.getElementById("multiplication_table") as HTMLTableElement
    let table_even: HTMLTableElement = document.getElementById("even_multiplication_table") as HTMLTableElement
    let perms = get_all_permutations(sz)
    console.log(perms)
    draw_multiplication_table(
        table_sn,
        perms,
        permutation_multiply,
        perm_to_str,
        (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"),
        (b, c, a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue")
    )
    draw_multiplication_table(
        table_even,
        perms.filter(get_permutation_parity),
        permutation_multiply,
        perm_to_str,
        (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"),
        (b, c, a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue")
    )
}

export function increment(sz: number) {
    if (table_sz < 5) {
        table_sz += 1
    }
    update_table(table_sz)
}

export function decrement(sz: number) {
    if (table_sz > 2) {
        table_sz -= 1
    }
    update_table(table_sz)
}