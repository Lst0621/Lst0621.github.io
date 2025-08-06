import { draw_multiplication_table } from "../tsl/visual.js";
import { always } from "../tsl/func.js";
import { dihedral_multiply, dihedral_to_permutation, dihedral_to_str, get_all_dihedral, get_permutation_parity, perm_to_str, permutation_multiply } from "../tsl/math/group.js";
let table_sz = 4;
export function update_table(sz) {
    let mul_text = document.getElementById("mul_text");
    mul_text.innerHTML = "Multiplication for D" + "<sub>" + (sz).toString() + "</sub>";
    let table = document.getElementById("multiplication_table");
    let table2 = document.getElementById("multiplication_table_perm");
    let dihedrals = get_all_dihedral(sz);
    console.log(dihedrals);
    draw_multiplication_table(table, dihedrals, (a, b) => dihedral_multiply(a, b, sz), dihedral_to_str, always("lightblue"), always("lightyellow"));
    draw_multiplication_table(table2, dihedrals.map(dihedral => dihedral_to_permutation(dihedral, sz)), permutation_multiply, perm_to_str, (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"), (b, c, a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"));
}
export function increment(sz) {
    if (table_sz < 10) {
        table_sz += 1;
    }
    update_table(table_sz);
}
export function decrement(sz) {
    if (table_sz > 3) {
        table_sz -= 1;
    }
    update_table(table_sz);
}
