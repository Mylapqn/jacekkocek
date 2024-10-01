import ytdl from "@distube/ytdl-core";
import * as Discord from "discord.js";
import * as DiscordVoice from "@discordjs/voice";
import * as Https from "https";
import * as Main from "./main";
import * as Utilities from "./utilities";
import axios from "axios";


let videoEndTimeout: string | number | NodeJS.Timeout;
let nextYoutubeData: VideoData;
let autoplay = false;

interface VideoData {
    url: string,
    channel: Discord.VoiceChannel,
    textChannel: Discord.TextBasedChannel
}

interface YoutubeData {
    statusMsg: Discord.Message,
    voiceChannel: Discord.VoiceChannel,
    elapsed: number,
    length: number,
    barInterval: any,
    autoplay: boolean,
    embed: Discord.EmbedBuilder
}

let playlist = {
    items: new Array<string>(),
    position: 0,
    name: "test",
    id: "none"
}

let recentList: string[] = [];
const recentMax = 6;

let playing: YoutubeData[] = [];

const barUpdateInterval = 2000;
const maxSuggestedVideoLength = 30 * 60;

export async function playFromInteraction(interaction: Discord.ChatInputCommandInteraction) {
    let vid = interaction.options.getString("video");
    let member = interaction.member as Discord.GuildMember;
    let voiceChannel = member.voice.channel as Discord.VoiceChannel;
    if (voiceChannel) {
        await interaction.deferReply();
        Main.joinVoiceChannel(member.voice.channel);
        if (interaction.options.getBoolean("autoplay")) {
            autoplay = true;
        }
        else autoplay = false;
        if (vid.startsWith("http")) {
            if (vid.includes("list=")) {
                let n = vid.indexOf("list=");
                let listId = vid.slice(n + 5);
                interaction.editReply({ content: "Playing youtube in :sound:" + member.voice.channel.name });
                playPlaylist(listId, voiceChannel, interaction.channel);
            }
            else {
                playlist.items = [];
                interaction.editReply({ content: "Playing youtube in :sound:" + member.voice.channel.name });
                playVideo(vid, voiceChannel, interaction.channel);
            }
        }
        else {
            playlist.items = [];
            try {
                let id = await search(vid);
                if (id) {
                    interaction.editReply({ content: "Playing youtube in :sound:" + voiceChannel.name });
                    playVideo("https://www.youtube.com/watch?v=" + id, voiceChannel, interaction.channel);
                }
                else {
                    interaction.editReply({ content: `No results for _${vid}_!` });
                }

            } catch (error) {
                console.error(error);
                interaction.editReply({ content: `Error: ${Utilities.limitString("" + error, 20)}!` });
            }
        }

    }
}

function clearNextTimeout() {
    playing.forEach(d => {
        clearInterval(d.barInterval);
    })
    if (videoEndTimeout) clearTimeout(videoEndTimeout);
    videoEndTimeout = null;
}

async function playPlaylist(url: string, channel: Discord.VoiceChannel, textChannel: Discord.TextBasedChannel) {
    let playlistData = await getPlaylistName(url);
    playlist.name = playlistData.name;
    playlist.id = playlistData.id;
    let n = url.indexOf("index=");
    let listPos = 0;
    if (n >= 0) {
        listPos = parseInt(url.slice(n + 6)) - 1;
    }
    playlist.items = await getPlaylistItems(url);
    playlist.position = listPos;
    console.log(playlist.items);
    console.log(`Playing playlist ${playlist.id}, first video:${playlist.items[listPos]}`)
    playVideo("https://www.youtube.com/watch?v=" + playlist.items[listPos], channel, textChannel);
}

async function playVideo(videoUrl: string, channel: Discord.VoiceChannel, textChannel: Discord.TextBasedChannel) {
    console.log("playing " + videoUrl);

    let videoStream = ytdl(videoUrl, { filter: "audioonly", highWaterMark: 3e7 });

    let info: ytdl.videoInfo = await new Promise(resolve => {
        videoStream.once("info", resolve)
    })

    let vidId = info.videoDetails.videoId;
    if (!recentList.includes(vidId)) {
        recentList.push(vidId);
        if (recentList.length > recentMax) {
            recentList.shift();
        }
    }
    let length = parseInt(info.videoDetails.lengthSeconds);

    let embed = new Discord.EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("► " + info.videoDetails.title)
        .setDescription(Utilities.timeString(length) + ' | From *' + info.videoDetails.ownerChannelName + '*')
        .setURL(videoUrl);

    if (autoplay)
        embed.setFooter({ text: `Autoplay is on` });


    if (playlist.items.length > 0) {
        embed
            .setFooter({ text: `${playlist.position + 1}/${playlist.items.length} in ${playlist.name}` })
            .setURL(`${videoUrl}&list=${playlist.id}`)
    }
    let newPlaying: YoutubeData = {
        statusMsg: undefined,
        voiceChannel: channel,
        elapsed: 0,
        length: length * 1000,
        barInterval: undefined,
        autoplay: autoplay,
        embed: embed
    }
    newPlaying.barInterval = setInterval(() => {
        updateMessage(newPlaying);
    }, barUpdateInterval);
    try {
        let actionRow = generateActionRow();
        textChannel.send({ embeds: [embed, generateProgressBar(0, length * 1000, 9)], components: [actionRow] }).then((msg: Discord.Message<boolean>) => {
            newPlaying.statusMsg = msg;
        });

    } catch (error) {
        console.log(error)
    }
    //console.log(info);

    //voicePlay(voice, videoStream, { volume: 0.8 });
    let nextVideo: string;
    if (playlist.items.length > 0) {
        playlist.position++;
        if (playlist.items.length > playlist.position) {
            nextVideo = playlist.items[playlist.position];
        }
        else {
            channel.send('End of playlist "' + playlist.name + '".');
            clearNextTimeout();
        }
    }
    else {
        for (let i = 0; i < info.related_videos.length; i++) {
            const next = info.related_videos[i];
            textChannel.send(next.title + " - " + (next.length_seconds / 60).toFixed(0));
            if (!recentList.includes(next.id) && next.length_seconds < maxSuggestedVideoLength/*broky*/) {
                nextVideo = next.id;
                break;
            }
        }
    }
    clearNextTimeout();
    try {
        console.log("starting youtube in voice");
        Main.voiceChannelPlay(null, videoStream, 0.8);
    } catch (e) {
        console.error(e);
        textChannel.send({ embeds: [new Discord.EmbedBuilder().setColor(0xFF0000).setTitle("Youtube play failed!")] }).catch(console.error);
        stop();
    }

    if (nextVideo) {
        let nextUrl = "https://www.youtube.com/watch?v=" + nextVideo;
        videoStream.on("finish", () => { });
        videoEndTimeout = setTimeout(onVideoFinish, (length + 3) * 1000);
        nextYoutubeData = { url: nextUrl, channel: channel, textChannel: textChannel };
    }
    else {
        nextYoutubeData = undefined;
    }
    await removeAllUi();
    playing.push(newPlaying);
}

function generateActionRow() {
    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
        new Discord.ButtonBuilder({ emoji: { name: "backward", id: "1134483313235611648" }, style: Discord.ButtonStyle.Secondary, customId: "youtubePrevious" }),
        new Discord.ButtonBuilder({ emoji: { name: "stop", id: "1134483316544913538" }, style: Discord.ButtonStyle.Secondary, customId: "youtubeStop" }),
        new Discord.ButtonBuilder({ emoji: { name: "forward", id: "1134483315290820678" }, style: Discord.ButtonStyle.Secondary, customId: "youtubeNext" }),
        new Discord.ButtonBuilder({ emoji: { name: "autoplay", id: "1134483312052797490" }, style: autoplay ? Discord.ButtonStyle.Primary : Discord.ButtonStyle.Secondary, customId: "youtubeAutoplay" }),
    );
}

function onVideoFinish() {
    if ((playlist.items.length > 0 || autoplay) && nextYoutubeData && nextYoutubeData.url) {
        playVideo(nextYoutubeData.url, nextYoutubeData.channel, nextYoutubeData.textChannel);
    }
    else {
        removeAllUi();
    }
}

async function removeAllUi() {
    if (playing.length > 0) {
        for (const data of playing) {
            if (data.statusMsg && data.statusMsg.editable && data.statusMsg?.components?.length > 0) {
                try {
                    await data.statusMsg.edit({ components: [] })
                } catch (error) {
                    console.error("Youtube ui remove error: ", error);
                }
            }
        }

    }
}

async function getPlaylistItems(playlistId: string) {
    let response = await axios.get(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${process.env.SEARCH_API_KEY}`);
    if (response.status != 200) {
        console.log("Error getting playlist items")
        return null;
    }
    console.log("SUCCESS! Items: " + response.data.items.length);
    let list = response.data.items.map((x: { contentDetails: { videoId: any; }; }) => x.contentDetails.videoId) as string[]
    while (response.data.nextPageToken && list.length < 300) {
        response = await axios.get(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&pageToken=${response.data.nextPageToken}&maxResults=50&playlistId=${playlistId}&key=${process.env.SEARCH_API_KEY}`);
        list = list.concat(response.data.items.map((x: { contentDetails: { videoId: any; }; }) => x.contentDetails.videoId));
    }
    return list;
}

async function getPlaylistName(playlistId: string) {
    let response = await axios.get(`https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&maxResults=1&id=${playlistId}&key=${process.env.SEARCH_API_KEY}`)
    if (response.status != 200) {
        console.log("Error getting playlist")
        return {
            name: "unknown",
            id: "unknown"
        }
    }
    return {
        name: response.data.items[0].snippet.title as string,
        id: response.data.items[0].id as string
    };
    //response.data.items[0].id
}

async function search(query: string): Promise<string | undefined> {
    console.log(`Searching youtube for ${Utilities.limitString(query, 20)}`);
    let response = await axios.get(encodeURI(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&eventType=none&maxResults=1&q=${query}&regionCode=US&relevanceLanguage=EN&safeSearch=none&type=video&key=${process.env.SEARCH_API_KEY}`));
    if (response.status == 200) {
        if (response.data.items && response.data.items.length > 0) {
            console.log(`Successful search for ${Utilities.limitString(query, 20)}! ID: ${response.data.items[0].id.videoId}`);
            return (response.data.items[0].id.videoId);
        }
        else {
            console.log(`No results for ${Utilities.limitString(query, 20)}`)
            return undefined;
        }
    }
    else {
        console.log("Error searching youtube")
        return undefined;
    }
}

export function progressEmoji(progress: number) {
    if (progress == 0) return "<:yt0:951917157304926238>";
    else if (progress == 1) return "<:yt1:951917157212622858>";
    else if (progress == 2) return "<:yt2:951917157275533352>";
    else if (progress == 3) return "<:yt3:951917157279756378>";
    else if (progress == 4) return "<:yt4:951917157216813056>";
}

async function updateMessage(data: YoutubeData) {
    data.elapsed = Math.min(data.elapsed + barUpdateInterval, data.length);
    if (data.statusMsg && data.statusMsg.editable) {
        try {
            await data.statusMsg.edit({ embeds: [data.embed, generateProgressBar(data.elapsed, data.length, 9)] })
        } catch (error) {
            console.error("Youtube bar update error: ", error);
            clearInterval(data.barInterval);
        }
    }
    //console.log("Played " + data.elapsed / 1000 + "s out of" + data.length / 1000 + "s");
    if (data.elapsed >= data.length) {
        clearInterval(data.barInterval);
    }
}

function generateProgressBar(elapsed: number, length: number, count: number) {
    let playingBar = "";
    playingBar += "`" + Utilities.timeString(elapsed / 1000) + "` ";
    let playRatio = elapsed / length;
    let playInt = Math.floor(playRatio * count);
    let modulo = Math.floor(playRatio * count * 4) % 4;
    for (let i = 0; i < count; i++) {
        if (i < playInt) playingBar += progressEmoji(4);
        if (i == playInt) {
            playingBar += progressEmoji(modulo + 1);
        }
        if (i > playInt) playingBar += progressEmoji(0);
    }
    playingBar += " `" + Utilities.timeString(length / 1000) + "`";
    return new Discord.EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(playingBar);
}

export function skip(guild: Discord.Guild, amount: number, textChannel: Discord.TextBasedChannel) {
    if (videoEndTimeout && (playlist.items.length > 0 || nextYoutubeData?.url)) {
        let voice = guild.members.me.voice.channel;
        if (voice) {
            if (amount > 0 && playlist.items.length > 0) {
                //let num = parseInt(amount);
                if (!isNaN(amount)) {
                    //message.channel.send("sas " + youtubePlaylistPosition + " sas " + num);
                    if (playlist.position >= 0 && playlist.position + amount < playlist.items.length) {
                        playlist.position += amount - 1;
                        nextYoutubeData.url = "https://www.youtube.com/watch?v=" + playlist.items[playlist.position];
                    }
                    else {
                        textChannel.send("Cannot skip outside of playlist!");
                        return;
                    }
                }
            }
            if (amount < 0) {
                if (playlist.items.length > 0 && playlist.position > 0) {
                    playlist.position += amount - 1;
                    nextYoutubeData.url = "https://www.youtube.com/watch?v=" + playlist.items[playlist.position];
                }
                else if (recentList.length > 1) {
                    recentList.pop();
                    nextYoutubeData.url = "https://www.youtube.com/watch?v=" + recentList.pop();
                }
            }
            playVideo(nextYoutubeData.url, nextYoutubeData.channel, nextYoutubeData.textChannel);
        }
    }
}

export function stop() {
    removeAllUi();
    clearNextTimeout();
    playlist.items = [];
}

export function toggleAutoplay() {
    autoplay = !autoplay;
    if ((!playlist || playlist.items.length <= 0) && playing[playing.length - 1]) {
        let p = playing[playing.length - 1];
        p.embed.setFooter({ text: autoplay ? "Autoplay is on" : null });
        try {
            p.statusMsg.edit({ components: [generateActionRow()] });
        } catch (error) {
            console.log("Button update error:", error);
        }
    }
}