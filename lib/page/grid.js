// page/grid.ts
var canvas = document.getElementById("grid");
var head_span = document.getElementById("head_span");
var context = canvas.getContext("2d");
var positions = [];
var speed = [];
var len_x = 16;
var len_y = 30;
var width = canvas.width;
var timeout = 24;
var gen = 0;
var to = 0;
var PERSPECTIVE = width * 1;
function get_random_pos() {
  return 1.8 * (Math.random() - 0.5) * width;
}
function create_grid() {
  let grid = [];
  for (let i = 0; i < len_x; i++) {
    grid.push(new Array());
    for (let j = 0; j < len_y; j++) {
      grid[i].push([0, 0, 0]);
    }
  }
  return grid;
}
function start() {
  positions = create_grid();
  speed = create_grid();
  for (let i = 0; i < len_x; i++) {
    for (let j = 0; j < len_y; j++) {
      positions[i][j][0] = get_random_pos();
      positions[i][j][1] = get_random_pos();
      positions[i][j][2] = get_random_pos();
    }
  }
}
var PROJECTION_CENTER_X = width / 2;
var PROJECTION_CENTER_Y = width / 2;
function draw() {
  head_span.innerText = "Evolution of 2D Grid in 3D gen: " + gen;
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < len_x; i++) {
    for (let j = 0; j < len_y; j++) {
      let x = positions[i][j][0];
      let y = positions[i][j][1];
      let z = positions[i][j][2];
      let radius = 3;
      let scaleProjected = PERSPECTIVE / (PERSPECTIVE + z);
      let xProjected = x * scaleProjected + PROJECTION_CENTER_X;
      let yProjected = y * scaleProjected + PROJECTION_CENTER_Y;
      context.fillRect(
        xProjected - radius * scaleProjected,
        yProjected - radius * scaleProjected,
        radius * 2 * scaleProjected,
        radius * 2 * scaleProjected
      );
      draw_edge(positions[i][j], positions[i][get_mod_idx(j + 1, len_y)], "darkblue");
      draw_edge(positions[i][j], positions[get_mod_idx(i + 1, len_x)][j], "darkgreen");
    }
  }
}
function draw_edge(a, b, stl) {
  let x0 = a[0];
  let y0 = a[1];
  let z0 = a[2];
  let x1 = b[0];
  let y1 = b[1];
  let z1 = b[2];
  let scaleProjected0 = PERSPECTIVE / (PERSPECTIVE + z0);
  let xProjected0 = x0 * scaleProjected0 + PROJECTION_CENTER_X;
  let yProjected0 = y0 * scaleProjected0 + PROJECTION_CENTER_Y;
  let scaleProjected1 = PERSPECTIVE / (PERSPECTIVE + z1);
  let xProjected1 = x1 * scaleProjected1 + PROJECTION_CENTER_X;
  let yProjected1 = y1 * scaleProjected1 + PROJECTION_CENTER_Y;
  context.strokeStyle = stl;
  context.beginPath();
  context.moveTo(xProjected0, yProjected0);
  context.lineTo(xProjected1, yProjected1);
  context.stroke();
}
function get_mod_idx(x, n) {
  if (x < 0) {
    return x + n;
  }
  if (x >= n) {
    return x - n;
  }
  return x;
}
function get_acc(pos, nbs) {
  let shift = [0, 0, 0];
  let push_factor = 0;
  let pull_factor = 0;
  let pp_ratio = 0;
  pull_factor = 5e-5;
  pp_ratio = 0;
  push_factor = pull_factor * pp_ratio;
  let dist0 = 200;
  for (let i = 0; i < nbs.length; i++) {
    let nb = nbs[i];
    let d = [pos[0] - nb[0], pos[1] - nb[1], pos[2] - nb[2]];
    let dist = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2] + 1e-7);
    dist_sum += dist;
    if (i == 0 || i == 2) {
      dist0 = 100 / len_x;
    } else if (i == 1 || i == 3) {
      dist0 = 60 / len_y;
    } else if (i == 4) {
      dist0 = 800;
    } else if (i == 5) {
      dist0 = 150;
    }
    let push = push_factor / dist / dist;
    let pull = pull_factor * (dist - dist0);
    shift[0] += d[0] / dist * (push - pull);
    shift[1] += d[1] / dist * (push - pull);
    shift[2] += d[2] / dist * (push - pull);
  }
  return shift;
}
var dist_sum = 0;
function evolve() {
  dist_sum = 0;
  gen += 1;
  let next_positions = [];
  for (let i = 0; i < len_x; i++) {
    next_positions.push(new Array());
    for (let j = 0; j < len_y; j++) {
      let current_pos = positions[i][j];
      next_positions[i].push(current_pos);
      let nbs = [
        positions[get_mod_idx(i - 1, len_x)][get_mod_idx(j + 0, len_y)],
        positions[get_mod_idx(i + 0, len_x)][get_mod_idx(j + 1, len_y)],
        positions[get_mod_idx(i + 1, len_x)][get_mod_idx(j + 0, len_y)],
        positions[get_mod_idx(i + 0, len_x)][get_mod_idx(j - 1, len_y)],
        positions[get_mod_idx(i + len_x / 2, len_x)][get_mod_idx(j + len_y / 2, len_y)]
        // positions[get_mod_idx(i +0, len_x)][get_mod_idx(j+len_y/2,len_y)],
        // positions[get_mod_idx(i - 1)][get_mod_idx(j - 1)],
        // positions[get_mod_idx(i - 1)][get_mod_idx(j + 1)],
        // positions[get_mod_idx(i + 1)][get_mod_idx(j - 1)],
        // positions[get_mod_idx(i + 1)][get_mod_idx(j + 1)],
      ];
      let acc = get_acc(current_pos, nbs);
      next_positions[i][j][0] += speed[i][j][0];
      next_positions[i][j][1] += speed[i][j][1];
      next_positions[i][j][2] += speed[i][j][2];
      let friction = 0.01;
      speed[i][j][0] += acc[0] - friction * speed[i][j][0];
      speed[i][j][1] += acc[1] - friction * speed[i][j][1];
      speed[i][j][2] += acc[2] - friction * speed[i][j][2];
    }
  }
  let dist_avg = dist_sum / 6 / len_x / len_y;
  console.log("avg dist: " + dist_avg);
  positions = next_positions;
}
function loop() {
  draw();
  let k = 20;
  for (let i = 0; i < k; i++) {
    evolve();
  }
  to = setTimeout(loop, timeout);
}
start();
loop();
