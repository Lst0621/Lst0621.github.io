var canvas = document.getElementById('tree');
var context = canvas.getContext("2d");
var left_vec = [0.88, -0.26];
var right_vec = [0.75, 0.4];
var root = [400, canvas.height - 100];
var main_branch = [0, -60];
var aspect_ratio = 0.15;
var level_min = 0;
var level_max = 16;
var level = 10;
function add(x, y) {
    return [x[0] + y[0], x[1] + y[1]];
}
function times(x, y) {
    return [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
}
function scale(x, s) {
    return [x[0] * s, x[1] * s];
}
function fork(start, dir, cnt, left) {
    if (cnt == 0) {
        return;
    }
    draw(start, dir, cnt, left);
    var dir_left = times(left_vec, dir);
    var dir_right = times(right_vec, dir);
    fork(add(dir_left, start), dir_left, cnt - 1, true);
    fork(add(dir_right, start), dir_right, cnt - 1, false);
}
function draw(start, dir, cnt, left) {
    var half_y = scale(dir, 0.45);
    var half_x = scale(times([0, 1], half_y), aspect_ratio);
    var top_left = add(start, add(half_x, half_y));
    var top_right = add(top_left, scale(half_x, -2));
    var bottom_left = add(top_left, scale(half_y, -2));
    var bottom_right = add(scale(top_left, -1), add(bottom_left, top_right));
    if (left) {
        context.fillStyle = 'red';
    }
    else {
        context.fillStyle = 'black';
    }
    context.beginPath();
    context.moveTo(top_left[0], top_left[1]);
    context.lineTo(top_right[0], top_right[1]);
    context.lineTo(bottom_right[0], bottom_right[1]);
    context.lineTo(bottom_left[0], bottom_left[1]);
    context.fill();
}
function draw_tree() {
    if (level == level_min) {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    fork(root, main_branch, level, true);
    level_up();
    setTimeout(draw_tree, 800);
}
function level_up() {
    level = level + 1;
    if (level == level_max) {
        level = level_min;
    }
}
draw_tree();
