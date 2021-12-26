let canvas: HTMLCanvasElement = document.getElementById('canvas1') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");

let width: number = canvas.width
let half_width: number = width / 2

function gcd(a: number, b: number) {
    if (a == b) {
        return a
    }

    if (a > b) {
        return gcd(b, a)
    }

    // a<b
    if (b % a == 0) {
        return a
    }

    return gcd(b % a, a)
}

function get_x(R: number, r: number, d: number, theta: number, delta: number) {
    let x: number = (R - r) * Math.cos(theta + delta) + d * Math.cos((R - r) / r * theta + delta)
    return x
}

function get_y(R: number, r: number, d: number, theta: number, delta: number) {
    let y: number = (R - r) * Math.sin(theta + delta) - d * Math.sin((R - r) / r * theta + delta)
    return y
}

function get_dp(R: number, r: number, d: number, delta: number, round: number, count: number) {
    let dp_x: Array<number> = []
    let dp_y: Array<number> = []
    for (let i = 0; i < count; i++) {
        let theta: number = round * 2 * Math.PI / count * i
        dp_x.push(get_x(R, r, d, theta, delta))
        dp_y.push(get_y(R, r, d, theta, delta))
    }
    let coordinates: Array<Array<number>> = []
    coordinates.push(dp_x)
    coordinates.push(dp_y)
    return coordinates
}

function draw(R: number, r_R_ratio_a: number, r_R_ratio_b: number, d_R_ratio: number, delta: number) {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    console.log("draw ", R, r_R_ratio_a, r_R_ratio_b, d_R_ratio)
    let r_R_ratio: number = r_R_ratio_a / r_R_ratio_b
    let round: number = r_R_ratio_b / gcd(r_R_ratio_a, r_R_ratio_b)
    console.log("round " + round)
    let r: number = R * r_R_ratio
    let d: number = R * d_R_ratio
    let count_per_round: number = 100
    let total_count: number = count_per_round * round
    let cords: Array<Array<number>> = get_dp(R, r, d, delta, round, total_count)
    for (let i = 0; i + 1 < total_count; i++) {
        let x_start: number = cords[0][i]
        let y_start: number = cords[1][i]
        let x_end: number = cords[0][i + 1]
        let y_end: number = cords[1][i + 1]
        context.strokeStyle = "#856f45"
        context.beginPath();
        context.moveTo(half_width + x_start, half_width + y_start);
        context.lineTo(half_width + x_end, half_width + y_end);
        context.stroke()
    }
}

function get_int(element_id: string) {
    return parseInt((document.getElementById(element_id) as HTMLInputElement).value)
}

function get_float(element_id: string) {
    return parseFloat((document.getElementById(element_id) as HTMLInputElement).value)
}

function update() {
    let R: number = 100
    let r_R_ratio_a: number = get_int("r_R_ratio_a")
    let r_R_ratio_b: number = get_int("r_R_ratio_b")
    let d_R_ratio: number = get_float("d_R_ratio")
    draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, 0)
}


draw(100, 32, 100, 1, 0)
