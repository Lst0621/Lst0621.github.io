console.log("Hello")

function draw_canvas() {
    let canvas: HTMLCanvasElement = document.getElementById('canvas_id_untitled') as
        HTMLCanvasElement;
    let context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "lightgreen";
    context.fillRect(30, 30, 100, 100)
}

draw_canvas()