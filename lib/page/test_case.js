// tsl/func.ts
function always(a) {
  return (...args) => a;
}
function equals(a, b) {
  return a === b;
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

// tsl/math/number.ts
function multiply_mod_n(a, b, n) {
  return a * b % n;
}
function get_multiply_mod_n_function(n) {
  return (a, b) => multiply_mod_n(a, b, n);
}
function add_mod_n(a, b, n) {
  return (a + b) % n;
}
function get_add_mod_n_function(n) {
  return (a, b) => add_mod_n(a, b, n);
}
function add_inverse_mod_n(a, n) {
  return (n - a % n) % n;
}
function get_add_inverse_mod_n_function(n) {
  return (a) => add_inverse_mod_n(a, n);
}
function mul_inverse_mod_n(a, n) {
  if (gcd(a, n) != 1) {
    throw Error("No multiplication inverse exists for " + a + " mod " + n);
  }
  for (let i = 1; i < n; i++) {
    if (multiply_mod_n(i, a, n) == 1) {
      return i;
    }
  }
  throw Error("No multiplication inverse exists for " + a + " mod " + n);
}
function get_mul_inverse_mod_n_function(n) {
  return (a) => mul_inverse_mod_n(a, n);
}
function are_co_prime(a, b) {
  return gcd(a, b) == 1;
}
function is_prime(a) {
  if (a <= 1) {
    return false;
  }
  if (a == 2 || a == 3 || a == 5) {
    return true;
  }
  for (let i = 2; i * i <= a; i++) {
    if (a % i == 0) {
      return false;
    }
  }
  return true;
}
function* gen_prime() {
  let n = 2;
  while (true) {
    if (is_prime(n)) {
      yield n;
    }
    n++;
  }
}
function get_first_n_primes(n) {
  let primes = [];
  for (let prime of gen_prime()) {
    primes.push(prime);
    if (primes.length == n) {
      break;
    }
  }
  return primes;
}
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
function complex_multiply(a, b) {
  let mat_a = complex_to_matrix(a);
  let mat_b = complex_to_matrix(b);
  return matrix_to_complex(matrix_multiply_number(mat_a, mat_b));
}
function get_conjugate(a) {
  let mat_a = complex_to_matrix(a);
  return matrix_to_complex(transpose(mat_a));
}
function complex_inverse(a) {
  let mat_a = complex_to_matrix(a);
  return matrix_to_complex(matrix_inverse_number(mat_a));
}

// tsl/math/matrix.ts
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
function matrix_multiply_number(a, b) {
  return matrix_multiply_general(a, b, (m, n) => m * n, (m, n) => m + n);
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
function matrix_multiply_zn(a, b, n) {
  return matrix_multiply_general(a, b, get_multiply_mod_n_function(n), get_add_mod_n_function(n));
}
function inner_product(a, b) {
  let product = matrix_multiply_number([a], transpose([b]));
  return product[0][0];
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
function get_det(a, multiply, addition, add_inverse) {
  const n = a.length;
  if (n === 0 || a[0].length !== n) {
    throw new Error("Matrix must be square");
  }
  const get = (i, j) => a[i][j];
  return get_det_func(get, n, multiply, addition, add_inverse);
}
function array_to_matrix(array, m, n) {
  if (array.length !== m * n) {
    throw new Error(`Array length ${array.length} does not match matrix dimensions ${m}\xD7${n}`);
  }
  const matrix = [];
  for (let i = 0; i < m; i++) {
    const row = array.slice(i * n, (i + 1) * n);
    matrix.push(row);
  }
  return matrix;
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

// tsl/math/semigroup.ts
function generate_semigroup(generators, multiply, eq, limit = -1) {
  let ret = Array.from(generators);
  let last_length = 0;
  let current_length = ret.length;
  console.debug("generating elements of the semigroup, size from " + last_length + " to " + current_length);
  while (last_length < current_length) {
    let step = 20;
    for (let i = 0; i < current_length; i++) {
      if (i % Math.max(1, Math.floor(current_length / step)) == 0) {
        console.debug("working on " + i + "/" + current_length);
      }
      for (let j = last_length; j < current_length; j++) {
        let product_ij = multiply(ret[i], ret[j]);
        if (!ret.some((ele) => eq(ele, product_ij))) {
          console.debug("adding " + i + ":" + ret[i] + " " + j + ":" + ret[j] + " " + product_ij);
          ret.push(product_ij);
        }
      }
    }
    for (let i = 0; i < current_length; i++) {
      for (let j = last_length; j < current_length; j++) {
        let product_ji = multiply(ret[j], ret[i]);
        if (!ret.some((ele) => eq(ele, product_ji))) {
          console.log("adding " + j + ":" + ret[j] + " " + i + ":" + ret[i] + " " + product_ji);
          ret.push(product_ji);
        }
      }
    }
    last_length = current_length;
    current_length = ret.length;
    console.debug("generating elements of the semigroup, size from " + last_length + " to " + current_length);
    if (limit > 0 && current_length > limit) {
      break;
    }
  }
  return ret;
}
function is_closure(generators, multiply, eq) {
  let limit = generators.length + 1;
  let closure = generate_semigroup(generators, multiply, eq, limit);
  return closure.length == closure.length;
}
function is_associative(elements, multiply, eq) {
  for (let [a, b] of cartesian_product([elements, elements])) {
    let ab = multiply(a, b);
    for (let c of elements) {
      let abc_1 = multiply(ab, c);
      let bc = multiply(b, c);
      let abc_2 = multiply(a, bc);
      if (!eq(abc_1, abc_2)) {
        console.log("Not associative for " + a + ", " + b + ", " + c + ": " + abc_1 + " != " + abc_2);
        return false;
      }
    }
  }
  return true;
}
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
function get_all_idempotent_elements(elements, multiply, eq) {
  return elements.filter((item) => eq(multiply(item, item), item));
}
function get_highest_idempotent_power(elements, multiply, eq) {
  return Math.max(...elements.map((item) => get_idempotent_power(item, multiply, eq)[0]));
}
function is_abelian(elements, multiply, eq) {
  let len = elements.length;
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < i; j++) {
      let ab = multiply(elements[i], elements[j]);
      let ba = multiply(elements[j], elements[i]);
      if (!eq(ab, ba)) {
        return false;
      }
    }
  }
  return true;
}
function semigroup_power(base, exponent, multiply) {
  if (exponent == 1) {
    return base;
  }
  let half = Math.floor(exponent / 2);
  let half_power = semigroup_power(base, half, multiply);
  if (exponent % 2 == 0) {
    return multiply(half_power, half_power);
  } else {
    return multiply(multiply(half_power, half_power), base);
  }
}
function get_definite_k_common(elements, multiply, eq, multiply_idempotent_on_right) {
  let highest_idempotent_power = get_highest_idempotent_power(elements, multiply, eq);
  let candidates = elements.map((item) => semigroup_power(item, highest_idempotent_power, multiply));
  for (let pair of cartesian_product([elements, candidates])) {
    let element = pair[0];
    let candidate = pair[1];
    let product = multiply_idempotent_on_right ? multiply(element, candidate) : multiply(candidate, element);
    if (!eq(product, candidate)) {
      return -1;
    }
  }
  return highest_idempotent_power;
}
function get_definite_k(elements, multiply, eq) {
  return get_definite_k_common(elements, multiply, eq, true);
}
function is_aperiodic(elements, multiply, eq) {
  let max_power = 1;
  for (let element of elements) {
    let [power, idempotent_element] = get_idempotent_power(element, multiply, eq);
    if (idempotent_element == null) {
      console.log("Idempotent power is not available");
      return -1;
    }
    if (!eq(multiply(idempotent_element, element), idempotent_element)) {
      console.log("Element does not satisfy aperiodic condition");
      return -1;
    }
    max_power = Math.max(max_power, power);
  }
  return max_power;
}
function is_monoid(elements, multiply, eq) {
  if (!is_closure(elements, multiply, eq)) {
    console.log("Not even a semigroup");
    return [false, null];
  }
  let idempotent_elements = get_all_idempotent_elements(elements, multiply, eq);
  console.log(idempotent_elements.length);
  for (let idempotent of idempotent_elements) {
    let is_identity = true;
    for (let element of elements) {
      if (!eq(multiply(idempotent, element), element) || !eq(multiply(element, idempotent), element)) {
        is_identity = false;
        break;
      }
    }
    if (is_identity) {
      return [true, idempotent];
    }
  }
  console.log("No identity element found");
  return [false, null];
}
function is_group(elements, multiply, eq) {
  let [is_monoid_result, optional_identity_element] = is_monoid(elements, multiply, eq);
  if (!is_monoid_result) {
    console.log("Not a monoid, so not a group");
    return [false, null];
  }
  let identity_element = optional_identity_element;
  console.log("Found identity element: " + identity_element);
  for (let element of elements) {
    let has_inverse = false;
    for (let other_element of elements) {
      let product = multiply(element, other_element);
      if (eq(product, identity_element)) {
        has_inverse = eq(multiply(other_element, element), identity_element);
        break;
      }
    }
    if (!has_inverse) {
      console.log("Element " + element + " has no inverse");
      return [false, null];
    }
  }
  return [true, identity_element];
}

// tsl/math/set.ts
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
var EndoFunction = class _EndoFunction {
  constructor(underlying_set, mapped_value, tag) {
    this.underlying_set = underlying_set;
    this.mapped_value = mapped_value;
    this.tag = tag;
    if (underlying_set.length != mapped_value.length) {
      throw Error("Size does not match!");
    }
    this.underlying_set = Array.from(underlying_set);
    this.mapped_value = Array.from(mapped_value);
  }
  eq(another) {
    return array_eq(this.underlying_set, another.underlying_set) && array_eq(this.mapped_value, another.mapped_value);
  }
  multiply(another) {
    let mapped = [];
    for (let i = 0; i < this.underlying_set.length; i++) {
      let result = this.mapped_value[i];
      let idx = this.underlying_set.indexOf(result);
      mapped.push(another.mapped_value[idx]);
    }
    let product = new _EndoFunction(this.underlying_set, mapped, this.tag + another.tag);
    return product;
  }
  toString() {
    let len = this.mapped_value.length;
    let arrows = [];
    for (let i = 0; i < len; i++) {
      arrows.push(this.underlying_set[i] + "->" + this.mapped_value[i]);
    }
    return this.tag + ":" + arrows.join(",");
  }
};
function gen_monoid_from_endofuncs(funcs) {
  return generate_semigroup(
    funcs,
    (a, b) => a.multiply(b),
    (a, b) => a.eq(b)
  );
}
function set_eq(a, b) {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (let x of a) {
    if (!b.has(x)) {
      return false;
    }
  }
  return true;
}
function union_sets(a, b) {
  return /* @__PURE__ */ new Set([...a, ...b]);
}

// tsl/util.ts
function range(start, end, step = 1) {
  let result = [];
  let entry = start;
  while (entry < end) {
    result.push(entry);
    entry += step;
  }
  return result;
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
function gen_general_linear_n_zm(n, m) {
  let gen = [];
  for (let j = 0; j < n * n; j++) {
    let elements = [];
    for (let i = 0; i < m; i++) {
      elements.push(i);
    }
    gen.push(elements);
  }
  return cartesian_product(gen).map((arr) => array_to_matrix(arr, n, n)).filter((mat) => get_det(mat, get_multiply_mod_n_function(m), get_add_mod_n_function(m), get_add_inverse_mod_n_function(m)) != 0);
}

// tsl/lang/string.ts
function get_suffix(str, n) {
  if (n >= str.length) {
    return str;
  }
  return str.substring(str.length - n, str.length);
}
function concat_and_get_suffix_k(str1, str2, k) {
  let concat_str = str1 + str2;
  return get_suffix(concat_str, k);
}
function get_concat_and_suffix_func(k) {
  return (str1, str2) => concat_and_get_suffix_k(str1, str2, k);
}
function get_all_chars(s) {
  return Array.from(new Set(s.split(""))).sort();
}
function get_alphabet_from_strings(strs) {
  return Array.from(new Set(strs.map(get_all_chars).flat()));
}

// test/test_math.ts
function test_matrix_multiply() {
  let a = [[1, 2], [3, 4]];
  let b = [[5, 6], [7, 8]];
  let c = matrix_multiply_number(a, b);
  let d = [[19, 22], [43, 50]];
  return array_eq_2d(c, d);
}
function test_matrix_add() {
  let a = [[1, 2], [3, 4]];
  let b = [[5, 6], [7, 8]];
  let c = matrix_add_number(a, b);
  let d = [[6, 8], [10, 12]];
  return array_eq_2d(c, d);
}
function test_matrix_inverse() {
  let a = [[1, 0], [0, -1]];
  let a_inverse = matrix_inverse_number(a);
  return array_eq_2d(a, a_inverse);
}
function test_cartesian_product() {
  let a = [1, 2];
  let b = [3, 4];
  let expected_product = [[1, 3], [1, 4], [2, 3], [2, 4]];
  let result = cartesian_product([a, b]);
  return array_eq_2d(expected_product, result);
}
function test_inner_product() {
  let a = [1, 2];
  let b = [3, 4];
  return 11 == inner_product(a, b);
}
function test_mod() {
  let add_inverse = get_add_inverse_mod_n_function(7);
  if (add_inverse(0) != 0) {
    return false;
  }
  for (let i = 1; i < 7; i++) {
    if (add_inverse(i) != 7 - i) {
      return false;
    }
  }
  return true;
}
function test_generate_general_linear_group_zn_m() {
  let gl_2_z2 = gen_general_linear_n_zm(2, 2);
  if (gl_2_z2.length != 6) {
    return false;
  }
  let gl_z2_2_to_group = generate_semigroup(
    gl_2_z2,
    (a, b) => matrix_multiply_zn(a, b, 2),
    array_eq_2d,
    20
  );
  if (gl_z2_2_to_group.length != gl_2_z2.length) {
    return false;
  }
  if (!is_group(gl_z2_2_to_group, (a, b) => matrix_multiply_zn(a, b, 2), array_eq_2d)[0]) {
    console.log("gl_z2_2_to_group should be a group");
    return false;
  }
  let gl_3_z2 = gen_general_linear_n_zm(3, 2);
  if (gl_3_z2.length != 168) {
    return false;
  }
  let gl_3_z2_to_group = generate_semigroup(
    gl_3_z2,
    (a, b) => matrix_multiply_zn(a, b, 2),
    array_eq_2d,
    1e3
  );
  if (gl_3_z2_to_group.length != gl_3_z2.length) {
    return false;
  }
  if (!is_group(gl_3_z2, (a, b) => matrix_multiply_zn(a, b, 2), array_eq_2d)[0]) {
    console.log("gl_3_z2 should be a group");
    return false;
  }
  let gl_2_z3 = gen_general_linear_n_zm(2, 3);
  if (gl_2_z3.length != 48) {
    return false;
  }
  for (let i = 0; i < gl_2_z3.length; ++i) {
    let mat = gl_2_z3[i];
    let inv = matrix_inverse(
      mat,
      get_add_mod_n_function(3),
      get_multiply_mod_n_function(3),
      get_add_inverse_mod_n_function(3),
      get_mul_inverse_mod_n_function(3)
    );
    if (!array_eq_2d(matrix_multiply_zn(mat, inv, 3), [[1, 0], [0, 1]])) {
      return false;
    }
  }
  let gl_2_z3_to_group = generate_semigroup(
    gl_2_z3,
    (a, b) => matrix_multiply_zn(a, b, 3),
    array_eq_2d,
    1e3
  );
  if (gl_2_z3_to_group.length != gl_2_z3.length) {
    return false;
  }
  let gl_z3_3 = gen_general_linear_n_zm(3, 3);
  if (gl_z3_3.length != 11232) {
    return false;
  }
  let step = 40;
  for (let i = 0; step * i < gl_z3_3.length; ++i) {
    let mat = gl_z3_3[step * i];
    let inv = matrix_inverse(
      mat,
      get_add_mod_n_function(3),
      get_multiply_mod_n_function(3),
      get_add_inverse_mod_n_function(3),
      get_mul_inverse_mod_n_function(3)
    );
    if (!array_eq_2d(matrix_multiply_zn(mat, inv, 3), [[1, 0, 0], [0, 1, 0], [0, 0, 1]])) {
      return false;
    }
  }
  return true;
}
function test_complex_numbers() {
  let a = [1, 2];
  let b = [3, 4];
  let c = 4;
  let i = [0, 1];
  let ab = complex_multiply(a, b);
  if (!array_eq([-5, 10], ab)) {
    return false;
  }
  let ac = complex_multiply(a, c);
  if (!array_eq([4, 8], ac)) {
    console.log(ac);
    return false;
  }
  let a_plus_b = complex_add(a, b);
  if (!array_eq([4, 6], a_plus_b)) {
    console.log(a_plus_b);
    return false;
  }
  let a_conjugate = get_conjugate(a);
  if (!array_eq([1, -2], a_conjugate)) {
    return false;
  }
  let minus_i = complex_inverse(i);
  if (!array_eq(minus_i, [0, -1])) {
    return false;
  }
  if (!array_eq([1, 0], complex_inverse(1))) {
    return false;
  }
  return true;
}
function test_gen_primes() {
  let primes = get_first_n_primes(10);
  let expected = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  return array_eq(primes, expected);
}
function test_get_primitive_root(limit = 10) {
  for (let n = 2; n <= limit; n++) {
    let u = get_u_n(n);
    let roots = get_primitive_roots(n);
    for (let root of roots) {
      let g = generate_semigroup([root], get_multiply_mod_n_function(n), (a, b) => a == b, n);
      if (g.length != u.length) {
        return false;
      }
    }
  }
  return true;
}
function test_set_union() {
  let letters = "abcd";
  let alphabet = get_alphabet_from_strings([letters]);
  let singletons = alphabet.map((c) => /* @__PURE__ */ new Set([c]));
  let generators = Array.from(singletons);
  generators.push(/* @__PURE__ */ new Set());
  let associative = is_associative(generators, union_sets, set_eq);
  if (!associative) {
    console.log("set union is not associative");
    return false;
  }
  let all_sets = generate_semigroup(generators, union_sets, set_eq, 5e3);
  let expected = Math.pow(2, alphabet.length);
  if (all_sets.length != expected) {
    console.log("expected " + expected + " got " + all_sets.length);
    return false;
  }
  if (!is_abelian(all_sets, union_sets, set_eq)) {
    console.log("set union is not abelian");
    return false;
  }
  let definite_k = get_definite_k(all_sets, union_sets, set_eq);
  if (definite_k != -1) {
    console.log("Set union should not be definite");
    return false;
  }
  let highest_idempotent_power = get_highest_idempotent_power(all_sets, union_sets, set_eq);
  if (highest_idempotent_power != 1) {
    console.log("Set union highest idempotent power should be 1, got " + highest_idempotent_power);
    return false;
  }
  let is_set_union_abelian = is_abelian(all_sets, union_sets, set_eq);
  if (!is_set_union_abelian) {
    console.log("Set union should be abelian");
    return false;
  }
  let aperiod = is_aperiodic(all_sets, union_sets, set_eq);
  if (aperiod != 1) {
    console.log("Set union should be aperiodic with 1, got " + aperiod);
    return false;
  }
  let identity_element = is_monoid(all_sets, union_sets, set_eq)[1];
  if (identity_element == null || identity_element.size != 0) {
    console.log("identity element should be empty set");
    return false;
  }
  return true;
}
function test_endo_function() {
  let underlying_set = range(1, 5);
  let identity = new EndoFunction(underlying_set, underlying_set, "");
  let is_trivial_a_group = is_group([identity], (a, b) => a.multiply(b), (a, b) => a.eq(b))[0];
  if (!is_trivial_a_group) {
    console.log("identity endofunction should form a trivial group");
    return false;
  }
  let shift_one = new EndoFunction(underlying_set, [2, 3, 4, 1], "a");
  let swap_1_2 = new EndoFunction(underlying_set, [2, 1, 3, 4], "b");
  let endo_funcs_group = gen_monoid_from_endofuncs([shift_one, swap_1_2]);
  console.log("Generated endofunctions group of size " + endo_funcs_group.length);
  let is_group_result = is_group(endo_funcs_group, (a, b) => a.multiply(b), (a, b) => a.eq(b))[0];
  if (!is_group_result) {
    console.log("this should be a group");
    return false;
  }
  return true;
}

// test/test_lang.ts
function test_definite_k() {
  let alphabet = get_alphabet_from_strings(["abcd"]);
  console.log(alphabet);
  let k = 3;
  let concat_with_suffix = get_concat_and_suffix_func(k);
  let strs = generate_semigroup(alphabet, concat_with_suffix, equals);
  if (get_highest_idempotent_power(strs, concat_with_suffix, equals) != k) {
    console.log("failed at highest idempotent power");
    return false;
  }
  let idempotent_elements = get_all_idempotent_elements(strs, concat_with_suffix, equals);
  if (idempotent_elements.length != Math.pow(alphabet.length, k)) {
    console.log("failed at idempotent_elements size");
    return false;
  }
  if (get_definite_k(strs, concat_with_suffix, equals) != k) {
    console.log("failed at definite k");
    return false;
  }
  if (is_abelian(strs, concat_with_suffix, equals)) {
    console.log("failed at abelian");
    return false;
  }
  let identity_element = is_monoid(strs, concat_with_suffix, equals)[1];
  console.log(identity_element);
  if (identity_element != null) {
    console.log("failed at monoid");
    return false;
  }
  let is_group_result = is_group(strs, concat_with_suffix, equals)[0];
  if (is_group_result) {
    console.log("failed at group");
    return false;
  }
  return true;
}

// tsl/wasm_api.ts
import wasmSample from "../tsl/wasm/wasm_out_v1/wasm_sample.js";
var moduleInstance = null;
async function createModulePromise() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  const proc = g && g.process;
  const inNode = typeof proc?.versions?.node === "string";
  if (inNode) {
    const nodeFs = "node:fs";
    const nodeUrl = "node:url";
    const nodePath = "node:path";
    const fs = await import(nodeFs);
    const url = await import(nodeUrl);
    const path = await import(nodePath);
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wasmPath = path.join(__dirname, "wasm", "wasm_out_v1", "wasm_sample.wasm");
    const wasmBinary = fs.readFileSync(wasmPath);
    const mod2 = await wasmSample({ wasmBinary });
    moduleInstance = mod2;
    return mod2;
  }
  const mod = await wasmSample();
  moduleInstance = mod;
  return mod;
}
var modulePromise = createModulePromise();
function initWasm() {
  return modulePromise;
}
await initWasm();
function getHeap32() {
  if (!moduleInstance) {
    throw new Error(
      "WASM module not initialized. Call and await initWasm() before using WASM functions."
    );
  }
  const m = moduleInstance;
  const HEAP32 = m.HEAP32;
  if (!HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return HEAP32;
}
function toInt32Array(input) {
  return input instanceof Int32Array ? input : new Int32Array(input);
}
function copyToHeap(HEAP32, data, offsetInInts) {
  for (let i = 0; i < data.length; i++) {
    HEAP32[offsetInInts + i] = data[i];
  }
}
function allocateMemory(HEAP32, arr32, seq32, extraSize = 0) {
  const arrOffsetInInts = 1024;
  const seqOffsetInInts = arrOffsetInInts + arr32.length;
  const outputOffsetInInts = seqOffsetInInts + seq32.length;
  if (HEAP32.length < outputOffsetInInts + extraSize) {
    throw new Error("WASM memory exhausted");
  }
  return { arrOffsetInInts, seqOffsetInInts, outputOffsetInInts };
}
function wasm_number_of_sequences(arr, seq) {
  const HEAP32 = getHeap32();
  const arr32 = toInt32Array(arr);
  const seq32 = toInt32Array(seq);
  if (arr32.length === 0 || seq32.length === 0) {
    return 0;
  }
  const { arrOffsetInInts, seqOffsetInInts } = allocateMemory(HEAP32, arr32, seq32);
  copyToHeap(HEAP32, arr32, arrOffsetInInts);
  copyToHeap(HEAP32, seq32, seqOffsetInInts);
  const arrPtr = arrOffsetInInts * 4;
  const seqPtr = seqOffsetInInts * 4;
  return moduleInstance._wasm_number_of_sequences(arrPtr, arr32.length, seqPtr, seq32.length);
}
function build_multi_dimensional_array(flatData, dimensions) {
  if (dimensions.length === 0) {
    return flatData[0];
  }
  if (dimensions.length === 1) {
    return Array.from(flatData);
  }
  const currentDim = dimensions[0];
  const remainingDims = dimensions.slice(1);
  const subArraySize = remainingDims.reduce((a, b) => a * (b + 1), 1);
  const result = [];
  for (let i = 0; i <= currentDim; i++) {
    const subData = flatData.slice(i * subArraySize, (i + 1) * subArraySize);
    result.push(build_multi_dimensional_array(subData, remainingDims));
  }
  return result;
}
function wasm_number_of_sequences_all(arr, seq) {
  const HEAP32 = getHeap32();
  const arr32 = toInt32Array(arr);
  const seq32 = toInt32Array(seq);
  if (arr32.length === 0 || seq32.length === 0) {
    return [];
  }
  let totalSize = 1;
  for (let i = 0; i < seq32.length; i++) {
    totalSize *= seq32[i] + 1;
  }
  const { arrOffsetInInts, seqOffsetInInts } = allocateMemory(HEAP32, arr32, seq32, totalSize);
  copyToHeap(HEAP32, arr32, arrOffsetInInts);
  copyToHeap(HEAP32, seq32, seqOffsetInInts);
  const arrPtr = arrOffsetInInts * 4;
  const seqPtr = seqOffsetInInts * 4;
  const outputPtr = moduleInstance._wasm_number_of_sequences_all(arrPtr, arr32.length, seqPtr, seq32.length);
  const outputOffsetFromWasm = outputPtr / 4;
  const flatData = new Int32Array(totalSize);
  for (let i = 0; i < totalSize; i++) {
    flatData[i] = HEAP32[outputOffsetFromWasm + i];
  }
  const dimensions = new Int32Array(seq32);
  return build_multi_dimensional_array(flatData, dimensions);
}
function wasm_get_gl_n_zm_size(n, m) {
  if (!moduleInstance) {
    throw new Error(
      "WASM module not initialized. Call and await initWasm() before using WASM functions."
    );
  }
  return moduleInstance._wasm_get_gl_n_zm_size(n, m);
}
function wasm_matrix_det(data, n) {
  const HEAP32 = getHeap32();
  const data32 = toInt32Array(data);
  const totalSize = n * n;
  if (data32.length !== totalSize) {
    throw new Error(`Expected ${totalSize} elements for a ${n}\xD7${n} matrix, got ${data32.length}`);
  }
  const dataOffsetInInts = 1024;
  if (HEAP32.length < dataOffsetInInts + totalSize) {
    throw new Error("WASM memory exhausted");
  }
  copyToHeap(HEAP32, data32, dataOffsetInInts);
  const dataPtr = dataOffsetInInts * 4;
  return moduleInstance._wasm_matrix_det(dataPtr, n);
}

// test/test_wasm.ts
function test_wasm_number_of_sequences() {
  try {
    const result = wasm_number_of_sequences([2, 3, 6, 7, 8], [7, 10]);
    console.log("wasm_number_of_sequences([2,3,6,7,8], [7,10]) =", result);
    return result === 1158;
  } catch (err) {
    console.error("test_wasm_number_of_sequences error:", err.message);
    return false;
  }
}
function test_wasm_number_of_sequences_all() {
  try {
    const result = wasm_number_of_sequences_all([2, 3, 6, 7, 8], [7, 10]);
    console.log("wasm_number_of_sequences_all([2,3,6,7,8], [7,10]) result:", result);
    const isArray = Array.isArray(result);
    const hasCorrectRows = result.length === 8;
    const hasCorrectCols = result[0] && result[0].length === 11;
    console.log("Result is array:", isArray);
    console.log("Correct row count (8):", hasCorrectRows);
    console.log("Correct col count (11):", hasCorrectCols);
    let allMatch = true;
    let mismatchCount = 0;
    for (let i = 0; i <= 7; i++) {
      for (let j = 0; j <= 10; j++) {
        const resultValue = result[i][j];
        const expectedValue = wasm_number_of_sequences([2, 3, 6, 7, 8], [i, j]);
        if (resultValue !== expectedValue) {
          console.error(`Mismatch at [${i}][${j}]: got ${resultValue}, expected ${expectedValue}`);
          allMatch = false;
          mismatchCount++;
        }
      }
    }
    if (mismatchCount > 0) {
      console.log(`
Found ${mismatchCount} mismatches out of 88 entries`);
    } else {
      console.log("\n\u2713 All 88 entries match perfectly!");
    }
    return isArray && hasCorrectRows && hasCorrectCols && allMatch;
  } catch (err) {
    console.error("test_wasm_number_of_sequences_all error:", err.message);
    return false;
  }
}
function test_wasm_get_gl_n_zm_size() {
  try {
    let test_cases = [
      { n: 2, m: 2, expected: 6 },
      // gl_2_z2.length
      { n: 3, m: 2, expected: 168 },
      // gl_3_z2.length
      { n: 2, m: 3, expected: 48 },
      // gl_2_z3.length
      { n: 3, m: 3, expected: 11232 }
      // gl_z3_3.length
    ];
    for (let { n, m, expected } of test_cases) {
      let result = wasm_get_gl_n_zm_size(n, m);
      if (result !== expected) {
        console.error(`Mismatch: wasm_get_gl_n_zm_size(${n}, ${m}): expected ${expected}, got ${result}`);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error("test_wasm_get_gl_n_zm_size error:", err.message);
    return false;
  }
}
function test_wasm_matrix_det() {
  try {
    const flatten = (matrix) => matrix.flat();
    const mat2x2 = [
      [3, 8],
      [4, 6]
    ];
    const det2x2 = wasm_matrix_det(flatten(mat2x2), 2);
    if (det2x2 !== -14) {
      console.error(`2x2 matrix: expected -14, got ${det2x2}`);
      return false;
    }
    const mat3x3 = [
      [2, 5, 1],
      [3, 1, 4],
      [1, 2, 3]
    ];
    const det3x3 = wasm_matrix_det(flatten(mat3x3), 3);
    if (det3x3 !== -30) {
      console.error(`3x3 matrix: expected -30, got ${det3x3}`);
      return false;
    }
    const mat5x5 = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 1],
      [3, 4, 5, 1, 2],
      [4, 5, 1, 2, 3],
      [5, 1, 2, 3, 4]
    ];
    const det5x5 = wasm_matrix_det(flatten(mat5x5), 5);
    if (det5x5 === 0) {
      console.error(`5x5 matrix: got zero determinant (matrix should be invertible)`);
      return false;
    }
    const mat10x10 = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 1],
      [3, 4, 5, 6, 7, 8, 9, 10, 1, 2],
      [4, 5, 6, 7, 8, 9, 10, 1, 2, 3],
      [5, 6, 7, 8, 9, 10, 1, 2, 3, 4],
      [6, 7, 8, 9, 10, 1, 2, 3, 4, 5],
      [7, 8, 9, 10, 1, 2, 3, 4, 5, 6],
      [8, 9, 10, 1, 2, 3, 4, 5, 6, 7],
      [9, 10, 1, 2, 3, 4, 5, 6, 7, 8],
      [10, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    ];
    const det10x10 = wasm_matrix_det(flatten(mat10x10), 10);
    if (det10x10 === 0) {
      console.error(`10x10 matrix: got zero determinant (matrix should be invertible)`);
      return false;
    }
    const mat10x10Complex = [
      [-1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [2, -3, 4, 5, 6, 7, 8, 9, 10, 1],
      [3, 4, -5, 6, 7, 8, 9, 10, 1, 2],
      [4, 5, 6, -7, 8, 9, 10, 1, 2, 3],
      [5, 6, 7, 8, -9, 10, 1, 2, 3, 4],
      [6, 7, 8, 9, 10, -1, 2, 3, 4, 5],
      [7, 8, 9, 10, 1, 2, -3, 4, 5, 6],
      [8, 9, 10, 1, 2, 3, 4, -5, 6, 7],
      [9, 10, 1, 2, 3, 4, 5, 6, -7, 8],
      [10, 1, 2, 3, 4, 5, 6, 7, 8, -9]
    ];
    const det10x10Complex = wasm_matrix_det(flatten(mat10x10Complex), 10);
    console.log(`10x10 complex matrix det = ${det10x10Complex}`);
    return true;
  } catch (err) {
    console.error("test_wasm_matrix_det error:", err.message);
    return false;
  }
}

// test/tests.ts
function get_tests() {
  const tests = [test_matrix_multiply, test_matrix_add, test_matrix_inverse, test_cartesian_product, test_inner_product, test_mod, test_generate_general_linear_group_zn_m, test_complex_numbers, test_gen_primes, test_get_primitive_root, test_definite_k, test_set_union, test_endo_function, test_wasm_number_of_sequences, test_wasm_number_of_sequences_all, test_wasm_get_gl_n_zm_size, test_wasm_matrix_det];
  return tests;
}

// page/test_case.ts
function test_failure() {
  return false;
}
function test_error() {
  throw Error("test_error");
  return false;
}
async function draw_test_cases_table(table, tests) {
  let l = tests.length;
  let results = Array(l).fill(null);
  let test_names = tests.map((test) => test.name);
  let errors = Array(l).fill("");
  console.log(results);
  console.log(errors);
  for (let i = 0; i < tests.length; i++) {
    let test_case = tests[i];
    try {
      results[i] = test_case();
    } catch (err) {
      console.log(err);
      results[i] = false;
      errors[i] = err.message;
    }
    console.log("test: " + test_case.name + " " + results[i]);
    await update(results, errors, table, test_names);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
}
async function update(results, errors, table, test_names) {
  let columns = ["PASS", "FAILED", "ERROR"];
  function get_element(i, j) {
    if (results[i] == null) {
      return "";
    }
    if (results[i]) {
      return j == 0 ? "pass" : "";
    } else {
      if (j == 0) {
        return "";
      }
      if (j == 1) {
        return "failed";
      }
      if (j == 2) {
        return errors[i];
      }
    }
  }
  let pass_color = "lightgreen";
  let fail_color = "#DC143C";
  let error_color = "yellow";
  let default_color = "white";
  draw_table(
    table,
    test_names,
    columns,
    get_element,
    String,
    String,
    String,
    always("lightblue"),
    (str) => {
      if (str == columns[0]) {
        return pass_color;
      }
      if (str == columns[1]) {
        return fail_color;
      }
      return error_color;
    },
    (row, col) => {
      if (results[row] && col == 0) {
        return pass_color;
      }
      if (results[row] == false && col == 1) {
        return fail_color;
      }
      if (errors[row].length > 0 && col == 2) {
        return error_color;
      }
      return default_color;
    }
  );
}
async function update_table() {
  let table = document.getElementById("test_case_table");
  let tests = get_tests();
  tests.push(test_failure, test_error);
  await draw_test_cases_table(table, tests);
}
export {
  update_table
};
