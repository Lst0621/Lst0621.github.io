let dateTime = new Date()
let month = dateTime.getMonth()
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

