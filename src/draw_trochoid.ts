let canvas: HTMLCanvasElement = document.getElementById('canvas1') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");
let clear_prev_element: HTMLInputElement = <HTMLInputElement>document.getElementById("clear_prev");
let animation_element: HTMLInputElement = <HTMLInputElement>document.getElementById("animation");
let animation: boolean = animation_element.checked
let clear_prev: boolean = clear_prev_element.checked
let count_per_round: number = get_int("count_per_round")

let width: number = canvas.width
let half_width: number = width / 2
let R: number = 100
let r_R_ratio_a: number = get_int("r_R_ratio_a")
let r_R_ratio_b: number = get_int("r_R_ratio_b")
let d_R_ratio: number = get_float("d_R_ratio")
let rotate: number = get_float("rotate") / 360 * 2 * Math.PI

let timeout: number = 50
let call_back_id: number = 0

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

function get_moving_circle_center_x(R: number, r: number, theta: number, delta: number) {
    return (R - r) * Math.cos(theta + delta)
}

function get_moving_circle_center_y(R: number, r: number, theta: number, delta: number) {
    return (R - r) * Math.sin(theta + delta)
}

function get_x(R: number, r: number, d: number, theta: number, delta: number) {
    return get_moving_circle_center_x(R, r, theta, delta) + d * Math.cos((R - r) / r * theta + delta)
}

function get_y(R: number, r: number, d: number, theta: number, delta: number) {
    return get_moving_circle_center_y(R, r, theta, delta) - d * Math.sin((R - r) / r * theta + delta)
}

let dp_map: { [key: string]: Array<Array<number>>; } = {}

function get_dp(R: number, r: number, d: number, delta: number, round: number, count: number) {
    let key: string = R.toString() + " " + r.toString() + " " + d.toString() +
        " " + delta.toString() + " " + round.toString() + " " + count.toString()

    if (key in dp_map) {
        return dp_map[key]
    }

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
    dp_map[key] = coordinates
    return coordinates
}

function clear_canvas() {
    context.fillRect(0, 0, canvas.width, canvas.height);
}

function draw(R: number, r_R_ratio_a: number, r_R_ratio_b: number, d_R_ratio: number, delta: number) {
    console.log("draw ", R, r_R_ratio_a, r_R_ratio_b, d_R_ratio)
    let r_R_ratio: number = r_R_ratio_a / r_R_ratio_b
    let round: number = r_R_ratio_b / gcd(r_R_ratio_a, r_R_ratio_b)
    console.log("round " + round)
    let r: number = R * r_R_ratio
    let d: number = R * d_R_ratio
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

function draw_animation(theta: number, delta: number) {
    // draw outer
    context.beginPath()
    context.arc(half_width, half_width, R, 0, 2 * Math.PI)
    context.stroke()

    // draw moving center traj
    let r_R_ratio: number = r_R_ratio_a / r_R_ratio_b
    let r: number = R * r_R_ratio

    context.beginPath()
    context.arc(half_width, half_width, R - r, 0, 2 * Math.PI)
    context.stroke()

    // draw moving
    let moving_center_x: number = half_width + get_moving_circle_center_x(R, r, theta, delta)
    let moving_center_y: number = half_width + get_moving_circle_center_y(R, r, theta, delta)

    context.beginPath()
    context.arc(moving_center_x, moving_center_y, r, 0, 2 * Math.PI)
    context.stroke()

    //draw line
    let d: number = R * d_R_ratio
    let trochoid_x: number = half_width + get_x(R, r, d, theta, delta)
    let trochoid_y: number = half_width + get_y(R, r, d, theta, delta)
    context.beginPath()
    context.moveTo(moving_center_x, moving_center_y)
    context.lineTo(trochoid_x, trochoid_y)
    context.stroke()
}

function read_paras() {
    r_R_ratio_a = get_int("r_R_ratio_a")
    r_R_ratio_b = get_int("r_R_ratio_b")
    d_R_ratio = get_float("d_R_ratio")
    rotate = get_float("rotate")
    count_per_round = get_int("count_per_round")
    animation = animation_element.checked
    clear_prev = clear_prev_element.checked
}

function draw_once(theta: number) {
    let animation_enabled: boolean = clear_prev && animation
    if (animation_enabled) {
        clear_canvas()
        draw_animation(theta, rotate)
    }
    draw(R, r_R_ratio_a, r_R_ratio_b, d_R_ratio, rotate)
    if (animation_enabled) {
        let factor: number = 20
        call_back_id = setTimeout(function () {
            draw_once(theta + 2 * Math.PI / factor)
        }, timeout)
    }
}

function update() {
    clearTimeout(call_back_id)
    read_paras()
    if (clear_prev) {
        console.log("clear")
        clear_canvas()
    } else {
        console.log("keep previously drawn")
    }
    draw_once(0)
}

context.fillStyle = "#000000";
clear_canvas()

update()
