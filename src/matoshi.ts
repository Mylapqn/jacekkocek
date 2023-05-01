import * as Main from "./main";
import * as Discord from "discord.js";
import * as Utilities from "./utilities"
import fs from "fs";

var matoshiFileName = "matoshiBalance.json";
var matoshiData = new Map<string, number>();
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
    Main.httpServer.post("/matoshi/payment", async (req, res) => {
        console.log(req.body);
        //let data = JSON.parse(req.body);
        let data = req.body;
        if (data.from.id != Main.client.user.id) {
            let msg = await requestPayment({ from: data.from, to: data.to, amount: data.amount, description: data.description, channel: Main.notifyTextChannel });
            res.send("ok");
        }
    });
    scheduleTax();
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

export function calcFee(amount: number) {
    return Math.ceil(Math.max(Main.policyValues.matoshi.transactionFeeMin, Main.policyValues.matoshi.transactionFeePercent / 100 * amount))
}

export async function pay(options: PaymentOptions, feeApplies = false) {
    const fee = feeApplies ? calcFee(options.amount) : 0;
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
    if (guild == Main.mainGuild.id || guild == undefined) {
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
        let usr = await Main.mainGuild.members.fetch(sorted[i]);
        let usrn: string;
        if (!usr) usrn = "Unknown user";
        else usrn = usr.user.username;
        msg += "`" + (i + 1) + "` " + "**" + usrn + "**: " + matoshiData.get(sorted[i]) + " ₥\n";
    }
    return msg;
}

async function generatePaymentMessage(options: PaymentRequestOptions) {
    const fromMember = (await Main.mainGuild.members.fetch(options.from))
    const toMember = (await Main.mainGuild.members.fetch(options.to));
    let confirmUsersList = fromMember.displayName;
    if (fromMember.user == Main.client.user && Main.managerRole.members.size > 0) {
        confirmUsersList += " or " + Main.managerRole.members.first().displayName;
    }
    let newEmbed = new Discord.EmbedBuilder()
        .setTitle("Confirm payment")
        .addFields({ name: "Message", value: Utilities.escapeFormatting(options.description || "No description provided") })
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


async function collectAndReportTax() {
    let sorted = Array.from(matoshiData.keys()).sort((a, b) => { return matoshiData.get(b) - matoshiData.get(a); });

    let msg = "Matoshi tax report:\n";
    for (let i = 0; i < sorted.length; i++) {
        let usr = await Main.mainGuild.members.fetch(sorted[i]);
        if (usr.id == Main.client.user.id) continue;
        let usrn: string;

        let failureToPay = 0;

        let initialBalance = await balance(usr.id);
        let tax = Math.ceil(Main.policyValues.matoshi.weeklyTaxFlat + (Main.policyValues.matoshi.weeklyTaxPercent / 100) * initialBalance);

        if (tax > initialBalance) {
            failureToPay = tax - initialBalance;
            tax = initialBalance;
        }

        await cost(usr.id, tax, Main.mainGuild.id);

        if (!usr) usrn = "Unknown user";
        else usrn = usr.user.username;

        msg += "**" + usrn + "** paid: " + tax + "₥" + ((failureToPay != 0) ? ", failed to pay " + failureToPay + " ₥" : "") + "\n";
    }
    return msg;
}

export async function lateFees(onTimeUsers: string[], voters: string[], filmName: string): Promise<string> {
    let late = [];
    for (const voterId of voters) {
        if (!onTimeUsers.includes(voterId)) late.push(voterId);
    }

    let msg = `Starting **${filmName}**\n`;
    msg += (voters.length - late.length) + " / " + voters.length + " voters are on time.\n"

    if (late.length > 0) {
        for (let i = 0; i < late.length; i++) {
            let usr = await Main.mainGuild.members.fetch(late[i]);
            if (usr.id == Main.client.user.id) continue;
            let usrn: string;

            let failureToPay = 0;

            let initialBalance = await balance(usr.id);
            let lateFee = Main.policyValues.kino.lateFee;

            if (lateFee > initialBalance) {
                failureToPay = lateFee - initialBalance;
                lateFee = initialBalance;
            }

            await cost(usr.id, lateFee, Main.mainGuild.id);

            if (!usr) usrn = "Unknown user";
            else usrn = usr.user.username;

            msg += "**" + usrn + "** paid: " + lateFee + "₥ in late fees" + ((failureToPay != 0) ? ", failed to pay " + failureToPay + "₥" : "") + "\n";
        }
    }

    return msg;
}

export async function watchReward(users: Discord.User[], filmName: string): Promise<Discord.MessageCreateOptions> {
    let msg = new Discord.EmbedBuilder();
    msg.setTitle(`Watch rewards for **${filmName}**:\n`);
    let namesColumn = "";
    let valuesColumn = "";
    for (const user of users) {
        if (!Array.from(matoshiData.keys()).includes(user.id)) continue;
        pay({ from: Main.client.user.id, to: user.id, amount: Main.policyValues.kino.watchReward }, false)
        namesColumn += user.username + " was rewarded\n";
        valuesColumn += Main.policyValues.kino.watchReward + "₥\n";
    }
    msg.addFields([{ name: "User", value: namesColumn }, { name: "Reward", value: valuesColumn }]);

    return { embeds: [msg]};
}

let lastTaxTime = 0;
async function scheduleTax() {
    let date = new Date();
    let day = date.getDay();
    day = day == 0 ? 7 : day;

    date.setDate(date.getDate() + 7 - (day));
    date.setHours(23);
    date.setMinutes(59);

    if (lastTaxTime > date.valueOf() - 24 * 60 * 60 * 1000) {
        date = new Date(date.valueOf() + 7 * 24 * 60 * 60 * 1000);
    }

    let delay = date.valueOf() - Date.now();

    setTimeout(async () => {
        Main.notifyTextChannel.send(await collectAndReportTax());
        lastTaxTime = Date.now();
        scheduleTax()
    }, delay);
    console.log("Tax collection in: " + (delay / 1000 / 60 / 60).toFixed(2) + "h");
}