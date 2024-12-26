var canvas = document.getElementById('blocks');
var context = canvas.getContext("2d");
var canvas_uz = document.getElementById('uz');
var context_uz = canvas_uz.getContext("2d");
var show_chosen_block_only = false;
var block_idx = [0, 4, 2, 1, 3];
var faces = [];
var Block;
(function (Block) {
    Block[Block["RED"] = 1] = "RED";
    Block[Block["GREEN"] = 2] = "GREEN";
    Block[Block["BLUE"] = 3] = "BLUE";
    Block[Block["PURPLE"] = 4] = "PURPLE";
    Block[Block["ORANGE"] = 5] = "ORANGE";
})(Block || (Block = {}));
var allBlocks = [[], [], [], [], []];
function addBlock(blocks, block0, block1) {
    blocks.push([block0, block1]);
}
function modToBlock(i) {
    if (i > 5) {
        return modToBlock(i - 5);
    }
    else {
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
    switch (block) {
        case Block.RED:
            ctx.fillStyle = 'red';
            break;
        case Block.GREEN:
            ctx.fillStyle = 'green';
            break;
        case Block.BLUE:
            ctx.fillStyle = 'blue';
            break;
        case Block.PURPLE:
            ctx.fillStyle = 'purple';
            break;
        case Block.ORANGE:
            ctx.fillStyle = 'orange';
            break;
    }
    ctx.fillRect(x, y, scale, scale);
}
function drawTwoBlock(blocks, x, y) {
    drawOneBlock(blocks[0], context, x, y);
    drawOneBlock(blocks[1], context, x + scale, y);
}
function drawBlocks(blocks, i) {
    var scaleWithGapX = scale + 2;
    var scaleWithGapY = scale + 10;
    var y = i * scaleWithGapY;
    if (show_chosen_block_only) {
        var idx = block_idx.indexOf(i);
        drawTwoBlock(blocks[faces[idx]], faces[idx] * 2 * scaleWithGapX, y);
    }
    else {
        drawTwoBlock(blocks[0], 0, y);
        drawTwoBlock(blocks[1], 2 * scaleWithGapX, y);
        drawTwoBlock(blocks[2], 4 * scaleWithGapX, y);
        drawTwoBlock(blocks[3], 6 * scaleWithGapX, y);
    }
}
function switch_block_mode() {
    show_chosen_block_only = !show_chosen_block_only;
    DrawInputs();
}
function DrawInputs() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBlocks(allBlocks[0], 0);
    drawBlocks(allBlocks[1], 1);
    drawBlocks(allBlocks[2], 2);
    drawBlocks(allBlocks[3], 3);
    drawBlocks(allBlocks[4], 4);
}
function setup() {
    addBlockI(allBlocks[0], 1);
    addBlockI(allBlocks[1], 2);
    addBlockI(allBlocks[2], 3);
    addBlockI(allBlocks[3], 4);
    addBlockI(allBlocks[4], 5);
    DrawInputs();
    var locations = get_locations();
    // TODO
    block_idx = [0, 4, 2, 1, 3];
    faces = [];
    for (var i = 0; i < block_idx.length; i++) {
        faces.push(Math.floor(Math.random() * 4));
    }
    for (var i = 0; i < faces.length; i++) {
        var location_pair = locations[i];
        var swap = Math.random() < 0.5;
        for (var _i = 0, location_pair_1 = location_pair; _i < location_pair_1.length; _i++) {
            var location_1 = location_pair_1[_i];
            var x = location_1[0];
            var y = location_1[1];
            drawOneBlock(allBlocks[block_idx[i]][faces[i]][swap ? 1 : 0], context_uz, x * scale, y * scale);
            swap = !swap;
        }
    }
}
var loc;
var loc_pair;
var shifts = [[0, 1], [0, -1], [1, 0], [-1, 0]];
function flat(locations) {
    var locations_flatten = [];
    for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
        var location_2 = locations_1[_i];
        var location0 = location_2[0];
        var location1 = location_2[1];
        locations_flatten.push(location0);
        locations_flatten.push(location1);
    }
    return locations_flatten;
}
function get_nbs(locations) {
    var nbs_candidates = [];
    var nbs = [];
    var locations_flatten = flat(locations);
    for (var _i = 0, locations_2 = locations; _i < locations_2.length; _i++) {
        var location_3 = locations_2[_i];
        var location0 = location_3[0];
        var location1 = location_3[1];
        for (var _a = 0, shifts_1 = shifts; _a < shifts_1.length; _a++) {
            var shift = shifts_1[_a];
            nbs_candidates.push([location0[0] + shift[0], location0[1] + shift[1]]);
            nbs_candidates.push([location1[0] + shift[0], location1[1] + shift[1]]);
        }
    }
    for (var _b = 0, nbs_candidates_1 = nbs_candidates; _b < nbs_candidates_1.length; _b++) {
        var nb_candidate = nbs_candidates_1[_b];
        var contains = false;
        for (var _c = 0, nbs_1 = nbs; _c < nbs_1.length; _c++) {
            var nb = nbs_1[_c];
            if (nb[0] == nb_candidate[0] && nb[1] == nb_candidate[1]) {
                contains = true;
                break;
            }
        }
        if (contains) {
            continue;
        }
        for (var _d = 0, locations_flatten_1 = locations_flatten; _d < locations_flatten_1.length; _d++) {
            var nb = locations_flatten_1[_d];
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
    var locations = [];
    locations.push([[0, 0], [0, 1]]);
    for (var i = 0; i < 4; i++) {
        var locations_flatten = flat(locations);
        var nbs = get_nbs(locations);
        while (true) {
            var nb = nbs[Math.floor((Math.random() * nbs.length))];
            var shift = shifts[Math.floor((Math.random() * shifts.length))];
            // nb of nb
            var nb_nb = [nb[0] + shift[0], nb[1] + shift[1]];
            var contain = false;
            for (var _i = 0, locations_flatten_2 = locations_flatten; _i < locations_flatten_2.length; _i++) {
                var location_4 = locations_flatten_2[_i];
                if (location_4[0] == nb_nb[0] && location_4[1] == nb_nb[1]) {
                    contain = true;
                    break;
                }
            }
            if (contain) {
                continue;
            }
            locations.push([nb, nb_nb]);
            break;
        }
    }
    console.log(locations);
    var x_min = locations[0][0][0];
    var y_min = locations[0][0][1];
    for (var _a = 0, locations_3 = locations; _a < locations_3.length; _a++) {
        var location_5 = locations_3[_a];
        x_min = Math.min(x_min, location_5[0][0]);
        y_min = Math.min(y_min, location_5[0][1]);
        x_min = Math.min(x_min, location_5[1][0]);
        y_min = Math.min(y_min, location_5[1][1]);
    }
    for (var _b = 0, locations_4 = locations; _b < locations_4.length; _b++) {
        var location_pair = locations_4[_b];
        for (var _c = 0, location_pair_2 = location_pair; _c < location_pair_2.length; _c++) {
            var location_6 = location_pair_2[_c];
            // TODO move to center
            location_6[0] -= x_min;
            location_6[1] -= y_min;
        }
    }
    return locations;
}
setup();
