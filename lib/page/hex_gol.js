// lib/hex.ts
function drawHexagon(ctx2, cx, cy, hex_radius2, color) {
  ctx2.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x = cx + hex_radius2 * Math.cos(angle);
    const y = cy + hex_radius2 * Math.sin(angle);
    if (i === 0) {
      ctx2.moveTo(x, y);
    } else {
      ctx2.lineTo(x, y);
    }
  }
  ctx2.closePath();
  ctx2.stroke();
  if (color != null) {
    ctx2.fillStyle = color;
  }
  ctx2.fill();
}
function hex_dist(a, b) {
  const x1 = a[0];
  const y1 = a[1];
  const x2 = b[0];
  const y2 = b[1];
  const dx = Math.abs(x1 - x2);
  const y_min = y1 - Math.floor(dx / 2) - dx % 2 * ((x1 + 1) % 2);
  const y_max2 = y1 + Math.floor(dx / 2) + dx % 2 * (x1 % 2);
  const dy = y2 >= y_max2 ? y2 - y_max2 : y2 <= y_min ? y_min - y2 : 0;
  return dx + dy;
}
function drawHexGrid(ctx2, rows, cols, hex_radius2, get_color2) {
  const hex_height = Math.sqrt(3) * hex_radius2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const yOffset = col % 2 * hex_height / 2;
      const x = col * (hex_radius2 * 1.5) + hex_radius2;
      const y = row * hex_height + hex_height / 2 + yOffset;
      drawHexagon(ctx2, x, y, hex_radius2, get_color2(col, row));
    }
  }
}

// lib/page/hex_gol.ts
var canvas = document.getElementById("hexCanvas");
var ctx = canvas.getContext("2d");
var to = 0;
var x_max = 42;
var y_max = 49;
var hex_radius = 8;
var cells = [];
var thres = 0.2;
var timeout = 150;
var gen = 0;
function get_empty_grid(m, n) {
  let grid = [];
  for (let i = 0; i < m; i++) {
    grid.push(new Array());
    for (let j = 0; j < n; j++) {
      grid[i].push(0);
    }
  }
  return grid;
}
function clear() {
  gen = 0;
  cells = get_empty_grid(y_max, x_max);
}
function random_start() {
  for (let i = 0; i < y_max; i++) {
    for (let j = 0; j < x_max; j++) {
      if (Math.random() < thres) {
        cells[i][j] = 1;
      }
    }
  }
}
function get_nb_count(i, j) {
  let sum = 0;
  for (let dy of [-1, 0, 1]) {
    for (let dx of [-1, 0, 1]) {
      if (dx == 0 && dy == 0) {
        continue;
      }
      if (hex_dist([i, j], [i + dy, j + dx]) != 1) {
        continue;
      }
      sum += cells[(i + dy + y_max) % y_max][(j + dx + x_max) % x_max];
    }
  }
  return sum;
}
function evolve() {
  gen += 1;
  let next_cells = get_empty_grid(y_max, x_max);
  let survivals = [];
  let creates = [];
  for (let i = 0; i <= 6; i++) {
    let survival_check = document.getElementById("survive_" + i.toString());
    let create_check = document.getElementById("create_" + i.toString());
    survivals.push(survival_check.checked);
    creates.push(create_check.checked);
  }
  for (let i = 0; i < y_max; i++) {
    for (let j = 0; j < x_max; j++) {
      let sum = get_nb_count(i, j);
      if (cells[i][j]) {
        if (survivals[sum]) {
          next_cells[i][j] = 1;
        }
      } else {
        if (creates[sum]) {
          next_cells[i][j] = 1;
        }
      }
    }
  }
  cells = next_cells;
}
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  evolve();
  drawHexGrid(ctx, x_max, y_max, hex_radius, (col, row) => get_color(col, row));
  to = setTimeout(loop, timeout);
}
function restart() {
  clear();
  random_start();
  clearTimeout(to);
  loop();
}
function get_color(col, row) {
  if (cells[col][row] == 1) {
    return "grey";
  } else {
    return "black";
  }
}
restart();
export {
  restart
};
