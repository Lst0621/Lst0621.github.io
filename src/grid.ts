let canvas: HTMLCanvasElement = document.getElementById('grid') as
    HTMLCanvasElement;
let head_span: HTMLSpanElement = document.getElementById("head_span") as HTMLSpanElement
let context: CanvasRenderingContext2D = canvas.getContext("2d");
let positions: Array<Array<Array<number>>> = []
let len: number = 15
let width: number = canvas.width
let timeout: number = 20
let gen: number = 0
let to = 0


function get_random_pos(): number {
    return 1.8 * (Math.random()-0.5) * width
}

let PERSPECTIVE = width * 1
function start(): void {
    for (let i: number = 0; i < len; i++) {
        positions.push(new Array<Array<number>>())
        for (let j: number = 0; j < len; j++) {
            positions[i].push(new Array<number>())
            // 3d
            positions[i][j].push(get_random_pos())
            positions[i][j].push(get_random_pos())
            positions[i][j].push(get_random_pos() )
            console.log(positions[i][j])
        }
    }
}

let PROJECTION_CENTER_X = width / 2; // x center of the canvas
let PROJECTION_CENTER_Y = width / 2; // y center of the canvas
function draw(): void {
    head_span.innerText = "Evolution of 2D Grid in 3D gen: " + gen
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let i: number = 0; i < len; i++) {
        for (let j: number = 0; j < len; j++) {
            let x: number = positions[i][j][0]
            let y: number = positions[i][j][1]
            let z: number = positions[i][j][2]
            let radius = 3
            let scaleProjected = PERSPECTIVE / (PERSPECTIVE + z);
            // The xProjected is the x position on the 2D world
            let xProjected = (x * scaleProjected) + PROJECTION_CENTER_X
            // The yProjected is the y position on the 2D world
            let yProjected = (y * scaleProjected) + PROJECTION_CENTER_Y
            // context.fillRect(xProjected - radius, yProjected - radius, radius * 2 * scaleProjected, radius * 2 * scaleProjected);
            context.fillRect(xProjected - radius * scaleProjected, yProjected - radius * scaleProjected,
                radius * 2 * scaleProjected, radius * 2 * scaleProjected);
            draw_edge(positions[i][j], positions[i][get_mod_idx(j + 1)], 'darkblue')
            draw_edge(positions[i][j], positions[get_mod_idx(i + 1)][j], 'darkgreen')
        }
    }
}

function draw_edge(a:Array<number>, b:Array<number>, stl:string) {
    let x0: number = a[0]
    let y0: number = a[1]
    let z0: number = a[2]
    let x1: number = b[0]
    let y1: number = b[1]
    let z1: number = b[2]
    let scaleProjected0 = PERSPECTIVE / (PERSPECTIVE + z0);
    let xProjected0 = (x0 * scaleProjected0) + PROJECTION_CENTER_X
    let yProjected0 = (y0 * scaleProjected0) + PROJECTION_CENTER_Y
    let scaleProjected1 = PERSPECTIVE / (PERSPECTIVE + z1);
    let xProjected1 = (x1 * scaleProjected1) + PROJECTION_CENTER_X
    let yProjected1 = (y1 * scaleProjected1) + PROJECTION_CENTER_Y
    context.strokeStyle=stl
    context.beginPath();
    context.moveTo(xProjected0, yProjected0);
    context.lineTo(xProjected1,yProjected1)
    context.stroke()
}


function get_mod_idx(x: number) {
    if (x < 0) {
        return x + len
    }
    if (x >= len) {
        return x - len
    }
    return x
}


function get_next_pos(pos: Array<number>, nbs: Array<Array<number>>) {
    let shift = [0,0,0]
    let push_factor = 0
    let pull_factor = 0
    let pp_ratio = 0
    pull_factor = 0.0001
    pp_ratio = 1100 * 500
    push_factor = pull_factor * pp_ratio

    for (let i: number = 0; i < nbs.length; i++) {
        let nb = nbs[i]
        let d = [pos[0] - nb[0], pos[1] - nb[1], pos[2] - nb[2]]
        let dist = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2] + 0.0000001)

        let push = push_factor/dist/dist
        let pull = pull_factor * dist
        let increase = 3
        let decrease = 1.5
        let g = Math.floor(gen / 5000) % 2
        if (g == 0 && i == 0 || g == 1 && i == 2) {
            push *= increase * increase * increase
            pull /= decrease * decrease * decrease
        } else {
            pull *= increase * increase * increase
            push /= decrease * decrease * decrease
        }
        shift[0] += d[0] / dist * (push - pull)
        shift[1] += d[1] / dist * (push - pull)
        shift[2] += d[2] / dist * (push - pull)
    }
    return [pos[0]+ shift[0], pos[1]+shift[1], pos[2]+shift[2]]
}





function evolve() {
    gen += 1
    let next_positions: Array<Array<Array<number>>> = []
    for (let i: number = 0; i < len; i++) {
        next_positions.push(new Array<Array<number>>())
        for (let j: number = 0; j < len; j++) {
            next_positions[i].push(new Array<number>())
            let current_pos = positions[i][j]
            let nbs = [
                positions[get_mod_idx(i - 1)][get_mod_idx(j + 0)],
                positions[get_mod_idx(i + 0)][get_mod_idx(j + 1)],
                positions[get_mod_idx(i + 1)][get_mod_idx(j + 0)],
                positions[get_mod_idx(i + 0)][get_mod_idx(j - 1)],

                // positions[get_mod_idx(i - 1)][get_mod_idx(j - 1)],
                // positions[get_mod_idx(i - 1)][get_mod_idx(j + 1)],
                // positions[get_mod_idx(i + 1)][get_mod_idx(j - 1)],
                // positions[get_mod_idx(i + 1)][get_mod_idx(j + 1)],
            ]
            next_positions[i][j] = get_next_pos(current_pos,nbs)
        }
    }
    positions = next_positions
}

function loop() {
    draw()
    let k = 50
    for(let i:number =0;i<k;i++) {
        evolve()
    }
    to = setTimeout(loop, timeout)
}

start()
loop()