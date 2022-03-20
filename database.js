import mysql from "promise-mysql";

/**@type {mysql.Connection} */
let connection;
export async function init() {
    connection = await mysql.createConnection({ host: "", user: "", password: "", database: "" });
}

function createUser(id) {
    connection.query(`INSERT INTO Users VALUES (${id},0)`);
}