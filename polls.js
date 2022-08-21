import { InviteGuild, Message, MessageEmbed, TextChannel, User } from "discord.js";
import * as Main from "./main.js";
import * as Utilities from "./utilities.js"

export class Poll {
    id;
    /**
     * @type {Message}
     */
    message;
    name = "Unnamed poll";
    /**
     * @type {PollOption[]}
     */
    options = [];
    totalVotes = 0;

    constructor(name) {
        if (name && name != null)
            this.name = name;
        Poll.list.push(this);
    }
    generateMessage() {
        let embed = new MessageEmbed().setColor([24, 195, 177]).setTitle(this.name)
        embed.description = "";
        /*for (const option of this.options) {
            newMessage += "\n`" + (option.index + 1) + "`: " + option.name
        }*/
        if (this.options.length == 0) embed.description += "No options yet";
        if (this.options.length < 9) embed.setFooter({ text: "Reply to this message to add custom options" });
        for (const option of this.options) {
            embed.description += "\n" + Main.letterEmoji[(option.index + 1).toString()] + " " + option.name + " (" + option.votes.length + " votes - " + (option.votes.length / (this.totalVotes || 1) * 100).toFixed(0) + "%)"
        }
        return { embeds: [embed] };
    }
    updateMessage() {
        this.message.edit(this.generateMessage());
    }
    /**
     * @param {TextChannel} channel
     */
    async sendMessage(channel) {
        this.message = await channel.send(this.generateMessage());
        for (let i = 1; i <= this.options.length && i <= 9; i++) {
            this.message.react(Main.letterEmoji[i.toString()]);
        }
        return this.message;
    }
    addOption(name) {
        if (this.options.length >= 9) throw new Error("Options limit reached");
        if (this.options.some(option => option.name == name)) throw new Error("Option already exists");
        let newOption = new PollOption(this, this.options.length, name);
        this.options.push(newOption);
        if (this.message != undefined) {
            this.updateMessage();
            this.message.react(Main.letterEmoji[this.options.length.toString()]);
        }
        console.log(`Added option to poll "${this.name}" with name ${name}`);
    }
    addVote(optionIndex, userId) {
        if (optionIndex < this.options.length && optionIndex >= 0) {
            this.options[optionIndex].votes.push(new PollVote(this, optionIndex, userId));
            this.totalVotes++;
            this.updateMessage();
            console.log(`Added vote to poll "${this.name}" from user ${userId} for option ${optionIndex}`);
        }
    }
    removeVote(optionIndex, userId) {
        if (optionIndex < this.options.length && optionIndex >= 0) {
            for (let i = 0; i < this.options[optionIndex].votes.length; i++) {
                const vote = this.options[optionIndex].votes[i];
                if (vote.userId == userId) {
                    this.options[optionIndex].votes.splice(i, 1);
                    this.totalVotes--;
                    this.updateMessage();
                    break;
                }
            }
        }
        console.log(`Removed vote from poll "${this.name}" from user ${userId} for option ${optionIndex}`);
    }


    static list = [];
}

export class PollOption {
    index;
    name;
    poll;
    /**
     * @type {PollVote[]}
     */
    votes = [];
    /**
     * @param {number} index
     * @param {Poll} poll
     * @param {string} name
     */
    constructor(poll, index, name) {
        this.index = index;
        this.name = name;
        this.poll = poll;
    }
}

export class PollVote {
    option;
    userId;
    poll;
    /**
     * @param {Poll} poll
     * @param {number} optionIndex
     * @param {User} userId
     */
    constructor(poll, optionIndex, userId) {
        this.poll = poll;
        this.option = this.poll.options[optionIndex];
        this.userId = userId;
    }
}