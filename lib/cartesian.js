import { cartesian_product } from "./tsl/math.js";
function update_cat() {
    let cats_input = document.getElementById("cat_input").value;
    let span = document.getElementById('cat_text');
    let parts = cats_input.split(";");
    let inputs = [];
    for (let part of parts) {
        inputs.push(part.split(","));
    }
    span.innerHTML = to_string_as_set(cartesian_product(inputs).map(to_string_as_tuple));
}
function set_up() {
    document.getElementById("cat_input").value = "1,2,3,4;a,b,c,d";
    update_cat();
    let button = document.getElementById("update_button");
    button.onclick = update_cat;
}
function to_string_as_set(inputs) {
    let inputs_as_string = [];
    for (let input of inputs) {
        inputs_as_string.push(input.toString());
    }
    return "{" + inputs_as_string.join(",") + "}";
}
function to_string_as_tuple(inputs) {
    let inputs_as_string = [];
    for (let input of inputs) {
        inputs_as_string.push(input.toString());
    }
    return "(" + inputs_as_string.join(",") + ")";
}
set_up();
