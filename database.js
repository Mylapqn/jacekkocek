import mysql from "promise-mysql";

/**@type {mysql.Connection} */
let connection;
export async function init() {
    connection = await mysql.createConnection({ host: "", user: "", password: "", database: "" });
}

async function createUser(id) {
    await connection.query(`INSERT INTO Users VALUES (${id},0)`);
    return await connection.query(`SELECT * FROM Users WHERE id=${id}`);
}

export async function getUser(id) {
    let userData = await connection.query(`SELECT * FROM Users WHERE id=${id}`);
    if (userData.length == 0) {
        userData = await createUser(id);
    }
    userData = userData[0];
    return userData;
}