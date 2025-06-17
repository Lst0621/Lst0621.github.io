import {get_permutation_from_cycle, is_cycle_valid, per_to_str, permutation_multiply} from "./math.js";

function update_perm() {
    let perm_input: string = (document.getElementById("perm_input") as HTMLInputElement as HTMLInputElement).value;
    let span: HTMLSpanElement = document.getElementById('perm_text') as HTMLSpanElement;
    let parts: string[] = perm_input.split(";");
    let perm: number[] = []
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
        perm = permutation_multiply(perm, get_permutation_from_cycle(cycle));
    }
    span.innerHTML = per_to_str(perm)

}

function set_up() {
    (document.getElementById("perm_input") as HTMLInputElement as HTMLInputElement).value = "1,2,3;1,3,5";
    update_perm();
    let button: HTMLButtonElement = document.getElementById("update_button") as HTMLButtonElement
    button.onclick = update_perm;
}

set_up();