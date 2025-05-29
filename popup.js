document.addEventListener('DOMContentLoaded', () => {
    // default tab - Discount Calculator
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedTab = tab.getAttribute('data-tab');

            // remove all active class 
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));

            // active class to clicked
            tab.classList.add('active');
            document.getElementById(selectedTab).classList.add('active');
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
        'weightInput',
        'price',
        'weightOrVolume'
    ];

    inputFields.forEach(id => {
        document.getElementById(id).addEventListener('keydown', restrictInput);
    });

    // Instant Calculator functionality
    const calcInput = document.getElementById('calcInput');
    const calcResult = document.getElementById('calcResult');

    calcInput.addEventListener('input', () => {
        let expression = calcInput.value;

        try {
            if (expression.trim()) {
                const bracketsExpr = parseBrackets(expression);
                const result = math.evaluate(bracketsExpr);

                if (typeof result === 'number') {
                    const fracResult = math.fraction(result);
                    const resultTxt = math.abs(result) < 1e-10 ? 0 : math.round(result * 1e10) / 1e10
                    calcResult.innerText = `${resultTxt}`;

                    if (fracResult.d != 1) {
                        calcResult.innerText += ` (${fracResult.n}/${fracResult.d})`;
                    }
                } else {
                    calcResult.innerText = '.';
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

                calcInput.selectionStart = start + open.length + selected.length + close.length;
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

    // Weight Conversion functionality
    document.getElementById('convertWeight').addEventListener('click', () => {
        const weightInput = parseFloat(document.getElementById('weightInput').value);
        const unit = document.getElementById('unitSelect').value;

        let result;

        if (unit === 'lbs') {
            result = weightInput * 0.453592; // lbs to kg
            document.getElementById('resultWeight').innerText = `${weightInput} lbs = ${result.toFixed(2)} kg`;
        } else {
            result = weightInput / 0.453592; // kg to lbs
            document.getElementById('resultWeight').innerText = `${weightInput} kg = ${result.toFixed(2)} lbs`;
        }

    });

    // Price Conversion to $/100g or $/100ml
    document.getElementById('convertPrice').addEventListener('click', () => {
        const priceValue = parseFloat(document.getElementById('price').value);
        const weightOrVolumeValue = parseFloat(document.getElementById('weightOrVolume').value);

        const pricePer100 = (priceValue / weightOrVolumeValue) * 100;
        document.getElementById('resultPrice').innerText = `$${pricePer100.toFixed(2)} per 100g/ml`;

    });
});