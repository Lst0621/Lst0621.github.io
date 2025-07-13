function update_cat() {
    let cats_input: string = (document.getElementById("cat_input") as HTMLInputElement as HTMLInputElement).value;
    let span: HTMLSpanElement = document.getElementById('cat_text') as HTMLSpanElement;
    let parts: string[] = cats_input.split(";");
    let inputs: string[][] = []
    for (let part of parts) {
        inputs.push(part.split(","));
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

function cartesian_product(inputs: any[][]): any[][] {
    let all_combinations: any[][] = []
    let l: any[] = []
    cartesian_helper(inputs, l, all_combinations)
    console.log(all_combinations)
    return all_combinations;
}

function cartesian_helper(inputs: any[][], l: any[], all_combinations: any[][]) {
    let index: number = l.length;
    let number_of_sets: number = inputs.length;
    if (number_of_sets == index) {
        all_combinations.push(Array.from(l));
        return;
    }
    for (let element of inputs[index]) {
        l.push(element)
        cartesian_helper(inputs, l, all_combinations)
        l.pop()
    }
}

set_up();
