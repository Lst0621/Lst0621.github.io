import {add_book, add_footer, add_groups, clear_groups, update_from_file} from "./books.js";


function add_book_2025() {
    add_book(
        "books-2025-03",
        "A Mathematical Introduction To Logic",
        "https://m.media-amazon.com/images/I/41qOkVK59RL.jpg",
        "978-0123958136"
    )
    add_book(
        "books-2025-03",
        "Logic for Computer Science: Foundations of Automatic Theorem Proving, Second Edition",
        "https://m.media-amazon.com/images/I/81paInFDVaL.jpg",
        "978-0486780825"
    )
    add_book(
        "books-2025-01",
        "Introductory Discrete Mathematics",
        "https://m.media-amazon.com/images/I/51KIuuDfCaL.jpg",
        "978-0486691152"
    )
    add_book(
        "books-2025-01",
        "WebAssembly: The Definitive Guide: Safe, Fast, and Portable Code",
        "https://m.media-amazon.com/images/I/91vhWTofMdL.jpg",
        "978-1492089841"
    )
}

function add_book_2024() {
    add_book(
        "books-2024-10",
        "Discrete Mathematics and Its Applications",
        "https://m.media-amazon.com/images/I/41ujd8aCacL.jpg",
        "978-1259676512"
    )
    add_book(
        "books-2024-06",
        "Finite-Dimensional Vector Spaces",
        "https://m.media-amazon.com/images/I/71N1jNExbrL.jpg",
        "978-0486814865"
    )
    add_book(
        "books-2024-05",
        "Div, Grad, Curl, and All That: An Informal Text on Vector Calculus",
        "https://m.media-amazon.com/images/I/71mVtHgjpgL.jpg",
        "978-0393925166"
    )
}

update_from_file()
