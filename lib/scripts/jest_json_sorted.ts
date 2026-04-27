import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type AssertionResult = {
    fullName?: string;
};

type TestFileResult = {
    name?: string;
    assertionResults?: AssertionResult[];
};

type JestResults = {
    testResults?: TestFileResult[];
};

const OUTPUT_FILE = path.resolve(process.cwd(), "../assets/test/results.json");

function stableSortResults(results: JestResults): JestResults {
    if (Array.isArray(results.testResults)) {
        results.testResults.sort((a, b) => {
            return String(a?.name ?? "").localeCompare(String(b?.name ?? ""));
        });
        for (const tr of results.testResults) {
            if (Array.isArray(tr.assertionResults)) {
                tr.assertionResults.sort((a, b) => {
                    return String(a?.fullName ?? "").localeCompare(String(b?.fullName ?? ""));
                });
            }
        }
    }
    return results;
}

function main(): void {
    const jestArgs = process.argv.slice(2);
    const nodeOptions = "--experimental-vm-modules";

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

    const result = spawnSync(
        "node",
        [
            nodeOptions,
            "./node_modules/jest/bin/jest.js",
            "--json",
            `--outputFile=${OUTPUT_FILE}`,
            ...jestArgs,
        ],
        { stdio: "inherit" },
    );

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }

    const raw = fs.readFileSync(OUTPUT_FILE, "utf8");
    const parsed = JSON.parse(raw) as JestResults;
    const sorted = stableSortResults(parsed);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2) + "\n");
}

main();

