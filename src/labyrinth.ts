let canvas: HTMLCanvasElement = document.getElementById('lab') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");
let cells: Array<Array<number>> = []
let len: number = 20
let width: number = canvas.width
let scale: number = width / len

function init() {
    cells = []
    for (let i: number = 0; i < len; i++) {
        cells.push(new Array<number>())
        for (let j: number = 0; j < len; j++) {
            cells[i].push(0)
        }
    }
}

init()
for (let i: number = 0; i < len; i++) {
    for (let j: number = 0; j < len; j++) {
        context.beginPath();
        context.moveTo(i * scale, j * scale);
        context.lineTo(i * scale + scale-1, j * scale + scale-1);
        context.stroke();
    }
}


let mouse_on_canvs: boolean = false
let grid_x = 0
let grid_y = 0
canvas.addEventListener('mousemove', e => {
    let mouse_x = e.offsetX
    let mouse_y = e.offsetY
    let new_grid_x: number = Math.floor(mouse_x / scale)
    let new_grid_y: number = Math.floor(mouse_y / scale)
    if (grid_x != new_grid_x || grid_y != new_grid_y) {
        grid_x = new_grid_x
        grid_y = new_grid_y
        cells[grid_x][grid_y] = 1 - cells[grid_x][grid_y]

        context.fillStyle = '#ffffff';
        context.fillRect(grid_x * scale, grid_y * scale, scale, scale);

        context.beginPath();
        if (cells[grid_x][grid_y] == 1) {
            context.moveTo(grid_x * scale + scale-1, grid_y * scale);
            context.lineTo(grid_x * scale, grid_y * scale + scale-1);
        } else {
            context.moveTo(grid_x * scale, grid_y * scale);
            context.lineTo(grid_x * scale + scale-1, grid_y * scale + scale-1);
        }
        context.strokeStyle = '#000000';
        context.stroke();
    }
})
canvas.addEventListener('mouseleave', e => {
    grid_x = -1
    grid_y = -1
})
canvas.addEventListener('mouseenter', e => {
    mouse_on_canvs = true
})
