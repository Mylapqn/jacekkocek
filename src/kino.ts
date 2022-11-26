import * as Main from "./main";
import * as Utilities from "./utilities";
import * as Database from "./database";
import * as Matoshi from "./matoshi";
import * as Polls from "./polls";
import * as Discord from "discord.js";
import * as Sheets from "./sheets"


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
        film.watched = watched;
        return film;
    }
}


export class Event {
    id: number;
    film: Film;
    date: Date;
    datePoll: Polls.Poll;
    filmPoll: Polls.Poll;
    dateLocked = false;
    watched = false;
    constructor() {
        Event.list.push(this);
    }

    static fromCommand() {
        let event = new Event();
        Database.KinoDatabase.createEvent(event);
        return event;
    }
    static async filmVoteOptionFilter(name: string) {
        if ((await Database.KinoDatabase.getFilmByName(name)) == undefined) {
            throw new Error("Invalid option");
        }
        return name;
    }
    static async dateVoteOptionFilter(name: string) {
        let date = Utilities.dateFromKinoString(name)
        if (date == undefined) {
            throw new Error("Invalid date");
        }
        let score = await Sheets.getDay(date);
        if (!score) throw new Error("Invalid kino date");
        return Event.dateOptionName(date, score);
    }

    async filmVote(interaction: Discord.ChatInputCommandInteraction) {
        this.filmPoll = await Polls.Poll.fromCommand("Co kino?", interaction, 0, true);
        let embeds = this.filmPoll.message.embeds;
        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "lockFilmVote", label: "Lock", style: Discord.ButtonStyle.Success }));
        this.filmPoll.message.edit({ embeds: embeds, components: [newActionRow] })
        this.filmPoll.optionFilter = Event.filmVoteOptionFilter;
        Database.KinoDatabase.setEvent(this);
    }

    async dateVote(interaction: Discord.ChatInputCommandInteraction) {
        if (this.filmPoll && !this.film) {
            this.film = await Database.KinoDatabase.getFilmByName(this.filmPoll.getWinner().name);
            Polls.Poll.list.splice(Polls.Poll.list.indexOf(this.filmPoll), 1);
            Database.PollDatabase.deletePoll(this.filmPoll);
        }

        this.datePoll = await Polls.Poll.fromCommand(`Kdy bude ${this.film.name}?`, interaction, 0, true);
        let dayScores = await Sheets.getDaysScores();
        let sortedScores = [...dayScores.entries()].sort((a, b) => b[1] - a[1]);
        sortedScores = sortedScores.slice(0, Math.min(sortedScores.length, 5));
        let days = [...new Map(sortedScores).keys()];
        for (const [day, score] of dayScores) {
            if (days.includes(day)) {
                await this.datePoll.addOption(Event.dateOptionName(day, score));
            }
        }
        this.datePoll.optionFilter = Event.dateVoteOptionFilter;
        Database.KinoDatabase.setEvent(this);
    }

    static fromDatabase(id: number, film: Film, date: Date, dateLocked: boolean, watched: boolean, filmPoll: Polls.Poll, datePoll: Polls.Poll) {
        let event = new Event();
        event.id = id;
        event.film = film;
        event.date = date;
        event.dateLocked = dateLocked;
        event.watched = watched;
        event.datePoll = datePoll;
        event.filmPoll = filmPoll;
        return event;
    }

    private static dateOptionName(date: Date, score: number): string {
        return `${Utilities.weekdayEmoji(date.getDay())} ${Utilities.simpleDateString(date)} (${score})`;
    }

    static list = new Array<Event>();
}

