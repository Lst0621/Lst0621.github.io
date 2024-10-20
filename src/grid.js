var canvas = document.getElementById('grid');
var head_span = document.getElementById("head_span");
var context = canvas.getContext("2d");
var positions = [];
var acceleration = [];
var speed = [];
var len_x = 16;
var len_y = 30;
var width = canvas.width;
var timeout = 24;
var gen = 0;
var to = 0;
var PERSPECTIVE = width * 1;
function get_random_pos() {
    return 1.8 * (Math.random() - 0.5) * width;
}
function create_grid() {
    var grid = [];
    for (var i = 0; i < len_x; i++) {
        grid.push(new Array());
        for (var j = 0; j < len_y; j++) {
            grid[i].push([0, 0, 0]);
        }
    }
    return grid;
}
function start() {
    positions = create_grid();
    speed = create_grid();
    for (var i = 0; i < len_x; i++) {
        // positions.push(new Array<Array<number>>())
        for (var j = 0; j < len_y; j++) {
            // 3d
            positions[i][j][0] = get_random_pos();
            positions[i][j][1] = get_random_pos();
            positions[i][j][2] = get_random_pos();
            // console.log(positions[i][j])
        }
    }
}
var PROJECTION_CENTER_X = width / 2; // x center of the canvas
var PROJECTION_CENTER_Y = width / 2; // y center of the canvas
function draw() {
    head_span.innerText = "Evolution of 2D Grid in 3D gen: " + gen;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < len_x; i++) {
        for (var j = 0; j < len_y; j++) {
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
            draw_edge(positions[i][j], positions[i][get_mod_idx(j + 1, len_y)], 'darkblue');
            draw_edge(positions[i][j], positions[get_mod_idx(i + 1, len_x)][j], 'darkgreen');
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
function get_mod_idx(x, n) {
    if (x < 0) {
        return x + n;
    }
    if (x >= n) {
        return x - n;
    }
    return x;
}
function get_acc(pos, nbs) {
    var shift = [0, 0, 0];
    var push_factor = 0;
    var pull_factor = 0;
    var pp_ratio = 0;
    // pull_factor = 0.01 // 1st order
    pull_factor = 0.00005; //2nd order
    pp_ratio = 0;
    push_factor = pull_factor * pp_ratio;
    var dist0 = 200;
    for (var i = 0; i < nbs.length; i++) {
        var nb = nbs[i];
        var d = [pos[0] - nb[0], pos[1] - nb[1], pos[2] - nb[2]];
        var dist = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2] + 0.0000001);
        dist_sum += dist;
        if (i == 0 || i == 2) {
            dist0 = 100 / len_x;
        }
        else if (i == 1 || i == 3) {
            dist0 = 60 / len_y;
        }
        else if (i == 4) {
            dist0 = 800;
        }
        else if (i == 5) {
            dist0 = 150;
        }
        var push = push_factor / dist / dist;
        var pull = pull_factor * (dist - dist0);
        // let increase = 3
        // let decrease = 1
        // let g = Math.floor(gen / 5000) % 2
        // if ( i == 0 || i == 2) {
        //     // nbs from len_x
        //     // push *= increase * increase * increase
        //     // pull /= decrease * decrease * decrease
        // } else {
        //     // nbs from len_y
        //     // blue stronger pull
        //     // pull *= increase * increase * increase
        //     // push /= decrease * decrease * decrease
        // }
        shift[0] += d[0] / dist * (push - pull);
        shift[1] += d[1] / dist * (push - pull);
        shift[2] += d[2] / dist * (push - pull);
    }
    // console.log(shift)
    // return [pos[0]+ shift[0], pos[1]+shift[1], pos[2]+shift[2]]
    return shift;
}
var dist_sum = 0;
function evolve() {
    // console.log("Evolve")
    dist_sum = 0;
    gen += 1;
    var next_positions = [];
    for (var i = 0; i < len_x; i++) {
        next_positions.push(new Array());
        for (var j = 0; j < len_y; j++) {
            //next_positions[i].push(new Array<number>())
            var current_pos = positions[i][j];
            next_positions[i].push(current_pos);
            var nbs = [
                positions[get_mod_idx(i - 1, len_x)][get_mod_idx(j + 0, len_y)],
                positions[get_mod_idx(i + 0, len_x)][get_mod_idx(j + 1, len_y)],
                positions[get_mod_idx(i + 1, len_x)][get_mod_idx(j + 0, len_y)],
                positions[get_mod_idx(i + 0, len_x)][get_mod_idx(j - 1, len_y)],
                positions[get_mod_idx(i + len_x / 2, len_x)][get_mod_idx(j + len_y / 2, len_y)],
                // positions[get_mod_idx(i +0, len_x)][get_mod_idx(j+len_y/2,len_y)],
                // positions[get_mod_idx(i - 1)][get_mod_idx(j - 1)],
                // positions[get_mod_idx(i - 1)][get_mod_idx(j + 1)],
                // positions[get_mod_idx(i + 1)][get_mod_idx(j - 1)],
                // positions[get_mod_idx(i + 1)][get_mod_idx(j + 1)],
            ];
            var acc = get_acc(current_pos, nbs);
            next_positions[i][j][0] += speed[i][j][0];
            next_positions[i][j][1] += speed[i][j][1];
            next_positions[i][j][2] += speed[i][j][2];
            // speed[i][j][0] = acc[0]
            // speed[i][j][1] = acc[1]
            // speed[i][j][2] = acc[2]
            var friction = 0.01;
            speed[i][j][0] += acc[0] - friction * speed[i][j][0];
            speed[i][j][1] += acc[1] - friction * speed[i][j][1];
            speed[i][j][2] += acc[2] - friction * speed[i][j][2];
            // next_positions[i][j][0] += speed[i][j][0]
            // next_positions[i][j][1] += speed[i][j][1]
            // next_positions[i][j][2] += speed[i][j][2]
            // console.log(next_positions[i][j], speed[i][j], acceleration[i][j])
        }
    }
    var dist_avg = dist_sum / 6 / len_x / len_y;
    console.log("avg dist: " + dist_avg);
    positions = next_positions;
}
function loop() {
    draw();
    var k = 20;
    for (var i = 0; i < k; i++) {
        evolve();
    }
    to = setTimeout(loop, timeout);
}
start();
loop();
