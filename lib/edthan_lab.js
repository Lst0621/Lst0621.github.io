"use strict";
let step = 500;
function draw_ethan_lab(s) {
    let canvas = document.getElementById('canvas_lab');
    let context = canvas.getContext("2d");
    let factor = 500;
    let x_max = get_x_limit(s);
    let step_size = x_max / step;
    let locations = [];
    for (let i = 0; i < step; i++) {
        let x = i * step_size;
        let y = get_y(x, s);
        locations.push([x, y]);
    }
    locations.push([x_max, get_y(x_max, s)]);
    for (let i = 0; i < step; i++) {
        let x = locations[step - 1 - i][0];
        let y = locations[step - 1 - i][1];
        locations.push([y, x]);
    }
    console.log(locations);
    context.beginPath();
    context.moveTo(factor * locations[0][0], canvas.height - factor * locations[0][1]);
    for (let i = 1; i < locations.length; i++) {
        context.lineTo(factor * locations[i][0], canvas.height - factor * locations[i][1]);
    }
    context.stroke();
}
function get_x_limit(s) {
    return (1 + Math.sqrt(s)) / 2;
}
function get_y(x, s) {
    return Math.pow((Math.sqrt(s * x) + Math.sqrt((1 - s) * (1 - x))), 2);
}
draw_ethan_lab(0.3);
