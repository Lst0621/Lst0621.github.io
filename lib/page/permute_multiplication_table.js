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

// tsl/math/group.ts
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
function get_identity_permutation(n) {
  return Array(n).fill(0).map((_, i) => i + 1);
}
function get_all_permutations(n) {
  let e = get_identity_permutation(n);
  let perm = e;
  let ans = [e];
  while (true) {
    let next = next_permutation(perm);
    if (next.every((val, i) => val === e[i])) {
      break;
    }
    perm = next;
    ans.push(perm);
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
function next_permutation(perm) {
  let next = Array.from(perm);
  next_permutation_in_place(next);
  return next;
}
function next_permutation_in_place(nums) {
  let i = nums.length - 2;
  while (i >= 0 && nums[i] >= nums[i + 1]) {
    i--;
  }
  if (i >= 0) {
    let j = nums.length - 1;
    while (j >= 0 && nums[j] <= nums[i]) {
      j--;
    }
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  let left = i + 1;
  let right = nums.length - 1;
  while (left < right) {
    [nums[left], nums[right]] = [nums[right], nums[left]];
    left++;
    right--;
  }
}

// page/permute_multiplication_table.ts
var table_sz = 4;
function update_table(sz) {
  let mul_text = document.getElementById("mul_text");
  mul_text.innerHTML = "Multiplication for A" + get_sub(sz.toString()) + " and S" + get_sub(sz.toString());
  let table_sn = document.getElementById("multiplication_table");
  let table_even = document.getElementById("even_multiplication_table");
  let perms = get_all_permutations(sz);
  console.log(perms);
  draw_multiplication_table(
    table_sn,
    perms,
    permutation_multiply,
    perm_to_str,
    (a) => get_permutation_parity(a) ? "lightgreen" : "lightblue",
    (b, c, a) => get_permutation_parity(a) ? "lightgreen" : "lightblue"
  );
  draw_multiplication_table(
    table_even,
    perms.filter(get_permutation_parity),
    permutation_multiply,
    perm_to_str,
    (a) => get_permutation_parity(a) ? "lightgreen" : "lightblue",
    (b, c, a) => get_permutation_parity(a) ? "lightgreen" : "lightblue"
  );
}
function increment(sz) {
  if (table_sz < 5) {
    table_sz += 1;
  }
  update_table(table_sz);
}
function decrement(sz) {
  if (table_sz > 2) {
    table_sz -= 1;
  }
  update_table(table_sz);
}
export {
  decrement,
  increment,
  update_table
};
