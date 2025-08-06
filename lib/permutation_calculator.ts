import {
    get_arrow_string_from_cycle,
    get_permutation_from_cycle,
    get_string_from_cycle, is_cycle_valid,
    per_to_arrow,
    perm_to_str, permutation_multiply
} from "./tsl/math/group.js";

function update_perm() {
    let perm_input: string = (document.getElementById("perm_input") as HTMLInputElement as HTMLInputElement).value;
    let span: HTMLSpanElement = document.getElementById('perm_text') as HTMLSpanElement;
    let parts: string[] = perm_input.split(";");
    let perm: number[] = []

    let cycles: number[][] = []
    for (let part of parts) {
        if (part.length == 0) {
            continue;
        }
        let cycle_str: string[] = part.split(",")
        let cycle: number[] = cycle_str.map((str: string) => Number(str));
        if (!is_cycle_valid(cycle)) {
            span.innerHTML = cycle_str + " is not valid!"
            return
        }
        cycles.push(cycle)

        perm = permutation_multiply(perm, get_permutation_from_cycle(cycle));
    }

    let cycles_str = cycles.map(get_string_from_cycle).join("")
    let arrow_str = cycles.map(get_arrow_string_from_cycle).join("")
    arrow_str += "=" + per_to_arrow(perm)
    span.innerHTML = cycles_str + "=" + arrow_str + "=" + perm_to_str(perm)
}

function set_up() {
    (document.getElementById("perm_input") as HTMLInputElement as HTMLInputElement).value = "1,2,3;1,3,5;7,5;8,12";
    update_perm();
    let button: HTMLButtonElement = document.getElementById("update_button") as HTMLButtonElement
    button.onclick = update_perm;
}

set_up();