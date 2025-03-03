let canvas: HTMLCanvasElement = document.getElementById('space_filling_canvas') as
    HTMLCanvasElement;
let head_span: HTMLSpanElement = document.getElementById("head_span") as HTMLSpanElement
let context: CanvasRenderingContext2D = canvas.getContext("2d");

let to: number = 0

function draw_square(start: number[], end: number[], level: number) {
    let x0: number = start[0]
    let y0: number = start[1]
    let x1: number = end[0]
    let y1: number = end[1]
    if (level == 1) {
        // last iteration
        if (line_cnt <= box_idx) {
            context.beginPath();
            let major: boolean = (x0 - x1) * (y0 - y1) > 0
            if (major) {
                context.strokeStyle = context.createLinearGradient(x0, y0, x1, y1);
                context.strokeStyle.addColorStop(0, "yellow")
                context.strokeStyle.addColorStop(1, "red")
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
            } else {
                context.strokeStyle = context.createLinearGradient(x0, y0, x1, y1);
                context.strokeStyle.addColorStop(0, "blue")
                context.strokeStyle.addColorStop(1, "green")
                context.moveTo(x0, y0);
                context.lineTo(x1, y1);
            }
            context.stroke()
        }
        line_cnt += 1
        if (line_cnt >= Math.pow(9, lvl - 1)) {
            line_cnt = 0
        }
    } else {
        let diff_x: number = (x1 - x0) / 3
        let diff_y: number = (y1 - y0) / 3
        draw_square([x0, y0], [x0 + diff_x, y0 + diff_y], level - 1)
        draw_square([x0 + diff_x, y0 + diff_y], [x0, y1 - diff_y], level - 1)
        draw_square([x0, y1 - diff_y], [x0 + diff_x, y1], level - 1)
        draw_square([x0 + diff_x, y1], [x1 - diff_x, y1 - diff_y], level - 1)
        draw_square([x1 - diff_x, y1 - diff_y], [x0 + diff_x, y0 + diff_y], level - 1)
        draw_square([x0 + diff_x, y0 + diff_y], [x1 - diff_x, y0], level - 1)
        draw_square([x1 - diff_x, y0], [x1, y0 + diff_y], level - 1)
        draw_square([x1, y0 + diff_y], [x1 - diff_x, y1 - diff_y], level - 1)
        draw_square([x1 - diff_x, y1 - diff_y], [x1, y1], level - 1)
    }
}

let lvl: number = 3

function increment() {
    lvl += 1
    restart()
}

function decrement() {
    if (lvl > 1) {
        lvl -= 1
    }
    restart()
}

let line_cnt: number = 0

function draw() {
    context.fillStyle = "black"
    context.fillRect(0, 0, canvas.width, canvas.width)
    line_cnt = 0
    draw_square([0, 0], [canvas.width, canvas.width], lvl)
}

let timeout: number = 100
let box_idx = 0

function loop() {
    draw()
    box_idx += 1
    if (box_idx >= Math.pow(9, lvl - 1)) {
        box_idx = 0
    }
    console.log("box idx " + box_idx.toString())
    to = setTimeout(loop, timeout)
}

function restart() {
    box_idx = 0
    clearTimeout(to)
    loop()
}

restart()