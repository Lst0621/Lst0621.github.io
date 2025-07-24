import { get_all_permutations, get_permutation_parity, perm_to_str, permutation_multiply } from "./tsl/math.js";
import { get_sub } from "./tsl/util.js";
import { draw_multiplication_table } from "./tsl/visual.js";
let table_sz = 4;
export function update_table(sz) {
    let mul_text = document.getElementById("mul_text");
    mul_text.innerHTML = "Multiplication for A" + get_sub(sz.toString()) + " and S" + get_sub(sz.toString());
    let table_sn = document.getElementById("multiplication_table");
    let table_even = document.getElementById("even_multiplication_table");
    let perms = get_all_permutations(sz);
    console.log(perms);
    draw_multiplication_table(table_sn, perms, permutation_multiply, perm_to_str, (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"), (b, c, a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"));
    draw_multiplication_table(table_even, perms.filter(get_permutation_parity), permutation_multiply, perm_to_str, (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"), (b, c, a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"));
}
export function increment(sz) {
    if (table_sz < 5) {
        table_sz += 1;
    }
    update_table(table_sz);
}
export function decrement(sz) {
    if (table_sz > 2) {
        table_sz -= 1;
    }
    update_table(table_sz);
}
