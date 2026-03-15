"use strict";
let dateTime = new Date();
let today = dateTime.getDate();
let lastDayOfMonth = new Date(dateTime.getFullYear(), dateTime.getMonth() + 1, 0).getDate();
dateTime.setDate(1);
let table_id = "calendar_current_month_table";
let table = (document.getElementById(table_id));
//table.setAttribute("border","1")
let thead = table.createTHead();
let tbody = table.createTBody();
table.setAttribute("borderColor", "black");
let options = { month: 'long' };
let month_cell = thead.insertRow(0).insertCell(0);
month_cell.textContent = dateTime.toLocaleString("en-US", options);
month_cell.setAttribute("align", "center");
month_cell.setAttribute("colspan", "5");
table.setAttribute("bgColor", "#9B8764");
for (let i = 1; i <= 7; i++) {
    dateTime.setDate(i);
    let split_cell = tbody.insertRow(-1).insertCell(0);
    split_cell.setAttribute("align", "center");
    split_cell.setAttribute("colspan", "5");
    split_cell.setAttribute("bgColor", "white");
    let weekday_cell = tbody.insertRow(-1).insertCell(0);
    let options = { weekday: 'long' };
    weekday_cell.textContent = dateTime.toLocaleString("en-US", options);
    weekday_cell.setAttribute("align", "center");
    weekday_cell.setAttribute("colspan", "5");
    let date_row = tbody.insertRow(-1);
    for (let j = i; j <= lastDayOfMonth; j += 7) {
        let cell = date_row.insertCell(-1);
        cell.setAttribute("width", "40");
        if (j <= lastDayOfMonth) {
            cell.innerText = j.toString();
        }
        if (j == today) {
            cell.style.color = "9B8764";
            cell.setAttribute("bgColor", "black");
        }
        else {
        }
        cell.setAttribute("align", "center");
    }
}
let year = new Date().getFullYear();
function update_year(delta) {
    year += delta;
}
function get_image_url(year, month) {
    let dt = new Date(year, month - 1, 1);
    let month_str = month.toString();
    if (month == 2) {
        let lastDayOfMonth = new Date(year, 2, 0).getDate();
        month_str = `2-${lastDayOfMonth}`;
    }
    let weekday = 1 + ((6 + dt.getDay()) % 7);
    return `https://github.com/Lst0621/image/blob/master/calendar/calendar-${month_str}_${weekday}.jpg?raw=true`;
}
function update_image_by_name(image_name, image_url) {
    console.log(image_name, image_url);
    let image_element = document.getElementById(image_name);
    image_element.src = image_url;
}
function update_images() {
    let title = document.getElementById("calender_title");
    title.textContent = `Calendar ${year}`;
    for (let month = 1; month <= 12; month++) {
        update_image_by_name(`calendar${month}`, get_image_url(year, month));
    }
}
update_image_by_name(`calendar0`, get_image_url(year, dateTime.getMonth() + 1));
update_images();
