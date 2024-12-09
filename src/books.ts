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

function add_book_2021_09() {
    let books_group: string = "books-2021-09"

    add_book(
        books_group,
        "Designing Data-Intensive Applications",
        "https://dataintensive.net/images/book-cover.png",
        "978-1449373320")
    add_book(
        books_group,
        "不朽",
        "https://m.media-amazon.com/images/I/517SaCMzkDL.jpg",
        "B00BLYZQP8")
}

function add_book_2022_03() {
    let books_group: string = "books-2022-03"

    add_book(
        books_group,
        "天朝的崩溃/鸦片战争再研究",
        "https://img1.baidu.com/it/u=1086739530,202871532&fm=253",
        "9787108050656")
    add_book(books_group,
        "乌合之众",
        "https://www.books.com.tw/img/CN1/148/91/CN11489143.jpg",
        "9787512714922"
    )
}

function add_book_2022_05() {
    let books_group: string = "books-2022-05"

    add_book(
        books_group,
        "Introduction to Calculus and Analysis, Vol. 1",
        "https://images-na.ssl-images-amazon.com/images/I/51RfQvDridL.jpg",
        "978-3540650584"
    )
    add_book(
        books_group,
        "Streaming Systems",
        "https://learning.oreilly.com/library/cover/9781491983867/1000w",
        "978-1491983874"
    )
}
function add_book_2022_06() {
    let books_group: string = "books-2022-06"

    add_book(
        books_group,
        "魏晋南北朝史讲演录",
        "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1503250477i/36076009.jpg",
        "9787201139463"
    )

    add_book(
        books_group,
        "Data and Reality",
        "https://images-na.ssl-images-amazon.com/images/I/71oIGW7BrBL.jpg",
        "978-1935504214"
    )
}

function add_book_2022_09() {
    let books_group: string = "books-2022-09"

    add_book(
        books_group,
        "Linear Algebra",
        "https://pictures.abebooks.com/isbn/9780135367971-us.jpg",
        "9780135367971"
    )
}

function add_book_2022_10() {
    let books_group: string = "books-2022-10"

    add_book(
        books_group,
        "Applied Mathematics for Database Professionals",
        "https://m.media-amazon.com/images/I/41iFKLYdZhL.jpg",
        "978-1430211846"
    )
}

function add_book_2022_12() {
    let books_group: string = "books-2022-12"

    add_book(
        books_group,
        "中国历史常识",
        "https://easyreadfs.nosdn.127.net/cKaGzfz6csiWPZT9-eRbhQ==/8796093024978802418",
        "9787517834793"
    )
}

function add_book_2023() {
    add_book(
        "books-2023-01",
        "The Foundations of Arithmetic: A Logico-Mathematical Enquiry into the Concept of Number",
        "https://m.media-amazon.com/images/I/51mVW605ekL.jpg",
        "978-0810106055"
    )
    add_book(
        "books-2023-02",
        "生育制度",
        "https://img10.360buyimg.com/n9/s540x540_jfs/t1/212058/30/23548/40013/636e72e0E13baadb2/1b5c63d36f342a75.jpg.avif",
        "9787559651204"
    )
    add_book(
        "books-2023-02",
        "What Is the Name of This Book?: The Riddle of Dracula and Other Logical Puzzles",
        "https://m.media-amazon.com/images/I/41MSBTWNIML.jpg",
        "978-0486481982"
    )
    add_book(
        "books-2023-03",
        "乡土中国",
        "https://img11.360buyimg.com/n9/s540x540_jfs/t1/149506/7/31988/34727/636e7237E489606bd/6664a256b77ac126.jpg.avif",
        "9787559650627"
    )
    add_book(
        "books-2023-04",
        "乡土重建",
        "https://img11.360buyimg.com/n9/s512x512_jfs/t1/6025/28/11826/88864/60b9b7a5Ee05bd2b1/eb9ea1400309f7c0.jpg",
        "9787559650610"
    )
    add_book(
        "books-2023-06",
        "Introduction to the Theory of Computation",
        "https://m.media-amazon.com/images/I/51FrXXE3j7L.jpg",
        "978-1133187790"
    )
    add_book(
        "books-2023-06",
        "Mythical Man-Month, The: Essays on Software Engineering",
        "https://m.media-amazon.com/images/I/71fCJWIx4UL.jpg",
        "978-0201835953"
    )
    add_book(
        "books-2023-06",
        "Phaedo",
        "https://m.media-amazon.com/images/I/418IqdCUAXL.jpg",
        "B0082S2Z2S"
    )
    add_book(
        "books-2023-07",
        "Rich Dad Poor Dad: What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not!",
        "https://m.media-amazon.com/images/I/81BE7eeKzAL._SL1500_.jpg",
        "978-1612681139"
    )
    add_book(
        "books-2023-07",
        "System Design Interview – An Insider's Guide: Volume 2",
        "https://m.media-amazon.com/images/I/51lJolln98L._SL1429_.jpg",
        "978-1736049112"
    )
    add_book(
        "books-2023-08",
        "Compilers: Principles, Techniques, and Tools",
        "https://m.media-amazon.com/images/I/51L0qegzCgL.jpg",
        "978-0321486813"
    )
    add_book(
        "books-2023-09",
        "A Book of Abstract Algebra: Second Edition",
        "https://m.media-amazon.com/images/I/71ixgrQG5yL.jpg",
        "978-0486474175"
    )
    add_book(
        "books-2023-09",
        "Boolean Algebra and Its Applications",
        "https://m.media-amazon.com/images/I/81Lo-WmVpKL.jpg",
        "978-0486477671"
    )
    add_book(
        "books-2023-10",
        "万历十五年",
        "https://m.media-amazon.com/images/I/71sA9gh1sNL.jpg",
        "9787101156478"
    )
    add_book(
        "books-2023-11",
        "About Vectors",
        "https://m.media-amazon.com/images/I/61OEjMyt5iL._SL1360_.jpg",
        "978-0486604893"
    )
    add_book(
        "books-2023-12",
        "Introduction to Calculus and Analysis, Vol. II/1",
        "https://m.media-amazon.com/images/I/51HkNDeM1XL.jpg",
        "978-3540665694"
    )
}

function add_books(){
    add_book(
        "books-2024-11",
        "Number Theory",
        "https://m.media-amazon.com/images/I/61tBtOB1O6L.jpg",
        "978-0486682525"
    )

    add_book(
        "books-2024-11",
        "Complex Variables: Second Edition ",
        "https://m.media-amazon.com/images/I/61SJ6nHwAiL.jpg",
        "978-0486406794"
    )

    add_book(
        "books-2024-10",
        "Computer Networks",
        "https://marketing-assets.chegg.com/BDEIAGTK/as/nvfrpqf5k5frc84rs579rnc/9780132126953.jpg",
        "978-0132126953"
    )

    add_book(
        "books-2024-09",
        "Elements of Programming",
        "https://m.media-amazon.com/images/I/51TG0kzHi6L.jpg",
        "978-0578222141"
    )

    add_book(
        "books-2024-09",
        "八次危机:中国的真实经验(1949-2009) ",
        "https://m.media-amazon.com/images/I/71TVzm4nhsL.jpg",
        "978-7-5060-5557-4"
    )
    add_book(
        "books-2024-09",
        "Topology: An Introduction to the Point-Set and Algebraic Areas",
        "https://marketing-assets.chegg.com/BDEIAGTK/as/gqr9mfw6fggmmk96wf7s6kh/9780486686097.jpg",
        "978-0486686097"
    )
    add_book(
        "books-2024-08",
        "An Introduction to Ordinary Differential Equations",
        "https://m.media-amazon.com/images/I/81I8f6Cn-ZL.jpg",
        "978-0486659428"
    )
    add_book(
        "books-2024-06",
        "Div, Grad, Curl, and All That: An Informal Text on Vector Calculus",
        "https://m.media-amazon.com/images/I/71mVtHgjpgL.jpg",
        "978-0393925166"
    )
    add_book(
        "books-2024-05",
        "How to Lie with Statistics",
        "https://m.media-amazon.com/images/I/71HrHG2145L.jpg",
        "978-0393310726"
    )
    add_book(
        "books-2024-04",
        "The Art of Proof: Basic Training for Deeper Mathematics",
        "https://m.media-amazon.com/images/I/617FpsDLEBL.jpg",
        "978-1441970220",
    )
    add_book(
        "books-2024-03",
        "A Book of Set Theory",
        "https://m.media-amazon.com/images/I/81pZEbrMDHL.jpg",
        "978-0486497082"
    )
    add_book(
        "books-2024-03",
        "Designing Distributed Systems: Patterns and Paradigms for Scalable, Reliable Services",
        "https://m.media-amazon.com/images/I/91CxhyACrlL.jpg",
        "978-1491983645"
    )

    add_book(
        "books-2024-02",
        "Linear Algebra Done Rights",
        "https://m.media-amazon.com/images/I/61G5BuihTeL.jpg",
        "978-3319307657"
    )

    add_book(
        "books-2024-02",
        "An Introduction to Functional Programming Through Lambda Calculus",
        "https://m.media-amazon.com/images/I/71BDN38eBVL.jpg",
        "978-0486478838"
    )

    add_book(
        "books-2024-02",
        "Functional Programming in Java: How functional techniques improve your Java programs",
        "https://m.media-amazon.com/images/I/51Zq7G+uwxL.jpg",
        "978-1617292736"
    )

    add_book(
        "books-2024-01",
        "The Filmmaker's Guide to Visual Effects",
        "https://m.media-amazon.com/images/I/71lngDARigL.jpg",
        "978-1032266695"
    )
    add_book(
        "books-2024-01",
        "Category Theory I: Notes towards a gentle introduction",
        "https://m.media-amazon.com/images/I/51J4dhgYKnL.jpg",
        "978-1916906372"
    )
    add_book(
        "books-2024-01",
        "Introduction to Calculus and Analysis, Vol. II/2",
        "https://m.media-amazon.com/images/I/51VtJlaAHgL.jpg",
        "978-3540665700"
    )

    add_book_2023()
    add_book_2022_12()
    add_book_2022_10()
    add_book_2022_09()
    add_book_2022_06()
    add_book_2022_05()
    add_book_2022_03()
    add_book_2021_09()
    add_book_2021_04()
    add_book_2021_03()
    add_book_2021_01()
    add_book_2020()
}

add_books()
