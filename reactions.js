import { client, updateKinoMessage, kinoData, letterEmoji } from "./main.js"
import * as Polls from "./polls.js"
import * as Utilities from "./utilities.js"

export let reactionFilters = {
    kino: msg => { return Array.from(kinoData.values()).find(element => { return element.message.id == msg.id }) },
    poll: msg => { return Polls.Poll.list.find(element => { return element.message === msg }) },
    koce: msg => { return msg.content.toLowerCase().includes("koče") },
}

export let reactionAddHandlers = {
    kino: data => {
        let kinoData = data.handler;
        let emojiName = data.emoji;
        let user = data.user;
        let kinoUser = kinoData.users.get(user.username);

        kinoUser.reactionCount++;
        console.log("Reaction " + emojiName);

        if (weekDayNames.indexOf(emojiName) != -1) {
            //console.log("Current count: " + kinoUser.reactionCount);
            kinoUser.response = 1;
        }
        if (emojiName == "white_cross") {
            kinoUser.response = 2;
        }

        updateKinoMessage(kinoData);


    },
    poll: data => {
        /**
         * @type {Polls.Poll}
         */
        let poll = data.handler;
        try {
            console.log(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji }));
            let index = parseInt(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji })[0]);
            console.log(index);
            if (Utilities.isValid(index)) {
                try {
                    poll.addVote(index - 1, data.user.id);
                } catch (error) {
                    console.error(error)
                }
            }
        } catch (error) {
            console.error("Couldn't translate reaction to number");
            //throw new Error("Couldn't translate reaction to number");
        }
    },
    koce: data => {
        data.message.reply("koče");
    }
}

export let reactionRemoveHandlers = {
    kino: data => {
        let kinoData = data.handler;
        let emojiName = data.emoji;
        let user = data.user;
        let kinoUser = kinoData.users.get(user.username);

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
        updateKinoMessage(kinoData);


    },
    poll: data => {
        /**
         * @type {Polls.Poll}
         */
        let poll = data.handler;
        try {
            console.log(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji }));
            let index = parseInt(Object.entries(letterEmoji).find(e => { return e[1] === data.emoji })[0]);
            console.log(index);
            if (Utilities.isValid(index)) {
                try {
                    poll.removeVote(index - 1, data.user.id);
                } catch (error) {
                    console.error(error)
                }
            }
        } catch (error) {
            console.error("Couldn't translate reaction to number");
            //throw new Error("Couldn't translate reaction to number");
        }
    },
    koce: data => {
        data.message.reply("koče removed");
    }
}

export function handleMessageReaction(reaction, user, remove) {
    let emojiName = reaction.emoji.name;
    let message = reaction.message;
    if (user != client.user) {
        for (const p of Object.keys(reactionFilters)) {
            const handler = reactionFilters[p](message);
            if (handler != undefined && handler) {
                console.log("Handling reaction: " + p + ", remove:", remove);
                let data = {
                    handler: handler,
                    emoji: emojiName,
                    message: message,
                    user: user
                }
                try {
                    if (remove) reactionRemoveHandlers[p](data);
                    else reactionAddHandlers[p](data);
                } catch (error) {
                    console.error(error);
                }
                //return;
            }
        }
    }
}