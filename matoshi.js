import * as Main from "./main.js";
import * as Discord from "discord.js";
import fs from "fs";

var matoshiFileName = "matoshiBalance.json";
var matoshiData = new Map();

export function init() {
    load();
    Main.httpServer.post("/matoshi/payment", (req, res) => {
        console.log(req.body);
        //let data = JSON.parse(req.body);
        let data = req.body;
        if (data.from.id != client.user.id)
            paymentMessage(data).then(() => {
                res.send("ok");
            });
    });
}

function load() {
    try {
        let read = fs.readFileSync(matoshiFileName);
        matoshiData = new Map(JSON.parse(read));
        console.log("Loaded matoshi.");
    } catch (error) {
        console.log("Could not load matoshi!");
        console.log(error);
    }
}

function save() {
    fs.writeFile(matoshiFileName, JSON.stringify(Array.from(matoshiData)), (e) => { console.log("Finished writing", e) });
}

export function balance(user) {
    if (!matoshiData.has(user)) {
        matoshiData.set(user, 0);
    }
    let b = matoshiData.get(user);
    if (b == null || b == undefined || b == NaN) {
        matoshiData.set(user, 0);
        console.log("User ID " + user + " matoshi balance is NaN, resetting to 0");
    }
    return matoshiData.get(user);
}

export function modify(user, amount) {
    let m = balance(user);
    matoshiData.set(user, m + amount);
    console.log("User ID " + user + " matoshi modified by " + amount + ", now " + matoshiData.get(user));
    save();
}

export function pay(from, to, amount) {
    if (balance(from) >= amount && amount > 1) {
        modify(from, -amount);
        modify(to, amount - 1);
        modify(client.user.id, 1);
        return true;
    }
    else return false;
}

export function cost(guild, user, amount) {
    if (guild == "549589656606343178") {
        if (balance(user) > amount) {
            modify(user, -amount);
            modify(client.user.id, amount);
            return true;
        }
        else return false;
    }
    else return true;
}

export function award(guild, user, amount) {
    if (guild == "549589656606343178") {
        modify(user, amount);
    }
    return true;
}

export async function generateLeaderboard() {
    let sorted = Array.from(matoshiData.keys()).sort((a, b) => { return matoshiData.get(b) - matoshiData.get(a); });
    let msg = "Matoshi balance leaderboard:\n";
    for (let i = 0; i < sorted.length && i < 10; i++) {
        let usr = await Main.afrGuild.members.fetch(sorted[i]);
        if (!usr) usr = "Unknown user";
        else usr = usr.user.username;
        msg += "`" + (i + 1) + "` " + "**" + usr + "**: " + matoshiData.get(sorted[i]) + " ₥\n";
    }
    return msg;
}

async function paymentMessage(data) {
    let channel = await Main.afrGuild.channels.fetch("753323827093569588");
    let from = await Main.afrGuild.members.fetch(data.from);
    let to = await Main.afrGuild.members.fetch(data.to);
    let newEmbed = new Discord.MessageEmbed()
        .setTitle("Confirm payment")
        .addField("Message", data.description)
        .addField("Amount", data.amount + " ₥", false)
        .addField("From >>", "<@" + from.id + ">", true)
        .addField(">> To", "<@" + to.id + ">", true)
        .setFooter({ text: "Only " + from.displayName + " can confirm this payment." })
        .setColor([24, 195, 177])
    let newActionRow = new Discord.MessageActionRow().addComponents([
        new Discord.MessageButton()
            .setCustomId("acceptPayment")
            .setLabel("Accept")
            .setStyle("SUCCESS"),
        new Discord.MessageButton()
            .setCustomId("declinePayment")
            .setLabel("Decline")
            .setStyle("DANGER"),
    ]);
    channel.send({ content: "<@" + from.id + ">", embeds: [newEmbed], components: [newActionRow] }).then(msg => {
        //msg.react("✅");
        //msg.react("767907092907687956");
        paymentMessages.set(msg.id, data);
    });
    return true;
}