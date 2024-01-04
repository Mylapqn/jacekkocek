import { ObjectId } from "mongodb";
import { DbObject } from "./dbObject";
import * as Matoshi from "./matoshi";
import { client, notifyTextChannel, operationsChannel, policyValues } from "./main";
import { getUserData } from "./sheets";
import * as Discord from "discord.js";


export class User extends DbObject {
    id: string;
    wallet?: Wallet;
    taskIds: Array<ObjectId> = [];
    streak = 0;
    lastTask = 0;
    rank = 0;

    static async get(id: string, wallet = false): Promise<User> {
        const result = (await User.dbFind({ id })) as User;

        if (result != null) {
            if (result.wallet) {
                result.wallet = await Wallet.fromData(result.wallet);
            } else if (wallet) {
                result.wallet = new Wallet();
            }
            return this.fromData(result);
        }

        const newUser = new User();
        newUser.id = id;
        if (wallet) {
            newUser.wallet = new Wallet();
        }
        User.dbSet(newUser);
        return newUser;
    }

    static override async fromData(data?: Partial<User>) {
        const newObject = (await super.fromData(data)) as User;
        Object.assign(newObject, data);
        return newObject;
    }

    static readonly assignmentGrace = 7 * 24 * 60 * 60 * 1000;

    static async dailyCheck() {
        const users = await User.dbFindAll<User>({});
        const kinoSheets = await getUserData();
        for (const userData of users) {
            let user = await User.fromData(userData);
            if (user.id == client.user.id || user.id == "") continue;
            if (user.lastTask == 0) {
                user.lastTask = Date.now();
                await user.dbUpdate();
            }

            if (user.streak > 0 && user.taskIds.length == 0) {
                if (Date.now() - user.lastTask > User.assignmentGrace - 60 * 60 * 1000 * 24) {
                    if (Date.now() - user.lastTask > User.assignmentGrace) {
                        user.streak = 0;
                        operationsChannel.send(`<@${user.id}> your streak is now 0.`);
                        await user.dbUpdate();
                    } else {
                        operationsChannel.send(`<@${user.id}> you are about to loose your streak!`);
                    }
                }
            }

            const kinoData = kinoSheets.get(user.id);
            const kinoProt = Math.floor((kinoData?.reliability ?? 0 * kinoData?.weight ?? 0) * policyValues.rank.kinoProtect);
            const streakProt = Math.floor(user.streak * policyValues.rank.streakProtect);
            const totalProt = streakProt + kinoProt;

            if (totalProt >= user.rank) {
                //free
                if (totalProt > user.rank) {
                    //underleveled
                }
            } else {
                const cost = (user.rank - totalProt) * policyValues.rank.dailyCost;
                if (await Matoshi.pay({ from: user.id, to: client.user.id, amount: cost })) {
                } else {
                    notifyTextChannel.send(`<@${user.id}> could not afford to pay ${cost} ₥ for their rank ${user.rank}. Ranked down to ${totalProt}.`);
                    user.rank = totalProt;
                    await user.dbUpdate();
                }
            }
        }
    }

    async rankUp() {
        let answer = "";
        if (await Matoshi.pay({ from: this.id, to: client.user.id, amount: policyValues.rank.rankUp })) {
            const me = await User.get(this.id);
            this.rank++;
            await me.dbUpdate();
            answer += `You are now rank ${this.rank}. ${rankUpMessages[this.rank] || "Off the chart"}`;
        } else {
            answer += `Not enough Matoshi (${policyValues.rank.rankUp}  ₥, you have ${this.wallet.matoshi} ₥) `;
        }

        return answer;
    }

    async rankMessage() {
        const discordUser = await client.users.fetch(this.id);
        const kinoData = (await getUserData()).get(this.id);
        const kinoProt = Math.floor(kinoData.reliability * kinoData.weight * policyValues.rank.kinoProtect);
        const streakProt = Math.floor(this.streak * policyValues.rank.streakProtect);
        const totalProt = streakProt + kinoProt;

        const names = ["rank", "assigment bonus", "kino bonus", "expected cost", "assigment grace"].join("\n");
        const values = [
            this.rank,
            streakProt,
            kinoProt,
            Math.max((this.rank - totalProt) * policyValues.rank.dailyCost, 0) + " ₥",
            this.taskIds.length == 0 ? (this.streak > 0 ? `<t:${Math.floor((this.lastTask + User.assignmentGrace - 24 * 60 * 60 * 1000) / 1000)}:d>` : "off streak") : "active task",
        ].join("\n");

        const embed = new Discord.EmbedBuilder()
            .setTitle(discordUser.username)
            .setColor(discordUser.accentColor ?? 0xffffff)
            .addFields([
                { inline: true, name: "Field", value: names },
                { inline: true, name: "Value", value: values },
            ]);

        return embed;
    }
}

const rankUpMessages = [
    "Good start!",
    "Nice work!",
    "On the right path!",
    "Impressive effort!",
    "Well done!",
    "Great job!",
    "Making progress!",
    "Keep it up!",
    "You're advancing!",
    "Outstanding!",
    "Excellent work!",
    "Fantastic!",
    "Moving forward!",
    "Terrific effort!",
    "Bravo!",
    "Superb!",
    "Thumbs up!",
    "Solid improvement!",
    "You're on fire!",
    "Exceptional!",
    "Stellar work!",
    "Remarkable!",
    "Phenomenal effort!",
    "Top-notch!",
    "Awesome!",
    "Kudos!",
    "Splendid!",
    "Way to go!",
    "Remarkable progress!",
    "Marvelous job!",
    "Outstanding performance!",
    "Impressive progress!",
    "Splendid effort!",
    "Aced it!",
    "Magnificent!",
    "Bravo Zulu!",
    "Well executed!",
    "Admirable work!",
    "Splendiferous!",
    "You're crushing it!",
    "Exemplary!",
    "Ace job!",
    "Skillful!",
    "You're on the rise!",
    "Dazzling effort!",
    "Exceptional improvement!",
    "First-class!",
    "Masterful!",
    "Unbelievable!",
    "You are off the charts!",
];

export class Wallet extends DbObject {
    getStock(stock: string) {
        throw new Error("Method not implemented.");
    }
    setStock(stock: string, currentStock: any) {
        throw new Error("Method not implemented.");
    }
    matoshi: number = 0;
    stocks: Record<string, number> = {};
    printMatoshi() {
        console.log(this.matoshi);
    }

    static override async fromData(data: Partial<Wallet>): Promise<Wallet> {
        const newObj = (await super.fromData(data)) as Wallet;
        Object.assign(newObj, data);
        return newObj;
    }
}
