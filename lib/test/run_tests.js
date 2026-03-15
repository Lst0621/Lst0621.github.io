import { get_tests } from "./tests.js";

function test(test_case) {
    const result = test_case();
    console.log(test_case.name + ": " + (result ? "passed" : "failed"));
}

function test_all() {
    console.log("hi");
    for (const test_case of get_tests()) {
        test(test_case);
    }
}

test_all();
