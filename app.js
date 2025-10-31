// IMPORTANT: Replace with your actual deployed serverless function URL
const API_BASE_URL = 'https://your-vercel-project-name.vercel.app/api'; 

const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const monitorBtn = document.getElementById('monitorBtn');
const previewContent = document.getElementById('preview-content');
const selectorDisplay = document.getElementById('selector-display');

let currentSelector = null;
let lastHighlighted = null;

// Fetches the page HTML from our proxy to get around CORS/X-Frame-Options
fetchBtn.addEventListener('click', async () => {
    const url = urlInput.value;
    if (!url) {
        alert('Enter a URL first, comrade.');
        return;
    }
    previewContent.innerHTML = '<h2>Fetching page... please wait.</h2>';
    try {
        const response = await fetch(`${API_BASE_URL}/fetch?url=${encodeURIComponent(url)}`);
        const { html } = await response.json();
        
        // Sanitize and inject HTML
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Re-base relative links to make them work from our page
        const base = document.createElement('base');
        base.href = url;
        doc.head.prepend(base);

        previewContent.innerHTML = new XMLSerializer().serializeToString(doc);

    } catch (err) {
        previewContent.innerHTML = `<h2>Error fetching page: ${err.message}</h2>`;
    }
});

// Interactive element selection logic
document.getElementById('preview-overlay').addEventListener('mousemove', (e) => {
    // We get the element from the "real" content div behind the overlay
    const x = e.clientX - previewContent.getBoundingClientRect().left;
    const y = e.clientY - previewContent.getBoundingClientRect().top + previewContent.scrollTop;
    
    // Temporarily hide the overlay to get the element underneath
    e.target.style.display = 'none';
    const element = document.elementFromPoint(x, y);
    e.target.style.display = 'block';

    if (element && element !== lastHighlighted) {
        if(lastHighlighted) lastHighlighted.classList.remove('highlight-element-on-hover');
        element.classList.add('highlight-element-on-hover');
        lastHighlighted = element;
    }
});

document.getElementById('preview-overlay').addEventListener('click', (e) => {
    if(lastHighlighted) {
        currentSelector = getCssSelector(lastHighlighted);
        selectorDisplay.textContent = currentSelector;
        alert(`Selector Captured: ${currentSelector}`);
    }
});

monitorBtn.addEventListener('click', async () => {
    const url = urlInput.value;
    if(!url || !currentSelector) {
        alert('You must fetch a page and select an element first.');
        return;
    }
    
    const webhook = prompt("Enter your Discord Webhook URL for notifications:");
    if (!webhook) {
        alert("Monitoring aborted. A webhook is required for alerts.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/start-monitoring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, selector: currentSelector, webhookUrl: webhook })
        });
        const result = await response.json();
        alert(result.message);
    } catch(err) {
        alert(`Error: ${err.message}`);
    }
});


// Function to generate a unique CSS selector for an element
function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + el.id;
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while ((sib = sib.previousElementSibling)) {
                if (sib.nodeName.toLowerCase() === selector) nth++;
            }
            if (nth !== 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(' > ');
}
