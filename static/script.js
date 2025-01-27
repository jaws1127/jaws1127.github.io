// https://uipath.tistory.com/133

var selectedLocation = '';
var selectedGameNumber = '';
var isJapan = false;
const JapanStadium = ["나카야마","츄코","도쿄","교토","고쿠라"];

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function selectLocation(location) {
    selectedLocation = location;

    const buttons = document.querySelectorAll('.location-buttons button');
    buttons.forEach(button => button.classList.remove('selected'));
    const selectedButton = Array.from(buttons).find(button => button.innerText === location);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }

    isJapan = JapanStadium.includes(location) ? true : false;
}

function selectGameNumber(number) {
    selectedGameNumber = number;
    const buttons = document.querySelectorAll('.game-number-buttons button');
    buttons.forEach(button => button.classList.remove('selected'));
    const selectedButton = Array.from(buttons).find(button => button.innerText == number);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
}


function parseCharacter(value) {
    return value.replace(/①/g, '1')
    .replace(/②/g, '2')
    .replace(/③/g, '3')
    .replace(/④/g, '4')
    .replace(/⑤/g, '5')
    .replace(/⑥/g, '6')
    .replace(/⑦/g, '7')
    .replace(/⑧/g, '8')
    .replace(/⑨/g, '9')
    .replace(/⑩/g, '10')
    .replace(/⑪/g, '11')
    .replace(/⑫/g, '12')
    .replace(/⑬/g, '13')
    .replace(/⑭/g, '14')
    .replace(/⑮/g, '15');
}

function parsePair(pair) {
    let values = pair.split('');
    
    let first = parseCharacter(values[0]);
    let second = parseCharacter(values[1]);
    return first + "-" + second
}

function parseOddsInput(input) {
    return input.split('\n').reduce((acc, line) => {
        const parts = line.split(' ');
        for(var i = 0; i < parts.length; i=i+2){
            acc[parsePair(parts[i])] = Number(parts[i+1]);
        }
        // console.log("Acc: ", acc)
        return acc;
    }, {});
}

function parseJapanOddsInput(input) {
    return input.split(/\s+/).reduce((acc, item, index, array) => {
        if ((index + 1) % 3 === 0) { // Every third item is odds
            const pair = array[index - 1]; // The second item in the triplet
            const odds = Number(item); // The current item (odds)
            acc[pair] = odds;
        }
        return acc;
    }, {});
}

function parseOddsInputUnified(input) {
    return isJapan ? parseJapanOddsInput(input) : parseOddsInput(input);
}

function calculateOddsChange() {
    const fifteenMinInput = document.getElementById('fifteen-min').value;
    const fiveMinInput = document.getElementById('five-min').value;
    const date = document.getElementById('date').value;
    document.getElementById('match-info').textContent = `(날짜: ${date}, 위치: ${selectedLocation}, 경기번호: ${selectedGameNumber})`;

    const fifteenMinOdds = parseOddsInputUnified(fifteenMinInput);
    const fiveMinOdds = parseOddsInputUnified(fiveMinInput);

    const allPairs = new Set([...Object.keys(fifteenMinOdds), ...Object.keys(fiveMinOdds)]);
    const changes = Array.from(allPairs).map(pair => {
        const fifteenMinRate = fifteenMinOdds[pair] || '-';
        const fiveMinRate = fiveMinOdds[pair] || '-';
        const change = (fifteenMinRate !== '-' && fiveMinRate !== '-')
            ? (((fifteenMinRate - fiveMinRate) / fifteenMinRate) * 100).toFixed(2)
            : '-';
        return { pair, fifteenMinRate, fiveMinRate, change };
    });

    changes.sort((a, b) => {
        if (a.change === '-' && b.change === '-') return 0;
        if (a.change === '-') return 1; 
        if (b.change === '-') return -1;
        return b.change - a.change;
    });

    const tableBody = document.getElementById('result-table').querySelector('tbody');
    tableBody.innerHTML = '';

    changes.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.pair}</td>
            <td>${item.fifteenMinRate}</td>
            <td>${item.fiveMinRate}</td>
            <td>${item.change !== '-' ? item.change + '%' : '-'}</td>
        `;
        tableBody.appendChild(row);
    });
}

async function sendData() {
    const date = document.getElementById('date').value;
    const fifteenMinInput = document.getElementById('fifteen-min').value;
    const fiveMinInput = document.getElementById('five-min').value;

    let missingFields = [];

    if (!date) missingFields.push('날짜');
    if (!selectedLocation) missingFields.push('경기 위치');
    if (!selectedGameNumber) missingFields.push('경기 번호');
    if (!fifteenMinInput) missingFields.push('15분전 데이터');
    if (!fiveMinInput) missingFields.push('5분전 데이터');

    if (missingFields.length > 0) {
        alert(`누락된 필드: ${missingFields.join(', ')}`);
        return;
    }

    const fifteenMinOdds = parseOddsInputUnified(fifteenMinInput);
    const fiveMinOdds = parseOddsInputUnified(fiveMinInput);

    const dataToSend = [];

    for (const pair in fifteenMinOdds) {
        if (fiveMinOdds[pair]) {
            dataToSend.push({
                isJapan,
                date,
                location: selectedLocation,
                gameNumber: selectedGameNumber,
                pair,
                fifteenMinRate: fifteenMinOdds[pair],
                fiveMinRate: fiveMinOdds[pair]
            });
        }
    }

    try {
        const response = await fetch('http://localhost:5000/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });

        const result = await response.json();
        document.getElementById('responseMessage').textContent = result.message;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('responseMessage').textContent = 'Failed to submit data.';
    }
}

function init(){
    document.addEventListener('DOMContentLoaded', setTodayDate);
}

init();

/*
①③ 7.8
①⑧ 8.6
①⑩ 10.2
③⑧ 10.7
③⑩ 11.3
①⑥ 12.9

①③ 3.8
①⑧ 20.6
①⑩ 2.2
③⑧ 7.7
⑧⑩ 8.1
③⑥ 9.2
*/

/*
1	1-15	6.8
2	1-6	13.0
3	6-15	15.9
4	1-8	16.2
5	8-15	16.4

1	1-14	6.8
2	6-15	28.0
3	3-6	15
4	1-4	12.2
5	8-15	12.4
*/
