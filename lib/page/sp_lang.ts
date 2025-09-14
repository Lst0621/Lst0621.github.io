import {
    cat_subseq_of_blocklist,
    concat_same_string_lists_leq_n_times,
    get_all_prefixes, get_all_subseq_for_blocks,
    get_alphabet_from_strings, get_regex_for_disallowed_sub_seq, sub_empty_with_ep, subseq_remove_short
} from "../tsl/lang/string.js";
import {create_2d_array, range} from "../tsl/util.js";
import {cartesian_product} from "../tsl/math/set.js";
import {draw_table} from "../tsl/visual.js";
import {always} from "../tsl/func.js";

function init() {
    // let init_subs: string = "abcda,bacbb,accb";
    let init_subs: string = "abc,cba";
    (document.getElementById("sp_input") as HTMLInputElement as HTMLInputElement).value = init_subs
    let button: HTMLButtonElement = document.getElementById("update_button") as HTMLButtonElement
    button.onclick = update;
    update()
}

function update() {
    let sp_input: string = (document.getElementById("sp_input") as HTMLInputElement as HTMLInputElement).value;
    let span: HTMLSpanElement = document.getElementById('sp_span') as HTMLSpanElement;

    let subs = sp_input.split(",");
    let s1 = subs[0];
    let s2 = subs.length == 1 ? s1 : subs[1]
    let disallowed = subs
    let l = Math.max(s1.length, s2.length);
    let alphabet = get_alphabet_from_strings(subs);
    console.log(alphabet)

    span.innerHTML = "Disallowed subsequences: " + disallowed + "<br>"
    span.innerHTML += "Regex: " + get_regex_for_disallowed_sub_seq(disallowed) + "<br>"

    let all_sub_seq = concat_same_string_lists_leq_n_times(alphabet, l)
    // let allowed_seq = Array.from(all_sub_seq).filter(x => !disallowed.includes(x))
    // span2.innerHTML += "Allowed subsequences: " + allowed_seq + "<br>"

    let pre1: string[] = get_all_prefixes(s1)
    let pre2: string[] = get_all_prefixes(s2)
    let l1 = pre1.length;
    let l2 = pre2.length;
    let idx1 = range(0, l1);
    let idx2 = range(0, l2);
    let idx = cartesian_product([idx1, idx2])
    let scale = 120
    let radius = 50
    let arrows: any[][] = []
    let visited: number[][] = create_2d_array(l1, l2, 0)
    const canvas: HTMLCanvasElement = document.getElementById("canvas_id_sp") as HTMLCanvasElement
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.width)
    travel(0, 0, pre1, pre2, arrows, visited)
    for (let i = 0; i < idx.length; i++) {
        let a = idx[i][0]
        let b = idx[i][1]
        let s1: string = pre1[a]
        let s2: string = pre2[b]
        draw_state(ctx, [s1, s2].map(sub_empty_with_ep).join(","),
            [scale + a * scale, scale + b * scale],
            radius, a + b == 0 ? "lightblue" : visited[a][b] == 0 ? "lightgrey" :
                (a == l1 - 1 || b == l2 - 1 ? "orange" : "lightgreen"))
    }
    for (let i = 0; i < arrows.length; i++) {
        let arrow = arrows[i]
        let from: number[] = arrow[0]
        let to: number[] = arrow[1]
        draw_arrow(ctx, [(from[0] + 1) * scale, (from[1] + 1) * scale], [(to[0] + 1) * scale, (to[1] + 1) * scale], arrow[2])
    }

    let all_pres = subs.map(get_all_prefixes)
    let all_states = cartesian_product(all_pres)
    draw_table(
        document.getElementById("multiplication_table_1") as HTMLTableElement,
        all_states,
        alphabet,
        (row: number, col: number): string[] => {
            return get_next_state(all_states[row], alphabet[col], all_pres)
        },
        a => a.map(sub_empty_with_ep).toString(),
        sub_empty_with_ep,
        a => a.map(sub_empty_with_ep).toString(),
        always("lightgreen"),
        always("lightblue"),
        (row: number, col: number) => {
            let next = get_next_state(all_states[row], alphabet[col], all_pres)
            return range(0, next.length).some(i => {
                return subs[i] === next[i]
            }) ? "orange" : "lightgrey"
        }
    )

    let all_block_seq = get_all_subseq_for_blocks(subs)
    let len = Math.max(...(subs.map(s => s.length)))
    draw_table(
        document.getElementById("multiplication_table_2") as HTMLTableElement,
        all_block_seq,
        alphabet,
        (row: number, col: number): string[] => {
            return cat_subseq_of_blocklist(all_block_seq[row], ["", alphabet[col]], len, subs)
        },
        a => subseq_remove_short(a).toString(),
        sub_empty_with_ep,
        a => subseq_remove_short(a).toString(),
        always("lightgreen"),
        always("lightblue"),
        (row: number, col: number) => {
            let next = cat_subseq_of_blocklist(all_block_seq[row], ["", alphabet[col]], len, subs)
            if(next.some(x=>subs.some(y=>y==x))){
                return "orange"
            }else{
                return "lightgreen"
            }
        }
    )
}

function get_next_state(states: string[], ch: string, all_pres: string[][]) {
    let len = all_pres.length;
    let next_state = []
    for (let i = 0; i < len; i++) {
        let state = states[i]
        let pre = all_pres[i]
        let w = state.length
        if (pre.length == w + 1) {
            next_state.push(state)
            continue
        }
        if (pre[w + 1].slice(-1) == ch) {
            next_state.push(state + ch)
        } else {
            next_state.push(state)
        }
    }
    return next_state
}


function draw_arrow(ctx: CanvasRenderingContext2D, from: number[], to: number[], label: string) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const angle = Math.atan2(dy, dx);

    const startX = from[0] + 25 * Math.cos(angle);
    const startY = from[1] + 25 * Math.sin(angle);
    const endX = to[0] - 25 * Math.cos(angle);
    const endY = to[1] - 25 * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const arrowSize = 6;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "blue";
    ctx.font = "15px Arial";
    ctx.fillText(label, (startX + endX) / 2, (startY + endY) / 2 - 5);
    ctx.fillStyle = "black";
}


function travel(idx1: number, idx2: number, pre1: string[], pre2: string[], arrows: any[][], visited: number[][]) {
    let l1 = pre1.length;
    let l2 = pre2.length;
    if (visited[idx1][idx2] == 1) {
        return;
    }
    visited[idx1][idx2] = 1;
    if (idx1 + 1 == l1 && idx2 + 1 == l2) {
        // done
        return;
    }
    let next_char_1 = (idx1 + 1 < l1) ? pre1[idx1 + 1].slice(-1) : null
    let next_char_2 = (idx2 + 1 < l2) ? pre2[idx2 + 1].slice(-1) : null
    if (next_char_1 == next_char_2 && next_char_1 != null) {
        arrows.push([[idx1, idx2], [idx1 + 1, idx2 + 1], next_char_1])
        travel(idx1 + 1, idx2 + 1, pre1, pre2, arrows, visited)
        return;
    }
    if (next_char_1 != null) {
        arrows.push([[idx1, idx2], [idx1 + 1, idx2], next_char_1])
        travel(idx1 + 1, idx2, pre1, pre2, arrows, visited)
    }
    if (next_char_2 != null) {
        arrows.push([[idx1, idx2], [idx1, idx2 + 1], next_char_2])
        travel(idx1, idx2 + 1, pre1, pre2, arrows, visited)
    }
}

function draw_state(ctx: CanvasRenderingContext2D, name: string, pos: number[], radius: number, state_color: string) {
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], radius, 0, 2 * Math.PI);
    ctx.fillStyle = state_color;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.font = "15px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, pos[0], pos[1]);
}

init()
