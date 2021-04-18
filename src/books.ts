function add_book(books_group: string, name: string, img_url: string, id: string) {
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

function add_book_2021_01(){
    let books_group: string = "books-2021-01"

    add_book(
        books_group,
        "鲁迅杂文精选",
        "https://m.media-amazon.com/images/I/514fDa3jQ+L.jpg",
        "B009Z5TEE4")
    add_book(
        books_group,
        "呐喊",
        "https://m.media-amazon.com/images/I/51un6ZRgZtL.jpg",
        "B009FRHRAA")
    add_book(
        books_group,
        "Modern Operating Systems",
        "https://www.pearsonhighered.com/assets/bigcovers/0/1/3/3/013359162X.jpg",
        "978-0133591620")
}

function add_book_2020() {
    let books_group: string = "books-2020"

    add_book(
        books_group,
        "Effective Java",
        "https://learning.oreilly.com/library/cover/9780137150021/250w/",
        "9780137150021")
    add_book(
        books_group,
        "江村经济：中国农民的生活",
        "https://pic.cp.com.cn/Images/2014/5/8/144112404800c8bcd-9_hwc268268.jpg",
        "978-7-100-02795-3")
    add_book(
        books_group,
        "Design Patterns: Elements of Reusable Object-Oriented Software",
        "https://images-na.ssl-images-amazon.com/images/I/51szD9HC9pL.jpg",
        "978-0201633610")
    add_book(
        books_group,
        "From Mathematics to Generic Programming",
        "https://images-na.ssl-images-amazon.com/images/I/5194c6yZKcL.jpg",
        "978-0321942043")

    add_book(
        books_group,
        "C Programming Language",
        "https://images-na.ssl-images-amazon.com/images/I/411ejyE8obL.jpg",
        "978-0131103627")
}

function add_book_2021_03(){
    let books_group: string = "books-2021-03"

    add_book(
        books_group,
        "热风",
        "https://m.media-amazon.com/images/I/51LPAL5DpvL.jpg",
        "B00AA7KINW")
    add_book(
        books_group,
        "Java Concurrency in Practice",
        "https://images-na.ssl-images-amazon.com/images/I/51ezEd0Lw6L.jpg",
        "978-0321349606")
}

function add_book_2021_04() {
    let books_group: string = "books-2021-04"

    add_book(
        books_group,
        "The Crowd; study of the popular mind Kindle Edition",
        "https://m.media-amazon.com/images/I/41cArCl9q2L.jpg",
        "B004UJNFQI")
}

add_book_2021_04()
add_book_2021_03()
add_book_2021_01()
add_book_2020()