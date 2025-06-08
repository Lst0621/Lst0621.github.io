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
        context.fillStyle = "lightyellow";
    }
    else {
        context.fillStyle = "lightblue";
    }
    context.beginPath();
    context.rect(x, y, sz, sz);
    context.fill();
    for (let i = 0; i < vertices.length; i += 2) {
        let v_x_0 = x + (vertices[i][0]) * sz / num_vt;
        let v_y_0 = y + (vertices[i][1]) * sz / num_vt;
        let v_x_1 = x + (vertices[i + 1][0]) * sz / num_vt;
        let v_y_1 = y + (vertices[i + 1][1]) * sz / num_vt;
        context.beginPath();
        if (is_on_same_side(vertices[i], vertices[i + 1], num_vt)) {
            let angle = 0;
            if (v_x_0 == v_x_1) {
                angle = v_x_0 == x ? -Math.PI / 2 : Math.PI / 2;
            }
            else {
                angle = v_y_0 == y ? 0 : Math.PI;
            }
            context.arc((v_x_0 + v_x_1) / 2, (v_y_0 + v_y_1) / 2, (Math.abs(v_x_1 - v_x_0) + Math.abs(v_y_1 - v_y_0)) / 2, angle, angle + Math.PI);
        }
        else {
            context.moveTo(v_x_0, v_y_0);
            context.lineTo(v_x_1, v_y_1);
        }
        context.stroke();
    }
}
function is_on_same_side(v1, v2, num_vt) {
    if (v1[0] == v2[0] && Math.abs(v1[1] - v2[1]) < num_vt) {
        return true;
    }
    if (v1[1] == v2[1] && Math.abs(v1[0] - v2[0]) < num_vt) {
        return true;
    }
    return false;
}
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    let num_sq = 10;
    let w = canvas.width / num_sq;
    let num_vt = 2;
    for (let i = 0; i < num_sq; i++) {
        for (let j = 0; j < num_sq; j++) {
            draw_square(i * w, j * w, w, num_vt, shuffleArray(get_node_pos(num_vt)));
        }
    }
}
document.getElementById("reset").onclick = draw;
draw();
