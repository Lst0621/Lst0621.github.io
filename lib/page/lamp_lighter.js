"use strict";
class LampLighterGame {
    constructor(map_size = 7) {
        this.map_size = map_size;
        this.lamp_status = Array(map_size).fill(0).map(() => Array(map_size).fill(0));
        this.current_location = [2, 3];
        this.target_location = [3, 4];
        this.lamp_status[3][4] = 1;
    }
    move(direction) {
        let [row, col] = this.current_location;
        switch (direction) {
            case 'w': // up
                row = (row - 1 + this.map_size) % this.map_size;
                break;
            case 's': // down
                row = (row + 1) % this.map_size;
                break;
            case 'a': // left
                col = (col - 1 + this.map_size) % this.map_size;
                break;
            case 'd': // right
                col = (col + 1) % this.map_size;
                break;
        }
        this.current_location = [row, col];
    }
    toggleLamp() {
        let [row, col] = this.current_location;
        this.lamp_status[row][col] = this.lamp_status[row][col] === 1 ? 0 : 1;
    }
}
let game = new LampLighterGame();
function draw_lamp_lighter_canvas() {
    let canvas = document.getElementById('lamp_lighter_canvas');
    let context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    let w = canvas.width;
    let cell_width = Math.floor(w / game.map_size);
    // Draw all cells with regular black boundaries first
    for (let i = 0; i < game.map_size; i++) {
        for (let j = 0; j < game.map_size; j++) {
            if (game.lamp_status[i][j] == 1) {
                context.fillStyle = "yellow";
            }
            else {
                context.fillStyle = "lightgreen";
            }
            context.fillRect(j * cell_width, i * cell_width, cell_width, cell_width);
            context.strokeStyle = "black";
            context.lineWidth = 3;
            context.strokeRect(j * cell_width, i * cell_width, cell_width, cell_width);
        }
    }
    // Draw target location boundary on top
    context.strokeStyle = "blue";
    context.lineWidth = 3;
    context.strokeRect(game.target_location[1] * cell_width, game.target_location[0] * cell_width, cell_width, cell_width);
    // Draw current location boundary on top of everything (highest priority)
    context.strokeStyle = "red";
    context.lineWidth = 3;
    context.strokeRect(game.current_location[1] * cell_width, game.current_location[0] * cell_width, cell_width, cell_width);
}
draw_lamp_lighter_canvas();
// Add keyboard event listener
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        game.move(key);
        draw_lamp_lighter_canvas();
        event.preventDefault(); // Prevent default scrolling behavior
    }
    else if (key === 't') {
        game.toggleLamp();
        draw_lamp_lighter_canvas();
        event.preventDefault();
    }
});
