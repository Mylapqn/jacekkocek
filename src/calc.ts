import * as Discord from "discord.js";

export function isCalc(string) {
    return !/([A-z]|[\"\'\`])/.test(string) && /([\+\/\-\*\%])/.test(string);
}

const context = new Map();

export function calc(message: Discord.Message) {
    let s = message.content.replaceAll(" ", "").replaceAll(",", ".");
    let ctx = 0;
    let ctxText = "";
    if (context.has(message.channelId)) ctx = context.get(message.channelId);

    if (
        s.startsWith("/") ||
        s.startsWith("+") ||
        s.startsWith("*") ||
        s.startsWith("-") ||
        s.startsWith("%")
    ) {
        ctxText = ctx.toString();
    }

    try {
        let value = new Function("return " + ctxText + s.replaceAll("$", ctxText))();
        context.set(message.channelId, value);
        return value.toString();
    } catch (error) {
        return false;
    }
}

export function setCalcContext(value, channelId) {
    context.set(channelId, value);
}
