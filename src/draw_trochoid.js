var canvas = document.getElementById('canvas1');
var context = canvas.getContext("2d");
var clear_prev = document.getElementById("clear_prev");
var count_per_round = get_int("count_per_round");
var width = canvas.width;
var half_width = width / 2;
var R = 100;
var r_R_ratio_a = get_int("r_R_ratio_a");
var r_R_ratio_b = get_int("r_R_ratio_b");
var d_R_ratio = get_float("d_R_ratio");
var rotate = get_float("rotate") / 360 * 2 * Math.PI;
var timeout = 50;
var call_back_id = 0;
function gcd(a, b) {
    if (a == b) {
        return a;
    }
    if (a > b) {
        return gcd(b, a);
    }
    // a<b
    if (b % a == 0) {
        return a;
    }
    return gcd(b % a, a);
}
function get_moving_circle_center_x(R, r, theta, delta) {
    return (R - r) * Math.cos(theta + delta);
}
function get_moving_circle_center_y(R, r, theta, delta) {
    return (R - r) * Math.sin(theta + delta);
}
function get_x(R, r, d, theta, delta) {
    return get_moving_circle_center_x(R, r, theta, delta) + d * Math.cos((R - r) / r * theta + delta);
}
function get_y(R, r, d, theta, delta) {
    return get_moving_circle_center_y(R, r, theta, delta) - d * Math.sin((R - r) / r * theta + delta);
}
function get_dp(R, r, d, delta, round, count) {
    var dp_x = [];
    var dp_y = [];
    for (var i = 0; i < count; i++) {
        var theta = round * 2 * Math.PI / count * i;
        dp_x.push(get_x(R, r, d, theta, delta));
        dp_y.push(get_y(R, r, d, theta, delta));
    }
    var coordinates = [];
    coordinates.push(dp_x);
    coordinates.push(dp_y);
    return coordinates;
}
function clear_canvas() {
    context.fillRect(0, 0, canvas.width, canvas.height);
}
function draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, delta) {
    console.log("draw ", R, r_R_ratio_a, r_R_ratio_b, d_R_ratio);
    var r_R_ratio = r_R_ratio_a / r_R_ratio_b;
    var round = r_R_ratio_b / gcd(r_R_ratio_a, r_R_ratio_b);
    console.log("round " + round);
    var r = R * r_R_ratio;
    var d = R * d_R_ratio;
    var total_count = count_per_round * round;
    var cords = get_dp(R, r, d, delta, round, total_count);
    for (var i = 0; i + 1 < total_count; i++) {
        var x_start = cords[0][i];
        var y_start = cords[1][i];
        var x_end = cords[0][i + 1];
        var y_end = cords[1][i + 1];
        context.strokeStyle = "#856f45";
        context.beginPath();
        context.moveTo(half_width + x_start, half_width + y_start);
        context.lineTo(half_width + x_end, half_width + y_end);
        context.stroke();
    }
}
function get_int(element_id) {
    return parseInt(document.getElementById(element_id).value);
}
function get_float(element_id) {
    return parseFloat(document.getElementById(element_id).value);
}
function draw_animation(theta, delta) {
    // draw outer
    context.beginPath();
    context.arc(half_width, half_width, R, 0, 2 * Math.PI);
    context.stroke();
    // draw moving center traj
    var r_R_ratio = r_R_ratio_a / r_R_ratio_b;
    var r = R * r_R_ratio;
    context.beginPath();
    context.arc(half_width, half_width, R - r, 0, 2 * Math.PI);
    context.stroke();
    // draw moving
    var moving_center_x = half_width + get_moving_circle_center_x(R, r, theta, delta);
    var moving_center_y = half_width + get_moving_circle_center_y(R, r, theta, delta);
    context.beginPath();
    context.arc(moving_center_x, moving_center_y, r, 0, 2 * Math.PI);
    context.stroke();
    //draw line
    var d = R * d_R_ratio;
    var trochoid_x = half_width + get_x(R, r, d, theta, delta);
    var trochoid_y = half_width + get_y(R, r, d, theta, delta);
    context.beginPath();
    context.moveTo(moving_center_x, moving_center_y);
    context.lineTo(trochoid_x, trochoid_y);
    context.stroke();
}
function read_paras() {
    r_R_ratio_a = get_int("r_R_ratio_a");
    r_R_ratio_b = get_int("r_R_ratio_b");
    d_R_ratio = get_float("d_R_ratio");
    rotate = get_float("rotate");
    count_per_round = get_int("count_per_round");
}
function draw_once(theta) {
    if (clear_prev.checked) {
        clear_canvas();
        draw_animation(theta, rotate);
    }
    draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, rotate);
    if (clear_prev.checked) {
        var factor_1 = 20;
        call_back_id = setTimeout(function () {
            draw_once(theta + 2 * Math.PI / factor_1);
        }, timeout);
    }
}
function update() {
    clearTimeout(call_back_id);
    read_paras();
    if (clear_prev.checked) {
        console.log("clear");
        clear_canvas();
    }
    else {
        console.log("keep previously drawn");
    }
    draw_once(0);
}
context.fillStyle = "#000000";
clear_canvas();
update();
