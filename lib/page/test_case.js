import { test_cartesian_product, test_complex_numbers, test_gen_primes, test_generate_general_linear_group_zn_m, test_inner_product, test_matrix_add, test_matrix_inverse, test_matrix_multiply, test_mod } from "../test/test_math.js";
import { always } from "../tsl/func.js";
import { draw_table } from "../tsl/visual.js";
function test_failure() {
    return false;
}
function test_error() {
    throw Error("test_error");
    return false;
}
export function draw_test_cases_table(table, tests) {
    let results = [];
    let test_names = tests.map(test => test.name);
    console.log(test_names);
    let errors = [];
    for (let i = 0; i < tests.length; i++) {
        let test_case = tests[i];
        try {
            results.push(test_case());
            errors.push("");
        }
        catch (err) {
            console.log(err);
            results.push(false);
            // TODO type
            errors.push(err.message);
        }
        console.log("test: " + test_case.name + " " + results[i]);
    }
    let columns = ["PASS", "FAILED", "ERROR"];
    function get_element(i, j) {
        if (results[i]) {
            return j == 0 ? "pass" : "";
        }
        else {
            if (j == 0) {
                return "";
            }
            if (j == 1) {
                return "failed";
            }
            if (j == 2) {
                return errors[i];
            }
        }
    }
    let pass_color = "lightgreen";
    let fail_color = "#DC143C";
    let error_color = "yellow";
    let default_color = "white";
    draw_table(table, test_names, columns, get_element, String, String, String, always("lightblue"), (str) => {
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
    });
}
export function update_table() {
    let table = document.getElementById("test_case_table");
    let tests = [test_matrix_multiply, test_matrix_add, test_matrix_inverse, test_cartesian_product, test_inner_product, test_mod, test_generate_general_linear_group_zn_m, test_complex_numbers, test_gen_primes];
    tests.push(test_failure, test_error);
    draw_test_cases_table(table, tests);
}
