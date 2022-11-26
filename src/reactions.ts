import { MessageReaction, PartialMessageReaction, User, PartialUser } from "discord.js";
import { client, letterEmoji, weekDayNames } from "./main"
import * as Polls from "./polls"
import * as Utilities from "./utilities"
export let reactionHandlers = {
    poll: data => {
        let poll = Polls.Poll.getPollFromMessage(data.message);
        if (poll) {
            try {
                //console.log(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji }));
                let index = parseInt(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji })[0]);
                //console.log(index);
                if (Utilities.isValid(index)) {
                    try {
                        if (data.remove) {
                            poll.removeVote(index - 1, data.user.id);
                        }
                        else {
                            if (!poll.addVote(index - 1, data.user.id)) {
                                data.reactionObject.users.remove(data.user);
                            }
                        }
                    } catch (error) {
                        console.error(error)
                    }
                }
            } catch (error) {
                if (!data.remove) data.reactionObject.users.remove(data.user);
                console.error("Couldn't translate reaction to number");
                //throw new Error("Couldn't translate reaction to number");
            }
        }
    },
    koce: data => {
        if (data.message.content.toLowerCase().includes("koče")) {
            if (data.remove)
                data.message.reply("koče removed");
            else
                data.message.reply("koče");
        }
    }
}


export async function handleMessageReaction(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, remove: boolean) {
    reaction = await reaction.fetch();
    user = await user.fetch();
    //console.log("React", reaction);
    let emojiName = reaction.emoji.name;
    let message = reaction.message;

    if (user != client.user) {
        let data = {
            remove: remove,
            emoji: emojiName,
            message: message,
            user: user,
            reactionObject: reaction
        }
        for (const p of Object.keys(reactionHandlers)) {
            try {
                reactionHandlers[p](data);
            } catch (error) {
                console.error(error);
            }
        }
    }
}