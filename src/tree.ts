let canvas: HTMLCanvasElement = document.getElementById('tree') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");

let left_vec: number[] = [0.88, -0.26]
let right_vec: number[] = [0.75, 0.4]
let root: number[] = [400, 400]
let main_branch: number[] = [0, -60]
let aspect_ratio: number = 0.15
let level_min: number = 0
let level_max: number = 16;
let level: number = 10

function add(x: number[], y: number[]): number[] {
    return [x[0] + y[0], x[1] + y[1]]
}

function times(x: number[], y: number[]): number[] {
    return [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]]
}

function scale(x: number[], s: number): number[] {
    return [x[0] * s, x[1] * s]
}

function fork(start: number[], dir: number[], cnt: number, left: boolean) {
    if (cnt == 0) {
        return
    }
    draw(start, dir, cnt, left)
    let dir_left: number[] = times(left_vec, dir)
    let dir_right: number[] = times(right_vec, dir)
    fork(add(dir_left, start), dir_left, cnt - 1, true)
    fork(add(dir_right, start), dir_right, cnt - 1, false)
}

function draw(start: number[], dir: number[], cnt: number, left: boolean) {
    let half_y: number[] = scale(dir, 0.45)
    let half_x: number[] = scale(times([0, 1], half_y), aspect_ratio)
    let top_left: number[] = add(start, add(half_x, half_y))
    let top_right: number[] = add(top_left, scale(half_x, -2))
    let bottom_left: number[] = add(top_left, scale(half_y, -2))
    let bottom_right: number[] = add(scale(top_left, -1), add(bottom_left, top_right))


    if (left) {
        context.fillStyle = 'red';
    } else {
        context.fillStyle = 'black';
    }

    context.beginPath()
    context.moveTo(top_left[0], top_left[1])
    context.lineTo(top_right[0], top_right[1])
    context.lineTo(bottom_right[0], bottom_right[1])
    context.lineTo(bottom_left[0], bottom_left[1])
    context.fill()
}

function draw_tree(){
    context.clearRect(0, 0, canvas.width, canvas.height);
    fork(root, main_branch, level, true)
    level_up()
    setTimeout(draw_tree, 1000)
}

function level_up(){
    level = level + 1
    if(level == level_max){
        level = level_min
    }
}

draw_tree()