export function add_year(year) {
    let year_div = document.createElement("div");
    year_div.classList.add("year_style");
    year_div.innerHTML = year.toString();
    document.body.appendChild(year_div);
}
function get_month_str(month) {
    if (month < 10) {
        return "0" + month.toString();
    }
    else {
        return month.toString();
    }
}
function add_month(year, month) {
    let month_div = document.createElement("div");
    let month_h1 = document.createElement("h1");
    let book_div = document.createElement("div");
    month_div.id = "header-" + year.toString() + "-" + get_month_str(month);
    month_div.classList.add("month_style");
    month_h1.textContent = year.toString() + "/" + get_month_str(month);
    month_div.appendChild(month_h1);
    document.body.appendChild(month_div);
    book_div.classList.add("books");
    book_div.id = "books-" + year.toString() + "-" + get_month_str(month);
    document.body.appendChild(book_div);
}
function add_year_month(year) {
    add_year(year);
    let months = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    for (const idx in months) {
        add_month(year, months[idx]);
    }
}
function get_div_from_year_month(year, month) {
    return "books-" + year.toString() + "-" + get_month_str(month);
}
function remove_empty_year_month(year) {
    for (let month = 1; month <= 12; month++) {
        let div_id = get_div_from_year_month(year, month);
        let book_div = document.getElementById(div_id);
        if (book_div.children.length == 0) {
            let month_div_id = "header-" + year.toString() + "-" + get_month_str(month);
            if (book_div.parentNode != null) {
                book_div.parentNode.removeChild(document.getElementById(month_div_id));
                book_div.parentNode.removeChild(book_div);
            }
        }
    }
}
export function add_book(books_group, name, img_url, id) {
    let books = (document.getElementById(books_group));
    let book = document.createElement("div");
    book.classList.add("book");
    let head = document.createElement("h1");
    head.textContent = name;
    book.appendChild(head);
    let image = document.createElement("img");
    book.appendChild(image);
    image.src = img_url;
    book.appendChild(document.createElement("br"));
    let text = document.createElement("p");
    text.textContent = id;
    book.appendChild(text);
    books.appendChild(book);
}
export function add_groups(years) {
    years.sort((a, b) => b - a);
    for (let year = 0; year < years.length; year++) {
        add_year_month(years[year]);
    }
}
export function clear_groups(years) {
    for (let year = 0; year < years.length; year++) {
        remove_empty_year_month(years[year]);
    }
}
export function add_footer() {
    // TODO
    // bring back span style="font-family: Courier;font-size: 12pt;"
    let anchor = document.createElement("a");
    anchor.href = "../index.html";
    anchor.textContent = "Back";
    document.body.appendChild(anchor);
}
function show_all_books(text) {
    console.log(text);
    let lines = text.split('\n');
    console.log(lines.length);
    let years = [];
    for (let line_idx = 0; line_idx < lines.length; line_idx++) {
        let line = lines[line_idx];
        if (line_idx == 0) {
            console.log(line);
            continue;
        }
        if (line.length == 0) {
            console.log(line);
        }
        let parts = line.split('|');
        let year = Number(parts[3]);
        if (!years.includes(year)) {
            years.push(year);
        }
    }
    console.log(years);
    add_groups(years);
    for (let line_idx = 0; line_idx < lines.length; line_idx++) {
        let line = lines[line_idx];
        if (line_idx == 0) {
            continue;
        }
        if (line.length == 0) {
            console.log(line);
        }
        let parts = line.split('|');
        let title = parts[0];
        let image = parts[1];
        let isbn = parts[2];
        let year = Number(parts[3]);
        let month = Number(parts[4]);
        console.log(get_div_from_year_month(year, month));
        add_book(get_div_from_year_month(year, month), title, image, isbn);
    }
    clear_groups(years);
    add_footer();
}
export function update_from_file() {
    let req = new XMLHttpRequest();
    req.addEventListener("load", function () {
        show_all_books(this.responseText);
    });
    let LIB_FILE_URL = "../resource/lib_of_hj.psv";
    req.open("GET", LIB_FILE_URL);
    req.send();
}
