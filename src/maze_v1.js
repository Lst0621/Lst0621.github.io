var canvas = document.getElementById('maze1');
var context = canvas.getContext("2d");
var cells = [];
var dirs = [[-1, 0], [1, 0], [0, 1], [0, -1]];
var len = 100;
var width = canvas.width;
var scale = width / len;
function clear() {
    cells = [];
    for (var i = 0; i < len; i++) {
        cells.push(new Array());
        for (var j = 0; j < len; j++) {
            cells[i].push(0);
        }
    }
}
var fg = '#8A6BBE';
var bg = '#B28FCE';
function set_dot(x, y) {
    console.log("visit " + x + " " + y);
    context.fillStyle = fg;
    context.fillRect(x * scale, y * scale, scale, scale);
    cells[x][y] = 1;
}
function has_visit(x, y) {
    return cells[x][y] == 1;
}
function location_valid(x, y) {
    return x >= 0 && x < len && y >= 0 && y < len;
}
function shall_visit(time_on_dir, from_last_turn, same_dir) {
    var r = Math.random();
    if (same_dir) {
        return r < Math.max(1 - time_on_dir / 100, 0.88);
    }
    else {
        return r < Math.max(0.13, 0.005 + from_last_turn / 1000);
    }
}
var idx = 0;
var points = [];
function process() {
    points = [];
    // location, dir, time on dir, from last turn
    var num_start_point = 12;
    for (var _ = 0; _ < num_start_point; _++) {
        var x = Math.floor(Math.random() * len);
        var y = Math.floor(Math.random() * len);
        if (has_visit(x, y)) {
            _--;
            continue;
        }
        set_dot(x, y);
        points.push([[x, y], Math.floor(Math.random() * 4), 0, 0]);
    }
    idx = 0;
    step();
}
function step() {
    var points_left = points.length;
    while (idx < points_left) {
        var foo = points[idx];
        var location_1 = foo[0];
        var x = location_1[0];
        var y = location_1[1];
        var dir = foo[1];
        var time_on_dir = foo[2];
        var from_last_turn = foo[3];
        var has_turned = false;
        for (var _i = 0, _a = [-1, 1, 0]; _i < _a.length; _i++) {
            var dir_delta = _a[_i];
            var next_dir = (dir + dir_delta + 4) % 4;
            var next_x = x + dirs[next_dir][0];
            var next_y = y + dirs[next_dir][1];
            if (!location_valid(next_x, next_y)) {
                continue;
            }
            if (has_visit(next_x, next_y)) {
                continue;
            }
            var same_dir = dir_delta == 0;
            if (shall_visit(time_on_dir, from_last_turn, same_dir)) {
                if (!same_dir) {
                    has_turned = true;
                }
                set_dot(next_x, next_y);
                points.push([[next_x, next_y], next_dir, same_dir ? time_on_dir + 1 : 0, same_dir ? (has_turned ? 0 : from_last_turn + 1) : 0]);
            }
        }
        idx++;
    }
    if (idx < points.length) {
        setTimeout(step, 30);
        // step()
    }
}
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    var live_cnt = 0;
    var void_cnt = 0;
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            if (cells[i][j] == 1) {
                context.fillStyle = fg;
                context.fillRect(i * scale, j * scale, scale, scale);
                live_cnt++;
            }
            else {
                context.fillStyle = bg;
                context.fillRect(i * scale, j * scale, scale, scale);
                void_cnt++;
            }
        }
    }
}
function restart() {
    clear();
    draw();
    process();
    draw();
}
restart();
