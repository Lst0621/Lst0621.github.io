// lib/tsl/math/math.ts
function array_eq(a, b) {
  let len_a = a.length;
  let len_b = b.length;
  if (len_a != len_b) {
    return false;
  }
  for (let i = 0; i < len_a; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}
function array_eq_2d(a, b) {
  let len_a = a.length;
  let len_b = b.length;
  if (len_a != len_b) {
    return false;
  }
  for (let i = 0; i < len_a; i++) {
    if (!array_eq(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

// lib/tsl/visual.ts
function clear_table(table) {
  while (true) {
    if (table.rows.length == 0) {
      break;
    }
    table.deleteRow(0);
  }
}
function draw_table(table, rows, cols, multiply, rows_to_string, cols_to_string, element_to_string, row_get_color, col_get_color, element_get_color) {
  clear_table(table);
  table.style.alignSelf = "center";
  table.style.borderStyle = "solid";
  table.style.textAlign = "center";
  {
    let row = table.insertRow();
    row.insertCell();
    for (let i = 0; i < cols.length; i++) {
      let cell = row.insertCell();
      cell.style.borderStyle = "solid";
      cell.innerHTML = cols_to_string(cols[i]);
      cell.style.background = col_get_color(cols[i]);
    }
  }
  for (let i = 0; i < rows.length; i++) {
    let row = table.insertRow();
    let cell = row.insertCell();
    cell.style.borderStyle = "solid";
    cell.style.background = row_get_color(rows[i]);
    cell.innerHTML = rows_to_string(rows[i]);
    for (let j = 0; j < cols.length; j++) {
      let cell_product = row.insertCell();
      cell_product.style.borderStyle = "solid";
      let element = multiply(i, j);
      cell_product.innerHTML = element_to_string(element);
      cell_product.style.background = element_get_color(i, j);
    }
  }
}
function draw_multiplication_table(table, input, multiply, to_string, input_get_color, product_get_color) {
  draw_table(
    table,
    input,
    input,
    (i, j) => multiply(input[i], input[j]),
    to_string,
    to_string,
    to_string,
    input_get_color,
    input_get_color,
    (i, j) => product_get_color(input[i], input[j], multiply(input[i], input[j]))
  );
}
function matrix_to_cell(arr) {
  const matrixHtml = arr.map(
    (row) => `<div style="white-space: nowrap;">${row.map((x) => x.toString()).join(" ")}</div>`
  ).join("");
  return `
    <div style="display: flex; font-family: monospace;">
        <div style="display: flex; flex-direction: column; justify-content: center;">(</div>
        <div style="margin: 0 4px;">
            ${matrixHtml}
        </div>
        <div style="display: flex; flex-direction: column; justify-content: center;">)</div>
    </div>
    `;
}

// lib/tsl/func.ts
function always(a) {
  return (...args) => a;
}

// lib/tsl/util.ts
function get_sub(text) {
  return "<sub>" + text + "</sub>";
}

// lib/tsl/math/matrix.ts
function transpose(a) {
  let m2 = a.length;
  let n2 = a[0].length;
  let ans = [];
  for (let i = 0; i < n2; i++) {
    let array = [];
    for (let j = 0; j < m2; j++) {
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
function matrix_multiply_zn(a, b, n2) {
  return matrix_multiply_general(a, b, get_multiply_mod_n_function(n2), get_add_mod_n_function(n2));
}
function get_det_func(get, n2, multiply, addition, add_inverse) {
  if (n2 === 1) return get(0, 0);
  if (n2 === 2) {
    return addition(
      multiply(get(0, 0), get(1, 1)),
      add_inverse(multiply(get(0, 1), get(1, 0)))
    );
  }
  let det = void 0;
  let first = true;
  for (let j = 0; j < n2; j++) {
    const sub_get = (i, k) => get(i + 1, k < j ? k : k + 1);
    const sign = j % 2 === 0 ? (x) => x : add_inverse;
    const cofactor = multiply(
      sign(get(0, j)),
      get_det_func(sub_get, n2 - 1, multiply, addition, add_inverse)
    );
    if (first) {
      det = cofactor;
      first = false;
    } else {
      det = addition(det, cofactor);
    }
  }
  return det;
}
function get_det(a, multiply, addition, add_inverse) {
  const n2 = a.length;
  if (n2 === 0 || a[0].length !== n2) {
    throw new Error("Matrix must be square");
  }
  const get = (i, j) => a[i][j];
  return get_det_func(get, n2, multiply, addition, add_inverse);
}
function array_to_matrix(array, m2, n2) {
  if (array.length !== m2 * n2) {
    throw new Error(`Array length ${array.length} does not match matrix dimensions ${m2}\xD7${n2}`);
  }
  const matrix = [];
  for (let i = 0; i < m2; i++) {
    const row = array.slice(i * n2, (i + 1) * n2);
    matrix.push(row);
  }
  return matrix;
}

// lib/tsl/math/number.ts
function multiply_mod_n(a, b, n2) {
  return a * b % n2;
}
function get_multiply_mod_n_function(n2) {
  return (a, b) => multiply_mod_n(a, b, n2);
}
function add_mod_n(a, b, n2) {
  return (a + b) % n2;
}
function get_add_mod_n_function(n2) {
  return (a, b) => add_mod_n(a, b, n2);
}
function add_inverse_mod_n(a, n2) {
  return (n2 - a % n2) % n2;
}
function get_add_inverse_mod_n_function(n2) {
  return (a) => add_inverse_mod_n(a, n2);
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

// lib/tsl/math/group.ts
function gen_general_linear_n_zm(n2, m2) {
  let gen = [];
  for (let j = 0; j < n2 * n2; j++) {
    let elements = [];
    for (let i = 0; i < m2; i++) {
      elements.push(i);
    }
    gen.push(elements);
  }
  return cartesian_product(gen).map((arr) => array_to_matrix(arr, n2, n2)).filter((mat) => get_det(mat, get_multiply_mod_n_function(m2), get_add_mod_n_function(m2), get_add_inverse_mod_n_function(m2)) != 0);
}

// lib/page/gl_multiplication_table.ts
var m = 2;
var n = 2;
function update_table() {
  let mul_text = document.getElementById("mul_text");
  mul_text.innerHTML = "Multiplication for GL (" + n.toString() + ",Z" + get_sub(m.toString()) + ")";
  let table = document.getElementById("multiplication_table");
  let gl = gen_general_linear_n_zm(n, m);
  console.log(gl[0]);
  draw_multiplication_table(
    table,
    gl,
    (a, b) => matrix_multiply_zn(a, b, m),
    matrix_to_cell,
    always("lightblue"),
    (a, b, c) => array_eq_2d(c, [[1, 0], [0, 1]]) ? "lightgreen" : "lightblue"
  );
}
function increment() {
  if (m < 3) {
    m += 1;
  }
  update_table();
}
function decrement() {
  if (m > 2) {
    m -= 1;
  }
  update_table();
}
export {
  decrement,
  increment,
  update_table
};
