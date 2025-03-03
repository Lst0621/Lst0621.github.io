var canvas = document.getElementById('space_filling_canvas');
var head_span = document.getElementById("head_span");
var context = canvas.getContext("2d");
var to = 0;
function draw_square(start, end, level) {
    var x0 = start[0];
    var y0 = start[1];
    var x1 = end[0];
    var y1 = end[1];
    if (level == 1) {
        // last iteration
        if (line_cnt <= box_idx) {
            context.beginPath();
            var major = (x0 - x1) * (y0 - y1) > 0;
            if (major) {
                context.strokeStyle = context.createLinearGradient(x0, y0, x1, y1);
                context.strokeStyle.addColorStop(0, "yellow");
                context.strokeStyle.addColorStop(1, "red");
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
            }
            else {
                context.strokeStyle = context.createLinearGradient(x0, y0, x1, y1);
                context.strokeStyle.addColorStop(0, "blue");
                context.strokeStyle.addColorStop(1, "green");
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
            }
            context.stroke();
        }
        line_cnt += 1;
        if (line_cnt >= Math.pow(9, lvl - 1)) {
            line_cnt = 0;
        }
    }
    else {
        var diff_x = (x1 - x0) / 3;
        var diff_y = (y1 - y0) / 3;
        draw_square([x0, y0], [x0 + diff_x, y0 + diff_y], level - 1);
        draw_square([x0 + diff_x, y0 + diff_y], [x0, y1 - diff_y], level - 1);
        draw_square([x0, y1 - diff_y], [x0 + diff_x, y1], level - 1);
        draw_square([x0 + diff_x, y1], [x1 - diff_x, y1 - diff_y], level - 1);
        draw_square([x1 - diff_x, y1 - diff_y], [x0 + diff_x, y0 + diff_y], level - 1);
        draw_square([x0 + diff_x, y0 + diff_y], [x1 - diff_x, y0], level - 1);
        draw_square([x1 - diff_x, y0], [x1, y0 + diff_y], level - 1);
        draw_square([x1, y0 + diff_y], [x1 - diff_x, y1 - diff_y], level - 1);
        draw_square([x1 - diff_x, y1 - diff_y], [x1, y1], level - 1);
    }
}
var lvl = 3;
function increment() {
    lvl += 1;
    restart();
}
function decrement() {
    if (lvl > 1) {
        lvl -= 1;
    }
    restart();
}
var line_cnt = 0;
function draw() {
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.width);
    line_cnt = 0;
    draw_square([0, 0], [canvas.width, canvas.width], lvl);
}
var timeout = 100;
var box_idx = 0;
function loop() {
    draw();
    box_idx += 1;
    if (box_idx >= Math.pow(9, lvl - 1)) {
        box_idx = 0;
    }
    console.log("box idx " + box_idx.toString());
    to = setTimeout(loop, timeout);
}
function restart() {
    box_idx = 0;
    clearTimeout(to);
    loop();
}
restart();
