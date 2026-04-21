// tsl/wasm_api.ts
import wasmSample from "../tsl/wasm/wasm_out_v1/wasm_sample.js";
var moduleInstance = null;
function isNodeRuntime() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  const proc = g && g.process;
  return typeof proc?.versions?.node === "string";
}
async function loadWasmSampleInNode() {
  const nodeFs = "node:fs";
  const nodeUrl = "node:url";
  const nodePath = "node:path";
  const fs = await import(nodeFs);
  const url = await import(nodeUrl);
  const path = await import(nodePath);
  const nodeLoaderPath = "./wasm/wasm_out_v1/wasm_sample.js";
  const { default: wasmSampleNode } = await import(nodeLoaderPath);
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const wasmPath = path.join(__dirname, "wasm", "wasm_out_v1", "wasm_sample.wasm");
  const wasmBinary = fs.readFileSync(wasmPath);
  return wasmSampleNode({ wasmBinary });
}
async function loadWasmSampleInBrowser() {
  return wasmSample();
}
async function createModulePromise() {
  const mod = isNodeRuntime() ? await loadWasmSampleInNode() : await loadWasmSampleInBrowser();
  moduleInstance = mod;
  return mod;
}
var modulePromise = createModulePromise();
function initWasm() {
  return modulePromise;
}
await initWasm();
function getHeap32() {
  if (!moduleInstance) {
    throw new Error(
      "WASM module not initialized. Call and await initWasm() before using WASM functions."
    );
  }
  const m2 = moduleInstance;
  const HEAP32 = m2.HEAP32;
  if (!HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return HEAP32;
}
var BARS_GAME_BASE_INTS = 1280;
var barsGameHandle = null;
var m = () => moduleInstance;
function barsGameCreate() {
  if (!moduleInstance) throw new Error("WASM module not initialized.");
  if (barsGameHandle !== null) {
    m()._bars_game_destroy(barsGameHandle);
  }
  barsGameHandle = m()._bars_game_create();
}
function barsGameSetSeed(seed) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_set_seed(barsGameHandle, seed);
}
function barsGameInit() {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_init(barsGameHandle);
}
function barsGameGetState() {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  const HEAP32 = getHeap32();
  const size = m()._bars_game_state_size(barsGameHandle);
  if (HEAP32.length < BARS_GAME_BASE_INTS + size) throw new Error("WASM memory exhausted");
  m()._bars_game_get_state(barsGameHandle, BARS_GAME_BASE_INTS * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[BARS_GAME_BASE_INTS + i]);
  return out;
}
function barsGameGetFutureState(choiceIndex) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  const HEAP32 = getHeap32();
  const size = m()._bars_game_state_size(barsGameHandle);
  if (HEAP32.length < BARS_GAME_BASE_INTS + size) throw new Error("WASM memory exhausted");
  m()._bars_game_get_future_state(barsGameHandle, choiceIndex, BARS_GAME_BASE_INTS * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[BARS_GAME_BASE_INTS + i]);
  return out;
}
function barsGameApplyChoice(index) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_apply_choice(barsGameHandle, index);
}
function barsGameIsEnded() {
  if (!moduleInstance || barsGameHandle === null) return true;
  return m()._bars_game_is_ended(barsGameHandle) !== 0;
}
function barsGameStateSize() {
  if (!moduleInstance || barsGameHandle === null) return 0;
  return m()._bars_game_state_size(barsGameHandle);
}
function barsGameMaxVal() {
  if (!moduleInstance || barsGameHandle === null) return 2e3;
  return m()._bars_game_max_val(barsGameHandle);
}

// page/bars_game_themes.ts
function txt(b, l) {
  return b[l];
}
var NEUTRAL_THRESHOLD = 50;
function classifyDeltas(state, future) {
  const r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const d = future[i] - state[i];
    if (d > NEUTRAL_THRESHOLD) {
      r[i] = 1;
    } else if (d < -NEUTRAL_THRESHOLD) {
      r[i] = -1;
    }
  }
  return r;
}
function scorePattern(pattern, actual) {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    if (pattern[i] === actual[i]) {
      s += 2;
    } else if (pattern[i] === 0 || actual[i] === 0) {
      s += 1;
    }
  }
  return s;
}
function findMatchingScenario(scenarios, actual0, actual1, rng) {
  if (scenarios.length === 0) {
    return null;
  }
  let best = -1;
  const pool = [];
  for (const sc2 of scenarios) {
    const scoreAB = scorePattern(sc2.patternA, actual0) + scorePattern(sc2.patternB, actual1);
    const scoreBA = scorePattern(sc2.patternA, actual1) + scorePattern(sc2.patternB, actual0);
    const s = Math.max(scoreAB, scoreBA);
    const swapped = scoreBA > scoreAB;
    if (s > best) {
      best = s;
      pool.length = 0;
      pool.push({ scenario: sc2, swapped });
    } else if (s === best) {
      pool.push({ scenario: sc2, swapped });
    }
  }
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(rng() * pool.length)];
}
function getFailureText(theme, state, maxVal, lang) {
  for (let i = 0; i < 4; i++) {
    if (state[i] <= 0) {
      return txt(theme.failLow[i], lang);
    }
    if (state[i] >= maxVal) {
      return txt(theme.failHigh[i], lang);
    }
  }
  return "";
}
function t(cn, en) {
  return { cn, en };
}
function sc(bg, a, pa, b, pb) {
  return { background: bg, choiceA: a, choiceB: b, patternA: pa, patternB: pb };
}
var medievalKingdom = {
  name: t("\u4E2D\u4E16\u7EAA\u738B\u56FD", "Medieval Kingdom"),
  labels: [t("\u56FD\u5E93", "Treasury"), t("\u519B\u529B", "Military"), t("\u6C11\u5FC3", "People"), t("\u4FE1\u4EF0", "Faith")],
  failLow: [
    t("\u738B\u56FD\u7834\u4EA7\uFF0C\u503A\u4E3B\u593A\u53D6\u4E86\u738B\u4F4D\u3002", "The kingdom is bankrupt. Creditors seize the throne."),
    t("\u519B\u961F\u5C3D\u5931\uFF0C\u4FB5\u7565\u8005\u957F\u9A71\u76F4\u5165\u3002", "With no army left, invaders overrun the kingdom."),
    t("\u767E\u59D3\u5C3D\u6563\uFF0C\u738B\u56FD\u6CA6\u4E3A\u65E0\u4EBA\u4E4B\u5730\u3002", "The last citizens flee. The kingdom is a ghost land."),
    t("\u4FE1\u4EF0\u5D29\u584C\uFF0C\u9ED1\u6697\u4E0E\u7EDD\u671B\u541E\u566C\u4E86\u738B\u56FD\u3002", "All faith is lost. Darkness and despair consume the realm.")
  ],
  failHigh: [
    t("\u8D22\u5BCC\u8150\u8680\u671D\u5EF7\uFF0C\u9769\u547D\u7206\u53D1\u3002", "Obscene wealth corrupts the court. Revolution erupts."),
    t("\u5C06\u519B\u52BF\u529B\u8FC7\u5927\uFF0C\u53D1\u52A8\u653F\u53D8\u3002", "The generals grow too powerful and stage a coup."),
    t("\u519C\u6C11\u63A8\u7FFB\u541B\u4E3B\u5236\uFF0C\u6C11\u53D8\u56DB\u8D77\u3002", "The peasants overthrow the monarchy in a populist uprising."),
    t("\u72C2\u70ED\u4FE1\u5F92\u593A\u6743\uFF0C\u795E\u6743\u7EDF\u6CBB\u964D\u4E34\u3002", "Zealots seize absolute power. A theocracy is born.")
  ],
  scenarios: [
    sc(
      t("\u4E00\u652F\u5546\u961F\u62B5\u8FBE\u57CE\u95E8", "A merchant caravan arrives at the gates"),
      t("\u70ED\u60C5\u8FCE\u63A5", "Welcome them warmly"),
      [1, 0, 1, 0],
      t("\u5F81\u6536\u91CD\u7A0E", "Demand heavy tolls"),
      [1, 0, -1, -1]
    ),
    sc(
      t("\u90BB\u56FD\u63D0\u8BAE\u7ED3\u76DF", "The neighboring kingdom proposes an alliance"),
      t("\u63A5\u53D7\u6761\u4EF6", "Accept their terms"),
      [-1, 1, 1, 0],
      t("\u62D2\u7EDD\u5E76\u589E\u5175\u8FB9\u5883", "Reject and arm the border"),
      [0, 1, -1, 0]
    ),
    sc(
      t("\u6559\u4F1A\u8BF7\u6C42\u62E8\u6B3E\u4FEE\u5EFA\u5927\u6559\u5802", "The church requests funds for a cathedral"),
      t("\u62E8\u6B3E\u4FEE\u5EFA", "Fund the cathedral"),
      [-1, 0, 1, 1],
      t("\u5C06\u8D44\u91D1\u8F6C\u7ED9\u519B\u961F", "Redirect funds to the army"),
      [-1, 1, -1, -1]
    ),
    sc(
      t("\u571F\u532A\u5728\u4E61\u95F4\u8086\u8650", "Bandits terrorize the countryside"),
      t("\u6D3E\u5175\u527F\u706D", "Send troops to hunt them"),
      [-1, 1, 1, 0],
      t("\u62DB\u5B89\u571F\u532A", "Offer the bandits amnesty"),
      [0, -1, 1, -1]
    ),
    sc(
      t("\u761F\u75AB\u5A01\u80C1\u57CE\u5E02", "A plague threatens the city"),
      t("\u9694\u79BB\u6551\u6CBB\u75C5\u4EBA", "Quarantine and treat the sick"),
      [-1, 0, 1, 0],
      t("\u5BA3\u5E03\u5168\u6C11\u7948\u7977", "Declare days of prayer"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u519C\u6C11\u8981\u6C42\u51CF\u7A0E", "Peasants demand lower taxes"),
      t("\u964D\u4F4E\u8D4B\u7A0E", "Lower taxes to ease the burden"),
      [-1, 0, 1, 0],
      t("\u65E0\u89C6\u8BC9\u6C42", "Ignore their pleas"),
      [1, 0, -1, -1]
    ),
    sc(
      t("\u5C71\u4E2D\u53D1\u73B0\u91D1\u77FF", "Gold is discovered in the mountains"),
      t("\u5F00\u653E\u516C\u5171\u77FF\u573A", "Open public mines"),
      [1, 0, 1, -1],
      t("\u6536\u5F52\u7687\u5BA4\u6240\u6709", "Claim royal ownership"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u5F02\u56FD\u738B\u5B50\u6C42\u5A5A", "A foreign prince offers marriage"),
      t("\u63A5\u53D7\u8054\u59FB", "Accept the match"),
      [1, 1, 0, -1],
      t("\u5A49\u8A00\u8C22\u7EDD", "Politely decline"),
      [0, -1, 1, 1]
    ),
    sc(
      t("\u519B\u961F\u8981\u6C42\u52A0\u9977", "The army demands better pay"),
      t("\u63D0\u9AD8\u519B\u9977", "Increase military wages"),
      [-1, 1, 0, 0],
      t("\u8BB8\u4EE5\u8363\u8000", "Promise glory instead"),
      [0, -1, -1, 1]
    ),
    sc(
      t("\u5F02\u7AEF\u5728\u5E7F\u573A\u5E03\u9053", "Heretics preach in the town square"),
      t("\u902E\u6355\u5E76\u9A71\u9010", "Arrest and silence them"),
      [0, 0, -1, 1],
      t("\u5141\u8BB8\u81EA\u7531\u8FA9\u8BBA", "Allow free discourse"),
      [0, -1, 1, -1]
    ),
    sc(
      t("\u6218\u4E71\u56FD\u5EA6\u7684\u96BE\u6C11\u6D8C\u6765", "Refugees arrive from a war-torn land"),
      t("\u6536\u5BB9\u96BE\u6C11", "Welcome them in"),
      [-1, -1, 1, 1],
      t("\u5173\u95ED\u8FB9\u5883", "Close the borders"),
      [0, 1, -1, -1]
    ),
    sc(
      t("\u6709\u4EBA\u63D0\u8BAE\u4E3E\u529E\u9A91\u58EB\u6BD4\u6B66", "A jousting tournament is proposed"),
      t("\u51FA\u8D44\u4E3B\u529E", "Fund and host the event"),
      [-1, 1, 1, 0],
      t("\u53D6\u6D88\u4EE5\u8282\u7701\u5F00\u652F", "Cancel for austerity"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u68EE\u6797\u4E2D\u53D1\u73B0\u53E4\u4EE3\u9057\u8FF9", "An ancient ruin is found in the forest"),
      t("\u53D1\u6398\u5B9D\u85CF", "Excavate for treasure"),
      [1, 0, 0, -1],
      t("\u5C06\u5176\u8BBE\u4E3A\u5723\u6240", "Consecrate it as a shrine"),
      [-1, 0, 0, 1]
    ),
    sc(
      t("\u4E30\u6536\u8282\u5373\u5C06\u6765\u4E34", "The harvest festival approaches"),
      t("\u4E3E\u529E\u76DB\u5927\u5E86\u5178", "Host a grand celebration"),
      [-1, 0, 1, 1],
      t("\u7701\u4E0B\u91D1\u5E01", "Skip it to save gold"),
      [1, 0, -1, -1]
    ),
    sc(
      t("\u57CE\u5821\u4E2D\u6293\u5230\u4E00\u540D\u95F4\u8C0D", "A spy is caught in the castle"),
      t("\u516C\u5F00\u5904\u51B3", "Execute him publicly"),
      [0, 1, -1, 1],
      t("\u7B56\u53CD\u4E3A\u53CC\u9762\u95F4\u8C0D", "Turn him as a double agent"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u6D77\u76D7\u88AD\u51FB\u6CBF\u6D77\u6751\u5E84", "Pirates raid the coastal villages"),
      t("\u6D3E\u51FA\u6D77\u519B", "Deploy the navy"),
      [-1, 1, 0, 0],
      t("\u8C08\u5224\u8D4E\u91D1", "Negotiate a ransom"),
      [-1, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u65C5\u884C\u5B66\u8005\u524D\u6765\u732E\u7B56", "A traveling scholar offers rare knowledge"),
      t("\u6B22\u8FCE\u5176\u8BB2\u5B66", "Welcome his teachings"),
      [0, 0, 1, -1],
      t("\u711A\u5176\u4E66\u7C4D\u4E3A\u5F02\u7AEF", "Burn his books as heresy"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u56FD\u5E93\u5373\u5C06\u6EE1\u6EA2", "The royal treasury is nearly full"),
      t("\u6295\u8D44\u516C\u5171\u8BBE\u65BD", "Invest in public works"),
      [-1, 0, 1, 0],
      t("\u6269\u5145\u519B\u961F", "Expand the military"),
      [-1, 1, 0, 0]
    ),
    sc(
      t("\u72FC\u7FA4\u88AD\u51FB\u6751\u5E84\u7272\u755C", "Wolves attack livestock in the villages"),
      t("\u7EC4\u7EC7\u7687\u5BB6\u72E9\u730E", "Organize a royal hunt"),
      [-1, 1, 1, 0],
      t("\u8BA9\u519C\u6C11\u81EA\u884C\u5904\u7406", "Let the farmers handle it"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u56FD\u738B\u7684\u987E\u95EE\u5EFA\u8BAE\u52A0\u7A0E", "The king's advisor suggests raising taxes"),
      t("\u9002\u5EA6\u52A0\u7A0E", "Raise taxes moderately"),
      [1, 0, -1, 0],
      t("\u7EF4\u6301\u73B0\u72B6", "Keep taxes as they are"),
      [0, 0, 1, 0]
    )
  ]
};
var spaceColony = {
  name: t("\u592A\u7A7A\u6B96\u6C11\u5730", "Space Colony"),
  labels: [t("\u80FD\u6E90", "Energy"), t("\u7CAE\u98DF", "Food"), t("\u58EB\u6C14", "Morale"), t("\u79D1\u6280", "Technology")],
  failLow: [
    t("\u5168\u9762\u65AD\u7535\uFF0C\u751F\u547D\u7EF4\u6301\u7CFB\u7EDF\u9677\u5165\u9ED1\u6697\u3002", "Total power failure. Life support goes dark."),
    t("\u9965\u8352\u8513\u5EF6\uFF0C\u6B96\u6C11\u5730\u65E0\u6CD5\u7EF4\u7EED\u3002", "Starvation sets in. The colony cannot survive."),
    t("\u5168\u9762\u53DB\u53D8\uFF0C\u8239\u5458\u653E\u5F03\u4E86\u4EFB\u52A1\u3002", "Complete mutiny. The crew abandons the mission."),
    t("\u5173\u952E\u7CFB\u7EDF\u5931\u6548\uFF0C\u6B96\u6C11\u5730\u9000\u56DE\u6DF7\u4E71\u3002", "Critical systems lost. The colony regresses to chaos.")
  ],
  failHigh: [
    t("\u53CD\u5E94\u5806\u8FC7\u8F7D\uFF0C\u6B96\u6C11\u5730\u5728\u7206\u70B8\u4E2D\u6BC1\u706D\u3002", "Reactor overload. The colony is consumed in a blast."),
    t("\u751F\u7269\u8D28\u5931\u63A7\u751F\u957F\uFF0C\u6DF9\u6CA1\u4E86\u7A7A\u95F4\u7AD9\u3002", "Uncontrolled growth overruns the station with bio-mass."),
    t("\u8239\u5458\u8FC7\u5EA6\u4E50\u89C2\u758F\u5FFD\u804C\u5B88\uFF0C\u7CFB\u7EDF\u6084\u7136\u5D29\u6E83\u3002", "Euphoric crew neglects duties. Systems fail unnoticed."),
    t("AI\u5B9E\u73B0\u5947\u70B9\uFF0C\u5B83\u4E0D\u518D\u9700\u8981\u4EBA\u7C7B\u3002", "The AI achieves singularity. It no longer needs humans.")
  ],
  scenarios: [
    sc(
      t("\u592A\u9633\u80FD\u677F\u9635\u5217\u6025\u9700\u4FEE\u7406", "Solar panel array needs urgent repairs"),
      t("\u8C03\u6D3E\u8239\u5458\u4FEE\u590D", "Divert crew to fix them"),
      [1, 0, -1, 0],
      t("\u9650\u7535\u5E94\u6025", "Ration power instead"),
      [-1, 0, 0, 1]
    ),
    sc(
      t("\u4E00\u9897\u6D41\u6D6A\u5C0F\u884C\u661F\u903C\u8FD1\u7A7A\u95F4\u7AD9", "A rogue asteroid approaches the station"),
      t("\u542F\u52A8\u9632\u5FA1\u6FC0\u5149", "Activate defense lasers"),
      [-1, 0, -1, 1],
      t("\u758F\u6563\u81F3\u907F\u96BE\u6240", "Evacuate to the shelters"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u79D1\u5B66\u5BB6\u63D0\u8BAE\u4E00\u9879\u9AD8\u98CE\u9669\u5B9E\u9A8C", "Scientists propose a risky experiment"),
      t("\u6279\u51C6\u5B9E\u9A8C", "Approve the experiment"),
      [-1, -1, 0, 1],
      t("\u4F18\u5148\u4FDD\u969C\u5B89\u5168", "Prioritize colony safety"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u6C34\u57F9\u4ED3\u66B4\u53D1\u771F\u83CC\u611F\u67D3", "Hydroponic bay has a fungal outbreak"),
      t("\u711A\u6BC1\u5E76\u91CD\u65B0\u79CD\u690D", "Burn and replant everything"),
      [-1, -1, -1, 0],
      t("\u5C1D\u8BD5\u5B9E\u9A8C\u6027\u6740\u83CC\u5242", "Try experimental fungicide"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u8FDC\u7A0B\u626B\u63CF\u4EEA\u53D1\u73B0\u4E00\u8258\u8865\u7ED9\u8239", "A supply ship appears on long-range scanners"),
      t("\u6D88\u8017\u71C3\u6599\u524D\u5F80\u62E6\u622A", "Burn fuel to intercept it"),
      [-1, 1, 1, 0],
      t("\u8010\u5FC3\u7B49\u5F85", "Wait for it patiently"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u8239\u5458\u8BF7\u6C42\u4F11\u606F\u65E5", "Crew requests a recreation day"),
      t("\u6279\u51C6\u5168\u5929\u4F11\u5047", "Grant a full day off"),
      [-1, 0, 1, -1],
      t("\u5B89\u6392\u534A\u5929\u8F6E\u4F11", "Offer half-day rotations"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u9644\u8FD1\u53D1\u73B0\u5730\u70ED\u55B7\u53E3", "A geothermal vent is found nearby"),
      t("\u5F00\u91C7\u80FD\u6E90", "Tap it for energy"),
      [1, 0, -1, 0],
      t("\u91C7\u96C6\u7814\u7A76\u6570\u636E", "Study it for research data"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u751F\u547D\u7EF4\u6301\u7CFB\u7EDF\u4E8C\u6C27\u5316\u78B3\u6D53\u5EA6\u4E0A\u5347", "Life support CO2 levels are rising"),
      t("\u589E\u5F3A\u51C0\u5316\u5668\u529F\u7387", "Boost scrubber power"),
      [-1, 0, 1, 0],
      t("\u7D27\u6025\u79CD\u690D\u85FB\u7C7B", "Plant emergency algae crops"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u901A\u8BAF\u9635\u5217\u622A\u83B7\u4E00\u6BB5\u4FE1\u53F7", "Communication array picks up a signal"),
      t("\u8C03\u67E5\u4FE1\u53F7\u6765\u6E90", "Investigate the source"),
      [-1, 0, 0, 1],
      t("\u5E7F\u64AD\u4EE5\u9F13\u821E\u58EB\u6C14", "Broadcast it to boost morale"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u6C34\u5FAA\u73AF\u88C5\u7F6E\u6545\u969C", "Water recycler is failing"),
      t("\u5168\u529B\u7EF4\u4FEE\uFF0C\u8C03\u914D\u8D44\u6E90", "Full repair \u2014 divert resources"),
      [-1, -1, 0, 0],
      t("\u4E34\u65F6\u4FEE\u8865\u51D1\u5408", "Jury-rig a temporary fix"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u4E00\u540D\u8239\u5458\u60F3\u5F00\u8F9F\u82B1\u56ED", "A crew member wants to start a garden"),
      t("\u5206\u914D\u7A7A\u95F4\u548C\u79CD\u5B50", "Allocate space and seeds"),
      [-1, 1, 1, 0],
      t("\u62D2\u7EDD\uFF0C\u8D44\u6E90\u7D27\u5F20", "Deny \u2014 too many resources"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u5730\u8868\u53D1\u73B0\u65B0\u77FF\u85CF", "New mineral deposits found on the surface"),
      t("\u5F00\u91C7\u7528\u4E8E\u5EFA\u8BBE", "Mine for construction"),
      [1, 0, -1, 0],
      t("\u5206\u6790\u4EE5\u7814\u53D1\u65B0\u6280\u672F", "Analyze for new tech"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u7535\u7F51\u6EE1\u8D1F\u8377\u8FD0\u884C", "Power grid is running at full capacity"),
      t("\u4FEE\u5EFA\u65B0\u592A\u9633\u80FD\u9635\u5217", "Build a new solar array"),
      [-1, 0, 0, 1],
      t("\u5B9E\u65BD\u8F6E\u6D41\u505C\u7535", "Implement rolling blackouts"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u4E00\u540D\u8239\u5458\u751F\u65E5\u5C06\u81F3", "A crew birthday is coming up"),
      t("\u4E3E\u529E\u60CA\u559C\u6D3E\u5BF9", "Throw a surprise party"),
      [-1, -1, 1, 0],
      t("\u7167\u5E38\u5DE5\u4F5C", "Business as usual"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u539F\u578B\u805A\u53D8\u7535\u6C60\u53EF\u4EE5\u6D4B\u8BD5\u4E86", "Prototype fusion cell ready for testing"),
      t("\u7ACB\u5373\u6D4B\u8BD5", "Test it immediately"),
      [1, 0, -1, 1],
      t("\u5148\u8FDB\u884C\u66F4\u591A\u6A21\u62DF", "Run more simulations first"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u6C27\u6C14\u5FAA\u73AF\u6548\u7387\u4E0B\u964D", "Oxygen recycling efficiency is declining"),
      t("\u5168\u9762\u68C0\u4FEE\u7CFB\u7EDF", "Overhaul the system"),
      [-1, 0, -1, 1],
      t("\u591A\u79CD\u690D\u4F9B\u6C27\u690D\u7269", "Grow more oxygen plants"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u884C\u661F\u6838\u5FC3\u4F20\u6765\u5F02\u5E38\u8BFB\u6570", "Strange readings from the planet's core"),
      t("\u6D3E\u9063\u63A2\u6D4B\u961F", "Send a probe expedition"),
      [-1, 0, -1, 1],
      t("\u8FDC\u7A0B\u76D1\u63A7", "Monitor remotely"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u8239\u5458\u56E0\u5DE5\u4F5C\u8D1F\u62C5\u4EA7\u751F\u6469\u64E6", "Crew tensions rising over workload"),
      t("\u5F3A\u5236\u8F6E\u4F11\u5236\u5EA6", "Mandatory rest rotations"),
      [0, -1, 1, -1],
      t("\u53D1\u653E\u5956\u91D1\u6FC0\u52B1", "Incentivize with bonuses"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u65E7\u8BBE\u5907\u53EF\u4EE5\u62A5\u5E9F", "Old equipment can be scrapped"),
      t("\u62C6\u89E3\u83B7\u53D6\u539F\u6750\u6599", "Scrap for raw materials"),
      [1, 0, 0, -1],
      t("\u6539\u88C5\u7528\u4E8E\u7814\u7A76", "Repurpose for research"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u4E00\u9897\u51B0\u8D28\u5F57\u661F\u7ECF\u8FC7\u9644\u8FD1", "An ice comet passes within range"),
      t("\u91C7\u96C6\u6C34\u51B0\u7528\u4E8E\u79CD\u690D", "Harvest water ice for crops"),
      [0, 1, -1, 0],
      t("\u62CD\u6444\u7167\u7247\u9F13\u821E\u58EB\u6C14", "Photograph it for morale"),
      [0, 0, 1, 0]
    )
  ]
};
var pirateCaptain = {
  name: t("\u6D77\u76D7\u8239\u957F", "Pirate Captain"),
  labels: [t("\u91D1\u5E01", "Gold"), t("\u8239\u5458", "Crew"), t("\u8239\u51B5", "Ship"), t("\u58F0\u671B", "Reputation")],
  failLow: [
    t("\u4E00\u4E2A\u94DC\u677F\u4E0D\u5269\uFF0C\u8239\u5458\u54D7\u53D8\u3002", "Not a doubloon left. Your crew turns to mutiny."),
    t("\u8239\u4E0A\u7A7A\u65E0\u4E00\u4EBA\uFF0C\u4F60\u72EC\u81EA\u6F02\u6D41\u3002", "No crew remains. You drift alone into the abyss."),
    t("\u8239\u6C89\u6D77\u5E95\uFF0C\u4E00\u5207\u5316\u4E3A\u4E4C\u6709\u3002", "The ship sinks beneath the waves. All is lost."),
    t("\u4F60\u7684\u540D\u5B57\u88AB\u9057\u5FD8\uFF0C\u65E0\u6E2F\u53EF\u6CCA\u3002", "Your name is forgotten. No port will have you.")
  ],
  failHigh: [
    t("\u4F60\u7684\u5B9D\u85CF\u5F15\u6765\u4E86\u5404\u56FD\u6D77\u519B\u3002", "Your legendary hoard attracts every navy in the world."),
    t("\u8239\u4E0A\u6D77\u76D7\u592A\u591A\uFF0C\u5185\u8BA7\u4F7F\u4F60\u6C89\u8239\u3002", "Too many pirates aboard. Chaos and infighting sink you."),
    t("\u6218\u8230\u6210\u4E3A\u4F20\u5947\uFF0C\u5F15\u6765\u65E0\u5C3D\u6311\u6218\u8005\u3002", "The ship becomes a floating legend, drawing endless challengers."),
    t("\u6076\u540D\u60CA\u52A8\u7687\u5BB6\u8230\u961F\u5168\u9762\u8FFD\u527F\u3002", "Your infamy brings the entire royal armada after you.")
  ],
  scenarios: [
    sc(
      t("\u8FDC\u5904\u53D1\u73B0\u4E00\u8258\u5546\u8239", "A merchant vessel spotted on the horizon"),
      t("\u53D1\u8D77\u653B\u51FB\u63A0\u593A", "Attack and plunder"),
      [1, -1, -1, 1],
      t("\u6536\u53D6\u8FC7\u8DEF\u8D39\u653E\u884C", "Offer safe passage for a fee"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u5927\u526F\u63D0\u8BAE\u5236\u5B9A\u65B0\u8239\u89C4", "Your first mate proposes new crew rules"),
      t("\u5E73\u5206\u6218\u5229\u54C1", "Share the loot equally"),
      [-1, 1, 0, 0],
      t("\u94C1\u8155\u7EDF\u6CBB", "Rule with an iron fist"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u573A\u66B4\u98CE\u5373\u5C06\u6765\u88AD", "A fierce storm approaches"),
      t("\u76F4\u63A5\u7A7F\u8D8A\u98CE\u66B4", "Sail straight through it"),
      [0, -1, -1, 1],
      t("\u627E\u6D77\u6E7E\u907F\u98CE", "Seek shelter in a cove"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u6E2F\u53E3\u5C0F\u9547\u6B63\u5728\u4E3E\u884C\u5E86\u5178", "A port town is hosting a festival"),
      t("\u8BA9\u8239\u5458\u4E0A\u5CB8\u4F11\u606F", "Give crew shore leave"),
      [-1, 1, 0, 0],
      t("\u8D81\u9632\u5B88\u677E\u61C8\u7A81\u88AD", "Raid while defenses are down"),
      [1, -1, -1, 1]
    ),
    sc(
      t("\u8239\u8EAB\u9700\u8981\u4FEE\u7406", "The ship needs hull repairs"),
      t("\u82B1\u94B1\u8BF7\u4EBA\u4FEE\u7F2E", "Pay for proper repairs"),
      [-1, 0, 1, 0],
      t("\u8239\u5458\u81EA\u5DF1\u4FEE\u8865", "Crew patches it themselves"),
      [0, -1, 0, -1]
    ),
    sc(
      t("\u654C\u5BF9\u6D77\u76D7\u4E0B\u6218\u4E66", "Rival pirates challenge you to a duel"),
      t("\u63A5\u53D7\u6311\u6218", "Accept the challenge"),
      [0, 0, -1, 1],
      t("\u667A\u53D6\u5BF9\u624B", "Outsmart them instead"),
      [1, 1, 0, -1]
    ),
    sc(
      t("\u4E00\u5F20\u85CF\u5B9D\u56FE\u843D\u5165\u624B\u4E2D", "A treasure map falls into your hands"),
      t("\u7ACB\u5373\u5BFB\u5B9D", "Follow the map immediately"),
      [1, -1, -1, 0],
      t("\u5356\u7ED9\u51FA\u4EF7\u6700\u9AD8\u8005", "Sell it to the highest bidder"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u6D77\u519B\u5728\u9644\u8FD1\u5DE1\u903B", "Navy ships patrol nearby waters"),
      t("\u591C\u95F4\u6084\u6084\u6E9C\u8FC7", "Slip past under cover of night"),
      [0, 0, 1, 0],
      t("\u6B63\u9762\u4EA4\u950B", "Engage and show no fear"),
      [-1, -1, -1, 1]
    ),
    sc(
      t("\u7532\u677F\u4E0B\u53D1\u73B0\u5077\u6E21\u5BA2", "A stowaway is found below deck"),
      t("\u6536\u7F16\u5165\u4F19", "Welcome them aboard"),
      [0, 1, 0, -1],
      t("\u6D41\u653E\u8352\u5C9B", "Maroon them on an island"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u6717\u59C6\u9152\u5E93\u5B58\u89C1\u5E95", "Cargo hold is running low on rum"),
      t("\u5230\u4E0B\u4E2A\u6E2F\u53E3\u91C7\u8D2D", "Buy rum at the next port"),
      [-1, 1, 0, 0],
      t("\u7F29\u51CF\u914D\u7ED9", "Tighten rations"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u4FD8\u864F\u7684\u6C34\u624B\u613F\u610F\u63D0\u4F9B\u60C5\u62A5", "A captured sailor offers information"),
      t("\u91CA\u653E\u6362\u60C5\u62A5", "Free him for the intel"),
      [0, 0, 0, 1],
      t("\u7D22\u8981\u8D4E\u91D1", "Ransom him back"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u8239\u5E95\u957F\u6EE1\u85E4\u58F6\uFF0C\u901F\u5EA6\u4E0B\u964D", "Barnacles coat the hull, slowing you down"),
      t("\u9760\u5CB8\u6E05\u7406", "Beach the ship and scrape"),
      [0, -1, 1, 0],
      t("\u5148\u7EE7\u7EED\u822A\u884C", "Keep sailing, deal with it later"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u8D35\u65CF\u63D0\u4F9B\u96C7\u4F63\u5408\u540C", "A wealthy nobleman offers a contract"),
      t("\u63A5\u53D7\u79C1\u63A0\u4EFB\u52A1", "Accept the privateer job"),
      [1, 0, 0, 1],
      t("\u6D77\u76D7\u4E0D\u4E3A\u4EBA\u5356\u547D", "Pirates answer to no one"),
      [-1, 1, 0, 1]
    ),
    sc(
      t("\u8239\u5458\u8981\u9009\u4E3E\u65B0\u519B\u9700\u5B98", "Crew wants to elect a new quartermaster"),
      t("\u5141\u8BB8\u6295\u7968", "Allow the vote"),
      [0, 1, 0, 0],
      t("\u6307\u5B9A\u4F60\u7684\u5FC3\u8179", "Appoint your loyal ally"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u53D1\u73B0\u4E00\u5EA7\u6709\u91CE\u5473\u7684\u5C9B\u5C7F", "An island with wild game is spotted"),
      t("\u4E0A\u5CB8\u730E\u98DF", "Hunt and feast ashore"),
      [-1, 1, 0, 0],
      t("\u7EE7\u7EED\u8D76\u8DEF", "Press on to the next target"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u8258\u5E7D\u7075\u8239\u6F02\u5165\u89C6\u7EBF", "A ghost ship drifts into your path"),
      t("\u767B\u8239\u641C\u522E", "Board and salvage it"),
      [1, -1, 0, 0],
      t("\u907F\u5F00\uFF0C\u53EF\u80FD\u6709\u8BC5\u5492", "Avoid it \u2014 could be cursed"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u9886\u822A\u5458\u5EFA\u8BAE\u65B0\u822A\u7EBF", "Your navigator suggests a new route"),
      t("\u5C1D\u8BD5\u65B0\u8DEF\u7EBF", "Try the new route"),
      [1, 0, 1, 0],
      t("\u8D70\u8001\u8DEF", "Stick to known waters"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u4E00\u5EA7\u6D77\u5CB8\u5821\u5792\u9632\u5B88\u8584\u5F31", "A coastal fort has weak defenses"),
      t("\u53D1\u8D77\u7A81\u88AD", "Storm the fort"),
      [1, -1, -1, 1],
      t("\u7ED5\u9053\u907F\u9669", "Bypass and avoid the risk"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u9644\u8FD1\u4F20\u95FB\u6709\u6D77\u602A\u51FA\u6CA1", "A sea monster is rumored nearby"),
      t("\u730E\u6740\u4EE5\u626C\u540D", "Hunt it for glory"),
      [0, -1, -1, 1],
      t("\u6539\u53D8\u822A\u7EBF", "Change course to safety"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u63A0\u6765\u7684\u8D27\u7269\u9700\u8981\u51FA\u624B", "Captured loot needs to be fenced"),
      t("\u5728\u9ED1\u5E02\u51FA\u552E", "Sell at a shady port"),
      [1, 0, -1, -1],
      t("\u7B49\u66F4\u597D\u7684\u4E70\u5BB6", "Wait for a better buyer"),
      [0, 0, 0, 1]
    )
  ]
};
var startupCeo = {
  name: t("\u521B\u4E1A\u516C\u53F8", "Startup CEO"),
  labels: [t("\u8D44\u91D1", "Funding"), t("\u56E2\u961F", "Team"), t("\u4EA7\u54C1", "Product"), t("\u7528\u6237", "Users")],
  failLow: [
    t("\u516C\u53F8\u8D44\u91D1\u8017\u5C3D\uFF0C\u6C38\u8FDC\u5173\u95E8\u5927\u5409\u3002", "The company runs out of money. Doors close forever."),
    t("\u6240\u6709\u4EBA\u8F9E\u804C\uFF0C\u521B\u4E1A\u516C\u53F8\u65E0\u4EBA\u53EF\u7528\u3002", "Everyone quits. The startup dies with no one left."),
    t("\u4EA7\u54C1\u65E0\u6CD5\u4F7F\u7528\uFF0C\u7528\u6237\u7EB7\u7EB7\u79BB\u5F00\u3002", "The product is unusable. Users abandon ship."),
    t("\u7528\u6237\u5F52\u96F6\uFF0C\u6295\u8D44\u4EBA\u64A4\u8D44\u3002", "Zero users remain. Investors pull the plug.")
  ],
  failHigh: [
    t("\u6295\u8D44\u4EBA\u593A\u53D6\u63A7\u5236\u6743\uFF0C\u521B\u59CB\u4EBA\u88AB\u8E22\u51FA\u5C40\u3002", "Investors seize control. The founder is ousted."),
    t("\u56E2\u961F\u8FC7\u4E8E\u5E9E\u5927\uFF0C\u5B98\u50DA\u4E3B\u4E49\u627C\u6740\u521B\u65B0\u3002", "The team is too large to manage. Bureaucracy kills innovation."),
    t("\u8FC7\u5EA6\u8BBE\u8BA1\uFF0C\u4EA7\u54C1\u5728\u590D\u6742\u6027\u4E2D\u5D29\u6E83\u3002", "Over-engineering collapses under its own complexity."),
    t("\u7206\u53D1\u5F0F\u589E\u957F\u538B\u57AE\u670D\u52A1\u5668\uFF0C\u516C\u53F8\u5D29\u76D8\u3002", "Hypergrowth crashes the servers. The company implodes.")
  ],
  scenarios: [
    sc(
      t("\u6295\u8D44\u4EBA\u9012\u6765\u6295\u8D44\u610F\u5411\u4E66", "An investor offers a term sheet"),
      t("\u63A5\u53D7\u878D\u8D44", "Accept the funding"),
      [1, 0, 0, 0],
      t("\u4E89\u53D6\u66F4\u597D\u6761\u4EF6", "Negotiate harder terms"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u6838\u5FC3\u5DE5\u7A0B\u5E08\u5A01\u80C1\u8F9E\u804C", "A key engineer threatens to quit"),
      t("\u7ED9\u4ED6\u52A0\u85AA", "Give them a raise"),
      [-1, 1, 0, 0],
      t("\u653E\u4ED6\u8D70\uFF0C\u62DB\u66F4\u4FBF\u5B9C\u7684", "Let them go, hire cheaper"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u7528\u6237\u53CD\u9988\u4E25\u91CDbug", "Users report a major bug"),
      t("\u505C\u4E0B\u4E00\u5207\u7D27\u6025\u4FEE\u590D", "Drop everything to fix it"),
      [0, -1, 1, 1],
      t("\u6392\u5230\u4E0B\u4E2A\u8FED\u4EE3", "Schedule it for next sprint"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u7ADE\u4E89\u5BF9\u624B\u63A8\u51FA\u540C\u7C7B\u4EA7\u54C1", "A competitor launches a rival product"),
      t("\u4EF7\u683C\u6218", "Undercut their pricing"),
      [-1, 0, 1, 1],
      t("\u52A0\u7D27\u5F00\u53D1\u529F\u80FD", "Double down on features"),
      [-1, -1, 1, 0]
    ),
    sc(
      t("\u884C\u4E1A\u5927\u4F1A\u8D5E\u52A9\u673A\u4F1A", "Conference sponsorship opportunity"),
      t("\u8D5E\u52A9\u53C2\u5C55", "Sponsor the event"),
      [-1, 1, 0, 1],
      t("\u7701\u94B1\u4E0D\u53BB", "Skip it and save money"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u56E2\u961F\u63D0\u8BAE\u5927\u5E45\u8F6C\u578B", "The team proposes a risky pivot"),
      t("\u6279\u51C6\u8F6C\u578B", "Approve the pivot"),
      [-1, 0, 1, -1],
      t("\u575A\u6301\u5F53\u524D\u65B9\u5411", "Stay the current course"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u77E5\u540D\u79D1\u6280\u535A\u5BA2\u60F3\u91C7\u8BBF", "A famous tech blog wants an interview"),
      t("\u63A5\u53D7\u91C7\u8BBF", "Do the interview"),
      [0, 0, -1, 1],
      t("\u4E13\u5FC3\u505A\u4EA7\u54C1", "Focus on building instead"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u670D\u52A1\u5668\u6210\u672C\u8D85\u51FA\u9884\u671F", "Server costs are higher than expected"),
      t("\u4F18\u5316\u57FA\u7840\u8BBE\u65BD", "Optimize infrastructure"),
      [0, -1, 1, 0],
      t("\u5411\u4ED8\u8D39\u7528\u6237\u8F6C\u5AC1\u6210\u672C", "Pass costs to premium users"),
      [1, 0, -1, 0]
    ),
    sc(
      t("\u6F5C\u5728\u6536\u8D2D\u65B9\u627E\u4E0A\u95E8", "A potential acquirer reaches out"),
      t("\u8003\u8651\u6536\u8D2D", "Explore the offer"),
      [1, -1, 0, 0],
      t("\u4FDD\u6301\u72EC\u7ACB", "Stay independent"),
      [0, 1, 0, 0]
    ),
    sc(
      t("\u5F00\u6E90\u793E\u533A\u60F3\u53C2\u4E0E\u8D21\u732E", "Open-source community wants to contribute"),
      t("\u6B22\u8FCE\u8D21\u732E\u8005", "Welcome contributors"),
      [0, -1, 1, 1],
      t("\u4FDD\u6301\u4EE3\u7801\u95ED\u6E90", "Keep the codebase private"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u4EA7\u54C1\u53D1\u5E03\u65E5\u5230\u4E86", "Product launch day has arrived"),
      t("\u5927\u89C4\u6A21\u8425\u9500\u53D1\u5E03", "Launch with marketing blitz"),
      [-1, 0, 0, 1],
      t("\u5C0F\u8303\u56F4\u5185\u6D4B", "Soft launch to test waters"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u56E2\u961F\u60F3\u5168\u9762\u8FDC\u7A0B\u529E\u516C", "Team wants to work remotely full-time"),
      t("\u5168\u9762\u8FDC\u7A0B", "Go fully remote"),
      [1, 1, -1, 0],
      t("\u6DF7\u5408\u529E\u516C", "Require hybrid schedule"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u4E2A\u5E73\u53F0\u63D0\u4F9BAPI\u5408\u4F5C", "A platform offers API partnership"),
      t("\u7ACB\u5373\u63A5\u5165", "Integrate immediately"),
      [0, -1, 0, 1],
      t("\u5148\u8C08\u5206\u6210", "Negotiate revenue share first"),
      [1, 0, -1, 0]
    ),
    sc(
      t("\u7528\u6237\u589E\u957F\u9677\u5165\u74F6\u9888", "User growth is plateauing"),
      t("\u63A8\u51FA\u63A8\u8350\u5956\u52B1\u8BA1\u5212", "Launch a referral program"),
      [-1, 0, 0, 1],
      t("\u6539\u5584\u7559\u5B58\u529F\u80FD", "Improve retention features"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u9AD8\u5F3A\u5EA6\u52A0\u73ED\u540E\u56E2\u961F\u58EB\u6C14\u4F4E\u843D", "Team morale is slipping after crunch"),
      t("\u7EC4\u7EC7\u56E2\u5EFA\u6D3B\u52A8", "Host a team retreat"),
      [-1, 1, -1, 0],
      t("\u627F\u8BFA\u671F\u6743\u6FC0\u52B1", "Promise equity refresh"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u6280\u672F\u503A\u52A1\u5806\u79EF\u5982\u5C71", "Technical debt is piling up"),
      t("\u6682\u505C\u529F\u80FD\uFF0C\u91CD\u6784\u4EE3\u7801", "Pause features for refactoring"),
      [0, 1, 1, -1],
      t("\u7EE7\u7EED\u8D76\u5DE5\u53D1\u5E03", "Keep shipping features"),
      [0, -1, -1, 1]
    ),
    sc(
      t("\u540D\u4EBA\u5728\u793E\u4EA4\u5A92\u4F53\u63D0\u5230\u4F60\u7684\u4EA7\u54C1", "A celebrity tweets about your product"),
      t("\u8D81\u70ED\u6253\u94C1\u505A\u8425\u9500", "Capitalize with a campaign"),
      [-1, 0, -1, 1],
      t("\u8BA9\u70ED\u5EA6\u81EA\u7136\u53D1\u9175", "Let organic buzz grow"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u65B0\u9690\u79C1\u6CD5\u89C4\u751F\u6548", "New privacy regulations take effect"),
      t("\u5168\u9762\u5408\u89C4\u6295\u5165", "Invest in full compliance"),
      [-1, -1, 1, 0],
      t("\u505A\u6700\u4F4E\u9650\u5EA6\u5E94\u5BF9", "Do the minimum required"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u81EA\u7531\u8BBE\u8BA1\u5E08\u6BDB\u9042\u81EA\u8350", "A freelance designer offers help"),
      t("\u8058\u7528\u5E76\u91CD\u65B0\u8BBE\u8BA1UI", "Accept and redesign the UI"),
      [0, 0, 1, 1],
      t("\u4FDD\u6301\u73B0\u6709\u8BBE\u8BA1", "Keep the current look"),
      [0, 0, 0, 0]
    ),
    sc(
      t("\u8463\u4E8B\u4F1A\u4F1A\u8BAE\u4E34\u8FD1", "Board meeting is approaching"),
      t("\u5C55\u793A\u589E\u957F\u8BA1\u5212", "Pitch a growth-focused plan"),
      [-1, -1, 0, 1],
      t("\u5C55\u793A\u76C8\u5229\u6570\u636E", "Show profitability metrics"),
      [1, 0, -1, 0]
    )
  ]
};
var wizardAcademy = {
  name: t("\u9B54\u6CD5\u5B66\u9662", "Wizard Academy"),
  labels: [t("\u9B54\u529B", "Mana"), t("\u5B66\u8BC6", "Knowledge"), t("\u5B66\u751F", "Students"), t("\u58F0\u671B", "Prestige")],
  failLow: [
    t("\u9B54\u529B\u4E4B\u6CC9\u67AF\u7AED\uFF0C\u6CD5\u672F\u5931\u7075\uFF0C\u5B66\u9662\u574D\u584C\u3002", "The mana well runs dry. Spells fail and the academy crumbles."),
    t("\u6240\u6709\u77E5\u8BC6\u5931\u4F20\uFF0C\u5B66\u9662\u9677\u5165\u8499\u6627\u3002", "All knowledge is lost. The academy sinks into ignorance."),
    t("\u6700\u540E\u4E00\u540D\u5B66\u751F\u79BB\u53BB\uFF0C\u5B66\u9662\u7A7A\u8361\u8361\u3002", "The last student leaves. The halls stand empty forever."),
    t("\u5B66\u9662\u58F0\u8A89\u5C3D\u6BC1\uFF0C\u88AB\u8FEB\u5173\u95ED\u3002", "The academy's reputation is ruined. It shuts its doors.")
  ],
  failHigh: [
    t("\u5931\u63A7\u7684\u9B54\u529B\u6495\u88C2\u4E86\u901A\u5F80\u5F02\u754C\u7684\u88C2\u7F1D\u3002", "Uncontrolled mana tears a rift to another dimension."),
    t("\u7981\u5FCC\u77E5\u8BC6\u5C06\u5B66\u8005\u4EEC\u903C\u5165\u75AF\u72C2\u3002", "Forbidden knowledge drives the scholars to madness."),
    t("\u5B66\u751F\u8FC7\u591A\u5BFC\u81F4\u6DF7\u4E71\uFF0C\u6821\u56ED\u4E0D\u53EF\u6536\u62FE\u3002", "Overcrowding leads to chaos. The campus is unmanageable."),
    t("\u50B2\u6162\u8499\u853D\u4E86\u8BC4\u8BAE\u4F1A\uFF0C\u88AB\u654C\u6821\u5077\u88AD\u3002", "Arrogance blinds the council. A rival school strikes.")
  ],
  scenarios: [
    sc(
      t("\u4E00\u672C\u73CD\u7A00\u6CD5\u672F\u4E66\u6B63\u5728\u62CD\u5356", "A rare spellbook is up for auction"),
      t("\u79EF\u6781\u7ADE\u62CD", "Bid aggressively"),
      [-1, 1, 0, 0],
      t("\u8BA9\u5BF9\u624B\u5B66\u9662\u62CD\u53BB", "Let a rival school win it"),
      [0, -1, 0, -1]
    ),
    sc(
      t("\u6821\u9645\u9B54\u6CD5\u9526\u6807\u8D5B\u5F00\u8D5B", "Inter-school magic tournament announced"),
      t("\u6D3E\u6700\u4F18\u79C0\u7684\u5B66\u751F\u53C2\u8D5B", "Enter your best students"),
      [0, 0, -1, 1],
      t("\u4E13\u6CE8\u8BFE\u5802\u6559\u5B66", "Focus on classroom teaching"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u6821\u56ED\u4E0B\u65B9\u7684\u7075\u8109\u6CE2\u52A8\u5F02\u5E38", "A ley line beneath campus is fluctuating"),
      t("\u6C72\u53D6\u80FD\u91CF", "Harness the surge"),
      [1, 0, -1, 0],
      t("\u5B89\u5168\u5730\u7A33\u5B9A\u5B83", "Stabilize it safely"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u6821\u53CB\u63D0\u4F9B\u5927\u7B14\u6350\u8D60", "Alumni offer a large donation"),
      t("\u63A5\u53D7\u9644\u5E26\u6761\u4EF6\u7684\u6350\u8D60", "Accept with their conditions"),
      [1, -1, 1, 0],
      t("\u5A49\u62D2\u4EE5\u4FDD\u6301\u72EC\u7ACB", "Decline to preserve independence"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u4E00\u540D\u5B66\u751F\u610F\u5916\u53EC\u5524\u51FA\u6076\u9B54", "A student accidentally summons a demon"),
      t("\u6D88\u8017\u9B54\u529B\u9A71\u9010", "Banish it with academy mana"),
      [-1, 1, 0, 1],
      t("\u758F\u6563\u5E76\u5C01\u9501", "Evacuate and contain"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u6E38\u5386\u8D24\u8005\u613F\u6765\u8BB2\u5B66", "A wandering sage offers to lecture"),
      t("\u9080\u8BF7\u4ED6\u9A7B\u6821\u4E00\u5B66\u671F", "Invite them for a semester"),
      [-1, 1, 1, 0],
      t("\u5A49\u62D2\uFF0C\u540D\u989D\u5DF2\u6EE1", "Politely decline \u2014 full roster"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u9B54\u6CD5\u56FE\u4E66\u9986\u6B63\u5728\u8001\u5316", "The enchanted library is decaying"),
      t("\u5168\u9762\u4FEE\u590D", "Fund full restoration"),
      [-1, 1, 0, 0],
      t("\u5C06\u85CF\u4E66\u8F6C\u79FB\u4ED6\u5904", "Transfer books elsewhere"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u654C\u5BF9\u5B66\u9662\u6316\u8D70\u4F60\u7684\u6559\u6388", "A rival school poaches your professor"),
      t("\u52A0\u85AA\u633D\u7559", "Counter-offer with more pay"),
      [-1, 1, 0, 1],
      t("\u5185\u90E8\u63D0\u62D4", "Promote from within"),
      [0, -1, 1, -1]
    ),
    sc(
      t("\u5B66\u751F\u8BF7\u613F\u5F00\u8BBE\u5B9E\u8DF5\u8BFE", "Students petition for practical classes"),
      t("\u589E\u8BBE\u6218\u6597\u9B54\u6CD5\u8BFE", "Add combat magic courses"),
      [-1, 0, 1, 0],
      t("\u575A\u6301\u7406\u8BBA\u6559\u5B66", "Maintain theoretical focus"),
      [0, 1, -1, 1]
    ),
    sc(
      t("\u6821\u56ED\u4E2D\u51FA\u571F\u4E00\u4EF6\u5F3A\u529B\u795E\u5668", "A powerful artifact is unearthed on campus"),
      t("\u9001\u5165\u5B9E\u9A8C\u5BA4\u7814\u7A76", "Study it in the lab"),
      [0, 1, -1, 1],
      t("\u5438\u6536\u5176\u9B54\u529B\u50A8\u5907", "Absorb its mana reserves"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u5165\u5B66\u7533\u8BF7\u8702\u62E5\u800C\u81F3", "Enrollment applications flood in"),
      t("\u6269\u5927\u62DB\u751F", "Accept more students"),
      [-1, 0, 1, 0],
      t("\u63D0\u9AD8\u5165\u5B66\u95E8\u69DB", "Raise admission standards"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u4E00\u573A\u9B54\u6CD5\u761F\u75AB\u4FB5\u88AD\u5B66\u751F", "A magical plague affects students"),
      t("\u9694\u79BB\u6551\u6CBB", "Quarantine and heal them"),
      [-1, 0, 1, 0],
      t("\u7814\u7A76\u6C38\u4E45\u6CBB\u6108\u4E4B\u6CD5", "Research a permanent cure"),
      [-1, -1, -1, 1]
    ),
    sc(
      t("\u5E74\u5EA6\u9B54\u529B\u6C34\u6676\u91C7\u6536\u5C06\u81F3", "Annual mana crystal harvest approaches"),
      t("\u52A0\u500D\u91C7\u6536", "Double the harvest"),
      [1, 0, -1, -1],
      t("\u53EF\u6301\u7EED\u91C7\u6536", "Harvest sustainably"),
      [0, 0, 1, 1]
    ),
    sc(
      t("\u4E00\u4E2A\u8D35\u65CF\u5BB6\u5EAD\u8981\u6C42\u5165\u5B66\u7279\u6743", "A noble family wants their child enrolled"),
      t("\u7834\u683C\u5F55\u53D6\u5E76\u7ED9\u4E88\u5956\u5B66\u91D1", "Admit with a scholarship"),
      [-1, 0, 1, 1],
      t("\u8981\u6C42\u6807\u51C6\u8003\u6838", "Require standard testing"),
      [0, 0, 0, 0]
    ),
    sc(
      t("\u6709\u4EBA\u63D0\u8BAE\u4E00\u9879\u7981\u5FCC\u5B9E\u9A8C", "A forbidden experiment is proposed"),
      t("\u79D8\u5BC6\u6279\u51C6", "Approve it secretly"),
      [-1, 1, 0, -1],
      t("\u516C\u5F00\u7981\u6B62", "Ban it publicly"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u9B54\u529B\u4E4B\u6CC9\u5373\u5C06\u67AF\u7AED", "The mana well is running dry"),
      t("\u5BFB\u627E\u65B0\u9B54\u529B\u6E90", "Seek a new mana source"),
      [-1, 0, 0, 1],
      t("\u9650\u91CF\u914D\u7ED9", "Ration mana for essentials"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u4E00\u53EA\u5E7D\u7075\u51FA\u6CA1\u5BBF\u820D", "A ghost haunts the dormitory"),
      t("\u4EE5\u4EEA\u5F0F\u9A71\u9010", "Exorcise it with a ritual"),
      [-1, 1, 1, 0],
      t("\u7559\u4E0B\u6765\u7814\u7A76", "Study it for research"),
      [0, 1, -1, 0]
    ),
    sc(
      t("\u6CD5\u5E08\u8BC4\u8BAE\u4F1A\u9080\u8BF7\u53C2\u52A0\u5CF0\u4F1A", "Council of Mages invites you to a summit"),
      t("\u4EB2\u81EA\u51FA\u5E2D", "Attend and network"),
      [-1, 0, -1, 1],
      t("\u6D3E\u4EE3\u8868\u524D\u5F80", "Send a representative"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u5B66\u751F\u53D1\u73B0\u4E00\u6761\u9690\u79D8\u901A\u9053", "Students discover a hidden passage"),
      t("\u63A2\u7D22\u5E76\u8BB0\u5F55", "Explore and document it"),
      [0, 1, 1, 0],
      t("\u5C01\u95ED\u4EE5\u4FDD\u5B89\u5168", "Seal it for safety"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u8BFE\u5802\u4E0A\u4E00\u573A\u9B54\u6CD5\u51B3\u6597\u5931\u63A7", "A magical duel goes wrong in class"),
      t("\u5F00\u9664\u8087\u4E8B\u5B66\u751F", "Expel the responsible student"),
      [0, 0, -1, 1],
      t("\u4F5C\u4E3A\u6559\u5B66\u6848\u4F8B", "Use it as a teaching moment"),
      [-1, 1, 1, -1]
    )
  ]
};
var zombieSurvival = {
  name: t("\u672B\u65E5\u6C42\u751F", "Zombie Survival"),
  labels: [t("\u7269\u8D44", "Supplies"), t("\u6B66\u5668", "Weapons"), t("\u5E78\u5B58\u8005", "Survivors"), t("\u5E0C\u671B", "Hope")],
  failLow: [
    t("\u7269\u8D44\u8017\u5C3D\uFF0C\u9965\u997F\u541E\u566C\u4E86\u8425\u5730\u3002", "No supplies left. Starvation claims the camp."),
    t("\u624B\u65E0\u5BF8\u94C1\uFF0C\u8425\u5730\u88AB\u4E27\u5C38\u653B\u9677\u3002", "Defenseless against the horde. The camp is overrun."),
    t("\u65E0\u4EBA\u751F\u8FD8\uFF0C\u6700\u540E\u7684\u706F\u706B\u7184\u706D\u3002", "No one is left. The last light goes out."),
    t("\u5E0C\u671B\u7834\u706D\uFF0C\u5E78\u5B58\u8005\u56DB\u6563\u9003\u5165\u8352\u91CE\u3002", "All hope is lost. The survivors scatter into the wasteland.")
  ],
  failHigh: [
    t("\u8FC7\u5EA6\u56E4\u79EF\u5F15\u6765\u532A\u5E2E\uFF0C\u4E00\u5207\u88AB\u593A\u8D70\u3002", "Hoarding attracts raiders. They take everything by force."),
    t("\u8D70\u706B\u5F15\u53D1\u707E\u96BE\u6027\u7206\u70B8\u3002", "An accidental discharge triggers a catastrophic explosion."),
    t("\u4EBA\u53E3\u8FC7\u591A\uFF0C\u8425\u5730\u5728\u81EA\u8EAB\u91CD\u538B\u4E0B\u5D29\u6E83\u3002", "Too many mouths. The camp collapses under its own weight."),
    t("\u76F2\u76EE\u81EA\u4FE1\u5BFC\u81F4\u9C81\u83BD\u884C\u52A8\uFF0C\u917F\u6210\u5927\u7978\u3002", "Overconfidence leads to a reckless mission. It ends in disaster.")
  ],
  scenarios: [
    sc(
      t("\u4E24\u4E2A\u8857\u533A\u5916\u53D1\u73B0\u4E00\u5BB6\u8D85\u5E02", "A supermarket is spotted two blocks away"),
      t("\u5168\u5458\u51FA\u52A8\u5927\u641C\u522E", "Send everyone for a big haul"),
      [1, 0, -1, 0],
      t("\u6D3E\u5C0F\u961F\u8C28\u614E\u884C\u52A8", "Send a small careful team"),
      [0, 0, 1, 1]
    ),
    sc(
      t("\u4E00\u7FA4\u5E78\u5B58\u8005\u5728\u5C4B\u9876\u6C42\u6551", "A survivor group signals from a rooftop"),
      t("\u5C1D\u8BD5\u8425\u6551", "Attempt a rescue"),
      [-1, -1, 1, 1],
      t("\u53EF\u80FD\u662F\u9677\u9631\uFF0C\u4E0D\u7406\u4F1A", "It could be a trap \u2014 ignore it"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u8425\u5730\u6C34\u6E90\u88AB\u6C61\u67D3", "The camp's water supply is contaminated"),
      t("\u70E7\u6C34\u5E76\u4E25\u683C\u914D\u7ED9", "Boil all water, ration carefully"),
      [-1, 0, -1, 0],
      t("\u5BFB\u627E\u65B0\u6C34\u6E90", "Search for a new source"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u9644\u8FD1\u6709\u4E00\u8F86\u519B\u7528\u8F66\u6B8B\u9AB8", "A military convoy wreck is nearby"),
      t("\u641C\u522E\u6B66\u5668\u5F39\u836F", "Scavenge weapons and ammo"),
      [0, 1, -1, 0],
      t("\u62C6\u5378\u83B7\u53D6\u7269\u8D44", "Strip it for supplies instead"),
      [1, 0, 0, 0]
    ),
    sc(
      t("\u4E00\u4E2A\u964C\u751F\u4EBA\u63D0\u51FA\u4EA4\u6613", "A stranger approaches with a trade offer"),
      t("\u7528\u7269\u8D44\u6362\u6B66\u5668", "Trade supplies for weapons"),
      [-1, 1, 0, 0],
      t("\u62D2\u7EDD\uFF0C\u8C01\u4E5F\u4E0D\u4FE1", "Refuse \u2014 trust no one"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u4E27\u5C38\u5728\u4E1C\u5899\u5916\u96C6\u7ED3", "Zombies are massing near the east wall"),
      t("\u52A0\u56FA\u9632\u7EBF\u5E94\u6218", "Fortify and fight"),
      [0, -1, 0, 1],
      t("\u64A4\u9000\u81F3\u5907\u7528\u636E\u70B9", "Evacuate to backup location"),
      [-1, 0, -1, 0]
    ),
    sc(
      t("\u5728\u5EFA\u7B51\u7269\u4E2D\u53D1\u73B0\u4E00\u4E2A\u5C0F\u5B69", "A child is found hiding in a building"),
      t("\u6536\u7559", "Take them in"),
      [-1, 0, 1, 1],
      t("\u7ED9\u4E9B\u98DF\u7269\u8BA9\u4ED6\u79BB\u5F00", "Give food and send them away"),
      [-1, 0, -1, 0]
    ),
    sc(
      t("\u65E7\u7535\u53F0\u6536\u5230\u4E00\u6BB5\u5750\u6807\u5E7F\u64AD", "An old radio broadcast gives coordinates"),
      t("\u524D\u5F80\u8C03\u67E5", "Investigate the signal"),
      [-1, 0, -1, 1],
      t("\u7559\u5B88\uFF0C\u592A\u5371\u9669\u4E86", "Stay put \u2014 too risky"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u591C\u88AD\u6108\u53D1\u9891\u7E41", "Night raids are getting more frequent"),
      t("\u589E\u52A0\u54E8\u5175", "Post extra guards"),
      [0, -1, 0, 1],
      t("\u5728\u5468\u56F4\u5E03\u8BBE\u9677\u9631", "Set traps around the perimeter"),
      [0, 1, -1, 0]
    ),
    sc(
      t("\u836F\u54C1\u544A\u6025", "Medicine is running dangerously low"),
      t("\u7A81\u88AD\u9644\u8FD1\u836F\u623F", "Raid the nearby pharmacy"),
      [1, 0, -1, 0],
      t("\u7528\u8349\u836F\u66FF\u4EE3", "Use herbal remedies"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u4E00\u540D\u88AB\u54AC\u7684\u5E78\u5B58\u8005\u9690\u7792\u4F24\u53E3", "A bitten survivor hides their wound"),
      t("\u9694\u79BB\u5E76\u5584\u5F85", "Quarantine them with compassion"),
      [-1, 0, 0, 1],
      t("\u7ACB\u5373\u9A71\u9010", "Exile them immediately"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u66B4\u96E8\u6DF9\u6CA1\u8425\u5730", "Rain floods the camp"),
      t("\u8F6C\u79FB\u5230\u9AD8\u5730", "Move to higher ground"),
      [-1, 0, -1, 0],
      t("\u6316\u6392\u6C34\u6C9F\u7559\u5B88", "Dig drainage and stay"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u53E6\u4E00\u4E2A\u56E2\u4F53\u63D0\u8BAE\u5408\u5E76\u8425\u5730", "Another group proposes merging camps"),
      t("\u5408\u5E76\u5171\u4EAB\u8D44\u6E90", "Merge and share resources"),
      [-1, -1, 1, 1],
      t("\u4FDD\u6301\u72EC\u7ACB", "Stay independent"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u53D1\u7535\u673A\u71C3\u6599\u5373\u5C06\u8017\u5C3D", "Generator fuel is running out"),
      t("\u4ECE\u5E9F\u5F03\u8F66\u8F86\u4E2D\u62BD\u53D6", "Siphon from abandoned cars"),
      [1, 0, -1, 0],
      t("\u5173\u706F\u8282\u7EA6", "Go dark and conserve"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u4E00\u5927\u7FA4\u4E27\u5C38\u6B63\u671D\u8FD9\u91CC\u79FB\u52A8", "A zombie horde is heading this way"),
      t("\u6B8A\u6B7B\u62B5\u6297", "Stand and fight"),
      [0, -1, -1, 1],
      t("\u64A4\u79BB\u5BFB\u627E\u65B0\u5E87\u62A4\u6240", "Flee and find new shelter"),
      [-1, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u53EA\u72D7\u8D70\u8FDB\u4E86\u8425\u5730", "A dog wanders into camp"),
      t("\u6536\u517B\u4F5C\u4E3A\u54E8\u5175", "Adopt it as a lookout"),
      [-1, 0, 1, 1],
      t("\u8D76\u8D70\u5B83", "Shoo it away"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u6709\u4EBA\u53D1\u73B0\u4E00\u8F86\u80FD\u5F00\u7684\u8F66", "Someone finds a working car"),
      t("\u7528\u4E8E\u7269\u8D44\u8FD0\u8F93", "Use it for supply runs"),
      [1, 0, -1, 0],
      t("\u7559\u4F5C\u7D27\u6025\u64A4\u79BB", "Save it for emergency escape"),
      [0, 0, 1, 1]
    ),
    sc(
      t("\u51AC\u5929\u5373\u5C06\u6765\u4E34", "Winter is approaching fast"),
      t("\u56E4\u79EF\u67F4\u706B\u548C\u6BDB\u6BEF", "Stockpile firewood and blankets"),
      [-1, 0, 1, 0],
      t("\u52A0\u56FA\u4F4F\u6240", "Build better shelter instead"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u5F20\u5730\u56FE\u6807\u6CE8\u4E86\u4F20\u95FB\u4E2D\u7684\u5B89\u5168\u533A", "A map shows a rumored safe zone"),
      t("\u51FA\u53D1\u5BFB\u627E", "Set out to find it"),
      [-1, 0, -1, 1],
      t("\u52A0\u5F3A\u73B0\u6709\u9632\u5FA1", "Improve current defenses"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u5730\u4E0B\u5BA4\u53D1\u73B0\u4E00\u6279\u7F50\u5934", "Canned food cache found in a basement"),
      t("\u5E73\u5206\u7ED9\u6BCF\u4E2A\u4EBA", "Share equally with everyone"),
      [1, 0, 1, 0],
      t("\u4E25\u683C\u914D\u7ED9", "Ration it strictly"),
      [1, 0, -1, 0]
    )
  ]
};
var restaurantOwner = {
  name: t("\u9910\u5385\u7ECF\u8425", "Restaurant Owner"),
  labels: [t("\u8D44\u91D1", "Money"), t("\u5458\u5DE5", "Staff"), t("\u5BA2\u6D41", "Customers"), t("\u53E3\u7891", "Reviews")],
  failLow: [
    t("\u7834\u4EA7\u4E86\uFF0C\u9910\u5385\u6C38\u8FDC\u5173\u95E8\u3002", "Bankrupt. The restaurant closes its doors for good."),
    t("\u53A8\u5E08\u670D\u52A1\u5458\u5168\u8D70\u4E86\uFF0C\u540E\u53A8\u51B7\u9505\u51B7\u7076\u3002", "No one left to cook or serve. The kitchen goes cold."),
    t("\u6BCF\u665A\u7A7A\u65E0\u4E00\u4EBA\uFF0C\u4EA4\u4E0D\u8D77\u623F\u79DF\u3002", "Empty tables every night. You can't pay the rent."),
    t("\u5DEE\u8BC4\u94FA\u5929\u76D6\u5730\uFF0C\u65E0\u4EBA\u613F\u6765\u7528\u9910\u3002", "Devastating reviews go viral. No one will eat here.")
  ],
  failHigh: [
    t("\u7A0E\u52A1\u7A3D\u67E5\u53D1\u73B0\u8D26\u76EE\u95EE\u9898\uFF0C\u9762\u4E34\u6CD5\u5F8B\u5371\u673A\u3002", "Tax audit reveals irregular books. You face legal ruin."),
    t("\u4EBA\u5458\u8FC7\u5269\u6D88\u8017\u8D44\u91D1\uFF0C\u88C1\u5458\u91CD\u521B\u58EB\u6C14\u3002", "Overstaffing bleeds money dry. Layoffs destroy morale."),
    t("\u9700\u6C42\u66B4\u589E\u628A\u56E2\u961F\u7D2F\u57AE\uFF0C\u54C1\u8D28\u6025\u5267\u4E0B\u964D\u3002", "Overwhelming demand burns out the team. Quality collapses."),
    t("\u7092\u4F5C\u8FC7\u5EA6\u8131\u79BB\u5B9E\u9645\uFF0C\u53CD\u566C\u53C8\u5FEB\u53C8\u731B\u3002", "The hype exceeds reality. The backlash is swift and brutal.")
  ],
  scenarios: [
    sc(
      t("\u4ECA\u665A\u6709\u7F8E\u98DF\u8BC4\u8BBA\u5BB6\u6765\u7528\u9910", "A food critic is dining tonight"),
      t("\u5168\u529B\u4EE5\u8D74", "Pull out all the stops"),
      [-1, -1, 0, 1],
      t("\u7167\u5E38\u51FA\u54C1", "Serve the regular menu"),
      [0, 0, 0, -1]
    ),
    sc(
      t("\u660E\u661F\u53A8\u5E08\u63D0\u8BAE\u5408\u4F5C", "A celebrity chef offers a collaboration"),
      t("\u8054\u5408\u4E3E\u529E\u7279\u522B\u6D3B\u52A8", "Co-host a special event"),
      [-1, 1, 1, 1],
      t("\u5A49\u62D2\uFF0C\u4FDD\u6301\u672C\u8272", "Decline \u2014 stay authentic"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u79DF\u7EA6\u7EED\u7B7E\u5728\u5373", "The lease renewal is coming up"),
      t("\u5F3A\u786C\u8C08\u5224", "Negotiate aggressively"),
      [1, -1, 0, 0],
      t("\u63A5\u53D7\u6DA8\u79DF", "Accept the increase peacefully"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u9694\u58C1\u5F00\u4E86\u4E00\u5BB6\u7ADE\u4E89\u5BF9\u624B", "A competitor opens next door"),
      t("\u63A8\u51FA\u6253\u6298\u6D3B\u52A8", "Launch a discount campaign"),
      [-1, 0, 1, -1],
      t("\u52A0\u500D\u63D0\u5347\u54C1\u8D28", "Double down on quality"),
      [-1, -1, 0, 1]
    ),
    sc(
      t("\u4E3B\u53A8\u63D0\u8BAE\u5168\u9762\u66F4\u65B0\u83DC\u5355", "Head chef wants a menu overhaul"),
      t("\u6279\u51C6\u65B0\u83DC\u5355", "Approve the new menu"),
      [-1, 1, 0, 1],
      t("\u4FDD\u7559\u62DB\u724C\u83DC", "Keep the proven favorites"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u6536\u5230\u4E00\u4EFD\u5927\u578B\u5BB4\u4F1A\u8BA2\u5355", "A catering contract is offered"),
      t("\u63A5\u4E0B\u5927\u5355", "Accept the big contract"),
      [1, -1, -1, 0],
      t("\u4E13\u6CE8\u5802\u98DF", "Focus on the restaurant"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u53A8\u623F\u8BBE\u5907\u8001\u5316\u635F\u574F", "Kitchen equipment is breaking down"),
      t("\u8D2D\u4E70\u65B0\u8BBE\u5907", "Buy new equipment"),
      [-1, 1, 0, 0],
      t("\u4FEE\u7406\u65E7\u8BBE\u5907", "Repair the old stuff"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u660E\u5929\u536B\u751F\u68C0\u67E5", "Health inspector is visiting tomorrow"),
      t("\u8FDE\u591C\u5927\u626B\u9664", "Deep clean everything tonight"),
      [-1, -1, -1, 1],
      t("\u542C\u5929\u7531\u547D", "Hope for the best"),
      [0, 0, 0, -1]
    ),
    sc(
      t("\u5458\u5DE5\u96C6\u4F53\u8981\u6C42\u52A0\u85AA", "Staff asks for a raise"),
      t("\u540C\u610F\u52A0\u85AA", "Grant the raises"),
      [-1, 1, 0, 0],
      t("\u6539\u5584\u798F\u5229\u66FF\u4EE3", "Offer perks instead"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u4E00\u6761\u77ED\u89C6\u9891\u8BA9\u4F60\u7684\u83DC\u706B\u4E86", "A viral TikTok features your dish"),
      t("\u8D81\u70ED\u63A8\u51FA\u6D3B\u52A8", "Capitalize with a promo"),
      [-1, -1, 1, 1],
      t("\u8BA9\u70ED\u5EA6\u81EA\u7136\u53D1\u5C55", "Let the buzz grow naturally"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u5916\u5356\u5E73\u53F0\u9080\u8BF7\u5165\u9A7B", "Delivery app wants a partnership"),
      t("\u52A0\u5165\u5E73\u53F0", "Join the platform"),
      [1, -1, -1, 0],
      t("\u575A\u6301\u5802\u98DF", "Stay dine-in only"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u672C\u5730\u6148\u5584\u673A\u6784\u8BF7\u6C42\u6350\u8D60", "Local charity asks for a donation"),
      t("\u6350\u8D60\u4E00\u684C\u9152\u5E2D", "Donate a catered meal"),
      [-1, 1, 1, 1],
      t("\u5A49\u62D2", "Politely decline"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u62DB\u724C\u98DF\u6750\u4F9B\u5E94\u7D27\u5F20", "Signature ingredient is hard to source"),
      t("\u82B1\u9AD8\u4EF7\u4FDD\u8D28\u91CF", "Pay premium for quality"),
      [-1, 0, 0, 1],
      t("\u6682\u65F6\u4E0B\u67B6\u8BE5\u83DC\u54C1", "Remove the dish temporarily"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u4E00\u4F4D\u5E38\u5BA2\u5F00\u59CB\u95F9\u4E8B", "A regular customer becomes disruptive"),
      t("\u597D\u8A00\u76F8\u529D", "Have a gentle talk"),
      [0, -1, 1, 0],
      t("\u76F4\u63A5\u62C9\u9ED1", "Ban them from the restaurant"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u9644\u8FD1\u4E3E\u529E\u7F8E\u98DF\u5361\u8F66\u8282", "Food truck festival in the neighborhood"),
      t("\u8BBE\u644A\u53C2\u52A0", "Set up a stall too"),
      [-1, -1, 1, 0],
      t("\u5E97\u5185\u63A8\u51FA\u7279\u60E0", "Offer indoor specials instead"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u7535\u89C6\u8282\u76EE\u60F3\u6765\u62CD\u6444", "A TV show wants to film here"),
      t("\u5141\u8BB8\u62CD\u6444", "Allow the filming"),
      [-1, -1, 0, 1],
      t("\u62D2\u7EDD\uFF0C\u592A\u6253\u6270\u4E86", "Decline \u2014 too disruptive"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u8282\u65E5\u65FA\u5B63\u6765\u4E86", "Holiday season approaches"),
      t("\u63A8\u51FA\u8282\u65E5\u9650\u5B9A\u83DC\u5355", "Create a seasonal menu"),
      [-1, 1, 1, 1],
      t("\u7B80\u5355\u5E94\u5BF9", "Keep things simple"),
      [1, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u8D44\u6DF1\u53A8\u5E08\u6765\u5E94\u8058", "A veteran cook applies for a job"),
      t("\u9AD8\u85AA\u8058\u7528", "Hire them at top rate"),
      [-1, 1, 0, 0],
      t("\u9884\u7B97\u4E0D\u591F\uFF0C\u4E0D\u62DB", "Pass \u2014 budget is tight"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u70B9\u8BC4\u7F51\u7AD9\u5199\u624B\u5A01\u80C1\u7ED9\u5DEE\u8BC4", "Yelp reviewer threatens a bad write-up"),
      t("\u514D\u5355\u6253\u53D1", "Comp their meal"),
      [-1, 0, 0, 1],
      t("\u4E0D\u7406\u4F1A\u5A01\u80C1", "Ignore the threat"),
      [0, 0, 0, -1]
    ),
    sc(
      t("\u6536\u5230\u7F8E\u98DF\u8282\u76EE\u9080\u8BF7", "You're offered a spot on a food show"),
      t("\u4E0A\u8282\u76EE", "Appear on the show"),
      [-1, -1, 0, 1],
      t("\u7559\u5728\u53A8\u623F", "Stay in the kitchen"),
      [0, 0, 1, -1]
    )
  ]
};
var bandManager = {
  name: t("\u4E50\u961F\u7ECF\u7EAA", "Band Manager"),
  labels: [t("\u9884\u7B97", "Budget"), t("\u58EB\u6C14", "Morale"), t("\u7C89\u4E1D", "Fans"), t("\u521B\u4F5C\u529B", "Creativity")],
  failLow: [
    t("\u7834\u4EA7\u4E86\uFF0C\u8FDE\u7434\u5F26\u90FD\u4E70\u4E0D\u8D77\u3002", "Broke. The band can't afford strings, let alone a tour."),
    t("\u4E50\u961F\u89E3\u6563\uFF0C\u521B\u4F5C\u5206\u6B67\u6BC1\u4E86\u4E00\u5207\u3002", "The band breaks up. Creative differences destroy everything."),
    t("\u89C2\u4F17\u6D88\u5931\uFF0C\u53F0\u4E0B\u7A7A\u65E0\u4E00\u4EBA\u3002", "No audience left. You're playing to empty rooms."),
    t("\u7075\u611F\u67AF\u7AED\uFF0C\u97F3\u4E50\u5C31\u6B64\u6B7B\u53BB\u3002", "Writer's block becomes permanent. The music dies.")
  ],
  failHigh: [
    t("\u5531\u7247\u516C\u53F8\u63A5\u7BA1\u4E00\u5207\uFF0C\u827A\u672F\u81EA\u7531\u8361\u7136\u65E0\u5B58\u3002", "The label takes over. Artistic freedom is gone forever."),
    t("\u81EA\u6211\u81A8\u80C0\u5230\u6781\u70B9\uFF0C\u4E50\u961F\u81EA\u6211\u6BC1\u706D\u3002", "Egos inflate to bursting. The band self-destructs."),
    t("\u6F14\u5531\u4F1A\u53D1\u751F\u9A9A\u4E71\uFF0C\u917F\u6210\u4E25\u91CD\u4E8B\u6545\u3002", "Mob mentality at a concert leads to a dangerous incident."),
    t("\u4F5C\u54C1\u8FC7\u4E8E\u62BD\u8C61\uFF0C\u8FDE\u7C89\u4E1D\u4E5F\u542C\u4E0D\u61C2\u4E86\u3002", "The art becomes so abstract even fans can't follow.")
  ],
  scenarios: [
    sc(
      t("\u4E00\u5BB6\u5531\u7247\u516C\u53F8\u9012\u6765\u5408\u7EA6", "A record label offers a deal"),
      t("\u7B7E\u7EA6", "Sign the contract"),
      [1, -1, 0, -1],
      t("\u4FDD\u6301\u72EC\u7ACB", "Stay independent"),
      [-1, 1, 0, 1]
    ),
    sc(
      t("\u9F13\u624B\u60F3\u641E\u4E2A\u4EBA\u9879\u76EE", "The drummer wants to try a solo project"),
      t("\u652F\u6301\u4ED6\uFF0C\u4E50\u961F\u4F11\u606F", "Support it \u2014 take a break"),
      [-1, 1, -1, 1],
      t("\u529D\u4ED6\u4E13\u6CE8\u4E50\u961F", "Convince them to stay focused"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u5927\u578B\u97F3\u4E50\u8282\u9080\u8BF7\u4F60\u4EEC\u6F14\u51FA", "A big festival invites you to play"),
      t("\u63A5\u53D7\u5E76\u5168\u529B\u51C6\u5907", "Accept and go all out"),
      [-1, 1, 1, 0],
      t("\u5A49\u62D2\uFF0C\u4E13\u5FC3\u505A\u4E13\u8F91", "Decline to work on the album"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u7C89\u4E1D\u8981\u6C42\u6F14\u51FA\u65F6\u5531\u8001\u6B4C", "Fans demand you play old hits at shows"),
      t("\u6F14\u594F\u7ECF\u5178\u66F2\u76EE", "Play the classics"),
      [1, -1, 1, -1],
      t("\u9996\u6F14\u65B0\u4F5C\u54C1", "Premiere new material instead"),
      [-1, 0, -1, 1]
    ),
    sc(
      t("\u4E3B\u5531\u55D3\u5B50\u51FA\u4E86\u95EE\u9898", "The lead singer is losing their voice"),
      t("\u53D6\u6D88\u6F14\u51FA\u517B\u55D3", "Cancel shows for recovery"),
      [-1, 0, -1, 0],
      t("\u5E26\u75C5\u575A\u6301\u5DE1\u6F14", "Push through the tour"),
      [1, -1, 1, -1]
    ),
    sc(
      t("\u4E00\u4E2A\u54C1\u724C\u60F3\u8BF7\u4E50\u961F\u62CD\u5E7F\u544A", "A brand wants the band in a commercial"),
      t("\u63A5\u53D7\u5546\u4E1A\u5408\u4F5C", "Take the sponsor deal"),
      [1, -1, -1, 0],
      t("\u62D2\u7EDD\u5546\u4E1A\u5316", "Refuse to sell out"),
      [0, 1, 0, 1]
    ),
    sc(
      t("\u6709\u6253\u6298\u7684\u5F55\u97F3\u68DA\u6863\u671F", "Studio time is available at a discount"),
      t("\u7ACB\u5373\u9884\u8BA2", "Book it immediately"),
      [-1, 1, 0, 1],
      t("\u7701\u94B1\u5728\u5BB6\u6392\u7EC3", "Save money, practice at home"),
      [0, 0, 0, 0]
    ),
    sc(
      t("\u4F60\u4EEC\u7684\u6B4C\u88AB\u4EBA\u7FFB\u5531\u540E\u706B\u4E86", "A cover of your song goes viral"),
      t("\u4E0E\u7FFB\u5531\u8005\u5408\u4F5C", "Collaborate with the creator"),
      [0, 1, 1, 0],
      t("\u8981\u6C42\u4E0B\u67B6", "Demand a takedown"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u4E50\u961F\u56E0\u521B\u4F5C\u65B9\u5411\u4E89\u5435", "Band fights over creative direction"),
      t("\u6C11\u4E3B\u6295\u7968\u51B3\u5B9A", "Hold a democratic vote"),
      [0, 1, 0, -1],
      t("\u575A\u6301\u521B\u59CB\u4EBA\u7684\u613F\u666F", "Follow the founder's vision"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u573A\u5927\u724C\u6F14\u51FA\u63D0\u4F9B\u6696\u573A\u673A\u4F1A", "Opening slot for a major act is offered"),
      t("\u63A5\u53D7\u6696\u573A", "Take the opening slot"),
      [-1, 0, 1, 0],
      t("\u53EA\u63A5\u5934\u724C\u6F14\u51FA", "Only accept headlining gigs"),
      [0, 1, -1, 1]
    ),
    sc(
      t("MV\u9884\u7B97\u7D27\u5F20", "Music video budget is tight"),
      t("\u62CD\u4F4E\u6210\u672CDIY\u98CE\u683C", "Make a lo-fi DIY video"),
      [0, 1, 0, 1],
      t("\u501F\u94B1\u62CD\u4E13\u4E1AMV", "Go into debt for a pro video"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u7C89\u4E1D\u4F1A\u8981\u6C42\u4E3E\u529E\u89C1\u9762\u4F1A", "Fan club wants exclusive meetups"),
      t("\u4E3E\u529E\u7C89\u4E1D\u6D3B\u52A8", "Host fan events"),
      [-1, 1, 1, -1],
      t("\u4FDD\u6301\u795E\u79D8\u611F", "Keep a mysterious distance"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u4F4D\u5236\u4F5C\u4EBA\u60F3\u91CD\u65B0\u6DF7\u97F3\u4F60\u4EEC\u7684\u6B4C", "A producer offers to remix your track"),
      t("\u63A5\u53D7\u6DF7\u97F3", "Accept the remix"),
      [0, 0, 1, -1],
      t("\u4FDD\u7559\u539F\u7248", "Keep the original sound"),
      [0, 1, -1, 1]
    ),
    sc(
      t("\u5468\u8FB9\u5546\u63D0\u8BAE\u63A8\u51FA\u65B0\u4EA7\u54C1\u7EBF", "Merch vendor proposes a new line"),
      t("\u63A8\u51FA\u5468\u8FB9", "Launch the merch line"),
      [1, 0, 1, -1],
      t("\u4E13\u6CE8\u97F3\u4E50", "Focus on the music"),
      [0, 1, -1, 1]
    ),
    sc(
      t("\u4E00\u4E2A\u4E89\u8BAE\u8BDD\u9898\u53EF\u4EE5\u5199\u6210\u6B4C\u8BCD", "A controversial topic could inspire lyrics"),
      t("\u5927\u80C6\u521B\u4F5C", "Write about it boldly"),
      [0, 0, -1, 1],
      t("\u6C42\u7A33\u4E0D\u78B0", "Play it safe"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u5DE1\u6F14\u5927\u5DF4\u629B\u951A\u4E86", "The tour bus breaks down"),
      t("\u79DF\u4E00\u8F86\u66FF\u4EE3", "Rent a replacement"),
      [-1, 1, 0, 0],
      t("\u53D6\u6D88\u51E0\u573A\u6F14\u51FA", "Cancel the next few dates"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u6D41\u5A92\u4F53\u5E73\u53F0\u63D0\u4F9B\u63A8\u8350\u4F4D", "A streaming platform offers a playlist spot"),
      t("\u63A5\u53D7\u72EC\u5BB6\u6761\u6B3E", "Accept exclusivity clause"),
      [1, 0, 1, -1],
      t("\u7559\u5728\u6240\u6709\u5E73\u53F0", "Stay on all platforms"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u4E50\u961F\u6210\u5458\u5199\u4E86\u4E00\u9996\u5F88\u79C1\u4EBA\u7684\u6B4C", "Band member writes a deeply personal song"),
      t("\u6536\u5165\u4E13\u8F91", "Include it on the album"),
      [0, 1, 0, 1],
      t("\u7559\u7ED9\u4ED6\u4E2A\u4EBA\u53D1\u884C", "Save it for a solo release"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u4E00\u5BB6\u672C\u5730\u9152\u5427\u63D0\u4F9B\u9A7B\u573A\u673A\u4F1A", "Local venue offers a residency"),
      t("\u63A5\u53D7\u9A7B\u573A", "Accept the residency"),
      [1, 0, 1, -1],
      t("\u7EE7\u7EED\u5DE1\u6F14", "Keep touring instead"),
      [-1, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u8001\u961F\u53CB\u60F3\u56DE\u5F52", "An old bandmate wants to rejoin"),
      t("\u6B22\u8FCE\u56DE\u6765", "Welcome them back"),
      [0, 1, 0, -1],
      t("\u4FDD\u6301\u73B0\u6709\u9635\u5BB9", "Keep the current lineup"),
      [0, 0, 1, 1]
    )
  ]
};
var ALL_THEMES = [
  medievalKingdom,
  spaceColony,
  pirateCaptain,
  startupCeo,
  wizardAcademy,
  zombieSurvival,
  restaurantOwner,
  bandManager
];

// page/bars_game_cpp.ts
var CANVAS_ID = "bars-game-canvas";
var BTN_0_ID = "bars-game-btn-0";
var BTN_1_ID = "bars-game-btn-1";
var RESTART_ID = "bars-game-restart";
var STATUS_ID = "bars-game-status";
var PREVIEW_ID = "bars-game-preview";
var SEED_ID = "bars-game-seed";
var SHOW_NUMBERS_ID = "bars-game-show-numbers";
var HEAD_SPAN_ID = "head_span";
var LABELS_ID = "bars-game-labels";
var SCENARIO_ID = "bars-game-scenario";
var LANG_TOGGLE_ID = "bars-game-lang-toggle";
var BAR_COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b"];
var LIGHT_BAR_COLORS = ["rgba(96, 165, 250, 0.95)", "rgba(244, 114, 182, 0.95)", "rgba(52, 211, 153, 0.95)", "rgba(251, 191, 36, 0.95)"];
var INCREASE_BAR_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"];
var DECREASE_BAR_COLORS = ["#2563eb", "#db2777", "#059669", "#d97706"];
var BAR_REGION_COLOR = "#000000";
var hoverChoice = null;
var currentSeed = 0;
var showNumbers = false;
var activeTheme = null;
var currentLang = "cn";
var cachedMatch = null;
function getCanvas() {
  const el = document.getElementById(CANVAS_ID);
  if (!el || !(el instanceof HTMLCanvasElement)) {
    throw new Error(`Canvas #${CANVAS_ID} not found`);
  }
  return el;
}
function getButtons() {
  const btn0 = document.getElementById(BTN_0_ID);
  const btn1 = document.getElementById(BTN_1_ID);
  const restart2 = document.getElementById(RESTART_ID);
  if (!btn0 || !(btn0 instanceof HTMLButtonElement) || !btn1 || !(btn1 instanceof HTMLButtonElement) || !restart2 || !(restart2 instanceof HTMLButtonElement)) {
    throw new Error(`Buttons not found`);
  }
  return { btn0, btn1, restart: restart2 };
}
function barLayout(width, height, n) {
  const barWidth = width * 0.8 / n;
  const gap = (width - barWidth * n) / (n + 1);
  const scale = height / Math.max(1, barsGameMaxVal());
  return { barWidth, gap, scale, n };
}
function drawBars(ctx, values, x, width, height, maxVal) {
  const n = values.length;
  if (n === 0) {
    return;
  }
  const { barWidth, gap, scale } = barLayout(width, height, n);
  const fullHeight = height;
  for (let i = 0; i < n; i++) {
    const bx = x + gap + i * (barWidth + gap);
    const barHeight = Math.max(0, values[i] / maxVal * fullHeight);
    const by = height - barHeight;
    ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length];
    ctx.fillRect(bx, by, barWidth, barHeight);
    if (showNumbers) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(values[i]), bx + barWidth / 2, by + barHeight / 2 + 4);
      ctx.textAlign = "left";
    }
  }
}
function drawBarsWithDiff(ctx, state, future, width, height, maxVal) {
  const n = state.length;
  if (n === 0) {
    return;
  }
  const { barWidth, gap, scale } = barLayout(width, height, n);
  const fullHeight = height;
  const bottom = height;
  for (let i = 0; i < n; i++) {
    const bx = gap + i * (barWidth + gap);
    const s = state[i];
    const f = future[i];
    const hCurrent = s / maxVal * fullHeight;
    const hFuture = f / maxVal * fullHeight;
    const yCurrent = bottom - hCurrent;
    const yFuture = bottom - hFuture;
    const idx = i % BAR_COLORS.length;
    const baseColor = LIGHT_BAR_COLORS[idx];
    const increaseColor = INCREASE_BAR_COLORS[idx];
    const decreaseColor = DECREASE_BAR_COLORS[idx];
    if (f < s) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yFuture, barWidth, hFuture);
      ctx.fillStyle = decreaseColor;
      ctx.fillRect(bx, yCurrent, barWidth, yFuture - yCurrent);
    } else if (f > s) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yCurrent, barWidth, hCurrent);
      ctx.fillStyle = increaseColor;
      ctx.fillRect(bx, yFuture, barWidth, hFuture - hCurrent);
    } else {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yCurrent, barWidth, hCurrent);
    }
    if (f === 0 || f === maxVal) {
      ctx.strokeStyle = "#c00";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, yFuture, barWidth, hFuture);
    }
    const val = future[i];
    if (showNumbers) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      const by = bottom - hFuture;
      const barHeight = hFuture;
      ctx.fillText(String(val), bx + barWidth / 2, by + barHeight / 2 + 4);
      ctx.textAlign = "left";
    }
  }
}
function selectRandomTheme() {
  activeTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
}
function updateLabels() {
  const el = document.getElementById(LABELS_ID);
  if (!el || !activeTheme) {
    return;
  }
  const canvas = getCanvas();
  const border = 15;
  const cw = canvas.width;
  const n = 4;
  const barWidth = cw * 0.8 / n;
  const gap = (cw - barWidth * n) / (n + 1);
  el.innerHTML = activeTheme.labels.map((label, i) => {
    const cx = border + gap + i * (barWidth + gap) + barWidth / 2;
    return `<span style="position:absolute;left:${cx}px;transform:translateX(-50%);color:${BAR_COLORS[i]};font-weight:bold;white-space:nowrap">${txt(label, currentLang)}</span>`;
  }).join("");
}
function updateButtonText() {
  const { btn0, btn1 } = getButtons();
  const scenarioEl = document.getElementById(SCENARIO_ID);
  if (!activeTheme) {
    btn0.textContent = "Choice 0";
    btn1.textContent = "Choice 1";
    if (scenarioEl) {
      scenarioEl.textContent = "\xA0";
    }
    return;
  }
  if (barsGameIsEnded()) {
    btn0.textContent = "Choice 0";
    btn1.textContent = "Choice 1";
    if (scenarioEl) {
      const state2 = barsGameGetState();
      scenarioEl.textContent = getFailureText(activeTheme, state2, barsGameMaxVal(), currentLang);
    }
    return;
  }
  const state = barsGameGetState();
  const f0 = barsGameGetFutureState(0);
  const f1 = barsGameGetFutureState(1);
  const d0 = classifyDeltas(state, f0);
  const d1 = classifyDeltas(state, f1);
  cachedMatch = findMatchingScenario(activeTheme.scenarios, d0, d1, Math.random);
  if (!cachedMatch) {
    btn0.textContent = "Choice 0";
    btn1.textContent = "Choice 1";
    if (scenarioEl) {
      scenarioEl.textContent = "\xA0";
    }
    return;
  }
  const { scenario, swapped } = cachedMatch;
  if (scenarioEl) {
    scenarioEl.textContent = txt(scenario.background, currentLang);
  }
  if (swapped) {
    btn0.textContent = txt(scenario.choiceB, currentLang);
    btn1.textContent = txt(scenario.choiceA, currentLang);
  } else {
    btn0.textContent = txt(scenario.choiceA, currentLang);
    btn1.textContent = txt(scenario.choiceB, currentLang);
  }
}
function draw() {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const width = canvas.width;
  const height = canvas.height;
  const maxVal = Math.max(1, barsGameMaxVal());
  const stateSize = barsGameStateSize();
  if (stateSize === 0) {
    return;
  }
  ctx.fillStyle = BAR_REGION_COLOR;
  ctx.fillRect(0, 0, width, height);
  const state = barsGameGetState();
  if (hoverChoice !== null && !barsGameIsEnded()) {
    const future = barsGameGetFutureState(hoverChoice);
    drawBarsWithDiff(ctx, state, future, width, height, maxVal);
    const previewEl = document.getElementById(PREVIEW_ID);
    if (previewEl) {
      previewEl.textContent = `Preview: Choice ${hoverChoice} (lighter = up, darker = down)`;
    }
  } else {
    drawBars(ctx, state, 0, width, height, maxVal);
    const previewEl = document.getElementById(PREVIEW_ID);
    if (previewEl) {
      previewEl.textContent = "\xA0";
    }
  }
}
function logState() {
  if (barsGameStateSize() === 0) {
    return;
  }
  console.log("bars", barsGameGetState());
}
function updateSeedDisplay() {
  const el = document.getElementById(SEED_ID);
  if (el) {
    el.textContent = `Seed: ${currentSeed}  `;
  }
}
function updateStatus() {
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.textContent = barsGameIsEnded() ? " Game over." : "";
  }
  const head = document.getElementById(HEAD_SPAN_ID);
  if (head) {
    const title = activeTheme ? txt(activeTheme.name, currentLang) : "Bars game (C++ / WASM)";
    head.textContent = barsGameIsEnded() ? `${title} \u2014 Game Over` : title;
  }
  updateSeedDisplay();
}
function setButtonsEnabled(enabled) {
  const { btn0, btn1 } = getButtons();
  btn0.disabled = !enabled;
  btn1.disabled = !enabled;
}
function onChoice(index) {
  if (barsGameIsEnded()) {
    return;
  }
  barsGameApplyChoice(index);
  logState();
  updateStatus();
  if (barsGameIsEnded()) {
    setButtonsEnabled(false);
    hoverChoice = null;
  } else {
    hoverChoice = index;
  }
  updateButtonText();
  draw();
}
function restart() {
  selectRandomTheme();
  const seed = Date.now() >>> 0 ^ (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : 0);
  currentSeed = seed;
  barsGameSetSeed(seed);
  barsGameInit();
  logState();
  setButtonsEnabled(true);
  updateLabels();
  updateButtonText();
  updateStatus();
  draw();
}
async function main() {
  await modulePromise;
  barsGameCreate();
  selectRandomTheme();
  currentSeed = Date.now() >>> 0 ^ (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : 0);
  barsGameSetSeed(currentSeed);
  barsGameInit();
  logState();
  const showNumbersEl = document.getElementById(SHOW_NUMBERS_ID);
  if (showNumbersEl && showNumbersEl instanceof HTMLInputElement) {
    showNumbers = showNumbersEl.checked;
    showNumbersEl.addEventListener("change", () => {
      showNumbers = showNumbersEl.checked;
      draw();
    });
  }
  const langToggle = document.getElementById(LANG_TOGGLE_ID);
  if (langToggle && langToggle instanceof HTMLButtonElement) {
    langToggle.textContent = currentLang === "cn" ? "EN" : "\u4E2D\u6587";
    langToggle.addEventListener("click", () => {
      currentLang = currentLang === "cn" ? "en" : "cn";
      langToggle.textContent = currentLang === "cn" ? "EN" : "\u4E2D\u6587";
      updateLabels();
      updateButtonText();
      updateStatus();
    });
  }
  updateLabels();
  updateButtonText();
  draw();
  updateStatus();
  setButtonsEnabled(true);
  const { btn0, btn1, restart: restartBtn } = getButtons();
  btn0.addEventListener("click", () => onChoice(0));
  btn1.addEventListener("click", () => onChoice(1));
  restartBtn.addEventListener("click", restart);
  btn0.addEventListener("mouseenter", () => {
    hoverChoice = 0;
    draw();
  });
  btn0.addEventListener("mouseleave", () => {
    hoverChoice = null;
    draw();
  });
  btn1.addEventListener("mouseenter", () => {
    hoverChoice = 1;
    draw();
  });
  btn1.addEventListener("mouseleave", () => {
    hoverChoice = null;
    draw();
  });
  document.addEventListener("keydown", (e) => {
    if (barsGameIsEnded()) {
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (hoverChoice === 0) {
        onChoice(0);
      } else {
        hoverChoice = 0;
      }
      draw();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (hoverChoice === 1) {
        onChoice(1);
      } else {
        hoverChoice = 1;
      }
      draw();
    }
  });
}
main().catch((err) => {
  console.error(err);
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.textContent = " Error loading game.";
  }
});
