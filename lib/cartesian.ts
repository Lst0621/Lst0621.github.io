import {cartesian_product} from "./tsl/math.js";

function update_cat() {
    let cats_input: string = (document.getElementById("cat_input") as HTMLInputElement as HTMLInputElement).value;
    let span: HTMLSpanElement = document.getElementById('cat_text') as HTMLSpanElement;
    let parts: string[] = cats_input.split(";");
    let inputs: string[][] = []
    for (let part of parts) {
        inputs.push(part.split(",").filter(x => x.length > 0));
    }
    span.innerHTML = to_string_as_set(cartesian_product(inputs).map(to_string_as_tuple))
}

function set_up() {
    (document.getElementById("cat_input") as HTMLInputElement as HTMLInputElement).value = "1,2,3,4;a,b,c,d";
    update_cat();
    let button: HTMLButtonElement = document.getElementById("update_button") as HTMLButtonElement
    button.onclick = update_cat;
}

function to_string_as_set(inputs: any[]) {
    let inputs_as_string: string[] = [];
    for (let input of inputs) {
        inputs_as_string.push(input.toString());
    }
    return "{" + inputs_as_string.join(",") + "}"
}

function to_string_as_tuple(inputs: any[]) {
    let inputs_as_string: string[] = [];
    for (let input of inputs) {
        inputs_as_string.push(input.toString());
    }
    return "(" + inputs_as_string.join(",") + ")"
}

set_up();
