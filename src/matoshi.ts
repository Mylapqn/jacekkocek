import * as Main from "./main";
import * as Discord from "discord.js";
import fs from "fs";

let paymentChannel: Discord.TextChannel;
var matoshiFileName = "matoshiBalance.json";
var matoshiData = new Map();
export let paymentMessages = new Map<string, PaymentOptions>();

interface PaymentOptions {
    from: string,
    to: string,
    amount: number,
}

interface PaymentRequestOptions extends PaymentOptions {
    description?: string,
    channel?: Discord.TextChannel,
    interaction?: Discord.CommandInteraction
}

export async function init() {
    load();
    paymentChannel = await Main.afrGuild.channels.fetch("753323827093569588") as Discord.TextChannel;
    Main.httpServer.post("/matoshi/payment", async (req, res) => {
        console.log(req.body);
        //let data = JSON.parse(req.body);
        let data = req.body;
        if (data.from.id != Main.client.user.id) {
            let msg = await requestPayment({ from: data.from, to: data.to, amount: data.amount, description: data.description, channel: paymentChannel });
            res.send("ok");
        }
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

export async function balance(userId: string) {
    if (!matoshiData.has(userId)) {
        matoshiData.set(userId, 0);
    }
    let b = matoshiData.get(userId);
    if (b == null || b == undefined || isNaN(b)) {
        matoshiData.set(userId, 0);
        console.log("User ID " + userId + " matoshi balance is NaN, resetting to 0");
    }
    return matoshiData.get(userId);
}

export async function modify(userId: string, amount: number) {
    amount = Math.round(amount);
    if (amount != 0) {
        let m = await balance(userId);
        matoshiData.set(userId, m + amount);
        console.log("User ID " + userId + " matoshi modified by " + amount + ", now " + matoshiData.get(userId));
        save();
    }
}

export async function pay(options: PaymentOptions, feeApplies = false) {
    const fee = feeApplies ? Math.ceil(Math.max(Main.policyValues.matoshi.transactionFeeMin, Main.policyValues.matoshi.transactionFeePercent / 100 * options.amount)) : 0;
    const amount = Math.round(options.amount);
    if (await balance(options.from) >= amount && amount > fee) {
        await modify(options.from, -amount);
        await modify(options.to, amount - fee);
        await modify(Main.client.user.id, fee);
        return true;
    }
    else return false;
}

export async function cost(user: string, amount: number, guild: string) {
    amount = Math.round(amount);
    if (guild == "549589656606343178" || guild == undefined) {
        if (await balance(user) >= amount) {
            await modify(user, -amount);
            await modify(Main.client.user.id, amount);
            return true;
        }
        else return false;
    }
    else return true;
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

async function generatePaymentMessage(options: PaymentRequestOptions) {
    const fromMember = (await Main.afrGuild.members.fetch(options.from))
    const toMember = (await Main.afrGuild.members.fetch(options.to));
    let confirmUsersList = fromMember.displayName;
    if (fromMember.user = Main.client.user) {
        confirmUsersList += " or " + Main.managerRole.members.first().displayName;
    }
    let newEmbed = new Discord.EmbedBuilder()
        .setTitle("Confirm payment")
        .addFields({ name: "Message", value: options.description || "No description provided" })
        .addFields({ name: "Amount", value: options.amount + " ₥", inline: false })
        .addFields({ name: "From >>", value: "<@" + fromMember.id + ">", inline: true })
        .addFields({ name: ">> To", value: "<@" + toMember.id + ">", inline: true })
        .setFooter({ text: "Only " + confirmUsersList + " can confirm this payment." })
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
    return { content: "<@" + fromMember.id + ">", embeds: [newEmbed], components: [newActionRow] };
}

export async function requestPayment(options: PaymentRequestOptions) {
    let paymentMessage = await generatePaymentMessage(options);
    let msg: Discord.Message;
    if (options.interaction) {
        await options.interaction.reply(paymentMessage);
        msg = (await options.interaction.fetchReply());
    }
    else if (options.channel) {
        msg = await options.channel.send(paymentMessage);
    }
    paymentMessages.set(msg.id, { from: options.from, to: options.to, amount: options.amount });
    return msg;
}
