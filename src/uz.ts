let canvas: HTMLCanvasElement = document.getElementById('blocks') as
    HTMLCanvasElement;
let context: CanvasRenderingContext2D = canvas.getContext("2d");
let canvas_uz: HTMLCanvasElement = document.getElementById('uz') as
    HTMLCanvasElement;
let context_uz: CanvasRenderingContext2D = canvas_uz.getContext("2d");

let show_chosen_block_only = false
let block_idx = [0, 4, 2, 1, 3]
let faces = []


enum Block {
    RED = 1,
    GREEN,
    BLUE,
    PURPLE,
    ORANGE
}

let allBlocks: Array<Array<Array<Block>>> = [[], [], [], [], []];

function addBlock(blocks: Array<Array<Block>>, block0: Block, block1: Block) {
    blocks.push([block0, block1])
}

function modToBlock(i: number) {
    if (i > 5) {
        return modToBlock(i - 5)
    } else {
        return i
    }
}

function addBlockI(blocks: Array<Array<Block>>, i: number) {
    addBlock(blocks, i, i)
    addBlock(blocks, modToBlock(i + 1), modToBlock(i + 2))
    addBlock(blocks, modToBlock(i + 1), modToBlock(i + 3))
    addBlock(blocks, modToBlock(i + 2), modToBlock(i + 4))
}

let scale: number = 80

function drawOneBlock(block: Block, ctx: CanvasRenderingContext2D, x: number, y: number) {

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
    ctx.fillRect(x, y, scale, scale)
}

function drawTwoBlock(blocks: Array<Block>, x: number, y: number) {
    drawOneBlock(blocks[0], context, x, y)
    drawOneBlock(blocks[1], context, x + scale, y)
}

function drawBlocks(blocks: Array<Array<Block>>, i: number) {
    let scaleWithGapX = scale + 2
    let scaleWithGapY = scale + 10
    let y = i * scaleWithGapY + 5
    if (show_chosen_block_only) {
        let idx = block_idx.indexOf(i)
        drawTwoBlock(blocks[faces[idx]], faces[idx] * 2 * scaleWithGapX, y)

    } else {
        drawTwoBlock(blocks[0], 0, y)
        drawTwoBlock(blocks[1], 2 * scaleWithGapX, y)
        drawTwoBlock(blocks[2], 4 * scaleWithGapX, y)
        drawTwoBlock(blocks[3], 6 * scaleWithGapX, y)
    }
}

function switch_block_mode() {
    show_chosen_block_only = !show_chosen_block_only
    drawPatterns()
    drawInputs()
}

function drawInputs() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBlocks(allBlocks[0], 0)
    drawBlocks(allBlocks[1], 1)
    drawBlocks(allBlocks[2], 2)
    drawBlocks(allBlocks[3], 3)
    drawBlocks(allBlocks[4], 4)
}

function init() {
    addBlockI(allBlocks[0], 1)
    addBlockI(allBlocks[1], 2)
    addBlockI(allBlocks[2], 3)
    addBlockI(allBlocks[3], 4)
    addBlockI(allBlocks[4], 5)
}

function setup() {
    createPuzzle()
    drawPatterns()
    drawInputs()
}

let locations: (typeof loc_pair)[] = []

function createPuzzle() {
    locations = get_locations()
    // TODO
    block_idx = [0, 4, 2, 1, 3]
    faces = []
    for (let i = 0; i < block_idx.length; i++) {
        faces.push(Math.floor(Math.random() * 4));
    }
}

function drawPatterns() {
    context_uz.clearRect(0, 0, canvas_uz.width, canvas_uz.height);
    context_uz.textAlign = 'center';
    context_uz.font = "bold 80px serif";
    for (let i = 0; i < faces.length; i++) {
        let location_pair = locations[i]
        let swap = Math.random() < 0.5
        for (let location of location_pair) {
            let x = location[0]
            let y = location[1]
            drawOneBlock(allBlocks[block_idx[i]][faces[i]][swap ? 1 : 0], context_uz, x * scale, y * scale)
            if (show_chosen_block_only) {
                context_uz.fillStyle = 'black'
                context_uz.fillText((1 + block_idx[i]).toString(), (x + 0.5) * scale, (y + 1) * scale)
            }
            swap = !swap
        }
    }
}

let loc: [number, number];
let loc_pair: [typeof loc, typeof loc]
let shifts = [[0, 1], [0, -1], [1, 0], [-1, 0]]

function flat(locations: typeof loc_pair[]) {
    let locations_flatten: typeof loc[] = []
    for (const location of locations) {
        let location0: typeof loc = location[0];
        let location1: typeof loc = location[1];
        locations_flatten.push(location0);
        locations_flatten.push(location1);
    }
    return locations_flatten

}

function get_nbs(locations: (typeof loc_pair)[]) {
    let nbs_candidates: typeof loc[] = [];
    let nbs: typeof loc[] = [];
    let locations_flatten: typeof loc[] = flat(locations);
    for (const location of locations) {
        let location0: typeof loc = location[0];
        let location1: typeof loc = location[1];
        for (const shift of shifts) {
            nbs_candidates.push([location0[0] + shift[0], location0[1] + shift[1]])
            nbs_candidates.push([location1[0] + shift[0], location1[1] + shift[1]])
        }
    }

    for (const nb_candidate of nbs_candidates) {
        let contains = false
        for (const nb of nbs) {
            if (nb[0] == nb_candidate[0] && nb[1] == nb_candidate[1]) {
                contains = true
                break
            }
        }
        if (contains) {
            continue
        }
        for (const nb of locations_flatten) {
            if (nb[0] == nb_candidate[0] && nb[1] == nb_candidate[1]) {
                contains = true
                break
            }
        }
        if (contains) {
            continue
        }

        nbs.push(nb_candidate);
    }

    return nbs
}

function get_locations() {
    let locations: (typeof loc_pair)[] = []
    locations.push([[0, 0], [0, 1]])
    for (let i = 0; i < 4; i++) {
        let locations_flatten: typeof loc[] = flat(locations);
        let nbs = get_nbs(locations);
        while (true) {
            let nb = nbs[Math.floor((Math.random() * nbs.length))]
            let shift = shifts[Math.floor((Math.random() * shifts.length))]
            // nb of nb
            let nb_nb: typeof loc = [nb[0] + shift[0], nb[1] + shift[1]]
            let contain = false
            for (let location of locations_flatten) {
                if (location[0] == nb_nb[0] && location[1] == nb_nb[1]) {
                    contain = true
                    break
                }
            }
            if (contain) {
                continue;
            }

            locations.push([nb, nb_nb])
            break
        }
    }

    console.log(locations)
    let x_min = locations[0][0][0]
    let y_min = locations[0][0][1]
    let x_max = locations[0][0][0]
    let y_max = locations[0][0][1]
    for (const location of locations) {
        x_min = Math.min(x_min, location[0][0], location[1][0])
        y_min = Math.min(y_min, location[0][1], location[1][1])
        x_max = Math.max(x_min, location[0][0], location[1][0])
        y_max = Math.max(y_min, location[0][1], location[1][1])
    }

    if (y_max - y_min > 5 || x_max - x_min > 4) {
        // too wide. try again
        return get_locations()
    }

    for (const location_pair of locations) {
        for (const location of location_pair) {
            // TODO move to center
            location[0] -= x_min
            location[1] -= y_min
        }
    }

    return locations
}

init()
setup()