import * as Discord from "discord.js";
import axios from "axios";

interface CurrencyRates {
    date: string;
    czk: Record<string, number>;
}

interface CalcContext {
    value: number;
    currency?: string;
}

const context = new Map<string, CalcContext>();

let currencyRates: CurrencyRates | null = null;
let currencyRatesTimestamp: number = 0;
const CURRENCY_CACHE_DURATION = 3600000;

export function isCalc(string: string) {
    return /([\+\/\-\*\%])/.test(string) || 
           /([a-z]{3})/i.test(string) ||
           /\bto\s+[a-z]{3}$/i.test(string.toLowerCase());
}

async function fetchCurrencyRates(): Promise<CurrencyRates | null> {
    const now = Date.now();
    if (currencyRates && (now - currencyRatesTimestamp) < CURRENCY_CACHE_DURATION) {
        return currencyRates;
    }

    try {
        const response = await axios.get("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/czk.json");
        currencyRates = response.data;
        currencyRatesTimestamp = now;
        return currencyRates;
    } catch (error: unknown) {
        console.error("Failed to fetch currency rates:", error);
        return null;
    }
}

function detectCurrenciesInExpression(expression: string): string[] {
    const currencyRegex = /(\d*\s*([a-z]{3})\b|[a-z]{3}\b)/gi;
    const currencies = new Set<string>();
    let match: RegExpExecArray | null;
    
    while ((match = currencyRegex.exec(expression)) !== null) {
        const currency = (match[2] || match[1]).toLowerCase();
        if (currency !== 'to') {
            currencies.add(currency);
        }
    }
    
    return Array.from(currencies);
}

async function getCurrencyValue(currency: string): Promise<number | null> {
    const rates = await fetchCurrencyRates();
    if (!rates || !rates.czk) return null;
    
    const currencyLower = currency.toLowerCase();
    if (currencyLower === 'czk') {
        return 1;
    } else if (rates.czk[currencyLower]) {
        // Convert 1 unit of currency to CZK
        return 1 / rates.czk[currencyLower];
    }
    
    return null;
}

async function substituteCurrencyVariables(expression: string): Promise<string | null> {
    // Process expression for currency substitutions
    let result = expression;
    
    // Check for "to currency" pattern and handle specially
    const toConversionMatch = /\bto\s+([a-z]{3})\b/gi;
    const toMatches: string[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = toConversionMatch.exec(expression)) !== null) {
        toMatches.push(match[1].toLowerCase());
    }
    
    // Detect currencies - look for 3-letter codes after digits OR standalone
    const currencyScan = /(?:\d\s*)?([a-z]{3})\b/gi;
    const currencies = new Set<string>();
    
    while ((match = currencyScan.exec(expression)) !== null) {
        const currency = match[1].toLowerCase();
        if (currency !== 'to') {
            currencies.add(currency);
        }
    }
    
    for (const currency of currencies) {
        const value = await getCurrencyValue(currency);
        if (value === null) return null;
        
        // Replace "to currency" with "/value"
        const toRegex = new RegExp(`\\bto\\s+${currency}\\b`, 'gi');
        result = result.replace(toRegex, `/${value}`);
        
        // Handle patterns like "3eur" or "3 eur" -> "3*value" (case insensitive)
        const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${currency}\\b`, 'gi');
        result = result.replace(regex, (match, number) => {
            return `${parseFloat(number)}*${value}`;
        });
        
        // Handle standalone currency codes (not preceded by a number)
        const standaloneRegex = new RegExp(`(?<!\\d\\s{0,5})\\b${currency}\\b`, 'gi');
        result = result.replace(standaloneRegex, value.toString());
    }
    
    return result;
}

export async function calc(message: Discord.Message): Promise<string | false> {
    let originalExpression = message.content.trim();
    const processedLower = originalExpression.toLowerCase().trim();
    
    // Handle "to currency" chaining - use previous context
    const toMatch = processedLower.match(/^to\s+([a-z]{3})$/i);
    if (toMatch) {
        const ctxData = context.get(message.channelId);
        const ctxValue = ctxData?.value ?? 0;
        const ctxCurrency = ctxData?.currency;

        const targetCurrency = toMatch[1].toLowerCase();
        const targetRate = await getCurrencyValue(targetCurrency);
        if (targetRate === null) return false;

        let inCzk: number;
        if (!ctxCurrency || ctxCurrency === 'czk') {
            inCzk = ctxValue;
        } else {
            const ctxRate = await getCurrencyValue(ctxCurrency);
            if (ctxRate === null) return false;
            inCzk = ctxValue * ctxRate;
        }

        const result = inCzk / targetRate;
        context.set(message.channelId, { value: result, currency: targetCurrency });
        return `${result.toFixed(2)} ${targetCurrency.toUpperCase()}`;
    }
    
    // Substitute currency codes with their values
    const substitutedExpression = await substituteCurrencyVariables(originalExpression);
    if (substitutedExpression === null) {
        return false;
    }
    
    // Prepare expression for calculation
    let s = substitutedExpression.replaceAll(" ", "").replaceAll(",", ".");
    let ctxData = context.get(message.channelId);
    let ctx = ctxData?.value ?? 0;
    let ctxCurrency = ctxData?.currency;
    let ctxText = "";

    const isChaining = s.startsWith("/") || s.startsWith("+") || s.startsWith("*") || s.startsWith("-") || s.startsWith("%");

    if (isChaining) {
        ctxText = ctx.toString();
    }

    try {
        let value = new Function("return " + ctxText + s.replaceAll("$", ctx.toString()))();

        // Determine result currency
        const toConversion = originalExpression.match(/\bto\s+([a-z]{3})\b/i);
        const hasCurrencyCodes = detectCurrenciesInExpression(originalExpression).length > 0;

        let resultCurrency: string | undefined;
        if (toConversion) {
            resultCurrency = toConversion[1].toLowerCase();
        } else if (hasCurrencyCodes) {
            resultCurrency = 'czk';
        } else if (isChaining) {
            resultCurrency = ctxCurrency;
        } else {
            resultCurrency = undefined;
        }

        context.set(message.channelId, { value, currency: resultCurrency });

        if (resultCurrency) {
            return `${value.toFixed(2)} ${resultCurrency.toUpperCase()}`;
        }
        return value.toString();
    } catch (error: unknown) {
        console.error("Calculation error:", error, "Original:", originalExpression, "Substituted:", substitutedExpression);
        return false;
    }
}

export function setCalcContext(value: number, channelId: string, currency?: string) {
    context.set(channelId, { value, currency });
}


/*
https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/czk.json
{
  "date": "2026-02-02",
  "czk": {
    "1inch": 0.42070663,
    "aave": 0.0003870657,
    "ada": 0.1684818,
    "aed": 0.17898357,
    "afn": 3.20924498,
    "akt": 0.13460857,
    "algo": 0.47739072,
    "all": 3.97241183,
    "amd": 18.56099909,
    "amp": 30.6395034,
    "eur": 0.041047543,
    "usd": 0.048736167,
    ...
*/