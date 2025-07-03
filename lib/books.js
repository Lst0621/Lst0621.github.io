export function add_year(year) {
    let year_div = document.createElement("div");
    year_div.classList.add("year_style");
    year_div.innerHTML = year.toString();
    document.body.appendChild(year_div);
    year_div.id = "year-" + year;
}
function get_month_str(month) {
    if (month == 0) {
        return "unknown";
    }
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
    if (month == 0) {
        month_h1.textContent = year.toString() + "/" + "?";
    }
    else {
        month_h1.textContent = year.toString() + "/" + get_month_str(month);
    }
    month_div.appendChild(month_h1);
    document.body.appendChild(month_div);
    book_div.classList.add("books");
    book_div.id = "books-" + year.toString() + "-" + get_month_str(month);
    document.body.appendChild(book_div);
}
function add_year_month(year) {
    add_year(year);
    let months = Array.from({ length: 13 }, (_, i) => 12 - i);
    for (const idx in months) {
        add_month(year, months[idx]);
    }
}
function get_div_from_year_month(year, month) {
    return "books-" + year.toString() + "-" + get_month_str(month);
}
function remove_empty_year_month(year) {
    let has_valid_month = false;
    for (let month = 0; month <= 12; month++) {
        let div_id = get_div_from_year_month(year, month);
        let book_div = document.getElementById(div_id);
        if (book_div.children.length == 0) {
            let month_div_id = "header-" + year.toString() + "-" + get_month_str(month);
            if (book_div.parentNode != null) {
                book_div.parentNode.removeChild(document.getElementById(month_div_id));
                book_div.parentNode.removeChild(book_div);
            }
        }
        else {
            has_valid_month = true;
        }
    }
    if (!has_valid_month) {
        remove_year(year);
    }
}
function remove_year(year) {
    let year_element = document.getElementById("year-" + year);
    if (year_element != null && year_element.parentNode != null) {
        year_element.parentNode.removeChild(year_element);
    }
}
function remove_all_year_month(year) {
    for (let month = 0; month <= 12; month++) {
        let div_id = get_div_from_year_month(year, month);
        let book_div = document.getElementById(div_id);
        if (book_div != null) {
            let month_div_id = "header-" + year.toString() + "-" + get_month_str(month);
            if (book_div.parentNode != null) {
                book_div.parentNode.removeChild(document.getElementById(month_div_id));
                book_div.parentNode.removeChild(book_div);
            }
        }
    }
    remove_year(year);
}
let chosen_tags = [];
function add_button(tag, not_selected_color, selected_color) {
    let button = document.createElement("button");
    button.textContent = tag;
    button.style.background = not_selected_color;
    button.onclick = function () {
        let select = chosen_tags.includes(tag);
        if (select) {
            chosen_tags = chosen_tags.filter(tg => tg != tag);
            button.style.background = not_selected_color;
        }
        else {
            chosen_tags.push(tag);
            button.style.background = selected_color;
        }
        console.log("tags: " + chosen_tags);
        show_all_books();
    };
    document.body.appendChild(button);
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
function clean_up() {
    for (let year = 0; year < years.length; year++) {
        remove_all_year_month(years[year]);
    }
}
export function add_footer() {
    // TODO
    // bring back span style="font-family: Courier;font-size: 12pt;"
    let footer = "footer";
    let prev_footer = document.getElementById(footer);
    if (prev_footer !== null && prev_footer.parentNode != null) {
        prev_footer.parentNode.removeChild(prev_footer);
    }
    let anchor = document.createElement("a");
    anchor.id = footer;
    anchor.href = "../index.html";
    anchor.textContent = "Back";
    document.body.appendChild(anchor);
}
let years = [];
let lines = [];
function set_up(text) {
    lines = text.split('\n');
    let tags = [];
    let checkouts = [];
    for (let line_idx = 0; line_idx < lines.length; line_idx++) {
        let line = lines[line_idx];
        if (line_idx == 0) {
            console.log(line);
            continue;
        }
        if (line.length == 0) {
            continue;
        }
        let parts = line.split('|');
        let year = Number(parts[3]);
        if (!years.includes(year)) {
            years.push(year);
        }
        let tags_str = get_part_by_idx(parts, 5);
        for (let tag of tags_str.split(",")) {
            if (tag.length > 0 && !tags.includes(tag)) {
                tags.push(tag);
            }
        }
        let checkout_str = get_part_by_idx(parts, 6);
        for (let checkout of checkout_str.split(",")) {
            if (checkout.length > 0 && !checkouts.includes(checkout)) {
                checkouts.push(checkout);
            }
        }
    }
    for (let tag of tags) {
        let not_select_color = "#90B44B";
        let selected_color = "#f7d94c";
        add_button(tag, not_select_color, selected_color);
    }
    for (let checkout of checkouts) {
        let not_select_color = "#986DB2";
        let selected_color = "#7B90D2";
        add_button(checkout, not_select_color, selected_color);
    }
    show_all_books();
}
function get_part_by_idx(parts, idx) {
    if (parts.length < idx + 1) {
        return "";
    }
    return parts[idx];
}
function show_all_books() {
    clean_up();
    add_groups(years);
    for (let line_idx = 0; line_idx < lines.length; line_idx++) {
        let line = lines[line_idx];
        if (line_idx == 0) {
            continue;
        }
        if (line.length == 0) {
            continue;
        }
        let parts = line.split('|');
        let title = parts[0];
        let image = parts[1];
        let isbn = parts[2];
        let year = Number(parts[3]);
        let month = Number(parts[4]);
        let tags_str = get_part_by_idx(parts, 5);
        let tags = tags_str.split(',').filter(tag => tag.length > 0);
        let checkout_str = get_part_by_idx(parts, 6);
        let checkouts = checkout_str.split(',').filter(checkout => checkout.length > 0);
        if (chosen_tags.length == 0 || tags.some(tag => chosen_tags.includes(tag)) || checkouts.some(checkout => chosen_tags.includes(checkout))) {
            add_book(get_div_from_year_month(year, month), title, image, isbn);
        }
    }
    clear_groups(years);
    add_footer();
}
export function update_from_file(url) {
    let req = new XMLHttpRequest();
    req.addEventListener("load", function () {
        set_up(this.responseText);
    });
    req.open("GET", url);
    req.send();
}
