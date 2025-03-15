"use strict";
function update_cat() {
    let cats_input = document.getElementById("cat_input").value;
    let span = document.getElementById('cat_text');
    let parts = cats_input.split(";");
    let inputs = [];
    for (let part of parts) {
        inputs.push(part.split(","));
    }
    span.innerHTML = cartesian_product(inputs);
}
function set_up() {
    document.getElementById("cat_input").value = "1,2,3,4;a,b,c,d";
    update_cat();
    let button = document.getElementById("update_button");
    button.onclick = update_cat;
}
set_up();
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
function cartesian_product(inputs) {
    let all_combinations = [];
    cartesian_helper(inputs, [], all_combinations);
    return to_string_as_set(all_combinations);
}
function cartesian_helper(inputs, l, all_combinations) {
    let index = l.length;
    let number_of_sets = inputs.length;
    if (number_of_sets == index) {
        all_combinations.push(to_string_as_tuple(l));
        return;
    }
    for (let element of inputs[index]) {
        l.push(element);
        cartesian_helper(inputs, l, all_combinations);
        l.pop();
    }
}
