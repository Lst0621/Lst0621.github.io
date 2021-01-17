let dateTime = new Date()
let today: number = dateTime.getDate()
let lastDayOfMonth: number = new Date(dateTime.getFullYear(), dateTime.getMonth() + 1, 0).getDate();
dateTime.setDate(1)

let table_id: string = "demo"

let table: HTMLTableElement = (document.getElementById(table_id)) as HTMLTableElement;
//table.setAttribute("border","1")
let thead: HTMLTableSectionElement = table.createTHead();
let tbody: HTMLTableSectionElement = table.createTBody();
let options: Intl.DateTimeFormatOptions = {month: 'long'};
let month_cell = thead.insertRow(0).insertCell(0);
month_cell.textContent = dateTime.toLocaleString("en-US", options)
month_cell.setAttribute("align","center")
month_cell.setAttribute("colspan","5")

for (let i = 1; i <= 7; i++) {
    dateTime.setDate(i);
    let weekday_cell = tbody.insertRow(-1).insertCell(0);
    let options: Intl.DateTimeFormatOptions = {weekday: 'long'};
    weekday_cell.textContent = dateTime.toLocaleString("en-US", options)
    weekday_cell.setAttribute("align","center")
    weekday_cell.setAttribute("colspan","5")
    let date_row = tbody.insertRow(-1);
    for (let j = i; j <= lastDayOfMonth; j += 7) {
        let cell = date_row.insertCell(-1);
        cell.setAttribute("width","40")
        cell.innerText = j.toString()
        if(j==today){
            cell.setAttribute("bgColor","red")
        }
        cell.setAttribute("align","center")
    }
}

let year: number = new Date().getFullYear()

function update_year(delta : number){
    year += delta
}

function get_image_url(year: number, month: number) {
    let dt: Date = new Date(year, month - 1, 1)

    let month_str: string = month.toString()
    if (month == 2) {
        let lastDayOfMonth: number = new Date(year, 2, 0).getDate();
        month_str = `2-${lastDayOfMonth}`
    }

    let weekday: number = 1 + ((6 + dt.getDay()) % 7)

    return `https://github.com/Lst0621/image/blob/master/calendar/calendar-${month_str}_${weekday}.jpg?raw=true`
}

function update_image_by_name(image_name: string, image_url: string) {
    let image_element: HTMLImageElement = (document.getElementById(image_name) as HTMLImageElement);
    image_element.src = image_url;
}

function update_images() {
    let title: HTMLHeadElement = (document.getElementById("calender_title") as HTMLHeadElement);
    title.textContent = `Calendar ${year}`
    for (let month = 1; month <= 12; month++) {
        update_image_by_name(`calendar${month}`, get_image_url(year, month));
    }
}

update_images()
