import mysql from "promise-mysql";
import { stockPresets } from "./stockPresets";
import * as Utilities from "./utilities";
import * as Kino from "./kino";
import * as Polls from "./polls";
import * as Main from "./main";
import { Message } from "discord.js";

let connection: mysql.Connection;
export async function init() {
    connection = await mysql.createConnection({ host: "localhost", user: "jacekkocek", password: process.env.DBPASSWORD, database: "jacekkocek" });

    PollDatabase.loadPolls();
    //TEMP FIX FOR TIMEOUT
    setInterval(() => {
        connection.query(`SELECT * FROM Users WHERE id=\"0\"`);
    }, 1000 * 3600 * 2);


}

async function createUser(id) {
    await connection.query(`INSERT INTO Users VALUES (\"${id}\",0)`).catch(e => { console.log("User creation error: ", e) });
    for (const stockPreset of stockPresets) {
        await connection.query(`INSERT INTO Wallet (user, currency, amount) VALUES (\"${id}\",\"${stockPreset.id}\",0)`).catch(e => { console.log("Wallet creation error: ", e) });
    }
    return await connection.query(`SELECT * FROM Users WHERE id=\"${id}\"`);
}

export async function getUser(id) {
    let userData = await connection.query(`SELECT * FROM Users WHERE id=\"${id}\"`);
    if (userData.length == 0) {
        userData = await createUser(id);
    }
    userData = userData[0];
    let walletsData = await connection.query(`SELECT * FROM Wallet WHERE user=\"${id}\"`);
    let wallets = new Map();
    stockPresets.forEach(preset => {
        wallets.set(preset.id, 0);
    })
    walletsData.forEach(wallet => {
        wallets.set(wallet.currency, wallet.amount);
    });
    userData.wallets = wallets;
    return userData;
}

export async function setUser(user) {
    if (Utilities.isValid(user.matoshi))
        connection.query(`UPDATE Users SET matoshi=${user.matoshi} WHERE id=\"${user.id}\"`).catch(e => { console.log("Matoshi update error: ", e) });
    for (const [currency, amount] of user.wallets) {
        console.log(currency, amount)
        if (Utilities.isValid(amount))
            connection.query(`INSERT INTO Wallet (user, currency, amount) VALUES (\"${user.id}\",\"${currency}\",${amount}) ON DUPLICATE KEY UPDATE amount = ${amount}`).catch(e => { console.log("Wallet update error: ", e) });
    }
}

export class KinoDatabase {
    static async createFilm(film: Kino.Film) {
        await connection.query(`INSERT INTO Films (name, suggested_by) VALUES (\"${film.name}\",\"${film.suggestedBy}\")`).catch(e => { console.log("Film creation error: ", e) });
        film.id = await connection.query("SELECT LAST_INSERT_ID()")["LAST_INSERT_ID()"];
        console.log("Created film ", film);
    }

    static async getFilm(id) {
        let filmData = await connection.query(`SELECT * FROM Films WHERE id=\"${id}\"`);
        if (filmData.length == 0) {
            //console.log("There is no film with id " + id);
            throw new Error("There is no film with id " + id);
        }
        filmData = filmData[0]; //literally throw if ^^ is true
        return filmData;
    }

    static async setFilm(film: Kino.Film) {
        await connection.query(`UPDATE Films SET watched=${film.watched} WHERE id=${film.id}`);
    }

    static async createEvent(event: Kino.Event) {
        await connection.query(`INSERT INTO KinoEvent (watched) VALUES (${event.watched})`).catch(e => { console.log("KinoEvent creation error: ", e) });
        event.id = await connection.query("SELECT LAST_INSERT_ID()")["LAST_INSERT_ID()"];
        console.log("Created event ", event);
    }

    static async getEvent(id) {
        throw new Error("not implemented");
    }

    static async setEvent(event: Kino.Event) {
        await connection.query(`UPDATE KinoEvent SET film=${event.film.id}, date=${event.date}, date_locked=${event.dateLocked}, watched=${event.watched} WHERE id=${event.id}`);
    }
}
export class PollDatabase {

    static async createPoll(poll: Polls.Poll) {
        await connection.query(`INSERT INTO Polls (message_id, name) VALUES ("${messageToUid(poll.message)}", "${poll.name}")`).catch(e => { console.log("Poll creation error: ", e) });
        console.log(await connection.query("SELECT LAST_INSERT_ID()"));
        poll.id = await connection.query("SELECT LAST_INSERT_ID()")["LAST_INSERT_ID()"];
    }

    static async deletePoll(poll: Polls.Poll) {
        await connection.query(`DELETE FROM Polls WHERE id=${poll.id}`);
    }

    static async loadPolls() {
        let pollData: Array<Array<any>> = await connection.query(`SELECT * FROM Polls`);
        for (const pollRow of pollData) {
            let poll = new Polls.Poll(pollRow["name"])
            poll.id = pollRow["id"];
            poll.message = await messageFromUid(pollRow["message_id"]);
            let options: Array<Array<any>> = await connection.query(`SELECT * FROM PollOptions WHERE poll=${poll.id}`);
            for (const optionRow of options) {
                let option = new Polls.PollOption(poll, optionRow["index"], optionRow["name"]);
                poll.options.push(option);
                let votes: Array<Array<any>> = await connection.query(`SELECT * FROM PollVotes WHERE poll=${poll.id} AND option_index=${option.index}`);
                for (const voteRow of votes) {
                    option.votes.push(new Polls.PollVote(poll, option.index, voteRow["user"]));
                }
            }
        }

        console.log(Polls.Poll.list);

    }

    static async addOption(option: Polls.PollOption) {
        await connection.query(`INSERT INTO PollOptions (index, poll, name) VALUES (${option.index}, ${option.poll.id}, "${option.name}")`).catch(e => { console.log("PollOption creation error: ", e) });
    }

    static async addVote(vote: Polls.PollVote) {
        await connection.query(`INSERT INTO PollVotes (user, poll, option_index) VALUES ("${vote.userId}", ${vote.poll.id}, ${vote.option.index})`).catch(e => { console.log("PollVote creation error: ", e) });
    }

    static async removeVote(vote: Polls.PollVote) {
        await connection.query(`DELETE FROM PollVotes WHERE user="${vote.userId}" poll=${vote.poll.id} AND option_index=${vote.option.index}`);
    }
}


/**
 * @param {Date} date
 */
function dateToSql(date: Date) {
    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDay();
}

function messageToUid(message: Message): string {
    return message.channelId + "/" + message.id;
}

async function messageFromUid(uid: string): Promise<Message> {
    let ids = uid.split("/")
    return await Utilities.fetchMessage(ids[0], ids[1]);
}