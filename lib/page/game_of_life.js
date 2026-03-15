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

// tsl/math/set.ts
function cartesian_product(inputs) {
  return cartesian_product_matrix(inputs);
}
function cartesian_product_matrix(inputs) {
  let len2 = inputs.length;
  if (len2 == 0) {
    return inputs;
  }
  let result = [[]];
  for (let i = 0; i < len2; i++) {
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
function random_fill(array, threshold) {
  let l1 = array.length;
  let l2 = array[0].length;
  let new_array = [];
  for (let i = 0; i < l1; i++) {
    let row = [];
    for (let j = 0; j < l2; j++) {
      if (Math.random() < threshold) {
        row.push(1);
      } else {
        row.push(0);
      }
    }
    new_array.push(row);
  }
  return new_array;
}

// page/game_of_life.ts
var canvas = document.getElementById("gol");
var head_span = document.getElementById("head_span");
var context = canvas.getContext("2d");
var activate_check = document.getElementById("activate");
var cells = [];
var len = 40;
var width = canvas.width;
var scale = width / len;
var thres = 0.2;
var timeout = 100;
var to = 0;
var gen = 0;
var live_cell = 0;
var dead_cell = 0;
var StartMode = /* @__PURE__ */ ((StartMode2) => {
  StartMode2[StartMode2["Random"] = 0] = "Random";
  StartMode2[StartMode2["Pulsar"] = 1] = "Pulsar";
  StartMode2[StartMode2["Glider"] = 2] = "Glider";
  StartMode2[StartMode2["Gun"] = 3] = "Gun";
  return StartMode2;
})(StartMode || {});
var TopologyMode = /* @__PURE__ */ ((TopologyMode2) => {
  TopologyMode2[TopologyMode2["Plain"] = 0] = "Plain";
  TopologyMode2[TopologyMode2["Mobius"] = 1] = "Mobius";
  TopologyMode2[TopologyMode2["Klein"] = 2] = "Klein";
  TopologyMode2[TopologyMode2["Torus"] = 3] = "Torus";
  TopologyMode2[TopologyMode2["Cylinder"] = 4] = "Cylinder";
  TopologyMode2[TopologyMode2["ONE_D"] = 5] = "ONE_D";
  return TopologyMode2;
})(TopologyMode || {});
var start_mode = 0 /* Random */;
var topo_mode = 0 /* Plain */;
function set_start_mode(mode) {
  start_mode = mode;
}
function set_topology_mode(mode) {
  topo_mode = mode;
  update_border();
}
set_topology_mode(3 /* Torus */);
var mouse_x = 0;
var mouse_y = 0;
var mouse_on_canvas = false;
canvas.addEventListener("mousemove", (e) => {
  mouse_x = e.offsetX;
  mouse_y = e.offsetY;
});
canvas.addEventListener("mouseleave", (e) => {
  mouse_on_canvas = false;
});
canvas.addEventListener("mouseenter", (e) => {
  mouse_on_canvas = true;
});
function clear() {
  gen = 0;
  cells = [];
  for (let i = 0; i < len; i++) {
    cells.push(new Array());
    for (let j = 0; j < len; j++) {
      cells[i].push(0);
    }
  }
}
function random_start() {
  cells = random_fill(cells, thres);
}
function start_with_pattern(pattern, offset) {
  let coordinates = [];
  for (let i = 0; i < pattern.length; i++) {
    let s = pattern[i];
    for (let j = 0; j < s.length; j++) {
      if (s.charAt(j) == "O") {
        coordinates.push([i, j]);
      }
    }
  }
  for (let coord of coordinates) {
    cells[coord[0] + offset[0]][coord[1] + offset[1]] = 1;
  }
}
function gun_start() {
  let pattern = [
    "........................O",
    "......................O.O",
    "............OO......OO............OO",
    "...........O...O....OO............OO",
    "OO........O.....O...OO",
    "OO........O...O.OO....O.O",
    "..........O.....O.......O",
    "...........O...O",
    "............OO"
  ];
  start_with_pattern(pattern, [10, 0]);
}
function pulsar_start() {
  let top_left = [
    [0, 2],
    [0, 3],
    [0, 4],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 2],
    [5, 3],
    [5, 4],
    [2, 5],
    [3, 5],
    [4, 5]
  ];
  let mid_point = len / 2;
  let offset = mid_point - 6;
  for (let i = 0; i < top_left.length; i++) {
    let x = top_left[i][0] + offset;
    let y = top_left[i][1] + offset;
    cells[x][y] = 1;
    cells[2 * mid_point - x][2 * mid_point - y] = 1;
    cells[x][2 * mid_point - y] = 1;
    cells[2 * mid_point - x][y] = 1;
  }
}
function glider_start() {
  let mid_point = len / 2;
  cells[mid_point + 4][mid_point] = 1;
  cells[mid_point + 4][mid_point + 1] = 1;
  cells[mid_point + 4][mid_point + 2] = 1;
  cells[mid_point + 1 + 4][mid_point] = 1;
  cells[mid_point + 2 + 4][mid_point + 1] = 1;
}
function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  let live_cnt = 0;
  let dead_cnt = 0;
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      if (cells[i][j] == 1) {
        context.fillStyle = "darkgray";
        context.fillRect(i * scale, j * scale, scale, scale);
        live_cnt++;
      } else {
        context.fillStyle = "black";
        context.fillRect(i * scale, j * scale, scale, scale);
        if (!(topo_mode == 5 /* ONE_D */ && !is_boundary(i, j))) {
          dead_cnt++;
        }
      }
    }
  }
  live_cell = live_cnt;
  dead_cell = dead_cnt;
}
function update_border() {
  canvas.style.border = "15px solid grey";
  canvas.style.borderImageSlice = "1";
  switch (topo_mode) {
    case 2 /* Klein */:
      canvas.style.borderImageSource = "conic-gradient(red,orange,grey,purple,blue,lightblue,grey,orange,red,pink,grey,purple,blue,lightblue,grey,pink,red)";
      break;
    case 4 /* Cylinder */:
      canvas.style.borderImageSource = "linear-gradient(grey,red,blue,grey)";
      break;
    case 1 /* Mobius */:
      canvas.style.borderImageSource = "conic-gradient(grey,grey,grey,blue,purple,red,grey,grey,grey,grey,grey,blue,purple,red,grey,grey,grey)";
      break;
    case 3 /* Torus */:
      canvas.style.borderImageSource = "conic-gradient(red,orange,grey,lightblue,blue,purple,grey,orange,red,pink,grey,purple,blue,lightblue,grey,pink,red)";
      break;
    case 0 /* Plain */:
    case 5 /* ONE_D */:
    default:
      break;
  }
}
function is_inside_canvas(i, j) {
  return i >= 0 && i < len && j >= 0 && j < len;
}
function is_boundary(i, j) {
  return i == 0 || j == 0 || i == len - 1 || j == len - 1;
}
function fetch_value(i, j) {
  if (topo_mode == 5 /* ONE_D */) {
    if (is_inside_canvas(i, j) && is_boundary(i, j)) {
      return cells[i][j];
    } else {
      return 0;
    }
  }
  if (is_inside_canvas(i, j)) {
    return cells[i][j];
  }
  switch (topo_mode) {
    case 4 /* Cylinder */:
      if (i == -1) {
        i = len - 1;
      }
      if (i == len) {
        i = 0;
      }
      if (is_inside_canvas(i, j)) {
        return cells[i][j];
      }
      return 0;
    case 1 /* Mobius */:
      if (i == -1) {
        i = len - 1;
        j = len - 1 - j;
      }
      if (i == len) {
        i = 0;
        j = len - 1 - j;
      }
      if (is_inside_canvas(i, j)) {
        return cells[i][j];
      }
      return 0;
    case 3 /* Torus */:
      if (i == -1) {
        i = len - 1;
      }
      if (i == len) {
        i = 0;
      }
      if (j == -1) {
        j = len - 1;
      }
      if (j == len) {
        j = 0;
      }
      if (is_inside_canvas(i, j)) {
        return cells[i][j];
      }
      return 0;
    case 2 /* Klein */:
      if (j == -1) {
        j = len - 1;
      }
      if (j == len) {
        j = 0;
      }
      if (i == -1) {
        i = len - 1;
        j = len - 1 - j;
      }
      if (i == len) {
        i = 0;
        j = len - 1 - j;
      }
      if (is_inside_canvas(i, j)) {
        return cells[i][j];
      }
      return 0;
    case 0 /* Plain */:
    default:
      return 0;
  }
}
function get_nb_count(i, j) {
  let sum = 0;
  for (let [dx, dy] of cartesian_product([[-1, 0, 1], [-1, 0, 1]])) {
    if (dx == 0 && dy == 0) {
      continue;
    }
    sum += fetch_value(i + dx, j + dy);
  }
  return sum;
}
function evolve() {
  gen += 1;
  let next_cells = [];
  for (let i = 0; i < len; i++) {
    next_cells.push(new Array());
    for (let j = 0; j < len; j++) {
      next_cells[i].push(0);
    }
  }
  let mouse_grid_x = Math.floor(mouse_x / scale);
  let mouse_grid_y = Math.floor(mouse_y / scale);
  let activate_checked = activate_check.checked;
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      if (activate_checked && mouse_on_canvas && i == mouse_grid_x && j == mouse_grid_y) {
        next_cells[i][j] = 1;
        continue;
      }
      let sum = get_nb_count(i, j);
      if (topo_mode == 5 /* ONE_D */) {
        if (!is_boundary(i, j)) {
          continue;
        }
        if (cells[i][j] == 1 && sum != 2 || cells[i][j] == 0 && sum > 0) {
          next_cells[i][j] = 1;
        }
      } else {
        if (cells[i][j] == 1 && sum == 2 || sum == 3) {
          next_cells[i][j] = 1;
        }
      }
    }
  }
  cells = next_cells;
}
function loop() {
  draw();
  head_span.innerText = "Game of Life\ngen: " + gen + " alive: " + live_cell + " dead: " + dead_cell + " topology: " + TopologyMode[topo_mode];
  evolve();
  to = setTimeout(loop, timeout);
}
function one_d_clear() {
  if (topo_mode != 5 /* ONE_D */) {
    return;
  }
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      if (!is_boundary(i, j)) {
        cells[i][j] = 0;
      }
    }
  }
}
function init() {
  clear();
  switch (start_mode) {
    case 1 /* Pulsar */:
      pulsar_start();
      break;
    case 3 /* Gun */:
      gun_start();
      break;
    case 2 /* Glider */:
      glider_start();
      break;
    case 0 /* Random */:
    default:
      random_start();
  }
  one_d_clear();
}
function restart() {
  clearTimeout(to);
  init();
  loop();
}
export {
  StartMode,
  TopologyMode,
  restart,
  set_start_mode,
  set_topology_mode
};
