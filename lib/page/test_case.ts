interface AssertionResult {
    ancestorTitles: string[];
    title: string;
    fullName: string;
    status: string;
    duration: number;
    failureMessages: string[];
}

interface TestFileResult {
    name: string;
    status: string;
    assertionResults: AssertionResult[];
}

interface JestResults {
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    testResults: TestFileResult[];
    startTime: number;
}

interface FlatRow {
    index: number;
    suite: string;
    name: string;
    status: string;
    duration: number;
    passed: boolean;
}

type SortKey = "index" | "suite" | "name" | "status" | "duration";

function formatDuration(ms: number): string {
    if (ms < 1) {
        return "<1 ms";
    }
    return ms + " ms";
}

function extractSuiteName(fullPath: string): string {
    const match = fullPath.match(/([^/]+)\.test\.ts$/);
    if (match) {
        return match[1];
    }
    return fullPath;
}

function flattenResults(results: JestResults): FlatRow[] {
    const rows: FlatRow[] = [];
    let index = 0;
    for (const fileResult of results.testResults) {
        const suite = extractSuiteName(fileResult.name);
        for (const assertion of fileResult.assertionResults) {
            index++;
            const name = assertion.ancestorTitles.length > 0
                ? assertion.ancestorTitles.join(" > ") + " > " + assertion.title
                : assertion.title;
            rows.push({
                index,
                suite,
                name,
                status: assertion.status,
                duration: assertion.duration,
                passed: assertion.status === "passed",
            });
        }
    }
    return rows;
}

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "index", label: "#" },
    { key: "name", label: "Test" },
    { key: "suite", label: "Suite" },
    { key: "status", label: "Status" },
    { key: "duration", label: "Duration" },
];

let currentSortKey: SortKey = "index";
let currentSortAsc = true;

function compareRows(a: FlatRow, b: FlatRow, key: SortKey): number {
    switch (key) {
        case "index":
            return a.index - b.index;
        case "suite":
            return a.suite.localeCompare(b.suite) || a.index - b.index;
        case "name":
            return a.name.localeCompare(b.name);
        case "status":
            return a.status.localeCompare(b.status) || a.index - b.index;
        case "duration":
            return a.duration - b.duration;
        default:
            return 0;
    }
}

function renderTable(table: HTMLTableElement, rows: FlatRow[], results: JestResults): void {
    while (table.rows.length > 0) {
        table.deleteRow(0);
    }

    table.style.borderCollapse = "collapse";
    table.style.fontFamily = "Courier, monospace";
    table.style.fontSize = "10pt";

    const headerRow = table.insertRow();
    for (const col of COLUMNS) {
        const th = document.createElement("th");
        const arrow = col.key === currentSortKey ? (currentSortAsc ? " \u25B2" : " \u25BC") : "";
        th.textContent = col.label + arrow;
        th.style.padding = "4px 10px";
        th.style.borderBottom = "2px solid #333";
        th.style.background = "lightblue";
        th.style.cursor = "pointer";
        th.style.userSelect = "none";
        th.addEventListener("click", () => {
            if (currentSortKey === col.key) {
                currentSortAsc = !currentSortAsc;
            } else {
                currentSortKey = col.key;
                currentSortAsc = true;
            }
            const sorted = [...rows];
            sorted.sort((a, b) => {
                const cmp = compareRows(a, b, currentSortKey);
                return currentSortAsc ? cmp : -cmp;
            });
            renderTable(table, sorted, results);
        });
        headerRow.appendChild(th);
    }

    for (const row of rows) {
        const tr = table.insertRow();

        const numCell = tr.insertCell();
        numCell.textContent = String(row.index);
        numCell.style.padding = "3px 8px";
        numCell.style.textAlign = "right";

        const nameCell = tr.insertCell();
        nameCell.textContent = row.name;
        nameCell.style.padding = "3px 8px";

        const suiteCell = tr.insertCell();
        suiteCell.textContent = row.suite;
        suiteCell.style.padding = "3px 8px";

        const statusCell = tr.insertCell();
        statusCell.textContent = row.passed ? "pass" : "FAILED";
        statusCell.style.padding = "3px 8px";
        statusCell.style.textAlign = "center";
        statusCell.style.background = row.passed ? "lightgreen" : "#DC143C";
        statusCell.style.color = row.passed ? "" : "white";

        const durationCell = tr.insertCell();
        durationCell.textContent = formatDuration(row.duration);
        durationCell.style.padding = "3px 8px";
        durationCell.style.textAlign = "right";
    }

    const summary = table.insertRow();
    const spacer = summary.insertCell();
    spacer.colSpan = COLUMNS.length;
    spacer.style.paddingTop = "8px";
    spacer.style.borderTop = "2px solid #333";
    spacer.style.fontWeight = "bold";
    spacer.textContent =
        results.numPassedTests + "/" + results.numTotalTests + " passed, " +
        results.numFailedTests + " failed";
}

export async function update_table(): Promise<void> {
    const table = document.getElementById("test_case_table") as HTMLTableElement;
    try {
        const resp = await fetch("/assets/test/results.json");
        if (!resp.ok) {
            table.textContent = "Failed to load results.json (" + resp.status + "). Run: cd lib && npm test";
            return;
        }
        const results: JestResults = await resp.json();
        const rows = flattenResults(results);
        renderTable(table, rows, results);
    } catch (err: any) {
        table.textContent = "Error loading results: " + err.message + ". Run: cd lib && npm test";
    }
}
