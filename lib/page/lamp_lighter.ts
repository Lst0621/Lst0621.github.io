import {add_mod_n, add_inverse_mod_n} from "../tsl/math/number.js";
import {array_eq} from "../tsl/math/math.js";
import {create_2d_array, random_fill} from "../tsl/util.js";

// Player image container (we will create one img per mirrored visual cell)
const PLAYER_GIF_SRC = 'https://media.tenor.com/fXVhjC7EAOAAAAAi/the-binding-of-isaac.gif';

// Simplified approach to add image to DOM
window.addEventListener('load', () => {
    const canvas = document.getElementById('lamp_lighter_canvas') as HTMLCanvasElement;
    if (!canvas) {
        return;
    }
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

        // container for one or more player images (mirrors)
        const player_container = document.createElement('div');
        player_container.id = 'player-image-container';
        player_container.style.position = 'absolute';
        player_container.style.top = '0';
        player_container.style.left = '0';
        player_container.style.width = '100%';
        player_container.style.height = '100%';
        player_container.style.pointerEvents = 'none';
        player_container.style.zIndex = '1000';
        wrapper.appendChild(player_container);

        // Canvas should fill the wrapper
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';

        // Initial position
        update_player_image_position();
    }
});

class LampLighterGame {
    map_size: number;
    lamp_status: number[][];
    current_location: [number, number];
    target_location: [number, number];
    total_key_count: number;
    is_level_transitioning: boolean;
    level: number; // Track the current level

    constructor(map_size: number = 3) {  // Start with 3x3 grid at level 1
        this.level = 1;
        this.map_size = this.get_level_map_size();  // Set map size based on level
        this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
        this.current_location = [0, 0];
        this.target_location = [0, 0];
        this.total_key_count = 0;
        this.is_level_transitioning = false;
    }

    // Get map size based on level
    get_level_map_size(): number {
        const map_sizes = [3, 5, 7, 11, 13];
        // If level is greater than array length, return the maximum size (13)
        if (this.level > map_sizes.length) {
            return 13;
        }
        // Levels are 1-indexed, so subtract 1 for array access
        return map_sizes[this.level - 1];
    }

    init() {
        // Ensure map_size is correct for level 1
        this.level = 1;
        this.map_size = this.get_level_map_size();
        this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
        let threshold = this.get_level_threshold();

        // Calculate minimum number of lights required
        const total_area = this.map_size * this.map_size;
        const min_lights = Math.ceil(0.5 * threshold * total_area);

        // Generate lamp configuration and check if it meets minimum requirement
        this.lamp_status = random_fill(this.lamp_status, threshold);
        let lit_count = this.count_lit_lights();

        // Keep regenerating until we have enough lit lights
        while (lit_count < min_lights) {
            this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
            this.lamp_status = random_fill(this.lamp_status, threshold);
            lit_count = this.count_lit_lights();
        }

        // Start at a random position within grid bounds
        this.current_location = [
            Math.floor(Math.random() * this.map_size),
            Math.floor(Math.random() * this.map_size)
        ];

        // Generate target location (can be the same as player position)
        this.target_location = [
            Math.floor(Math.random() * this.map_size),
            Math.floor(Math.random() * this.map_size)
        ];

        this.total_key_count = 0;
        this.is_level_transitioning = false;

        render_description();
    }

    // Helper method to count lit lights
    count_lit_lights(): number {
        let lit_count = 0;
        for (let i = 0; i < this.map_size; i++) {
            for (let j = 0; j < this.map_size; j++) {
                if (this.lamp_status[i][j] === 1) {
                    lit_count++;
                }
            }
        }
        return lit_count;
    }

    // Get threshold based on level with linear progression
    get_level_threshold(): number {
        const min_threshold = 0.1;  // Starting threshold at level 1
        const max_threshold = 0.3;  // Maximum threshold at level 7 (hardest)
        const max_level = 7;

        // If level is greater than max_level, maintain max difficulty
        if (this.level >= max_level) {
            return max_threshold;
        }

        // Linear progression from min_threshold to max_threshold
        return min_threshold + (max_threshold - min_threshold) * (this.level - 1) / (max_level - 1);
    }

    static get_direction_delta(key: string, map_size: number): [number, number] {
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

    move(direction: 'w' | 'a' | 's' | 'd') {
        let [row, col] = this.current_location;
        const [diff_row, diff_col] = LampLighterGame.get_direction_delta(direction, this.map_size);
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

    check_win_condition(): boolean {
        // Check if player is at target location
        if (!array_eq(this.current_location, this.target_location)) {
            return false;
        }

        // Check if all lights are off
        for (let i = 0; i < this.map_size; i++) {
            for (let j = 0; j < this.map_size; j++) {
                if (this.lamp_status[i][j] === 1) {
                    return false;
                }
            }
        }

        return true;
    }

    restart() {
        this.is_level_transitioning = true;

        // Increment level when restarting after a win
        this.level += 1;

        // Update map size based on new level
        this.map_size = this.get_level_map_size();

        // Generate new random lamp configuration with minimum light requirement
        let threshold = this.get_level_threshold();

        // Calculate minimum number of lights required
        const total_area = this.map_size * this.map_size;
        const min_lights = Math.ceil(0.5 * threshold * total_area);

        // Generate lamp configuration and check if it meets minimum requirement
        this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
        this.lamp_status = random_fill(this.lamp_status, threshold);
        let lit_count = this.count_lit_lights();

        // Keep regenerating until we have enough lit lights
        while (lit_count < min_lights) {
            this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
            this.lamp_status = random_fill(this.lamp_status, threshold);
            lit_count = this.count_lit_lights();
        }

        // Start at a new random position within grid bounds
        this.current_location = [
            Math.floor(Math.random() * this.map_size),
            Math.floor(Math.random() * this.map_size)
        ];

        // Generate new target location (can be the same as player position)
        this.target_location = [
            Math.floor(Math.random() * this.map_size),
            Math.floor(Math.random() * this.map_size)
        ];

        // Ensure the player image position is updated immediately
        setTimeout(() => {
            // Need to resize the canvas wrapper to match the new grid size
            const canvas = document.getElementById('lamp_lighter_canvas') as HTMLCanvasElement;
            const wrapper = document.getElementById('game-wrapper');
            if (canvas && wrapper) {
                const cellWidth = Math.floor(canvas.width / this.map_size);
                wrapper.style.width = canvas.width + 'px';
                wrapper.style.height = canvas.height + 'px';
            }

            update_player_image_position();
            draw_lamp_lighter_canvas();
            update_lamp_lighter_counter();
            render_description(); // <-- update description after level/map change
        }, 0);

        // Show a brief congratulatory message
        const game_wrapper = document.getElementById('game-wrapper');
        if (game_wrapper) {
            const message = document.createElement('div');
            message.textContent = `Level ${this.level - 1} Complete! Moving to ${this.map_size}x${this.map_size} grid...`;
            message.style.position = 'absolute';
            message.style.top = '50%';
            message.style.left = '50%';
            message.style.transform = 'translate(-50%, -50%)';
            message.style.backgroundColor = 'rgba(13, 18, 20, 0.9)';
            message.style.color = '#ffffff';
            message.style.padding = '20px';
            message.style.borderRadius = '10px';
            message.style.fontWeight = 'bold';
            message.style.boxShadow = '0 0 10px #7e57c2';
            message.style.zIndex = '2000';

            game_wrapper.appendChild(message);
            this.is_level_transitioning = false;

            // Remove the message after 2 seconds
            setTimeout(() => {
                if (game_wrapper.contains(message)) {
                    game_wrapper.removeChild(message);
                }
            }, 2000);
        }
    }
}

let game = new LampLighterGame();
game.init()

function update_lamp_lighter_counter() {
    let counterElem = document.getElementById('lamp_lighter_counter');
    if (counterElem) {
        let lights_on = game.lamp_status
            .map(row => row.reduce((a, b) => a + b, 0))
            .reduce((a, b) => a + b, 0);
        counterElem.textContent = `Level: ${game.level} | Total moves: ${game.getTotalKeyCount()} | Lamps on: ${lights_on}`;
    }
}


declare global {
    interface Window {
        MathJax: {
            typesetPromise: (elements?: Element[]) => Promise<void>;
        };
    }
}

function render_description(size?: number) {
    const n = (size ?? game.map_size).toString();
    const html = `
        A lamp lighter travelling on a $\\mathbb{Z}_{${n}} \\times \\mathbb{Z}_{${n}}\$ grid/ donut, turning on/off lamps.<br>
        The grid with the lamps can be viewed as an element of $\\{0,1\\}^{\\mathbb{Z}_{${n}} \\times \\mathbb{Z}_{${n}}}\\times(\\mathbb{Z}_{${n}} \\times \\mathbb{Z}_{${n}})$.<br>
        In group theory, the lamplighter group is a special case of a wreath product.<br>
    `;

    let el = document.getElementById('lamp_lighter_description');
    if (!el) {
        return;
    }
    el.innerHTML = html;
    window.MathJax.typesetPromise([el]).then(() => {
        console.log("MathJax rendering complete!");
    });
}

function update_player_image_position() {
    const canvas = document.getElementById('lamp_lighter_canvas') as HTMLCanvasElement;
    const container = document.getElementById('player-image-container');
    if (!canvas || !container) {
        return;
    }

    const cell_width = Math.floor(canvas.width / (game.map_size + 2));

    // Clear previous images
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // For each visual cell, map to actual grid coordinates and if it matches
    // the player's current_location, create an img there (mirrored instances).
    for (let vis_i = 0; vis_i < game.map_size + 2; vis_i++) {
        for (let vis_j = 0; vis_j < game.map_size + 2; vis_j++) {
            let actual_i = vis_i - 1;
            let actual_j = vis_j - 1;

            if (actual_i < 0) {
                actual_i = game.map_size - 1;
            }
            if (actual_i >= game.map_size) {
                actual_i = 0;
            }
            if (actual_j < 0) {
                actual_j = game.map_size - 1;
            }
            if (actual_j >= game.map_size) {
                actual_j = 0;
            }

            if (actual_i === game.current_location[0] && actual_j === game.current_location[1]) {
                const img = document.createElement('img');
                img.src = PLAYER_GIF_SRC;
                img.style.position = 'absolute';
                img.style.width = `${cell_width}px`;
                img.style.height = `${cell_width}px`;
                img.style.top = `${vis_i * cell_width}px`;
                img.style.left = `${vis_j * cell_width}px`;
                img.style.pointerEvents = 'none';
                img.style.imageRendering = 'pixelated';
                container.appendChild(img);
            }
        }
    }
}

function draw_lamp_lighter_canvas() {
    let canvas: HTMLCanvasElement = document.getElementById('lamp_lighter_canvas') as HTMLCanvasElement;
    let context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, canvas.width, canvas.height);
    let w = canvas.width;

    // Calculate cell width based on (size+2)×(size+2) grid
    let cell_width = Math.floor(w / (game.map_size + 2));

    // Draw the expanded grid with wrapping visualization
    for (let vis_i = 0; vis_i < game.map_size + 2; vis_i++) {
        for (let vis_j = 0; vis_j < game.map_size + 2; vis_j++) {
            // Map the visual coordinates to the actual game grid coordinates with wrapping
            let actual_i = vis_i - 1;
            let actual_j = vis_j - 1;

            // Handle the wrapping for the border cells
            if (actual_i < 0) {
                actual_i = game.map_size - 1;
            } // Top border maps to bottom row
            if (actual_i >= game.map_size) {
                actual_i = 0;
            }     // Bottom border maps to top row
            if (actual_j < 0) {
                actual_j = game.map_size - 1;
            } // Left border maps to rightmost column
            if (actual_j >= game.map_size) {
                actual_j = 0;
            }     // Right border maps to leftmost column

            // Set the cell color based on lamp status
            if (game.lamp_status[actual_i][actual_j] == 1) {
                context.fillStyle = "#7e57c2";
            } else {
                context.fillStyle = "#263238";
            }
            context.fillRect(vis_j * cell_width, vis_i * cell_width, cell_width, cell_width);

            // Draw border slightly darker for border cells
            if (vis_i === 0 || vis_i === game.map_size + 1 || vis_j === 0 || vis_j === game.map_size + 1) {
                context.strokeStyle = "#050708"; // Darker stroke for border
                context.lineWidth = 1.5;
            } else {
                context.strokeStyle = "#0d1214"; // Regular stroke for main grid
                context.lineWidth = 3;
            }
            context.strokeRect(vis_j * cell_width, vis_i * cell_width, cell_width, cell_width);
        }
    }

    // Draw target location marker on every mirrored visual cell that maps to the target
    for (let vis_i = 0; vis_i < game.map_size + 2; vis_i++) {
        for (let vis_j = 0; vis_j < game.map_size + 2; vis_j++) {
            let actual_i = vis_i - 1;
            let actual_j = vis_j - 1;

            if (actual_i < 0) {
                actual_i = game.map_size - 1;
            }
            if (actual_i >= game.map_size) {
                actual_i = 0;
            }
            if (actual_j < 0) {
                actual_j = game.map_size - 1;
            }
            if (actual_j >= game.map_size) {
                actual_j = 0;
            }

            if (actual_i === game.target_location[0] && actual_j === game.target_location[1]) {
                context.strokeStyle = "#26a69a";
                context.lineWidth = 3;
                context.strokeRect(
                    vis_j * cell_width,
                    vis_i * cell_width,
                    cell_width,
                    cell_width
                );
            }
        }
    }

    // Update the player image position
    update_player_image_position();
}

// No single image to wait for; draw now
draw_lamp_lighter_canvas();
update_lamp_lighter_counter();
render_description(); // ensure description and MathJax are updated on load

// Handle game completion check after actions
function check_game_completion() {
    if (game.check_win_condition()) {
        game.is_level_transitioning = true;
        // Wait briefly before restarting to let the player see they reached the target
        setTimeout(() => {
            game.restart();
        }, 500);
    }
}

// Add keyboard event listener
document.addEventListener('keydown', (event) => {
    // Skip key processing if we're in level transition
    if (game.is_level_transitioning) {
        event.preventDefault();
        return;
    }

    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        game.move(key);
        game.incrementTotalKeyCount();
        draw_lamp_lighter_canvas();
        update_lamp_lighter_counter();
        check_game_completion(); // Check for win condition after move
        event.preventDefault(); // Prevent default scrolling behavior
    } else if (key === 't') {
        game.toggleLamp();
        game.incrementTotalKeyCount();
        draw_lamp_lighter_canvas();
        update_lamp_lighter_counter();
        check_game_completion(); // Check for win condition after toggle
        event.preventDefault();
    }
});
