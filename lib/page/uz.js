// page/uz.ts
var canvas = document.getElementById("blocks");
var context = canvas.getContext("2d");
var canvas_uz = document.getElementById("uz");
var context_uz = canvas_uz.getContext("2d");
var show_chosen_block_only = false;
var block_idx = [0, 4, 2, 1, 3];
var faces = [];
var allBlocks = [[], [], [], [], []];
function addBlock(blocks, block0, block1) {
  blocks.push([block0, block1]);
}
function modToBlock(i) {
  if (i > 5) {
    return modToBlock(i - 5);
  } else {
    return i;
  }
}
function addBlockI(blocks, i) {
  addBlock(blocks, i, i);
  addBlock(blocks, modToBlock(i + 1), modToBlock(i + 2));
  addBlock(blocks, modToBlock(i + 1), modToBlock(i + 3));
  addBlock(blocks, modToBlock(i + 2), modToBlock(i + 4));
}
var scale = 80;
function drawOneBlock(block, ctx, x, y) {
  let colors = ["red", "green", "blue", "purple", "orange"];
  ctx.fillStyle = colors[block - 1];
  ctx.fillRect(x, y, scale, scale);
}
function drawTwoBlock(blocks, x, y) {
  drawOneBlock(blocks[0], context, x, y);
  drawOneBlock(blocks[1], context, x + scale, y);
}
function drawBlocks(blocks, i) {
  let scaleWithGapX = scale + 2;
  let scaleWithGapY = scale + 10;
  let y = i * scaleWithGapY + 5;
  if (show_chosen_block_only) {
    let idx = block_idx.indexOf(i);
    drawTwoBlock(blocks[faces[idx]], faces[idx] * 2 * scaleWithGapX, y);
    context.textAlign = "center";
    context.font = "bold 80px serif";
    context.fillStyle = "black";
    context.fillText((1 + i).toString(), (faces[idx] * 2 + 1) * scaleWithGapX, y + scale);
  } else {
    drawTwoBlock(blocks[0], 0, y);
    drawTwoBlock(blocks[1], 2 * scaleWithGapX, y);
    drawTwoBlock(blocks[2], 4 * scaleWithGapX, y);
    drawTwoBlock(blocks[3], 6 * scaleWithGapX, y);
  }
}
function drawInputs() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBlocks(allBlocks[0], 0);
  drawBlocks(allBlocks[1], 1);
  drawBlocks(allBlocks[2], 2);
  drawBlocks(allBlocks[3], 3);
  drawBlocks(allBlocks[4], 4);
}
function init() {
  addBlockI(allBlocks[0], 1);
  addBlockI(allBlocks[1], 2);
  addBlockI(allBlocks[2], 3);
  addBlockI(allBlocks[3], 4);
  addBlockI(allBlocks[4], 5);
}
function setup() {
  createPuzzle();
  drawPatterns();
  drawInputs();
}
var locations = [];
function shuffleArray(array) {
  array.sort((a, b) => a - b);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
function createPuzzle() {
  locations = get_locations();
  shuffleArray(block_idx);
  console.log("blk: " + block_idx);
  faces = [];
  for (let i = 0; i < block_idx.length; i++) {
    faces.push(Math.floor(Math.random() * 4));
  }
}
function drawPatterns() {
  context_uz.clearRect(0, 0, canvas_uz.width, canvas_uz.height);
  context_uz.textAlign = "center";
  context_uz.font = "bold 80px serif";
  for (let i = 0; i < faces.length; i++) {
    let location_pair = locations[i];
    let swap = Math.random() < 0.5;
    for (let location of location_pair) {
      let x = location[0];
      let y = location[1];
      drawOneBlock(allBlocks[block_idx[i]][faces[i]][swap ? 1 : 0], context_uz, x * scale, y * scale);
      if (show_chosen_block_only) {
        context_uz.fillStyle = "black";
        context_uz.fillText((1 + block_idx[i]).toString(), (x + 0.5) * scale, (y + 1) * scale);
      }
      swap = !swap;
    }
  }
}
var shifts = [[0, 1], [0, -1], [1, 0], [-1, 0]];
function flat(locations2) {
  let locations_flatten = [];
  for (const location of locations2) {
    let location0 = location[0];
    let location1 = location[1];
    locations_flatten.push(location0);
    locations_flatten.push(location1);
  }
  return locations_flatten;
}
function get_nbs(locations2) {
  let nbs_candidates = [];
  let nbs = [];
  let locations_flatten = flat(locations2);
  for (const location of locations2) {
    let location0 = location[0];
    let location1 = location[1];
    for (const shift of shifts) {
      nbs_candidates.push([location0[0] + shift[0], location0[1] + shift[1]]);
      nbs_candidates.push([location1[0] + shift[0], location1[1] + shift[1]]);
    }
  }
  for (const nb_candidate of nbs_candidates) {
    let contains = false;
    for (const nb of nbs) {
      if (nb[0] == nb_candidate[0] && nb[1] == nb_candidate[1]) {
        contains = true;
        break;
      }
    }
    if (contains) {
      continue;
    }
    for (const nb of locations_flatten) {
      if (nb[0] == nb_candidate[0] && nb[1] == nb_candidate[1]) {
        contains = true;
        break;
      }
    }
    if (contains) {
      continue;
    }
    nbs.push(nb_candidate);
  }
  return nbs;
}
function get_locations() {
  let locations2 = [];
  if (Math.random() < 0.5) {
    locations2.push([[0, 0], [0, 1]]);
  } else {
    locations2.push([[0, 0], [1, 0]]);
  }
  for (let i = 0; i < 4; i++) {
    let locations_flatten = flat(locations2);
    let nbs = get_nbs(locations2);
    while (true) {
      let nb = nbs[Math.floor(Math.random() * nbs.length)];
      let shift = shifts[Math.floor(Math.random() * shifts.length)];
      let nb_nb = [nb[0] + shift[0], nb[1] + shift[1]];
      let contain = false;
      for (let location of locations_flatten) {
        if (location[0] == nb_nb[0] && location[1] == nb_nb[1]) {
          contain = true;
          break;
        }
      }
      if (contain) {
        continue;
      }
      locations2.push([nb, nb_nb]);
      break;
    }
  }
  let x_min = locations2[0][0][0];
  let y_min = locations2[0][0][1];
  let x_max = locations2[0][0][0];
  let y_max = locations2[0][0][1];
  for (const location of locations2) {
    x_min = Math.min(x_min, location[0][0], location[1][0]);
    y_min = Math.min(y_min, location[0][1], location[1][1]);
    x_max = Math.max(x_max, location[0][0], location[1][0]);
    y_max = Math.max(y_max, location[0][1], location[1][1]);
  }
  if (y_max - y_min > 3 || x_max - x_min > 2) {
    return get_locations();
  }
  for (const location_pair of locations2) {
    for (const location of location_pair) {
      location[0] -= x_min;
      location[1] -= y_min;
    }
  }
  console.log(locations2);
  return locations2;
}
init();
setup();
