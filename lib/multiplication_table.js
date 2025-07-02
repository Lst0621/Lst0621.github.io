import { are_co_prime } from "./math.js";
let table_sz = 6;
export function update_table(sz) {
    let mul_text = document.getElementById("mul_text");
    mul_text.innerHTML = "Multiplication for Z" + "<sub>" + (sz + 1).toString() + "</sub>";
    let table = document.getElementById("multiplication_table");
    table.style.alignSelf = "center";
    table.style.borderStyle = "solid";
    table.style.textAlign = "center";
    while (true) {
        if (table.rows.length == 0) {
            break;
        }
        table.deleteRow(0);
    }
    let mod = sz + 1;
    let co_prime_color = "#8A6BBE";
    let not_co_prime_color = "#7B90D2";
    {
        let row = table.insertRow();
        for (let i = 0; i <= sz; i++) {
            let cell = row.insertCell();
            if (i != 0) {
                cell.style.borderStyle = "solid";
                cell.innerText = "[" + i.toString() + "]";
                if (are_co_prime(i, mod)) {
                    cell.style.background = co_prime_color;
                }
                else {
                    cell.style.background = not_co_prime_color;
                }
            }
        }
    }
    for (let i = 1; i <= sz; i++) {
        let row = table.insertRow();
        let cell = row.insertCell();
        cell.style.borderStyle = "solid";
        let i_co_prime = are_co_prime(i, mod);
        if (i_co_prime) {
            cell.style.background = co_prime_color;
        }
        else {
            cell.style.background = not_co_prime_color;
        }
        cell.innerText = "[" + i.toString() + "]";
        for (let j = 1; j <= sz; j++) {
            let cell_product = row.insertCell();
            cell_product.style.borderStyle = "solid";
            cell_product.innerText = "[" + (i * j % mod).toString() + "]";
            let j_co_prime = are_co_prime(j, mod);
            if (i_co_prime && j_co_prime) {
                cell_product.style.background = "#E87A90";
            }
            else {
                cell_product.style.background = "#FEDFE1";
            }
        }
    }
}
export function increment() {
    table_sz++;
    update_table(table_sz);
}
export function decrement() {
    if (table_sz == 2) {
        return;
    }
    table_sz--;
    update_table(table_sz);
}
