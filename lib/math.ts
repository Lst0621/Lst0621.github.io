export function gcd(a_in: number, b_in: number): number {
    let a: number = Math.abs(a_in);
    let b: number = Math.abs(b_in);
    if (a == 0 || b == 0) {
        return a + b
    }

    if (a == b) {
        return a
    }

    if (a > b) {
        let tmp: number = a
        a = b
        b = tmp
    }

    // a < b
    while (true) {
        let res = b % a
        if (res == 0) {
            return a
        }
        b = a
        a = res
    }
}

export function are_co_prime(a: number, b: number): boolean {
    return gcd(a, b) == 1
}

export function permutation_multiply(p1: number[], p2: number[]): number[] {
    let l1 = p1.length;
    let l2 = p2.length;
    let l = Math.max(l1, l2);
    let ans: number[] = []
    for (let i = 1; i <= l; i++) {
        let p2_i = p2[i - 1]
        let p1_p2_i: number = p1[p2_i - 1]
        ans.push(p1_p2_i)
    }
    return ans
}

export function get_all_permutations(n: number): number[][] {
    let e: number[] = Array(n).fill(0).map((_, i) => i + 1);
    let perm: number[] = e
    let ans: number[][] = [e]
    while (true) {
        let next: number[] = next_permutation(perm)
        if (next.every((val, i) => val === e[i])) {
            break
        }
        perm = next
        ans.push(perm)
    }
    return ans
}

export function get_all_permutations_recursive(n: number): number[][] {
    if (n == 1) {
        return [[1]]
    }
    let per_n_minus_one = get_all_permutations_recursive(n - 1)
    let ans: number[][] = []
    for (let permutation of per_n_minus_one) {
        for (let i: number = 0; i <= n - 1; i++) {
            let cp: number[] = Array.from(permutation)
            cp.splice(n - 1 - i, 0, n)
            ans.push(cp)
        }
    }
    return ans
}

export function get_cycles_from_permutations(perm: number[]) {
    let visited = Array(perm.length).fill(0)
    let cycles: number[][] = []
    let cycle: number[] = []
    let i = 0
    while (true) {
        if (i == perm.length) {
            break
        }
        if (visited[i] == true) {
            if (cycle.length != 0) {
                cycles.push(Array.from(cycle))
            }
            cycle = []
            i = i + 1
            continue
        }
        let from: number = i + 1
        let to: number = perm[i]
        visited[i] = true
        cycle.push(from)
        i = to - 1
    }
    return cycles
}

export function get_permutation_parity(perm: number[]) {
    let cycles: number[][] = get_cycles_from_permutations(perm)
    let parity: boolean = true
    for (let cycle of cycles) {
        let is_cycle_odd = cycle.length % 2 == 0
        parity = (parity && !is_cycle_odd) || (!parity && is_cycle_odd)
    }
    return parity
}

export function per_to_str(perm: number[]) {
    let cycles: number[][] = get_cycles_from_permutations(perm)
    let ret = ""
    for (let cycle of cycles) {
        if (cycle.length <= 1) {
            continue
        }
        let cycle_str = ""
        for (let j = 0; j < cycle.length; j++) {
            cycle_str += cycle[j]
        }
        ret += "(" + cycle_str + ")"
    }
    if (ret.length == 0) {
        ret = "e"
    }
    return ret
}

function next_permutation(perm: number[]): number[] {
    let next: number[] = Array.from(perm)
    next_permutation_in_place(next)
    return next
}

function next_permutation_in_place(nums: number[]): void {
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
