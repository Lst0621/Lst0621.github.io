"use strict";
let canvas = document.getElementById('lab');
let context = canvas.getContext("2d");
let cells = [];
let len = 16;
let width = canvas.width;
let scale = width / len;
let bg = '#77428D';
let fg = '#E03C8A';
let mouse_on_canvas = false;
let grid_x = -1;
let grid_y = -1;
function init() {
    context.fillStyle = bg;
    let new_cells = [];
    for (let i = 0; i < len; i++) {
        new_cells.push(new Array());
        for (let j = 0; j < len; j++) {
            new_cells[i].push(1);
        }
    }
    cells = new_cells;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len; j++) {
            draw_diagonal(i, j);
        }
    }
}
function coor_legal(x) {
    return (x >= 0 && x < len);
}
function draw_diagonal(x, y) {
    if (!coor_legal(x) || !coor_legal(y)) {
        return;
    }
    context.fillStyle = bg;
    context.fillRect(x * scale, y * scale, scale, scale);
    context.beginPath();
    if (cells[x][y]) {
        context.moveTo(x * scale, y * scale);
        context.lineTo(x * scale + scale, y * scale + scale);
    }
    else {
        context.moveTo(x * scale + scale, y * scale);
        context.lineTo(x * scale, y * scale + scale);
    }
    context.strokeStyle = fg;
    context.stroke();
}
init();
let diffs = [-1, 0, 1];
canvas.addEventListener('mousemove', e => {
    let mouse_x = e.offsetX;
    let mouse_y = e.offsetY;
    let new_grid_x = Math.floor(mouse_x / scale);
    let new_grid_y = Math.floor(mouse_y / scale);
    if (grid_x != new_grid_x || grid_y != new_grid_y) {
        grid_x = new_grid_x;
        grid_y = new_grid_y;
        cells[grid_x][grid_y] = 1 - cells[grid_x][grid_y];
        for (let dx of diffs) {
            for (let dy of diffs) {
                draw_diagonal(grid_x + dx, grid_y + dy);
            }
        }
    }
});
canvas.addEventListener('mousedown', e => {
    if (e.button == 0) {
        init();
    }
});
canvas.addEventListener('mouseleave', e => {
    grid_x = -1;
    grid_y = -1;
    mouse_on_canvas = false;
});
canvas.addEventListener('mouseenter', e => {
    mouse_on_canvas = true;
});
