"use strict";
let canvas = document.getElementById('canvas_square_pattern');
let context = canvas.getContext("2d");
function get_node_pos(n) {
    let ret = [];
    for (let i = 1; i <= n; i++) {
        ret.push([i - 0.5, 0]);
        ret.push([n, i - 0.5]);
        ret.push([n + 0.5 - i, n]);
        ret.push([0, n + 0.5 - i]);
    }
    console.log(ret);
    return ret;
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
function draw_square(x, y, sz, num_vt, vertices) {
    if ((x + y) / sz % 2 == 0) {
        context.fillStyle = "yellow";
    }
    else {
        context.fillStyle = "lightblue";
    }
    context.beginPath();
    context.rect(x, y, sz, sz);
    context.fill();
    for (let vertex of vertices) {
        let v_x = x + (vertex[0]) * sz / num_vt;
        let v_y = y + (vertex[1]) * sz / num_vt;
        context.beginPath();
        context.arc(v_x, v_y, 4, 0, 2 * Math.PI);
        context.stroke();
    }
    for (let i = 0; i < vertices.length; i += 2) {
        context.beginPath();
        let v_x_0 = x + (vertices[i][0]) * sz / num_vt;
        let v_y_0 = y + (vertices[i][1]) * sz / num_vt;
        context.moveTo(v_x_0, v_y_0);
        let v_x_1 = x + (vertices[i + 1][0]) * sz / num_vt;
        let v_y_1 = y + (vertices[i + 1][1]) * sz / num_vt;
        context.lineTo(v_x_1, v_y_1);
        context.stroke();
    }
}
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    let w = 60;
    let num_vt = 2;
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            draw_square(i * w, j * w, w, num_vt, shuffleArray(get_node_pos(num_vt)));
        }
    }
}
draw();
