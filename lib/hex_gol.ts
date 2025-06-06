import {drawHexGrid, hex_dist} from "./hex.js"

let canvas: HTMLCanvasElement = document.getElementById('hexCanvas') as
    HTMLCanvasElement;
let ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;


let to: number = 0
let x_max = 42
let y_max = 49
let hex_radius = 8
let cells: Array<Array<number>> = []
let thres: number = 0.2
let timeout: number = 150
let gen: number = 0

function get_empty_grid(m: number, n: number) {
    let grid: Array<Array<number>> = []

    for (let i: number = 0; i < m; i++) {
        grid.push(new Array<number>())
        for (let j: number = 0; j < n; j++) {
            grid[i].push(0)
        }
    }

    return grid

}

function clear() {
    gen = 0
    cells = get_empty_grid(y_max, x_max)
}

function random_start() {
    for (let i: number = 0; i < y_max; i++) {
        for (let j: number = 0; j < x_max; j++) {
            if (Math.random() < thres) {
                cells[i][j] = 1
            }
        }
    }
}

function get_nb_count(i: number, j: number) {
    let sum: number = 0
    for (let dy of [-1, 0, 1]) {
        for (let dx of [-1, 0, 1]) {
            if (dx == 0 && dy == 0) {
                continue;
            }
            if (hex_dist([i, j], [i + dy, j + dx]) != 1) {
                continue
            }
            sum += cells[(i + dy + y_max) % y_max][(j + dx + x_max) % x_max]
        }
    }
    return sum
}

function evolve() {
    gen += 1
    let next_cells: number[][] = get_empty_grid(y_max, x_max)

    let survivals: boolean[] = []
    let creates: boolean[] = []
    for (let i = 0; i <= 6; i++) {
        let survival_check: HTMLInputElement = <HTMLInputElement>document.getElementById("survive_" + i.toString())
        let create_check: HTMLInputElement = <HTMLInputElement>document.getElementById("create_" + i.toString())
        survivals.push(survival_check.checked)
        creates.push(create_check.checked)
    }

    for (let i: number = 0; i < y_max; i++) {
        for (let j: number = 0; j < x_max; j++) {
            let sum: number = get_nb_count(i, j)

            if (cells[i][j]) {
                if (survivals[sum]) {
                    next_cells[i][j] = 1
                }
            } else {
                if (creates[sum]) {
                    next_cells[i][j] = 1
                }
            }
        }
    }

    cells = next_cells;
}


function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    evolve()
    drawHexGrid(ctx, x_max, y_max, hex_radius, (col: number, row: number): string => get_color(col, row));
    to = setTimeout(loop, timeout)
}

export function restart() {
    clear()
    random_start()
    clearTimeout(to)
    loop()
}

function get_color(col: number, row: number) {
    if (cells[col][row] == 1) {
        return 'grey'
    } else {
        return 'black'
    }
}

restart()