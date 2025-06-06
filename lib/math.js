export function gcd(a, b) {
    if (a == 0) {
        return b;
    }
    if (a == b) {
        return a;
    }
    if (a > b) {
        return gcd(b, a);
    }
    if (a % b == 0) {
        return b;
    }
    return gcd(b % a, a);
}
