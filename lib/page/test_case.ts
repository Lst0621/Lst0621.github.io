import {always} from "../tsl/func.js";
import {draw_table} from "../tsl/visual.js";
import {get_tests} from "../test/tests.js";

function test_failure() {
    return false;
}

function test_error() {
    throw Error("test_error");
    return false;
}

export function draw_test_cases_table(table: HTMLTableElement, tests: (() => boolean)[]) {

    let results: boolean[] = []
    let test_names = tests.map(test => test.name)
    console.log(test_names)
    let errors: string[] = []
    for (let i = 0; i < tests.length; i++) {
        let test_case = tests[i]
        try {
            results.push(test_case())
            errors.push("")
        } catch (err: any) {
            console.log(err)
            results.push(false)
            // TODO type
            errors.push(err.message)
        }
        console.log("test: " + test_case.name + " " + results[i])
    }
    let columns = ["PASS", "FAILED", "ERROR"]

    function get_element(i: number, j: number) {
        if (results[i]) {
            return j == 0 ? "pass" : "";
        } else {
            if (j == 0) {
                return ""
            }
            if (j == 1) {
                return "failed"
            }
            if (j == 2) {
                return errors[i]
            }
        }
    }

    let pass_color = "lightgreen"
    let fail_color = "#DC143C"
    let error_color = "yellow"
    let default_color = "white"
    draw_table(table, test_names, columns, get_element, String, String, String,
        always("lightblue"),
        (str) => {
            if (str == columns[0]) {
                return pass_color;
            }
            if (str == columns[1]) {
                return fail_color;
            }
            return error_color;
        }, (row, col) => {
            if (results[row] && col == 0) {
                return pass_color;
            }
            if (!results[row] && col == 1) {
                return fail_color;
            }
            if (errors[row].length > 0 && col == 2) {
                return error_color;
            }
            return default_color;
        })
}

export function update_table() {
    let table: HTMLTableElement = document.getElementById("test_case_table") as HTMLTableElement
    let tests = get_tests()
    tests.push(test_failure, test_error)
    draw_test_cases_table(table, tests)
}