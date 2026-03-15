"use strict";
let canvas = document.getElementById('canvas1');
let context = canvas.getContext("2d");
let clear_prev_element = document.getElementById("clear_prev");
let animation_element = document.getElementById("animation");
let animation = animation_element.checked;
let clear_prev = clear_prev_element.checked;
let count_per_round = get_int("count_per_round");
let width = canvas.width;
let half_width = width / 2;
let R = 100;
let r_R_ratio_a = get_int("r_R_ratio_a");
let r_R_ratio_b = get_int("r_R_ratio_b");
let d_R_ratio = get_float("d_R_ratio");
let rotate = get_float("rotate") / 360 * 2 * Math.PI;
let timeout = 50;
let call_back_id = 0;
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
let dp_map = {};
function get_dp(R, r, d, delta, round, count) {
    let key = R.toString() + " " + r.toString() + " " + d.toString() +
        " " + delta.toString() + " " + round.toString() + " " + count.toString();
    if (key in dp_map) {
        return dp_map[key];
    }
    let dp_x = [];
    let dp_y = [];
    for (let i = 0; i < count; i++) {
        let theta = round * 2 * Math.PI / count * i;
        dp_x.push(get_x(R, r, d, theta, delta));
        dp_y.push(get_y(R, r, d, theta, delta));
    }
    let coordinates = [];
    coordinates.push(dp_x);
    coordinates.push(dp_y);
    dp_map[key] = coordinates;
    return coordinates;
}
function clear_canvas() {
    context.fillRect(0, 0, canvas.width, canvas.height);
}
function draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, delta) {
    console.log("draw ", R, r_R_ratio_a, r_R_ratio_b, d_R_ratio);
    let r_R_ratio = r_R_ratio_a / r_R_ratio_b;
    let round = r_R_ratio_b / gcd(r_R_ratio_a, r_R_ratio_b);
    console.log("round " + round);
    let r = R * r_R_ratio;
    let d = R * d_R_ratio;
    let total_count = count_per_round * round;
    let cords = get_dp(R, r, d, delta, round, total_count);
    for (let i = 0; i + 1 < total_count; i++) {
        let x_start = cords[0][i];
        let y_start = cords[1][i];
        let x_end = cords[0][i + 1];
        let y_end = cords[1][i + 1];
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
    let r_R_ratio = r_R_ratio_a / r_R_ratio_b;
    let r = R * r_R_ratio;
    context.beginPath();
    context.arc(half_width, half_width, R - r, 0, 2 * Math.PI);
    context.stroke();
    // draw moving
    let moving_center_x = half_width + get_moving_circle_center_x(R, r, theta, delta);
    let moving_center_y = half_width + get_moving_circle_center_y(R, r, theta, delta);
    context.beginPath();
    context.arc(moving_center_x, moving_center_y, r, 0, 2 * Math.PI);
    context.stroke();
    //draw line
    let d = R * d_R_ratio;
    let trochoid_x = half_width + get_x(R, r, d, theta, delta);
    let trochoid_y = half_width + get_y(R, r, d, theta, delta);
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
    animation = animation_element.checked;
    clear_prev = clear_prev_element.checked;
}
function draw_once(theta) {
    let animation_enabled = clear_prev && animation;
    if (animation_enabled) {
        clear_canvas();
        draw_animation(theta, rotate);
    }
    draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, rotate);
    if (animation_enabled) {
        let factor = 20;
        call_back_id = setTimeout(function () {
            draw_once(theta + 2 * Math.PI / factor);
        }, timeout);
    }
}
function update() {
    clearTimeout(call_back_id);
    read_paras();
    if (clear_prev) {
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
