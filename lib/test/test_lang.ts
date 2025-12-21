import {get_alphabet_from_strings, get_concat_and_suffix_func} from "../tsl/lang/string.js";
import {generate_semigroup, get_all_idempotent_elements, get_highest_idempotent_power} from "../tsl/math/semigroup.js";

export function test_definite_k() {
    let alphabet = get_alphabet_from_strings(["abcd"])
    console.log(alphabet)
    let k = 3
    let concat_with_suffix = get_concat_and_suffix_func(k)
    let strs = generate_semigroup(alphabet, concat_with_suffix, (a, b) => a == b);
    if (get_highest_idempotent_power(strs, concat_with_suffix, (a, b) => a == b) != k) {
        return false
    }
    let idempotents = get_all_idempotent_elements(strs, concat_with_suffix, (a, b) => a == b);
    return idempotents.length == Math.pow(alphabet.length, k)
}