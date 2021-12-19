let canvas: HTMLCanvasElement = document.getElementById('lab') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");
let cells: Array<Array<number>> = []
let len: number = 16
let width: number = canvas.width
let scale: number = width / len

let bg: string = '#77428D';
let fg: string = '#E03C8A';
let mouse_on_canvas: boolean = false
let grid_x: number = -1
let grid_y: number = -1

function init() {
    context.fillStyle = bg;
    cells = []
    for (let i: number = 0; i < len; i++) {
        cells.push(new Array<number>())
        for (let j: number = 0; j < len; j++) {
            cells[i].push(1)
            draw_diagonal(i, j)
        }
    }
}

function coor_legal(x: number) {
    return (x >= 0 && x < len)
}

function draw_diagonal(x: number, y: number) {
    if (!coor_legal(x) || !coor_legal(y)) {
        return
    }

    context.fillStyle = bg;
    context.fillRect(x * scale, y * scale, scale, scale);
    context.beginPath();
    if (cells[x][y]) {
        context.moveTo(x * scale, y * scale);
        context.lineTo(x * scale + scale, y * scale + scale);
    } else {
        context.moveTo(x * scale + scale, y * scale);
        context.lineTo(x * scale, y * scale + scale);
    }
    context.strokeStyle = fg
    context.stroke();
}


init()
let diffs: Array<number> = [-1, 0, 1]
canvas.addEventListener('mousemove', e => {
        let mouse_x = e.offsetX
        let mouse_y = e.offsetY
        let new_grid_x: number = Math.floor(mouse_x / scale)
        let new_grid_y: number = Math.floor(mouse_y / scale)
        if (grid_x != new_grid_x || grid_y != new_grid_y) {
            grid_x = new_grid_x
            grid_y = new_grid_y
            cells[grid_x][grid_y] = 1 - cells[grid_x][grid_y]
            for (let dx of diffs) {
                for (let dy of diffs) {
                    draw_diagonal(grid_x + dx, grid_y + dy)
                }
            }
        }
    }
)

canvas.addEventListener('mouseleave', e => {
    grid_x = -1
    grid_y = -1
    mouse_on_canvas = false
})
canvas.addEventListener('mouseenter', e => {
    mouse_on_canvas = true
})
