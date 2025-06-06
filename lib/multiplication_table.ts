import {gcd} from "./math.js"

let table_sz: number = 6


export function update_table(sz: number) {
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

    {
        let row = table.insertRow()
        for (let i = 0; i <= sz; i++) {
            let cell = row.insertCell()
            if (i != 0) {
                cell.innerText = i.toString()
                cell.style.background = "lightgreen"
            }
        }
    }

    let mod: number = sz + 1
    for (let i = 1; i <= sz; i++) {
        let row = table.insertRow()
        let cell = row.insertCell()
        cell.style.background = "lightgreen"
        cell.innerText = i.toString()
        for (let j = 1; j <= sz; j++) {
            let cell_product = row.insertCell()
            cell_product.style.borderStyle = "solid"
            cell_product.innerText = (i * j % mod).toString()
            if (gcd(i, mod) == 1 && gcd(j, mod) == 1) {
                cell_product.style.background = "gold"
            } else if (gcd(i, mod) == 1 || gcd(j, mod) == 1) {
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