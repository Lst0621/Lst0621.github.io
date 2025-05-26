import { drawHexGrid, hex_dist } from "./hex.js";
let canvas = document.getElementById('hexCanvas');
let ctx = canvas.getContext("2d");
let to = 0;
let x_max = 42;
let y_max = 49;
let hex_radius = 8;
let cells = [];
let thres = 0.2;
let timeout = 150;
let gen = 0;
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
            if ((cells[i][j] == 1 && sum == 2) || sum == 2) {
                next_cells[i][j] = 1;
            }
            if (cells[i][j]) {
                if (survivals[sum]) {
                    next_cells[i][j] = 1;
                }
            }
            else {
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
export function restart() {
    clear();
    random_start();
    clearTimeout(to);
    loop();
}
function get_color(col, row) {
    if (cells[col][row] == 1) {
        return 'grey';
    }
    else {
        return 'black';
    }
}
restart();
