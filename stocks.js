import Canvas from "canvas";

const stockApiKey = "c8oe5maad3iatn99i470";

const stockHistoryLength = 24;
const stockUpdatesPerHour = 4;

export const stockNames = ["CORN", "BTC"];
export let stockData = new Map();


export function init() {
    stockNames.forEach(name => {
        stockData.set(name, []);
    })
    setInterval(() => {
        getStockInfo();
    }, 3600000 / stockUpdatesPerHour);
}

function updateStockHistory(stockName, value) {
    let hist = stockData.get(stockName);
    if (hist.length > stockHistoryLength)
        hist.shift();
    hist.push(value);
}

export function generateGraph(stockName) {
    let stockHistory = stockData.get(stockName);
    let can = Canvas.createCanvas(600, 300);
    let ctx = can.getContext("2d");
    ctx.fillStyle = "#32353B";
    ctx.fillRect(0, 0, 600, 300);
    ctx.strokeStyle = "#18C3B2";
    ctx.lineWidth = 3;

    let min = Math.min(...stockHistory);
    let max = Math.max(...stockHistory);
    console.log(stockHistory);

    //ctx.moveTo(600, 300 - stockHistory[stockHistory.length - 1]);
    for (let i = 0; i < stockHistory.length; i++) {
        let y = (stockHistory[stockHistory.length - i - 1] - min) / (max - min) * 250 + 25;
        if (min == max) y = 150;
        ctx.lineTo(600 - i * (600 / stockHistoryLength), 300 - y);
    }
    ctx.stroke();
    return can.createPNGStream();
}

function stockPrice(stockName) {
    return stockData.get(stockName)[stockData.get(stockName).length - 1];
}


function getStockInfo() {
    for (let i = 0; i < stockNames.length; i++) {
        const stock = stockNames[i];
        axios.get(`https://finnhub.io/api/v1/quote?symbol=${stock}&token=${stockApiKey}`).then((res) => {
            updateStockHistory(stock, res.data.c);
            if (i == stockNames.length - 1) {
                console.log("Updated stocks.");
            }
        });
    }
}