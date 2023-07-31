import * as Discord from "discord.js";
//import * as Utilities from "./utilities"
import { DbObject } from "./dbObject";

export type PollOptionFilter = (option: string) => Promise<string>;


export class Poll extends DbObject {
    messageId: string;
    message: Discord.Message;
    name: string;
    options: PollOption[] = [];
    totalVotes = 0;
    maxVotesPerUser = 0;
    customOptionsAllowed = true;

    optionFilter: PollOptionFilter = async (option: string) => option //option.escapeFormatting(option);


    static async fromCommand(name: string, interaction: Discord.Interaction, maxVotesPerUser = 0, customOptionsAllowed = true) {
        let poll = Poll.fromData({ name, maxVotesPerUser, customOptionsAllowed });
        Poll.list.push(poll);
        //await poll.sendMessage(interaction);
        poll._id = await poll.update();
        console.log("Creating poll with id " + poll._id);
        return poll;
    }

    getWinner() {
        let max = 0;
        let winner: PollOption;
        for (const option of this.options) {
            if (option.votes.length > max) {
                winner = option;
                max = option.votes.length;
            }
        }
        return winner;
    }

    async lock() {
        this.name += " [Locked]"
        let newMessage = this.generateMessage();
        this.message.edit({ embeds: [newMessage.embeds[0].setFooter({ text: "You can't vote in this poll anymore" }).setColor(0x888888)] });
        Poll.list.splice(Poll.list.indexOf(this), 1);
        //Database.PollDatabase.deletePoll(this);
    }

    generateMessage() {
        let embed = new Discord.EmbedBuilder().setColor(0x18C3B1).setTitle(this.name);
        let description = "";
        let footerText = "";
        /*for (const option of this.options) {
            newMessage += "\n`" + (option.index + 1) + "`: " + option.name
        }*/
        if (this.options.length == 0) description += "No options yet";
        if (this.maxVotesPerUser != 0) {
            footerText += "Max votes per user: " + this.maxVotesPerUser;
        }
        if (this.options.length < 9 && this.customOptionsAllowed) {
            if (footerText != "") footerText += " | ";
            footerText += "Reply to this message to add custom options";
        }
        if (footerText != "") embed.setFooter({ text: footerText });
        for (const option of this.options) {
            let votes = option.votes.length;
            let percentage = Math.round((votes / (this.totalVotes || 1) * 100));
            //description += "\n" + Main.letterEmoji[(option.index + 1).toString()] + " " + Youtube.progressEmoji(Math.round(percentage / 25)) + " **" + option.name + "** (" + votes + " votes - " + percentage + "%)"
        }
        embed.setDescription(description);
        return { embeds: [embed] };
    }
    async updateMessage() {
        //this.message.edit({ embeds: this.generateMessage().embeds });
    }
    async sendMessage(interaction: Discord.Interaction) {
        if (interaction instanceof Discord.AutocompleteInteraction) throw new Error("Unexpected autocomplete interaction");
        this.message = await interaction.reply({ embeds: this.generateMessage().embeds, fetchReply: true });
        this.messageId = this.message.id;
        for (let i = 1; i <= this.options.length && i <= 9; i++) {
            //this.message.react(Main.letterEmoji[i.toString()]);
        }
        return this.message;
    }

    async addOption(name: string) {
        if (this.options.length >= 9) throw new Error("Options limit reached");
        let newName: string;
        try {
            newName = await this.optionFilter(name);
        } catch (error) {
            console.error("Poll filter error: " + error);
        }
        if (!newName) return;
        if (this.options.some(option => option.name == newName)) throw new Error("Option already exists");
        newName = newName.replace(/[\r\n]/gm, ''); //Remove line breaks
        newName.trim();
        if (newName.length > 244) {
            newName = newName.substring(0, 240) + "...";
        }
        let newOption = new PollOption(this.options.length, newName);
        this.options.push(newOption);
        if (this.message != undefined) {
            this.updateMessage();
            //this.message.react(Main.letterEmoji[this.options.length.toString()]);
        }
        this.update();
        console.log(`Added option to poll "${this.name}" with name ${newName}`);
        return newOption;
    }

    addVote(optionIndex: number, userId: string) {
        if (optionIndex < this.options.length && optionIndex >= 0) {
            if (this.maxVotesPerUser != 0) {
                let voteCount = 0;
                for (const option of this.options) voteCount += option.votes.find(v => v.userId == userId) ? 1 : 0;
                if (voteCount >= this.maxVotesPerUser) {
                    //:frowning:
                    return false;
                }
            }
            let newVote = new PollVote(userId)
            this.options[optionIndex].votes.push(newVote);
            this.totalVotes++;
            this.updateMessage();
            this.update();
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
                    this.update();
                    console.log(`Removed vote from poll "${this.name}" from user ${userId} for option ${optionIndex}`);
                    break;
                }
            }
        }
    }

    static override fromData(data: Partial<Poll>): Poll {
        const newObj = super.fromData(data);
        Object.apply(newObj, data);
        return newObj as Poll;
    }

    static list = new Array<Poll>();
    static getPollFromMessage(message: Discord.Message) {
        // return Poll.list.find(element => { return Utilities.matchMessages(element.message, message) });
    }
}

export class PollOption extends DbObject {
    index: number;
    name: string;
    votes: PollVote[] = [];
    constructor(index: number, name: string) {
        super();
        this.index = index;
        this.name = name;
    }
}

export class PollVote extends DbObject {
    userId: string;
    constructor(userId: string) {
        super();
        this.userId = userId;
    }
}