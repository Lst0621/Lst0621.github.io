// tsl/util.ts
function get_sub(text) {
  return "<sub>" + text + "</sub>";
}

// tsl/visual.ts
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

// tsl/math/math.ts
function gcd(a_in, b_in) {
  let a = Math.abs(a_in);
  let b = Math.abs(b_in);
  if (a == 0 || b == 0) {
    return a + b;
  }
  if (a == b) {
    return a;
  }
  if (a > b) {
    let tmp = a;
    a = b;
    b = tmp;
  }
  while (true) {
    let res = b % a;
    if (res == 0) {
      return a;
    }
    b = a;
    a = res;
  }
}

// tsl/math/number.ts
function multiply_mod_n(a, b, n) {
  return a * b % n;
}
function get_multiply_mod_n_function(n) {
  return (a, b) => multiply_mod_n(a, b, n);
}
function are_co_prime(a, b) {
  return gcd(a, b) == 1;
}
function totient(n) {
  let ans = 0;
  for (let i = 1; i <= n; i++) {
    if (are_co_prime(i, n)) {
      ans += 1;
    }
  }
  return ans;
}

// tsl/math/semigroup.ts
function get_idempotent_power(item, multiply, eq, limit = -1) {
  let square = multiply(item, item);
  let power_t = item;
  let power_2t = square;
  for (let i = 1; i != limit; i++) {
    if (eq(power_t, power_2t)) {
      return [i, power_t];
    }
    power_t = multiply(power_t, item);
    power_2t = multiply(power_2t, square);
  }
  return [-1, null];
}

// tsl/math/group.ts
function get_u_n(n) {
  let u = [];
  for (let i = 1; i <= n; i++) {
    if (are_co_prime(i, n)) {
      u.push(i);
    }
  }
  return u;
}
function get_order(element, multiply, eq = (a, b) => a === b) {
  return get_idempotent_power(element, multiply, eq)[0];
}
function get_primitive_roots(n) {
  if (n == 1) {
    return [1];
  }
  let u = get_u_n(n);
  let ret = [];
  for (let i = 0; i < u.length; i++) {
    let a = u[i];
    let order = get_order(a, get_multiply_mod_n_function(n));
    if (order == u.length) {
      ret.push(a);
    }
  }
  return ret;
}

// page/multiplication_table.ts
var table_sz = 6;
function update_table(sz) {
  let mod = sz + 1;
  let mul_text = document.getElementById("mul_text");
  mul_text.innerHTML = "Multiplication for Z" + get_sub(mod.toString()) + ". |U" + get_sub(mod.toString()) + "|=" + totient(mod) + " primitive roots: [" + get_primitive_roots(mod) + "]";
  let table = document.getElementById("multiplication_table");
  let inputs = [];
  for (let i = 1; i <= sz; i++) {
    inputs.push(i);
  }
  let co_prime_color = "#8A6BBE";
  let not_co_prime_color = "#7B90D2";
  let identity_color = "#FC9F4D";
  let unit_group_color = "#E87A90";
  let other_color = "#FEDFE1";
  draw_multiplication_table(
    table,
    inputs,
    get_multiply_mod_n_function(mod),
    (a) => "[" + a.toString() + "]",
    (a) => are_co_prime(a, mod) ? co_prime_color : not_co_prime_color,
    (a, b, c) => {
      if (c == 1) {
        return identity_color;
      }
      if (are_co_prime(a, mod) && are_co_prime(b, mod)) {
        return unit_group_color;
      } else {
        return other_color;
      }
    }
  );
}
function increment() {
  table_sz++;
  update_table(table_sz);
}
function decrement() {
  if (table_sz == 2) {
    return;
  }
  table_sz--;
  update_table(table_sz);
}
export {
  decrement,
  increment,
  update_table
};
