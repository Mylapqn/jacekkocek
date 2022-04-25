export function isCalc(string) {
    return !/([A-z]|[\"\'\`])/.test(string) && /([\+\/\-\*\%])/.test(string);
}

const context = new Map();

export function calc(message) {
    let s = message.content;
    let ctx = 0;
    let ctxText = "";
    if (context.has(message.channelId)) ctx = context.get(message.channelId);

    if (s.startsWith("/") || s.startsWith("+") || s.startsWith("*") || s.startsWith("-") || s.startsWith("%")) {
        ctxText = ctx.toString();
    }

    try {
        let value = new Function("return " + ctxText + s)();
        context.set(message.channelId, value);
        return value;
    } catch (error) {
        return false
    }
}
