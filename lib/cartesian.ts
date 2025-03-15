let span: HTMLSpanElement = document.getElementById('cat_text') as HTMLSpanElement;
span.innerHTML = cartesian_product([["1", "2", "3"], ["a", "b", "c"], ["x", "y"], ["T", "F"]]);


function to_string_as_set(inputs: any[]) {
    let inputs_as_string: string[] = [];
    for (let input of inputs) {
        inputs_as_string.push(input.toString());
    }
    return "{" + inputs_as_string.join(",") + "}"
}

function cartesian_product(inputs: string[][]): string {
    let all_combinations: string[] = []
    cartesian_helper(inputs, [], all_combinations)
    return to_string_as_set(all_combinations);
}


function cartesian_helper(inputs: string[][], l: string[], all_combinations: string[]) {
    let index: number = l.length;
    let number_of_sets: number = inputs.length;
    if (number_of_sets == index) {
        all_combinations.push(to_string_as_set(l))
        return
    }
    for (let element of inputs[index]) {
        l.push(element)
        cartesian_helper(inputs, l, all_combinations)
        l.pop()
    }
}
