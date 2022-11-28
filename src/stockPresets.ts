export type StockPreset = {
    id: string,
    type: string,
    symbol: string,
    name: string
}

export const stockPresets = [
    {
        id: "BTC",
        type: "crypto",
        symbol: "BINANCE:BTCUSDT",
        name: "Bitcoin"
    },
    {
        id: "CORN",
        type: "stock",
        symbol: "CORN",
        name: "Corn"
    },
    {
        id: "TSLA",
        type: "stock",
        symbol: "TSLA",
        name: "Tesla"
    },
    {
        id: "NVDA",
        type: "stock",
        symbol: "NVDA",
        name: "Nvidia"
    },
    {
        id: "AMD",
        type: "stock",
        symbol: "AMD",
        name: "AMD"
    },
    {
        id: "META",
        type: "stock",
        symbol: "META",
        name: "Meta"
    },
    {
        id: "TWTR",
        type: "stock",
        symbol: "TWTR",
        name: "Twitter"
    },
] as Array<StockPreset>