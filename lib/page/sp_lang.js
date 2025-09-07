import { concat_same_string_lists_leq_n_times, get_all_prefixes, get_alphabet_from_strings, get_regex_for_disalloweb_sub_seq } from "../tsl/lang/string.js";
import { create_2d_array, range } from "../tsl/util.js";
import { cartesian_product } from "../tsl/math/set.js";
function update(s1, s2) {
    const canvas = document.getElementById("canvas_id_sp");
    const ctx = canvas.getContext("2d");
    let span = document.getElementById('sp_span');
    let span2 = document.getElementById('sp_span_2');
    let disallowed = [s1, s2];
    let l = Math.max(s1.length, s2.length);
    let alphabet = get_alphabet_from_strings([s1, s2]);
    console.log(alphabet);
    let all_sub_seq = concat_same_string_lists_leq_n_times(alphabet, l);
    let allowed_seq = Array.from(all_sub_seq).filter(x => !disallowed.includes(x));
    span.innerHTML = "Disallowed subsequences: " + disallowed + "<br>";
    span.innerHTML += "Regex: " + get_regex_for_disalloweb_sub_seq(disallowed) + "<br>";
    span2.innerHTML += "Allowed subsequences: " + allowed_seq + "<br>";
    let pre1 = get_all_prefixes(s1);
    let pre2 = get_all_prefixes(s2);
    let l1 = pre1.length;
    let l2 = pre2.length;
    let idx1 = range(0, l1);
    let idx2 = range(0, l2);
    let idx = cartesian_product([idx1, idx2]);
    let scale = 120;
    let radius = 50;
    let arrows = [];
    let visited = create_2d_array(l1, l2, 0);
    travel(0, 0, pre1, pre2, arrows, visited);
    for (let i = 0; i < idx.length; i++) {
        let a = idx[i][0];
        let b = idx[i][1];
        let s1 = pre1[a];
        let s2 = pre2[b];
        draw_state(ctx, "(" + s1 + "," + s2 + ")", [scale + a * scale, scale + b * scale], radius, a + b == 0 ? "lightblue" : visited[a][b] == 0 ? "lightgrey" :
            (a == l1 - 1 || b == l2 - 1 ? "orange" : "lightgreen"));
    }
    for (let i = 0; i < arrows.length; i++) {
        let arrow = arrows[i];
        let from = arrow[0];
        let to = arrow[1];
        draw_arrow(ctx, [(from[0] + 1) * scale, (from[1] + 1) * scale], [(to[0] + 1) * scale, (to[1] + 1) * scale], arrow[2]);
    }
}
function draw_arrow(ctx, from, to, label) {
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
function travel(idx1, idx2, pre1, pre2, arrows, visited) {
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
    let next_char_1 = (idx1 + 1 < l1) ? pre1[idx1 + 1].slice(-1) : null;
    let next_char_2 = (idx2 + 1 < l2) ? pre2[idx2 + 1].slice(-1) : null;
    if (next_char_1 == next_char_2 && next_char_1 != null) {
        arrows.push([[idx1, idx2], [idx1 + 1, idx2 + 1], next_char_1]);
        travel(idx1 + 1, idx2 + 1, pre1, pre2, arrows, visited);
        return;
    }
    if (next_char_1 != null) {
        arrows.push([[idx1, idx2], [idx1 + 1, idx2], next_char_1]);
        travel(idx1 + 1, idx2, pre1, pre2, arrows, visited);
    }
    if (next_char_2 != null) {
        arrows.push([[idx1, idx2], [idx1, idx2 + 1], next_char_2]);
        travel(idx1, idx2 + 1, pre1, pre2, arrows, visited);
    }
}
function draw_state(ctx, name, pos, radius, state_color) {
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
update("abcda", "bacbb");
