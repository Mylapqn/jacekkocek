import * as Main from "./main";
import * as Discord from "discord.js";

export function init() {
    Main.httpServer.post("/api/notify", (req, res) => {
        try {
            console.log(req.body);
            let data = req.body;
            notifyMessage(data);
            res.send("ok");
        } catch (e) {
            res.sendStatus(500);
        }
    });
}

function notifyMessage(data) {
    let newEmbed = new Discord.EmbedBuilder()
        .setTitle(data.title)
        .addFields({ name: "Message", value: data.description })
        .setColor(0x18c3b1);
    Main.notifyTextChannel.send({ embeds: [newEmbed] });
    return true;
}
