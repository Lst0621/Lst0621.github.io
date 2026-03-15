// lib/tsl/math/math.ts
function array_eq(a, b) {
  let len_a = a.length;
  let len_b = b.length;
  if (len_a != len_b) {
    return false;
  }
  for (let i = 0; i < len_a; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}

// lib/tsl/math/number.ts
function add_mod_n(a, b, n) {
  return (a + b) % n;
}
function add_inverse_mod_n(a, n) {
  return (n - a % n) % n;
}

// lib/tsl/util.ts
function create_2d_array(m, n, a) {
  return Array.from({ length: m }, () => Array(n).fill(a));
}
function random_fill(array, threshold) {
  let l1 = array.length;
  let l2 = array[0].length;
  let new_array = [];
  for (let i = 0; i < l1; i++) {
    let row = [];
    for (let j = 0; j < l2; j++) {
      if (Math.random() < threshold) {
        row.push(1);
      } else {
        row.push(0);
      }
    }
    new_array.push(row);
  }
  return new_array;
}

// lib/page/lamp_lighter.ts
var PLAYER_GIF_SRC = "https://media.tenor.com/fXVhjC7EAOAAAAAi/the-binding-of-isaac.gif";
var PLAYER2_GIF_SRC = "https://media.tenor.com/0UFf9tLiZqcAAAAi/binding-of.gif";
window.addEventListener("load", () => {
  const canvas = document.getElementById("lamp_lighter_canvas");
  if (!canvas) {
    return;
  }
  if (canvas && canvas.parentNode) {
    const wrapper = document.createElement("div");
    wrapper.id = "game-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.width = canvas.width + "px";
    wrapper.style.height = canvas.height + "px";
    canvas.parentNode.replaceChild(wrapper, canvas);
    wrapper.appendChild(canvas);
    const player_container = document.createElement("div");
    player_container.id = "player-image-container";
    player_container.style.position = "absolute";
    player_container.style.top = "0";
    player_container.style.left = "0";
    player_container.style.width = "100%";
    player_container.style.height = "100%";
    player_container.style.pointerEvents = "none";
    player_container.style.zIndex = "1000";
    wrapper.appendChild(player_container);
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    update_player_image_position();
  }
});
var LampLighterGame = class _LampLighterGame {
  // Timer ID for greedy mode actions (renamed from random_timer)
  constructor(map_size = 3) {
    this.level = 1;
    this.map_size = this.get_level_map_size();
    this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
    this.current_location = [0, 0];
    this.target_location = [0, 0];
    this.total_key_count = 0;
    this.is_level_transitioning = false;
    this.greedy_mode = false;
    this.greedy_timer = null;
  }
  // Get map size based on level
  get_level_map_size() {
    const map_sizes = [3, 5, 7, 11, 13, 17, 19];
    if (this.level > map_sizes.length) {
      return map_sizes[map_sizes.length - 1];
    }
    return map_sizes[this.level - 1];
  }
  init() {
    this.level = 1;
    this.map_size = this.get_level_map_size();
    this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
    let threshold = this.get_level_threshold();
    const total_area = this.map_size * this.map_size;
    const min_lights = Math.ceil(0.5 * threshold * total_area);
    this.lamp_status = random_fill(this.lamp_status, threshold);
    let lit_count = this.count_lit_lights();
    while (lit_count < min_lights) {
      this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
      this.lamp_status = random_fill(this.lamp_status, threshold);
      lit_count = this.count_lit_lights();
    }
    this.current_location = [
      Math.floor(Math.random() * this.map_size),
      Math.floor(Math.random() * this.map_size)
    ];
    this.target_location = [
      Math.floor(Math.random() * this.map_size),
      Math.floor(Math.random() * this.map_size)
    ];
    this.total_key_count = 0;
    this.is_level_transitioning = false;
    this.greedy_mode = false;
    if (this.greedy_timer !== null) {
      clearInterval(this.greedy_timer);
      this.greedy_timer = null;
    }
    render_description();
  }
  // Helper method to count lit lights
  count_lit_lights() {
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
  get_level_threshold() {
    const min_threshold = 0.1;
    const max_threshold = 0.3;
    const max_level = 7;
    if (this.level >= max_level) {
      return max_threshold;
    }
    return min_threshold + (max_threshold - min_threshold) * (this.level - 1) / (max_level - 1);
  }
  static get_direction_delta(key, map_size) {
    switch (key) {
      case "w":
        return [add_inverse_mod_n(1, map_size), 0];
      case "s":
        return [1, 0];
      case "a":
        return [0, add_inverse_mod_n(1, map_size)];
      case "d":
        return [0, 1];
      default:
        return [0, 0];
    }
  }
  move(direction) {
    let [row, col] = this.current_location;
    const [diff_row, diff_col] = _LampLighterGame.get_direction_delta(direction, this.map_size);
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
  check_win_condition() {
    if (!array_eq(this.current_location, this.target_location)) {
      return false;
    }
    for (let i = 0; i < this.map_size; i++) {
      for (let j = 0; j < this.map_size; j++) {
        if (this.lamp_status[i][j] === 1) {
          return false;
        }
      }
    }
    return true;
  }
  // Helper method to find the closest lit light
  findClosestLitLight() {
    let litLightsExist = false;
    for (let i = 0; i < this.map_size; i++) {
      for (let j = 0; j < this.map_size; j++) {
        if (this.lamp_status[i][j] === 1) {
          litLightsExist = true;
          break;
        }
      }
      if (litLightsExist) break;
    }
    if (!litLightsExist) return null;
    const [playerRow, playerCol] = this.current_location;
    let minDistance = Infinity;
    let closestLight = [-1, -1];
    for (let i = 0; i < this.map_size; i++) {
      for (let j = 0; j < this.map_size; j++) {
        if (this.lamp_status[i][j] === 1) {
          const rowDist = Math.min(
            Math.abs(i - playerRow),
            this.map_size - Math.abs(i - playerRow)
          );
          const colDist = Math.min(
            Math.abs(j - playerCol),
            this.map_size - Math.abs(j - playerCol)
          );
          const distance = rowDist + colDist;
          if (distance < minDistance) {
            minDistance = distance;
            closestLight = [i, j];
          }
        }
      }
    }
    return closestLight;
  }
  // Move toward a target position taking the shortest path on the torus
  moveToward(targetPos) {
    const [currentRow, currentCol] = this.current_location;
    const [targetRow, targetCol] = targetPos;
    let rowDiff = targetRow - currentRow;
    let colDiff = targetCol - currentCol;
    if (Math.abs(rowDiff) > this.map_size / 2) {
      rowDiff = rowDiff > 0 ? rowDiff - this.map_size : rowDiff + this.map_size;
    }
    if (Math.abs(colDiff) > this.map_size / 2) {
      colDiff = colDiff > 0 ? colDiff - this.map_size : colDiff + this.map_size;
    }
    if (Math.abs(rowDiff) >= Math.abs(colDiff)) {
      if (rowDiff > 0) {
        this.move("s");
      } else if (rowDiff < 0) {
        this.move("w");
      }
    } else {
      if (colDiff > 0) {
        this.move("d");
      } else if (colDiff < 0) {
        this.move("a");
      }
    }
  }
  toggleGreedyMode() {
    if (this.is_level_transitioning) {
      return;
    }
    this.greedy_mode = !this.greedy_mode;
    if (this.greedy_mode) {
      this.greedy_timer = window.setInterval(() => this.performGreedyAction(), 200);
      const wrapper = document.getElementById("game-wrapper");
      if (wrapper) {
        const indicator = document.createElement("div");
        indicator.id = "greedy-mode-indicator";
        indicator.textContent = "GREEDY MODE";
        indicator.style.position = "absolute";
        indicator.style.top = "10px";
        indicator.style.right = "10px";
        indicator.style.backgroundColor = "rgba(76, 175, 80, 0.8)";
        indicator.style.color = "#ffffff";
        indicator.style.padding = "5px 10px";
        indicator.style.borderRadius = "5px";
        indicator.style.fontWeight = "bold";
        indicator.style.zIndex = "2000";
        wrapper.appendChild(indicator);
      }
    } else {
      if (this.greedy_timer !== null) {
        clearInterval(this.greedy_timer);
        this.greedy_timer = null;
      }
      const indicator = document.getElementById("greedy-mode-indicator");
      if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }
    draw_lamp_lighter_canvas();
    update_lamp_lighter_counter();
  }
  performGreedyAction() {
    if (this.is_level_transitioning) {
      return;
    }
    const [row, col] = this.current_location;
    if (this.lamp_status[row][col] === 1) {
      this.toggleLamp();
    } else {
      const closestLight = this.findClosestLitLight();
      if (closestLight) {
        this.moveToward(closestLight);
      } else {
        this.moveToward(this.target_location);
      }
    }
    this.incrementTotalKeyCount();
    draw_lamp_lighter_canvas();
    update_lamp_lighter_counter();
    check_game_completion();
  }
  restart() {
    this.is_level_transitioning = true;
    if (this.greedy_mode) {
      this.toggleGreedyMode();
    }
    this.level += 1;
    this.map_size = this.get_level_map_size();
    let threshold = this.get_level_threshold();
    const total_area = this.map_size * this.map_size;
    const min_lights = Math.ceil(0.5 * threshold * total_area);
    this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
    this.lamp_status = random_fill(this.lamp_status, threshold);
    let lit_count = this.count_lit_lights();
    while (lit_count < min_lights) {
      this.lamp_status = create_2d_array(this.map_size, this.map_size, 0);
      this.lamp_status = random_fill(this.lamp_status, threshold);
      lit_count = this.count_lit_lights();
    }
    this.current_location = [
      Math.floor(Math.random() * this.map_size),
      Math.floor(Math.random() * this.map_size)
    ];
    this.target_location = [
      Math.floor(Math.random() * this.map_size),
      Math.floor(Math.random() * this.map_size)
    ];
    setTimeout(() => {
      const canvas = document.getElementById("lamp_lighter_canvas");
      const wrapper = document.getElementById("game-wrapper");
      if (canvas && wrapper) {
        const cellWidth = Math.floor(canvas.width / this.map_size);
        wrapper.style.width = canvas.width + "px";
        wrapper.style.height = canvas.height + "px";
      }
      update_player_image_position();
      draw_lamp_lighter_canvas();
      update_lamp_lighter_counter();
      render_description();
    }, 0);
    const game_wrapper = document.getElementById("game-wrapper");
    if (game_wrapper) {
      const message = document.createElement("div");
      message.textContent = `Level ${this.level - 1} Complete! Moving to ${this.map_size}x${this.map_size} grid...`;
      message.style.position = "absolute";
      message.style.top = "50%";
      message.style.left = "50%";
      message.style.transform = "translate(-50%, -50%)";
      message.style.backgroundColor = "rgba(13, 18, 20, 0.9)";
      message.style.color = "#ffffff";
      message.style.padding = "20px";
      message.style.borderRadius = "10px";
      message.style.fontWeight = "bold";
      message.style.boxShadow = "0 0 10px #7e57c2";
      message.style.zIndex = "2000";
      game_wrapper.appendChild(message);
      this.is_level_transitioning = false;
      setTimeout(() => {
        if (game_wrapper.contains(message)) {
          game_wrapper.removeChild(message);
        }
      }, 2e3);
    }
  }
};
var game = new LampLighterGame();
game.init();
function update_lamp_lighter_counter() {
  let counterElem = document.getElementById("lamp_lighter_counter");
  if (counterElem) {
    let lights_on = game.lamp_status.map((row) => row.reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0);
    let greedyModeText = game.greedy_mode ? " | GREEDY MODE ACTIVE" : "";
    counterElem.textContent = `Level: ${game.level} | Total moves: ${game.getTotalKeyCount()} | Lamps on: ${lights_on}${greedyModeText}`;
  }
}
function render_description(size) {
  const n = (size ?? game.map_size).toString();
  const html = `
        A lamp lighter travelling on a $\\mathbb{Z}_{${n}} \\times \\mathbb{Z}_{${n}}$ grid/ donut, turning on/off lamps.<br>
        The grid with the lamps can be viewed as an element of $\\{0,1\\}^{\\mathbb{Z}_{${n}} \\times \\mathbb{Z}_{${n}}}\\times(\\mathbb{Z}_{${n}} \\times \\mathbb{Z}_{${n}})$.<br>
        In group theory, the lamplighter group is a special case of a wreath product.<br>
    `;
  let el = document.getElementById("lamp_lighter_description");
  if (!el) {
    return;
  }
  el.innerHTML = html;
  window.MathJax.typesetPromise([el]).then(() => {
    console.log("MathJax rendering complete!");
  });
}
function update_player_image_position() {
  const canvas = document.getElementById("lamp_lighter_canvas");
  const container = document.getElementById("player-image-container");
  if (!canvas || !container) {
    return;
  }
  const cell_width = Math.floor(canvas.width / (game.map_size + 2));
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
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
        const img = document.createElement("img");
        img.src = game.greedy_mode ? PLAYER2_GIF_SRC : PLAYER_GIF_SRC;
        img.style.position = "absolute";
        img.style.width = `${cell_width}px`;
        img.style.height = `${cell_width}px`;
        img.style.top = `${vis_i * cell_width}px`;
        img.style.left = `${vis_j * cell_width}px`;
        img.style.pointerEvents = "none";
        img.style.imageRendering = "pixelated";
        container.appendChild(img);
      }
    }
  }
}
function draw_lamp_lighter_canvas() {
  let canvas = document.getElementById("lamp_lighter_canvas");
  let context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  let w = canvas.width;
  let cell_width = Math.floor(w / (game.map_size + 2));
  const colorScheme = {
    normal: {
      lampOn: "#7e57c2",
      // Brighter purple for lamps that are on
      lampOff: "#263238",
      // Darker blue-gray for lamps that are off
      borderCell: "#050708",
      // Original nearly black for border cells
      mainGrid: "#050708"
      // Original very dark blue-gray for main grid
    },
    greedy: {
      lampOn: "#4CAF50",
      // Bright green for lamps that are on
      lampOff: "#1B5E20",
      // Dark green for lamps that are off
      borderCell: "#050708",
      // Use the same dark teal for all borders in greedy mode
      mainGrid: "#050708"
      // Very dark teal for main grid
    }
  };
  const colors = game.greedy_mode ? colorScheme.greedy : colorScheme.normal;
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
      if (game.lamp_status[actual_i][actual_j] == 1) {
        context.fillStyle = colors.lampOn;
      } else {
        context.fillStyle = colors.lampOff;
      }
      context.fillRect(vis_j * cell_width, vis_i * cell_width, cell_width, cell_width);
      if (vis_i === 0 || vis_i === game.map_size + 1 || vis_j === 0 || vis_j === game.map_size + 1) {
        context.strokeStyle = colors.borderCell;
        context.lineWidth = 1.5;
      } else {
        context.strokeStyle = colors.mainGrid;
        context.lineWidth = 3;
      }
      context.strokeRect(vis_j * cell_width, vis_i * cell_width, cell_width, cell_width);
    }
  }
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
        context.strokeStyle = game.greedy_mode ? "#FFEB3B" : "#4CAF50";
        context.lineWidth = 4;
        context.strokeRect(
          vis_j * cell_width + 1,
          vis_i * cell_width + 1,
          cell_width - 2,
          cell_width - 2
        );
      }
    }
  }
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
        context.strokeStyle = "#ff5722";
        context.lineWidth = 3;
        context.strokeRect(
          vis_j * cell_width + 2,
          // Offset by 2 pixels to avoid exact overlap with cell border
          vis_i * cell_width + 2,
          cell_width - 4,
          cell_width - 4
        );
      }
    }
  }
  update_player_image_position();
}
draw_lamp_lighter_canvas();
update_lamp_lighter_counter();
render_description();
function check_game_completion() {
  if (game.check_win_condition()) {
    game.is_level_transitioning = true;
    setTimeout(() => {
      game.restart();
    }, 500);
  }
}
document.addEventListener("keydown", (event) => {
  if (game.is_level_transitioning) {
    event.preventDefault();
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "g") {
    game.toggleGreedyMode();
    event.preventDefault();
    return;
  }
  if (game.greedy_mode) {
    event.preventDefault();
    return;
  }
  if (key === "w" || key === "a" || key === "s" || key === "d") {
    game.move(key);
    game.incrementTotalKeyCount();
    draw_lamp_lighter_canvas();
    update_lamp_lighter_counter();
    check_game_completion();
    event.preventDefault();
  } else if (key === "t") {
    game.toggleLamp();
    game.incrementTotalKeyCount();
    draw_lamp_lighter_canvas();
    update_lamp_lighter_counter();
    check_game_completion();
    event.preventDefault();
  }
});
