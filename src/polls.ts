import { InviteGuild, Message, EmbedBuilder, TextChannel, User, TextBasedChannel, CommandInteraction, ChatInputCommandInteraction, EmbedFooterOptions } from "discord.js";
import * as Database from "./database";
import * as Main from "./main";
import * as Utilities from "./utilities"
import * as Youtube from "./youtube"


export class Poll {
    id: number;
    message: Message;
    name: string;
    options: PollOption[] = [];
    totalVotes = 0;
    maxVotesPerUser = 0;
    customOptionsAllowed = true;

    constructor(name = "Unnamed poll", maxVotesPerUser = 0, customOptionsAllowed = true) {
        this.name = name;
        this.maxVotesPerUser = maxVotesPerUser;
        this.customOptionsAllowed = customOptionsAllowed;
    }

    static async fromCommand(name: string, interaction: ChatInputCommandInteraction, maxVotesPerUser = 0, customOptionsAllowed = true) {
        let poll = new Poll(name, maxVotesPerUser, customOptionsAllowed);
        Poll.list.push(poll);
        await poll.sendMessage(interaction);
        await Database.PollDatabase.createPoll(poll);
        console.log("Creating poll with id " + poll.id);
        return poll;
    }

    generateMessage() {
        let embed = new EmbedBuilder().setColor(0x18C3B1).setTitle(this.name);
        let description = "";
        let footerText = "";
        /*for (const option of this.options) {
            newMessage += "\n`" + (option.index + 1) + "`: " + option.name
        }*/
        if (this.options.length == 0) description += "No options yet";
        if (this.options.length < 9 && this.customOptionsAllowed) footerText += "Reply to this message to add custom options";
        if (this.maxVotesPerUser != 0) {
            if (footerText != "") footerText += " | ";
            footerText += "Max votes per user: " + this.maxVotesPerUser;
        }
        if (footerText != "") embed.setFooter({ text: footerText });
        for (const option of this.options) {
            let votes = option.votes.length;
            let percentage = Math.round((votes / (this.totalVotes || 1) * 100));
            description += "\n" + Main.letterEmoji[(option.index + 1).toString()] + " " + Youtube.progressEmoji(Math.round(percentage / 25)) + " **" + option.name + "** (" + votes + " votes - " + percentage + "%)"
        }
        embed.setDescription(description);
        return { embeds: [embed] };
    }
    updateMessage() {
        this.message.edit(this.generateMessage());
    }
    async sendMessage(interaction: ChatInputCommandInteraction) {
        this.message = await interaction.reply({ embeds: this.generateMessage().embeds, fetchReply: true });
        for (let i = 1; i <= this.options.length && i <= 9; i++) {
            this.message.react(Main.letterEmoji[i.toString()]);
        }
        return this.message;
    }

    addOption(name: string) {
        if (this.options.length >= 9) throw new Error("Options limit reached");
        if (this.options.some(option => option.name == name)) throw new Error("Option already exists");
        name = name.replace(/[\r\n]/gm, '');
        name.trim();
        if (name.length > 244) {
            name = name.substring(0, 240) + "...";
        }
        let newOption = new PollOption(this, this.options.length, name);
        this.options.push(newOption);
        if (this.message != undefined) {
            this.updateMessage();
            this.message.react(Main.letterEmoji[this.options.length.toString()]);
        }
        Database.PollDatabase.addOption(newOption);
        console.log(`Added option to poll "${this.name}" with name ${name}`);
        return newOption;
    }

    addVote(optionIndex: number, userId: string) {
        if(optionIndex < this.options.length && optionIndex >= 0){
            if (this.maxVotesPerUser != 0) {
                let voteCount = 0;
                for (const option of this.options) voteCount += option.votes.find(v => v.userId == userId) ? 1 : 0;
                if (voteCount >= this.maxVotesPerUser - 1) {
                    //:frowning:
                    return false;
                }
            }
            let newVote = new PollVote(this, optionIndex, userId)
            this.options[optionIndex].votes.push(newVote);
            this.totalVotes++;
            this.updateMessage();
            Database.PollDatabase.addVote(newVote);
            console.log(`Added vote to poll "${this.name}" from user ${userId} for option ${optionIndex}`);
            return true;
        }
        return false;
    }

    removeVote(optionIndex: number, userId: string) {
        if (optionIndex < this.options.length && optionIndex >= 0) {
            for (let i = 0; i < this.options[optionIndex].votes.length; i++) {
                const vote = this.options[optionIndex].votes[i];
                if (vote.userId == userId) {
                    this.options[optionIndex].votes.splice(i, 1);
                    this.totalVotes--;
                    this.updateMessage();
                    Database.PollDatabase.removeVote(vote);
                    break;
                }
            }
        }
        console.log(`Removed vote from poll "${this.name}" from user ${userId} for option ${optionIndex}`);
    }

    static list = new Array<Poll>();
    static getPollFromMessage(message: Message) {
        return Poll.list.find(element => { return Utilities.matchMessages(element.message, message) });
    }
}

export class PollOption {
    index: number;
    name: string;
    poll: Poll;
    votes: PollVote[] = [];
    constructor(poll: Poll, index: number, name: string) {
        this.index = index;
        this.name = name;
        this.poll = poll;
    }
}

export class PollVote {
    option: PollOption;
    userId: string;
    poll: Poll;
    constructor(poll: Poll, optionIndex: number, userId: string) {
        this.poll = poll;
        this.option = this.poll.options[optionIndex];
        this.userId = userId;
    }
}