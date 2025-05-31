document.addEventListener('DOMContentLoaded', () => {
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

            if (selectedTab === 'controller') { // access storage only for speed tab
                chrome.storage.local.get(['speed'], (result) => {
                    const speed = result.speed || 1.0;
                    slider.value = speed;
                    setSpeed(speed);
                });
            }
        });
    });

    // prevent invalid characters
    const restrictInput = (e) => {
        if (['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) {
            return;
        }
        const validCharacters = /^\d+(\.\d{0,2})?$/; // only numbers with at most 2 decimals
        const value = e.target.value + e.key;

        if (!validCharacters.test(value)) {
            e.preventDefault();
        }
    };

    // keydown event listener
    const inputFields = [
        'oldPrice',
        'newPrice',
        'price',
        'weightOrVolume'
    ];

    // set event listeners
    inputFields.forEach(id => {
        document.getElementById(id).addEventListener('keydown', restrictInput);
    });

    // Speed controller functionality
    const slider = document.getElementById('speedSlider');
    const display = document.getElementById("speedDisplay");

    const setSpeed = (value) => {
        const speed = calculateSpeed(value);
        display.textContent = `${speed.toFixed(2)}x`;
        chrome.storage.local.set({ speed: value });

        // speed up all videos on the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                args: [speed],
                func: (speed) => {
                    if (window.__speedIntervalId) clearInterval(window.__speedIntervalId);
                    window.__speedIntervalId = setInterval(() => {
                        document.querySelectorAll("video").forEach(video => {
                            video.playbackRate = speed;
                            video.defaultPlaybackRate = speed;
                        });
                    }, 200);
                }
            });
        });
    };

    // Speed - exponential to linear to exponential (continuous)
    const calculateSpeed = (x) => {
        if (x < 25) { //  (x=0, y=0.1), (x=25, y=0.25)
            return 0.1 * Math.pow(2.5, x / 25);
        } else if (x <= 75) { // (x=50, y=1.0)
            return 0.03 * x - 0.5;
        } else { // (x=100, y=10)
            return 1.75 * Math.pow(10 / 1.75, (x - 75) / 25);
        }
    };

    // Speed - silder listener
    slider.addEventListener('input', () => {
        setSpeed(slider.value);
    });

    // Speed - reset
    document.getElementById('resetSpeed').addEventListener('click', () => {
        slider.value = 50;
        setSpeed(50);
    });

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
            alert('Failed to copy: ', err);
        });
    });

    // Discount Calculator functionality
    document.getElementById('calculateDiscount').addEventListener('click', () => {
        const oldPrice = parseFloat(document.getElementById('oldPrice').value);
        const newPrice = parseFloat(document.getElementById('newPrice').value);

        const discount = ((oldPrice - newPrice) / oldPrice) * 100;
        document.getElementById('resultDiscount').innerText = `Discount: ${discount.toFixed(2)}%`;
    });

    // Price Conversion to $/100g or $/100ml
    document.getElementById('convertPrice').addEventListener('click', () => {
        const priceValue = parseFloat(document.getElementById('price').value);
        const weightOrVolumeValue = parseFloat(document.getElementById('weightOrVolume').value);

        const pricePer100 = (priceValue / weightOrVolumeValue) * 100;
        document.getElementById('resultPrice').innerText = `$${pricePer100.toFixed(2)} per 100g/ml`;
    });
});