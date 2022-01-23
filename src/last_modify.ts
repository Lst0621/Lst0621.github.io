function get_filename_ts_from_text(text: string): { [key: string]: string } {
    let lines = text.split('\n')
    console.log(lines.length)
    let filename_ts: { [key: string]: string } = {}
    for (let line of lines) {
        if (line.length == 0) {
            continue
        }

        let parts: Array<string> = line.split(',')
        let fn: string = parts[0]
        let day: string = parts[1]
        filename_ts[fn] = day
    }

    return filename_ts
}

function fetch_last_modify_and_update_text(text: string, filenames: Array<string>, para_id: string) {
    let filename_ts: { [key: string]: string } = get_filename_ts_from_text(text)
    console.log(filename_ts)

    let last_modify_time: string = ""
    for (let fn of filenames) {
        if (fn in filename_ts) {
            let day: string = filename_ts[fn]
            console.log(fn, day)
            if (day > last_modify_time) {
                last_modify_time = day
            }
        }
    }

    if (last_modify_time == "") {
        console.log("No data found!")
        return
    }

    let last_modify_info: string = `This page was last modified on  ${last_modify_time}.`
    console.log(last_modify_info)

    let paragraphElement: HTMLParagraphElement = document.createElement("p");
    paragraphElement.appendChild(document.createTextNode(last_modify_info))
    document.getElementById(para_id).appendChild(paragraphElement);
}

function get_last_modify(filenames: Array<string>, para_id: string) {
    let req: XMLHttpRequest = new XMLHttpRequest()
    req.addEventListener("load", function () {
        fetch_last_modify_and_update_text(this.responseText, filenames, para_id)
    });
    let HISTORY_FILE_URL: string =
        "https://raw.githubusercontent.com/Lst0621/website_history/main/history.csv"
    req.open("GET", HISTORY_FILE_URL);
    req.send();
}
