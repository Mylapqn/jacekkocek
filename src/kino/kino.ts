import * as Main from "../main";
import * as Utilities from "../utilities";
import * as Matoshi from "../matoshi";
import * as Polls from "../polls";
import * as Discord from "discord.js";
import * as Sheets from "../sheets";
import { DbObject } from "../dbObject";
import { ObjectId } from "mongodb";
import * as lt from "long-timeout";

const earlyWarningHours = 6;

export class Event extends DbObject {
    static dbIgnore = [...super.dbIgnore, "softDeadlineWarningToken"];
    id: number;
    film?: Film;
    date: Date;
    datePoll: Polls.Poll;
    filmPoll: Polls.Poll;
    attendeeIds: string[];
    dateLocked = false;
    watched = false;
    lockMessageId: string = "";
    guildEventId: string;
    softDeadlineWarningToken?: lt.Timeout;
    constructor() {
        super();
        Event.list.push(this);
    }

    static fromCommand() {
        let event = new Event();
        event.dbUpdate();
        return event;
    }

    async start() {
        let response = "";
        if (!this.watched) {
            const todayVoters = this.attendeeIds;
            let onTimeUsers = Main.mainVoiceChannel.members.map((member) => member.id);
            setTimeout(async () => {
                onTimeUsers = Main.mainVoiceChannel.members.map((member) => member.id);
                Main.kinoChannel.send(await Matoshi.lateFees(onTimeUsers, todayVoters, this.film.name));
                this.film.watched = true;
                this.film.dbUpdate();
            }, 120 * 1000);
            response = "Kino is starting, late fees in 120s! " + this.attendeeIds.filter((id) => !onTimeUsers.includes(id)).map((id) => `<@${id}>`);
        } else {
            response = "Event already watched";
        }
        return response;
    }

    static async kinoReward() {
        const guildEvents = await Main.mainGuild.scheduledEvents.fetch();
        const activeEvent = this.list.find((k) => guildEvents.find((e, id) => k.guildEventId == id && e.isActive()));
        if (activeEvent && !activeEvent.watched) {
            activeEvent.watched = true;
            const voiceMembers = Main.mainVoiceChannel.members.map((member) => member.user);
            Main.kinoChannel.send(await Matoshi.watchReward(voiceMembers, activeEvent.film.name));

            Sheets.setKinoToday(activeEvent.film.name);

            const userData = await Sheets.getUserData();
            for (const [id, data] of userData) {
                if (voiceMembers.find((u) => u.id == id)) {
                    data.weight = Math.min(1, data.weight + 0.05);
                    if (activeEvent.attendeeIds.includes(id)) data.reliability = Math.min(1, data.reliability + 0.1);
                } else {
                    data.weight = Math.max(0, data.weight - 0.05);
                    if (activeEvent.attendeeIds.includes(id)) data.reliability = Math.max(0, data.reliability - 0.1);
                }
            }

            Sheets.setUserData(userData);

            activeEvent.dbUpdate();
        }
    }
    static filmVoteOptionFilter: Polls.PollOptionFilter = async (name: string) => {
        let film = await Film.dbFind({ name: Utilities.toTitleCase(name) });
        if (film == undefined) throw new Error("Invalid option");
        return Utilities.toTitleCase(name);
    };
    static dateVoteOptionFilter: Polls.PollOptionFilter = async (name: string) => {
        let date = Utilities.dateFromKinoString(name);
        if (date == undefined) {
            throw new Error("Invalid date");
        }
        let score = await Sheets.getDay(date);
        if (!score) throw new Error("Invalid kino date");
        return Event.dateOptionName(date, score);
    };

    async filmVote(interaction: Discord.ChatInputCommandInteraction) {
        const softDeadline = new Date(Date.now() + Utilities.H2Ms(Main.policyValues.kino.voteBonusHrs));

        this.filmPoll = await Polls.Poll.fromCommand("Co kino?", interaction, 0, true, softDeadline);

        this.softDeadlineWarningToken = lt.setTimeout(async () => {
            this.remindHeavyVoters(this.filmPoll.earlyVoters);
        }, Utilities.H2Ms(Main.policyValues.kino.voteBonusHrs - earlyWarningHours));

        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "lockFilmVote", label: "Confirm film selection", style: Discord.ButtonStyle.Success }));
        this.lockMessageId = (await interaction.channel.send({ components: [newActionRow] })).id;
        this.filmPoll.optionFilter = Event.filmVoteOptionFilter;
        this.dbUpdate();
    }

    async dateVote(interaction: Discord.Interaction) {
        console.log(this.film);

        if (this.filmPoll && !this.film) {
            console.log(this.filmPoll.getWinner().name);
            await this.rewardEarlyVoters(this.filmPoll);

            this.film = await Film.get(this.filmPoll.getWinner().name);
            this.filmPoll.lock();
            if (this.softDeadlineWarningToken) lt.clearTimeout(this.softDeadlineWarningToken);
        }

        const softDeadline = new Date(Date.now() + Utilities.H2Ms(Main.policyValues.kino.voteBonusHrs));
        this.datePoll = await Polls.Poll.fromCommand(`Kdy bude ${this.film.name}?`, interaction, 0, true, softDeadline);
        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "lockDayVote", label: "Confirm day selection", style: Discord.ButtonStyle.Success }));
        this.lockMessageId = (await interaction.channel.send({ components: [newActionRow] })).id;

        this.softDeadlineWarningToken = lt.setTimeout(async () => {
            this.remindHeavyVoters(this.datePoll.earlyVoters);
        }, Utilities.H2Ms(Main.policyValues.kino.voteBonusHrs - earlyWarningHours));

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
        this.dbUpdate();
    }

    async rewardEarlyVoters(poll: Polls.Poll) {
        if (Main.policyValues.kino.voteBonusReward > 0) {
            for (const userId of poll.earlyVoters) {
                Matoshi.pay({ amount: Main.policyValues.kino.voteBonusReward, from: Main.client.user.id, to: userId }, false);
            }
            await Main.kinoChannel.send(`Thank you for voting early ${[...poll.earlyVoters].map((id) => `<@${id}>`).join(", ")}! ${Main.policyValues.kino.voteBonusReward}₥ awarded.`);
        }
    }

    async remindHeavyVoters(skipVoters: Set<string>) {
        if (Main.policyValues.kino.voteBonusReward > 0) {
            let usersToPing = [];
            const data = await Sheets.getUserData();
            for (const [userId, datum] of data) {
                if (skipVoters.has(userId)) continue;
                if (datum.weight > 0.5) {
                    usersToPing.push(userId);
                }
            }

            if (usersToPing.length > 0) {
                await Main.kinoChannel.send(`Make sure to vote soon ${[...usersToPing].map((id) => `<@${id}>`).join(", ")}! ${earlyWarningHours} hours left.`);
            } else {
                await Main.kinoChannel.send(`Lots of votes! :relieved:`);
            }
        }
    }

    async lockDate() {
        if (!this.dateLocked) {
            await this.rewardEarlyVoters(this.datePoll);
            this.dateLocked = true;
            this.attendeeIds = this.datePoll.getWinner().votes.map((v) => v.userId);
            let dateFields = this.datePoll.getWinner().name.split(" ")[1].split(".");
            this.date = new Date(Date.parse(new Date().getFullYear() + " " + dateFields[1] + " " + dateFields[0]));
            this.date.setHours(Main.policyValues.kino.defaultTimeHrs);
            this.date.setMinutes((Main.policyValues.kino.defaultTimeHrs % 1) * 60);
            this.date = new Date(this.date.valueOf() + Utilities.getTimeOffset(new Date(), Main.defaultTimeZone));
            console.log(this.date);
            this.datePoll.lock();
            let guildEventOptions: Discord.GuildScheduledEventCreateOptions = {
                name: "Kino: " + this.film.name,
                scheduledStartTime: this.date,
                scheduledEndTime: this.date.valueOf() + 2 * 60 * 60 * 1000,
                privacyLevel: Discord.GuildScheduledEventPrivacyLevel.GuildOnly,
                entityType: Discord.GuildScheduledEventEntityType.Voice,
                channel: Main.mainVoiceChannel as Discord.VoiceChannel,
                description: "Kino session of " + this.film.name,
            };
            try {
                let filmImageUrl = (await Main.googleSearch(Main.SearchEngines.EVERYTHING, "Movie still " + this.film.name, Main.SearchTypes.IMAGE))[0].link;
                guildEventOptions.image = filmImageUrl;
            } catch (error) {
                console.error("KinoEvent Image search error:" + error.message);
            }
            let guildEvent = await Main.mainGuild.scheduledEvents.create(guildEventOptions);
            this.guildEventId = guildEvent.id;
            this.datePoll.message.channel.send(await guildEvent.createInviteURL({ maxAge: 0 }));
            this.dbUpdate();
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
        event.attendeeIds = options?.attendeeIds;
        event.guildEventId = options?.guildEventId;
        return event;
    }

    private static dateOptionName(date: Date, score: number): string {
        return `${Utilities.weekdayEmoji(date.getDay())} ${Utilities.simpleDateString(date)} (${score})`;
    }

    static list = new Array<Event>();

    override serialisable() {
        const data = super.serialisable();
        data.datePoll = this.datePoll?._id;
        data.filmPoll = this.filmPoll?._id;
        data.film = this.film?.name;

        return data;
    }

    static override async fromData(data: Partial<Event>): Promise<Event> {
        const newObject = (await super.fromData(data)) as Event;
        Object.assign(newObject, data);
        newObject.datePoll = Polls.Poll.list.find((p) => p._id.equals(data.datePoll as unknown as ObjectId));
        newObject.filmPoll = Polls.Poll.list.find((p) => p._id.equals(data.filmPoll as unknown as ObjectId));
        newObject.film = await Film.get(data.film as unknown as string);
        if (!data.watched && (newObject.datePoll || newObject.filmPoll)) {
            let relevantPoll = data.film ? newObject.datePoll : newObject.filmPoll;
            if (relevantPoll.message) {
                if (relevantPoll.softDeadline) {
                    newObject.softDeadlineWarningToken = lt.setTimeout(async () => {
                        newObject.remindHeavyVoters(relevantPoll.earlyVoters);
                    }, relevantPoll.softDeadline.valueOf() - Date.now());
                }
            }
        }
        return newObject;
    }

    static async loadEvents() {
        const eventData = (await this.dbFindAll({})) as Event[];
        for (const data of eventData) {
            this.list.push(await Event.fromData(data));
        }
    }
}

export interface EventOptions {
    id: number;
    film?: Film;
    date?: Date;
    dateLocked: boolean;
    watched: boolean;
    filmPoll?: Polls.Poll;
    datePoll?: Polls.Poll;
    lockMessageId?: string;
    attendeeIds?: string[];
    guildEventId?: string;
}

export async function interactionWeightCheck(interaction: Discord.Interaction) {
    let userWeight = (await Sheets.getUserData()).get(interaction.user.id).weight;
    const minWeight = 0.9;
    if (userWeight >= minWeight || (interaction.member.roles as Discord.GuildMemberRoleManager).cache.find((e) => e == Main.managerRole)) {
        return true;
    } else {
        if (!(interaction instanceof Discord.AutocompleteInteraction))
            interaction.reply({ content: "Only users with kino weight over " + minWeight + " can do this! (Your weight is " + userWeight + ")", ephemeral: true });
        return false;
    }
}

export class Film extends DbObject {
    suggestedBy: string;
    watched = false;
    name: string;

    static async fromCommand(name: string, suggestedBy: string) {
        let film = await Film.fromData({ name, suggestedBy });
        await film.dbUpdate();
        return film;
    }

    static override async fromData(data: Partial<Film>): Promise<Film> {
        const newObj = (await super.fromData(data)) as Film;
        Object.assign(newObj, data);
        return newObj;
    }

    static async get(name: string) {
        const filmData = await Film.dbFind({ name });
        if (!filmData) return undefined;
        return await this.fromData(filmData);
    }
}
