function add_book(books_group, name, img_url, id) {
    var books = (document.getElementById(books_group));
    var book = document.createElement("div");
    book.classList.add("book");
    var head = document.createElement("h1");
    head.textContent = name;
    book.appendChild(head);
    var image = document.createElement("img");
    book.appendChild(image);
    image.src = img_url;
    book.appendChild(document.createElement("br"));
    var text = document.createElement("p");
    text.textContent = id;
    book.appendChild(text);
    books.appendChild(book);
}
function add_book_2021_01() {
    var books_group = "books-2021-01";
    add_book(books_group, "鲁迅杂文精选", "https://m.media-amazon.com/images/I/514fDa3jQ+L.jpg", "B009Z5TEE4");
    add_book(books_group, "呐喊", "https://m.media-amazon.com/images/I/51un6ZRgZtL.jpg", "B009FRHRAA");
    add_book(books_group, "Modern Operating Systems", "https://www.pearsonhighered.com/assets/bigcovers/0/1/3/3/013359162X.jpg", "978-0133591620");
}
function add_book_2020() {
    var books_group = "books-2020";
    add_book(books_group, "Effective Java", "https://learning.oreilly.com/library/cover/9780137150021/250w/", "9780137150021");
    add_book(books_group, "江村经济：中国农民的生活", "https://pic.cp.com.cn/Images/2014/5/8/144112404800c8bcd-9_hwc268268.jpg", "978-7-100-02795-3");
    add_book(books_group, "Design Patterns: Elements of Reusable Object-Oriented Software", "https://images-na.ssl-images-amazon.com/images/I/51szD9HC9pL.jpg", "978-0201633610");
    add_book(books_group, "From Mathematics to Generic Programming", "https://images-na.ssl-images-amazon.com/images/I/5194c6yZKcL.jpg", "978-0321942043");
    add_book(books_group, "C Programming Language", "https://images-na.ssl-images-amazon.com/images/I/411ejyE8obL.jpg", "978-0131103627");
}
function add_book_2021_03() {
    var books_group = "books-2021-03";
    add_book(books_group, "热风", "https://m.media-amazon.com/images/I/51LPAL5DpvL.jpg", "B00AA7KINW");
    add_book(books_group, "Java Concurrency in Practice", "https://images-na.ssl-images-amazon.com/images/I/51ezEd0Lw6L.jpg", "978-0321349606");
}
function add_book_2021_04() {
    var books_group = "books-2021-04";
    add_book(books_group, "The Crowd; study of the popular mind Kindle Edition", "https://m.media-amazon.com/images/I/41cArCl9q2L.jpg", "B004UJNFQI");
}
function add_book_2021_09() {
    var books_group = "books-2021-09";
    add_book(books_group, "Designing Data-Intensive Applications", "https://dataintensive.net/images/book-cover.png", "978-1449373320");
    add_book(books_group, "不朽", "https://m.media-amazon.com/images/I/517SaCMzkDL.jpg", "B00BLYZQP8");
}
function add_book_2022_03() {
    var books_group = "books-2022-03";
    add_book(books_group, "天朝的崩溃/鸦片战争再研究", "https://img1.baidu.com/it/u=1086739530,202871532&fm=253", "9787108050656");
    add_book(books_group, "乌合之众", "https://www.books.com.tw/img/CN1/148/91/CN11489143.jpg", "9787512714922");
}
function add_book_2022_05() {
    var books_group = "books-2022-05";
    add_book(books_group, "Introduction to Calculus and Analysis, Vol. 1", "https://images-na.ssl-images-amazon.com/images/I/51RfQvDridL.jpg", "978-3540650584");
    add_book(books_group, "Streaming Systems", "http://streamingsystems.net/static/images/streaming_systems_color_cover.png", "978-1491983874");
}
add_book_2022_05();
add_book_2022_03();
add_book_2021_09();
add_book_2021_04();
add_book_2021_03();
add_book_2021_01();
add_book_2020();
