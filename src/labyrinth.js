var canvas = document.getElementById('lab');
var context = canvas.getContext("2d");
var cells = [];
var len = 20;
var width = canvas.width;
var scale = width / len;
function init() {
    cells = [];
    for (var i = 0; i < len; i++) {
        cells.push(new Array());
        for (var j = 0; j < len; j++) {
            cells[i].push(0);
        }
    }
}
init();
for (var i = 0; i < len; i++) {
    for (var j = 0; j < len; j++) {
        context.beginPath();
        context.moveTo(i * scale, j * scale);
        context.lineTo(i * scale + scale - 1, j * scale + scale - 1);
        context.stroke();
    }
}
var mouse_on_canvs = false;
var grid_x = 0;
var grid_y = 0;
canvas.addEventListener('mousemove', function (e) {
    var mouse_x = e.offsetX;
    var mouse_y = e.offsetY;
    var new_grid_x = Math.floor(mouse_x / scale);
    var new_grid_y = Math.floor(mouse_y / scale);
    if (grid_x != new_grid_x || grid_y != new_grid_y) {
        grid_x = new_grid_x;
        grid_y = new_grid_y;
        cells[grid_x][grid_y] = 1 - cells[grid_x][grid_y];
        context.fillStyle = '#ffffff';
        context.fillRect(grid_x * scale, grid_y * scale, scale, scale);
        context.beginPath();
        if (cells[grid_x][grid_y] == 1) {
            context.moveTo(grid_x * scale + scale - 1, grid_y * scale);
            context.lineTo(grid_x * scale, grid_y * scale + scale - 1);
        }
        else {
            context.moveTo(grid_x * scale, grid_y * scale);
            context.lineTo(grid_x * scale + scale - 1, grid_y * scale + scale - 1);
        }
        context.strokeStyle = '#000000';
        context.stroke();
    }
});
canvas.addEventListener('mouseleave', function (e) {
    grid_x = -1;
    grid_y = -1;
});
canvas.addEventListener('mouseenter', function (e) {
    mouse_on_canvs = true;
});
