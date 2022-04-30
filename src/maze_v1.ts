let canvas: HTMLCanvasElement = document.getElementById('maze1') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");

let cells: Array<Array<number>> = []
let dirs: Array<Array<number>> = [[-1, 0], [1, 0], [0, 1], [0, -1]]
let len: number = 100
let width: number = canvas.width
let scale: number = width / len

function clear() {
    cells = []
    for (let i: number = 0; i < len; i++) {
        cells.push(new Array<number>())
        for (let j: number = 0; j < len; j++) {
            cells[i].push(0)
        }
    }
}

let fg = '#8A6BBE'
let bg = '#B28FCE'

function set_dot(x: number, y: number): void {
    console.log("visit " + x + " " + y)
    context.fillStyle = fg;
    context.fillRect(x * scale, y * scale, scale, scale);
    cells[x][y] = 1
}

function has_visit(x: number, y: number): boolean {
    return cells[x][y] == 1
}

function location_valid(x: number, y: number): boolean {
    return x >= 0 && x < len && y >= 0 && y < len;
}

function shall_visit(time_on_dir: number, from_last_turn: number, same_dir: boolean) {
    let r: number = Math.random()
    if (same_dir) {
        return r < Math.max(1 - time_on_dir / 100, 0.88)
    } else {
        return r < Math.max(0.13, 0.005 + from_last_turn / 1000)
    }
}

let idx: number = 0
let points = []

function process() {
    points = []
    // location, dir, time on dir, from last turn
    let num_start_point = 12
    for (let _: number = 0; _ < num_start_point; _++) {
        let x = Math.floor(Math.random() * len)
        let y = Math.floor(Math.random() * len)
        if (has_visit(x, y)) {
            _--
            continue
        }
        set_dot(x, y)
        points.push([[x, y], Math.floor(Math.random() * 4), 0, 0])
    }

    idx = 0
    step()
}

function step() {
    let points_left = points.length
    while (idx < points_left) {
        let foo = points[idx]
        let location = foo[0]
        let x: number = location[0]
        let y: number = location[1]
        let dir = foo[1]
        let time_on_dir = foo[2]
        let from_last_turn = foo[3]
        let has_turned = false
        for (let dir_delta of [-1, 1, 0]) {
            let next_dir: number = (dir + dir_delta + 4) % 4
            let next_x: number = x + dirs[next_dir][0]
            let next_y: number = y + dirs[next_dir][1]
            if (!location_valid(next_x, next_y)) {
                continue
            }
            if (has_visit(next_x, next_y)) {
                continue
            }
            let same_dir: boolean = dir_delta == 0
            if (shall_visit(time_on_dir, from_last_turn, same_dir)) {
                if (!same_dir) {
                    has_turned = true
                }
                set_dot(next_x, next_y)
                points.push([[next_x, next_y], next_dir, same_dir ? time_on_dir + 1 : 0, same_dir ? (has_turned ? 0 : from_last_turn + 1) : 0])
            }
        }
        idx++
    }
    if (idx < points.length) {
        setTimeout(step, 30)
        // step()
    }
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    let live_cnt: number = 0
    let void_cnt: number = 0
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            if (cells[i][j] == 1) {
                context.fillStyle = fg;
                context.fillRect(i * scale, j * scale, scale, scale);
                live_cnt++
            } else {
                context.fillStyle = bg;
                context.fillRect(i * scale, j * scale, scale, scale);
                void_cnt++
            }
        }
    }
}

function restart() {
    clear()
    draw()
    process()
    draw()
}

restart()