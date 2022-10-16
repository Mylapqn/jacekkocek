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
        await connection.query(`INSERT INTO Films (name, suggested_by, watched) VALUES (\"${film.name}\",\"${film.suggestedBy}\",${film.watched})`).catch(e => { console.log("Film creation error: ", e) });
        film.id = (await connection.query("SELECT LAST_INSERT_ID()"))[0]["LAST_INSERT_ID()"];
        console.log("Created film ", film);
    }

    static async queryFilms(query: string) {
        let filmData = await connection.query(query);
        let films = new Array<Kino.Film>;
        for (const entry of filmData) {
            films.push(Kino.Film.fromDatabase(entry["id"], entry["name"], entry["suggested_by"], entry["watched"]));
        }
        return films;
    }

    static async getFilm(id) {
        let films = await this.queryFilms(`SELECT * FROM Films WHERE id=\"${id}\"`);
        if (films.length == 0) {
            //console.log("There is no film with id " + id);
            throw new Error("There is no film with id " + id);
        }
        return films[0];
    }

    static async getFilmByName(name: string) {
        let films = await this.queryFilms(`SELECT * FROM Films WHERE UPPER(name)=\"${name.toUpperCase()}\"`);
        if (films.length == 0) {
            //console.log("There is no film with id " + id);
            return undefined;
        }
        return films[0];
    }

    static async getAllFilms(onlyUnwatched = false) {
        let query = `SELECT * FROM Films`;
        if (onlyUnwatched) query += ` WHERE watched=1`
        let filmList = await this.queryFilms(query);
        return filmList;
    }

    static async setFilm(film: Kino.Film) {
        await connection.query(`UPDATE Films SET watched=${film.watched} WHERE id=${film.id}`);
    }

    static async createEvent(event: Kino.Event) {
        await connection.query(`INSERT INTO KinoEvent (watched) VALUES (${event.watched})`).catch(e => { console.log("KinoEvent creation error: ", e) });
        event.id = (await connection.query("SELECT LAST_INSERT_ID()"))[0]["LAST_INSERT_ID()"];
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
        await connection.query(`INSERT INTO Polls (message_id, name, last_interacted) VALUES (\"${messageToUid(poll.message)}\", \"${poll.name}\", \"${dateToSql(new Date())}\")`).catch(e => { console.log("Poll creation error: ", e) });
        poll.id = (await connection.query("SELECT LAST_INSERT_ID()"))[0]["LAST_INSERT_ID()"];
    }

    static async deletePoll(poll: Polls.Poll) {
        await connection.query(`DELETE FROM Polls WHERE id=${poll.id}`);
    }

    static async loadPolls() {
        let pollData: Array<Array<any>> = await connection.query(`SELECT * FROM Polls`);
        for (const pollRow of pollData) {
            let poll = new Polls.Poll(pollRow["name"])
            poll.id = pollRow["id"];
            let lastInteracted = new Date(pollRow["last_interacted"]);
            let age = Date.now() - lastInteracted.valueOf();
            if (age > 604800000) {
                PollDatabase.deletePoll(poll);
                console.log("Deleted old poll");
                continue;
            }
            poll.message = await messageFromUid(pollRow["message_id"]);
            if (!poll.message) {
                PollDatabase.deletePoll(poll);
                console.log("Deleted poll with missing message");
                continue;
            }
            Polls.Poll.list.push(poll);
            let options: Array<Array<any>> = await connection.query(`SELECT * FROM PollOptions WHERE poll=${poll.id}`);
            for (const optionRow of options) {
                let option = new Polls.PollOption(poll, optionRow["index"], optionRow["name"]);
                poll.options.push(option);
                let votes: Array<Array<any>> = await connection.query(`SELECT * FROM PollVotes WHERE poll=${poll.id} AND option_index=${option.index}`);
                poll.totalVotes += votes.length;
                for (const voteRow of votes) {
                    option.votes.push(new Polls.PollVote(poll, option.index, voteRow["user"]));
                }
            }
        }

        console.log("Loaded " + Polls.Poll.list.length + " polls");

    }

    static async addOption(option: Polls.PollOption) {
        await connection.query(`INSERT INTO PollOptions (\`index\`, poll, name) VALUES (${option.index}, ${option.poll.id}, \"${option.name}\")`).catch(e => { console.log("PollOption creation error: ", e) });
        await this.updateLastInteracted(option.poll);
    }

    static async addVote(vote: Polls.PollVote) {
        await connection.query(`INSERT INTO PollVotes (user, poll, option_index) VALUES (\"${vote.userId}\", ${vote.poll.id}, ${vote.option.index})`).catch(e => { console.log("PollVote creation error: ", e) });
        await this.updateLastInteracted(vote.poll);
    }

    static async removeVote(vote: Polls.PollVote) {
        await connection.query(`DELETE FROM PollVotes WHERE user=\"${vote.userId}\" AND poll=${vote.poll.id} AND option_index=${vote.option.index}`);
        await this.updateLastInteracted(vote.poll);
    }

    static async updateLastInteracted(poll: Polls.Poll) {
        await connection.query(`UPDATE Polls SET last_interacted=\"${dateToSql(new Date())}\" WHERE id=${poll.id}`);
    }
}


/**
 * @param {Date} date
 */
function dateToSql(date: Date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

function messageToUid(message: Message): string {
    return message.channelId + "/" + message.id;
}

async function messageFromUid(uid: string): Promise<Message> {
    let ids = uid.split("/")
    return await Utilities.fetchMessage(ids[0], ids[1]);
}