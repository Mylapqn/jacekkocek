import * as Discord from "discord.js";
import * as Main from "./main";
import * as Sheets from "./sheets";
import * as fs from 'fs';
import { Readable } from "stream";
import axios from "axios";

export function dateString(inputDate: Date) {
    let minutes = inputDate.getMinutes();
    let hours = inputDate.getHours();
    let day = inputDate.getDate();
    let month = inputDate.getMonth() + 1;
    let year = inputDate.getFullYear();
    return (day + "." + month + "." + year + " " + hours + ":" + addZero(minutes));
}

export function simpleDateString(inputDate: Date) {
    let day = inputDate.getDate();
    let month = inputDate.getMonth() + 1;
    return (day + "." + month + ".");
}

export function getTimeOffset(date: Date, timeZone: string) {
    const tz = date.toLocaleString("en", { timeZone, timeStyle: "long" }).split(" ").slice(-1)[0];
    const dateString = date.toString();
    let offset = Date.parse(`${dateString} ${tz}`) - Date.parse(`${dateString} UTC`);
    return offset;
}

export function H2Ms(hours: number) {
    return hours * 60 * 60 * 1000;
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

export async function fetchMessage(channelId: string, messageId: any): Promise<Discord.Message> {
    try {
        let channel = await Main.client.channels.fetch(channelId) as Discord.TextBasedChannel;
        return await channel.messages.fetch({ message: messageId, cache: true });
    } catch (error) {
        return undefined;
        //throw new Error("Cannot fetch message");
    }
}
export function matchMessages(a: Discord.Message, b: Discord.Message) {
    return a.id == b.id && a.channelId == b.channelId
}

export function isActualChannel(channel: any): channel is Discord.TextChannel | Discord.ThreadChannel | Discord.NewsChannel {
    return (channel instanceof Discord.TextChannel || channel instanceof Discord.ThreadChannel || channel instanceof Discord.NewsChannel);
}

export function dateFromKinoString(text: string): Date {
    try {
        let day = parseInt(text.split('.')[0]);
        let month = parseInt(text.split('.')[1]);
        let now = new Date();

        if (!(day <= 31 && day > 0 && month > 0 && month <= 12)) throw new Error("Invalid date: " + text);

        let yearOffset = 0;

        if (month < now.getMonth() + 1) yearOffset++;

        let output = new Date();
        output.setFullYear(now.getFullYear() + yearOffset, month - 1, day);
        return output;
    } catch (error) {
        return undefined;
    }

}

export function weekdayEmoji(day: number) {
    switch (day) {
        case 1: return "<:po:767907091469828106>";
        case 2: return "<:ut:767907090709872661>";
        case 3: return "<:st:767907091125895178>";
        case 4: return "<:ct:767907091880476732>";
        case 5: return "<:pa:767907093205614622>";
        case 6: return "<:so:767907093222916126>";
        case 0: return "<:ne:767907093352153118>";
    }
}

export function messageError(channel: Discord.TextBasedChannel, error: Error) {
    console.error(error);
    channel.send(error.name + ": " + error.message);
}

export async function disableMessageButtons(msg: Discord.Message, setDisabled = true) {
    let comp = msg.components;
    let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
    for (const component of comp[0].components) {
        if (component instanceof Discord.ButtonComponent)
            newActionRow.addComponents(new Discord.ButtonBuilder(component.data).setDisabled(setDisabled));
        else
            throw new Error("Expected only ButtonComponent");
    }
    msg.edit({ content: msg.content, embeds: msg.embeds, components: [newActionRow] })
}

export function escapeFormatting(text: string) {
    return text.replace(/[\\_|*~]/g, `\\$&`);
}

export async function getAsync(url: string): Promise<Readable> {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const response = await axios.get(url, { responseType: 'stream' });
        return response.data;
    }
    else {
        return Promise.resolve(fs.createReadStream(url));
    }
}

export function limitString(str: string, n: number) {
    return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
};

export async function messageFromUid(uid: string): Promise<Discord.Message> {
    let ids = uid.split("/")
    return await fetchMessage(ids[0], ids[1]);
}

export function messageToUid(message: Discord.Message): string {
    return message.channelId + "/" + message.id;
}

// https://stackoverflow.com/a/2450976
export function shuffle(array: any[]) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}
