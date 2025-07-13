import { get_arrow_string_from_cycle, get_permutation_from_cycle, get_string_from_cycle, is_cycle_valid, per_to_arrow, perm_to_str, permutation_multiply } from "./tsl/math.js";
function update_perm() {
    let perm_input = document.getElementById("perm_input").value;
    let span = document.getElementById('perm_text');
    let parts = perm_input.split(";");
    let perm = [];
    let cycles = [];
    for (let part of parts) {
        if (part.length == 0) {
            continue;
        }
        let cycle_str = part.split(",");
        let cycle = cycle_str.map((str) => Number(str));
        if (!is_cycle_valid(cycle)) {
            span.innerHTML = cycle_str + " is not valid!";
            return;
        }
        cycles.push(cycle);
        perm = permutation_multiply(perm, get_permutation_from_cycle(cycle));
    }
    let cycles_str = cycles.map(get_string_from_cycle).join("");
    let arrow_str = cycles.map(get_arrow_string_from_cycle).join("");
    arrow_str += "=" + per_to_arrow(perm);
    span.innerHTML = cycles_str + "=" + arrow_str + "=" + perm_to_str(perm);
}
function set_up() {
    document.getElementById("perm_input").value = "1,2,3;1,3,5;7,5;8,12";
    update_perm();
    let button = document.getElementById("update_button");
    button.onclick = update_perm;
}
set_up();
