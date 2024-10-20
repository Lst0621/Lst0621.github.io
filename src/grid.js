var canvas = document.getElementById('grid');
var head_span = document.getElementById("head_span");
var context = canvas.getContext("2d");
var positions = [];
var len = 15;
var width = canvas.width;
var timeout = 20;
var gen = 0;
var to = 0;
function get_random_pos() {
    return 1.8 * (Math.random() - 0.5) * width;
}
var PERSPECTIVE = width * 1;
function start() {
    for (var i = 0; i < len; i++) {
        positions.push(new Array());
        for (var j = 0; j < len; j++) {
            positions[i].push(new Array());
            // 3d
            positions[i][j].push(get_random_pos());
            positions[i][j].push(get_random_pos());
            positions[i][j].push(get_random_pos());
            console.log(positions[i][j]);
        }
    }
}
var PROJECTION_CENTER_X = width / 2; // x center of the canvas
var PROJECTION_CENTER_Y = width / 2; // y center of the canvas
function draw() {
    head_span.innerText = "Evolution of 2D Grid in 3D gen: " + gen;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            var x = positions[i][j][0];
            var y = positions[i][j][1];
            var z = positions[i][j][2];
            var radius = 3;
            var scaleProjected = PERSPECTIVE / (PERSPECTIVE + z);
            // The xProjected is the x position on the 2D world
            var xProjected = (x * scaleProjected) + PROJECTION_CENTER_X;
            // The yProjected is the y position on the 2D world
            var yProjected = (y * scaleProjected) + PROJECTION_CENTER_Y;
            // context.fillRect(xProjected - radius, yProjected - radius, radius * 2 * scaleProjected, radius * 2 * scaleProjected);
            context.fillRect(xProjected - radius * scaleProjected, yProjected - radius * scaleProjected, radius * 2 * scaleProjected, radius * 2 * scaleProjected);
            draw_edge(positions[i][j], positions[i][get_mod_idx(j + 1)], 'darkblue');
            draw_edge(positions[i][j], positions[get_mod_idx(i + 1)][j], 'darkgreen');
        }
    }
}
function draw_edge(a, b, stl) {
    var x0 = a[0];
    var y0 = a[1];
    var z0 = a[2];
    var x1 = b[0];
    var y1 = b[1];
    var z1 = b[2];
    var scaleProjected0 = PERSPECTIVE / (PERSPECTIVE + z0);
    var xProjected0 = (x0 * scaleProjected0) + PROJECTION_CENTER_X;
    var yProjected0 = (y0 * scaleProjected0) + PROJECTION_CENTER_Y;
    var scaleProjected1 = PERSPECTIVE / (PERSPECTIVE + z1);
    var xProjected1 = (x1 * scaleProjected1) + PROJECTION_CENTER_X;
    var yProjected1 = (y1 * scaleProjected1) + PROJECTION_CENTER_Y;
    context.strokeStyle = stl;
    context.beginPath();
    context.moveTo(xProjected0, yProjected0);
    context.lineTo(xProjected1, yProjected1);
    context.stroke();
}
function get_mod_idx(x) {
    if (x < 0) {
        return x + len;
    }
    if (x >= len) {
        return x - len;
    }
    return x;
}
function get_next_pos(pos, nbs) {
    var shift = [0, 0, 0];
    var push_factor = 0;
    var pull_factor = 0;
    var pp_ratio = 0;
    pull_factor = 0.0001;
    pp_ratio = 1100 * 500;
    push_factor = pull_factor * pp_ratio;
    for (var i = 0; i < nbs.length; i++) {
        var nb = nbs[i];
        var d = [pos[0] - nb[0], pos[1] - nb[1], pos[2] - nb[2]];
        var dist = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2] + 0.0000001);
        var push = push_factor / dist / dist;
        var pull = pull_factor * dist;
        var increase = 3;
        var decrease = 1.5;
        var g = Math.floor(gen / 5000) % 2;
        if (g == 0 && i == 0 || g == 1 && i == 2) {
            push *= increase * increase * increase;
            pull /= decrease * decrease * decrease;
        }
        else {
            pull *= increase * increase * increase;
            push /= decrease * decrease * decrease;
        }
        shift[0] += d[0] / dist * (push - pull);
        shift[1] += d[1] / dist * (push - pull);
        shift[2] += d[2] / dist * (push - pull);
    }
    return [pos[0] + shift[0], pos[1] + shift[1], pos[2] + shift[2]];
}
function evolve() {
    gen += 1;
    var next_positions = [];
    for (var i = 0; i < len; i++) {
        next_positions.push(new Array());
        for (var j = 0; j < len; j++) {
            next_positions[i].push(new Array());
            var current_pos = positions[i][j];
            var nbs = [
                positions[get_mod_idx(i - 1)][get_mod_idx(j + 0)],
                positions[get_mod_idx(i + 0)][get_mod_idx(j + 1)],
                positions[get_mod_idx(i + 1)][get_mod_idx(j + 0)],
                positions[get_mod_idx(i + 0)][get_mod_idx(j - 1)],
                // positions[get_mod_idx(i - 1)][get_mod_idx(j - 1)],
                // positions[get_mod_idx(i - 1)][get_mod_idx(j + 1)],
                // positions[get_mod_idx(i + 1)][get_mod_idx(j - 1)],
                // positions[get_mod_idx(i + 1)][get_mod_idx(j + 1)],
            ];
            next_positions[i][j] = get_next_pos(current_pos, nbs);
        }
    }
    positions = next_positions;
}
function loop() {
    draw();
    var k = 50;
    for (var i = 0; i < k; i++) {
        evolve();
    }
    to = setTimeout(loop, timeout);
}
start();
loop();
