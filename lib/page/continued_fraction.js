// lib/tsl/util.ts
function get_sup(text) {
  return "<sup>" + text + "</sup>";
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

// lib/tsl/func.ts
function always(a) {
  return (...args) => a;
}
function function_power(f, n) {
  return function_power_v2(f, n);
}
function identity(x) {
  return x;
}
function function_power_v2(f, n) {
  if (n == 0) {
    return identity;
  }
  return (x) => {
    let result = x;
    for (let i = 0; i < n; i++) {
      result = f(result);
    }
    return result;
  };
}

// lib/tsl/math/matrix.ts
function matrix_add_general(a, b, addition) {
  const rows_a = a.length;
  const cols_a = a[0].length;
  const rows_b = b.length;
  const cols_b = b[0].length;
  if (rows_a !== rows_b || rows_b !== cols_b) {
    console.log(a, b);
    throw new Error("Matrix dimensions do not match for addition " + [rows_a, cols_a, rows_b, cols_a]);
  }
  const result = [];
  for (let i = 0; i < rows_a; i++) {
    const row = [];
    for (let j = 0; j < cols_a; j++) {
      let sum = addition(a[i][j], b[i][j]);
      row.push(sum);
    }
    result.push(row);
  }
  return result;
}
function matrix_add_number(a, b) {
  return matrix_add_general(a, b, (a2, b2) => a2 + b2);
}
function matrix_inverse_number(a) {
  return matrix_inverse(
    a,
    (m, n) => m + n,
    (m, n) => m * n,
    (m) => -m,
    (m) => 1 / m
  );
}
function get_det_func(get, n, multiply, addition, add_inverse) {
  if (n === 1) return get(0, 0);
  if (n === 2) {
    return addition(
      multiply(get(0, 0), get(1, 1)),
      add_inverse(multiply(get(0, 1), get(1, 0)))
    );
  }
  let det = void 0;
  let first = true;
  for (let j = 0; j < n; j++) {
    const sub_get = (i, k) => get(i + 1, k < j ? k : k + 1);
    const sign = j % 2 === 0 ? (x) => x : add_inverse;
    const cofactor = multiply(
      sign(get(0, j)),
      get_det_func(sub_get, n - 1, multiply, addition, add_inverse)
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
function matrix_inverse(a, addition, multiply, add_inverse, mul_inverse) {
  const n = a.length;
  if (n === 0 || a[0].length !== n) {
    throw new Error("Matrix must be square");
  }
  const get = (i, j) => a[i][j];
  const det = get_det_func(get, n, multiply, addition, add_inverse);
  const det_inv = mul_inverse(det);
  const adjugate = Array.from({ length: n }, () => Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const sub_get = (r, c) => {
        const row = r < i ? r : r + 1;
        const col = c < j ? c : c + 1;
        return get(row, col);
      };
      const cofactor = get_det_func(
        sub_get,
        n - 1,
        multiply,
        addition,
        add_inverse
      );
      const sign = (i + j) % 2 === 0 ? (x) => x : add_inverse;
      adjugate[j][i] = multiply(det_inv, sign(cofactor));
    }
  }
  return adjugate;
}

// lib/tsl/math/number.ts
function complex_to_matrix(complex) {
  if (typeof complex == "number") {
    return complex_to_matrix([complex, 0]);
  }
  let real = complex[0];
  let imaginary = complex[1];
  return [[real, -imaginary], [imaginary, real]];
}
function matrix_to_complex(matrix) {
  let real = matrix[0][0];
  let imaginary = matrix[1][0];
  return [real, imaginary];
}
function complex_add(a, b) {
  let mat_a = complex_to_matrix(a);
  let mat_b = complex_to_matrix(b);
  return matrix_to_complex(matrix_add_number(mat_a, mat_b));
}
function complex_inverse(a) {
  let mat_a = complex_to_matrix(a);
  return matrix_to_complex(matrix_inverse_number(mat_a));
}

// lib/page/continued_fraction.ts
function iter(x) {
  return complex_add(3, complex_inverse(x));
}
function update() {
  let table = document.getElementById("cf_table");
  let inits = [-10, -1, (3 - Math.sqrt(13)) / 2, -0.01, 0.01, 0.1, 0.5, 1, 3, 5, 10, 20, [0, 1], [3, 4], [2, 100]];
  let iters = [0, 1, 2, 3, 4, 5, 10, 20, 100, 1e3];
  draw_table(
    table,
    iters,
    inits,
    (row, col) => {
      let init = inits[col];
      let iter_times = iters[row];
      let func = function_power(iter, iter_times);
      return func(init);
    },
    (iter2) => "f" + get_sup(iter2.toString()),
    (init) => fmt(init),
    (z) => fmt(z),
    always("yellow"),
    always("lightblue"),
    always("lightgreen")
  );
}
function fmt(x) {
  if (x instanceof Array) {
    if (Math.abs(x[1]) <= 1e-3) {
      return fmt(x[0]);
    } else {
      return fmt(x[0]) + (x[1] > 0 ? "+" : "") + fmt(x[1]) + "i";
    }
  }
  return new Intl.NumberFormat("US", {
    maximumFractionDigits: 3
  }).format(x);
}
update();
