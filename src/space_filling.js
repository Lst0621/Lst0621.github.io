var canvas = document.getElementById('space_filling_canvas');
var head_span = document.getElementById("head_span");
var context = canvas.getContext("2d");
function draw_square(x, y, width, level, positive, major) {
    if (level == 1) {
        // last iteration
        context.beginPath();
        if (major) {
            context.strokeStyle = "yellow";
            if (positive) {
                context.strokeStyle = context.createLinearGradient(x, y, x + width, y + width);
            }
            else {
                context.strokeStyle = context.createLinearGradient(x + width, y + width, x, y);
            }
            context.strokeStyle.addColorStop(0, "yellow");
            context.strokeStyle.addColorStop(1, "red");
            context.moveTo(x, y);
            context.lineTo(x + width, y + width);
        }
        else {
            context.strokeStyle = "green";
            if (positive) {
                context.strokeStyle = context.createLinearGradient(x + width, y, x, y + width);
            }
            else {
                context.strokeStyle = context.createLinearGradient(x, y + width, x + width, y);
            }
            context.strokeStyle.addColorStop(0, "blue");
            context.strokeStyle.addColorStop(1, "green");
            context.moveTo(x + width, y);
            context.lineTo(x, y + width);
        }
        context.stroke();
        return;
    }
    var split = 3;
    var next_width = width / split;
    for (var i = 0; i < split; i++) {
        for (var j = 0; j < split; j++) {
            draw_square(x + i * next_width, y + j * next_width, next_width, level - 1, j % 2 == 0 ? positive : !positive, (i + j) % 2 == 0 ? major : !major);
        }
    }
}
var lvl = 4;
function increment() {
    lvl += 1;
    draw();
}
function decrement() {
    if (lvl > 1) {
        lvl -= 1;
    }
    draw();
}
function draw() {
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.width);
    draw_square(0, 0, canvas.width, lvl, true, true);
}
draw();
