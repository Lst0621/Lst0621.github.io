export function gcd(a_in, b_in) {
    let a = Math.abs(a_in);
    let b = Math.abs(b_in);
    if (a == 0 || b == 0) {
        return a + b;
    }
    if (a == b) {
        return a;
    }
    if (a > b) {
        let tmp = a;
        a = b;
        b = tmp;
    }
    // a < b
    while (true) {
        let res = b % a;
        if (res == 0) {
            return a;
        }
        b = a;
        a = res;
    }
}
export function are_co_prime(a, b) {
    return gcd(a, b) == 1;
}
export function permutation_multiply(p1, p2) {
    let l1 = p1.length;
    let l2 = p2.length;
    let l = Math.max(l1, l2);
    let ans = [];
    for (let i = 1; i <= l; i++) {
        let p2_i = p2[i - 1];
        let p1_p2_i = p1[p2_i - 1];
        ans.push(p1_p2_i);
    }
    return ans;
}
export function get_all_permutations(n) {
    if (n == 1) {
        return [[1]];
    }
    let per_n_minus_one = get_all_permutations(n - 1);
    let ans = [];
    for (let permutation of per_n_minus_one) {
        for (let i = 0; i <= n - 1; i++) {
            let cp = Array.from(permutation);
            cp.splice(n - 1 - i, 0, n);
            ans.push(cp);
        }
    }
    return ans;
}
export function get_cycles_from_permutations(perm) {
    let visited = Array(perm.length).fill(0);
    let cycles = [];
    let cycle = [];
    let i = 0;
    while (true) {
        if (i == perm.length) {
            break;
        }
        if (visited[i] == true) {
            if (cycle.length != 0) {
                cycles.push(Array.from(cycle));
            }
            cycle = [];
            i = i + 1;
            continue;
        }
        let from = i + 1;
        let to = perm[i];
        visited[i] = true;
        cycle.push(from);
        i = to - 1;
    }
    return cycles;
}
export function get_permutation_parity(perm) {
    let cycles = get_cycles_from_permutations(perm);
    let parity = true;
    for (let cycle of cycles) {
        let is_cycle_odd = cycle.length % 2 == 0;
        parity = (parity && !is_cycle_odd) || (!parity && is_cycle_odd);
    }
    return parity;
}
export function per_to_str(perm) {
    let cycles = get_cycles_from_permutations(perm);
    console.log(perm);
    console.log(cycles);
    let ret = "";
    for (let cycle of cycles) {
        if (cycle.length <= 1) {
            continue;
        }
        let c = "";
        for (let j = 0; j < cycle.length; j++) {
            if (j >= 1) {
                c += ",";
            }
            c += cycle[j];
        }
        ret += "(" + cycle + ")";
    }
    if (ret.length == 0) {
        ret = "e";
    }
    return ret;
}
