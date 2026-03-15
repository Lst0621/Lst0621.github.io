// lib/tsl/util.ts
function get_sup(text) {
  return "<sup>" + text + "</sup>";
}
function range(start, end, step = 1) {
  let result = [];
  let entry = start;
  while (entry < end) {
    result.push(entry);
    entry += step;
  }
  return result;
}

// lib/tsl/math/latex.ts
function power_to_latex(base, degree) {
  return base + "^{" + degree + "}";
}

// lib/tsl/math/polynomial.ts
function join_terms(terms) {
  if (terms.length == 0) {
    return "0";
  }
  let result = "";
  for (let i = 0; i < terms.length; i++) {
    let term = terms[i];
    if (term.length == 0) {
      continue;
    }
    if (i == 0) {
      result += term;
      continue;
    }
    if (!term.startsWith("-")) {
      result += "+";
    }
    result += term;
  }
  return result;
}
function factor_to_string_for_non_const(factor) {
  if (factor == -1) {
    return "-";
  }
  if (factor == 1) {
    return "";
  }
  return factor.toString();
}
function get_latex_term(indeterminate, factor, degree) {
  if (factor == 0) {
    return "";
  }
  if (degree == 0) {
    return factor.toString();
  }
  if (degree == 1) {
    return factor_to_string_for_non_const(factor) + indeterminate;
  }
  return factor_to_string_for_non_const(factor) + power_to_latex(indeterminate, degree.toString());
}
function poly_to_latex_low_to_high(poly) {
  let indeterminate = "x";
  let terms = [];
  for (let degree = 0; degree < poly.length; degree++) {
    let factor = poly[degree];
    terms.push(get_latex_term(indeterminate, factor, degree));
  }
  return join_terms(terms);
}
function poly_to_latex_high_to_low(poly) {
  let indeterminate = "x";
  let terms = [];
  for (let degree = 0; degree < poly.length; degree++) {
    let factor = poly[degree];
    terms.push(get_latex_term(indeterminate, factor, degree));
  }
  return join_terms(terms.reverse());
}
function poly_to_html(poly) {
  let indeterminate = "x";
  let terms = [];
  for (let degree = 0; degree < poly.length; degree++) {
    let factor = poly[degree];
    if (factor == 0) {
      continue;
    }
    if (degree == 0) {
      terms.push(factor.toString());
      continue;
    }
    if (degree == 1) {
      terms.push(factor_to_string_for_non_const(factor) + indeterminate);
      continue;
    }
    terms.push(factor_to_string_for_non_const(factor) + indeterminate + get_sup(degree.toString()));
  }
  return join_terms(terms);
}
function poly_eval(poly, x) {
  let powers = 1;
  let sum = 0;
  for (let degree = 0; degree < poly.length; degree++) {
    let factor = poly[degree];
    sum += factor * powers;
    powers *= x;
  }
  return sum;
}

// lib/tsl/math/number.ts
function is_prime(a) {
  if (a <= 1) {
    return false;
  }
  if (a == 2 || a == 3 || a == 5) {
    return true;
  }
  for (let i = 2; i * i <= a; i++) {
    if (a % i == 0) {
      return false;
    }
  }
  return true;
}
function* gen_prime() {
  let n = 2;
  while (true) {
    if (is_prime(n)) {
      yield n;
    }
    n++;
  }
}

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

// lib/page/poly_properties.ts
function update_poly() {
  let poly_input = document.getElementById("poly_input").value;
  let span = document.getElementById("poly_text");
  let poly = poly_input.split(";").map(Number);
  span.innerHTML = "Latex: " + poly_to_latex_low_to_high(poly) + "<br>Latex: " + poly_to_latex_high_to_low(poly) + "<br>HTML: " + poly_to_html(poly);
  let table = document.getElementById("poly_eval_table");
  for (let prime of gen_prime()) {
    console.log("prime " + prime);
    let vars = range(0, prime).map((n) => poly_eval(poly, n) % prime);
    console.log(vars);
    if (vars.every((v) => v != 0)) {
      let mods = range(1, prime + 1);
      let rows = [0].concat(mods);
      draw_table(
        table,
        rows,
        range(0, prime),
        (row, col) => {
          let value = poly_eval(poly, col);
          if (row == 0) {
            return value;
          } else {
            return value % row;
          }
        },
        (i) => "(" + poly_to_html(poly) + ")" + (i > 0 ? " mod " + i.toString() : ""),
        (c) => c.toString(),
        (e) => e.toString(),
        always("lightgreen"),
        always("lightyellow"),
        always("lightblue")
      );
      break;
    }
    if (prime >= 97) {
      clear_table(table);
      break;
    }
  }
}
function set_up() {
  document.getElementById("poly_input").value = "3;-1;1;1";
  update_poly();
  let button = document.getElementById("update_button");
  button.onclick = update_poly;
}
set_up();
