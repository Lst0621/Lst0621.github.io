let canvas: HTMLCanvasElement = document.getElementById('space_filling_canvas') as
    HTMLCanvasElement;
let head_span: HTMLSpanElement = document.getElementById("head_span") as HTMLSpanElement
let context: CanvasRenderingContext2D = canvas.getContext("2d");


function draw_square(x: number, y: number, width: number, level: number, positive: boolean, major: boolean) {
    if (level == 1) {
        // last iteration
        context.beginPath();
        if (major) {
            context.strokeStyle = "yellow"
            if (positive) {
                context.strokeStyle = context.createLinearGradient(x, y, x + width, y + width);
            } else {
                context.strokeStyle = context.createLinearGradient(x + width, y + width, x, y);
            }
            context.strokeStyle.addColorStop(0, "yellow")
            context.strokeStyle.addColorStop(1, "red")
            context.moveTo(x, y);
            context.lineTo(x + width, y + width);
        } else {
            context.strokeStyle = "green"
            if (positive) {
                context.strokeStyle = context.createLinearGradient(x + width, y, x, y + width);
            } else {
                context.strokeStyle = context.createLinearGradient(x, y + width, x + width, y);
            }
            context.strokeStyle.addColorStop(0, "blue")
            context.strokeStyle.addColorStop(1, "green")
            context.moveTo(x + width, y)
            context.lineTo(x, y + width);
        }
        context.stroke()
        return
    }

    let split: number = 3
    let next_width = width / split
    for (let i = 0; i < split; i++) {
        for (let j = 0; j < split; j++) {
            draw_square(x + i * next_width, y + j * next_width, next_width,
                level - 1, j % 2 == 0 ? positive : !positive, (i + j) % 2 == 0 ? major : !major);

        }
    }
}

let lvl: number = 4

function increment() {
    lvl += 1
    draw()
}

function decrement() {
    if (lvl > 1) {
        lvl -= 1
    }
    draw()
}

function draw() {
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.width)
    draw_square(0, 0, canvas.width, lvl, true, true)
}

draw()