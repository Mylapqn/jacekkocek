import * as Main from "./main";
import * as Utilities from "./utilities";
import * as Database from "./database";
import * as Matoshi from "./matoshi";
import * as Polls from "./polls";



export class Event {
    id: number;
    film: Film;
    date: string;
    datePoll: Polls.Poll;
    filmPoll: Polls.Poll;
    dateLocked = false;
    watched = false;
    static fromCommand() {
        let event = new Event();
        Database.KinoDatabase.createEvent(event);
        return event;
    }


    static fromDatabase(id: number, film: Film, date: string, dateLocked: boolean, watched: boolean) {
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
    id: number;
    name: string;
    suggestedBy: string;
    watched = false;
    constructor(name: string, suggestedBy: string) {
        this.name = name;
        this.suggestedBy = suggestedBy;
    }

    static fromCommand(name: string, suggestedBy: string) {
        let film = new Film(name, suggestedBy);
        Database.KinoDatabase.createFilm(film);
        return film;
    }

    static fromDatabase(id: number, name: string, suggestedBy: string, watched: boolean) {
        let film = new Film(name, suggestedBy);
        film.id = id;
        film.suggestedBy = suggestedBy;
    }
}