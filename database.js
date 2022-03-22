import mysql from "promise-mysql";
import { stockPresets } from "./stockPresets.js";

/**@type {mysql.Connection} */
let connection;
export async function init() {
    connection = await mysql.createConnection({ host: "localhost", user: "jacekkocek", password: process.env.DBPASSWORD, database: "jacekkocek" });
}

async function createUser(id) {
    await connection.query(`INSERT INTO Users VALUES (\"${id}\",0)`);
    for (const stockPreset of stockPresets) {
        await connection.query(`INSERT INTO Wallet (user, currency, amount) VALUES (\"${id}\",\"${stockPreset.id}\",0)`);
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
    stockPresets.forEach(preset=>{
        wallets.set(preset.id,0);
    })
    walletsData.forEach(wallet => {
        wallets.set(wallet.currency,wallet.amount);
    });
    userData.wallets = wallets;
    return userData;
}

export async function setUser(user){
    connection.query(`UPDATE Users SET matoshi=${user.matoshi} WHERE id=\"${user.id}\"`);
    for (const [currency,amount] of user.wallets) {
        console.log(currency,amount)
        connection.query(`INSERT INTO Wallet (user, currency, amount) VALUES (\"${user.id}\",\"${currency}\",${amount}) ON DUPLICATE KEY UPDATE amount = ${amount}`);
    }
}