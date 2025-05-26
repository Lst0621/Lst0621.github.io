import { drawHexGrid, hex_dist } from "./hex.js";
let canvas = document.getElementById('hexCanvas');
let ctx = canvas.getContext("2d");
let to = 0;
let x = 15;
let y = 10;
let x_max = 34;
let y_max = 40;
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
    const color = dist_mod == 0 ?
        "red" : dist_mod == 1 ?
        "orange" : dist_mod == 2 ? "yellow" : dist_mod == 3 ? "green" : dist_mod == 4 ? "blue" : dist_mod == 5 ? "darkblue" : "purple";
    return color;
}
let paused = false;
export function pause() {
    paused = !paused;
}
function start() {
    var _a;
    (_a = document.getElementById("pause")) === null || _a === void 0 ? void 0 : _a.addEventListener('click', pause);
    restart();
}
start();
