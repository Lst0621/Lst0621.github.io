// tsl/math/math.ts
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

// tsl/util.ts
function get_sup(text) {
  return "<sup>" + text + "</sup>";
}
function range(start, end, step = 1) {
  let result = [];
  let entry = start;
  while (entry < end) {
    result.push(entry);
    entry += step;
  }
  return result;
}
function create_2d_array(m, n, a) {
  return Array.from({ length: m }, () => Array(n).fill(a));
}

// tsl/lang/string.ts
function get_all_prefixes(str) {
  const prefixes = [];
  for (let i = 0; i <= str.length; i++) {
    prefixes.push(get_prefix(str, i));
  }
  return prefixes;
}
function get_prefix(str, n) {
  if (n >= str.length) {
    return str;
  }
  return str.substring(0, n);
}
function get_all_chars(s) {
  return Array.from(new Set(s.split(""))).sort();
}
function get_alphabet_from_strings(strs) {
  return Array.from(new Set(strs.map(get_all_chars).flat()));
}
function concat_string_lists(s1, s2) {
  return Array.from(new Set(cartesian_product([s1, s2]).map(
    (s) => s[0] + s[1]
  ))).sort((a, b) => a.length - b.length || a.localeCompare(b));
}
function concat_same_string_lists_n_times(s1, n) {
  let result = Array.from(s1);
  for (let i = 1; i < n; i++) {
    result = concat_string_lists(result, s1);
  }
  return result;
}
function concat_same_string_lists_leq_n_times(s1, n) {
  let s_with_empty = Array.from(s1).concat("");
  return concat_same_string_lists_n_times(s_with_empty, n);
}
function get_sub_seq_regex(s) {
  let sigma_star = "&Sigma;" + get_sup("*");
  return sigma_star + s.split("").join(sigma_star) + sigma_star;
}
function get_regex_for_disallowed_sub_seq(s) {
  return "(" + s.map(get_sub_seq_regex).join("&cup;") + ")" + get_sup("<mi>c</mi>");
}
function sub_empty_with_ep(str) {
  if (str.length == 0) {
    return "\u03B5";
  }
  return str;
}
var NO_LENGTH_LIMIT = -1;
function cat_subseq_leq_q(s1, s2, k = -1) {
  return concat_string_lists(s1, s2).filter((s) => k == NO_LENGTH_LIMIT || s.length <= k);
}
function cat_subseq_of_blocklist(s1, s2, k, blocks) {
  return cat_subseq_leq_q(s1, s2, k).filter((s) => blocks.some((block) => is_sub_seq(block, s)));
}
function is_sub_seq(str, pattern) {
  if (str.length < pattern.length) {
    return false;
  }
  if (pattern.length == 0) {
    return true;
  }
  if (str.charAt(0) == pattern.charAt(0)) {
    return is_sub_seq(str.substring(1, str.length), pattern.substring(1, pattern.length));
  } else {
    return is_sub_seq(str.substring(1, str.length), pattern);
  }
}
function get_all_subseq_for_blocks(blocks) {
  let alphabet = get_alphabet_from_strings(blocks);
  let k = Math.max(...blocks.map((s) => s.length));
  let generators = alphabet.map((x) => [x, ""]);
  generators.push([""]);
  let concat = (s1, s2) => cat_subseq_of_blocklist(s1, s2, k, blocks);
  let all_subs = generate_semigroup(generators, concat, array_eq);
  return all_subs;
}
function subseq_remove_short(subs) {
  return subs.filter((x) => !subs.some((y) => y.length > x.length && is_sub_seq(y, x)));
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

// tsl/func.ts
function always(a) {
  return (...args) => a;
}

// page/sp_lang.ts
function init() {
  let init_subs = "abc,cba";
  document.getElementById("sp_input").value = init_subs;
  let button = document.getElementById("update_button");
  button.onclick = update;
  update();
}
function update() {
  let sp_input = document.getElementById("sp_input").value;
  let span = document.getElementById("sp_span");
  let subs = sp_input.split(",");
  let s1 = subs[0];
  let s2 = subs.length == 1 ? s1 : subs[1];
  let disallowed = subs;
  let l = Math.max(s1.length, s2.length);
  let alphabet = get_alphabet_from_strings(subs);
  console.log(alphabet);
  span.innerHTML = "Disallowed subsequences: " + disallowed + "<br>";
  span.innerHTML += "Regex: " + get_regex_for_disallowed_sub_seq(disallowed) + "<br>";
  let all_sub_seq = concat_same_string_lists_leq_n_times(alphabet, l);
  let pre1 = get_all_prefixes(s1);
  let pre2 = get_all_prefixes(s2);
  let l1 = pre1.length;
  let l2 = pre2.length;
  let idx1 = range(0, l1);
  let idx2 = range(0, l2);
  let idx = cartesian_product([idx1, idx2]);
  let scale = 120;
  let radius = 50;
  let arrows = [];
  let visited = create_2d_array(l1, l2, 0);
  const canvas = document.getElementById("canvas_id_sp");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.width);
  travel(0, 0, pre1, pre2, arrows, visited);
  for (let i = 0; i < idx.length; i++) {
    let a = idx[i][0];
    let b = idx[i][1];
    let s12 = pre1[a];
    let s22 = pre2[b];
    draw_state(
      ctx,
      [s12, s22].map(sub_empty_with_ep).join(","),
      [scale + a * scale, scale + b * scale],
      radius,
      a + b == 0 ? "lightblue" : visited[a][b] == 0 ? "lightgrey" : a == l1 - 1 || b == l2 - 1 ? "orange" : "lightgreen"
    );
  }
  for (let i = 0; i < arrows.length; i++) {
    let arrow = arrows[i];
    let from = arrow[0];
    let to = arrow[1];
    draw_arrow(ctx, [(from[0] + 1) * scale, (from[1] + 1) * scale], [(to[0] + 1) * scale, (to[1] + 1) * scale], arrow[2]);
  }
  let all_pres = subs.map(get_all_prefixes);
  let all_states = cartesian_product(all_pres);
  draw_table(
    document.getElementById("multiplication_table_1"),
    all_states,
    alphabet,
    (row, col) => {
      return get_next_state(all_states[row], alphabet[col], all_pres);
    },
    (a) => a.map(sub_empty_with_ep).toString(),
    sub_empty_with_ep,
    (a) => a.map(sub_empty_with_ep).toString(),
    always("lightgreen"),
    always("lightblue"),
    (row, col) => {
      let next = get_next_state(all_states[row], alphabet[col], all_pres);
      return range(0, next.length).some((i) => {
        return subs[i] === next[i];
      }) ? "orange" : "lightgrey";
    }
  );
  let all_block_seq = get_all_subseq_for_blocks(subs);
  let len = Math.max(...subs.map((s) => s.length));
  draw_table(
    document.getElementById("multiplication_table_2"),
    all_block_seq,
    alphabet,
    (row, col) => {
      return cat_subseq_of_blocklist(all_block_seq[row], ["", alphabet[col]], len, subs);
    },
    (a) => subseq_remove_short(a).toString(),
    sub_empty_with_ep,
    (a) => subseq_remove_short(a).toString(),
    always("lightgreen"),
    always("lightblue"),
    (row, col) => {
      let next = cat_subseq_of_blocklist(all_block_seq[row], ["", alphabet[col]], len, subs);
      if (next.some((x) => subs.some((y) => y == x))) {
        return "orange";
      } else {
        return "lightgreen";
      }
    }
  );
}
function get_next_state(states, ch, all_pres) {
  let len = all_pres.length;
  let next_state = [];
  for (let i = 0; i < len; i++) {
    let state = states[i];
    let pre = all_pres[i];
    let w = state.length;
    if (pre.length == w + 1) {
      next_state.push(state);
      continue;
    }
    if (pre[w + 1].slice(-1) == ch) {
      next_state.push(state + ch);
    } else {
      next_state.push(state);
    }
  }
  return next_state;
}
function draw_arrow(ctx, from, to, label) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const angle = Math.atan2(dy, dx);
  const startX = from[0] + 25 * Math.cos(angle);
  const startY = from[1] + 25 * Math.sin(angle);
  const endX = to[0] - 25 * Math.cos(angle);
  const endY = to[1] - 25 * Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  const arrowSize = 6;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "blue";
  ctx.font = "15px Arial";
  ctx.fillText(label, (startX + endX) / 2, (startY + endY) / 2 - 5);
  ctx.fillStyle = "black";
}
function travel(idx1, idx2, pre1, pre2, arrows, visited) {
  let l1 = pre1.length;
  let l2 = pre2.length;
  if (visited[idx1][idx2] == 1) {
    return;
  }
  visited[idx1][idx2] = 1;
  if (idx1 + 1 == l1 && idx2 + 1 == l2) {
    return;
  }
  let next_char_1 = idx1 + 1 < l1 ? pre1[idx1 + 1].slice(-1) : null;
  let next_char_2 = idx2 + 1 < l2 ? pre2[idx2 + 1].slice(-1) : null;
  if (next_char_1 == next_char_2 && next_char_1 != null) {
    arrows.push([[idx1, idx2], [idx1 + 1, idx2 + 1], next_char_1]);
    travel(idx1 + 1, idx2 + 1, pre1, pre2, arrows, visited);
    return;
  }
  if (next_char_1 != null) {
    arrows.push([[idx1, idx2], [idx1 + 1, idx2], next_char_1]);
    travel(idx1 + 1, idx2, pre1, pre2, arrows, visited);
  }
  if (next_char_2 != null) {
    arrows.push([[idx1, idx2], [idx1, idx2 + 1], next_char_2]);
    travel(idx1, idx2 + 1, pre1, pre2, arrows, visited);
  }
}
function draw_state(ctx, name, pos, radius, state_color) {
  ctx.beginPath();
  ctx.arc(pos[0], pos[1], radius, 0, 2 * Math.PI);
  ctx.fillStyle = state_color;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "black";
  ctx.font = "15px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, pos[0], pos[1]);
}
init();
