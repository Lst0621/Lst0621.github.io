import { drawHexGrid, hex_dist } from "./hex.js";
let canvas = document.getElementById('hexCanvas');
let ctx = canvas.getContext("2d");
let to = 0;
let x = 15;
let y = 10;
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x_max = 17;
    let y_max = 20;
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
    drawHexGrid(ctx, x_max, y_max, (col, row) => get_color(x, y, col, row));
    let timeout = 800;
    to = setTimeout(loop, timeout);
}
function restart() {
    clearTimeout(to);
    loop();
}
function get_color(center_x, center_y, col, row) {
    const dist = hex_dist([center_x, center_y], [col, row]);
    if (dist == 0) {
        return "yellow";
    }
    const dist_mod = dist % 4;
    const color = dist_mod == 0 ?
        "orange" : dist_mod == 1 ?
        "lightgreen" : dist_mod == 2 ? "pink" : dist_mod == 3 ? "lightblue" : "lightyellow";
    return color;
}
restart();
