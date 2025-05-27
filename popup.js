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
    const restrictInput = (event) => {
        if (['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(event.key)) {
            return; 
        }
        const validCharacters = /^\d+(\.\d{0,2})?$/; // only numbers with atmost 2 decimals
        const value = event.target.value + event.key; 

        if (!validCharacters.test(value)) {
            event.preventDefault(); 
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

    // Discount Calculator functionality
    document.getElementById('calculateDiscount').addEventListener('click', function () {
        const oldPrice = parseFloat(document.getElementById('oldPrice').value);
        const newPrice = parseFloat(document.getElementById('newPrice').value);

        const discount = ((oldPrice - newPrice) / oldPrice) * 100;
        document.getElementById('resultDiscount').innerText = `Discount: ${discount.toFixed(2)}%`;

    });

    // Weight conversion functionality
    document.getElementById('convertWeight').addEventListener('click', function () {
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

    // Price conversion to $/100g or $/100ml
    document.getElementById('convertPrice').addEventListener('click', function () {
        const priceValue = parseFloat(document.getElementById('price').value);
        const weightOrVolumeValue = parseFloat(document.getElementById('weightOrVolume').value);

        const pricePer100 = (priceValue / weightOrVolumeValue) * 100;
        document.getElementById('resultPrice').innerText = `$${pricePer100.toFixed(2)} per 100g/ml`;

    });
});