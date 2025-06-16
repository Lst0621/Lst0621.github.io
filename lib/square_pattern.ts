let canvas: HTMLCanvasElement = document.getElementById('canvas_square_pattern') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

function get_control_point(pos: number[], num_vt: number) {
    let x = pos[0]
    let y = pos[1]
    let randomness = 0.4
    let least_shift = 0.1
    let shift = Math.random() * num_vt * randomness
    if (y == 0 || y == num_vt) {
        return [x, y == 0 ? num_vt * least_shift + shift : (1 - least_shift) * num_vt - shift]
    } else {
        return [x == 0 ? num_vt * least_shift + shift : (1 - least_shift) * num_vt - shift, y]
    }
}

function get_node_pos(n: number) {
    let ret: number[][] = []

    for (let i = 1; i <= n; i++) {
        ret.push([i - 0.5, 0])
        ret.push([n, i - 0.5])
        ret.push([n + 0.5 - i, n])
        ret.push([0, n + 0.5 - i])
    }
    console.log(ret)
    return ret
}

function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}


function draw_square(x: number, y: number, sz: number, num_vt: number, vertices: number[][]) {
    if ((x + y) / sz % 2 == 0) {
        context.fillStyle = "lightyellow"
    } else {
        context.fillStyle = "lightblue"
    }
    context.beginPath();
    context.rect(x, y, sz, sz)
    context.fill();

    for (let i = 0; i < vertices.length; i += 2) {
        let v_x_0 = x + (vertices[i][0]) * sz / num_vt
        let v_y_0 = y + (vertices[i][1]) * sz / num_vt
        let v_x_1 = x + (vertices[i + 1][0]) * sz / num_vt
        let v_y_1 = y + (vertices[i + 1][1]) * sz / num_vt


        context.beginPath();
        context.moveTo(v_x_0, v_y_0)
        let control_0 = get_control_point(vertices[i], num_vt)
        let control_1 = get_control_point(vertices[i + 1], num_vt)
        let v_mid_x_0 = x + control_0[0] * sz / num_vt
        let v_mid_y_0 = y + control_0[1] * sz / num_vt
        let v_mid_x_1 = x + control_1[0] * sz / num_vt
        let v_mid_y_1 = y + control_1[1] * sz / num_vt
        context.bezierCurveTo(v_mid_x_0, v_mid_y_0, v_mid_x_1, v_mid_y_1, v_x_1, v_y_1)
        context.stroke()

        let debug = false
        if (debug) {
            context.strokeStyle = "brown"
            context.beginPath();
            context.moveTo(v_x_0, v_y_0)
            context.lineTo(v_mid_x_0, v_mid_y_0)
            context.stroke()


            context.beginPath();
            context.arc(v_mid_x_0, v_mid_y_0, 4, 0, Math.PI * 2)
            context.stroke()

            context.beginPath();
            context.moveTo(v_x_1, v_y_1)
            context.lineTo(v_mid_x_1, v_mid_y_1)
            context.stroke()

            context.beginPath();
            context.arc(v_mid_x_1, v_mid_y_1, 4, 0, Math.PI * 2)
            context.stroke()
            context.strokeStyle = "black"
        }
    }
}

function is_on_same_side(v1: number[], v2: number[], num_vt: number) {
    if (v1[0] == v2[0] && Math.abs(v1[1] - v2[1]) < num_vt) {
        return true;
    }
    if (v1[1] == v2[1] && Math.abs(v1[0] - v2[0]) < num_vt) {
        return true;
    }
    return false;
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    let num_sq = 10
    let w = canvas.width / num_sq
    let num_vt = 2;
    for (let i = 0; i < num_sq; i++) {
        for (let j = 0; j < num_sq; j++) {
            draw_square(i * w, j * w, w, num_vt, shuffleArray(get_node_pos(num_vt)))
        }
    }
}

(document.getElementById("reset") as HTMLButtonElement).onclick = draw
draw()
