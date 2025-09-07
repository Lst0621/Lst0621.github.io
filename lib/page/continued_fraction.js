import { get_sup } from "../tsl/util.js";
import { draw_table } from "../tsl/visual.js";
import { always, function_power } from "../tsl/func.js";
function iter(x) {
    return 3 + 1 / x;
}
function update() {
    let table = document.getElementById("cf_table");
    let inits = [-10, -1, (3 - Math.sqrt(13)) / 2, -0.01, 0.01, 0.1, 0.2, 0.5, 0.8, 1, 2, 3, 4, 5, 10, 20, 100];
    let iters = [0, 1, 2, 3, 4, 5, 10, 20, 100, 1000];
    draw_table(table, iters, inits, (row, col) => {
        let init = inits[col];
        let iter_times = iters[row];
        let func = function_power(iter, iter_times);
        return func(init);
    }, iter => "f" + get_sup(iter.toString()), init => init.toString(), z => new Intl.NumberFormat("US", {
        maximumFractionDigits: 6,
    }).format(z), always("yellow"), always("lightblue"), always("lightgreen"));
}
update();
