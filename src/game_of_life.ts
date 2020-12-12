let canvas: HTMLCanvasElement = document.getElementById('gol') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");
let cells: Array<Array<number>> = []
let len: number = 40
let scale: number = 800 / len
let thres: number = 0.2
let timeout: number = 100
let to: number = 0


function init() {
    cells = []
    for (let i: number = 0; i < len; i++) {
        cells.push(new Array<number>())
        for (let j: number = 0; j < len; j++) {
            cells[i].push(0)
        }
    }

    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (Math.random() < thres) {
                cells[i][j] = 1
            }
        }
    }
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    let cnt: number = 0
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (cells[i][j] == 1) {
                context.fillStyle = 'red';
                context.fillRect(i * scale, j * scale, scale - 1, scale - 1);
                cnt++
            } else {
                //context.fillStyle = 'white'
                //context.fillRect(i * scale, j * scale, scale - 1, scale - 1);
            }
        }
    }
    console.log(cnt)
}

function evolve() {
    let next_cells: Array<Array<number>> = []
    for (let i: number = 0; i < len; i++) {
        next_cells.push(new Array<number>())
        for (let j: number = 0; j < len; j++) {
            next_cells[i].push(0)
        }
    }

    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            let sum: number = 0
            for (let dx of [-1, 0, 1]) {
                for (let dy of [-1, 0, 1]) {
                    if (dx == 0 && dy == 0) {
                        continue;
                    }
                    if (i + dx < 0 || i + dx == len || j + dy < 0 || j + dy == len) {
                        continue;
                    }
                    sum += cells[i + dx] [j + dy];
                }
            }

            if ((cells[i][j] == 1 && sum == 2) || sum == 3) {
                next_cells[i][j] = 1
            }
            //console.log(i,j,cells[i][j], sum, next_cells[i][j])
        }
    }

    cells = next_cells;
}


function loop() {
    draw()
    evolve()
    to = setTimeout(loop, timeout)
}

function restart() {
    clearTimeout(to)
    init()
    loop()
}

restart()

