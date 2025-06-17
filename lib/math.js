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
    // fill
    for (let i = l1 + 1; i <= l; i++) {
        p1.push(i);
    }
    for (let i = l2 + 1; i <= l; i++) {
        p2.push(i);
    }
    let ans = [];
    for (let i = 1; i <= l; i++) {
        let p2_i = p2[i - 1];
        let p1_p2_i = p1[p2_i - 1];
        ans.push(p1_p2_i);
    }
    return ans;
}
export function get_identity_permutation(n) {
    return Array(n).fill(0).map((_, i) => i + 1);
}
export function get_all_permutations(n) {
    let e = get_identity_permutation(n);
    let perm = e;
    let ans = [e];
    while (true) {
        let next = next_permutation(perm);
        if (next.every((val, i) => val === e[i])) {
            break;
        }
        perm = next;
        ans.push(perm);
    }
    return ans;
}
export function get_all_permutations_recursive(n) {
    if (n == 1) {
        return [[1]];
    }
    let per_n_minus_one = get_all_permutations_recursive(n - 1);
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
export function is_cycle_valid(cycle) {
    if (cycle == null) {
        return false;
    }
    for (let i = 0; i < cycle.length; i++) {
        for (let j = i + 1; j < cycle.length; j++) {
            if (cycle[j] == cycle[i]) {
                return false;
            }
        }
    }
    return true;
}
export function get_permutation_from_cycle(cycle) {
    if (cycle == null) {
        return [];
    }
    let num_element = cycle[0];
    for (let num of cycle) {
        num_element = Math.max(num, cycle[1]);
    }
    let perm = get_identity_permutation(num_element);
    if (cycle.length == 1) {
        return perm;
    }
    for (let i = 0; i < cycle.length; i++) {
        let from = cycle[i];
        let to = (i + 1) < cycle.length ? cycle[i + 1] : cycle[0];
        perm[from - 1] = to;
    }
    return perm;
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
    let ret = "";
    for (let cycle of cycles) {
        if (cycle.length <= 1) {
            continue;
        }
        let cycle_str = "";
        for (let j = 0; j < cycle.length; j++) {
            cycle_str += cycle[j];
        }
        ret += "(" + cycle_str + ")";
    }
    if (ret.length == 0) {
        ret = "e";
    }
    return ret;
}
function next_permutation(perm) {
    let next = Array.from(perm);
    next_permutation_in_place(next);
    return next;
}
function next_permutation_in_place(nums) {
    // Step 1: Find the first index `i` from the end where nums[i] < nums[i + 1]
    let i = nums.length - 2;
    while (i >= 0 && nums[i] >= nums[i + 1]) {
        i--;
    }
    if (i >= 0) {
        // Step 2: Find the first index `j` from the end where nums[j] > nums[i]
        let j = nums.length - 1;
        while (j >= 0 && nums[j] <= nums[i]) {
            j--;
        }
        // Step 3: Swap nums[i] and nums[j]
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    // Step 4: Reverse the suffix starting at i + 1
    let left = i + 1;
    let right = nums.length - 1;
    while (left < right) {
        [nums[left], nums[right]] = [nums[right], nums[left]];
        left++;
        right--;
    }
}
