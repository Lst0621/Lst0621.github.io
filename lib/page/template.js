"use strict";
console.log("Hello");
function draw_canvas() {
    let canvas = document.getElementById('canvas_id_untitled');
    let context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "lightgreen";
    context.fillRect(30, 30, 100, 100);
}
draw_canvas();
