"use strict";
let span = document.getElementById('cat_text');
span.innerHTML = cartesian_product([["1", "2", "3"], ["a", "b", "c"], ["x", "y"], ["T", "F"]]);
function to_string_as_set(inputs) {
    let inputs_as_string = [];
    for (let input of inputs) {
        inputs_as_string.push(input.toString());
    }
    return "{" + inputs_as_string.join(",") + "}";
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
        all_combinations.push(to_string_as_set(l));
        return;
    }
    for (let element of inputs[index]) {
        l.push(element);
        cartesian_helper(inputs, l, all_combinations);
        l.pop();
    }
}
