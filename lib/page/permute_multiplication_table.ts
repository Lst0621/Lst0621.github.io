import {get_sub} from "../tsl/util";
import {draw_multiplication_table} from "../tsl/visual";
import {get_all_permutations, get_permutation_parity, perm_to_str, permutation_multiply} from "../tsl/math/group";

let table_sz: number = 4;

export function update_symmetric_group_table(sz: number) {
    let mul_text = document.getElementById("mul_text_symmetric") as HTMLSpanElement;
    mul_text.innerHTML = "S" + get_sub(sz.toString());
    let table_sn: HTMLTableElement = document.getElementById("multiplication_table_symmetric") as HTMLTableElement;
    let table_even: HTMLTableElement = document.getElementById("even_multiplication_table") as HTMLTableElement;
    let perms = get_all_permutations(sz);
    draw_multiplication_table(
        table_sn,
        perms,
        permutation_multiply,
        perm_to_str,
        (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"),
        (b, c, a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue")
    );
    draw_multiplication_table(
        table_even,
        perms.filter(get_permutation_parity),
        permutation_multiply,
        perm_to_str,
        (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"),
        (b, c, a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue")
    );
}

export function init() {
    update_symmetric_group_table(table_sz);
}

