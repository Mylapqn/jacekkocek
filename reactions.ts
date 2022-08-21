import { client, updateKinoMessage, kinoData, letterEmoji, weekDayNames } from "./main.js"
import * as Polls from "./polls.js"
import * as Utilities from "./utilities.js"

export let reactionHandlers = {
    kino: data => {
        let kinoEntry = Array.from(kinoData.values()).find(element => { return element.message.id == data.message.id })
        if (kinoEntry) {
            let emojiName = data.emoji;
            let user = data.user;
            let kinoUser = kinoEntry.users.get(user.username);
            if (data.remove) {
                kinoUser.reactionCount -= 1;
                console.log("Reaction removed " + emojiName);
                //console.log("Current count: " + kinoUser.reactionCount);
                if (emojiName == "white_cross") {
                    if (kinoUser.reactionCount >= 1) {
                        kinoUser.response = 1;
                    }
                }
                if (kinoUser.reactionCount <= 0) {
                    kinoUser.response = 0;
                    kinoUser.reactionCount = 0;
                }
            }
            else {
                kinoUser.reactionCount++;
                console.log("Reaction " + emojiName);

                if (weekDayNames.indexOf(emojiName) != -1) {
                    //console.log("Current count: " + kinoUser.reactionCount);
                    kinoUser.response = 1;
                }
                if (emojiName == "white_cross") {
                    kinoUser.response = 2;
                }
            }
            updateKinoMessage(kinoEntry);

        }
    },
    poll: data => {
        /**
         * @type {Polls.Poll}
         */
        let poll = Polls.Poll.getPollFromMessage(data.message);
        if (poll) {
            try {
                console.log(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji }));
                let index = parseInt(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji })[0]);
                console.log(index);
                if (Utilities.isValid(index)) {
                    try {
                        if (data.remove)
                            poll.removeVote(index - 1, data.user.id);
                        else
                            poll.addVote(index - 1, data.user.id);
                    } catch (error) {
                        console.error(error)
                    }
                }
            } catch (error) {
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


export function handleMessageReaction(reaction, user, remove) {
    let emojiName = reaction.emoji.name;
    let message = reaction.message;
    if (user != client.user) {
        let data = {
            remove: remove,
            emoji: emojiName,
            message: message,
            user: user
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