import ytdl from "ytdl-core";
import * as Discord from "discord.js";
import * as DiscordVoice from "@discordjs/voice";
import * as Https from "https";
import * as Main from "./main";
import * as Utilities from "./utilities";


var nextYoutube;
var nextYoutubeData;
var youtubeAutoplay = false;

var youtubePlaylist = [];
var youtubePlaylistPosition = 0;
var youtubePlaylistName = "test";

var youtubeRecent = [];
var youtubeRecentMax = 6;

var youtubePlaying = [];

let barUpdateInterval = 2000;

export function play(interaction) {
    let vid = interaction.options.getString("video");
    if (interaction.member.voice.channel) {
        Main.joinVoiceChannel(interaction.member.voice.channel);
        if (interaction.options.getBoolean("autoplay")) {
            youtubeAutoplay = true;
        }
        else youtubeAutoplay = false;
        if (vid.startsWith("http")) {
            if (vid.includes("list=")) {
                let n = vid.indexOf("list=");
                let listId = vid.slice(n + 5);
                interaction.reply({ content: "Playing youtube in :sound:" + interaction.member.voice.channel.name, ephemeral: true });
                playPlaylist(listId, interaction.channel);
            }
            else {
                youtubePlaylist = [];
                interaction.reply({ content: "Playing youtube in :sound:" + interaction.member.voice.channel.name, ephemeral: true });
                playYoutube(vid, interaction.channel);
            }
        }
        else {
            youtubePlaylist = [];
            search(vid).then((id) => {
                interaction.reply({ content: "Playing youtube in :sound:" + interaction.member.voice.channel.name, ephemeral: true });
                playYoutube("https://www.youtube.com/watch?v=" + id, interaction.channel);
            }).catch(() => { interaction.reply({ content: "No results!", ephemeral: true }); });
        }

    }
}

function clearNextTimeout() {
    youtubePlaying.forEach(d => {
        clearInterval(d.barInterval);
    })
    if (nextYoutube) clearTimeout(nextYoutube);
    nextYoutube = null;
}
youtubePlaylistName = "Unknown Playlist";

function playPlaylist(playlistUrl: string, channel: Discord.VoiceChannel) {
    getPlaylistName(playlistUrl).then(title => {
        youtubePlaylistName = title as string;
    })
    let n = playlistUrl.indexOf("index=");
    let listPos = 0;
    if (n >= 0) {
        listPos = parseInt(playlistUrl.slice(n + 6)) - 1;
    }
    getPlaylist(playlistUrl).then((items: any) => {
        youtubePlaylist = items.map(x => x.contentDetails.videoId);
        youtubePlaylistPosition = listPos;
        console.log(youtubePlaylist);
        playYoutube("https://www.youtube.com/watch?v=" + youtubePlaylist[listPos], channel);
    })
}

function playYoutube(videoUrl: string, channel: Discord.VoiceChannel) {
    console.log("playing " + videoUrl);
    let videoStream = ytdl(videoUrl, { filter: "audioonly", highWaterMark: 10e6 });
    videoStream.on("info", (info: ytdl.videoInfo) => {
        console.log("YT info" + info);
        let vidId = info.videoDetails.videoId;
        if (!youtubeRecent.includes(vidId)) {
            youtubeRecent.push(vidId);
            if (youtubeRecent.length > youtubeRecentMax) {
                youtubeRecent.shift();
            }
        }
        let length = parseInt(info.videoDetails.lengthSeconds);
        let lenString = Utilities.timeString(length);
        let embed = new Discord.EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("► " + info.videoDetails.title)
            .setDescription(lenString + ' | From *' + info.videoDetails.ownerChannelName + '*')
            .setURL(videoUrl);

        if (youtubePlaylist.length > 0) {
            embed.setFooter({ text: youtubePlaylistPosition + 1 + "/" + (youtubePlaylist.length) + " in " + youtubePlaylistName });
        }
        let newPlaying = {
            statusMsg: undefined,
            voiceChannel: channel,
            elapsed: 0,
            length: length * 1000,
            barInterval: undefined,
            nextUrl: undefined,
            nextData: undefined,
            autoplay: youtubeAutoplay,
            embed: embed
        }
        newPlaying.barInterval = setInterval(() => {
            updateMessage(newPlaying);
        }, barUpdateInterval);
        try {
            channel.send({ embeds: [embed, generateProgressBar(0, length * 1000, 9)] }).then(msg => {
                newPlaying.statusMsg = msg;
            });

        } catch (error) {
            console.log(error)
        }
        //console.log(info);

        //voicePlay(voice, videoStream, { volume: 0.8 });
        let nextVideo;
        if (youtubePlaylist.length > 0) {
            youtubePlaylistPosition++;
            if (youtubePlaylist.length > youtubePlaylistPosition) {
                nextVideo = youtubePlaylist[youtubePlaylistPosition];
            }
            else {
                channel.send('End of playlist "' + youtubePlaylistName + '".');
                clearNextTimeout();
            }
        }
        else if (youtubeAutoplay) {
            for (let i = 0; i < info.related_videos.length; i++) {
                const nextId = info.related_videos[i].id;
                if (!youtubeRecent.includes(nextId)) {
                    nextVideo = nextId;
                    break;
                }
            }
        }
        clearNextTimeout();
        Main.voiceChannelPlay(null, videoStream, 0.8)
        if (nextVideo) {
            let nextUrl = "https://www.youtube.com/watch?v=" + nextVideo;
            videoStream.on("finish", () => {
            });
            nextYoutube = setTimeout(() => { playYoutube(nextUrl, channel) }, (length + 3) * 1000);
            nextYoutubeData = { url: nextUrl, channel: channel };
            newPlaying.nextUrl = nextYoutube;
            newPlaying.nextData = nextYoutubeData;
        }
        youtubePlaying.push(newPlaying);
    })
}

function getPlaylist(argument) {
    return new Promise((resolve, reject) => {
        Https.get("https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=" + argument + "&key=" + process.env.SEARCH_API_KEY, function (res) {
            console.log("HTTPS Status:" + res.statusCode);
            var body;
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                var parsed = JSON.parse(body.substring(9, body.length));
                //console.log(parsed);
                if (parsed.error) {
                    console.log("ERROR");
                    console.log(parsed.error);
                    reject();
                }
                else if (parsed.items && parsed.items.length > 0) {
                    console.log("SUCCESS! Items: " + parsed.items.length);
                    resolve(parsed.items);
                }
                else {
                    reject();
                }
            });
        });
    });
}

function getPlaylistName(argument) {
    return new Promise((resolve, reject) => {
        Https.get("https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&maxResults=1&id=" + argument + "&key=" + process.env.SEARCH_API_KEY, function (res) {
            console.log("HTTPS Status:" + res.statusCode);
            var body;
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                var parsed = JSON.parse(body.substring(9, body.length));
                //console.log(parsed);
                if (parsed.error) {
                    console.log("ERROR");
                    console.log(parsed.error);
                    reject();
                }
                else if (parsed.items && parsed.items.length > 0) {
                    console.log("SUCCESS! Name: " + parsed.items[0].snippet.title);
                    resolve(parsed.items[0].snippet.title);
                }
                else {
                    reject();
                }
            });
        });
    });
}

function search(argument) {
    return new Promise((resolve, reject) => {
        Https.get("https://youtube.googleapis.com/youtube/v3/search?part=snippet&eventType=none&maxResults=1&q=" + argument + "&regionCode=US&relevanceLanguage=EN&safeSearch=none&type=video&key=" + process.env.SEARCH_API_KEY, function (res) {
            console.log("HTTPS Status:" + res.statusCode);
            var body;
            res.on("data", function (data) {
                body += data;
            });
            res.on("end", function () {
                var parsed = JSON.parse(body.substring(9, body.length));
                //console.log(parsed);
                if (parsed.error) {
                    console.log("ERROR");
                    console.log(parsed.error);
                    reject();
                }
                else if (parsed.items && parsed.items.length > 0) {
                    console.log("SUCCESS! ID: " + parsed.items[0].id.videoId);
                    resolve(parsed.items[0].id.videoId);
                }
                else {
                    reject();
                }
            });
        });
    });
}

function updateMessage(data) {
    data.elapsed = Math.min(data.elapsed + barUpdateInterval, data.length);
    if (data.statusMsg) {
        data.statusMsg.edit({ embeds: [data.embed, generateProgressBar(data.elapsed, data.length, 9)] })
    }
    //console.log("Played " + data.elapsed / 1000 + "s out of" + data.length / 1000 + "s");
    if (data.elapsed >= data.length) {
        clearInterval(data.barInterval);
    }
}

function generateProgressBar(elapsed, length, count) {
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
    if (nextYoutube && (youtubeAutoplay || youtubePlaylist.length > 0)) {
        let voice = guild.members.me.voice.channel;
        if (voice) {
            if (amount && youtubePlaylist.length > 0) {
                //let num = parseInt(amount);
                let num = amount;
                if (!isNaN(num)) {
                    //message.channel.send("sas " + youtubePlaylistPosition + " sas " + num);
                    youtubePlaylistPosition += (num - 1);
                    if (youtubePlaylistPosition >= 0 && youtubePlaylistPosition < youtubePlaylist.length) {
                        nextYoutubeData.url = "https://www.youtube.com/watch?v=" + youtubePlaylist[youtubePlaylistPosition];
                    }
                    else {
                        textChannel.send("Cannot skip outside of playlist!");
                        youtubePlaylistPosition -= (num - 1);
                        return;
                    }
                }
            }
            playYoutube(nextYoutubeData.url, nextYoutubeData.channel);
        }
    }
}

export function progressEmoji(progress) {
    if (progress == 0) return "<:yt0:951917157304926238>";
    else if (progress == 1) return "<:yt1:951917157212622858>";
    else if (progress == 2) return "<:yt2:951917157275533352>";
    else if (progress == 3) return "<:yt3:951917157279756378>";
    else if (progress == 4) return "<:yt4:951917157216813056>";
}

export function stop() {
    clearNextTimeout();
    youtubePlaylist = [];
}