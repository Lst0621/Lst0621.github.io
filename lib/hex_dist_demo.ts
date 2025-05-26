import {drawHexGrid, hex_dist} from "./hex.js"

let canvas: HTMLCanvasElement = document.getElementById('hexCanvas') as
    HTMLCanvasElement;
let ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;


let to: number = 0
let x: number = 15
let y: number = 10
let x_max = 34
let y_max = 40

function loop() {
    if (!paused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        x += Math.floor(Math.random() * 4 - 2)
        y += Math.floor(Math.random() * 4 - 2)
        if (x < 0) {
            x += x_max
        }
        if (y < 0) {
            y += y_max
        }
        x = x % x_max
        y = y % y_max
        console.log(x, y)
        drawHexGrid(ctx, x_max, y_max, 10, (col: number, row: number): string => get_color(x, y, col, row));
    }

    let timeout: number = 300
    to = setTimeout(loop, timeout)
}

function restart() {
    clearTimeout(to)
    loop()
}

function get_color(center_x: number, center_y: number, col: number, row: number) {
    const dist = hex_dist([center_x, center_y], [col, row])
    const dist_mod = dist % 7
    const color: string = dist_mod == 0 ?
        "red" : dist_mod == 1 ?
            "orange" : dist_mod == 2 ? "yellow" : dist_mod == 3 ? "green" : dist_mod == 4 ? "blue" : dist_mod == 5 ? "darkblue" : "purple"
    return color
}

let paused: boolean = false

export function pause() {
    paused = !paused
}

function start() {
    document.getElementById("pause")?.addEventListener('click', pause)
    restart()
}

start()