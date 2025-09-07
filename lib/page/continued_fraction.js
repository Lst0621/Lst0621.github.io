import { get_sup } from "../tsl/util.js";
import { draw_table } from "../tsl/visual.js";
import { always, function_power } from "../tsl/func.js";
import { complex_add, complex_inverse } from "../tsl/math/number.js";
function iter(x) {
    return complex_add(3, complex_inverse(x));
}
function update() {
    let table = document.getElementById("cf_table");
    let inits = [-10, -1, (3 - Math.sqrt(13)) / 2, -0.01, 0.01, 0.1, 0.5, 1, 3, 5, 10, 20, [0, 1], [3, 4], [2, 100]];
    let iters = [0, 1, 2, 3, 4, 5, 10, 20, 100, 1000];
    draw_table(table, iters, inits, (row, col) => {
        let init = inits[col];
        let iter_times = iters[row];
        let func = function_power(iter, iter_times);
        return func(init);
    }, iter => "f" + get_sup(iter.toString()), init => fmt(init), z => fmt(z), always("yellow"), always("lightblue"), always("lightgreen"));
}
function fmt(x) {
    if (x instanceof Array) {
        if (Math.abs(x[1]) <= 0.001) {
            return fmt(x[0]);
        }
        else {
            return fmt(x[0]) + (x[1] > 0 ? "+" : "") + fmt(x[1]) + "i";
        }
    }
    return new Intl.NumberFormat("US", {
        maximumFractionDigits: 3,
    }).format(x);
}
update();
