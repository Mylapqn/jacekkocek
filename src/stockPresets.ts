import * as Main from "./main";

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

export async function setStockPolicyDefaults() {
    let policyRelation = {stock: {defaultFee: []}};
    let stockPolicies = {};
    let stockNames = {};
    for (const stock of stockPresets) {
        stockPolicies[stock.id + "fee"] = Main.policyValues.stock.defaultFee;
        stockNames[stock.id + "fee"] = [stock.id + " stock transaction fee", "%"];
        policyRelation.stock.defaultFee.push("stock."+stock.id + "fee");
    }
    Object.assign(Main.policyValues.stock, stockPolicies);
    Object.assign(Main.policyNames.stock, stockNames);
    Object.assign(Main.policyRelation, policyRelation);    
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
