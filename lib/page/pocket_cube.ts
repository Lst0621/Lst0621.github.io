import {
  PocketMoveId,
  type PocketMoveName,
  pocketMoveNameFromId,
  wasmPocketCubeApplyNamed,
  wasmPocketCubeIdentity,
  wasmPocketCubeIsOrientedSolved,
  wasmPocketCubeMovesProduct,
  wasmPocketCubeShortestFacePath,
  wasmPocketCubeShortestFacePathAnyOrientation,
  wasmPocketCubeStateOrder,
  modulePromise,
} from "../tsl/wasm/ts/wasm_api_pocket_cube";

/** Solarized-mapped face colors: U R F D L B */
const FACE_COLORS = [
  "#eee8d5", // U
  "#dc322f", // R
  "#859900", // F
  "#b58900", // D
  "#cb4b16", // L
  "#268bd2", // B
];

const STROKE = "#073642";

type Pt = { x: number; y: number };
type Vec3 = [number, number, number];

let state: number[] = [];
let moveHistory: PocketMoveName[] = [];
const statusEl = document.getElementById("status") as HTMLDivElement;
const pathPanel = document.getElementById("path-panel") as HTMLDivElement;
const pathHistoryEl = document.getElementById("path-history") as HTMLSpanElement;
const pathShortestEl = document.getElementById("path-shortest") as HTMLSpanElement;
const pathShortestInverseEl = document.getElementById("path-shortest-inverse") as HTMLSpanElement;
const pathShortestAnyEl = document.getElementById("path-shortest-any") as HTMLSpanElement;
const pathShortestAnyInverseEl = document.getElementById(
  "path-shortest-any-inverse",
) as HTMLSpanElement;
const pathStateOrderEl = document.getElementById("path-state-order") as HTMLSpanElement;
const togglePaths = document.getElementById("toggle-paths") as HTMLInputElement;
const toggleHighlightOrientation = document.getElementById(
  "toggle-highlight-orientation",
) as HTMLInputElement;
const canvasUrf = document.getElementById("canvas-urf") as HTMLCanvasElement;
const canvasDlb = document.getElementById("canvas-dlb") as HTMLCanvasElement;
const canvasNet = document.getElementById("canvas-net") as HTMLCanvasElement;
const canvasGraph = document.getElementById("canvas-graph") as HTMLCanvasElement;

const MOVE_LABEL: Record<PocketMoveName, string> = {
  U: "U",
  Up: "U'",
  R: "R",
  Rp: "R'",
  F: "F",
  Fp: "F'",
  D: "D",
  Dp: "D'",
  L: "L",
  Lp: "L'",
  B: "B",
  Bp: "B'",
  X: "x",
  Xp: "x'",
  Y: "y",
  Yp: "y'",
  Z: "z",
  Zp: "z'",
};

function formatMoveList(moves: PocketMoveName[]): string {
  if (moves.length === 0) {
    return "(none) · length 0";
  }
  return `length ${moves.length}: ${moves.map((m) => MOVE_LABEL[m]).join(" ")}`;
}

/** Reverse a shortest face-path to solve (invert each move). */
function inverseFacePath(moveIds: number[]): PocketMoveName[] {
  const out: PocketMoveName[] = [];
  for (let i = moveIds.length - 1; i >= 0; --i) {
    out.push(pocketMoveNameFromId(moveIds[i] ^ 1));
  }
  return out;
}

function faceOfSticker(sticker: number): number {
  return Math.floor(sticker / 4);
}

function colorAt(pos: number): string {
  return FACE_COLORS[faceOfSticker(state[pos])];
}

/** Local face sticker order: 0=UL, 1=UR, 2=DR, 3=DL (CW from outside). */
function faceStickers(face: number): [number, number, number, number] {
  const b = face * 4;
  return [b, b + 1, b + 2, b + 3];
}

function fillQuad(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  c: Pt,
  d: Pt,
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = STROKE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function clearCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7f0dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm3(a: Vec3): Vec3 {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Cube centered at origin, extent [-1, +1].
 * +X = R, +Y = F, +Z = U.
 * Camera on the ray t·eyeDir looking at the origin.
 * mirrorX: flip horizontal so URF shows F left / R right (usual diagram).
 */
function makeCameraProjector(
  canvas: HTMLCanvasElement,
  eyeDir: Vec3,
  mirrorX = false,
) {
  const eye = norm3(eyeDir);
  const forward = scale3(eye, -1); // toward origin
  const worldUp: Vec3 = Math.abs(eye[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1];
  const right = norm3(cross3(forward, worldUp));
  const up = norm3(cross3(right, forward));
  const sx = mirrorX ? -1 : 1;

  const scale = Math.min(canvas.width, canvas.height) * 0.28;
  const ox = canvas.width * 0.5;
  const oy = canvas.height * 0.5;

  return {
    eye,
    project(p: Vec3): Pt {
      return {
        x: ox + sx * dot3(p, right) * scale,
        y: oy - dot3(p, up) * scale,
      };
    },
    depth(p: Vec3): number {
      // Larger = farther from camera (painter: draw far first).
      return -dot3(p, eye);
    },
  };
}

type FaceSpec = {
  normal: Vec3;
  /** Corners in sticker order: UL, UR, DR, DL (outside view). */
  corners: [Vec3, Vec3, Vec3, Vec3];
  stickers: [number, number, number, number];
};

/**
 * Face corners for cube [-1,1]^3.
 * Sticker CW layout when looking at the face from outside:
 *   0 1
 *   3 2
 */
function cubeFaces(): FaceSpec[] {
  return [
    {
      // U z=+1; look down: +Y(F) at bottom of diagram
      normal: [0, 0, 1],
      corners: [
        [-1, -1, 1], // 0 toward B-L
        [1, -1, 1], // 1 toward B-R
        [1, 1, 1], // 2 toward F-R
        [-1, 1, 1], // 3 toward F-L
      ],
      stickers: faceStickers(0),
    },
    {
      // R x=+1; look from +X: +Y(F) left, -Y(B) right
      normal: [1, 0, 0],
      corners: [
        [1, 1, 1], // 0 UFR
        [1, -1, 1], // 1 UBR
        [1, -1, -1], // 2 DBR
        [1, 1, -1], // 3 DFR
      ],
      stickers: faceStickers(1),
    },
    {
      // F y=+1; look from +Y: +X right, +Z up
      normal: [0, 1, 0],
      corners: [
        [-1, 1, 1], // 0 UFL
        [1, 1, 1], // 1 UFR
        [1, 1, -1], // 2 DFR
        [-1, 1, -1], // 3 DFL
      ],
      stickers: faceStickers(2),
    },
    {
      // D z=-1; look from -Z (below): +Y(F) at top of diagram
      normal: [0, 0, -1],
      corners: [
        [-1, 1, -1], // 0 FL
        [1, 1, -1], // 1 FR
        [1, -1, -1], // 2 BR
        [-1, -1, -1], // 3 BL
      ],
      stickers: faceStickers(3),
    },
    {
      // L x=-1; look from -X: +Y(F) right, -Y(B) left
      normal: [-1, 0, 0],
      corners: [
        [-1, -1, 1], // 0 UBL
        [-1, 1, 1], // 1 UFL
        [-1, 1, -1], // 2 DFL
        [-1, -1, -1], // 3 DBL
      ],
      stickers: faceStickers(4),
    },
    {
      // B y=-1; look from -Y: +X left (=R), -X right (=L)
      normal: [0, -1, 0],
      corners: [
        [1, -1, 1], // 0 UBR
        [-1, -1, 1], // 1 UBL
        [-1, -1, -1], // 2 DBL
        [1, -1, -1], // 3 DBR
      ],
      stickers: faceStickers(5),
    },
  ];
}

function drawFaceStickers(
  ctx: CanvasRenderingContext2D,
  project: (p: Vec3) => Pt,
  face: FaceSpec,
): void {
  const [ul, ur, dr, dl] = face.corners;
  const at = (u: number, v: number): Pt => {
    const top = lerp3(ul, ur, u);
    const bot = lerp3(dl, dr, u);
    return project(lerp3(top, bot, v));
  };
  const cells: Array<{ s: number; u0: number; v0: number }> = [
    { s: face.stickers[0], u0: 0, v0: 0 },
    { s: face.stickers[1], u0: 0.5, v0: 0 },
    { s: face.stickers[2], u0: 0.5, v0: 0.5 },
    { s: face.stickers[3], u0: 0, v0: 0.5 },
  ];
  for (const cell of cells) {
    fillQuad(
      ctx,
      at(cell.u0, cell.v0),
      at(cell.u0 + 0.5, cell.v0),
      at(cell.u0 + 0.5, cell.v0 + 0.5),
      at(cell.u0, cell.v0 + 0.5),
      colorAt(cell.s),
    );
  }
}

function drawCornerView(
  canvas: HTMLCanvasElement,
  eyeDir: Vec3,
  mirrorX = false,
): void {
  const ctx = clearCanvas(canvas);
  const cam = makeCameraProjector(canvas, eyeDir, mirrorX);
  const faces = cubeFaces()
    .filter((f) => dot3(f.normal, cam.eye) > 1e-6)
    .sort((a, b) => {
      const ca = scale3(
        a.corners.reduce((s, c) => add3(s, c), [0, 0, 0] as Vec3),
        0.25,
      );
      const cb = scale3(
        b.corners.reduce((s, c) => add3(s, c), [0, 0, 0] as Vec3),
        0.25,
      );
      // Far faces first (painter's algorithm).
      return cam.depth(cb) - cam.depth(ca);
    });

  for (const face of faces) {
    drawFaceStickers(ctx, cam.project, face);
  }
}

function drawNet(canvas: HTMLCanvasElement): void {
  const ctx = clearCanvas(canvas);
  const cell = Math.min(canvas.width / 8.5, canvas.height / 6.5);
  const face = cell * 2;
  const gap = cell * 0.08;
  const originX = (canvas.width - (face * 4 + gap * 3)) / 2;
  const originY = (canvas.height - (face * 3 + gap * 2)) / 2;

  function drawFaceAt(faceIdx: number, gx: number, gy: number): void {
    const x0 = originX + gx * (face + gap);
    const y0 = originY + gy * (face + gap);
    const stickers = faceStickers(faceIdx);
    const positions: Array<{ s: number; cx: number; cy: number }> = [
      { s: stickers[0], cx: 0, cy: 0 },
      { s: stickers[1], cx: 1, cy: 0 },
      { s: stickers[3], cx: 0, cy: 1 },
      { s: stickers[2], cx: 1, cy: 1 },
    ];
    for (const p of positions) {
      const x = x0 + p.cx * cell;
      const y = y0 + p.cy * cell;
      ctx.fillStyle = colorAt(p.s);
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = STROKE;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, cell, cell);
    }
  }

  drawFaceAt(0, 1, 0); // U
  drawFaceAt(4, 0, 1); // L
  drawFaceAt(2, 1, 1); // F
  drawFaceAt(1, 2, 1); // R
  drawFaceAt(5, 3, 1); // B
  drawFaceAt(3, 1, 2); // D
}

/** Undirected sticker adjacencies on the cube surface (2×2). */
function faceletAdjacency(): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  for (let f = 0; f < 6; f++) {
    const b = f * 4;
    edges.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b]);
  }
  // From cross-net neighbors (and B wrap).
  edges.push(
    [3, 8], [2, 9], // UF
    [2, 4], [1, 5], // UR
    [0, 16], [3, 17], // UL
    [1, 20], [0, 21], // UB
    [12, 11], [13, 10], // DF
    [13, 7], [14, 6], // DR
    [12, 18], [15, 19], // DL
    [14, 23], [15, 22], // DB
    [9, 4], [10, 7], // FR
    [8, 17], [11, 18], // FL
    [20, 5], [23, 6], // BR
    [21, 16], [22, 19], // BL
  );
  return edges;
}

/**
 * Facelet graph from orthogonal projection along the URF–DLB axis (1,1,1).
 * Radius encodes height along that axis (URF inside, DLB outside); angle is
 * the polar angle in the plane ⟂ axis. Exact C3 symmetry for nodes and edges.
 */
function faceletGraphPositions(canvas: HTMLCanvasElement): Pt[] {
  const pos: Pt[] = new Array(24);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const s = Math.min(canvas.width, canvas.height);
  const rIn = s * 0.1;
  const rOut = s * 0.46;

  // Corner vertex of each sticker (2×2: one cubie corner per sticker).
  const faceVerts: Array<Array<Vec3>> = [
    [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], // U
    [[1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, -1]], // R
    [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], // F
    [[-1, 1, -1], [1, 1, -1], [1, -1, -1], [-1, -1, -1]], // D
    [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], // L
    [[1, -1, 1], [-1, -1, 1], [-1, -1, -1], [1, -1, -1]], // B
  ];
  const faceNormal: Vec3[] = [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, -1],
    [-1, 0, 0],
    [0, -1, 0],
  ];

  const u = norm3([1, 1, 1]);
  // Orthonormal basis of the plane ⟂ u (stable, not parallel to u).
  const e1 = norm3(cross3(u, Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]));
  const e2 = cross3(u, e1);

  function stickerCenter(f: number, i: number): Vec3 {
    const v = faceVerts[f][i];
    const n = faceNormal[f];
    // Quadrant center on the face plane.
    return [
      n[0] !== 0 ? n[0] : v[0] * 0.5,
      n[1] !== 0 ? n[1] : v[1] * 0.5,
      n[2] !== 0 ? n[2] : v[2] * 0.5,
    ];
  }

  const heights: number[] = [];
  const angles: number[] = [];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const c = stickerCenter(f, i);
      const h = dot3(c, u);
      const perp: Vec3 = [
        c[0] - h * u[0],
        c[1] - h * u[1],
        c[2] - h * u[2],
      ];
      heights.push(h);
      angles.push(Math.atan2(dot3(perp, e2), dot3(perp, e1)));
    }
  }
  const hMin = Math.min(...heights);
  const hMax = Math.max(...heights);
  const hSpan = hMax - hMin || 1;

  // Rotate drawing so URF sector points up (-π/2 in canvas y-down space).
  const urfAng = angles[2]; // U2 at URF
  const angShift = -Math.PI / 2 - urfAng;

  for (let sIdx = 0; sIdx < 24; sIdx++) {
    const t = (hMax - heights[sIdx]) / hSpan; // 0 at URF, 1 at DLB
    const radius = rIn + (rOut - rIn) * t;
    const ang = angles[sIdx] + angShift;
    pos[sIdx] = {
      x: cx + Math.cos(ang) * radius,
      y: cy + Math.sin(ang) * radius,
    };
  }
  return pos;
}

function drawFaceletGraph(canvas: HTMLCanvasElement): void {
  const ctx = clearCanvas(canvas);
  const pos = faceletGraphPositions(canvas);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const edges = faceletAdjacency();
  const s = Math.min(canvas.width, canvas.height);

  // Guide rings at the discrete heights that appear in the projection.
  const guideT = [0, 0.25, 0.5, 0.75, 1];
  const rIn = s * 0.1;
  const rOut = s * 0.46;
  ctx.strokeStyle = "#eee0c8";
  ctx.lineWidth = 1;
  for (const t of guideT) {
    const r = rIn + (rOut - rIn) * t;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "#93a1a1";
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";

  for (const [i, j] of edges) {
    const a = pos[i];
    const b = pos[j];
    const ra = Math.hypot(a.x - cx, a.y - cy);
    const rb = Math.hypot(b.x - cx, b.y - cy);
    const sameRing = Math.abs(ra - rb) < s * 0.03;
    let d =
      Math.atan2(b.y - cy, b.x - cx) - Math.atan2(a.y - cy, a.x - cx);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    ctx.beginPath();
    if (sameRing && Math.abs(d) > 0.12 && Math.abs(d) < Math.PI * 0.7) {
      const r = (ra + rb) * 0.5;
      const ang0 = Math.atan2(a.y - cy, a.x - cx);
      ctx.moveTo(a.x, a.y);
      ctx.arc(cx, cy, r, ang0, ang0 + d, d < 0);
    } else {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }

  const nodeR = Math.max(5, s * 0.02);
  for (let i = 0; i < 24; i++) {
    const p = pos[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
    ctx.fillStyle = colorAt(i);
    ctx.fill();
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

function redraw(): void {
  // URF: mirror X so F is left, R is right (standard diagram).
  drawCornerView(canvasUrf, [1, 1, 1], true);
  // DLB: L left, B right, D toward bottom of the panel.
  drawCornerView(canvasDlb, [-1, -1, -1], false);
  drawNet(canvasNet);
  drawFaceletGraph(canvasGraph);
  updatePathPanel();
}

function isIdentityState(): boolean {
  const id = wasmPocketCubeIdentity();
  return state.every((v, i) => v === id[i]);
}

function formatPathOrError(
  el: HTMLSpanElement,
  invEl: HTMLSpanElement,
  ids: number[] | null,
  errLabel: string,
): PocketMoveName[] {
  if (ids === null) {
    el.textContent = errLabel;
    invEl.textContent = "(unavailable)";
    return [];
  }
  const names = ids.map((id) => pocketMoveNameFromId(id));
  const inv = inverseFacePath(ids);
  el.textContent = formatMoveList(names);
  invEl.textContent = formatMoveList(inv);
  return inv;
}

function updateSolveHint(nextMove: PocketMoveName | null): void {
  document.querySelectorAll<HTMLButtonElement>("button[data-move]").forEach((btn) => {
    btn.classList.toggle("solve-next", nextMove !== null && btn.dataset.move === nextMove);
  });
}

function updatePathPanel(): void {
  const show = togglePaths.checked;
  pathPanel.classList.toggle("hidden", !show);

  let invIdentity: PocketMoveName[] = [];
  let invAny: PocketMoveName[] = [];
  let idsIdentity: number[] | null = [];
  let idsAny: number[] | null = [];

  const orientedSolved = wasmPocketCubeIsOrientedSolved(state);
  if (!orientedSolved || !isIdentityState()) {
    try {
      idsIdentity = isIdentityState() ? [] : wasmPocketCubeShortestFacePath(state);
    } catch {
      idsIdentity = null;
    }
    try {
      idsAny = orientedSolved ? [] : wasmPocketCubeShortestFacePathAnyOrientation(state);
    } catch {
      idsAny = null;
    }
  }

  if (show) {
    invIdentity = formatPathOrError(
      pathShortestEl,
      pathShortestInverseEl,
      idsIdentity,
      "(shortest path not found)",
    );
    invAny = formatPathOrError(
      pathShortestAnyEl,
      pathShortestAnyInverseEl,
      idsAny,
      "(shortest path not found)",
    );
    pathHistoryEl.textContent = formatMoveList(moveHistory);
    try {
      pathStateOrderEl.textContent = String(wasmPocketCubeStateOrder(state));
    } catch {
      pathStateOrderEl.textContent = "?";
    }
  } else {
    if (idsIdentity !== null) {
      invIdentity = inverseFacePath(idsIdentity);
    }
    if (idsAny !== null) {
      invAny = inverseFacePath(idsAny);
    }
  }

  const useAny = toggleHighlightOrientation.checked;
  const inv = useAny ? invAny : invIdentity;
  const solveNext = inv.length > 0 ? inv[0] : null;
  updateSolveHint(show ? solveNext : null);
}

function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

function applyMove(name: PocketMoveName): void {
  state = wasmPocketCubeApplyNamed(state, name);
  moveHistory.push(name);
  redraw();
  if (wasmPocketCubeIsOrientedSolved(state)) {
    setStatus(isIdentityState() ? "solved (identity)" : "solved (oriented)");
  } else {
    setStatus(`move ${MOVE_LABEL[name]}`);
  }
}

/** QiYi F1 + anti-sune / sune (F3 = inverse of F2). */
const FORMULA1: PocketMoveName[] = [
  "R", "Bp", "R", "F", "F", "Rp", "B", "R", "F", "F", "R", "R",
];
/** R U U R' U' R U' R' */
const FORMULA2: PocketMoveName[] = ["R", "U", "U", "Rp", "Up", "R", "Up", "Rp"];
/** Inverse of F2: R U R' U R U U R' */
const FORMULA3: PocketMoveName[] = ["R", "U", "Rp", "U", "R", "U", "U", "Rp"];

type FormulaSpec = {
  moves: PocketMoveName[];
  /** Position map p from moves product: next[p[i]] = state[i]. */
  product: number[];
};

const FORMULA_SPECS: Record<string, { moves: PocketMoveName[] }> = {
  "1": { moves: FORMULA1 },
  "2": { moves: FORMULA2 },
  "3": { moves: FORMULA3 },
  "2+2": { moves: [...FORMULA2, ...FORMULA2] },
  "2+Up+2": { moves: [...FORMULA2, "Up", ...FORMULA2] },
  "2+U+U+3": { moves: [...FORMULA2, "U", "U", ...FORMULA3] },
  "2+U+3": { moves: [...FORMULA2, "U", ...FORMULA3] },
  "2+Up+3": { moves: [...FORMULA2, "Up", ...FORMULA3] },
};

const formulaCache: Record<string, FormulaSpec> = {};

function ensureFormulaCache(): void {
  for (const [key, spec] of Object.entries(FORMULA_SPECS)) {
    if (!formulaCache[key]) {
      const moveIds = spec.moves.map((name) => PocketMoveId[name]);
      formulaCache[key] = {
        moves: spec.moves,
        product: wasmPocketCubeMovesProduct(moveIds),
      };
    }
  }
}

function applyFormula(key: string, label: string): void {
  const spec = formulaCache[key];
  if (!spec) {
    return;
  }
  const next = new Array<number>(state.length);
  for (let i = 0; i < state.length; i++) {
    next[spec.product[i]] = state[i];
  }
  state = next;
  moveHistory.push(...spec.moves);
  redraw();
  if (wasmPocketCubeIsOrientedSolved(state)) {
    setStatus(
      isIdentityState()
        ? `solved (identity) · ${label}`
        : `solved (oriented) · ${label}`,
    );
  } else {
    setStatus(`${label} · ${formatMoveList(spec.moves)}`);
  }
}

function reset(): void {
  state = wasmPocketCubeIdentity();
  moveHistory = [];
  redraw();
  setStatus("solved (identity)");
}

function scramble(): void {
  const faceMoves: PocketMoveName[] = [
    "U", "Up", "D", "Dp", "F", "Fp", "B", "Bp", "L", "Lp", "R", "Rp",
  ];
  const n = 20 + Math.floor(Math.random() * 11);
  let lastAxis = -1;
  for (let i = 0; i < n; i++) {
    let pick = Math.floor(Math.random() * faceMoves.length);
    const axis = Math.floor(PocketMoveId[faceMoves[pick]] / 2);
    if (axis === lastAxis) {
      pick = (pick + 2) % faceMoves.length;
    }
    lastAxis = Math.floor(PocketMoveId[faceMoves[pick]] / 2);
    const name = faceMoves[pick];
    state = wasmPocketCubeApplyNamed(state, name);
    moveHistory.push(name);
  }
  redraw();
  setStatus(`scrambled (${n} face turns)`);
}

document.querySelectorAll<HTMLButtonElement>("button[data-move]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.move as PocketMoveName;
    applyMove(name);
  });
});

document.getElementById("btn-reset")!.addEventListener("click", reset);
document.getElementById("btn-scramble")!.addEventListener("click", scramble);
document.getElementById("btn-formula1")!.addEventListener("click", () => {
  applyFormula("1", "F1");
});
document.getElementById("btn-formula2")!.addEventListener("click", () => {
  applyFormula("2", "F2");
});
document.getElementById("btn-formula3")!.addEventListener("click", () => {
  applyFormula("3", "F3");
});
document.querySelectorAll<HTMLButtonElement>("button[data-formula-combo]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.formulaCombo!;
    applyFormula(key, `combo ${key}`);
  });
});
togglePaths.addEventListener("change", updatePathPanel);
toggleHighlightOrientation.addEventListener("change", updatePathPanel);

await modulePromise;
ensureFormulaCache();
reset();
setStatus("ready");
