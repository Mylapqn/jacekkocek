import mysql from "promise-mysql";
import * as Kino from "./kino";

let connection: mysql.Connection;
export async function migrate() {
    connection = await mysql.createConnection({
        host: "localhost",
        user: "jacekkocek",
        password: process.env.DBPASSWORD,
        database: "jacekkocek",
        typeCast: function (field, next) {
            if (field.type === 'TINY' && field.length === 1) {
                return (field.string() === '1'); // 1 = true, 0 = false
            } else {
                return next();
            }
        }
    });

    KinoDatabase.migrateAll();
}

export class KinoDatabase {
    static async queryFilms(query: string) {
        let filmData = await connection.query(query);
        let films = new Array<Kino.Film>;
        for (const entry of filmData) {
            const film = await Kino.Film.fromCommand( entry["name"], entry["suggested_by"]);
            film.watched = entry["watched"];
            film.dbUpdate();
        }
        return films;
    }

    static async migrateAll() {
        let query = `SELECT * FROM Films`;
        let filmList = await this.queryFilms(query);
        return filmList;
    }
}
