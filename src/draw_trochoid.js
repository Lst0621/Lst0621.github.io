var canvas = document.getElementById('canvas1');
var context = canvas.getContext("2d");
var width = canvas.width;
var half_width = width / 2;
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
function get_x(R, r, d, theta, delta) {
    var x = (R - r) * Math.cos(theta + delta) + d * Math.cos((R - r) / r * theta + delta);
    return x;
}
function get_y(R, r, d, theta, delta) {
    var y = (R - r) * Math.sin(theta + delta) - d * Math.sin((R - r) / r * theta + delta);
    return y;
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
function draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, delta) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    console.log("draw ", R, r_R_ratio_a, r_R_ratio_b, d_R_ratio);
    var r_R_ratio = r_R_ratio_a / r_R_ratio_b;
    var round = r_R_ratio_b / gcd(r_R_ratio_a, r_R_ratio_b);
    console.log("round " + round);
    var r = R * r_R_ratio;
    var d = R * d_R_ratio;
    var count_per_round = 100;
    var total_count = count_per_round * round;
    var cords = get_dp(R, r, d, delta, round, total_count);
    for (var i = 0; i + 1 < total_count; i++) {
        var x_start = cords[0][i];
        var y_start = cords[1][i];
        var x_end = cords[0][i + 1];
        var y_end = cords[1][i + 1];
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
function update() {
    var R = 100;
    var r_R_ratio_a = get_int("r_R_ratio_a");
    var r_R_ratio_b = get_int("r_R_ratio_b");
    var d_R_ratio = get_float("d_R_ratio");
    draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, 0);
}
draw(100, 32, 100, 1, 0);
