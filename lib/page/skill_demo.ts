type SkillId = string;
type ForestId = string;
type SkillState = "locked" | "available" | "learned" | "max";

interface SkillRequirement {
    skillId: SkillId;
    level: number;
}

interface DemoSkill {
    id: SkillId;
    name: string;
    maxLevel: number;
    x: number;
    y: number;
    prerequisites: SkillRequirement[];
}

interface DemoForest {
    id: ForestId;
    name: string;
    description: string;
    accent: string;
    skills: DemoSkill[];
}

type SkillLevels = Record<SkillId, number>;

interface CascadeRemoval {
    skillId: SkillId;
    previousLevel: number;
}

interface UnlearnPreview {
    targetId: SkillId;
    nextLevels: SkillLevels;
    cascade: CascadeRemoval[];
    refund: number;
}

const DEFAULT_POINT_BANK = 12;
const TREE_WIDTH = 1100;
const TREE_HEIGHT = 600;
// These values are also passed to CSS custom properties in render(), keeping
// the arrow geometry and the visible card bounds in lockstep.
const SKILL_CARD_SIZE = 148;
const SKILL_CARD_HALF = SKILL_CARD_SIZE / 2;

// This is deliberately mock-only data. It is not connected to the skill-forest
// model, so the interaction can remain a lightweight site demo.
const FORESTS: DemoForest[] = [
    {
        id: "ember-path",
        name: "Ember Path",
        description: "Two independent roots must converge at a ward before they can feed a firestorm.",
        accent: "#cb4b16",
        skills: [
            { id: "ember-spark", name: "Spark", maxLevel: 3, x: 130, y: 160, prerequisites: [] },
            { id: "ember-coal", name: "Coal", maxLevel: 3, x: 130, y: 440, prerequisites: [] },
            {
                id: "ember-kindling",
                name: "Kindling",
                maxLevel: 3,
                x: 400,
                y: 160,
                prerequisites: [{ skillId: "ember-spark", level: 2 }],
            },
            {
                id: "ember-cinder",
                name: "Cinder",
                maxLevel: 3,
                x: 400,
                y: 440,
                prerequisites: [{ skillId: "ember-coal", level: 1 }],
            },
            {
                id: "ember-ward",
                name: "Flame Ward",
                maxLevel: 2,
                x: 700,
                y: 300,
                prerequisites: [
                    { skillId: "ember-kindling", level: 2 },
                    { skillId: "ember-cinder", level: 2 },
                ],
            },
            {
                id: "ember-firestorm",
                name: "Firestorm",
                maxLevel: 2,
                x: 970,
                y: 300,
                prerequisites: [{ skillId: "ember-ward", level: 2 }],
            },
        ],
    },
    {
        id: "tidecraft",
        name: "Tidecraft",
        description: "One shell fans into three water disciplines; all three feed the finishing strike.",
        accent: "#268bd2",
        skills: [
            { id: "tide-shell", name: "Shell", maxLevel: 3, x: 130, y: 300, prerequisites: [] },
            {
                id: "tide-current",
                name: "Current",
                maxLevel: 3,
                x: 400,
                y: 130,
                prerequisites: [{ skillId: "tide-shell", level: 1 }],
            },
            {
                id: "tide-kelp",
                name: "Kelp Guard",
                maxLevel: 3,
                x: 400,
                y: 470,
                prerequisites: [{ skillId: "tide-shell", level: 2 }],
            },
            {
                id: "tide-undertow",
                name: "Undertow",
                maxLevel: 2,
                x: 400,
                y: 300,
                prerequisites: [{ skillId: "tide-shell", level: 3 }],
            },
            {
                id: "tide-lance",
                name: "Tidal Lance",
                maxLevel: 2,
                x: 920,
                y: 300,
                prerequisites: [
                    { skillId: "tide-current", level: 2 },
                    { skillId: "tide-undertow", level: 1 },
                    { skillId: "tide-kelp", level: 2 },
                ],
            },
        ],
    },
    {
        id: "skyforge",
        name: "Skyforge",
        description: "A draft becomes a single climb, then splits into height and footing before a storm call.",
        accent: "#6c71c4",
        skills: [
            { id: "sky-draft", name: "Draft", maxLevel: 3, x: 120, y: 300, prerequisites: [] },
            {
                id: "sky-glide",
                name: "Glide",
                maxLevel: 3,
                x: 400,
                y: 300,
                prerequisites: [{ skillId: "sky-draft", level: 1 }],
            },
            {
                id: "sky-cloudstep",
                name: "Cloudstep",
                maxLevel: 3,
                x: 680,
                y: 450,
                prerequisites: [{ skillId: "sky-glide", level: 1 }],
            },
            {
                id: "sky-updraft",
                name: "Updraft",
                maxLevel: 2,
                x: 680,
                y: 150,
                prerequisites: [{ skillId: "sky-glide", level: 2 }],
            },
            {
                id: "sky-stormcall",
                name: "Stormcall",
                maxLevel: 2,
                x: 950,
                y: 300,
                prerequisites: [
                    { skillId: "sky-updraft", level: 1 },
                    { skillId: "sky-cloudstep", level: 2 },
                ],
            },
        ],
    },
];

const ALL_SKILLS = FORESTS.flatMap((forest) => forest.skills);
const SKILLS_BY_ID = new Map<SkillId, DemoSkill>(ALL_SKILLS.map((skill) => [skill.id, skill]));

let activeForestId: ForestId = FORESTS[0].id;
let pointBank = DEFAULT_POINT_BANK;
let levels = emptyLevels();
let pendingUnlearn: UnlearnPreview | null = null;
let statusMessage = "Start with any available root skill. Every +1 costs one point from the shared bank.";

function emptyLevels(): SkillLevels {
    return Object.fromEntries(ALL_SKILLS.map((skill) => [skill.id, 0]));
}

function getSkill(skillId: SkillId): DemoSkill {
    const skill = SKILLS_BY_ID.get(skillId);
    if (!skill) {
        throw new Error(`Unknown demo skill: ${skillId}`);
    }
    return skill;
}

function getForest(forestId: ForestId): DemoForest {
    const forest = FORESTS.find((candidate) => candidate.id === forestId);
    if (!forest) {
        throw new Error(`Unknown demo forest: ${forestId}`);
    }
    return forest;
}

function spentPoints(currentLevels: SkillLevels): number {
    return Object.values(currentLevels).reduce((total, level) => total + level, 0);
}

function availablePoints(): number {
    return pointBank - spentPoints(levels);
}

function unmetRequirements(skill: DemoSkill, currentLevels: SkillLevels): SkillRequirement[] {
    return skill.prerequisites.filter((requirement) => (currentLevels[requirement.skillId] ?? 0) < requirement.level);
}

function requirementNames(requirements: readonly SkillRequirement[]): string {
    return requirements
        .map((requirement) => `${getSkill(requirement.skillId).name} Lv. ${requirement.level}`)
        .join(", ");
}

function getSkillState(skill: DemoSkill): SkillState {
    const currentLevel = levels[skill.id] ?? 0;
    if (currentLevel >= skill.maxLevel) {
        return "max";
    }
    if (currentLevel > 0) {
        return "learned";
    }
    return unmetRequirements(skill, levels).length === 0 ? "available" : "locked";
}

function stateLabel(state: SkillState): string {
    switch (state) {
        case "locked": return "Locked";
        case "available": return "Available";
        case "learned": return "Learned";
        case "max": return "Max";
    }
}

function learnReason(skill: DemoSkill): string | null {
    const currentLevel = levels[skill.id] ?? 0;
    if (currentLevel >= skill.maxLevel) {
        return `${skill.name} is already at its maximum level.`;
    }
    const missing = unmetRequirements(skill, levels);
    if (missing.length > 0) {
        return `Requires ${requirementNames(missing)}.`;
    }
    if (availablePoints() < 1) {
        return "The shared point bank is empty.";
    }
    return null;
}

function previewUnlearn(skillId: SkillId, currentLevels: SkillLevels): UnlearnPreview {
    const target = getSkill(skillId);
    const targetLevel = currentLevels[skillId] ?? 0;
    if (targetLevel <= 0) {
        throw new Error(`${target.name} is not learned.`);
    }

    const nextLevels: SkillLevels = { ...currentLevels, [skillId]: targetLevel - 1 };
    const cascade: CascadeRemoval[] = [];
    let removedSomething = true;

    // A dependent cannot retain any levels once one of its direct requirements
    // is missed. Repeating this pass discovers indirect dependents too.
    while (removedSomething) {
        removedSomething = false;
        for (const skill of ALL_SKILLS) {
            if (skill.id === skillId) {
                continue;
            }
            const currentLevel = nextLevels[skill.id] ?? 0;
            if (currentLevel === 0 || unmetRequirements(skill, nextLevels).length === 0) {
                continue;
            }
            nextLevels[skill.id] = 0;
            cascade.push({ skillId: skill.id, previousLevel: currentLevel });
            removedSomething = true;
        }
    }

    return {
        targetId: skillId,
        nextLevels,
        cascade,
        refund: spentPoints(currentLevels) - spentPoints(nextLevels),
    };
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
    }[character] ?? character));
}

function cardBoundaryPoint(from: DemoSkill, to: DemoSkill): { x: number; y: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const largestDistance = Math.max(Math.abs(dx), Math.abs(dy));
    if (largestDistance === 0) {
        throw new Error("A prerequisite and dependent skill cannot share a position.");
    }
    const scale = SKILL_CARD_HALF / largestDistance;
    return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function edgesMarkup(forest: DemoForest): string {
    const arrowId = `${forest.id}-arrow`;
    const lines = forest.skills.flatMap((dependent) => dependent.prerequisites.map((requirement) => {
        const prerequisite = getSkill(requirement.skillId);
        const start = cardBoundaryPoint(prerequisite, dependent);
        const end = cardBoundaryPoint(dependent, prerequisite);
        const middleX = (start.x + end.x) / 2;
        const middleY = (start.y + end.y) / 2;
        const title = `${dependent.name} requires ${prerequisite.name} level ${requirement.level}`;
        return `
          <g class="skill-edge">
            <title>${escapeHtml(title)}</title>
            <line class="skill-edge-line" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" marker-end="url(#${arrowId})"></line>
            <g class="requirement-pill" transform="translate(${middleX} ${middleY})">
              <rect x="-53" y="-13" width="106" height="26" rx="13"></rect>
              <text x="0" y="1">Requires Lv. ${requirement.level}</text>
            </g>
          </g>`;
    }));

    return `
      <svg class="skill-tree-svg" viewBox="0 0 ${TREE_WIDTH} ${TREE_HEIGHT}" aria-label="${escapeHtml(forest.name)} dependency graph" role="img">
        <defs>
          <marker id="${arrowId}" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="${forest.accent}"></path>
          </marker>
        </defs>
        ${lines.join("")}
      </svg>`;
}

function levelPips(skill: DemoSkill, currentLevel: number): string {
    return Array.from({ length: skill.maxLevel }, (_, index) =>
        `<span class="level-pip${index < currentLevel ? " is-filled" : ""}" aria-hidden="true"></span>`,
    ).join("");
}

function skillCardMarkup(skill: DemoSkill): string {
    const currentLevel = levels[skill.id] ?? 0;
    const state = getSkillState(skill);
    const reason = learnReason(skill);
    const canUnlearn = currentLevel > 0;
    const learnTitle = reason ?? `Learn ${skill.name} to level ${currentLevel + 1}.`;
    const unlearnTitle = canUnlearn
        ? `Refund one level of ${skill.name}. A warning appears only if learned dependents would break.`
        : `${skill.name} has no learned levels to refund.`;

    return `
      <article class="skill-card" data-state="${state}" style="left:${skill.x - SKILL_CARD_HALF}px; top:${skill.y - SKILL_CARD_HALF}px;" aria-label="${escapeHtml(skill.name)}, ${stateLabel(state)}, level ${currentLevel} of ${skill.maxLevel}">
        <div>
          <span class="skill-state">${stateLabel(state)}</span>
          <span class="skill-name">${escapeHtml(skill.name)}</span>
          <span class="skill-level">Lv. ${currentLevel} / ${skill.maxLevel}</span>
          <span class="level-track" aria-label="Level ${currentLevel} of ${skill.maxLevel}">${levelPips(skill, currentLevel)}</span>
        </div>
        <div class="skill-actions">
          <button class="learn-button" type="button" data-action="learn" data-skill-id="${skill.id}" ${reason ? "disabled" : ""} title="${escapeHtml(learnTitle)}" aria-label="Learn ${escapeHtml(skill.name)} by one level">+1</button>
          <button class="unlearn-button" type="button" data-action="unlearn" data-skill-id="${skill.id}" ${canUnlearn ? "" : "disabled"} title="${escapeHtml(unlearnTitle)}" aria-label="Unlearn ${escapeHtml(skill.name)} by one level">−1</button>
        </div>
      </article>`;
}

function treeKeyMarkup(): string {
    return `
      <div class="tree-key" aria-label="Skill state legend">
        <span class="tree-key-item"><span class="tree-key-swatch"></span>Locked</span>
        <span class="tree-key-item"><span class="tree-key-swatch available"></span>Available</span>
        <span class="tree-key-item"><span class="tree-key-swatch learned"></span>Learned</span>
        <span class="tree-key-item"><span class="tree-key-swatch max"></span>Max</span>
        <span class="tree-key-item">Pill = direct prerequisite level</span>
      </div>`;
}

function unlearnPanelMarkup(): string {
    if (!pendingUnlearn) {
        return "";
    }

    const target = getSkill(pendingUnlearn.targetId);
    const nextTargetLevel = pendingUnlearn.nextLevels[target.id] ?? 0;
    const cascade = pendingUnlearn.cascade;
    const cascadeItems = cascade.map((removal) => {
        const skill = getSkill(removal.skillId);
        return `<li>${escapeHtml(skill.name)}: Lv. ${removal.previousLevel} → 0</li>`;
    }).join("");

    return `
      <section class="unlearn-panel is-warning" aria-labelledby="unlearn-warning-title">
        <div>
          <h3 id="unlearn-warning-title" tabindex="-1">Lowering ${escapeHtml(target.name)} to Lv. ${nextTargetLevel} would break dependencies</h3>
          <p><strong>Safe refund is blocked.</strong> These learned skills would become invalid:</p>
          <ul class="cascade-list">${cascadeItems}</ul>
          <p>Cascade unlearn refunds <strong>${pendingUnlearn.refund} points</strong> in total.</p>
        </div>
        <div class="unlearn-actions">
          <button class="cascade-button" type="button" data-action="confirm-cascade">Cascade −1 · refund ${pendingUnlearn.refund}</button>
          <button type="button" data-action="cancel-unlearn">Cancel</button>
        </div>
      </section>`;
}

interface ButtonFocusRequest {
    kind: "button";
    action: string;
    skillId?: SkillId;
    forestId?: ForestId;
    fallbackAction?: string;
}

type FocusRequest = ButtonFocusRequest | { kind: "warning" };

interface DemoDom {
    root: HTMLElement;
    bankAvailable: HTMLSpanElement;
    bankTotal: HTMLSpanElement;
    budgetInput: HTMLInputElement;
    bankSpent: HTMLSpanElement;
    tabs: Map<ForestId, HTMLButtonElement>;
    panels: Map<ForestId, HTMLElement>;
    warning: HTMLElement;
    status: HTMLParagraphElement;
}

function forestTabMarkup(forest: DemoForest): string {
    const isActive = forest.id === activeForestId;
    return `
      <button class="forest-tab" type="button" role="tab" id="${forest.id}-tab" aria-selected="${isActive}" aria-controls="${forest.id}-panel" tabindex="${isActive ? 0 : -1}" data-action="select-forest" data-forest-id="${forest.id}" style="--tree-accent:${forest.accent};">
        ${escapeHtml(forest.name)}
      </button>`;
}

function forestPanelShellMarkup(forest: DemoForest): string {
    return `
      <section class="skill-tree-panel panel" id="${forest.id}-panel" role="tabpanel" aria-labelledby="${forest.id}-tab" data-forest-panel="${forest.id}" style="--tree-accent:${forest.accent};"></section>`;
}

function forestPanelContentsMarkup(forest: DemoForest): string {
    return `
      <div class="tree-heading">
        <div>
          <span class="tree-kicker">Mock forest · shared budget</span>
          <h2>${escapeHtml(forest.name)}</h2>
        </div>
        <p class="tree-description">${escapeHtml(forest.description)}</p>
      </div>
      <div class="tree-scroll">
        <div class="skill-tree" style="--tree-width:${TREE_WIDTH}px; --tree-height:${TREE_HEIGHT}px; --skill-card-size:${SKILL_CARD_SIZE}px;">
          ${edgesMarkup(forest)}
          ${forest.skills.map(skillCardMarkup).join("")}
        </div>
      </div>
      ${treeKeyMarkup()}`;
}

function requiredDemoElement<T extends Element>(root: HTMLElement, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Skill demo is missing ${selector}.`);
    }
    return element;
}

function mountSkillDemo(root: HTMLElement): DemoDom {
    root.innerHTML = `
      <section class="skill-bank panel" aria-label="Shared point bank">
        <div class="skill-bank-copy">
          <span class="skill-bank-kicker">Shared point bank</span>
          <strong class="skill-bank-count"><span data-bank-available></span> available <span style="font-size:0.76em; color:var(--muted);">/ <span data-bank-total></span></span></strong>
        </div>
        <div class="skill-bank-controls">
          <label class="skill-bank-budget" for="skill-point-budget">
            Total budget
            <input id="skill-point-budget" data-action="set-budget" type="number" min="0" step="1" value="0" aria-describedby="budget-help">
          </label>
          <span id="budget-help" class="skill-bank-budget"><span data-bank-spent></span> spent across all three tabs</span>
          <button type="button" data-action="reset-demo">Reset demo</button>
        </div>
      </section>

      <nav class="forest-tabs" role="tablist" aria-label="Mock skill trees">
        ${FORESTS.map(forestTabMarkup).join("")}
      </nav>

      <div data-forest-panels>
        ${FORESTS.map(forestPanelShellMarkup).join("")}
      </div>
      <div data-unlearn-warning></div>
      <p class="skill-demo-status" role="status" aria-live="polite" aria-atomic="true" data-skill-status></p>`;

    const tabButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("button[role='tab']"));
    const panelElements = Array.from(root.querySelectorAll<HTMLElement>("[data-forest-panel]"));
    const tabs = new Map<ForestId, HTMLButtonElement>();
    const panels = new Map<ForestId, HTMLElement>();

    for (const forest of FORESTS) {
        const tab = tabButtons.find((candidate) => candidate.dataset.forestId === forest.id);
        const panel = panelElements.find((candidate) => candidate.dataset.forestPanel === forest.id);
        if (!tab || !panel) {
            throw new Error(`Skill demo is missing the ${forest.id} tab or panel.`);
        }
        tabs.set(forest.id, tab);
        panels.set(forest.id, panel);
    }

    return {
        root,
        bankAvailable: requiredDemoElement<HTMLSpanElement>(root, "[data-bank-available]"),
        bankTotal: requiredDemoElement<HTMLSpanElement>(root, "[data-bank-total]"),
        budgetInput: requiredDemoElement<HTMLInputElement>(root, "#skill-point-budget"),
        bankSpent: requiredDemoElement<HTMLSpanElement>(root, "[data-bank-spent]"),
        tabs,
        panels,
        warning: requiredDemoElement<HTMLElement>(root, "[data-unlearn-warning]"),
        status: requiredDemoElement<HTMLParagraphElement>(root, "[data-skill-status]"),
    };
}

function findActionButton(root: HTMLElement, action: string, skillId?: SkillId, forestId?: ForestId): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-action]")).find((button) =>
        button.dataset.action === action &&
        (skillId === undefined || button.dataset.skillId === skillId) &&
        (forestId === undefined || button.dataset.forestId === forestId),
    );
}

function restoreFocus(dom: DemoDom, request: FocusRequest): void {
    if (request.kind === "warning") {
        const warningTitle = dom.root.querySelector<HTMLElement>("#unlearn-warning-title");
        if (warningTitle) {
            warningTitle.focus();
            return;
        }
    } else {
        const candidates: Array<HTMLButtonElement | undefined> = [
            findActionButton(dom.root, request.action, request.skillId, request.forestId),
        ];
        if (request.fallbackAction) {
            candidates.push(findActionButton(dom.root, request.fallbackAction, request.skillId, request.forestId));
        }
        if (request.skillId) {
            candidates.push(
                ...Array.from(dom.root.querySelectorAll<HTMLButtonElement>("button[data-skill-id]")).filter(
                    (button) => button.dataset.skillId === request.skillId,
                ),
            );
        }

        for (const candidate of candidates) {
            if (candidate && !candidate.disabled) {
                candidate.focus();
                return;
            }
        }
    }

    dom.tabs.get(activeForestId)?.focus();
}

function render(dom: DemoDom, focusRequest?: FocusRequest): void {
    const spent = spentPoints(levels);
    const available = availablePoints();

    dom.bankAvailable.textContent = String(available);
    dom.bankTotal.textContent = String(pointBank);
    dom.bankSpent.textContent = String(spent);
    dom.budgetInput.min = String(spent);
    dom.budgetInput.value = String(pointBank);

    for (const forest of FORESTS) {
        const isActive = forest.id === activeForestId;
        const tab = dom.tabs.get(forest.id);
        const panel = dom.panels.get(forest.id);
        if (!tab || !panel) {
            throw new Error(`Skill demo is missing the ${forest.id} tab or panel.`);
        }
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
        panel.hidden = !isActive;
        panel.innerHTML = forestPanelContentsMarkup(forest);
    }

    dom.warning.innerHTML = unlearnPanelMarkup();
    dom.status.textContent = statusMessage;
    if (focusRequest) {
        restoreFocus(dom, focusRequest);
    }
}

function learn(skillId: SkillId): void {
    const skill = getSkill(skillId);
    const reason = learnReason(skill);
    if (reason) {
        statusMessage = `${skill.name}: ${reason}`;
        return;
    }

    levels = { ...levels, [skillId]: (levels[skillId] ?? 0) + 1 };
    pendingUnlearn = null;
    statusMessage = `${skill.name} is now level ${levels[skillId]} of ${skill.maxLevel}. ${availablePoints()} shared points remain.`;
}

function unlearnOrWarn(skillId: SkillId): boolean {
    const skill = getSkill(skillId);
    if ((levels[skillId] ?? 0) <= 0) {
        statusMessage = `${skill.name} has no learned levels to refund.`;
        return false;
    }

    const preview = previewUnlearn(skillId, levels);
    if (preview.cascade.length === 0) {
        levels = preview.nextLevels;
        pendingUnlearn = null;
        statusMessage = `Refunded 1 point from ${skill.name}. ${availablePoints()} shared points remain.`;
        return false;
    }

    pendingUnlearn = preview;
    statusMessage = `Warning: lowering ${skill.name} would invalidate ${preview.cascade.length} learned dependent skill${preview.cascade.length === 1 ? "" : "s"}.`;
    return true;
}

function confirmCascadeUnlearn(): void {
    if (!pendingUnlearn) {
        statusMessage = "There is no dependency warning to resolve.";
        return;
    }

    const preview = pendingUnlearn;
    const target = getSkill(preview.targetId);
    levels = preview.nextLevels;
    pendingUnlearn = null;
    statusMessage = `Refunded ${preview.refund} point${preview.refund === 1 ? "" : "s"} from ${target.name} and cascaded through ${preview.cascade.length} dependent skill${preview.cascade.length === 1 ? "" : "s"}. ${availablePoints()} shared points remain.`;
}

function updateBudget(requestedBudget: number): void {
    const spent = spentPoints(levels);
    const normalized = Number.isFinite(requestedBudget) ? Math.max(0, Math.floor(requestedBudget)) : pointBank;
    if (normalized < spent) {
        pointBank = spent;
        statusMessage = `Shared point bank was clamped to the ${spent} point${spent === 1 ? "" : "s"} already spent.`;
        return;
    }
    pointBank = normalized;
    pendingUnlearn = null;
    statusMessage = `Shared point bank set to ${pointBank}. ${availablePoints()} points are available.`;
}

function resetDemo(): void {
    levels = emptyLevels();
    pointBank = DEFAULT_POINT_BANK;
    pendingUnlearn = null;
    statusMessage = `Demo reset: ${DEFAULT_POINT_BANK} shared points are available across all three tabs.`;
}

function dismissDependencyWarning(): SkillId | undefined {
    const skillId = pendingUnlearn?.targetId;
    pendingUnlearn = null;
    statusMessage = "Dependency warning dismissed.";
    return skillId;
}

function selectForest(forestId: ForestId): void {
    activeForestId = forestId;
    pendingUnlearn = null;
    statusMessage = `${getForest(forestId).name} is open. The point bank remains shared.`;
}

function initialiseSkillDemo(): void {
    const root = document.getElementById("skill-demo");
    if (!root) {
        return;
    }
    const dom = mountSkillDemo(root);

    root.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const button = target.closest<HTMLButtonElement>("button[data-action]");
        if (!button || button.disabled) {
            return;
        }
        const action = button.dataset.action;
        let focusRequest: FocusRequest | undefined;
        let stateChanged = false;
        if (action === "select-forest") {
            const forestId = button.dataset.forestId;
            if (forestId && FORESTS.some((forest) => forest.id === forestId)) {
                selectForest(forestId);
                focusRequest = { kind: "button", action: "select-forest", forestId };
                stateChanged = true;
            }
        } else if (action === "learn") {
            const skillId = button.dataset.skillId;
            if (skillId && SKILLS_BY_ID.has(skillId)) {
                learn(skillId);
                focusRequest = { kind: "button", action: "learn", skillId, fallbackAction: "unlearn" };
                stateChanged = true;
            }
        } else if (action === "unlearn") {
            const skillId = button.dataset.skillId;
            if (skillId && SKILLS_BY_ID.has(skillId)) {
                focusRequest = unlearnOrWarn(skillId)
                    ? { kind: "warning" }
                    : { kind: "button", action: "unlearn", skillId, fallbackAction: "learn" };
                stateChanged = true;
            }
        } else if (action === "confirm-cascade") {
            const skillId = pendingUnlearn?.targetId;
            confirmCascadeUnlearn();
            if (skillId) {
                focusRequest = { kind: "button", action: "unlearn", skillId, fallbackAction: "learn" };
            }
            stateChanged = true;
        } else if (action === "cancel-unlearn") {
            const skillId = dismissDependencyWarning();
            if (skillId) {
                focusRequest = { kind: "button", action: "unlearn", skillId, fallbackAction: "learn" };
            }
            stateChanged = true;
        } else if (action === "reset-demo") {
            resetDemo();
            focusRequest = { kind: "button", action: "reset-demo" };
            stateChanged = true;
        }
        if (stateChanged) {
            render(dom, focusRequest);
        }
    });

    root.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.dataset.action !== "set-budget") {
            return;
        }
        updateBudget(Number(target.value));
        render(dom);
    });

    root.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && pendingUnlearn) {
            const skillId = dismissDependencyWarning();
            event.preventDefault();
            render(dom, skillId
                ? { kind: "button", action: "unlearn", skillId, fallbackAction: "learn" }
                : undefined);
            return;
        }

        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const tab = target.closest<HTMLButtonElement>("button[role='tab'][data-action='select-forest']");
        if (!tab) {
            return;
        }

        const currentIndex = FORESTS.findIndex((forest) => forest.id === tab.dataset.forestId);
        if (currentIndex < 0) {
            return;
        }

        let nextIndex: number | undefined;
        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                nextIndex = (currentIndex + 1) % FORESTS.length;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                nextIndex = (currentIndex - 1 + FORESTS.length) % FORESTS.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = FORESTS.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();
        const nextForest = FORESTS[nextIndex];
        selectForest(nextForest.id);
        render(dom, { kind: "button", action: "select-forest", forestId: nextForest.id });
    });

    render(dom);
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialiseSkillDemo, { once: true });
    } else {
        initialiseSkillDemo();
    }
}
