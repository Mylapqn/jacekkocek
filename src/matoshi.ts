import * as Main from "./main";
import * as Discord from "discord.js";
import fs from "fs";

var matoshiFileName = "matoshiBalance.json";
var matoshiData = new Map();
export let paymentMessages = new Map();

export function init() {
    load();
    Main.httpServer.post("/matoshi/payment", (req, res) => {
        console.log(req.body);
        //let data = JSON.parse(req.body);
        let data = req.body;
        if (data.from.id != Main.client.user.id)
            paymentMessage(data).then(() => {
                res.send("ok");
            });
    });

}

function load() {
    try {
        let read = fs.readFileSync(matoshiFileName, { encoding: "utf-8" });
        //console.log(read.toString());
        matoshiData = new Map(JSON.parse(read));
        //matoshiData = new Map(JSON.parse('[["532918953014722560", 77840],["645206726097764364", 423],["500632024831492100", 275],["271729772357222410", 1166],["728313132619137124", 110963],["245616926485643264", 0],["658686795076206603", 0],["691718942049173524", 1]]'));
        console.log("Loaded matoshi.");
    } catch (error) {
        console.log("Could not load matoshi!");
        console.log(error);
    }
}

function save() {
    fs.writeFile(matoshiFileName, JSON.stringify(Array.from(matoshiData)), (e) => { console.log("Finished writing Matoshi") });
}

export function balance(user) {
    if (!matoshiData.has(user)) {
        matoshiData.set(user, 0);
    }
    let b = matoshiData.get(user);
    if (b == null || b == undefined || isNaN(b)) {
        matoshiData.set(user, 0);
        console.log("User ID " + user + " matoshi balance is NaN, resetting to 0");
    }
    return matoshiData.get(user);
}

export function modify(user, amount) {
    amount = Math.round(amount);
    if (amount != 0) {
        let m = balance(user);
        matoshiData.set(user, m + amount);
        console.log("User ID " + user + " matoshi modified by " + amount + ", now " + matoshiData.get(user));
        save();
    }
}

export function pay(from, to, amount, fee = undefined) {
    if (fee == undefined) fee = 1;
    amount = Math.round(amount);
    if (balance(from) >= amount && amount > fee) {
        modify(from, -amount);
        modify(to, amount - fee);
        modify(Main.client.user.id, fee);
        return true;
    }
    else return false;
}

export function cost(user, amount, guild) {
    amount = Math.round(amount);
    if (guild == "549589656606343178" || guild == undefined) {
        if (balance(user) >= amount) {
            modify(user, -amount);
            modify(Main.client.user.id, amount);
            return true;
        }
        else return false;
    }
    else return true;
}

export function award(guild, user, amount) {
    if (guild == "549589656606343178") {
        amount = Math.round(amount);
        modify(user, amount);
    }
    return true;
}

export async function generateLeaderboard() {
    let sorted = Array.from(matoshiData.keys()).sort((a, b) => { return matoshiData.get(b) - matoshiData.get(a); });
    let msg = "Matoshi balance leaderboard:\n";
    for (let i = 0; i < sorted.length && i < 10; i++) {
        let usr = await Main.afrGuild.members.fetch(sorted[i]);
        let usrn: string;
        if (!usr) usrn = "Unknown user";
        else usrn = usr.user.username;
        msg += "`" + (i + 1) + "` " + "**" + usrn + "**: " + matoshiData.get(sorted[i]) + " ₥\n";
    }
    return msg;
}

async function paymentMessage(data) {
    let channel = await Main.afrGuild.channels.fetch("753323827093569588") as Discord.TextChannel;
    let from = await Main.afrGuild.members.fetch(data.from);
    let to = await Main.afrGuild.members.fetch(data.to);
    let newEmbed = new Discord.EmbedBuilder()
        .setTitle("Confirm payment")
        .addFields({ name: "Message", value: data.description })
        .addFields({ name: "Amount", value: data.amount + " ₥", inline: false })
        .addFields({ name: "From >>", value: "<@" + from.id + ">", inline: true })
        .addFields({ name: ">> To", value: "<@" + to.id + ">", inline: true })
        .setFooter({ text: "Only " + from.displayName + " can confirm this payment." })
        .setColor(0x18C3B1)
    let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents([
        new Discord.ButtonBuilder()
            .setCustomId("acceptPayment")
            .setLabel("Accept")
            .setStyle(Discord.ButtonStyle.Success),
        new Discord.ButtonBuilder()
            .setCustomId("declinePayment")
            .setLabel("Decline")
            .setStyle(Discord.ButtonStyle.Danger),
    ]);
    channel.send({ content: "<@" + from.id + ">", embeds: [newEmbed], components: [newActionRow] }).then(msg => {
        //msg.react("✅");
        //msg.react("767907092907687956");
        paymentMessages.set(msg.id, data);
    });
    return true;
}