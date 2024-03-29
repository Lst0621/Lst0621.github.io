var canvas = document.getElementById('gol');
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
var void_cell = 0;
var StartMode;
(function (StartMode) {
    StartMode[StartMode["Random"] = 0] = "Random";
    StartMode[StartMode["Pulsar"] = 1] = "Pulsar";
    StartMode[StartMode["Gun"] = 2] = "Gun";
})(StartMode || (StartMode = {}));
var start_mode = StartMode.Random;
function set_start_mode(mode) {
    start_mode = mode;
}
var mouse_x = 0;
var mouse_y = 0;
var mouse_on_canvs = false;
canvas.addEventListener('mousemove', function (e) {
    mouse_x = e.offsetX;
    mouse_y = e.offsetY;
    // console.log(mouse_x, mouse_y)
});
canvas.addEventListener('mouseleave', function (e) {
    mouse_on_canvs = false;
});
canvas.addEventListener('mouseenter', function (e) {
    mouse_on_canvs = true;
});
function clear() {
    gen = 0;
    cells = [];
    for (var i = 0; i < len; i++) {
        cells.push(new Array());
        for (var j = 0; j < len; j++) {
            cells[i].push(0);
        }
    }
}
function random_start() {
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            if (Math.random() < thres) {
                cells[i][j] = 1;
            }
        }
    }
}
function start_with_pattern(pattern, offset) {
    var coordinates = [];
    for (var i = 0; i < pattern.length; i++) {
        var s = pattern[i];
        for (var j = 0; j < s.length; j++) {
            if (s.charAt(j) == 'O') {
                coordinates.push([i, j]);
            }
        }
    }
    for (var _i = 0, coordinates_1 = coordinates; _i < coordinates_1.length; _i++) {
        var coord = coordinates_1[_i];
        cells[coord[0] + offset[0]][coord[1] + offset[1]] = 1;
    }
}
function gun_start() {
    var pattern = [
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
    var top_left = [
        [0, 2], [0, 3], [0, 4],
        [2, 0], [3, 0], [4, 0],
        [5, 2], [5, 3], [5, 4],
        [2, 5], [3, 5], [4, 5],
    ];
    var mid_point = len / 2;
    var offset = mid_point - 6;
    for (var i = 0; i < top_left.length; i++) {
        var x = top_left[i][0] + offset;
        var y = top_left[i][1] + offset;
        cells[x][y] = 1;
        cells[2 * mid_point - x][2 * mid_point - y] = 1;
        cells[x][2 * mid_point - y] = 1;
        cells[2 * mid_point - x][y] = 1;
    }
}
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    var live_cnt = 0;
    var void_cnt = 0;
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            if (cells[i][j] == 1) {
                context.fillStyle = '#FC9F4D';
                context.fillRect(i * scale, j * scale, scale, scale);
                live_cnt++;
            }
            else {
                context.fillStyle = '#FFBA84';
                context.fillRect(i * scale, j * scale, scale, scale);
                void_cnt++;
            }
        }
    }
    live_cell = live_cnt;
    void_cell = void_cnt;
}
function evolve() {
    gen += 1;
    var next_cells = [];
    for (var i = 0; i < len; i++) {
        next_cells.push(new Array());
        for (var j = 0; j < len; j++) {
            next_cells[i].push(0);
        }
    }
    var mouse_grid_x = Math.floor(mouse_x / scale);
    var mouse_grid_y = Math.floor(mouse_y / scale);
    var activate_checked = activate_check.checked;
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            if (activate_checked && mouse_on_canvs && i == mouse_grid_x && j == mouse_grid_y) {
                next_cells[i][j] = 1;
                continue;
            }
            var sum = 0;
            for (var _i = 0, _a = [-1, 0, 1]; _i < _a.length; _i++) {
                var dx = _a[_i];
                for (var _b = 0, _c = [-1, 0, 1]; _b < _c.length; _b++) {
                    var dy = _c[_b];
                    if (dx == 0 && dy == 0) {
                        continue;
                    }
                    if (i + dx < 0 || i + dx == len || j + dy < 0 || j + dy == len) {
                        continue;
                    }
                    sum += cells[i + dx][j + dy];
                }
            }
            if ((cells[i][j] == 1 && sum == 2) || sum == 3) {
                next_cells[i][j] = 1;
            }
            //console.log(i,j,cells[i][j], sum, next_cells[i][j])
        }
    }
    cells = next_cells;
}
function loop() {
    draw();
    head_span.innerText = "Game of Life\ngen: " + gen + " active: " + live_cell + " void: " + void_cell;
    evolve();
    to = setTimeout(loop, timeout);
}
function init() {
    clear();
    switch (start_mode) {
        case StartMode.Pulsar:
            pulsar_start();
            break;
        case StartMode.Gun:
            gun_start();
            break;
        case StartMode.Random:
        default:
            random_start();
    }
}
function restart() {
    clearTimeout(to);
    init();
    loop();
}
restart();
