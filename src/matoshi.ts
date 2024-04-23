import * as Main from "./main";
import * as Discord from "discord.js";
import * as Utilities from "./utilities";
import { User } from "./user";

export let paymentMessages = new Map<string, PaymentOptions>();

interface PaymentOptions {
    from: string | User;
    to: string | User;
    amount: number;
}

interface PaymentRequestOptions extends PaymentOptions {
    description?: string;
    channel?: Discord.TextChannel;
    interaction?: Discord.CommandInteraction;
}

export async function init() {
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
    scheduleDaily();
}

export async function balance(userId: string | User) {
    let user;
    if (typeof userId == "string") {
        user = await User.get(userId, true);
    } else {
        user = userId;
    }
    let b = user.wallet.matoshi;
    if (b == null || b == undefined || isNaN(b)) {
        user.wallet.matoshi = 0;
        console.log("User ID " + userId + " matoshi balance is NaN, resetting to 0");
    }
    return user.wallet.matoshi;
}

export async function modify(userId: string | User, amount: number) {
    let user: User;
    if (typeof userId == "string") {
        user = await User.get(userId, true);
    } else {
        user = userId;
    }
    amount = Math.round(amount);
    if (amount != 0) {
        let m = await balance(userId);
        user.wallet.matoshi = m + amount;
        await user.dbUpdate();
        console.log("User ID " + userId + " matoshi modified by " + amount + ", now " + user.wallet.matoshi);
    }
}

export function calcFee(amount: number) {
    return Math.ceil(Math.max(Main.policyValues.matoshi.transactionFeeMin, (Main.policyValues.matoshi.transactionFeePercent / 100) * amount));
}

export async function pay(options: PaymentOptions, feeApplies: boolean) {
    try {
        const fee = feeApplies ? calcFee(options.amount) : 0;
        const amount = Math.round(options.amount);
        if ((await balance(options.from)) >= amount && amount > fee) {
            await modify(options.from, -amount);
            await modify(options.to, amount - fee);
            await modify(Main.client.user.id, fee);
            return true;
        } else return false;
    } catch (error) {
        console.error(error);
    }
}

export async function cost(user: string, amount: number, guild: string) {
    amount = Math.round(amount);
    if (guild == Main.mainGuild.id || guild == undefined) {
        if ((await balance(user)) >= amount) {
            await modify(user, -amount);
            await modify(Main.client.user.id, amount);
            return true;
        } else return false;
    } else return true;
}

export async function generateLeaderboard() {
    let sorted = (await User.dbFindAll<User>({ wallet: { $exists: true } })).sort((a, b) => b.wallet.matoshi - a.wallet.matoshi);
    let msg = "Matoshi balance leaderboard:\n";
    let total = 0;
    for (let i = 0; i < sorted.length && i < 10; i++) {
        let usr = await Main.mainGuild.members.fetch(sorted[i].id);
        let usrn: string;
        if (!usr) usrn = "Unknown user";
        else usrn = usr.user.username;
        msg += "`" + (i + 1) + "` " + "**" + usrn + "**: " + sorted[i].wallet.matoshi + " ₥\n";
        total += sorted[i].wallet.matoshi;
    }
    msg += `there is ${total} ₥ in total.`;
    return msg;
}

async function generatePaymentMessage(options: PaymentRequestOptions) {
    let from = options.from;
    let to = options.to;
    if (typeof from != "string") from = from.id;
    if (typeof to != "string") to = to.id;
    const fromMember = await Main.mainGuild.members.fetch(from);
    const toMember = await Main.mainGuild.members.fetch(to);
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
        .setColor(0x18c3b1);
    let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents([
        new Discord.ButtonBuilder().setCustomId("acceptPayment").setLabel("Accept").setStyle(Discord.ButtonStyle.Success),
        new Discord.ButtonBuilder().setCustomId("declinePayment").setLabel("Decline").setStyle(Discord.ButtonStyle.Danger),
    ]);
    return { content: "<@" + fromMember.id + ">", embeds: [newEmbed], components: [newActionRow] };
}

export async function requestPayment(options: PaymentRequestOptions) {
    let paymentMessage = await generatePaymentMessage(options);
    let msg: Discord.Message;
    if (options.interaction) {
        await options.interaction.reply(paymentMessage);
        msg = await options.interaction.fetchReply();
    } else if (options.channel) {
        msg = await options.channel.send(paymentMessage);
    }
    paymentMessages.set(msg.id, { from: options.from, to: options.to, amount: options.amount });
    return msg;
}

async function collectAndReportTax() {
    if (Main.policyValues.matoshi.weeklyTaxFlat == 0 && Main.policyValues.matoshi.weeklyTaxPercent == 0) {
        return undefined;
    }
    let sorted = (await User.dbFindAll<User>({ wallet: { $exists: true } })).sort((a, b) => b.wallet.matoshi - a.wallet.matoshi);
    let msg = "Matoshi tax report:\n";
    for (let i = 0; i < sorted.length; i++) {
        let usr = await Main.mainGuild.members.fetch(sorted[i].id);
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

        msg += "**" + usrn + "** paid: " + tax + "₥" + (failureToPay != 0 ? ", failed to pay " + failureToPay + " ₥" : "") + "\n";
    }
    return msg;
}

export async function lateFees(onTimeUsers: string[], voters: string[], filmName: string): Promise<string> {
    let late = [];
    for (const voterId of voters) {
        if (!onTimeUsers.includes(voterId)) late.push(voterId);
    }

    let msg = `Starting **${filmName}**\n`;
    msg += voters.length - late.length + " / " + voters.length + " voters are on time.\n";

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

            msg += "**" + usrn + "** paid: " + lateFee + "₥ in late fees" + (failureToPay != 0 ? ", failed to pay " + failureToPay + "₥" : "") + "\n";
        }
    }

    return msg;
}

export async function watchReward(users: Discord.User[], filmName: string): Promise<Discord.MessageCreateOptions> {
    let msg = new Discord.EmbedBuilder();
    msg.setTitle(`Watch rewards for **${filmName}**:\n`);
    let namesColumn = "";
    let valuesColumn = "";
    for (const discordUser of users) {
        const user = await User.get(discordUser.id);
        if (!user.wallet) continue;
        await pay({ from: Main.client.user.id, to: discordUser.id, amount: Main.policyValues.kino.watchReward }, false);
        namesColumn += discordUser.toString() + "\n";
        valuesColumn += Main.policyValues.kino.watchReward + " ₥\n";
    }

    if (namesColumn.length == 0) namesColumn = "no users";
    if (valuesColumn.length == 0) valuesColumn = "no reward";

    msg.addFields([
        { name: "User", value: namesColumn, inline: true },
        { name: "Reward", value: valuesColumn, inline: true },
    ]);
    let csfdResult = (await Main.googleSearch(Main.SearchEngines.CSFD, filmName))[0];
    if (csfdResult && csfdResult.link) {
        msg.setURL(csfdResult.link);
        msg.setFooter({ text: "CSFD link in title" });
    }
    msg.setColor(0x18c3b1);

    return { embeds: [msg], allowedMentions: { parse: [] } };
}

let lastTaxTime = 0;
async function scheduleTax() {
    let date = new Date();
    let day = date.getDay();
    day = day == 0 ? 7 : day;

    date.setDate(date.getDate() + 7 - day);
    date.setHours(23);
    date.setMinutes(59);

    if (lastTaxTime > date.valueOf() - 24 * 60 * 60 * 1000) {
        date = new Date(date.valueOf() + 7 * 24 * 60 * 60 * 1000);
    }

    let delay = date.valueOf() - Date.now();

    setTimeout(async () => {
        const msg = await collectAndReportTax();
        if (msg) Main.notifyTextChannel.send(msg);
        lastTaxTime = Date.now();
        scheduleTax();
    }, delay);
    console.log("Tax collection in: " + (delay / 1000 / 60 / 60).toFixed(2) + "h");
}

let dailyTime = 0;
async function scheduleDaily() {
    let date = new Date();
    date.setHours(11);
    date.setMinutes(29);
    date.setSeconds(59);

    let delay = date.valueOf() - Date.now();

    if (delay < 10000) {
        delay += 24 * 60 * 60 * 1000;
    }

    setTimeout(async () => {
        dailyTime = Date.now();
        await User.dailyCheck();
        scheduleDaily();
    }, delay);
    console.log("Daily check in: " + (delay / 1000 / 60 / 60).toFixed(2) + "h");
}
