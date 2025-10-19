import { add_mod_n, add_inverse_mod_n } from "../tsl/math/number.js";
import { create_2d_array, random_fill } from "../tsl/util.js";
// Create player image element
const playerImage = new Image();
playerImage.src = 'https://media.tenor.com/fXVhjC7EAOAAAAAi/the-binding-of-isaac.gif';
playerImage.id = 'player-image';
playerImage.style.position = 'absolute';
playerImage.style.pointerEvents = 'none';
playerImage.style.zIndex = '1000';
// Simplified approach to add image to DOM
window.addEventListener('load', () => {
    const canvas = document.getElementById('lamp_lighter_canvas');
    if (!canvas)
        return;
    if (canvas && canvas.parentNode) {
        // Create a wrapper div that will contain both the canvas and the image
        const wrapper = document.createElement('div');
        wrapper.id = 'game-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = canvas.width + 'px';
        wrapper.style.height = canvas.height + 'px';
        // Replace canvas with wrapper and move canvas inside it
        canvas.parentNode.replaceChild(wrapper, canvas);
        wrapper.appendChild(canvas);
        wrapper.appendChild(playerImage);
        // Canvas should fill the wrapper
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        // Initial position
        updatePlayerImagePosition();
    }
});
class LampLighterGame {
    constructor(map_size = 7) {
        this.map_size = map_size;
        this.lamp_status = create_2d_array(map_size, map_size, 0);
        this.current_location = [0, 0];
        this.target_location = [0, 0];
        this.total_key_count = 0;
    }
    init() {
        this.lamp_status = random_fill(this.lamp_status, 0.3);
        this.current_location = [3, 3];
        this.target_location = [1, 4];
        this.lamp_status[3][4] = 1;
    }
    static getDirectionDelta(key, map_size) {
        switch (key) {
            case 'w': // up
                return [add_inverse_mod_n(1, map_size), 0];
            case 's': // down
                return [1, 0];
            case 'a': // left
                return [0, add_inverse_mod_n(1, map_size)];
            case 'd': // right
                return [0, 1];
            default:
                return [0, 0];
        }
    }
    move(direction) {
        let [row, col] = this.current_location;
        const [diff_row, diff_col] = LampLighterGame.getDirectionDelta(direction, this.map_size);
        row = add_mod_n(row, diff_row, this.map_size);
        col = add_mod_n(col, diff_col, this.map_size);
        this.current_location = [row, col];
    }
    toggleLamp() {
        let [row, col] = this.current_location;
        this.lamp_status[row][col] = this.lamp_status[row][col] === 1 ? 0 : 1;
    }
    incrementTotalKeyCount() {
        this.total_key_count++;
    }
    getTotalKeyCount() {
        return this.total_key_count;
    }
}
let game = new LampLighterGame();
game.init();
function update_lamp_lighter_counter() {
    let counterElem = document.getElementById('lamp_lighter_counter');
    if (counterElem) {
        let lights_on = game.lamp_status
            .map(row => row.reduce((a, b) => a + b, 0))
            .reduce((a, b) => a + b, 0);
        counterElem.textContent = `Total moves: ${game.getTotalKeyCount()} | Lamps on: ${lights_on}`;
    }
}
function updatePlayerImagePosition() {
    const canvas = document.getElementById('lamp_lighter_canvas');
    if (!canvas)
        return;
    const cell_width = Math.floor(canvas.width / game.map_size);
    // Position the player image at the current location
    playerImage.style.width = `${cell_width}px`;
    playerImage.style.height = `${cell_width}px`;
    playerImage.style.top = `${game.current_location[0] * cell_width}px`;
    playerImage.style.left = `${game.current_location[1] * cell_width}px`;
    console.log(`Player positioned at ${playerImage.style.left}, ${playerImage.style.top}`);
}
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
    // Instead of drawing to canvas, update the position of the image element
    updatePlayerImagePosition();
}
// Make sure to redraw when image loads
// playerImage.onload = () => {
//     draw_lamp_lighter_canvas();
// };
draw_lamp_lighter_canvas();
update_lamp_lighter_counter();
// Add keyboard event listener
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        game.move(key);
        game.incrementTotalKeyCount();
        draw_lamp_lighter_canvas();
        update_lamp_lighter_counter();
        event.preventDefault(); // Prevent default scrolling behavior
    }
    else if (key === 't') {
        game.toggleLamp();
        game.incrementTotalKeyCount();
        draw_lamp_lighter_canvas();
        update_lamp_lighter_counter();
        event.preventDefault();
    }
});
