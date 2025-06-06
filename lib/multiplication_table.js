let table_sz = 6;
export function update_table(sz) {
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
    {
        let row = table.insertRow();
        for (let i = 0; i <= sz; i++) {
            let cell = row.insertCell();
            if (i != 0) {
                cell.innerText = i.toString();
                cell.style.background = "lightgreen";
            }
        }
    }
    for (let i = 1; i <= sz; i++) {
        let row = table.insertRow();
        let cell = row.insertCell();
        cell.style.background = "lightgreen";
        cell.innerText = i.toString();
        for (let j = 1; j <= sz; j++) {
            let cell_product = row.insertCell();
            cell_product.style.borderStyle = "solid";
            cell_product.innerText = (i * j % (sz + 1)).toString();
        }
    }
}
export function increment(sz) {
    table_sz++;
    update_table(table_sz);
}
export function decrement(sz) {
    if (table_sz == 2) {
        return;
    }
    table_sz--;
    update_table(table_sz);
}
