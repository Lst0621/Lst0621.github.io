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
function is_cycle_valid(cycle) {
  if (cycle == null) {
    return false;
  }
  for (let i = 0; i < cycle.length; i++) {
    if (isNaN(cycle[i])) {
      return false;
    }
    for (let j = i + 1; j < cycle.length; j++) {
      if (cycle[j] == cycle[i]) {
        return false;
      }
    }
  }
  return true;
}
function get_permutation_from_cycle(cycle) {
  if (cycle == null) {
    return [];
  }
  let num_element = cycle[0];
  for (let num of cycle) {
    num_element = Math.max(num, num_element);
  }
  let perm = get_identity_permutation(num_element);
  if (cycle.length == 1) {
    return perm;
  }
  for (let i = 0; i < cycle.length; i++) {
    let from = cycle[i];
    let to = i + 1 < cycle.length ? cycle[i + 1] : cycle[0];
    perm[from - 1] = to;
  }
  return perm;
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
function get_arrow_string_from_cycle(cycle) {
  let arrow = "->";
  let ret = "(";
  ret += cycle.map(String).join(arrow);
  ret += arrow + cycle[0].toString() + ")";
  return ret;
}
function get_string_from_cycle(cycle) {
  let join_str = cycle.some((value) => value > 9) ? "," : "";
  return "(" + cycle.map(String).join(join_str) + ")";
}
function per_to_arrow(perm) {
  let cycles = get_cycles_from_permutations(perm);
  let ret = cycles.filter((cycle) => cycle.length > 1).map(get_arrow_string_from_cycle).join("");
  if (ret.length == 0) {
    ret = "e";
  }
  return ret;
}
function perm_to_str(perm) {
  let cycles = get_cycles_from_permutations(perm);
  let cycle_str = cycles.filter((cycle) => cycle.length > 1).map(get_string_from_cycle).join("");
  if (cycle_str.length == 0) {
    return "e";
  }
  return cycle_str;
}

// page/permutation_calculator.ts
function update_perm() {
  let perm_input = document.getElementById("perm_input").value;
  let span = document.getElementById("perm_text");
  let parts = perm_input.split(";");
  let perm = [];
  let cycles = [];
  for (let part of parts) {
    if (part.length == 0) {
      continue;
    }
    let cycle_str = part.split(",");
    let cycle = cycle_str.map((str) => Number(str));
    if (!is_cycle_valid(cycle)) {
      span.innerHTML = cycle_str + " is not valid!";
      return;
    }
    cycles.push(cycle);
    perm = permutation_multiply(perm, get_permutation_from_cycle(cycle));
  }
  let cycles_str = cycles.map(get_string_from_cycle).join("");
  let arrow_str = cycles.map(get_arrow_string_from_cycle).join("");
  arrow_str += "=" + per_to_arrow(perm);
  span.innerHTML = cycles_str + "=" + arrow_str + "=" + perm_to_str(perm);
}
function set_up() {
  document.getElementById("perm_input").value = "1,2,3;1,3,5;7,5;8,12";
  update_perm();
  let button = document.getElementById("update_button");
  button.onclick = update_perm;
}
set_up();
