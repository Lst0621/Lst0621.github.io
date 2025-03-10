export function add_year(year: number) {
    let year_div: HTMLDivElement = document.createElement("div") as HTMLDivElement
    year_div.classList.add("year_style")
    year_div.innerHTML = year.toString();
    document.body.appendChild(year_div)
}

function get_month_str(month: number) {
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
    month_h1.textContent = year.toString() + "/" + get_month_str(month)
    month_div.appendChild(month_h1)
    document.body.appendChild(month_div)
    book_div.classList.add("books")
    book_div.id = "books-" + year.toString() + "-" + get_month_str(month)
    document.body.appendChild(book_div)
}


function add_year_month(year: number) {
    add_year(year)
    let months = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    for (const idx in months) {
        add_month(year, months[idx])
    }
}


function remove_empty_year_month(year: number) {
    for (let month = 1; month <= 12; month++) {
        let div_id: string = "books-" + year.toString() + "-" + get_month_str(month)
        let book_div: HTMLDivElement = document.getElementById(div_id) as HTMLDivElement
        if (book_div.children.length == 0) {
            let month_div_id: string = "header-" + year.toString() + "-" + get_month_str(month)
            if (book_div.parentNode != null) {
                book_div.parentNode.removeChild(document.getElementById(month_div_id) as HTMLDivElement)
                book_div.parentNode.removeChild(book_div)
            }
        }
    }
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

export function add_footer() {
    // TODO
    // bring back span style="font-family: Courier;font-size: 12pt;"
    let anchor: HTMLAnchorElement = document.createElement("a")
    anchor.href = "../index.html"
    anchor.textContent = "Back"
    document.body.appendChild(anchor)
}

