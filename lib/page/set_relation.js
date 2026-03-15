// tsl/math/set.ts
function is_reflexive(relation2) {
  let len = relation2.length;
  for (let i = 0; i < len; i++) {
    if (!relation2[i][i]) {
      return false;
    }
  }
  return true;
}
function is_symmetric(relation2) {
  let len = relation2.length;
  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < relation2.length; j++) {
      if (relation2[j][i] != relation2[i][j]) {
        return false;
      }
    }
  }
  return true;
}
function is_antisymmetric(relation2) {
  let len = relation2.length;
  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < relation2.length; j++) {
      if (relation2[j][i] && relation2[i][j]) {
        return false;
      }
    }
  }
  return true;
}
function is_transitive(relation2) {
  let len = relation2.length;
  for (let i = 0; i < relation2.length; i++) {
    for (let j = 0; j < relation2.length; j++) {
      if (!relation2[i][j]) {
        continue;
      }
      for (let k = 0; k < relation2.length; k++) {
        if (relation2[j][k]) {
          if (!relation2[i][k]) {
            return false;
          }
        }
      }
    }
  }
  return true;
}
function is_equivalence(relation2) {
  return is_reflexive(relation2) && is_symmetric(relation2) && is_transitive(relation2);
}

// page/set_relation.ts
var table_sz = 3;
var relation = [];
function set_up_relation() {
  relation = [];
  for (let i = 0; i < table_sz; i++) {
    let next_row = [];
    for (let j = 0; j < table_sz; j++) {
      next_row.push(false);
    }
    relation.push(next_row);
  }
}
function update_table(sz) {
  table_sz = sz;
  let table = document.getElementById("relation_table");
  table.style.fontSize = "40";
  table.style.alignSelf = "center";
  table.style.borderStyle = "solid";
  table.style.textAlign = "center";
  while (true) {
    if (table.rows.length == 0) {
      break;
    }
    table.deleteRow(0);
  }
  set_up_relation();
  let number_color = "#8A6BBE";
  {
    let row = table.insertRow();
    for (let i = 0; i <= sz; i++) {
      let cell = row.insertCell();
      if (i != 0) {
        cell.style.borderStyle = "solid";
        cell.innerText = i.toString();
        cell.style.background = number_color;
      }
    }
  }
  let chosen_color = "lightblue";
  let not_chosen_color = "lightgreen";
  for (let i = 1; i <= sz; i++) {
    let row = table.insertRow();
    let cell = row.insertCell();
    cell.style.borderStyle = "solid";
    cell.style.background = number_color;
    cell.innerText = i.toString();
    for (let j = 1; j <= sz; j++) {
      let cell_product = row.insertCell();
      cell_product.style.borderStyle = "solid";
      cell_product.innerText = "(" + i.toString() + "," + j.toString() + ")";
      cell_product.style.background = relation[i - 1][j - 1] ? chosen_color : not_chosen_color;
      cell_product.onclick = () => {
        relation[i - 1][j - 1] = !relation[i - 1][j - 1];
        cell_product.style.background = relation[i - 1][j - 1] ? chosen_color : not_chosen_color;
        update_relation();
      };
    }
  }
  update_relation();
  for (let row of table.rows) {
    for (let cell of row.cells) {
      cell.style.fontSize = "25px";
    }
  }
}
function update_relation() {
  let relation_text = document.getElementById("relation_text");
  relation_text.innerHTML = "Relation for a set of order " + table_sz.toString() + "<br>reflexive: " + is_reflexive(relation) + "<br>transitive:" + is_transitive(relation) + "<br>symmetric:" + is_symmetric(relation) + "<br>antisymmetric:" + is_antisymmetric(relation) + "<br>equivalenc:" + is_equivalence(relation) + "<br>";
}
function increment() {
  table_sz++;
  update_table(table_sz);
}
function decrement() {
  if (table_sz == 2) {
    return;
  }
  table_sz--;
  update_table(table_sz);
}
update_table(3);
export {
  decrement,
  increment,
  update_table
};
