import * as Main from "./main";
import { Policy } from "./policy";

export type StockPreset = {
    id: string,
    type: string,
    symbol: string,
    name: string,
};

export const stockPresets = [
    {
        id: "BTC",
        type: "crypto",
        symbol: "BINANCE:BTCUSDT",
        name: "Bitcoin",
    },
    {
        id: "CORN",
        type: "stock",
        symbol: "CORN",
        name: "Corn",
    },
    {
        id: "TSLA",
        type: "stock",
        symbol: "TSLA",
        name: "Tesla",
    },
    {
        id: "NVDA",
        type: "stock",
        symbol: "NVDA",
        name: "Nvidia",
    },
    {
        id: "AMD",
        type: "stock",
        symbol: "AMD",
        name: "AMD",
    },
    {
        id: "META",
        type: "stock",
        symbol: "META",
        name: "Meta",
    },
] as Array<StockPreset>;

export function getStockChoices() {
    let choices = [];
    for (const stock of stockPresets) {
        choices.push({
            name: stock.id,
            value: stock.id,
        });
    }
    return choices;
}

export function setStockPolicyDefaults() {
    for (const stock of stockPresets) {
        Policy.createOrLoad({
            category: "stock",
            name: stock.symbol+"fee",
            symbol: "%",
            description: "Stock transaction fee for " + stock.name,
            value: 0,
            parent: Policy.get("stock", "defaultFee")
        });
    }
}

export function getStockFeeHints() {
    let choices = [];
    for (const stock of stockPresets) {
        choices.push({
            name: `Fee per ${stock.id} stock transaction (% of transaction)`,
            value: "stock." + stock.id + "fee"
        });
    }
    return choices;
}
