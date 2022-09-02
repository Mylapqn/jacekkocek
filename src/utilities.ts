import { Channel, Guild, Message, TextBasedChannel, TextChannel, ThreadChannel, NewsChannel } from "discord.js";
import * as Main from "./main";

export function dateString(inputDate: Date) {
    var minutes = inputDate.getMinutes();
    var hours = inputDate.getHours();
    var day = inputDate.getDate();
    var month = inputDate.getMonth() + 1;
    var year = inputDate.getFullYear();
    return (day + "." + month + "." + year + " " + hours + ":" + addZero(minutes));
}

export function getTimeOffset(date: Date, timeZone: string) {
    const tz = date.toLocaleString("en", { timeZone, timeStyle: "long" }).split(" ").slice(-1)[0];
    const dateString = date.toString();
    let offset = Date.parse(`${dateString} ${tz}`) - Date.parse(`${dateString} UTC`);
    return offset;
}
/**
 * @param {String} phrase
 */
export function toTitleCase(phrase: string) {
    return phrase
        .toLowerCase()
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export function randomInt(min: number, max: number) {
    return Math.round(Math.random() * (max - min) + min);
}

export function timeString(seconds: number) {
    let output: string;
    if (seconds >= 3600) {
        output = Math.floor(seconds / 3600) + ":" + addZero(Math.floor((seconds % 3600) / 60)) + ":" + addZero(Math.floor(seconds % 60));
    }
    else {
        output = Math.floor(seconds / 60) + ":" + addZero(Math.floor(seconds % 60));
    }
    return output;
}

export function addZero(x: number) {
    return String(x).padStart(2, "0");
}

export function isValid(x: number) {
    if (x == undefined || isNaN(x)) return false;
    else return true;
}

export async function fetchMessage(channelId: string, messageId: any): Promise<Message> {
    let channel = await Main.client.channels.fetch(channelId) as TextBasedChannel;
    try {
        return await channel.messages.fetch(messageId);
    } catch (error) {
        throw new Error("Cannot fetch message");
    }
}
export function matchMessages(a: Message, b: Message) {
    return a.id == b.id && a.channelId == b.channelId
}

export function isActualChannel(channel: any): channel is TextChannel | ThreadChannel | NewsChannel {
    return (channel instanceof TextChannel || channel instanceof ThreadChannel || channel instanceof NewsChannel);
}