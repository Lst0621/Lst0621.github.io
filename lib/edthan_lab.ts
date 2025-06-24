let step: number = 500
let s_para = 30

export function draw_ethan_lab() {
    let s = s_para / 100
    let canvas: HTMLCanvasElement = document.getElementById('canvas_lab') as
        HTMLCanvasElement;
    let context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    let lab_text = document.getElementById("lab_text") as HTMLSpanElement

    context.clearRect(0, 0, canvas.width, canvas.height);

    let x_max = get_x_limit(s)
    let y_max = x_max

    let step_size: number = x_max / step
    let locations: number[][] = []
    for (let i = 0; i < step; i++) {
        let x = i * step_size;
        let y = get_y(x, s)
        y_max = Math.max(y_max, y)
        locations.push([x, y])
    }
    locations.push([x_max, get_y(x_max, s)])
    for (let i = 0; i < step; i++) {
        let x = locations[step - 1 - i][0]
        let y = locations[step - 1 - i][1]
        locations.push([y, x])
    }
    let factor: number = 400

    console.log(locations)

    context.beginPath();
    context.moveTo(factor * locations[0][0], canvas.height - factor * locations[0][1])
    for (let i = 1; i < locations.length; i++) {
        context.lineTo(factor * locations[i][0], canvas.height - factor * locations[i][1])
    }
    context.stroke()

    lab_text.innerText = "s=" + s.toString() + ",0<=x<=" + x_max.toString()
}

function get_x_limit(s: number) {
    return (1 + Math.sqrt(s)) / 2
}

function get_y(x: number, s: number) {
    return Math.pow((Math.sqrt(s * x) + Math.sqrt((1 - s) * (1 - x))), 2)
}

export function increment(sz: number) {
    if (s_para < 100) {
        s_para += 5
    }
    draw_ethan_lab()
}

export function decrement(sz: number) {
    if (s_para > 0) {
        s_para -= 5
    }
    draw_ethan_lab()
}