function drawHexagon(ctx, cx, cy, hex_radius, color) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const x = cx + hex_radius * Math.cos(angle);
        const y = cy + hex_radius * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.stroke();
    // Optional: fill color
    if (color != null) {
        ctx.fillStyle = color;
    }
    ctx.fill();
}
export function hex_dist(a, b) {
    const x1 = a[0];
    const y1 = a[1];
    const x2 = b[0];
    const y2 = b[1];
    const dx = Math.abs(x1 - x2);
    const y_min = y1 - Math.floor(dx / 2) - dx % 2 * ((x1 + 1) % 2);
    const y_max = y1 + Math.floor(dx / 2) + (dx % 2) * (x1 % 2);
    const dy = y2 >= y_max ? y2 - y_max : y2 <= y_min ? y_min - y2 : 0;
    return dx + dy;
}
export function drawHexGrid(ctx, rows, cols, hex_radius, get_color) {
    const hex_height = Math.sqrt(3) * hex_radius;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const yOffset = (col % 2) * hex_height / 2;
            const x = col * (hex_radius * 1.5) + hex_radius;
            const y = row * (hex_height) + hex_height / 2 + yOffset;
            drawHexagon(ctx, x, y, hex_radius, get_color(col, row));
        }
    }
}
