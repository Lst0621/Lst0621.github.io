import {
    dihedral_multiply, dihedral_to_str,
    get_all_dihedral
} from "./math.js"

let table_sz: number = 4


export function update_table(sz: number) {
    let mul_text = document.getElementById("mul_text") as HTMLSpanElement
    mul_text.innerHTML = "Multiplication for D" + "<sub>" + (sz).toString() + "</sub>"
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

    let dihedrals = get_all_dihedral(sz)
    console.log(dihedrals)
    let len: number = dihedrals.length

    {
        let row = table.insertRow()
        for (let i = 0; i <= len; i++) {
            let cell = row.insertCell()
            if (i != 0) {
                cell.style.borderStyle = "solid"
                cell.innerHTML = dihedral_to_str(dihedrals[i - 1])
                cell.style.background = "lightblue"
            }
        }
    }

    for (let i = 1; i <= len; i++) {
        let row = table.insertRow()
        let cell = row.insertCell()
        cell.style.borderStyle = "solid"
        cell.innerHTML = dihedral_to_str(dihedrals[i - 1])
        cell.style.background = "lightblue"
        for (let j = 1; j <= len; j++) {
            let cell_product = row.insertCell()
            cell_product.style.borderStyle = "solid"
            let product = dihedral_multiply(dihedrals[i - 1], dihedrals[j - 1], sz);
            cell_product.innerHTML = dihedral_to_str(product)
            cell_product.style.background = "lightgreen"
        }
    }
}

export function increment(sz: number) {
    if (table_sz < 10) {
        table_sz += 1
    }
    update_table(table_sz)
}

export function decrement(sz: number) {
    if (table_sz > 3) {
        table_sz -= 1
    }
    update_table(table_sz)
}