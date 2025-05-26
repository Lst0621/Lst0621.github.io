import {drawHexGrid, hex_dist} from "./hex.js"

let canvas: HTMLCanvasElement = document.getElementById('hexCanvas') as
    HTMLCanvasElement;
let ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;


let to: number = 0
let x_max = 17
let y_max = 20
let cells: Array<Array<number>> = []
let thres: number = 0.2
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

    for (let i: number = 0; i < y_max; i++) {
        for (let j: number = 0; j < x_max; j++) {
            let sum: number = get_nb_count(i, j)
            if ((cells[i][j] == 1 && sum == 2) || sum == 2) {
                next_cells[i][j] = 1
            }

            if (cells[i][j]) {
                let survival_check: HTMLInputElement = <HTMLInputElement>document.getElementById("survive_" + sum.toString())
                if (survival_check.checked) {
                    next_cells[i][j] = 1
                }
            } else {
                let create_check: HTMLInputElement = <HTMLInputElement>document.getElementById("create_" + sum.toString())
                if (create_check.checked) {
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
    drawHexGrid(ctx, x_max, y_max, (col: number, row: number): string => get_color(col, row));
    let timeout: number = 200
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