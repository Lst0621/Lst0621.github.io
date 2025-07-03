export function add_year(year: number) {
    let year_div: HTMLDivElement = document.createElement("div") as HTMLDivElement
    year_div.classList.add("year_style")
    year_div.innerHTML = year.toString();
    document.body.appendChild(year_div)
    year_div.id = "year-" + year;
}

function get_month_str(month: number) {
    if (month == 0) {
        return "unknown";
    }
    if (month < 10) {
        return "0" + month.toString()
    } else {
        return month.toString()
    }
}

function add_month(year: number, month: number) {
    let month_div: HTMLDivElement = document.createElement("div") as HTMLDivElement
    let month_h1: HTMLHeadingElement = document.createElement("h1") as HTMLHeadingElement
    let book_div: HTMLDivElement = document.createElement("div") as HTMLDivElement

    month_div.id = "header-" + year.toString() + "-" + get_month_str(month)
    month_div.classList.add("month_style")
    if (month == 0) {
        month_h1.textContent = year.toString() + "/" + "?"
    } else {
        month_h1.textContent = year.toString() + "/" + get_month_str(month)
    }
    month_div.appendChild(month_h1)
    document.body.appendChild(month_div)
    book_div.classList.add("books")
    book_div.id = "books-" + year.toString() + "-" + get_month_str(month)
    document.body.appendChild(book_div)
}


function add_year_month(year: number) {
    add_year(year)
    let months = Array.from({length: 13}, (_, i) => 12 - i);
    for (const idx in months) {
        add_month(year, months[idx])
    }
}

function get_div_from_year_month(year: number, month: number) {
    return "books-" + year.toString() + "-" + get_month_str(month)
}

function remove_empty_year_month(year: number) {
    let has_valid_month = false
    for (let month = 0; month <= 12; month++) {
        let div_id: string = get_div_from_year_month(year, month)
        let book_div: HTMLDivElement = document.getElementById(div_id) as HTMLDivElement
        if (book_div.children.length == 0) {
            let month_div_id: string = "header-" + year.toString() + "-" + get_month_str(month)
            if (book_div.parentNode != null) {
                book_div.parentNode.removeChild(document.getElementById(month_div_id) as HTMLDivElement)
                book_div.parentNode.removeChild(book_div)
            }
        } else {
            has_valid_month = true
        }
    }

    if (!has_valid_month) {
        remove_year(year)
    }
}

function remove_year(year: number) {
    let year_element = document.getElementById("year-" + year)
    if (year_element != null && year_element.parentNode != null) {
        year_element.parentNode.removeChild(year_element)
    }
}

function remove_all_year_month(year: number) {
    for (let month = 0; month <= 12; month++) {
        let div_id: string = get_div_from_year_month(year, month)
        let book_div: HTMLDivElement = document.getElementById(div_id) as HTMLDivElement
        if (book_div != null) {
            let month_div_id: string = "header-" + year.toString() + "-" + get_month_str(month)
            if (book_div.parentNode != null) {
                book_div.parentNode.removeChild(document.getElementById(month_div_id) as HTMLDivElement)
                book_div.parentNode.removeChild(book_div)
            }
        }
    }

    remove_year(year);
}

let chosen_tags: string[] = []

function add_button(tag: string, not_selected_color: string, selected_color: string) {
    let button: HTMLButtonElement = document.createElement("button") as HTMLButtonElement
    button.textContent = tag

    button.style.background = not_selected_color
    button.onclick = function () {
        let select = chosen_tags.includes(tag)
        if (select) {
            chosen_tags = chosen_tags.filter(tg => tg != tag)
            button.style.background = not_selected_color
        } else {
            chosen_tags.push(tag)
            button.style.background = selected_color
        }
        console.log("tags: " + chosen_tags)
        show_all_books()
    }
    document.body.appendChild(button)
}


export function add_book(books_group: string, name: string, img_url: string, id: string) {
    let books: HTMLDivElement = (document.getElementById(books_group)) as HTMLDivElement;
    let book: HTMLDivElement = document.createElement("div") as HTMLDivElement
    book.classList.add("book")

    let head: HTMLHeadElement = document.createElement("h1") as HTMLHeadElement
    head.textContent = name
    book.appendChild(head)

    let image: HTMLImageElement = document.createElement("img") as HTMLImageElement;
    book.appendChild(image)
    image.src = img_url;

    book.appendChild(document.createElement("br"));
    let text = document.createElement("p") as HTMLParagraphElement;
    text.textContent = id
    book.appendChild(text)
    books.appendChild(book);
}

export function add_groups(years: number[]) {
    years.sort((a, b) => b - a)
    for (let year = 0; year < years.length; year++) {
        add_year_month(years[year])
    }
}

export function clear_groups(years: number[]) {
    for (let year = 0; year < years.length; year++) {
        remove_empty_year_month(years[year])
    }
}

function clean_up() {
    for (let year = 0; year < years.length; year++) {
        remove_all_year_month(years[year])
    }
}

export function add_footer() {
    // TODO
    // bring back span style="font-family: Courier;font-size: 12pt;"
    let footer: string = "footer"
    let prev_footer = document.getElementById(footer)
    if (prev_footer !== null && prev_footer.parentNode != null) {
        prev_footer.parentNode.removeChild(prev_footer)
    }

    let anchor: HTMLAnchorElement = document.createElement("a")
    anchor.id = footer
    anchor.href = "../index.html"
    anchor.textContent = "Back"
    document.body.appendChild(anchor)
}

let years: number[] = []
let lines: string[] = []

function set_up(text: string) {
    lines = text.split('\n')
    let tags: string[] = []
    let checkouts: string[] = []
    for (let line_idx = 0; line_idx < lines.length; line_idx++) {
        let line = lines[line_idx]
        if (line_idx == 0) {
            console.log(line)
            continue
        }
        if (line.length == 0) {
            continue
        }
        let parts: string[] = line.split('|')
        let year: number = Number(parts[3])
        if (!years.includes(year)) {
            years.push(year)
        }

        let tags_str: string = get_part_by_idx(parts, 5)
        for (let tag of tags_str.split(",")) {
            if (tag.length > 0 && !tags.includes(tag)) {
                tags.push(tag)
            }
        }

        let checkout_str: string = get_part_by_idx(parts, 6)
        for (let checkout of checkout_str.split(",")) {
            if (checkout.length > 0 && !checkouts.includes(checkout)) {
                checkouts.push(checkout)
            }
        }
    }

    for (let tag of tags) {
        let not_select_color = "#90B44B"
        let selected_color = "#f7d94c"
        add_button(tag, not_select_color, selected_color)
    }

    for (let checkout of checkouts) {
        let not_select_color = "#986DB2"
        let selected_color = "#7B90D2"
        add_button(checkout, not_select_color, selected_color)
    }

    show_all_books()
}

function get_part_by_idx(parts: string[], idx: number): string {
    if (parts.length < idx + 1) {
        return ""
    }

    return parts[idx]
}

function show_all_books() {
    clean_up()
    add_groups(years)

    for (let line_idx = 0; line_idx < lines.length; line_idx++) {
        let line = lines[line_idx]
        if (line_idx == 0) {
            continue
        }

        if (line.length == 0) {
            continue
        }

        let parts: string[] = line.split('|')
        let title: string = parts[0]
        let image: string = parts[1]
        let isbn: string = parts[2]
        let year: number = Number(parts[3])
        let month: number = Number(parts[4])
        let tags_str: string = get_part_by_idx(parts, 5)
        let tags: string[] = tags_str.split(',').filter(tag => tag.length > 0)
        let checkout_str: string = get_part_by_idx(parts, 6)
        let checkouts: string[] = checkout_str.split(',').filter(checkout => checkout.length > 0)
        if (chosen_tags.length == 0 || tags.some(tag => chosen_tags.includes(tag)) || checkouts.some(checkout => chosen_tags.includes(checkout))) {
            add_book(get_div_from_year_month(year, month), title, image, isbn)
        }
    }

    clear_groups(years)
    add_footer()
}

export function update_from_file(url: string) {
    let req: XMLHttpRequest = new XMLHttpRequest()
    req.addEventListener("load", function () {
        set_up(this.responseText)
    });

    req.open("GET", url);
    req.send();
}

