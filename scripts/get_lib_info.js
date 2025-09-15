// ==UserScript==
// @name         Get Amazon Info
// @namespace    http://tampermonkey.net/
// @version      2025-07-22
// @description  foo
// @author       You
// @match        https://www.amazon.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

function get_img() {
    let imgEl = document.querySelector('#imgTagWrapperId img');
    if (imgEl) {
        let hires = imgEl.dataset.oldHires;
        let src = imgEl.src;
        console.log("High-res (data-old-hires):", hires || "Not found");
        console.log("Displayed image src:", src);
        return hires;
    } else {
        // console.log("imgTagWrapperId not found on this page.");
    }
}

function extractISBN13() {
    const text = document.body.innerText;
    const regex = /ISBN-13[\u200E\u200F\s]*[:：][\u200E\u200F\s]*([\d\-]+)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function get_book_name() {
    const titleEl = document.getElementById("productTitle");
    if (titleEl) {
        const title = titleEl.textContent.trim();
        console.log("Book Title:", title);
        return title;
    } else {
        console.log("Book title not found.");
    }
}

function get_purchase_str() {
// Look for all spans that contain "Purchased on"
    const spans = document.querySelectorAll('span');

    let purchaseDate = null;

    for (const span of spans) {
        if (span.textContent.includes("Purchased on")) {
            purchaseDate = span.textContent.trim();
            break;
        }
    }

    console.log("Purchase Date:", purchaseDate);
    if (purchaseDate == null) {
        return "|";
    }
    return parsePurchaseDate(purchaseDate);
}

function parsePurchaseDate(purchaseText) {
    // Match format like "Purchased on July 18, 2025"
    const match = purchaseText.match(/Purchased on (\w+) \d{1,2}, (\d{4})/);
    if (!match) return null;

    const monthName = match[1];                // e.g. "July"
    const year = parseInt(match[2], 10);       // e.g. 2025
    const monthNumber = new Date(`${monthName} 1`).getMonth() + 1; // 1-based month

    return year + "|" + monthNumber;
}


function add_banner(text) {

// Create banner
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.padding = '10px';
    banner.style.backgroundColor = '#333';
    banner.style.color = '#fff';
    banner.style.textAlign = 'center';
    banner.style.fontSize = '16px';
    banner.style.zIndex = '10000';
    banner.style.display = 'flex';
    banner.style.justifyContent = 'center';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';

// Text to copy
    const textToCopy = text;
    const textElement = document.createElement('span');
    textElement.innerText = textToCopy;
    textElement.style.userSelect = 'all';

// Copy button
    const copyButton = document.createElement('button');
    copyButton.innerText = 'Copy';
    copyButton.style.padding = '5px 10px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.backgroundColor = '#ffcc00';
    copyButton.style.color = '#000';

// Copy functionality
    copyButton.onclick = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.innerText = 'Copied!';
            setTimeout(() => copyButton.innerText = 'Copy', 1500);
        }).catch(err => {
            copyButton.innerText = 'Error';
            console.error('Failed to copy:', err);
        });
    };

// Assemble banner
    banner.appendChild(textElement);
    banner.appendChild(copyButton);

// Add banner to document
    document.body.appendChild(banner);
    document.body.style.paddingTop = '50px';

}

let lib_data = get_book_name() + "|" + get_img() + "|" + extractISBN13() + "|" + get_purchase_str();
add_banner(lib_data)
