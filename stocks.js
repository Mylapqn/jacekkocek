import Canvas from "canvas";
import axios from "axios";
import * as Database from "./database.js";
import * as Matoshi from "./matoshi.js";
import * as Utilities from "./utilities.js";
import * as Main from "./main.js";

const stockApiKey = "c8oe5maad3iatn99i470";

const stockHistoryHours = 24;
const stockUpdatesPerHour = 4;

const resolutions = {
    m1: 1,
    m5: 5,
    m15: 15,
    m30: 30,
    hour: 60,
    day: "D",
    week: "W",
    month: "M",
}

const stockAliases = new Map([
    ["BTC", "BTC-USD"],
    ["CORN", "CORN"],
])
export const stockNames = Array.from(stockAliases.keys());
export let stockData = new Map();


export function init() {
    stockNames.forEach(name => {
        stockData.set(name, []);
    })
    setInterval(() => {
        getStockInfo();
    }, 3600000 / stockUpdatesPerHour);
    getStockInfo();
}

export function generateGraph(stockName) {
    const width = 600;
    const height = 300;
    const padding = 5;
    const axisOffetX = 50;
    const axisOffsetY = 25;
    const graphWidth = width - axisOffetX;
    const graphHeight = height - axisOffsetY*2;
    let stockHistory = stockData.get(stockName);
    let can = Canvas.createCanvas(width, height);
    let ctx = can.getContext("2d");
    ctx.fillStyle = "#32353B";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#18C3B2";
    ctx.lineWidth = 3;

    let min = Math.min(...stockHistory);
    let max = Math.max(...stockHistory);
    console.log(stockHistory);

    //ctx.moveTo(600, 300 - stockHistory[stockHistory.length - 1]);
    for (let i = 0; i < stockHistory.length; i++) {
        let y = (stockHistory[stockHistory.length - i - 1] - min) / (max - min) * graphHeight + axisOffsetY;
        if (min == max) y = graphHeight / 2 + axisOffsetY;
        ctx.lineTo(width - i * (graphWidth / (stockHistory.length-1)), height - y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#5E5E5E";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(axisOffetX, 0);
    ctx.lineTo(axisOffetX, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height - axisOffsetY);
    ctx.lineTo(width, height - axisOffsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, axisOffsetY);
    ctx.lineTo(width, axisOffsetY);
    ctx.stroke();


    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(min.toPrecision(3), axisOffetX + 5, height - padding-axisOffsetY);
    ctx.textBaseline = "top";
    ctx.fillText(max.toPrecision(3), axisOffetX + 5, axisOffsetY+5);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(Utilities.dateString(new Date()), width - padding, height - padding);
    ctx.textAlign = "left";
    ctx.fillText(Utilities.dateString(new Date(Date.now() - stockHistoryHours * 3600000)), axisOffetX + 5, height - padding);
    return can.createPNGStream();
}

export function currentPrice(stockName) {
    return stockData.get(stockName)[stockData.get(stockName).length - 1];
}

function getStockInfo() {
    console.log("Updating stocks...");
    let info = {};
    let to = Main.nowSeconds();
    let from = to - stockHistoryHours*3600;
    for (let i = 0; i < stockNames.length; i++) {
        const stock = stockNames[i];
        console.log(stock);
        console.log(`https://finnhub.io/api/v1/stock/candle?symbol=${stockAliases.get(stock)}&resolution=${resolutions.m15}&from=${from}&to=${to}&token=${stockApiKey}`);
        axios.get(`https://finnhub.io/api/v1/stock/candle?symbol=${stockAliases.get(stock)}&resolution=${resolutions.m15}&from=${from}&to=${to}&token=${stockApiKey}`).then((res) => {
            console.log(stock + " Length: "+res.data.c.length);
            info[stock] = res.data.c;
            stockData.set(stock,res.data.c);
            if (i == stockNames.length - 1) {
                console.log("Updated all stocks.");
            }
        });
    }
}


export async function buy(user, stock, amount) {
    if (Matoshi.cost(user, amount)) {
        let data = await Database.getUser(user);
        let currentStock = data.wallets.get(stock);
        currentStock += amount / currentPrice(stock);
        data.wallets.set(stock, currentStock);
        await Database.setUser(data);
        return true;
    }
    else return false;
}

export async function sell(user, stock, amount) {
    let data = await Database.getUser(user);
    let currentStock = data.wallets.get(stock);
    if (currentStock >= amount / currentPrice(stock)) {
        currentStock -= amount / currentPrice(stock);
        Matoshi.modify(user, amount);
        data.wallets.set(stock, currentStock);
        await Database.setUser(data);
        return true;
    }
    else return false;
}

export async function balance(user, stock) {
    let data = await Database.getUser(user);
    let currentStock = data.wallets.get(stock);
    return currentStock;
}

