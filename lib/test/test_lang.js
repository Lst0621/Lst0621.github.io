import { get_alphabet_from_strings, get_concat_and_suffix_func } from "../tsl/lang/string.js";
import { generate_semigroup, get_all_idempotent_elements, get_definite_k, get_highest_idempotent_power, is_abelian, is_group, is_monoid } from "../tsl/math/semigroup.js";
import { equals } from "../tsl/func.js";
export function test_definite_k() {
    let alphabet = get_alphabet_from_strings(["abcd"]);
    console.log(alphabet);
    let k = 3;
    let concat_with_suffix = get_concat_and_suffix_func(k);
    let strs = generate_semigroup(alphabet, concat_with_suffix, equals);
    if (get_highest_idempotent_power(strs, concat_with_suffix, equals) != k) {
        console.log("failed at highest idempotent power");
        return false;
    }
    let idempotent_elements = get_all_idempotent_elements(strs, concat_with_suffix, equals);
    if (idempotent_elements.length != Math.pow(alphabet.length, k)) {
        console.log("failed at idempotent_elements size");
        return false;
    }
    if (get_definite_k(strs, concat_with_suffix, equals) != k) {
        console.log("failed at definite k");
        return false;
    }
    if (is_abelian(strs, concat_with_suffix, equals)) {
        console.log("failed at abelian");
        return false;
    }
    let identity_element = is_monoid(strs, concat_with_suffix, equals)[1];
    console.log(identity_element);
    if (identity_element != null) {
        console.log("failed at monoid");
        return false;
    }
    let is_group_result = is_group(strs, concat_with_suffix, equals)[0];
    if (is_group_result) {
        console.log("failed at group");
        return false;
    }
    return true;
}
