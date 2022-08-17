import { Message, TextChannel } from "discord.js";
import * as Main from "./main.js";

export class Poll{
    id;
    /**
     * @type {Message}
     */
    message;
    name;
    /**
     * @type {PollOption[]}
     */
    options = [];
    votes = [];

    constructor(name){
        this.name = name;
        Poll.list.push(this);
    }

    addOption(name){
        let newOption = new PollOption(this.options.length,this,name);
        this.options.push(newOption);
    }
    generateMessage(){
        let newMessage = "Poll: **"+this.name+"**";
        for (const option of this.options) {
            newMessage+="\n"+option.index+": "+option.name
        }
        return newMessage;
    }
    updateMessage(){
        this.message.edit(this.generateMessage());
    }
    /**
     * @param {TextChannel} channel
     */
    async sendMessage(channel){
        this.message = await channel.send(this.generateMessage());
        for (let i = 1; i <= this.options.length && i <= 9; i++) {
            this.message.react(Main.letterEmoji[i.toString()]);
        }
        return this.message;
    }

    static list = [];
}

export class PollOption{
    index;
    name;
    poll;
    /**
     * @param {number} index
     * @param {Poll} poll
     * @param {string} name
     */
    constructor(index,poll,name){
        this.index=index;
        this.name=name;
        this.poll=poll;
    }
}