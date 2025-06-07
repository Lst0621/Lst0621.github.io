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
