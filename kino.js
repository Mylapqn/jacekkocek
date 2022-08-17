import * as Main from "./main.js";
import * as Utilities from "./utilities.js";
import * as Database from "./database.js";
import * as Matoshi from "./matoshi.js";



export class Event {
    id;
    /**
     * @type {Film}
     */
    film;
    date;
    dateLocked;
    watched = false;
    static fromCommand() {
        let event = new Event();
        Database.KinoDatabase.createEvent(event);
        return event;
    }
    

    static fromDatabase(id, film, date, dateLocked, watched) {
        let event = new Event();
        event.id = id;
        event.film = film;
        event.date = date;
        event.dateLocked = dateLocked;
        event.watched = watched;
        return event;
    }
}

export class Film {
    id;
    name;
    suggestedBy;
    watched = false;
    constructor(name, suggestedBy) {
        this.name = name;
        this.suggestedBy = suggestedBy;
    }

    static fromCommand(name, suggestedBy) {
        let film = new Film(name, suggestedBy);
        Database.KinoDatabase.createFilm(film);
        return film;
    }

    static fromDatabase(id, name, suggestedBy, watched) {
        let film = new Film(name, suggestedBy);
        film.id = id;
        film.suggestedBy = suggestedBy;
    }
}