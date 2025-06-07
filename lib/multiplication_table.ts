import {are_co_prime} from "./math.js"

let table_sz: number = 6


export function update_table(sz: number) {
    let mul_text = document.getElementById("mul_text") as HTMLSpanElement
    mul_text.innerText = "Multiplication for Z" + (sz + 1).toString()
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

    let mod: number = sz + 1

    {
        let row = table.insertRow()
        for (let i = 0; i <= sz; i++) {
            let cell = row.insertCell()
            if (i != 0) {
                cell.style.borderStyle = "solid"
                cell.innerText = i.toString()
                if (are_co_prime(i, mod)) {
                    cell.style.background = "lightgreen"
                }
            }
        }
    }

    for (let i = 1; i <= sz; i++) {
        let row = table.insertRow()
        let cell = row.insertCell()
        cell.style.borderStyle = "solid"
        let i_co_prime = are_co_prime(i, mod)
        if (i_co_prime) {
            cell.style.background = "lightgreen"
        }

        cell.innerText = i.toString()
        for (let j = 1; j <= sz; j++) {
            let cell_product = row.insertCell()
            cell_product.style.borderStyle = "solid"
            cell_product.innerText = (i * j % mod).toString()
            let j_co_prime = are_co_prime(j, mod)
            if (i_co_prime && j_co_prime) {
                cell_product.style.background = "gold"
            } else if (i_co_prime || j_co_prime) {
                cell_product.style.background = "lightblue"
            }
        }
    }
}

export function increment(sz: number) {
    table_sz++
    update_table(table_sz)
}

export function decrement(sz: number) {
    if (table_sz == 2) {
        return
    }
    table_sz--
    update_table(table_sz)
}