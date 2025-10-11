import { poly_eval, poly_to_html, poly_to_latex_high_to_low, poly_to_latex_low_to_high } from "../tsl/math/polynomial.js";
import { gen_prime } from "../tsl/math/number.js";
import { range } from "../tsl/util.js";
import { clear_table, draw_table } from "../tsl/visual.js";
import { always } from "../tsl/func.js";
function update_poly() {
    let poly_input = document.getElementById("poly_input").value;
    let span = document.getElementById('poly_text');
    let poly = poly_input.split(";").map(Number);
    span.innerHTML = "Latex: " + poly_to_latex_low_to_high(poly) + "<br>"
        + "Latex: " + poly_to_latex_high_to_low(poly) + "<br>"
        + "HTML: " + poly_to_html(poly);
    let table = document.getElementById("poly_eval_table");
    for (let prime of gen_prime()) {
        console.log("prime " + prime);
        let vars = range(0, prime).map(n => poly_eval(poly, n) % prime);
        console.log(vars);
        if (vars.every(v => v != 0)) {
            let mods = range(1, prime + 1);
            let rows = [0].concat(mods);
            draw_table(table, rows, range(0, prime), (row, col) => {
                let value = poly_eval(poly, col);
                if (row == 0) {
                    return value;
                }
                else {
                    return value % row;
                }
            }, i => "(" + poly_to_html(poly) + ")" + (i > 0 ? (" mod " + i.toString()) : ""), c => c.toString(), e => e.toString(), always("lightgreen"), always("lightyellow"), always("lightblue"));
            break;
        }
        if (prime >= 97) {
            clear_table(table);
            break;
        }
    }
}
function set_up() {
    document.getElementById("poly_input").value = "3;-1;1;1";
    update_poly();
    let button = document.getElementById("update_button");
    button.onclick = update_poly;
}
set_up();
