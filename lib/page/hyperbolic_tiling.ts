function poincare_to_canvas(x: number, y: number, cx: number, cy: number, r: number): [number, number] {
    // Map Poincaré disk coordinates (-1 to 1) to canvas coordinates
    return [cx + x * r, cy + y * r];
}

function get_arc_center_radius(a: [number, number], b: [number, number]): {center: [number, number], radius: number, ccw: boolean} {
    const [x1, y1] = a;
    const [x2, y2] = b;
    const d1_sq = x1*x1 + y1*y1;
    const d2_sq = x2*x2 + y2*y2;
    const denom = 2 * (x1*y2 - x2*y1);
    const cx = (y2*(d1_sq + 1) - y1*(d2_sq + 1)) / denom;
    const cy = (x1*(d2_sq + 1) - x2*(d1_sq + 1)) / denom;
    const r = Math.sqrt(Math.pow(cx - x1, 2) + Math.pow(cy - y1, 2));

    // Determine arc direction
    const cross_product = (x1 - cx) * (y2 - cy) - (y1 - cy) * (x2 - cx);
    const ccw = cross_product > 0;

    return {center: [cx, cy], radius: r, ccw};
}

function draw_geodesic_polygon(ctx: CanvasRenderingContext2D, vertices: [number, number][], color: string, disk_center: [number, number], disk_radius: number) {
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];

        const [p1_canvas_x, p1_canvas_y] = poincare_to_canvas(p1[0], p1[1], disk_center[0], disk_center[1], disk_radius);
        const [p2_canvas_x, p2_canvas_y] = poincare_to_canvas(p2[0], p2[1], disk_center[0], disk_center[1], disk_radius);

        if (i === 0) {
            ctx.moveTo(p1_canvas_x, p1_canvas_y);
        }

        const arc = get_arc_center_radius(p1, p2);
        if (isFinite(arc.radius)) {
            const [arc_center_x, arc_center_y] = poincare_to_canvas(arc.center[0], arc.center[1], disk_center[0], disk_center[1], disk_radius);
            const arc_r_canvas = arc.radius * disk_radius;
            const start_angle = Math.atan2(p1_canvas_y - arc_center_y, p1_canvas_x - arc_center_x);
            const end_angle = Math.atan2(p2_canvas_y - arc_center_y, p2_canvas_x - arc_center_x);
            ctx.arc(arc_center_x, arc_center_y, arc_r_canvas, start_angle, end_angle, !arc.ccw);
        } else {
            ctx.lineTo(p2_canvas_x, p2_canvas_y);
        }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
}

function calculate_hyperbolic_radius(p: number, q: number, disk_radius: number): number {
    // Calculate the required hyperbolic distance (d) for the vertices of a central regular p-gon
    // This is derived from hyperbolic trigonometry for a {p,q} tiling.
    const cos_pi_q = Math.cos(Math.PI / q);
    const sin_pi_p = Math.sin(Math.PI / p);

    // cosh(d) must be > 1 for acosh to be real
    if (cos_pi_q <= sin_pi_p) {
        console.error(`Invalid tiling {${p}, ${q}}: cos(π/${q}) must be greater than sin(π/${p}).`);
        return 0;
    }

    const d = Math.acosh(cos_pi_q / sin_pi_p);

    // Convert hyperbolic distance `d` to Euclidean radius `r` in the Poincaré disk
    const r_unit = Math.tanh(d / 2);
    return r_unit * disk_radius;
}

export function draw_hyperbolic_square_with_neighbors(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const disk_radius = Math.min(w, h) * 0.45;

    // Draw the boundary of the Poincare disk
    ctx.beginPath();
    ctx.arc(cx, cy, disk_radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;

    const p = 4; // Number of sides of the polygon (square)
    const q = 5; // Number of polygons meeting at each vertex
    const r_scaled = calculate_hyperbolic_radius(p, q, disk_radius);
    let r = r_scaled / disk_radius; // Convert back to unit radius for calculations
    r= 0.4

    const central_vertices: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + i * Math.PI / 2;
        central_vertices.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }

    const queue: {vertices: [number, number][], color: string, depth: number}[] = [];
    queue.push({vertices: central_vertices, color: "#e0e0ff", depth: 0});

    const drawn_polygons = new Set<string>();
    // Use the geometric center of the polygon as its unique key to avoid floating point issues at vertices
    const get_polygon_key = (v: [number, number][]) => {
        let cx = 0, cy = 0;
        for(const p of v) {
            cx += p[0];
            cy += p[1];
        }
        return `${(cx / v.length).toFixed(4)},${(cy / v.length).toFixed(4)}`;
    };
    drawn_polygons.add(get_polygon_key(central_vertices));

    let head = 0;
    const max_depth = 3; // How many layers of neighbors to draw

    while(head < queue.length) {
        const current = queue[head++];
        // Only generate neighbors up to max_depth, but draw all queued polygons later
        if (current.depth >= max_depth) continue;

        for (let i = 0; i < current.vertices.length; i++) {
            const p1 = current.vertices[i];
            const p2 = current.vertices[(i + 1) % current.vertices.length];
            const arc = get_arc_center_radius(p1, p2);

            const neighbor_vertices = current.vertices.map(v => {
                if (!isFinite(arc.radius)) { // Reflection across a line (diameter)
                    const dx = p2[0] - p1[0];
                    const dy = p2[1] - p1[1];
                    const normal_x = -dy;
                    const normal_y = dx;
                    const dot = (v[0] - p1[0]) * normal_x + (v[1] - p1[1]) * normal_y;
                    const reflected_x = v[0] - 2 * dot * normal_x / (normal_x**2 + normal_y**2);
                    const reflected_y = v[1] - 2 * dot * normal_y / (normal_x**2 + normal_y**2);
                    return [reflected_x, reflected_y] as [number, number];
                } else { // Reflection across a circular arc
                    const [vx, vy] = v;
                    const [acx, acy] = arc.center;
                    const r_sq = arc.radius * arc.radius;
                    const denom = (vx - acx)**2 + (vy - acy)**2;
                    if (denom < 1e-9) return v;
                    const reflected_x = acx + r_sq * (vx - acx) / denom;
                    const reflected_y = acy + r_sq * (vy - acy) / denom;
                    return [reflected_x, reflected_y] as [number, number];
                }
            });

            const neighbor_key = get_polygon_key(neighbor_vertices);
            if (!drawn_polygons.has(neighbor_key)) {
                drawn_polygons.add(neighbor_key);
                const next_depth = current.depth + 1;
                let next_color = "#ffe0e0"; // Pink for depth 1
                if (next_depth === 2) {
                    next_color = "#e0ffe0"; // Green for depth 2
                } else if (next_depth === 3) {
                    next_color = "#fff0e0"; // Light orange for depth 3
                }

                queue.push({vertices: neighbor_vertices, color: next_color, depth: next_depth});
            }
        }
    }

    // Draw all polygons that were generated, from outer to inner
    for (let i = queue.length - 1; i >= 0; i--) {
        const poly = queue[i];
        draw_geodesic_polygon(ctx, poly.vertices, poly.color, [cx, cy], disk_radius);
    }
}

draw_hyperbolic_square_with_neighbors("tiling")

