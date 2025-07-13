import {get_all_permutations, get_permutation_parity, perm_to_str, permutation_multiply, totient} from "./tsl/math.js"
import {get_sub} from "./tsl/util.js";

let table_sz: number = 4


export function update_table(sz: number) {
    let mul_text = document.getElementById("mul_text") as HTMLSpanElement
    mul_text.innerHTML = "Multiplication for S" + get_sub(sz.toString())
    let table: HTMLTableElement = document.getElementById("multiplication_table") as HTMLTableElement
    table.style.alignSelf = "center"
    table.style.borderStyle = "solid"
    table.style.textAlign = "center"
    while (true) {
        if (table.rows.length == 0) {
            break
        }
        table.deleteRow(0)
    }

    let perms = get_all_permutations(sz)
    console.log(perms)
    let fac = perms.length

    {
        let row = table.insertRow()
        for (let i = 0; i <= fac; i++) {
            let cell = row.insertCell()
            if (i != 0) {
                cell.style.borderStyle = "solid"
                cell.innerText = perm_to_str(perms[i - 1])
                if (get_permutation_parity(perms[i - 1])) {
                    cell.style.background = "lightgreen"
                } else {
                    cell.style.background = "lightblue"
                }
            }
        }
    }

    for (let i = 1; i <= fac; i++) {
        let row = table.insertRow()
        let cell = row.insertCell()
        cell.style.borderStyle = "solid"
        cell.innerText = perm_to_str(perms[i - 1])
        if (get_permutation_parity(perms[i - 1])) {
            cell.style.background = "lightgreen"
        } else {
            cell.style.background = "lightblue"
        }
        for (let j = 1; j <= fac; j++) {
            let cell_product = row.insertCell()
            cell_product.style.borderStyle = "solid"
            let product = permutation_multiply(perms[i - 1], perms[j - 1]);
            cell_product.innerText = perm_to_str(product)
            if (get_permutation_parity(product)) {
                cell_product.style.background = "lightgreen"
            } else {
                cell_product.style.background = "lightblue"
            }
        }
    }
}

export function increment(sz: number) {
    if (table_sz < 5) {
        table_sz += 1
    }
    update_table(table_sz)
}

export function decrement(sz: number) {
    if (table_sz > 2) {
        table_sz -= 1
    }
    update_table(table_sz)
}