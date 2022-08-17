import mysql from "promise-mysql";
import { stockPresets } from "./stockPresets.js";
import * as Utilities from "./utilities.js";
import * as Kino from "./kino.js";

/**@type {mysql.Connection} */
let connection;
export async function init() {
    connection = await mysql.createConnection({ host: "localhost", user: "jacekkocek", password: process.env.DBPASSWORD, database: "jacekkocek" });

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
    /**
     * @param {Kino.Film} film
     */
    static async createFilm(film) {
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

    /**
     * @param {Kino.Film} film
     */
    static async setFilm(film) {
        await connection.query(`UPDATE Films SET watched=${film.watched} WHERE id=${film.id}`);
    }

    /**
     * @param {Kino.Event} event
     */
    static async createEvent(event) {
        await connection.query(`INSERT INTO KinoEvent (watched) VALUES (${event.watched})`).catch(e => { console.log("KinoEvent creation error: ", e) });
        event.id = await connection.query("SELECT LAST_INSERT_ID()")["LAST_INSERT_ID()"];
        console.log("Created event ", event);
    }

    static async getEvent() {
        let eventData;
        if (eventData.length == 0) {
            console.log("There is no film with id " + id);
        }
        eventData = eventData[0];
    }

    /**
     * @param {Kino.Event} event
     */
    static async setEvent(event) {
        await connection.query(`UPDATE KinoEvent SET film=${event.film.id}, date=${dateToSql(event.date)}, date_locked=${event.dateLocked}, watched=${event.watched} WHERE id=${event.id}`);
    }
}
export class PollDatabase {
    
}


/**
 * @param {Date} date
 */
function dateToSql(date) {
    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDay();
}