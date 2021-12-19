let canvas: HTMLCanvasElement = document.getElementById('gol') as
    HTMLCanvasElement;
let head_span: HTMLSpanElement = document.getElementById("head_span") as HTMLSpanElement
let context: CanvasRenderingContext2D = canvas.getContext("2d");
let activate_check: HTMLInputElement = <HTMLInputElement>document.getElementById("activate");
let cells: Array<Array<number>> = []
let len: number = 40
let width: number = canvas.width
let scale: number = width / len
let thres: number = 0.2
let timeout: number = 100
let to: number = 0
let gen: number = 0
let live_cell: number = 0
let void_cell: number = 0

enum StartMode {
    Random,
    Pulsar,
    Gun
}

let start_mode: StartMode = StartMode.Random

function set_start_mode(mode: StartMode) {
    start_mode = mode
}

let mouse_x: number = 0
let mouse_y: number = 0
let mouse_on_canvs: boolean = false

canvas.addEventListener('mousemove', e => {
    mouse_x = e.offsetX
    mouse_y = e.offsetY
    // console.log(mouse_x, mouse_y)
})
canvas.addEventListener('mouseleave', e => {
    mouse_on_canvs = false
})
canvas.addEventListener('mouseenter', e => {
    mouse_on_canvs = true
})

function clear() {
    gen = 0
    cells = []
    for (let i: number = 0; i < len; i++) {
        cells.push(new Array<number>())
        for (let j: number = 0; j < len; j++) {
            cells[i].push(0)
        }
    }
}

function random_start() {
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (Math.random() < thres) {
                cells[i][j] = 1
            }
        }
    }
}


function start_with_pattern(pattern: Array<string>, offset: Array<number>) {
    let coordinates: Array<Array<number>> = []
    for (let i: number = 0; i < pattern.length; i++) {
        let s: string = pattern[i]
        for (let j: number = 0; j < s.length; j++) {
            if (s.charAt(j) == 'O') {
                coordinates.push([i, j])
            }
        }
    }

    for (let coord of coordinates) {
        cells[coord[0] + offset[0]][coord[1] + offset[1]] = 1
    }

}

function gun_start() {
    let pattern: Array<string> = [
        "........................O",
        "......................O.O",
        "............OO......OO............OO",
        "...........O...O....OO............OO",
        "OO........O.....O...OO",
        "OO........O...O.OO....O.O",
        "..........O.....O.......O",
        "...........O...O",
        "............OO"
    ]

    start_with_pattern(pattern, [10, 0])
}

function pulsar_start() {
    let top_left: Array<Array<number>> = [
        [0, 2], [0, 3], [0, 4],
        [2, 0], [3, 0], [4, 0],
        [5, 2], [5, 3], [5, 4],
        [2, 5], [3, 5], [4, 5],
    ]

    let mid_point: number = len / 2
    let offset: number = mid_point - 6
    for (let i: number = 0; i < top_left.length; i++) {
        let x: number = top_left[i][0] + offset
        let y: number = top_left[i][1] + offset

        cells[x][y] = 1
        cells[2 * mid_point - x][2 * mid_point - y] = 1
        cells[x][2 * mid_point - y] = 1
        cells[2 * mid_point - x][y] = 1
    }
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    let live_cnt: number = 0
    let void_cnt: number = 0
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (cells[i][j] == 1) {
                context.fillStyle = '#FC9F4D';
                context.fillRect(i * scale, j * scale, scale, scale);
                live_cnt++
            } else {
                context.fillStyle = '#FFBA84'
                context.fillRect(i * scale, j * scale, scale, scale );
                void_cnt++
            }
        }
    }

    live_cell = live_cnt
    void_cell = void_cnt
}

function evolve() {
    gen += 1
    let next_cells: Array<Array<number>> = []
    for (let i: number = 0; i < len; i++) {
        next_cells.push(new Array<number>())
        for (let j: number = 0; j < len; j++) {
            next_cells[i].push(0)
        }
    }

    let mouse_grid_x: number = Math.floor(mouse_x/scale)
    let mouse_grid_y: number = Math.floor(mouse_y/scale)
    let activate_checked: boolean = activate_check.checked
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (activate_checked && mouse_on_canvs && i == mouse_grid_x && j == mouse_grid_y) {
                next_cells[i][j] = 1
                continue
            }

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
    head_span.innerText = "Game of Life\ngen: " + gen + " active: " + live_cell + " void: " + void_cell
    evolve()
    to = setTimeout(loop, timeout)
}

function init() {
    clear()
    switch (start_mode) {
        case StartMode.Pulsar:
            pulsar_start()
            break
        case StartMode.Gun:
            gun_start()
            break
        case StartMode.Random:
        default:
            random_start()
    }
}

function restart() {
    clearTimeout(to)
    init()
    loop()
}

restart()

