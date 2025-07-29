import {draw_table} from "../tsl/visual.js";
import {always} from "../tsl/func.js";

// TODO move to some common
function get_float(element_id: string) {
    return parseFloat((document.getElementById(element_id) as HTMLInputElement).value)
}


export function draw() {
    let tip_table = document.getElementById("tip_table") as HTMLTableElement;
    let columns_text: string[] =
        ["food", "tax", "food+tax",
            "tips on food", "food+tax+tips", "tips on tax", "food+tax+tips+tips on tax",];
    // TODO
    let subtotal = get_float("food")
    let tax = get_float("tax")
    let tips = [0, 5, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

    function get_element(row: number, column: number) {
        let tip = tips[row] / 100
        let tip_on_subtotal = subtotal * tip
        let tip_on_tax = tax * tip
        switch (column) {
            case 0:
                return subtotal;
            case 1:
                return tax
            case 2:
                return subtotal + tax
            case  3:
                return tip_on_subtotal;
            case 4:
                return subtotal + tax + tip_on_subtotal
            case 5:
                return tip_on_tax;
            case 6:
                return subtotal + tax + tip_on_subtotal + tip_on_tax;
            default:
                return 0;
        }
    }

    draw_table(tip_table, tips, columns_text, get_element, (x: number) => x.toString() + "%", x => x, x => x.toFixed(2).toString(),
        (row: number) => (row % 2 == 0 ? "lightgreen" : "white"), always("lightyellow"), (row, col) => row % 2 == 0 ? "lightblue" : "white");
}

document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
        console.log('Enter was pressed anywhere');
        draw()
    }
});