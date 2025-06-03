document.addEventListener('DOMContentLoaded', () => {

    // get and use speed from memory 
    function setSpeedFromMem() {
        chrome.storage.local.get(['speed'], (result) => {
            const speed = result.speed || 1.0;
            slider.value = speed;
            setSpeed(speed);
        });
    }
    setSpeedFromMem(); // when ext is opened

    // Tabs
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedTab = tab.getAttribute('data-tab');

            // remove all active classes
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));

            // add active class to clicked tab
            tab.classList.add('active');
            document.getElementById(selectedTab).classList.add('active');
        });
    });

    // input - prevent invalid characters
    const restrictInput = (e) => {
        if (e.ctrlKey || e.metaKey || ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
            return;
        }
        const validCharacters = /^\d+(\.\d{0,2})?$/; // only numbers with at most 2 decimals
        const value = e.target.value + e.key;

        if (!validCharacters.test(value)) {
            e.preventDefault();
        }
    };

    // input - set event listeners
    ['oldPrice', 'newPrice', 'price', 'weightOrVolume'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', restrictInput);
    });

    // Speed controller functionality
    const slider = document.getElementById('speedSlider');
    const display = document.getElementById("speedDisplay");

    // Speed - set speed of tab
    const setSpeed = (value) => {
        const speed = calculateSpeed(value);
        display.textContent = `${speed.toFixed(2)}x`;
        chrome.storage.local.set({ speed: value });

        runScriptOnActiveTab(setVideoSpeed, [speed, true])
    };

    // Speed - stop speed loop
    function clearSpeedModifications() {
        slider.value = 50;
        display.textContent = `1.00x`;
        chrome.storage.local.set({ speed: 50 });

        runScriptOnActiveTab(setVideoSpeed, [1, false])
    }


    // run on the active tab
    function runScriptOnActiveTab(func, args = []) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || tab.url.startsWith("chrome://")) return;

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func,
                args
            });
        });
    }

    function setVideoSpeed(speed, enforce) {
        if (window.__speedIntervalId) {
            clearInterval(window.__speedIntervalId);
            window.__speedIntervalId = null;
        }
        if (!enforce) {
            document.querySelectorAll("video").forEach(video => {
                video.playbackRate = 1;
                video.defaultPlaybackRate = 1;
            });
        } else {
            window.__speedIntervalId = setInterval(() => {
                document.querySelectorAll("video").forEach(video => {
                    video.playbackRate = speed;
                    video.defaultPlaybackRate = speed;
                });
            }, 200);
        }
    }


    // Speed - percent to speed - exponential to linear to exponential (continuous) 
    const calculateSpeed = (x) => {
        if (x < 25) { //  (x=0, y=0.1), (x=25, y=0.25)
            return 0.1 * Math.pow(2.5, x / 25);
        } else if (x <= 75) { // (x=50, y=1.0), (x=75, y=1.75)
            return 0.03 * x - 0.5;
        } else { // (x=100, y=10)
            return 1.75 * Math.pow(10 / 1.75, (x - 75) / 25);
        }
    };

    // Speed - speed to percent
    const calculateSlider = (speed) => {
        if (speed <= 0.25) {
            return 25 * (Math.log(speed / 0.1) / Math.log(2.5));
        } else if (speed <= 1.75) {
            return (speed + 0.5) / 0.03;
        } else {
            return 75 + 25 * (Math.log(speed / 1.75) / Math.log(10 / 1.75));
        }
    };

    // Speed - silder listener
    slider.addEventListener('input', () => {
        setSpeed(slider.value);
    });

    // Speed - quick select
    ['speed0.5x', 'speed1x', 'speed2x'].forEach(id => {
        document.getElementById(id).addEventListener('click', function () {
            const speed_value = parseFloat(this.innerHTML);
            const speed_percent = calculateSlider(speed_value);
            slider.value = speed_percent;
            setSpeed(speed_percent);
        });
    });

    // Speed - turn off
    document.getElementById('turnOffSpeed').addEventListener('click', clearSpeedModifications);

    // Instant Calculator functionality
    const calcInput = document.getElementById('calcInput');
    const calcResult = document.getElementById('calcResult');
    const copyButton = document.getElementById('copyButton');

    calcInput.addEventListener('input', () => {
        let expression = calcInput.value;

        try {
            if (expression.trim()) {
                const bracketsExpr = parseBrackets(expression);
                const result = math.evaluate(bracketsExpr);

                if (typeof result === 'number') {
                    const fracResult = math.fraction(result);
                    calcResult.innerText = `${result}`;

                    if (fracResult.d != 1) {
                        calcResult.innerText += ` (${fracResult.n}/${fracResult.d})`;
                    }
                } else if (typeof result === 'function') {
                    calcResult.innerText = `supported`;
                } else {
                    calcResult.innerText = result;
                }
            } else {
                calcResult.innerText = '..';
            }
        } catch {
            calcResult.innerText = '...';
        }
    });

    // Calculator - parse brackets functionality
    function parseBrackets(expression) {
        const stack = [];
        const pairs = { '(': ')', '[': ']', '{': '}' };
        const openingBrackets = Object.keys(pairs);
        const closingBrackets = Object.values(pairs);

        for (const ch of expression) {
            if (openingBrackets.includes(ch)) {
                stack.push(ch);
            } else if (closingBrackets.includes(ch)) {
                if (stack.length !== 0) {
                    const lastOpen = stack[stack.length - 1];
                    if (pairs[lastOpen] === ch) {
                        stack.pop();
                    }
                }
            }
        }
        while (stack.length > 0) {
            expression += pairs[stack.pop()];
        }
        return expression.replace(/[\[\{]/g, '(').replace(/[\]\}]/g, ')');
    }

    // Calculator - auto close brackets select functionality
    calcInput.addEventListener('keydown', (e) => {
        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}'
        };

        if (pairs[e.key] && !e.ctrlKey) {
            const start = calcInput.selectionStart;
            const end = calcInput.selectionEnd;

            if (start !== end) {
                e.preventDefault();

                const before = calcInput.value.slice(0, start);
                const selected = calcInput.value.slice(start, end);
                const after = calcInput.value.slice(end);

                calcInput.value = before + e.key + selected + pairs[e.key] + after;

                calcInput.selectionStart = start + e.key.length + selected.length + pairs[e.key].length;
                calcInput.selectionEnd = calcInput.selectionStart;
            }
        }
    });

    // Calculator - copy to clipboard functionality
    copyButton.addEventListener('click', () => {
        const resultText = calcResult.innerText;
        const endIndexBracket = resultText.indexOf(' (');
        let textToCopy = resultText;
        if (endIndexBracket !== -1) {
            textToCopy = resultText.substring(0, endIndexBracket);
        }
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.innerText = 'Copied!';
            setTimeout(() => {
                copyButton.innerText = 'Copy';
            }, 500);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy: ', err.message);
        });
    });

    // Discount Calculator functionality
    document.getElementById('calculateDiscount').addEventListener('click', () => {
        const oldPrice = parseFloat(document.getElementById('oldPrice').value);
        const newPrice = parseFloat(document.getElementById('newPrice').value);

        const discount = ((oldPrice - newPrice) / oldPrice) * 100;
        document.getElementById('resultDiscount').innerText = `Discount: ${discount.toFixed(2)}%`;
    });

    // Discount - if Enter
    document.getElementById("oldPrice").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("newPrice").focus();
        }
    });

    document.getElementById("newPrice").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("calculateDiscount").click();
        }
    });

    // Price Conversion to $/100g or $/100ml
    document.getElementById('convertPrice').addEventListener('click', () => {
        const priceValue = parseFloat(document.getElementById('price').value);
        const weightOrVolumeValue = parseFloat(document.getElementById('weightOrVolume').value);

        const pricePer100 = (priceValue / weightOrVolumeValue) * 100;
        document.getElementById('resultPrice').innerText = `$${pricePer100.toFixed(2)} per 100g/ml`;
    });

    // Price - if Enter
    document.getElementById("price").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("weightOrVolume").focus();
        }
    });

    document.getElementById("weightOrVolume").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("convertPrice").click();
        }
    });
});