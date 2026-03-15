// lib/tsl/visual.ts
function clear_table(table) {
  while (true) {
    if (table.rows.length == 0) {
      break;
    }
    table.deleteRow(0);
  }
}
function draw_table(table, rows, cols, multiply, rows_to_string, cols_to_string, element_to_string, row_get_color, col_get_color, element_get_color) {
  clear_table(table);
  table.style.alignSelf = "center";
  table.style.borderStyle = "solid";
  table.style.textAlign = "center";
  {
    let row = table.insertRow();
    row.insertCell();
    for (let i = 0; i < cols.length; i++) {
      let cell = row.insertCell();
      cell.style.borderStyle = "solid";
      cell.innerHTML = cols_to_string(cols[i]);
      cell.style.background = col_get_color(cols[i]);
    }
  }
  for (let i = 0; i < rows.length; i++) {
    let row = table.insertRow();
    let cell = row.insertCell();
    cell.style.borderStyle = "solid";
    cell.style.background = row_get_color(rows[i]);
    cell.innerHTML = rows_to_string(rows[i]);
    for (let j = 0; j < cols.length; j++) {
      let cell_product = row.insertCell();
      cell_product.style.borderStyle = "solid";
      let element = multiply(i, j);
      cell_product.innerHTML = element_to_string(element);
      cell_product.style.background = element_get_color(i, j);
    }
  }
}

// lib/tsl/func.ts
function always(a) {
  return (...args) => a;
}

// lib/page/tip.ts
function get_float(element_id) {
  return parseFloat(document.getElementById(element_id).value);
}
function draw() {
  let tip_table = document.getElementById("tip_table");
  let columns_text = [
    "food",
    "tax",
    "food+tax",
    "tips on food",
    "food+tax+tips",
    "tips on tax",
    "food+tax+tips+tips on tax"
  ];
  let subtotal = get_float("food");
  let tax = get_float("tax");
  let tips = [0, 5, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  function get_element(row, column) {
    let tip = tips[row] / 100;
    let tip_on_subtotal = subtotal * tip;
    let tip_on_tax = tax * tip;
    switch (column) {
      case 0:
        return subtotal;
      case 1:
        return tax;
      case 2:
        return subtotal + tax;
      case 3:
        return tip_on_subtotal;
      case 4:
        return subtotal + tax + tip_on_subtotal;
      case 5:
        return tip_on_tax;
      case 6:
        return subtotal + tax + tip_on_subtotal + tip_on_tax;
      default:
        return 0;
    }
  }
  draw_table(
    tip_table,
    tips,
    columns_text,
    get_element,
    (x) => x.toString() + "%",
    (x) => x,
    (x) => x.toFixed(2).toString(),
    (row) => row % 2 == 0 ? "lightgreen" : "white",
    always("lightyellow"),
    (row, col) => row % 2 == 0 ? "lightblue" : "white"
  );
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    console.log("Enter was pressed anywhere");
    draw();
  }
});
export {
  draw
};
