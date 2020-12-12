var canvas = document.getElementById('gol');
var context = canvas.getContext("2d");
var cells = [];
var len = 40;
var scale = 800 / len;
var thres = 0.2;
var timeout = 100;
var to = 0;
function init() {
    cells = [];
    for (var i = 0; i < len; i++) {
        cells.push(new Array());
        for (var j = 0; j < len; j++) {
            cells[i].push(0);
        }
    }
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            if (Math.random() < thres) {
                cells[i][j] = 1;
            }
        }
    }
}
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    var cnt = 0;
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            if (cells[i][j] == 1) {
                context.fillStyle = 'red';
                context.fillRect(i * scale, j * scale, scale - 1, scale - 1);
                cnt++;
            }
            else {
                //context.fillStyle = 'white'
                //context.fillRect(i * scale, j * scale, scale - 1, scale - 1);
            }
        }
    }
    console.log(cnt);
}
function evolve() {
    var next_cells = [];
    for (var i = 0; i < len; i++) {
        next_cells.push(new Array());
        for (var j = 0; j < len; j++) {
            next_cells[i].push(0);
        }
    }
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < len; j++) {
            var sum = 0;
            for (var _i = 0, _a = [-1, 0, 1]; _i < _a.length; _i++) {
                var dx = _a[_i];
                for (var _b = 0, _c = [-1, 0, 1]; _b < _c.length; _b++) {
                    var dy = _c[_b];
                    if (dx == 0 && dy == 0) {
                        continue;
                    }
                    if (i + dx < 0 || i + dx == len || j + dy < 0 || j + dy == len) {
                        continue;
                    }
                    sum += cells[i + dx][j + dy];
                }
            }
            if ((cells[i][j] == 1 && sum == 2) || sum == 3) {
                next_cells[i][j] = 1;
            }
            //console.log(i,j,cells[i][j], sum, next_cells[i][j])
        }
    }
    cells = next_cells;
}
function loop() {
    draw();
    evolve();
    to = setTimeout(loop, timeout);
}
function restart() {
    clearTimeout(to);
    init();
    loop();
}
restart();
