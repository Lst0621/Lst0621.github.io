import {cartesian_product} from "./tsl/math.js";

let canvas: HTMLCanvasElement = document.getElementById('gol') as
    HTMLCanvasElement;
let head_span: HTMLSpanElement = document.getElementById("head_span") as HTMLSpanElement
let context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
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
let dead_cell: number = 0

export enum StartMode {
    Random,
    Pulsar,
    Glider,
    Gun
}


// https://lavalle.pl/planning/node136.html
export enum TopologyMode {
    Plain,
    Mobius,
    Klein,
    Torus,
    Cylinder,
    ONE_D,

}


let start_mode: StartMode = StartMode.Random
let topo_mode: TopologyMode = TopologyMode.Plain

export function set_start_mode(mode: StartMode) {
    start_mode = mode
}

export function set_topology_mode(mode: TopologyMode): void {
    topo_mode =  mode
    update_border()
}

set_topology_mode(TopologyMode.Torus)

let mouse_x: number = 0
let mouse_y: number = 0
let mouse_on_canvas: boolean = false

canvas.addEventListener('mousemove', e => {
    mouse_x = e.offsetX
    mouse_y = e.offsetY
    // console.log(mouse_x, mouse_y)
})
canvas.addEventListener('mouseleave', e => {
    mouse_on_canvas = false
})
canvas.addEventListener('mouseenter', e => {
    mouse_on_canvas = true
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

function glider_start() {
    let mid_point: number = len / 2
    cells[mid_point + 4][mid_point] = 1
    cells[mid_point + 4][mid_point + 1] = 1
    cells[mid_point + 4][mid_point + 2] = 1
    cells[mid_point + 1 + 4][mid_point] = 1
    cells[mid_point + 2 + 4][mid_point + 1] = 1
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    let live_cnt: number = 0
    let dead_cnt: number = 0
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (cells[i][j] == 1) {
                // context.fillStyle = '#FC9F4D';
                context.fillStyle = 'darkgray';
                context.fillRect(i * scale, j * scale, scale, scale);
                live_cnt++
            } else {
                // context.fillStyle = '#FFBA84'
                context.fillStyle = 'black'
                context.fillRect(i * scale, j * scale, scale, scale);
                if (!(topo_mode == TopologyMode.ONE_D && !is_boundary(i, j))) {
                    dead_cnt++
                }
            }
        }
    }

    live_cell = live_cnt
    dead_cell = dead_cnt

}

function update_border() {
    canvas.style.border = "15px solid grey"
    canvas.style.borderImageSlice = "1"
    switch (topo_mode) {
        case TopologyMode.Klein:
            canvas.style.borderImageSource =
                "conic-gradient(red,orange,grey,purple,blue,lightblue," +
                "grey,orange,red,pink,grey,purple,blue,lightblue,grey,pink,red)"
            break
        case TopologyMode.Cylinder:
            canvas.style.borderImageSource =
                "linear-gradient(grey,red,blue,grey)";
            break
        case TopologyMode.Mobius:
            canvas.style.borderImageSource =
                "conic-gradient(grey,grey,grey,blue,purple,red,grey,grey," +
                "grey,grey,grey,blue,purple,red,grey,grey,grey)"
            break
        case TopologyMode.Torus:
            canvas.style.borderImageSource =
                "conic-gradient(red,orange,grey,lightblue,blue,purple," +
                "grey,orange,red,pink,grey,purple,blue,lightblue,grey,pink,red)"
            break
        case TopologyMode.Plain:
        case TopologyMode.ONE_D:
        default:
            break
    }
}

function is_inside_canvas(i: number, j: number): boolean {
    return (i >= 0 && i < len && j >= 0 && j < len)
}

function is_boundary(i: number, j: number): boolean {
    return i==0 || j==0 || i ==len -1 || j ==len-1
}

function fetch_value(i: number, j: number): number {
    if (topo_mode == TopologyMode.ONE_D) {
        if (is_inside_canvas(i, j) && is_boundary(i, j)) {
            return cells[i][j]
        } else {
            return 0
        }
    }

    if (is_inside_canvas(i, j)) {
        return cells[i][j]
    }

    switch (topo_mode) {
        case TopologyMode.Cylinder:
            if (i == -1) {
                i = len - 1
            }
            if (i == len) {
                i = 0
            }
            if (is_inside_canvas(i, j)) {
                return cells[i][j]
            }
            return 0
        case TopologyMode.Mobius:
            if (i == -1) {
                i = len - 1
                j = len - 1 - j
            }
            if (i == len) {
                i = 0
                j = len - 1 - j
            }
            if (is_inside_canvas(i, j)) {
                return cells[i][j]
            }
            return 0
        case TopologyMode.Torus:
            if (i == -1) {
                i = len - 1
            }
            if (i == len) {
                i = 0
            }
            if (j == -1) {
                j = len - 1
            }
            if (j == len) {
                j = 0
            }
            if (is_inside_canvas(i, j)) {
                return cells[i][j]
            }
            return 0
        case TopologyMode.Klein:
            if (j == -1) {
                j = len - 1
            }
            if (j == len) {
                j = 0
            }
            if (i == -1) {
                i = len - 1
                j = len - 1 - j
            }
            if (i == len) {
                i = 0
                j = len - 1 - j
            }
            if (is_inside_canvas(i, j)) {
                return cells[i][j]
            }
            return 0
        case TopologyMode.Plain:
        default:
            return 0;
    }
}

function get_nb_count(i: number, j: number): number {
    let sum = 0
    for (let [dx, dy] of cartesian_product([[-1, 0, 1], [-1, 0, 1]])) {
        if (dx == 0 && dy == 0) {
            continue;
        }
        sum += fetch_value(i + dx, j + dy)
    }
    return sum
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

    let mouse_grid_x: number = Math.floor(mouse_x / scale)
    let mouse_grid_y: number = Math.floor(mouse_y / scale)
    let activate_checked: boolean = activate_check.checked
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (activate_checked && mouse_on_canvas && i == mouse_grid_x && j == mouse_grid_y) {
                next_cells[i][j] = 1
                continue
            }

            let sum: number = get_nb_count(i, j)
            if (topo_mode == TopologyMode.ONE_D) {
                if (!is_boundary(i, j)) {
                    continue;
                }
                if ((cells[i][j] == 1 && sum != 2) || (cells[i][j] == 0 && sum > 0)) {
                    next_cells[i][j] = 1
                }

            } else {
                if ((cells[i][j] == 1 && sum == 2) || sum == 3) {
                    next_cells[i][j] = 1
                }
            }
        }
    }

    cells = next_cells;
}


function loop() {
    draw()
    head_span.innerText = "Game of Life\ngen: " + gen +
        " alive: " + live_cell + " dead: " + dead_cell + " topology: " +
        TopologyMode[topo_mode]

    evolve()
    to = setTimeout(loop, timeout)
}

function one_d_clear() {
    if (topo_mode != TopologyMode.ONE_D) {
        return
    }
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (!is_boundary(i, j)) {
                cells[i][j] = 0
            }
        }
    }
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
        case StartMode.Glider:
            glider_start()
            break
        case StartMode.Random:
        default:
            random_start()
    }

    one_d_clear()
}

export function restart() {
    clearTimeout(to)
    init()
    loop()
}
