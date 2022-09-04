import * as Main from "./main";
import * as Discord from "discord.js";

export function init() {
    Main.httpServer.post("/api/notify", (req, res) => {
        console.log(req.body);
        let data = req.body;
        notifyMessage(data).then(() => {
            res.send("ok");
        });
    });
}

async function notifyMessage(data) {
    let channel = (await Main.afrGuild.channels.fetch("753323827093569588")) as Discord.TextChannel;
    let newEmbed = new Discord.EmbedBuilder()
        .setTitle(data.title)
        .addFields({ name: "Message", value: data.description })
        .setColor(0x18c3b1);
    channel.send({ embeds: [newEmbed] });
    return true;
}
