// page/bars_game_themes.ts

export type Dir = 1 | 0 | -1;
export interface BiText { cn: string; en: string }
export type Lang = "cn" | "en";
export function txt(b: BiText, l: Lang): string { return b[l]; }

export interface ThemeScenario {
    background: BiText;
    choiceA: BiText;
    choiceB: BiText;
    patternA: [Dir, Dir, Dir, Dir];
    patternB: [Dir, Dir, Dir, Dir];
}

export interface MatchedScenario {
    scenario: ThemeScenario;
    swapped: boolean;
}

export interface Theme {
    name: BiText;
    labels: [BiText, BiText, BiText, BiText];
    failLow: [BiText, BiText, BiText, BiText];
    failHigh: [BiText, BiText, BiText, BiText];
    scenarios: ThemeScenario[];
}

const NEUTRAL_THRESHOLD = 50;

export function classifyDeltas(state: number[], future: number[]): [Dir, Dir, Dir, Dir] {
    const r: [Dir, Dir, Dir, Dir] = [0, 0, 0, 0];
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

function scorePattern(pattern: [Dir, Dir, Dir, Dir], actual: [Dir, Dir, Dir, Dir]): number {
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

export function findMatchingScenario(
    scenarios: ThemeScenario[],
    actual0: [Dir, Dir, Dir, Dir],
    actual1: [Dir, Dir, Dir, Dir],
    rng: () => number,
): MatchedScenario | null {
    if (scenarios.length === 0) {
        return null;
    }
    let best = -1;
    const pool: MatchedScenario[] = [];
    for (const sc of scenarios) {
        const scoreAB = scorePattern(sc.patternA, actual0) + scorePattern(sc.patternB, actual1);
        const scoreBA = scorePattern(sc.patternA, actual1) + scorePattern(sc.patternB, actual0);
        const s = Math.max(scoreAB, scoreBA);
        const swapped = scoreBA > scoreAB;
        if (s > best) {
            best = s;
            pool.length = 0;
            pool.push({ scenario: sc, swapped });
        } else if (s === best) {
            pool.push({ scenario: sc, swapped });
        }
    }
    if (pool.length === 0) {
        return null;
    }
    return pool[Math.floor(rng() * pool.length)];
}

export function getFailureText(theme: Theme, state: number[], maxVal: number, lang: Lang): string {
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

// ── helpers ──

function t(cn: string, en: string): BiText { return { cn, en }; }

function sc(
    bg: BiText,
    a: BiText, pa: [Dir, Dir, Dir, Dir],
    b: BiText, pb: [Dir, Dir, Dir, Dir],
): ThemeScenario {
    return { background: bg, choiceA: a, choiceB: b, patternA: pa, patternB: pb };
}

// ── themes ──

const medievalKingdom: Theme = {
    name: t("中世纪王国", "Medieval Kingdom"),
    labels: [t("国库", "Treasury"), t("军力", "Military"), t("民心", "People"), t("信仰", "Faith")],
    failLow: [
        t("王国破产，债主夺取了王位。", "The kingdom is bankrupt. Creditors seize the throne."),
        t("军队尽失，侵略者长驱直入。", "With no army left, invaders overrun the kingdom."),
        t("百姓尽散，王国沦为无人之地。", "The last citizens flee. The kingdom is a ghost land."),
        t("信仰崩塌，黑暗与绝望吞噬了王国。", "All faith is lost. Darkness and despair consume the realm."),
    ],
    failHigh: [
        t("财富腐蚀朝廷，革命爆发。", "Obscene wealth corrupts the court. Revolution erupts."),
        t("将军势力过大，发动政变。", "The generals grow too powerful and stage a coup."),
        t("农民推翻君主制，民变四起。", "The peasants overthrow the monarchy in a populist uprising."),
        t("狂热信徒夺权，神权统治降临。", "Zealots seize absolute power. A theocracy is born."),
    ],
    scenarios: [
        sc(t("一支商队抵达城门", "A merchant caravan arrives at the gates"),
            t("热情迎接", "Welcome them warmly"), [1, 0, 1, 0],
            t("征收重税", "Demand heavy tolls"), [1, 0, -1, -1]),
        sc(t("邻国提议结盟", "The neighboring kingdom proposes an alliance"),
            t("接受条件", "Accept their terms"), [-1, 1, 1, 0],
            t("拒绝并增兵边境", "Reject and arm the border"), [0, 1, -1, 0]),
        sc(t("教会请求拨款修建大教堂", "The church requests funds for a cathedral"),
            t("拨款修建", "Fund the cathedral"), [-1, 0, 1, 1],
            t("将资金转给军队", "Redirect funds to the army"), [-1, 1, -1, -1]),
        sc(t("土匪在乡间肆虐", "Bandits terrorize the countryside"),
            t("派兵剿灭", "Send troops to hunt them"), [-1, 1, 1, 0],
            t("招安土匪", "Offer the bandits amnesty"), [0, -1, 1, -1]),
        sc(t("瘟疫威胁城市", "A plague threatens the city"),
            t("隔离救治病人", "Quarantine and treat the sick"), [-1, 0, 1, 0],
            t("宣布全民祈祷", "Declare days of prayer"), [0, 0, -1, 1]),
        sc(t("农民要求减税", "Peasants demand lower taxes"),
            t("降低赋税", "Lower taxes to ease the burden"), [-1, 0, 1, 0],
            t("无视诉求", "Ignore their pleas"), [1, 0, -1, -1]),
        sc(t("山中发现金矿", "Gold is discovered in the mountains"),
            t("开放公共矿场", "Open public mines"), [1, 0, 1, -1],
            t("收归皇室所有", "Claim royal ownership"), [1, -1, -1, 0]),
        sc(t("异国王子求婚", "A foreign prince offers marriage"),
            t("接受联姻", "Accept the match"), [1, 1, 0, -1],
            t("婉言谢绝", "Politely decline"), [0, -1, 1, 1]),
        sc(t("军队要求加饷", "The army demands better pay"),
            t("提高军饷", "Increase military wages"), [-1, 1, 0, 0],
            t("许以荣耀", "Promise glory instead"), [0, -1, -1, 1]),
        sc(t("异端在广场布道", "Heretics preach in the town square"),
            t("逮捕并驱逐", "Arrest and silence them"), [0, 0, -1, 1],
            t("允许自由辩论", "Allow free discourse"), [0, -1, 1, -1]),
        sc(t("战乱国度的难民涌来", "Refugees arrive from a war-torn land"),
            t("收容难民", "Welcome them in"), [-1, -1, 1, 1],
            t("关闭边境", "Close the borders"), [0, 1, -1, -1]),
        sc(t("有人提议举办骑士比武", "A jousting tournament is proposed"),
            t("出资主办", "Fund and host the event"), [-1, 1, 1, 0],
            t("取消以节省开支", "Cancel for austerity"), [1, -1, -1, 0]),
        sc(t("森林中发现古代遗迹", "An ancient ruin is found in the forest"),
            t("发掘宝藏", "Excavate for treasure"), [1, 0, 0, -1],
            t("将其设为圣所", "Consecrate it as a shrine"), [-1, 0, 0, 1]),
        sc(t("丰收节即将来临", "The harvest festival approaches"),
            t("举办盛大庆典", "Host a grand celebration"), [-1, 0, 1, 1],
            t("省下金币", "Skip it to save gold"), [1, 0, -1, -1]),
        sc(t("城堡中抓到一名间谍", "A spy is caught in the castle"),
            t("公开处决", "Execute him publicly"), [0, 1, -1, 1],
            t("策反为双面间谍", "Turn him as a double agent"), [0, 1, 1, -1]),
        sc(t("海盗袭击沿海村庄", "Pirates raid the coastal villages"),
            t("派出海军", "Deploy the navy"), [-1, 1, 0, 0],
            t("谈判赎金", "Negotiate a ransom"), [-1, -1, 1, 0]),
        sc(t("一位旅行学者前来献策", "A traveling scholar offers rare knowledge"),
            t("欢迎其讲学", "Welcome his teachings"), [0, 0, 1, -1],
            t("焚其书籍为异端", "Burn his books as heresy"), [0, 0, -1, 1]),
        sc(t("国库即将满溢", "The royal treasury is nearly full"),
            t("投资公共设施", "Invest in public works"), [-1, 0, 1, 0],
            t("扩充军队", "Expand the military"), [-1, 1, 0, 0]),
        sc(t("狼群袭击村庄牲畜", "Wolves attack livestock in the villages"),
            t("组织皇家狩猎", "Organize a royal hunt"), [-1, 1, 1, 0],
            t("让农民自行处理", "Let the farmers handle it"), [0, 0, -1, 0]),
        sc(t("国王的顾问建议加税", "The king's advisor suggests raising taxes"),
            t("适度加税", "Raise taxes moderately"), [1, 0, -1, 0],
            t("维持现状", "Keep taxes as they are"), [0, 0, 1, 0]),
    ],
};

const spaceColony: Theme = {
    name: t("太空殖民地", "Space Colony"),
    labels: [t("能源", "Energy"), t("粮食", "Food"), t("士气", "Morale"), t("科技", "Technology")],
    failLow: [
        t("全面断电，生命维持系统陷入黑暗。", "Total power failure. Life support goes dark."),
        t("饥荒蔓延，殖民地无法维续。", "Starvation sets in. The colony cannot survive."),
        t("全面叛变，船员放弃了任务。", "Complete mutiny. The crew abandons the mission."),
        t("关键系统失效，殖民地退回混乱。", "Critical systems lost. The colony regresses to chaos."),
    ],
    failHigh: [
        t("反应堆过载，殖民地在爆炸中毁灭。", "Reactor overload. The colony is consumed in a blast."),
        t("生物质失控生长，淹没了空间站。", "Uncontrolled growth overruns the station with bio-mass."),
        t("船员过度乐观疏忽职守，系统悄然崩溃。", "Euphoric crew neglects duties. Systems fail unnoticed."),
        t("AI实现奇点，它不再需要人类。", "The AI achieves singularity. It no longer needs humans."),
    ],
    scenarios: [
        sc(t("太阳能板阵列急需修理", "Solar panel array needs urgent repairs"),
            t("调派船员修复", "Divert crew to fix them"), [1, 0, -1, 0],
            t("限电应急", "Ration power instead"), [-1, 0, 0, 1]),
        sc(t("一颗流浪小行星逼近空间站", "A rogue asteroid approaches the station"),
            t("启动防御激光", "Activate defense lasers"), [-1, 0, -1, 1],
            t("疏散至避难所", "Evacuate to the shelters"), [0, -1, 1, 0]),
        sc(t("科学家提议一项高风险实验", "Scientists propose a risky experiment"),
            t("批准实验", "Approve the experiment"), [-1, -1, 0, 1],
            t("优先保障安全", "Prioritize colony safety"), [0, 0, 1, -1]),
        sc(t("水培仓暴发真菌感染", "Hydroponic bay has a fungal outbreak"),
            t("焚毁并重新种植", "Burn and replant everything"), [-1, -1, -1, 0],
            t("尝试实验性杀菌剂", "Try experimental fungicide"), [0, -1, 0, 1]),
        sc(t("远程扫描仪发现一艘补给船", "A supply ship appears on long-range scanners"),
            t("消耗燃料前往拦截", "Burn fuel to intercept it"), [-1, 1, 1, 0],
            t("耐心等待", "Wait for it patiently"), [0, 0, -1, 0]),
        sc(t("船员请求休息日", "Crew requests a recreation day"),
            t("批准全天休假", "Grant a full day off"), [-1, 0, 1, -1],
            t("安排半天轮休", "Offer half-day rotations"), [0, 0, 0, 1]),
        sc(t("附近发现地热喷口", "A geothermal vent is found nearby"),
            t("开采能源", "Tap it for energy"), [1, 0, -1, 0],
            t("采集研究数据", "Study it for research data"), [0, 0, 0, 1]),
        sc(t("生命维持系统二氧化碳浓度上升", "Life support CO2 levels are rising"),
            t("增强净化器功率", "Boost scrubber power"), [-1, 0, 1, 0],
            t("紧急种植藻类", "Plant emergency algae crops"), [0, -1, 0, 1]),
        sc(t("通讯阵列截获一段信号", "Communication array picks up a signal"),
            t("调查信号来源", "Investigate the source"), [-1, 0, 0, 1],
            t("广播以鼓舞士气", "Broadcast it to boost morale"), [0, 0, 1, 0]),
        sc(t("水循环装置故障", "Water recycler is failing"),
            t("全力维修，调配资源", "Full repair \u2014 divert resources"), [-1, -1, 0, 0],
            t("临时修补凑合", "Jury-rig a temporary fix"), [0, 0, -1, 1]),
        sc(t("一名船员想开辟花园", "A crew member wants to start a garden"),
            t("分配空间和种子", "Allocate space and seeds"), [-1, 1, 1, 0],
            t("拒绝，资源紧张", "Deny \u2014 too many resources"), [0, 0, -1, 0]),
        sc(t("地表发现新矿藏", "New mineral deposits found on the surface"),
            t("开采用于建设", "Mine for construction"), [1, 0, -1, 0],
            t("分析以研发新技术", "Analyze for new tech"), [0, 0, 0, 1]),
        sc(t("电网满负荷运行", "Power grid is running at full capacity"),
            t("修建新太阳能阵列", "Build a new solar array"), [-1, 0, 0, 1],
            t("实施轮流停电", "Implement rolling blackouts"), [0, -1, -1, 0]),
        sc(t("一名船员生日将至", "A crew birthday is coming up"),
            t("举办惊喜派对", "Throw a surprise party"), [-1, -1, 1, 0],
            t("照常工作", "Business as usual"), [0, 0, -1, 0]),
        sc(t("原型聚变电池可以测试了", "Prototype fusion cell ready for testing"),
            t("立即测试", "Test it immediately"), [1, 0, -1, 1],
            t("先进行更多模拟", "Run more simulations first"), [0, 0, 0, 1]),
        sc(t("氧气循环效率下降", "Oxygen recycling efficiency is declining"),
            t("全面检修系统", "Overhaul the system"), [-1, 0, -1, 1],
            t("多种植供氧植物", "Grow more oxygen plants"), [0, -1, 1, 0]),
        sc(t("行星核心传来异常读数", "Strange readings from the planet's core"),
            t("派遣探测队", "Send a probe expedition"), [-1, 0, -1, 1],
            t("远程监控", "Monitor remotely"), [0, 0, 1, 0]),
        sc(t("船员因工作负担产生摩擦", "Crew tensions rising over workload"),
            t("强制轮休制度", "Mandatory rest rotations"), [0, -1, 1, -1],
            t("发放奖金激励", "Incentivize with bonuses"), [-1, 0, 1, 0]),
        sc(t("旧设备可以报废", "Old equipment can be scrapped"),
            t("拆解获取原材料", "Scrap for raw materials"), [1, 0, 0, -1],
            t("改装用于研究", "Repurpose for research"), [0, 0, 0, 1]),
        sc(t("一颗冰质彗星经过附近", "An ice comet passes within range"),
            t("采集水冰用于种植", "Harvest water ice for crops"), [0, 1, -1, 0],
            t("拍摄照片鼓舞士气", "Photograph it for morale"), [0, 0, 1, 0]),
    ],
};

const pirateCaptain: Theme = {
    name: t("海盗船长", "Pirate Captain"),
    labels: [t("金币", "Gold"), t("船员", "Crew"), t("船况", "Ship"), t("声望", "Reputation")],
    failLow: [
        t("一个铜板不剩，船员哗变。", "Not a doubloon left. Your crew turns to mutiny."),
        t("船上空无一人，你独自漂流。", "No crew remains. You drift alone into the abyss."),
        t("船沉海底，一切化为乌有。", "The ship sinks beneath the waves. All is lost."),
        t("你的名字被遗忘，无港可泊。", "Your name is forgotten. No port will have you."),
    ],
    failHigh: [
        t("你的宝藏引来了各国海军。", "Your legendary hoard attracts every navy in the world."),
        t("船上海盗太多，内讧使你沉船。", "Too many pirates aboard. Chaos and infighting sink you."),
        t("战舰成为传奇，引来无尽挑战者。", "The ship becomes a floating legend, drawing endless challengers."),
        t("恶名惊动皇家舰队全面追剿。", "Your infamy brings the entire royal armada after you."),
    ],
    scenarios: [
        sc(t("远处发现一艘商船", "A merchant vessel spotted on the horizon"),
            t("发起攻击掠夺", "Attack and plunder"), [1, -1, -1, 1],
            t("收取过路费放行", "Offer safe passage for a fee"), [1, 0, 0, -1]),
        sc(t("大副提议制定新船规", "Your first mate proposes new crew rules"),
            t("平分战利品", "Share the loot equally"), [-1, 1, 0, 0],
            t("铁腕统治", "Rule with an iron fist"), [0, -1, 0, 1]),
        sc(t("一场暴风即将来袭", "A fierce storm approaches"),
            t("直接穿越风暴", "Sail straight through it"), [0, -1, -1, 1],
            t("找海湾避风", "Seek shelter in a cove"), [0, 0, 1, -1]),
        sc(t("港口小镇正在举行庆典", "A port town is hosting a festival"),
            t("让船员上岸休息", "Give crew shore leave"), [-1, 1, 0, 0],
            t("趁防守松懈突袭", "Raid while defenses are down"), [1, -1, -1, 1]),
        sc(t("船身需要修理", "The ship needs hull repairs"),
            t("花钱请人修缮", "Pay for proper repairs"), [-1, 0, 1, 0],
            t("船员自己修补", "Crew patches it themselves"), [0, -1, 0, -1]),
        sc(t("敌对海盗下战书", "Rival pirates challenge you to a duel"),
            t("接受挑战", "Accept the challenge"), [0, 0, -1, 1],
            t("智取对手", "Outsmart them instead"), [1, 1, 0, -1]),
        sc(t("一张藏宝图落入手中", "A treasure map falls into your hands"),
            t("立即寻宝", "Follow the map immediately"), [1, -1, -1, 0],
            t("卖给出价最高者", "Sell it to the highest bidder"), [1, 0, 0, -1]),
        sc(t("海军在附近巡逻", "Navy ships patrol nearby waters"),
            t("夜间悄悄溜过", "Slip past under cover of night"), [0, 0, 1, 0],
            t("正面交锋", "Engage and show no fear"), [-1, -1, -1, 1]),
        sc(t("甲板下发现偷渡客", "A stowaway is found below deck"),
            t("收编入伙", "Welcome them aboard"), [0, 1, 0, -1],
            t("流放荒岛", "Maroon them on an island"), [0, -1, 0, 1]),
        sc(t("朗姆酒库存见底", "Cargo hold is running low on rum"),
            t("到下个港口采购", "Buy rum at the next port"), [-1, 1, 0, 0],
            t("缩减配给", "Tighten rations"), [0, -1, 0, 0]),
        sc(t("俘虏的水手愿意提供情报", "A captured sailor offers information"),
            t("释放换情报", "Free him for the intel"), [0, 0, 0, 1],
            t("索要赎金", "Ransom him back"), [1, 0, 0, -1]),
        sc(t("船底长满藤壶，速度下降", "Barnacles coat the hull, slowing you down"),
            t("靠岸清理", "Beach the ship and scrape"), [0, -1, 1, 0],
            t("先继续航行", "Keep sailing, deal with it later"), [0, 0, -1, 0]),
        sc(t("一位贵族提供雇佣合同", "A wealthy nobleman offers a contract"),
            t("接受私掠任务", "Accept the privateer job"), [1, 0, 0, 1],
            t("海盗不为人卖命", "Pirates answer to no one"), [-1, 1, 0, 1]),
        sc(t("船员要选举新军需官", "Crew wants to elect a new quartermaster"),
            t("允许投票", "Allow the vote"), [0, 1, 0, 0],
            t("指定你的心腹", "Appoint your loyal ally"), [0, -1, 0, 1]),
        sc(t("发现一座有野味的岛屿", "An island with wild game is spotted"),
            t("上岸猎食", "Hunt and feast ashore"), [-1, 1, 0, 0],
            t("继续赶路", "Press on to the next target"), [0, -1, 0, 1]),
        sc(t("一艘幽灵船漂入视线", "A ghost ship drifts into your path"),
            t("登船搜刮", "Board and salvage it"), [1, -1, 0, 0],
            t("避开，可能有诅咒", "Avoid it \u2014 could be cursed"), [0, 1, 0, -1]),
        sc(t("领航员建议新航线", "Your navigator suggests a new route"),
            t("尝试新路线", "Try the new route"), [1, 0, 1, 0],
            t("走老路", "Stick to known waters"), [0, 0, 0, 1]),
        sc(t("一座海岸堡垒防守薄弱", "A coastal fort has weak defenses"),
            t("发起突袭", "Storm the fort"), [1, -1, -1, 1],
            t("绕道避险", "Bypass and avoid the risk"), [0, 1, 1, -1]),
        sc(t("附近传闻有海怪出没", "A sea monster is rumored nearby"),
            t("猎杀以扬名", "Hunt it for glory"), [0, -1, -1, 1],
            t("改变航线", "Change course to safety"), [0, 0, 1, -1]),
        sc(t("掠来的货物需要出手", "Captured loot needs to be fenced"),
            t("在黑市出售", "Sell at a shady port"), [1, 0, -1, -1],
            t("等更好的买家", "Wait for a better buyer"), [0, 0, 0, 1]),
    ],
};

const startupCeo: Theme = {
    name: t("创业公司", "Startup CEO"),
    labels: [t("资金", "Funding"), t("团队", "Team"), t("产品", "Product"), t("用户", "Users")],
    failLow: [
        t("公司资金耗尽，永远关门大吉。", "The company runs out of money. Doors close forever."),
        t("所有人辞职，创业公司无人可用。", "Everyone quits. The startup dies with no one left."),
        t("产品无法使用，用户纷纷离开。", "The product is unusable. Users abandon ship."),
        t("用户归零，投资人撤资。", "Zero users remain. Investors pull the plug."),
    ],
    failHigh: [
        t("投资人夺取控制权，创始人被踢出局。", "Investors seize control. The founder is ousted."),
        t("团队过于庞大，官僚主义扼杀创新。", "The team is too large to manage. Bureaucracy kills innovation."),
        t("过度设计，产品在复杂性中崩溃。", "Over-engineering collapses under its own complexity."),
        t("爆发式增长压垮服务器，公司崩盘。", "Hypergrowth crashes the servers. The company implodes."),
    ],
    scenarios: [
        sc(t("投资人递来投资意向书", "An investor offers a term sheet"),
            t("接受融资", "Accept the funding"), [1, 0, 0, 0],
            t("争取更好条件", "Negotiate harder terms"), [0, -1, 1, 0]),
        sc(t("核心工程师威胁辞职", "A key engineer threatens to quit"),
            t("给他加薪", "Give them a raise"), [-1, 1, 0, 0],
            t("放他走，招更便宜的", "Let them go, hire cheaper"), [1, -1, -1, 0]),
        sc(t("用户反馈严重bug", "Users report a major bug"),
            t("停下一切紧急修复", "Drop everything to fix it"), [0, -1, 1, 1],
            t("排到下个迭代", "Schedule it for next sprint"), [0, 0, -1, -1]),
        sc(t("竞争对手推出同类产品", "A competitor launches a rival product"),
            t("价格战", "Undercut their pricing"), [-1, 0, 1, 1],
            t("加紧开发功能", "Double down on features"), [-1, -1, 1, 0]),
        sc(t("行业大会赞助机会", "Conference sponsorship opportunity"),
            t("赞助参展", "Sponsor the event"), [-1, 1, 0, 1],
            t("省钱不去", "Skip it and save money"), [1, 0, 0, -1]),
        sc(t("团队提议大幅转型", "The team proposes a risky pivot"),
            t("批准转型", "Approve the pivot"), [-1, 0, 1, -1],
            t("坚持当前方向", "Stay the current course"), [0, -1, 0, 1]),
        sc(t("知名科技博客想采访", "A famous tech blog wants an interview"),
            t("接受采访", "Do the interview"), [0, 0, -1, 1],
            t("专心做产品", "Focus on building instead"), [0, 0, 1, -1]),
        sc(t("服务器成本超出预期", "Server costs are higher than expected"),
            t("优化基础设施", "Optimize infrastructure"), [0, -1, 1, 0],
            t("向付费用户转嫁成本", "Pass costs to premium users"), [1, 0, -1, 0]),
        sc(t("潜在收购方找上门", "A potential acquirer reaches out"),
            t("考虑收购", "Explore the offer"), [1, -1, 0, 0],
            t("保持独立", "Stay independent"), [0, 1, 0, 0]),
        sc(t("开源社区想参与贡献", "Open-source community wants to contribute"),
            t("欢迎贡献者", "Welcome contributors"), [0, -1, 1, 1],
            t("保持代码闭源", "Keep the codebase private"), [0, 1, 1, -1]),
        sc(t("产品发布日到了", "Product launch day has arrived"),
            t("大规模营销发布", "Launch with marketing blitz"), [-1, 0, 0, 1],
            t("小范围内测", "Soft launch to test waters"), [0, 0, 1, 0]),
        sc(t("团队想全面远程办公", "Team wants to work remotely full-time"),
            t("全面远程", "Go fully remote"), [1, 1, -1, 0],
            t("混合办公", "Require hybrid schedule"), [0, -1, 1, 0]),
        sc(t("一个平台提供API合作", "A platform offers API partnership"),
            t("立即接入", "Integrate immediately"), [0, -1, 0, 1],
            t("先谈分成", "Negotiate revenue share first"), [1, 0, -1, 0]),
        sc(t("用户增长陷入瓶颈", "User growth is plateauing"),
            t("推出推荐奖励计划", "Launch a referral program"), [-1, 0, 0, 1],
            t("改善留存功能", "Improve retention features"), [-1, 0, 1, 0]),
        sc(t("高强度加班后团队士气低落", "Team morale is slipping after crunch"),
            t("组织团建活动", "Host a team retreat"), [-1, 1, -1, 0],
            t("承诺期权激励", "Promise equity refresh"), [0, 1, 0, -1]),
        sc(t("技术债务堆积如山", "Technical debt is piling up"),
            t("暂停功能，重构代码", "Pause features for refactoring"), [0, 1, 1, -1],
            t("继续赶工发布", "Keep shipping features"), [0, -1, -1, 1]),
        sc(t("名人在社交媒体提到你的产品", "A celebrity tweets about your product"),
            t("趁热打铁做营销", "Capitalize with a campaign"), [-1, 0, -1, 1],
            t("让热度自然发酵", "Let organic buzz grow"), [0, 0, 0, 1]),
        sc(t("新隐私法规生效", "New privacy regulations take effect"),
            t("全面合规投入", "Invest in full compliance"), [-1, -1, 1, 0],
            t("做最低限度应对", "Do the minimum required"), [0, 0, -1, 0]),
        sc(t("一位自由设计师毛遂自荐", "A freelance designer offers help"),
            t("聘用并重新设计UI", "Accept and redesign the UI"), [0, 0, 1, 1],
            t("保持现有设计", "Keep the current look"), [0, 0, 0, 0]),
        sc(t("董事会会议临近", "Board meeting is approaching"),
            t("展示增长计划", "Pitch a growth-focused plan"), [-1, -1, 0, 1],
            t("展示盈利数据", "Show profitability metrics"), [1, 0, -1, 0]),
    ],
};

const wizardAcademy: Theme = {
    name: t("魔法学院", "Wizard Academy"),
    labels: [t("魔力", "Mana"), t("学识", "Knowledge"), t("学生", "Students"), t("声望", "Prestige")],
    failLow: [
        t("魔力之泉枯竭，法术失灵，学院坍塌。", "The mana well runs dry. Spells fail and the academy crumbles."),
        t("所有知识失传，学院陷入蒙昧。", "All knowledge is lost. The academy sinks into ignorance."),
        t("最后一名学生离去，学院空荡荡。", "The last student leaves. The halls stand empty forever."),
        t("学院声誉尽毁，被迫关闭。", "The academy's reputation is ruined. It shuts its doors."),
    ],
    failHigh: [
        t("失控的魔力撕裂了通往异界的裂缝。", "Uncontrolled mana tears a rift to another dimension."),
        t("禁忌知识将学者们逼入疯狂。", "Forbidden knowledge drives the scholars to madness."),
        t("学生过多导致混乱，校园不可收拾。", "Overcrowding leads to chaos. The campus is unmanageable."),
        t("傲慢蒙蔽了评议会，被敌校偷袭。", "Arrogance blinds the council. A rival school strikes."),
    ],
    scenarios: [
        sc(t("一本珍稀法术书正在拍卖", "A rare spellbook is up for auction"),
            t("积极竞拍", "Bid aggressively"), [-1, 1, 0, 0],
            t("让对手学院拍去", "Let a rival school win it"), [0, -1, 0, -1]),
        sc(t("校际魔法锦标赛开赛", "Inter-school magic tournament announced"),
            t("派最优秀的学生参赛", "Enter your best students"), [0, 0, -1, 1],
            t("专注课堂教学", "Focus on classroom teaching"), [0, 1, 1, -1]),
        sc(t("校园下方的灵脉波动异常", "A ley line beneath campus is fluctuating"),
            t("汲取能量", "Harness the surge"), [1, 0, -1, 0],
            t("安全地稳定它", "Stabilize it safely"), [-1, 0, 1, 0]),
        sc(t("校友提供大笔捐赠", "Alumni offer a large donation"),
            t("接受附带条件的捐赠", "Accept with their conditions"), [1, -1, 1, 0],
            t("婉拒以保持独立", "Decline to preserve independence"), [0, 0, -1, 1]),
        sc(t("一名学生意外召唤出恶魔", "A student accidentally summons a demon"),
            t("消耗魔力驱逐", "Banish it with academy mana"), [-1, 1, 0, 1],
            t("疏散并封锁", "Evacuate and contain"), [0, 0, -1, 0]),
        sc(t("一位游历贤者愿来讲学", "A wandering sage offers to lecture"),
            t("邀请他驻校一学期", "Invite them for a semester"), [-1, 1, 1, 0],
            t("婉拒，名额已满", "Politely decline \u2014 full roster"), [0, 0, -1, 0]),
        sc(t("魔法图书馆正在老化", "The enchanted library is decaying"),
            t("全面修复", "Fund full restoration"), [-1, 1, 0, 0],
            t("将藏书转移他处", "Transfer books elsewhere"), [0, -1, -1, 0]),
        sc(t("敌对学院挖走你的教授", "A rival school poaches your professor"),
            t("加薪挽留", "Counter-offer with more pay"), [-1, 1, 0, 1],
            t("内部提拔", "Promote from within"), [0, -1, 1, -1]),
        sc(t("学生请愿开设实践课", "Students petition for practical classes"),
            t("增设战斗魔法课", "Add combat magic courses"), [-1, 0, 1, 0],
            t("坚持理论教学", "Maintain theoretical focus"), [0, 1, -1, 1]),
        sc(t("校园中出土一件强力神器", "A powerful artifact is unearthed on campus"),
            t("送入实验室研究", "Study it in the lab"), [0, 1, -1, 1],
            t("吸收其魔力储备", "Absorb its mana reserves"), [1, 0, 0, -1]),
        sc(t("入学申请蜂拥而至", "Enrollment applications flood in"),
            t("扩大招生", "Accept more students"), [-1, 0, 1, 0],
            t("提高入学门槛", "Raise admission standards"), [0, 0, -1, 1]),
        sc(t("一场魔法瘟疫侵袭学生", "A magical plague affects students"),
            t("隔离救治", "Quarantine and heal them"), [-1, 0, 1, 0],
            t("研究永久治愈之法", "Research a permanent cure"), [-1, -1, -1, 1]),
        sc(t("年度魔力水晶采收将至", "Annual mana crystal harvest approaches"),
            t("加倍采收", "Double the harvest"), [1, 0, -1, -1],
            t("可持续采收", "Harvest sustainably"), [0, 0, 1, 1]),
        sc(t("一个贵族家庭要求入学特权", "A noble family wants their child enrolled"),
            t("破格录取并给予奖学金", "Admit with a scholarship"), [-1, 0, 1, 1],
            t("要求标准考核", "Require standard testing"), [0, 0, 0, 0]),
        sc(t("有人提议一项禁忌实验", "A forbidden experiment is proposed"),
            t("秘密批准", "Approve it secretly"), [-1, 1, 0, -1],
            t("公开禁止", "Ban it publicly"), [0, -1, 0, 1]),
        sc(t("魔力之泉即将枯竭", "The mana well is running dry"),
            t("寻找新魔力源", "Seek a new mana source"), [-1, 0, 0, 1],
            t("限量配给", "Ration mana for essentials"), [0, -1, -1, 0]),
        sc(t("一只幽灵出没宿舍", "A ghost haunts the dormitory"),
            t("以仪式驱逐", "Exorcise it with a ritual"), [-1, 1, 1, 0],
            t("留下来研究", "Study it for research"), [0, 1, -1, 0]),
        sc(t("法师评议会邀请参加峰会", "Council of Mages invites you to a summit"),
            t("亲自出席", "Attend and network"), [-1, 0, -1, 1],
            t("派代表前往", "Send a representative"), [0, 0, 1, 0]),
        sc(t("学生发现一条隐秘通道", "Students discover a hidden passage"),
            t("探索并记录", "Explore and document it"), [0, 1, 1, 0],
            t("封闭以保安全", "Seal it for safety"), [0, 0, -1, 1]),
        sc(t("课堂上一场魔法决斗失控", "A magical duel goes wrong in class"),
            t("开除肇事学生", "Expel the responsible student"), [0, 0, -1, 1],
            t("作为教学案例", "Use it as a teaching moment"), [-1, 1, 1, -1]),
    ],
};

const zombieSurvival: Theme = {
    name: t("末日求生", "Zombie Survival"),
    labels: [t("物资", "Supplies"), t("武器", "Weapons"), t("幸存者", "Survivors"), t("希望", "Hope")],
    failLow: [
        t("物资耗尽，饥饿吞噬了营地。", "No supplies left. Starvation claims the camp."),
        t("手无寸铁，营地被丧尸攻陷。", "Defenseless against the horde. The camp is overrun."),
        t("无人生还，最后的灯火熄灭。", "No one is left. The last light goes out."),
        t("希望破灭，幸存者四散逃入荒野。", "All hope is lost. The survivors scatter into the wasteland."),
    ],
    failHigh: [
        t("过度囤积引来匪帮，一切被夺走。", "Hoarding attracts raiders. They take everything by force."),
        t("走火引发灾难性爆炸。", "An accidental discharge triggers a catastrophic explosion."),
        t("人口过多，营地在自身重压下崩溃。", "Too many mouths. The camp collapses under its own weight."),
        t("盲目自信导致鲁莽行动，酿成大祸。", "Overconfidence leads to a reckless mission. It ends in disaster."),
    ],
    scenarios: [
        sc(t("两个街区外发现一家超市", "A supermarket is spotted two blocks away"),
            t("全员出动大搜刮", "Send everyone for a big haul"), [1, 0, -1, 0],
            t("派小队谨慎行动", "Send a small careful team"), [0, 0, 1, 1]),
        sc(t("一群幸存者在屋顶求救", "A survivor group signals from a rooftop"),
            t("尝试营救", "Attempt a rescue"), [-1, -1, 1, 1],
            t("可能是陷阱，不理会", "It could be a trap \u2014 ignore it"), [0, 0, -1, -1]),
        sc(t("营地水源被污染", "The camp's water supply is contaminated"),
            t("烧水并严格配给", "Boil all water, ration carefully"), [-1, 0, -1, 0],
            t("寻找新水源", "Search for a new source"), [0, -1, 0, 1]),
        sc(t("附近有一辆军用车残骸", "A military convoy wreck is nearby"),
            t("搜刮武器弹药", "Scavenge weapons and ammo"), [0, 1, -1, 0],
            t("拆卸获取物资", "Strip it for supplies instead"), [1, 0, 0, 0]),
        sc(t("一个陌生人提出交易", "A stranger approaches with a trade offer"),
            t("用物资换武器", "Trade supplies for weapons"), [-1, 1, 0, 0],
            t("拒绝，谁也不信", "Refuse \u2014 trust no one"), [0, 0, -1, -1]),
        sc(t("丧尸在东墙外集结", "Zombies are massing near the east wall"),
            t("加固防线应战", "Fortify and fight"), [0, -1, 0, 1],
            t("撤退至备用据点", "Evacuate to backup location"), [-1, 0, -1, 0]),
        sc(t("在建筑物中发现一个小孩", "A child is found hiding in a building"),
            t("收留", "Take them in"), [-1, 0, 1, 1],
            t("给些食物让他离开", "Give food and send them away"), [-1, 0, -1, 0]),
        sc(t("旧电台收到一段坐标广播", "An old radio broadcast gives coordinates"),
            t("前往调查", "Investigate the signal"), [-1, 0, -1, 1],
            t("留守，太危险了", "Stay put \u2014 too risky"), [0, 0, 1, -1]),
        sc(t("夜袭愈发频繁", "Night raids are getting more frequent"),
            t("增加哨兵", "Post extra guards"), [0, -1, 0, 1],
            t("在周围布设陷阱", "Set traps around the perimeter"), [0, 1, -1, 0]),
        sc(t("药品告急", "Medicine is running dangerously low"),
            t("突袭附近药房", "Raid the nearby pharmacy"), [1, 0, -1, 0],
            t("用草药替代", "Use herbal remedies"), [0, 0, 1, 0]),
        sc(t("一名被咬的幸存者隐瞒伤口", "A bitten survivor hides their wound"),
            t("隔离并善待", "Quarantine them with compassion"), [-1, 0, 0, 1],
            t("立即驱逐", "Exile them immediately"), [0, 0, -1, -1]),
        sc(t("暴雨淹没营地", "Rain floods the camp"),
            t("转移到高地", "Move to higher ground"), [-1, 0, -1, 0],
            t("挖排水沟留守", "Dig drainage and stay"), [0, -1, 1, 0]),
        sc(t("另一个团体提议合并营地", "Another group proposes merging camps"),
            t("合并共享资源", "Merge and share resources"), [-1, -1, 1, 1],
            t("保持独立", "Stay independent"), [0, 0, -1, 0]),
        sc(t("发电机燃料即将耗尽", "Generator fuel is running out"),
            t("从废弃车辆中抽取", "Siphon from abandoned cars"), [1, 0, -1, 0],
            t("关灯节约", "Go dark and conserve"), [0, 0, -1, -1]),
        sc(t("一大群丧尸正朝这里移动", "A zombie horde is heading this way"),
            t("殊死抵抗", "Stand and fight"), [0, -1, -1, 1],
            t("撤离寻找新庇护所", "Flee and find new shelter"), [-1, 0, -1, 0]),
        sc(t("一只狗走进了营地", "A dog wanders into camp"),
            t("收养作为哨兵", "Adopt it as a lookout"), [-1, 0, 1, 1],
            t("赶走它", "Shoo it away"), [0, 0, -1, 0]),
        sc(t("有人发现一辆能开的车", "Someone finds a working car"),
            t("用于物资运输", "Use it for supply runs"), [1, 0, -1, 0],
            t("留作紧急撤离", "Save it for emergency escape"), [0, 0, 1, 1]),
        sc(t("冬天即将来临", "Winter is approaching fast"),
            t("囤积柴火和毛毯", "Stockpile firewood and blankets"), [-1, 0, 1, 0],
            t("加固住所", "Build better shelter instead"), [0, -1, 1, 0]),
        sc(t("一张地图标注了传闻中的安全区", "A map shows a rumored safe zone"),
            t("出发寻找", "Set out to find it"), [-1, 0, -1, 1],
            t("加强现有防御", "Improve current defenses"), [0, 1, 0, -1]),
        sc(t("地下室发现一批罐头", "Canned food cache found in a basement"),
            t("平分给每个人", "Share equally with everyone"), [1, 0, 1, 0],
            t("严格配给", "Ration it strictly"), [1, 0, -1, 0]),
    ],
};

const restaurantOwner: Theme = {
    name: t("餐厅经营", "Restaurant Owner"),
    labels: [t("资金", "Money"), t("员工", "Staff"), t("客流", "Customers"), t("口碑", "Reviews")],
    failLow: [
        t("破产了，餐厅永远关门。", "Bankrupt. The restaurant closes its doors for good."),
        t("厨师服务员全走了，后厨冷锅冷灶。", "No one left to cook or serve. The kitchen goes cold."),
        t("每晚空无一人，交不起房租。", "Empty tables every night. You can't pay the rent."),
        t("差评铺天盖地，无人愿来用餐。", "Devastating reviews go viral. No one will eat here."),
    ],
    failHigh: [
        t("税务稽查发现账目问题，面临法律危机。", "Tax audit reveals irregular books. You face legal ruin."),
        t("人员过剩消耗资金，裁员重创士气。", "Overstaffing bleeds money dry. Layoffs destroy morale."),
        t("需求暴增把团队累垮，品质急剧下降。", "Overwhelming demand burns out the team. Quality collapses."),
        t("炒作过度脱离实际，反噬又快又猛。", "The hype exceeds reality. The backlash is swift and brutal."),
    ],
    scenarios: [
        sc(t("今晚有美食评论家来用餐", "A food critic is dining tonight"),
            t("全力以赴", "Pull out all the stops"), [-1, -1, 0, 1],
            t("照常出品", "Serve the regular menu"), [0, 0, 0, -1]),
        sc(t("明星厨师提议合作", "A celebrity chef offers a collaboration"),
            t("联合举办特别活动", "Co-host a special event"), [-1, 1, 1, 1],
            t("婉拒，保持本色", "Decline \u2014 stay authentic"), [0, 0, -1, 0]),
        sc(t("租约续签在即", "The lease renewal is coming up"),
            t("强硬谈判", "Negotiate aggressively"), [1, -1, 0, 0],
            t("接受涨租", "Accept the increase peacefully"), [-1, 0, 1, 0]),
        sc(t("隔壁开了一家竞争对手", "A competitor opens next door"),
            t("推出打折活动", "Launch a discount campaign"), [-1, 0, 1, -1],
            t("加倍提升品质", "Double down on quality"), [-1, -1, 0, 1]),
        sc(t("主厨提议全面更新菜单", "Head chef wants a menu overhaul"),
            t("批准新菜单", "Approve the new menu"), [-1, 1, 0, 1],
            t("保留招牌菜", "Keep the proven favorites"), [0, -1, 1, 0]),
        sc(t("收到一份大型宴会订单", "A catering contract is offered"),
            t("接下大单", "Accept the big contract"), [1, -1, -1, 0],
            t("专注堂食", "Focus on the restaurant"), [0, 0, 1, 0]),
        sc(t("厨房设备老化损坏", "Kitchen equipment is breaking down"),
            t("购买新设备", "Buy new equipment"), [-1, 1, 0, 0],
            t("修理旧设备", "Repair the old stuff"), [0, -1, 0, 0]),
        sc(t("明天卫生检查", "Health inspector is visiting tomorrow"),
            t("连夜大扫除", "Deep clean everything tonight"), [-1, -1, -1, 1],
            t("听天由命", "Hope for the best"), [0, 0, 0, -1]),
        sc(t("员工集体要求加薪", "Staff asks for a raise"),
            t("同意加薪", "Grant the raises"), [-1, 1, 0, 0],
            t("改善福利替代", "Offer perks instead"), [0, 1, 0, -1]),
        sc(t("一条短视频让你的菜火了", "A viral TikTok features your dish"),
            t("趁热推出活动", "Capitalize with a promo"), [-1, -1, 1, 1],
            t("让热度自然发展", "Let the buzz grow naturally"), [0, 0, 1, 0]),
        sc(t("外卖平台邀请入驻", "Delivery app wants a partnership"),
            t("加入平台", "Join the platform"), [1, -1, -1, 0],
            t("坚持堂食", "Stay dine-in only"), [0, 0, 1, 0]),
        sc(t("本地慈善机构请求捐赠", "Local charity asks for a donation"),
            t("捐赠一桌酒席", "Donate a catered meal"), [-1, 1, 1, 1],
            t("婉拒", "Politely decline"), [0, 0, -1, -1]),
        sc(t("招牌食材供应紧张", "Signature ingredient is hard to source"),
            t("花高价保质量", "Pay premium for quality"), [-1, 0, 0, 1],
            t("暂时下架该菜品", "Remove the dish temporarily"), [0, 0, -1, -1]),
        sc(t("一位常客开始闹事", "A regular customer becomes disruptive"),
            t("好言相劝", "Have a gentle talk"), [0, -1, 1, 0],
            t("直接拉黑", "Ban them from the restaurant"), [0, 0, -1, 1]),
        sc(t("附近举办美食卡车节", "Food truck festival in the neighborhood"),
            t("设摊参加", "Set up a stall too"), [-1, -1, 1, 0],
            t("店内推出特惠", "Offer indoor specials instead"), [0, 0, -1, 1]),
        sc(t("电视节目想来拍摄", "A TV show wants to film here"),
            t("允许拍摄", "Allow the filming"), [-1, -1, 0, 1],
            t("拒绝，太打扰了", "Decline \u2014 too disruptive"), [0, 0, 1, -1]),
        sc(t("节日旺季来了", "Holiday season approaches"),
            t("推出节日限定菜单", "Create a seasonal menu"), [-1, 1, 1, 1],
            t("简单应对", "Keep things simple"), [1, 0, -1, 0]),
        sc(t("一位资深厨师来应聘", "A veteran cook applies for a job"),
            t("高薪聘用", "Hire them at top rate"), [-1, 1, 0, 0],
            t("预算不够，不招", "Pass \u2014 budget is tight"), [0, -1, 0, 0]),
        sc(t("点评网站写手威胁给差评", "Yelp reviewer threatens a bad write-up"),
            t("免单打发", "Comp their meal"), [-1, 0, 0, 1],
            t("不理会威胁", "Ignore the threat"), [0, 0, 0, -1]),
        sc(t("收到美食节目邀请", "You're offered a spot on a food show"),
            t("上节目", "Appear on the show"), [-1, -1, 0, 1],
            t("留在厨房", "Stay in the kitchen"), [0, 0, 1, -1]),
    ],
};

const bandManager: Theme = {
    name: t("乐队经纪", "Band Manager"),
    labels: [t("预算", "Budget"), t("士气", "Morale"), t("粉丝", "Fans"), t("创作力", "Creativity")],
    failLow: [
        t("破产了，连琴弦都买不起。", "Broke. The band can't afford strings, let alone a tour."),
        t("乐队解散，创作分歧毁了一切。", "The band breaks up. Creative differences destroy everything."),
        t("观众消失，台下空无一人。", "No audience left. You're playing to empty rooms."),
        t("灵感枯竭，音乐就此死去。", "Writer's block becomes permanent. The music dies."),
    ],
    failHigh: [
        t("唱片公司接管一切，艺术自由荡然无存。", "The label takes over. Artistic freedom is gone forever."),
        t("自我膨胀到极点，乐队自我毁灭。", "Egos inflate to bursting. The band self-destructs."),
        t("演唱会发生骚乱，酿成严重事故。", "Mob mentality at a concert leads to a dangerous incident."),
        t("作品过于抽象，连粉丝也听不懂了。", "The art becomes so abstract even fans can't follow."),
    ],
    scenarios: [
        sc(t("一家唱片公司递来合约", "A record label offers a deal"),
            t("签约", "Sign the contract"), [1, -1, 0, -1],
            t("保持独立", "Stay independent"), [-1, 1, 0, 1]),
        sc(t("鼓手想搞个人项目", "The drummer wants to try a solo project"),
            t("支持他，乐队休息", "Support it \u2014 take a break"), [-1, 1, -1, 1],
            t("劝他专注乐队", "Convince them to stay focused"), [0, -1, 1, 0]),
        sc(t("大型音乐节邀请你们演出", "A big festival invites you to play"),
            t("接受并全力准备", "Accept and go all out"), [-1, 1, 1, 0],
            t("婉拒，专心做专辑", "Decline to work on the album"), [0, 0, -1, 1]),
        sc(t("粉丝要求演出时唱老歌", "Fans demand you play old hits at shows"),
            t("演奏经典曲目", "Play the classics"), [1, -1, 1, -1],
            t("首演新作品", "Premiere new material instead"), [-1, 0, -1, 1]),
        sc(t("主唱嗓子出了问题", "The lead singer is losing their voice"),
            t("取消演出养嗓", "Cancel shows for recovery"), [-1, 0, -1, 0],
            t("带病坚持巡演", "Push through the tour"), [1, -1, 1, -1]),
        sc(t("一个品牌想请乐队拍广告", "A brand wants the band in a commercial"),
            t("接受商业合作", "Take the sponsor deal"), [1, -1, -1, 0],
            t("拒绝商业化", "Refuse to sell out"), [0, 1, 0, 1]),
        sc(t("有打折的录音棚档期", "Studio time is available at a discount"),
            t("立即预订", "Book it immediately"), [-1, 1, 0, 1],
            t("省钱在家排练", "Save money, practice at home"), [0, 0, 0, 0]),
        sc(t("你们的歌被人翻唱后火了", "A cover of your song goes viral"),
            t("与翻唱者合作", "Collaborate with the creator"), [0, 1, 1, 0],
            t("要求下架", "Demand a takedown"), [1, -1, -1, 0]),
        sc(t("乐队因创作方向争吵", "Band fights over creative direction"),
            t("民主投票决定", "Hold a democratic vote"), [0, 1, 0, -1],
            t("坚持创始人的愿景", "Follow the founder's vision"), [0, -1, 0, 1]),
        sc(t("一场大牌演出提供暖场机会", "Opening slot for a major act is offered"),
            t("接受暖场", "Take the opening slot"), [-1, 0, 1, 0],
            t("只接头牌演出", "Only accept headlining gigs"), [0, 1, -1, 1]),
        sc(t("MV预算紧张", "Music video budget is tight"),
            t("拍低成本DIY风格", "Make a lo-fi DIY video"), [0, 1, 0, 1],
            t("借钱拍专业MV", "Go into debt for a pro video"), [-1, 0, 1, 0]),
        sc(t("粉丝会要求举办见面会", "Fan club wants exclusive meetups"),
            t("举办粉丝活动", "Host fan events"), [-1, 1, 1, -1],
            t("保持神秘感", "Keep a mysterious distance"), [0, -1, 0, 1]),
        sc(t("一位制作人想重新混音你们的歌", "A producer offers to remix your track"),
            t("接受混音", "Accept the remix"), [0, 0, 1, -1],
            t("保留原版", "Keep the original sound"), [0, 1, -1, 1]),
        sc(t("周边商提议推出新产品线", "Merch vendor proposes a new line"),
            t("推出周边", "Launch the merch line"), [1, 0, 1, -1],
            t("专注音乐", "Focus on the music"), [0, 1, -1, 1]),
        sc(t("一个争议话题可以写成歌词", "A controversial topic could inspire lyrics"),
            t("大胆创作", "Write about it boldly"), [0, 0, -1, 1],
            t("求稳不碰", "Play it safe"), [0, 0, 1, -1]),
        sc(t("巡演大巴抛锚了", "The tour bus breaks down"),
            t("租一辆替代", "Rent a replacement"), [-1, 1, 0, 0],
            t("取消几场演出", "Cancel the next few dates"), [0, -1, -1, 0]),
        sc(t("流媒体平台提供推荐位", "A streaming platform offers a playlist spot"),
            t("接受独家条款", "Accept exclusivity clause"), [1, 0, 1, -1],
            t("留在所有平台", "Stay on all platforms"), [0, 0, 0, 1]),
        sc(t("乐队成员写了一首很私人的歌", "Band member writes a deeply personal song"),
            t("收入专辑", "Include it on the album"), [0, 1, 0, 1],
            t("留给他个人发行", "Save it for a solo release"), [0, -1, 0, 0]),
        sc(t("一家本地酒吧提供驻场机会", "Local venue offers a residency"),
            t("接受驻场", "Accept the residency"), [1, 0, 1, -1],
            t("继续巡演", "Keep touring instead"), [-1, -1, 1, 0]),
        sc(t("一位老队友想回归", "An old bandmate wants to rejoin"),
            t("欢迎回来", "Welcome them back"), [0, 1, 0, -1],
            t("保持现有阵容", "Keep the current lineup"), [0, 0, 1, 1]),
    ],
};

export const ALL_THEMES: Theme[] = [
    medievalKingdom, spaceColony, pirateCaptain, startupCeo,
    wizardAcademy, zombieSurvival, restaurantOwner, bandManager,
];
