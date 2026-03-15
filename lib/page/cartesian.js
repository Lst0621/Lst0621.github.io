// lib/tsl/math/matrix.ts
function transpose(a) {
  let m = a.length;
  let n = a[0].length;
  let ans = [];
  for (let i = 0; i < n; i++) {
    let array = [];
    for (let j = 0; j < m; j++) {
      array.push(a[j][i]);
    }
    ans.push(array);
  }
  return ans;
}
function matrix_multiply_general(a, b, multiply, addition) {
  const rows_a = a.length;
  const cols_a = a[0].length;
  const rows_b = b.length;
  const cols_b = b[0].length;
  if (cols_a !== rows_b) {
    console.log(a, b);
    throw new Error("Matrix dimensions do not match for multiplication " + [rows_a, cols_a, rows_b, cols_a]);
  }
  const result = [];
  for (let i = 0; i < rows_a; i++) {
    const row = [];
    for (let j = 0; j < cols_b; j++) {
      let sum = multiply(a[i][0], b[0][j]);
      for (let k = 1; k < cols_a; k++) {
        const prod = multiply(a[i][k], b[k][j]);
        sum = addition(sum, prod);
      }
      row.push(sum);
    }
    result.push(row);
  }
  return result;
}

// lib/tsl/math/set.ts
function cartesian_product(inputs) {
  return cartesian_product_matrix(inputs);
}
function cartesian_product_matrix(inputs) {
  let len = inputs.length;
  if (len == 0) {
    return inputs;
  }
  let result = [[]];
  for (let i = 0; i < len; i++) {
    if (inputs[i].length == 0) {
      console.log("input " + i.toString() + " is empty!");
      return [];
    }
    result = matrix_multiply_general(
      transpose([result]),
      [inputs[i]],
      (a, b) => [...Array.from(a), b],
      (a, b) => a
    ).flat();
  }
  return result;
}

// lib/page/cartesian.ts
function update_cat() {
  let cats_input = document.getElementById("cat_input").value;
  let span = document.getElementById("cat_text");
  let parts = cats_input.split(";");
  let inputs = [];
  for (let part of parts) {
    inputs.push(part.split(",").filter((x) => x.length > 0));
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
