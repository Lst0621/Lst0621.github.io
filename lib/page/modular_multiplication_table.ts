import { get_sub } from "../tsl/util";
import { draw_multiplication_table } from "../tsl/visual";
import { are_co_prime, get_multiply_mod_n_function, totient } from "../tsl/math/number";
import { get_primitive_roots } from "../tsl/math/group";

let modular_sz: number = 6;

export function update_modular_table(sz: number) {
    let mod: number = sz + 1;
    let mul_text = document.getElementById("mul_text_modular") as HTMLSpanElement;
    mul_text.innerHTML = "Multiplication for Z" + get_sub(mod.toString()) + ". |U" + get_sub(mod.toString()) + "|=" + totient(mod)
        + " primitive roots: [" + get_primitive_roots(mod) + "]";
    let table: HTMLTableElement = document.getElementById("multiplication_table_modular") as HTMLTableElement;

    let inputs: number[] = [];
    for (let i = 1; i <= sz; i++) {
        inputs.push(i);
    }
    let co_prime_color = "#8A6BBE";
    let not_co_prime_color = "#7B90D2";

    let identity_color = "#FC9F4D";
    let unit_group_color = "#E87A90";
    let other_color = "#FEDFE1";
    draw_multiplication_table(
        table,
        inputs,
        get_multiply_mod_n_function(mod),
        (a: number) => "[" + a.toString() + "]",
        (a: number) => (are_co_prime(a, mod) ? co_prime_color : not_co_prime_color),
        (a: number, b: number, c: number) => {
            if (c == 1) {
                return identity_color;
            }
            if (are_co_prime(a, mod) && are_co_prime(b, mod)) {
                return unit_group_color;
            } else {
                return other_color;
            }
        });
}

export function init() {
    update_modular_table(modular_sz);
}

export function increment_modular() {
    if (modular_sz < 100) {
        modular_sz++;
        update_modular_table(modular_sz);
    }
}

export function decrement_modular() {
    if (modular_sz == 2) {
        return;
    }
    modular_sz--;
    update_modular_table(modular_sz);
}
