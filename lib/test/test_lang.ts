import {get_alphabet_from_strings, get_concat_and_suffix_func} from "../tsl/lang/string.js";
import {generate_semigroup, get_all_idempotent_elements} from "../tsl/math/semigroup.js";

export function get_definite_k(alphabet: string[], k: number): string[] {
    let concat_with_suffix = get_concat_and_suffix_func(k)
    let strs = generate_semigroup(alphabet, concat_with_suffix, (a, b) => a == b);
    let idempotents = get_all_idempotent_elements(strs, concat_with_suffix, (a, b) => a == b);
    return idempotents
}

export function test_definite_k() {
    let alphabet = get_alphabet_from_strings(["abcd"])
    console.log(alphabet)
    let k = 3
    let result = get_definite_k(alphabet, k)
    return result.length == Math.pow(alphabet.length, k)
}