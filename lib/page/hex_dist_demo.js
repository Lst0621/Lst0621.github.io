// lib/hex.ts
function drawHexagon(ctx2, cx, cy, hex_radius, color) {
  ctx2.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x2 = cx + hex_radius * Math.cos(angle);
    const y2 = cy + hex_radius * Math.sin(angle);
    if (i === 0) {
      ctx2.moveTo(x2, y2);
    } else {
      ctx2.lineTo(x2, y2);
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
function drawHexGrid(ctx2, rows, cols, hex_radius, get_color2) {
  const hex_height = Math.sqrt(3) * hex_radius;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const yOffset = col % 2 * hex_height / 2;
      const x2 = col * (hex_radius * 1.5) + hex_radius;
      const y2 = row * hex_height + hex_height / 2 + yOffset;
      drawHexagon(ctx2, x2, y2, hex_radius, get_color2(col, row));
    }
  }
}

// lib/page/hex_dist_demo.ts
var canvas = document.getElementById("hexCanvas");
var ctx = canvas.getContext("2d");
var to = 0;
var x = 15;
var y = 10;
var x_max = 34;
var y_max = 40;
function loop() {
  if (!paused) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    x += Math.floor(Math.random() * 4 - 2);
    y += Math.floor(Math.random() * 4 - 2);
    if (x < 0) {
      x += x_max;
    }
    if (y < 0) {
      y += y_max;
    }
    x = x % x_max;
    y = y % y_max;
    console.log(x, y);
    drawHexGrid(ctx, x_max, y_max, 10, (col, row) => get_color(x, y, col, row));
  }
  let timeout = 300;
  to = setTimeout(loop, timeout);
}
function restart() {
  clearTimeout(to);
  loop();
}
function get_color(center_x, center_y, col, row) {
  const dist = hex_dist([center_x, center_y], [col, row]);
  const dist_mod = dist % 7;
  const color = dist_mod == 0 ? "red" : dist_mod == 1 ? "orange" : dist_mod == 2 ? "yellow" : dist_mod == 3 ? "green" : dist_mod == 4 ? "blue" : dist_mod == 5 ? "darkblue" : "purple";
  return color;
}
var paused = false;
function pause() {
  paused = !paused;
}
function start() {
  document.getElementById("pause")?.addEventListener("click", pause);
  restart();
}
start();
export {
  pause
};
