import Canvas from "canvas";
import axios from "axios";
import * as Database from "./database.js";
import * as Matoshi from "./matoshi.js";
import * as Utilities from "./utilities.js";
import * as Main from "./main.js";
import { stockPresets } from "./stockPresets.js";

const stockApiKey = "c8oe5maad3iatn99i470";

const stockHistoryHours = 24;
const stockUpdatesPerHour = 4;

const tradingFee = .005;

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

export let stockData = new Map();

export function init() {
    stockPresets.forEach(preset => {
        stockData.set(preset.id, []);
    })
    setInterval(() => {
        getStockData();
    }, 3600000 / stockUpdatesPerHour);
    getStockData();
}

export function findStockPreset(id) {
    for (let i = 0; i < stockPresets.length; i++) {
        const s = stockPresets[i];
        if (s.id == id) return s;
    }
    return false;
}

export function generateGraph(stockId) {
    const width = 600;
    const height = 300;
    const padding = 5;
    const axisOffetX = 0;
    const axisOffsetY = 25;
    const graphWidth = width - axisOffetX;
    const graphHeight = height - axisOffsetY * 2;
    let stockHistory = stockData.get(stockId);
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
        ctx.lineTo(width - i * (graphWidth / (stockHistory.length - 1)), height - y);
    }
    ctx.stroke();

    ctx.lineTo(axisOffetX, height);
    ctx.lineTo(width, height);
    let gradient = ctx.createLinearGradient(0, axisOffsetY, 0, height);
    gradient.addColorStop(0, "#27716D");
    gradient.addColorStop(1, "#32353B");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "#5E5E5E";
    ctx.lineWidth = 2;

    /*ctx.beginPath();
    ctx.moveTo(axisOffetX, 0);
    ctx.lineTo(axisOffetX, height);
    ctx.stroke();*/

    ctx.beginPath();
    ctx.moveTo(0, height - axisOffsetY);
    ctx.lineTo(width, height - axisOffsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, axisOffsetY);
    ctx.lineTo(width, axisOffsetY);
    ctx.stroke();


    let y = height - ((stockHistory[stockHistory.length - 1] - min) / (max - min) * graphHeight + axisOffsetY);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    ctx.font = "12px Arial";

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(formatCurrency(min), axisOffetX + 5, height - padding - axisOffsetY);
    ctx.textBaseline = "top";
    ctx.fillText(formatCurrency(max), axisOffetX + 5, axisOffsetY + 5);
    ctx.textBaseline = "top";
    ctx.fillText(formatCurrency(stockHistory[stockHistory.length - 1]), axisOffetX + 5, y + 5);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(Utilities.dateString(new Date()), width - padding, height - padding);
    ctx.textAlign = "left";
    ctx.fillText(Utilities.dateString(new Date(Date.now() - stockHistoryHours * 3600000)), axisOffetX + 5, height - padding);
    return can.createPNGStream();
}

function formatCurrency(num) {
    if (num >= 100) {
        return Math.round(num);
    }
    else {
        return num.toFixed(3);
    }
}

export function currentPrice(stockName) {
    if (stockData.has(stockName)) {
        let data = stockData.get(stockName);
        if (data.length >= 1)
            return data[data.length - 1];
    }
    return undefined;
}

function getStockData() {
    //console.log("Updating stocks...");
    //let info = {};
    let to = Main.nowSeconds();
    let from = to - stockHistoryHours * 3600;
    for (let i = 0; i < stockPresets.length; i++) {
        const stock = stockPresets[i];
        //console.log(stock.id);
        //console.log(`https://finnhub.io/api/v1/stock/candle?symbol=${stock.symbol}&resolution=${resolutions.m15}&from=${from}&to=${to}&token=${stockApiKey}`);
        axios.get(`https://finnhub.io/api/v1/stock/candle?symbol=${stock.symbol}&resolution=${resolutions.m15}&from=${from}&to=${to}&token=${stockApiKey}`).then((res) => {
            if (res.data.c && Utilities.isValid(res.data.c[0])) {
                //console.log(stock.id + " First: " + res.data.c[0]);
            }
            else {
                console.log(stock.id + " INVALID DATA");
            }
            //info[stock.id] = res.data.c;
            stockData.set(stock.id, res.data.c);
            if (i == stockPresets.length - 1) {
                console.log("Updated all stocks.");
            }
        }).catch(e => {
            console.error("Error updating stocks (" + stock.symbol + "): " + e.response.status + " " + e.response.statusText + " on " + e.config.url + " " + e.response.headers.date);
        });
    }
}

export function list() {
    let str = "Available stocks:\n"
    stockPresets.forEach(stock => {
        str += stock.name + " (" + stock.id + ") - Current price: " + formatCurrency(currentPrice(stock.id)) + "₥\n"
    });
    return str;
}


export async function buy(user, stock, amount) {
    let price = currentPrice(stock);
    if (Utilities.isValid(price)) {
        if (Matoshi.pay(user, Main.client.user.id, amount, 0)) {
            let data = await Database.getUser(user);
            let currentStock = data.wallets.get(stock) || 0;
            currentStock += amount * (1 - tradingFee) / price;
            data.wallets.set(stock, currentStock);
            await Database.setUser(data);
            return true;
        }
        else return false;
    }
    else return false;
}

export async function sell(user, stock, amount) {
    let price = currentPrice(stock);
    let data = await Database.getUser(user);
    let currentStock = data.wallets.get(stock);
    if (currentStock >= amount / price && Utilities.isValid(currentStock) && Utilities.isValid(price)) {
        currentStock -= amount / price;
        if (Matoshi.pay(Main.client.user.id, user, Math.floor(amount * (1 - tradingFee)), 0)) {
            data.wallets.set(stock, currentStock);
            await Database.setUser(data);
            return true;
        }
        else return false;
    }
    else return false;
}

export async function balance(user, stock) {
    let data = await Database.getUser(user);
    let currentStock = data.wallets.get(stock);
    return currentStock;
}

