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

// lib/tsl/func.ts
function always(a) {
  return (...args) => a;
}

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

// lib/tsl/math/semigroup.ts
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

// lib/tsl/util.ts
function get_sup(text) {
  return "<sup>" + text + "</sup>";
}

// lib/tsl/math/group.ts
function pad_permutations(p1, p2) {
  let l1 = p1.length;
  let l2 = p2.length;
  let l = Math.max(l1, l2);
  let p1_copy = Array.from(p1);
  let p2_copy = Array.from(p2);
  for (let i = l1 + 1; i <= l; i++) {
    p1_copy.push(i);
  }
  for (let i = l2 + 1; i <= l; i++) {
    p2_copy.push(i);
  }
  return [p1_copy, p2_copy];
}
function permutation_multiply(p1, p2) {
  let l1 = p1.length;
  let l2 = p2.length;
  let l = Math.max(l1, l2);
  let padded = pad_permutations(p1, p2);
  let p1_copy = padded[0];
  let p2_copy = padded[1];
  let ans = [];
  for (let i = 1; i <= l; i++) {
    let p2_i = p2_copy[i - 1];
    let p1_p2_i = p1_copy[p2_i - 1];
    ans.push(p1_p2_i);
  }
  return ans;
}
function get_cycles_from_permutations(perm) {
  let visited = Array(perm.length).fill(0);
  let cycles = [];
  let cycle = [];
  let i = 0;
  while (true) {
    if (i == perm.length) {
      break;
    }
    if (visited[i] == true) {
      if (cycle.length != 0) {
        cycles.push(Array.from(cycle));
      }
      cycle = [];
      i = i + 1;
      continue;
    }
    let from = i + 1;
    let to = perm[i];
    visited[i] = true;
    cycle.push(from);
    i = to - 1;
  }
  return cycles;
}
function get_permutation_parity(perm) {
  let cycles = get_cycles_from_permutations(perm);
  let parity = true;
  for (let cycle of cycles) {
    let is_cycle_odd = cycle.length % 2 == 0;
    parity = parity && !is_cycle_odd || !parity && is_cycle_odd;
  }
  return parity;
}
function get_string_from_cycle(cycle) {
  let join_str = cycle.some((value) => value > 9) ? "," : "";
  return "(" + cycle.map(String).join(join_str) + ")";
}
function perm_to_str(perm) {
  let cycles = get_cycles_from_permutations(perm);
  let cycle_str = cycles.filter((cycle) => cycle.length > 1).map(get_string_from_cycle).join("");
  if (cycle_str.length == 0) {
    return "e";
  }
  return cycle_str;
}
function get_all_dihedral(n) {
  return generate_semigroup([[1, 0], [0, 1]], (a, b) => dihedral_multiply(a, b, n), array_eq, 0).sort(
    (a, b) => a[1] == b[1] ? a[0] - b[0] : a[1] - b[1]
  );
}
function dihedral_multiply(a, b, n) {
  let r_a = a[0];
  let s_a = a[1];
  let r_b = b[0];
  let s_b = b[1];
  if (s_a == 0) {
    return [(r_a + r_b) % n, s_b];
  } else {
    return [(r_a + n - r_b) % n, 1 - s_b];
  }
}
function dihedral_to_permutation(dihedral, n) {
  let perm = [];
  let r = [];
  for (let i = 2; i <= n; i++) {
    r.push(i);
  }
  r.push(1);
  for (let i = 0; i < dihedral[0]; i++) {
    perm = permutation_multiply(perm, r);
  }
  if (dihedral[1] == 1) {
    let s = [];
    for (let i = 1; i <= n; i++) {
      if (i == 1) {
        s.push(i);
      } else {
        s.push(n + 2 - i);
      }
    }
    perm = permutation_multiply(perm, s);
  }
  return perm;
}
function dihedral_to_str(a) {
  let r = a[0];
  let s = a[1];
  if (r == 0 && s == 0) {
    return "e";
  }
  if (r == 0) {
    return "s";
  }
  return "r" + (r == 1 ? "" : get_sup(r.toString())) + (s == 0 ? "" : "s");
}

// lib/page/dihedral_multiplication_table.ts
var table_sz = 4;
function update_table(sz) {
  let mul_text = document.getElementById("mul_text");
  mul_text.innerHTML = "Multiplication for D<sub>" + sz.toString() + "</sub>";
  let table = document.getElementById("multiplication_table");
  let table2 = document.getElementById("multiplication_table_perm");
  let dihedrals = get_all_dihedral(sz);
  console.log(dihedrals);
  draw_multiplication_table(
    table,
    dihedrals,
    (a, b) => dihedral_multiply(a, b, sz),
    dihedral_to_str,
    always("lightblue"),
    always("lightyellow")
  );
  draw_multiplication_table(
    table2,
    dihedrals.map((dihedral) => dihedral_to_permutation(dihedral, sz)),
    permutation_multiply,
    perm_to_str,
    (a) => get_permutation_parity(a) ? "lightgreen" : "lightblue",
    (b, c, a) => get_permutation_parity(a) ? "lightgreen" : "lightblue"
  );
}
function increment(sz) {
  if (table_sz < 10) {
    table_sz += 1;
  }
  update_table(table_sz);
}
function decrement(sz) {
  if (table_sz > 3) {
    table_sz -= 1;
  }
  update_table(table_sz);
}
export {
  decrement,
  increment,
  update_table
};
