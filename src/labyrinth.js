var canvas = document.getElementById('lab');
var context = canvas.getContext("2d");
var cells = [];
var len = 16;
var width = canvas.width;
var scale = width / len;
var bg = '#77428D';
var fg = '#E03C8A';
var mouse_on_canvas = false;
var grid_x = -1;
var grid_y = -1;
function init() {
    context.fillStyle = bg;
    var new_cells = [];
    for (var i = 0; i < len; i++) {
        new_cells.push(new Array());
        for (var j = 0; j < len; j++) {
            new_cells[i].push(1);
        }
    }
    cells = new_cells;
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
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
var diffs = [-1, 0, 1];
canvas.addEventListener('mousemove', function (e) {
    var mouse_x = e.offsetX;
    var mouse_y = e.offsetY;
    var new_grid_x = Math.floor(mouse_x / scale);
    var new_grid_y = Math.floor(mouse_y / scale);
    if (grid_x != new_grid_x || grid_y != new_grid_y) {
        grid_x = new_grid_x;
        grid_y = new_grid_y;
        cells[grid_x][grid_y] = 1 - cells[grid_x][grid_y];
        for (var _i = 0, diffs_1 = diffs; _i < diffs_1.length; _i++) {
            var dx = diffs_1[_i];
            for (var _a = 0, diffs_2 = diffs; _a < diffs_2.length; _a++) {
                var dy = diffs_2[_a];
                draw_diagonal(grid_x + dx, grid_y + dy);
            }
        }
    }
});
canvas.addEventListener('mousedown', function (e) {
    if (e.button == 0) {
        init();
    }
});
canvas.addEventListener('mouseleave', function (e) {
    grid_x = -1;
    grid_y = -1;
    mouse_on_canvas = false;
});
canvas.addEventListener('mouseenter', function (e) {
    mouse_on_canvas = true;
});
