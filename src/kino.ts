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
    lockMessageId: string = "";
    constructor() {
        Event.list.push(this);
    }

    static fromCommand() {
        let event = new Event();
        Database.KinoDatabase.createEvent(event);
        return event;
    }

    static async startToday() {
        let response;
        const todayEvent = this.list.find(e => e.date && e.date.toDateString() == new Date().toDateString());
        if (todayEvent && todayEvent.film.watched == false) {
            const todayVoters = todayEvent.datePoll.getWinner().votes.map(vote => vote.userId);
            const onTimeUsers = Main.mainVoiceChannel.members.map(member => member.id);
            response = await Matoshi.lateFees(onTimeUsers, todayVoters, todayEvent.film.name);
            todayEvent.film.watched = true;
            Database.KinoDatabase.setFilm(todayEvent.film);
        } else {
            response = todayEvent.film.watched ? "Already started" : "No event for today";
        }
        return response;
    }

    static async kinoReward() {
        const todayEvent = this.list.find(e => e.date && e.date.toDateString() == new Date().toDateString());
        if (todayEvent && todayEvent.film.watched) {
            Main.mainVoiceChannel.send(
                await Matoshi.watchReward(Main.mainVoiceChannel.members.map(member => member.id))
            );
        }
    }

    static async filmVoteOptionFilter(name: string) {
        if ((await Database.KinoDatabase.getFilmByName(name)) == undefined) {
            throw new Error("Invalid option");
        }
        return Utilities.toTitleCase(name);
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
        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "lockFilmVote", label: "Confirm film selection", style: Discord.ButtonStyle.Success }));
        this.lockMessageId = (await interaction.channel.send({ components: [newActionRow] })).id;
        this.filmPoll.optionFilter = Event.filmVoteOptionFilter;
        Database.KinoDatabase.setEvent(this);
    }

    async dateVote(interaction: Discord.Interaction) {
        if (this.filmPoll && !this.film) {
            this.film = await Database.KinoDatabase.getFilmByName(this.filmPoll.getWinner().name);
            this.filmPoll.lock();
        }

        this.datePoll = await Polls.Poll.fromCommand(`Kdy bude ${this.film.name}?`, interaction, 0, true);
        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "lockDayVote", label: "Confirm day selection", style: Discord.ButtonStyle.Success }));
        this.lockMessageId = (await interaction.channel.send({ components: [newActionRow] })).id;

        try {
            let dayScores = await Sheets.getDaysScores();
            let sortedScores = [...dayScores.entries()].sort((a, b) => b[1] - a[1]);
            sortedScores = sortedScores.slice(0, Math.min(sortedScores.length, 5));
            let days = [...new Map(sortedScores).keys()];
            for (const [day, score] of dayScores) {
                if (days.includes(day)) {
                    await this.datePoll.addOption(Event.dateOptionName(day, score));
                }
            }
        } catch (error) {
            console.error("Error populating kino date poll: " + error);
        }
        this.datePoll.optionFilter = Event.dateVoteOptionFilter;
        Database.KinoDatabase.setEvent(this);
    }

    async lockDate() {
        if (!this.dateLocked) {
            this.dateLocked = true;
            let dateFields = this.datePoll.getWinner().name.split(" ")[1].split(".");
            this.date = new Date(Date.parse(new Date().getFullYear() + " " + dateFields[1] + " " + dateFields[0]));
            this.date.setHours(Main.policyValues.kino.defaultTimeHrs);
            this.datePoll.lock();
            let guildEventOptions: Discord.GuildScheduledEventCreateOptions = {
                name: "Kino: " + this.film.name,
                scheduledStartTime: this.date,
                scheduledEndTime: new Date(this.date.valueOf() + (1000 * 3600 * 2)),
                privacyLevel: Discord.GuildScheduledEventPrivacyLevel.GuildOnly,
                entityType: Discord.GuildScheduledEventEntityType.Voice,
                channel: Main.mainVoiceChannel as Discord.VoiceChannel,
                description: "Kino session of " + this.film.name,
            }
            try {
                let filmImageUrl = (await Main.googleSearch(Main.SearchEngines.EVERYTHING, "Movie still " + this.film.name, Main.SearchTypes.IMAGE))[0].link;
                guildEventOptions.image = filmImageUrl;
            } catch (error) {
                console.error("KinoEvent Image search error:" + error.message);
            }
            let guildEvent = await Main.mainGuild.scheduledEvents.create(guildEventOptions)
            this.datePoll.message.channel.send(await guildEvent.createInviteURL({ maxAge: 0 }));
            Database.KinoDatabase.setEvent(this);
        }
    }

    static fromDatabase(options: EventOptions) {
        let event = new Event();
        event.id = options.id;
        event.film = options?.film;
        event.date = options?.date;
        event.dateLocked = options.dateLocked;
        event.watched = options.watched;
        event.datePoll = options?.datePoll;
        event.filmPoll = options?.filmPoll;
        event.lockMessageId = options?.lockMessageId;
        return event;
    }

    private static dateOptionName(date: Date, score: number): string {
        return `${Utilities.weekdayEmoji(date.getDay())} ${Utilities.simpleDateString(date)} (${score})`;
    }

    static list = new Array<Event>();
}

export interface EventOptions {
    id: number,
    film?: Film,
    date?: Date,
    dateLocked: boolean,
    watched: boolean,
    filmPoll?: Polls.Poll,
    datePoll?: Polls.Poll,
    lockMessageId?: string
}


export async function interactionWeightCheck(interaction: Discord.Interaction) {
    let userWeight = (await Sheets.getUserData()).get(interaction.user.id).weight;
    const minWeight = .9;
    if (userWeight >= minWeight) {
        return true;
    }
    else {
        if (!(interaction instanceof Discord.AutocompleteInteraction))
            interaction.reply({ content: "Only users with kino weight over " + minWeight + " can do this! (Your weight is " + userWeight + ")", ephemeral: true });
        return false;
    }
}