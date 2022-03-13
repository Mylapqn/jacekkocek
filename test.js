const Discord = require('discord.js');
const DiscordVoice = require("@discordjs/voice");
const Jimp = require('jimp');
const Https = require('https');
const Http = require('http');
const ytdl = require('ytdl-core');
const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');
const Canvas = require('canvas');
const express = require("express");

//const icecastParser = require("icecast-parser");
//const Parser = icecastParser.Parser;
//const { env } = require('process');

//require('dotenv').config();

const Intents = Discord.Intents;
const intents = new Intents();
intents.add(Intents.FLAGS.GUILD_MESSAGES);
intents.add(Intents.FLAGS.GUILD_MESSAGE_REACTIONS);
intents.add(Intents.FLAGS.GUILDS);
intents.add(Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS);
intents.add(Intents.FLAGS.GUILD_VOICE_STATES);
intents.add(Intents.FLAGS.GUILD_MEMBERS);
const client = new Discord.Client({ intents: intents });

const updateGlobalCommands = false;
const commandsToDeleteGlobal = [];
const commandsToDeleteGuild = [];
/**
 * @type {Discord.Guild}
 */
let afrGuild;

let audioPlayer = DiscordVoice.createAudioPlayer({ behaviors: { noSubscriber: "pause" } });
var kocek = 0;
var lastSearchResults = null;
const prefix = "$";
var startDate;
var defaultTimeZone = "Europe/Prague";

const port = process.env.PORT;
const httpServer = express();
httpServer.use(express.json());

httpServer.post("/matoshi/payment", (req, res) => {
  console.log(req.body);
  //let data = JSON.parse(req.body);
  let data = req.body;
  if (data.from.id != client.user.id)
    matoshiPaymentMessage(data).then(() => {
      res.send("ok");
    });
});

let paymentMessages = new Map();

var helpCommands = [
  {
    name: "help",
    prefix: true,
    arguments: "",
    description: "Display help",
  },
  {
    name: "spell",
    prefix: true,
    arguments: "word",
    description: "Spell word in emoji reactions",
  },
  {
    name: "zobrazit",
    prefix: true,
    arguments: "režim",
    description: "Zobrazit věci z předchozí zprávy dle zvoleného režimu",
    longDescription: "`zobrazit` - Zobrazit věci z předchozí zprávy\n`zobrazit vše` - Zobrazit vše\n`zobrazit více` - Zobrazit další položku z předchozího zobrazení\n`zobrazit ještě více` - Zobrazit ještě další položku z předchozího zobrazení\n"
  },
  {
    name: "s",
    prefix: true,
    arguments: "dotaz",
    description: "Zobrazit hledaný dotaz",
  },
  {
    name: "film",
    prefix: true,
    arguments: "název filmu",
    description: "Zobrazit hledaný film",
  },
  {
    name: ":gif2:",
    prefix: false,
    arguments: "",
    description: "Animated emoji",
  },
  {
    name: ":spin:",
    prefix: false,
    arguments: "",
    description: "Animated emoji",
  },
  {
    name: ":loading:",
    prefix: false,
    arguments: "",
    description: "Animated emoji",
  },
  {
    name: "kino",
    prefix: true,
    arguments: "film",
    description: "Start vote on kino",
    longDescription: "Sends a message where users can react whether (and when) they want to watch the film or not. Also tries to find and send short info about the film."
  },
  {
    name: "kinoReset",
    prefix: true,
    arguments: "film",
    description: "Reset vote/suggestion for this film",
    longDescription: "If there is an ongoing vote or watchlist suggestion on this specific film, it is cancelled and you can start it again.\nYou do not have to use this if you want to start a new vote for a different film."

  },
  {
    name: "kinoRemind",
    prefix: true,
    arguments: "film",
    description: "Ping all users who want to watch the film",
    longDescription: "If there is an ongoing vote on this film, everyone who reacted positively on the original vote message gets pinged. Also sends a link to the original message."
  },
  {
    name: "version",
    prefix: true,
    arguments: "",
    description: "Short changelog of the latest release",
  },
  {
    name: "song",
    prefix: true,
    arguments: "song name or id",
    description: "Play one song in your voice chat",
    longDescription: "Play one song in your voice chat. The argument can be song name, song id, or nothing for a random song."
  },
  {
    name: "songs",
    prefix: true,
    arguments: "song name or id",
    description: "Start playing songs in your voice chat",
    longDescription: "Start playing songs in your voice chat. The starting song can be specified, the following ones will be random.\nThe argument can be song name, song id, or nothing for a random song."
  },
  {
    name: "radio",
    prefix: true,
    arguments: "station",
    description: "Start playing internet radio",
    longDescription: "Start playing internet radio. For a list of stations type `" + prefix + "radio stations.`"
  },
  {
    name: "stop",
    prefix: true,
    arguments: "",
    description: "Stop the currently playing song",
  },
  {
    name: "noise",
    prefix: true,
    arguments: "",
    description: "Play noise in your voice channel",
  },
  {
    name: "kinoSuggest",
    prefix: true,
    arguments: "film",
    description: "Add a film to the watchlist",
    longDescription: "Add a film to the 'watch later' watchlist. Interchangable with `suggest`."
  },
  {
    name: "kinoPlaylist",
    prefix: true,
    arguments: "film",
    description: "Display the film watchlist",
    longDescription: "See the films to watch and the ones you have already watched. Interchangable with `playlist`, `kinoSuggestions`."
  },
  {
    name: "youtube",
    arguments: "video url",
    prefix: true,
    description: "",
  },

];

var helpAdminCommands = [
  {
    name: "listLetterEmoji",
    prefix: true,
    arguments: "",
    description: "List letter emoji",
  },
];

var changelog = {
  version: "1.17.5",
  releaseDate: "11.3.2022",
  commands: ["help"],
  changes: [
    " ",
  ]
};

var radioStations = [
  {
    name: "Evropa 2",
    color: [60, 80, 220],
    url: "http://ice.actve.net/fm-evropa2-128"
  },
  {
    name: "Anime Radio 1 ヾ(⌒∇⌒*)♪",
    color: [235, 135, 180],
    //url: "https://japanimradiotokyo.fr/8002/stream"
    //url: "https://streamingv2.shoutcast.com/japanimradio-tokyo"
    url: "https://listen.moe/stream"
  },
  {
    name: "Anime Radio 2 ♪(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    color: [235, 135, 180],
    //url: "https://japanimradiotokyo.fr/8002/stream"
    //url: "https://streamingv2.shoutcast.com/japanimradio-tokyo"
    url: "https://kathy.torontocast.com:3060/;"
  },
  {
    name: "Anime Radio 3 ☆٩(◕‿◕｡)۶☆",
    color: [235, 135, 180],
    url: "http://79.111.119.111:8002/anime"
  },
  {
    name: "SOCKENSCHUSS X",
    color: [100, 0, 180],
    url: "https://stream.laut.fm/sockenschuss-x"
  },
  {
    name: "Nightdrive",
    color: [0, 0, 0],
    url: "https://stream.laut.fm/nightdrive"
  },
  {
    name: "Instrumental Radio",
    color: [67, 209, 204],
    url: "http://agnes.torontocast.com:8151/;"
  },
  {
    name: "Radcap Synthwave",
    color: [200, 0, 70],
    url: "http://79.120.39.202:8002/retrowave"
  },
  {
    name: "Radcap Space",
    color: [200, 0, 70],
    url: "http://79.111.119.111:8002/spacemusic"
  },
  {
    name: "Radcap Spacesynth",
    color: [200, 0, 70],
    url: "http://79.120.39.202:8002/spacesynth"
  },
  {
    name: "Cinemix",
    color: [25, 117, 145],
    url: "https://kathy.torontocast.com:1825/stream"
  },


];

var letterEmoji = {
  a: "🇦", b: "🇧", c: "🇨", d: "🇩", e: "🇪", f: "🇫", g: "🇬", h: "🇭", i: "🇮", j: "🇯", k: "🇰", l: "🇱", m: "🇲", n: "🇳", o: "🇴", p: "🇵", q: "🇶", r: "🇷", s: "🇸", t: "🇹", u: "🇺", v: "🇻", w: "🇼", x: "🇽", y: "🇾", z: "🇿",
  "#": "#️⃣",
  "0": "0️⃣", "1": "1️⃣", "2": "2️⃣", "3": "3️⃣", "4": "4️⃣", "5": "5️⃣", "6": "6️⃣", "7": "7️⃣", "8": "8️⃣", "9": "9️⃣"
};

console.log("--------------------------------------\nStarting up!")

var kinoData = new Map();
var weekDayNames = ["po", "ut", "st", "ct", "pa", "so", "ne"];

var radioTimer;
var fluttershy = true;
var radioApiKey;
var radioServerPing = 0;
radioApiKeyGet();

var nextYoutube;
var nextYoutubeData;
var youtubeAutoplay = false;

var youtubePlaylist = [];
var youtubePlaylistPosition = 0;
var youtubePlaylistName = "test";

var youtubeRecent = [];
var youtubeRecentMax = 6;

var youtubePlaying = [];

var kinoPlaylist = new Map();
var playlistFileName = "kinoPlaylist.json";
loadPlaylist();

var matoshiFileName = "matoshiBalance.json";
var matoshiBalance = new Map();
loadMatoshi();

const reminderThreshold = 3600;

let reminders = [];

let upcomingReminders = [];
const remindersFileName = "reminders.json";
loadReminders();

// Log our bot in using the token from https://discordapp.com/developers/applications/me

client.login(process.env.DISCORD_API_KEY);

client.on('ready', () => {

  httpServer.listen(port, () => {
    console.log("HTTP Listening on port " + port);
  })

  afrGuild = client.guilds.cache.get('549589656606343178');
  client.guilds.cache.get('728312628413333584').emojis.fetch();

  console.log('' + new Date() + ' I am ready!');
  client.user.setActivity({ name: prefix + "help", type: "LISTENING" });
  startDate = new Date();



  /*
  client.guilds.fetch("549589656606343178").then(guild => {
    let c = guild.channels.cache.find(channel => channel.name == "nvidia");
    c.messages.fetch("800379220517060619").then(message => {
      stockMessage = message;
    });
  });
  */


  setupCommands();

  setupReminders();
  setInterval(() => {
    setupReminders();
  }, reminderThreshold * 1000);
  console.log(upcomingReminders);

});

client.on('interactionCreate', interaction => {
  //console.log("Interaction", interaction);
  if (interaction.isCommand()) {
    switch (interaction.commandName) {
      case "kino": {
        switch (interaction.options.getSubcommand()) {
          case "suggest": {
            let filmName = interaction.options.getString("film").toLowerCase();
            if (kinoPlaylist.has(filmName)) {
              interaction.reply({ content: "***" + toTitleCase(filmName) + "*** has already been suggested by **" + kinoPlaylist.get(filmName).suggestedBy + "**.", ephemeral: true });
            }
            else if (kinoData.has(filmName)) {
              interaction.reply({ content: "There is already a plan to watch ***" + toTitleCase(filmName) + "***: " + kinoData.get(filmName).message.url, ephemeral: true });
            }
            else {
              let newSug = {
                name: toTitleCase(filmName),
                suggestedBy: interaction.user.username,
                watched: false
              }
              kinoPlaylist.set(filmName, newSug);
              savePlaylist();
              interaction.reply("**" + interaction.user.username + "** added ***" + newSug.name + "*** to film suggestions. Reward: 10 ₥");
              awardMatoshi(interaction.guildId, interaction.user.id, 10);
            }
            break;
          }
          case "playlist": {
            if (kinoPlaylist.size > 0) {
              let newMessage = "**__Film suggestions:__**\n";
              kinoPlaylist.forEach(f => {
                newMessage += "• ";
                if (f.watched) {
                  newMessage += "~~*" + f.name + "*~~";
                }
                else newMessage += "***" + f.name + "***";
                newMessage += "\n";

              });
              interaction.reply(newMessage);
            }
            else {
              interaction.reply({ content: "The playlist is empty!", ephemeral: true });
            }
            break;
          }
          case "remind": {
            let film = interaction.options.getString("film").toLowerCase();
            if (kinoData.has(film)) {
              let kinoEntry = kinoData.get(film);
              let newMessage = "";

              kinoEntry.users.forEach(u => {
                if (u.response == 1) newMessage = newMessage + "✅ " + u.mention;
                newMessage = newMessage + "\n";
              });
              let time = 1000;
              if (interaction.options.getString("when")) {
                time = parseTime(interaction.options.getString("when"));
              }
              if (time == NaN || time == "NaN" || time <= 0) interaction.reply({ content: "Invalid time!", ephemeral: true });
              else if (time > 31968000) interaction.reply({ content: "Cannot create timers over 1 year!", ephemeral: true });
              else if (time > 0) {
                let remText = newMessage;
                let newRem = {
                  guild: interaction.guildId,
                  channel: interaction.channelId,
                  text: remText,
                  timestamp: Math.round(now() + time),
                  mentions: []
                }
                createReminder(newRem);
                interaction.reply({
                  content: "Added reminder for **_" + toTitleCase(film) + "_** at <t:" + newRem.timestamp + ">",
                  allowedMentions: { parse: [] },
                  ephemeral: true
                });
              }
              else {
                interaction.reply({ content: "Invalid time!", ephemeral: true });
              }
            }
            else {
              interaction.reply({ content: "Cannot find any vote for ***" + toTitleCase(film) + "*** :disappointed:", ephemeral: true });
            }
            break;
          }
          case "reset": {
            let film = interaction.options.getString("film").toLowerCase();
            if (kinoData.has(film)) {
              kinoData.delete(film);
              interaction.reply("The data for ***" + toTitleCase(film) + "*** was successfully reset.");
            }
            if (kinoPlaylist.has(film)) {
              kinoPlaylist.delete(film);
              savePlaylist();
              interaction.reply("The suggestion for ***" + toTitleCase(film) + "*** was successfully reset.");
            }
            else {
              interaction.reply({ content: "Cannot find any vote or suggestion for ***" + toTitleCase(film) + "*** :disappointed:", ephemeral: true });
            }
            break;
          }
          case "watch": {
            interaction.reply({ content: "Not yet supported :disappointed:", ephemeral: true });
            break;
          }
          case "info": {
            interaction.reply({ content: "Not yet supported :disappointed:", ephemeral: true });
            break;
          }
        }
        break;
      }
      case "remind": {
        let time = parseTime(interaction.options.getString("delay"));
        if (time == NaN || time == "NaN" || time <= 0) interaction.reply({ content: "Invalid time!", ephemeral: true });
        else if (time > 31968000) interaction.reply({ content: "Cannot create timers over 1 year!", ephemeral: true });
        else if (time > 0) {
          let remText = interaction.options.getString("text").trim();
          if (remText == "") remText = "Unnamed reminder";
          let newRem = {
            guild: interaction.guildId,
            channel: interaction.channelId,
            text: remText,
            timestamp: Math.round(now() + time),
            mentions: []
          }
          createReminder(newRem);
          interaction.reply({
            content: "Added reminder for **_" + remText + "_** at <t:" + newRem.timestamp + ">",
            allowedMentions: { parse: [] }
          });
        }
        else {
          interaction.reply({ content: "Invalid time!", ephemeral: true });
        }
        break;
      }
      case "youtube": {
        let vid = interaction.options.getString("video");
        if (interaction.member.voice.channel) {
          joinVoiceChannel(interaction.member.voice.channel);
          if (interaction.options.getBoolean("autoplay")) {
            youtubeAutoplay = true;
          }
          else youtubeAutoplay = false;
          if (vid.startsWith("http")) {
            if (vid.includes("list=")) {
              let n = vid.indexOf("list=");
              let listId = vid.slice(n + 5);
              interaction.reply({ content: "Playing youtube in :sound:" + interaction.member.voice.channel.name, ephemeral: true });
              playYoutubePlaylist(listId, interaction.channel);
            }
            else {
              youtubePlaylist = [];
              interaction.reply({ content: "Playing youtube in :sound:" + interaction.member.voice.channel.name, ephemeral: true });
              playYoutube(vid, interaction.channel);
            }
          }
          else {
            youtubePlaylist = [];
            searchYoutube(vid).then((id) => {
              interaction.reply({ content: "Playing youtube in :sound:" + interaction.member.voice.channel.name, ephemeral: true });
              playYoutube("https://www.youtube.com/watch?v=" + id, interaction.channel);
            }).catch(() => { interaction.reply({ content: "No results!", ephemeral: true }); });
          }

        }
        break;
      }
      case "radio": {
        switch (interaction.options.getSubcommand()) {
          case "play": {
            let voice = interaction.member.voice.channel;
            let station = interaction.options.getInteger("station");
            if (station < radioStations.length && station >= 0) {
              interaction.reply(playStation(voice, station));
            }
            break;
          }
          case "custom": {
            let voice = interaction.member.voice.channel;
            let url = interaction.options.getString("url");
            if (url.startsWith("http")) {
              interaction.reply(playStation(voice, url));
            }
            break;
          }
          case "list": {
            let newMessage = "";
            for (let i = 0; i < radioStations.length; i++) {
              const station = radioStations[i];
              newMessage += "`" + i + "` - **" + station.name + "**\n";
            }
            interaction.reply({
              embeds: [{
                title: "JacekKocek Internet Radio",
                fields: [
                  {
                    name: "List of available stations", value: newMessage
                  }
                ],
                color: [24, 195, 177]
              }]
            })
            break;
          }
        }
        break;
      }
      case "matoshi": {
        switch (interaction.options.getSubcommand()) {
          case "award": {
            //console.log(interaction.user);
            if (interaction.user.id == "532918953014722560") {
              let amount = interaction.options.getInteger("amount");
              let target = interaction.options.getUser("user");
              modifyMatoshi(target.id, amount);
              interaction.reply({ content: "Successfully awarded " + amount + " ₥ to **" + target.username + "**", ephemeral: false });
            }
            else {
              interaction.reply({ content: "You are not permitted to mint matoshi! 1 ₥ deducted! :angry:", ephemeral: false });
              modifyMatoshi(interaction.user.id, -1);
            }
            break;
          }
          case "pay": {
            let from = interaction.user;
            let to = interaction.options.getUser("user");
            let amount = interaction.options.getInteger("amount");

            if (payMatoshi(from.id, to.id, amount)) {
              interaction.reply({ content: "Successfully paid **" + amount + "** ₥ to **" + to.username + "** (fee 1 matoshi)", ephemeral: false });
            }
            else {
              interaction.reply({ content: "Insufficient matoshi! :disappointed:", ephemeral: false });
            }
            break;
          }
          case "balance": {
            let user = interaction.options.getUser("user");
            if (!user) user = interaction.user;
            let balance = getMatoshi(user.id);
            interaction.reply({ content: "Matoshi balance for **" + user.username + "**: " + balance + " ₥", ephemeral: false });
            break;
          }
          case "list": {
            matoshiList().then(msg => { interaction.reply({ content: msg, ephemeral: false }); });
            break;
          }
        }
        break;
      }
    }
  }
});




client.on('messageCreate', message => {
  if (message.author.id != client.user.id) {

    if (message.mentions.has(client.user)) {
      if (message.type != "REPLY")
        message.channel.send(message.author.toString());
    }
    else if (message.content === ':gif2:') {

      kocek++;

      //message.channel.send(message.author.username,{files:[{attachment:message.author.displayAvatarURL()}],embed:{title:"kok",color:15158332,image:{url:message.author.displayAvatarURL()},fields:[{name:"ko",value:"text"}]}});
      //console.log("authro:" + message.author.username);
      //message.react("😌");
      //message.react("728583366030393414");
      message.delete();
      message.channel.send(client.emojis.cache.get("728583366030393414").toString());


      //message.channel.send(client.emojis.get("728583366030393414"));
    }
    else if (message.content === ':spin:') {

      message.delete();
      message.channel.send(client.emojis.cache.get("708663999201411122").toString());

    }
    else if (message.content === ':loading:') {

      message.delete();
      message.channel.send(client.emojis.cache.get("772234862652424203").toString());

    }
    else if (message.type == "REPLY") {
      let lowerCase = message.content.toLowerCase();
      if (lowerCase == "usmažit prosím" || lowerCase == "deep fried please") {
        message.channel.messages.fetch(message.reference.messageId).then(msg => {
          let url = null;
          if (msg.attachments.size > 0) {
            url = msg.attachments.first().proxyURL;
          }
          else if (msg.content.includes("http")) {
            url = msg.content.substr(msg.content.indexOf("http"));
          }
          if (url != null) {
            Jimp.read(url).then(image => {
              console.log("jimp start");
              const maxSize = 512;
              let w = image.getWidth();
              let h = image.getHeight();
              if (w > maxSize || h > maxSize) {
                image.scaleToFit(maxSize, maxSize)
              }
              let kernelSharpen = [[0, -3, 0], [-3, 13, -3], [0, -3, 0]];
              image
                .quality(10)
                .convolute(kernelSharpen)
                .contrast(.99)
                .color([{ apply: "saturate", params: [70] }])
                .convolute(kernelSharpen)
                .writeAsync("./outputImg.jpg").then(e => {
                  console.log("jimp done")
                  message.reply({ files: ["./outputImg.jpg"] }).then(
                    function () { fs.unlink("./outputImg.jpg") });
                });
            })
          }
        });
      }
    }
    else if (message.content.startsWith(prefix)) {
      var withoutPrefix = message.content.slice(prefix.length);
      var command, argument;
      if (withoutPrefix.indexOf(" ") != -1) {
        command = withoutPrefix.substr(0, withoutPrefix.indexOf(" "));
        argument = withoutPrefix.substr(withoutPrefix.indexOf(" ") + 1);
      }
      else {
        command = withoutPrefix;
        argument = null;
      }
      console.log("Command by " + message.author.username + ": " + command + ", argument: " + argument);
      switch (command) {
        case "cheese":
          message.delete();
          message.channel.send({
            embeds: [{
              title: "Cheese",
              color: [254, 181, 2],
              description: 'Cheese'
            }]
          });
          break;
        case "button": {
          message.delete();
          const row = new Discord.MessageActionRow().addComponents(
            new Discord.MessageButton()
              .setCustomId('test')
              .setLabel('Emergency meeting')
              .setStyle('DANGER')
          );
          const row2 = new Discord.MessageActionRow().addComponents(
            new Discord.MessageSelectMenu()
              .setCustomId('select')
              .setPlaceholder('Select your mogus')
              .addOptions([
                {
                  label: 'Red mogus',
                  description: 'common',
                  value: 'first_option',
                },
                {
                  label: 'Yellow mogus',
                  description: 'uncommon',
                  value: 'second_option',
                },
              ]),
          );
          message.channel.send({ content: "sus???", components: [row] })
          break;
        }
        case "say":
          message.delete();
          message.channel.send(argument);
          break;
        case "spell":
          message.delete().then(() => {
            argument = argument.replace(/ /g, "").toLowerCase();
            console.log("Sanitized argument: " + argument);
            message.channel.messages.fetch({ limit: 1 }).then(messages => {

              var previousMessage = messages.array()[0];
              for (var i = 0; i < argument.length; i++) {
                //message.channel.send(argument.charAt(i));
                previousMessage.react(letterEmoji[argument.charAt(i)]);
              }

            });
          });

          break;
        case "listLetterEmoji":
          var alphabet = "abcdefghijklmnopqrstuvwxyz";
          var emoji = "🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿";
          var sas = "🇦🇧";
          var result = "";
          for (var i = 0; i < alphabet.length; i++) {
            result += alphabet.charAt(i) + " : \"\\" + emoji.slice(i * 2, i * 2 + 2) + "\",\n";
            //message.react(emoji.slice(i, i + 1));
            message.react("🆗");
            console.log(emoji.length);
          }
          message.channel.send(result);
          console.log(result, emoji);
          break;
        case "changelog":
        case "changes":
        case "version": {
          message.delete();
          let commandChanges = "";
          let changeChanges = "";
          changelog.commands.forEach(commandName => {
            let c = -1;
            helpCommands.forEach(helpEntry => {
              if (helpEntry.name == commandName) {
                c = helpEntry;
                return;
              }
            });
            if (c != -1) {
              commandChanges += "`";
              if (c.prefix) commandChanges += prefix;
              commandChanges += c.name;
              if (c.arguments != "") commandChanges += " <" + c.arguments + ">";
              commandChanges += "` - " + c.description;
              commandChanges += "\n";
            }
          });
          changelog.changes.forEach(str => {
            changeChanges += "• ";
            changeChanges += str;
            changeChanges += "\n";
          });
          message.channel.send({
            embeds: [
              {
                color: [24, 195, 177],
                title: "JacekKocek v" + changelog.version, description: "Released " + changelog.releaseDate, fields: [
                  {
                    name: "New commands", value: commandChanges
                  },
                  {
                    name: "Changes", value: changeChanges
                  },

                ]
              }
            ]
          });
          break;
        }
        case "help":
          console.log(argument);
          if (argument == null) {

            var helpBasic = "";
            helpCommands.forEach(command => {
              helpBasic += "`";
              if (command.prefix) helpBasic += prefix;
              helpBasic += command.name;
              if (command.arguments != "") helpBasic += " <" + command.arguments + ">";
              helpBasic += "` - " + command.description;
              helpBasic += "\n";
            });
            var helpAdmin = "";
            helpAdminCommands.forEach(command => {
              helpAdmin += "`";
              if (command.prefix) helpAdmin += prefix;
              helpAdmin += command.name;
              if (command.arguments != "") helpAdmin += " " + command.arguments;
              helpAdmin += "` - " + command.description;
              helpAdmin += "\n";
            });


            message.channel.send({
              embeds: [{
                color: [24, 195, 177],
                title: "Help", description: "Type `" + prefix + "help <command>` to get further info on a command", fields: [
                  {
                    name: "Basic commands", value: helpBasic
                  },
                  {
                    name: "Admin commands", value: helpAdmin
                  },

                ]
              }]
            });

          }
          else if (argument == "help") {
            message.channel.send("If you use " + prefix + "help to get help for " + prefix + "help you need help");
          }
          else {
            var cleanArg;
            if (argument.startsWith(prefix)) {
              cleanArg = argument.slice(prefix.length);
            }
            else cleanArg = argument;
            var c = findCommand(cleanArg);
            if (c != null) {
              message.channel.send({
                embeds: [{
                  title: "Help - " + c.name, description: (c.longDescription != null ? c.longDescription : c.description)
                }]
              });

            }
            else {
              message.channel.send("`" + argument + "` is not a command!");
            }
          }
          break;
        case "s":
          if (costMatoshi(message.guildId, message.author.id, 1)) {
            console.log("SEARCH!");
            startGoogleSearch(argument, message, 1);
          }
          else {
            message.reply({ content: "Insufficient matoshi!", allowedMentions: { repliedUser: false } });
          }
          break;
        case "film":
          console.log("SEARCH!");
          startGoogleSearch(argument, message, 2);
          break;

        case "zobrazit":
          message.channel.send("No longer supported!");
          break;
          startGoogleSearch(argument, message, 0);

          break;
        case "w2g":
          message.channel.send("No longer supported!");
          break;
          httpPost("https://w2g.tv/rooms/create.json").then(parsed => { message.channel.send(parsed) });

          break;
        case "nuke":
          if (message.author.username != "RudolfJelin") {
            message.delete().then(() => {
              var argNumber = 1;
              argNumber = parseInt(argument);
              if (argNumber == "NaN") argNumber = 0;
              if (argNumber > 0) {
                if (argNumber > 20 && message.author.tag != "Mylapqn#5546") argNumber = 20;
                console.log("Deleting " + argNumber + " last messages in #" + message.channel.name + ", command by " + message.author.username);
                let channel = message.channel;
                message.channel.messages.fetch({ limit: argNumber }).then(messages => {

                  var previousMessages = Array.from(messages.values());
                  for (var i = 0; i < argNumber; i++) {
                    var reacts = Array.from(previousMessages[i].reactions.cache.mapValues(reaction => reaction._emoji.name).values());
                    //message.channel.send(argument.charAt(i));
                    previousMessages[i].delete();
                    if (reacts.includes("♋")) break;
                  }

                });
                /*channel.fetch().then(channel => {for (var i = 0; i < argNumber; i++) {
                  let lastMessage= channel.lastMessage;
                  var reacts = lastMessage.reactions.cache.mapValues(reaction => reaction._emoji.name).array();
                  //message.channel.send(argument.charAt(i));
                  lastMessage.delete();
                  if (reacts.includes("♋")) break;
                }});*/



              }
            });
          }
          else {
            message.channel.send("cringe");
          }
          break;
        case "kino": {
          message.delete();
          if (argument) {

            //let weekDays = "   po        út         st         čt         pá        so        ne";

            let film = argument.toLowerCase();
            if (kinoData.has(film)) {
              message.channel.send("There is already a vote on ***" + toTitleCase(film) + "***! Use `$kinoReset " + film + "` to reset the vote.");
            }
            else {
              startGoogleSearch(argument, message, 2);
              let newMessage = "";
              let m = {};

              let obj = {
                filmName: toTitleCase(film),
                message: message,
                users: new Map()
              }

              message.guild.members.fetch().then(function (membersList) {
                membersList.each(u => {
                  if (u.user != client.user) {
                    console.log("User: " + u.user.username);
                    //m[u.user.username] = {response:0,mention:u.toString()};
                    obj.users.set(u.user.username, { response: 0, reactionCount: 0, mention: u.toString() });
                  }
                });
                //console.log(m);
                obj.users.forEach(u => {
                  if (u.response == 0) newMessage = newMessage + "❓ ";
                  if (u.response == 1) newMessage = newMessage + "✅ ";
                  if (u.response == 2) newMessage = newMessage + "<:white_cross:767907092907687956> ";
                  newMessage = newMessage + u.mention;
                  newMessage = newMessage + "\n";
                });
                //kinoMessageUsers.push({users:m,film:argument});

                message.channel.send("Bude ***" + obj.filmName + "***?\n" + newMessage).then((m) => {
                  console.log("Kino message sent.");
                  m.react("767907091469828106");
                  m.react("767907090709872661");
                  m.react("767907091125895178");
                  m.react("767907091880476732");
                  m.react("767907093205614622");
                  m.react("767907093222916126");
                  m.react("767907093352153118");
                  m.react("767907092907687956");
                  //kinoMessages.push(m);
                  obj.message = m;
                  console.log("Message reactions added.");
                });
                kinoData.set(film, obj);
                if (kinoPlaylist.has(film)) {
                  console.log("Found film in suggestions.");
                  kinoPlaylist.get(film).watched = true;
                  savePlaylist();
                }
                else {
                  console.log("Creating film in suggestions.");
                  kinoPlaylist.set(film, {
                    name: toTitleCase(film),
                    suggestedBy: message.author.username,
                    watched: true
                  });
                }
                console.log("Kino done.");
              }).catch(console.log);

            }
          } else {
            message.channel.send("You need to specify a film! :angry:");
          }

          break;
        }
        case "kinoReset": {
          message.channel.send("No longer supported! Use the slash command instead.");
          break;
          message.delete();
          if (argument) {
            let film = argument.toLowerCase();
            if (kinoData.has(film)) {
              kinoData.delete(film);
              message.channel.send("The data for ***" + toTitleCase(film) + "*** was successfully reset.");
            }
            if (kinoPlaylist.has(film)) {
              kinoPlaylist.delete(film);
              savePlaylist();
              message.channel.send("The suggestion for ***" + toTitleCase(film) + "*** was successfully reset.");
            }
            else {
              message.channel.send("Cannot find any vote or suggestion for ***" + toTitleCase(film) + "*** :disappointed:");
            }
          } else {
            message.channel.send("You need to specify a film! :angry:");
          }
          break;
        }
        case "kinoRemind": {
          message.channel.send("No longer supported! Use the slash command instead.");
          break;
          message.delete();
          if (argument) {
            let film = argument.toLowerCase();
            if (kinoData.has(film)) {
              let kinoEntry = kinoData.get(film);
              let newMessage = "";

              kinoEntry.users.forEach(u => {
                if (u.response == 1) newMessage = newMessage + "✅ " + u.mention;
                newMessage = newMessage + "\n";
              });
              message.channel.send(newMessage + "Bude ***" + kinoEntry.filmName + "***?\n" + kinoEntry.message.url);
            }
            else {
              message.channel.send("Cannot find any vote for ***" + toTitleCase(film) + "*** :disappointed:");
            }
          } else {
            message.channel.send("You need to specify a film! :angry:");
          }
          break;
        }
        case "suggestions":
        case "playlist":
        case "kinoPlaylist": {
          message.channel.send("No longer supported! Use the slash command instead.");
          break;
          message.delete();
          if (kinoPlaylist.size > 0) {
            //let newMessage = "**Film suggestions:**\n✅ - Watched, <:white_cross:767907092907687956> - Not watched\n\n";
            let newMessage = "**__Film suggestions:__**\n";
            /*kinoPlaylist.forEach(f => {
              if (f.watched) newMessage += "✅ "
              else newMessage += "<:white_cross:767907092907687956> ";
              newMessage += "*"+f.name + "* - by **"+f.suggestedBy+"**\n";
            });*/
            kinoPlaylist.forEach(f => {
              newMessage += "• ";
              if (f.watched) newMessage += "~~*" + f.name + "*~~";
              else newMessage += "***" + f.name + "***";
              newMessage += "\n";

            });
            message.channel.send(newMessage);
          }
          else {
            message.channel.send("The playlist is empty!");
          }
          break;
        }
        case "suggest":
        case "kinoSuggest": {
          message.channel.send("No longer supported! Use the slash command instead.");
          break;
          message.delete();
          if (argument) {
            let filmName = argument.toLowerCase();
            if (kinoPlaylist.has(filmName)) {
              message.channel.send("***" + toTitleCase(filmName) + "*** has already been suggested by **" + kinoPlaylist.get(filmName).suggestedBy + "**.");
            }
            else if (kinoData.has(filmName)) {
              message.channel.send("There is already a plan to watch ***" + toTitleCase(filmName) + "***: " + kinoData.get(filmName).message.url);
            }
            else {
              let newSug = {
                name: toTitleCase(filmName),
                suggestedBy: message.author.username,
                watched: false
              }
              kinoPlaylist.set(filmName, newSug);
              savePlaylist();
              message.channel.send("**" + message.author.username + "** added ***" + newSug.name + "*** to film suggestions.");
            }
          }
          else {
            message.channel.send("Suggest WHAT???");
          }
          break;
        }

        case "noise": {
          if (message.member.voice.channel) {
            voiceChannelPlay(message.member.voice.channel, "http://uk1.internet-radio.com:8004/live", 0.063);

            /*
            message.member.voice.channel.join().then(voice => {
              message.delete();
              //voicePlay(voice,"https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_1MG.mp3", { volume: 0.2 });

              voicePlay(voice, "http://uk1.internet-radio.com:8004/live", { volume: 0.063 });

            }, function (e) { console.log("REJECTED!!!", e) });
            */

          }
          break;
        }
        case "tudum": {
          if (message.member.voice.channel) {
            let v = 1.2;
            if (argument && !isNaN(argument)) v = argument;
            voiceChannelPlay(message.member.voice.channel, "tududum.mp3", v);
          }
          break;
        }
        case "radio": {
          message.delete();
          if (argument == "stations" || argument == "list" || argument == "" || argument == null) {
            let newMessage = "";
            for (let i = 0; i < radioStations.length; i++) {
              const station = radioStations[i];
              newMessage += "`" + i + "` - **" + station.name + "**\n";
            }
            message.channel.send({
              embeds: [{
                title: "JacekKocek Internet Radio",
                fields: [
                  {
                    name: "List of available stations", value: newMessage
                  },
                  {
                    name: "How to use", value: "Type `$radio` followed by the station number or name.\nYou can also use a custom radio URL."
                  },
                ],
                color: [24, 195, 177]
              }]
            });
          }
          else if (message.member.voice.channel) {
            let voice = message.member.voice.channel;
            //voicePlay(voice,"https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_1MG.mp3", { volume: 0.2 });
            //voicePlay(voice,"http://us4.internet-radio.com:8197/stream", { volume: 0.3 });
            let num = parseInt(argument);
            //console.log(num);
            if (!isNaN(num)) {
              if (num < radioStations.length && num >= 0)
                playStation(voice, num, message.channel);
              else message.channel.send('Station number "' + num + '" not found. :disappointed:');
            }
            else if (argument.startsWith("http")) {
              playStation(voice, argument, message.channel);
            }
            else {
              let st = radioStations.findIndex(element => element.name.toLowerCase().includes(argument.toLowerCase()));
              if (st != -1) playStation(voice, st, message.channel);
              else message.channel.send('Station "' + argument + '" not found. :disappointed:');
              //console.log(radioStations[0].name);
              //console.log(radioStations[0].name.includes("Evropa"));
            }


          }
          break;
        }
        case "song": {
          message.delete();
          if (message.member.voice.channel)
            mlpSong(message.member.voice.channel, argument, false, message.channel);
          break;
        }
        case "songs": {
          message.delete();
          if (message.member.voice.channel)
            mlpSong(message.member.voice.channel, argument, true, message.channel);
          break;
        }
        case "mlpRadio": {
          message.delete();
          if (message.member.voice.channel)
            playRadio(message.member.voice.channel, message.channel);
          break;
        }
        case "mlpMix": {
          message.delete();
          if (message.member.voice.channel) {
            fs.existsSync("mlp-mix.ogg");
            voiceChannelPlay(message.member.voice.channel, "mlp-mix.ogg", .5);
            //voiceChannelPlay(message.member.voice.channel, "mlp-mix.ogg", .5);
            message.channel.send({
              embeds: [{
                title: "► " + "MLP Mix",
                color: [159, 101, 224],
                description: '4:17 | From *Andrej*'
              }]
            });
          }
          break;
        }

        case "stop": {
          let connection = DiscordVoice.getVoiceConnection(message.guildId);
          if (connection) {
            connection.disconnect();
            message.delete();
            message.channel.send("Stopped.");
          }
          clearYoutubeTimeout();
          youtubePlaylist = [];
          if (radioTimer) clearTimeout(radioTimer);
          break;
        }
        case "listen": {
          if (message.member.voice.channel) {
            let channel = message.member.voice.channel;
            let connection = DiscordVoice.joinVoiceChannel({
              channelId: channel.id,
              guildId: channel.guild.id,
              adapterCreator: channel.guild.voiceAdapterCreator,
              selfDeaf: false
            })
            //let receiver = new DiscordVoice.VoiceReceiver(connection);
            //connection.subscribe(audioPlayer);
            let receiver = connection.receiver;
            let audioStream = receiver.subscribe(message.member.user.id);
            audioStream.on("data", (data) => {
              connection.playOpusPacket(data);
            });
            //receiver.onWsPacket((p)=>{console.log("data!!");connection.playOpusPacket(p)});
          }
          break;
        }
        case "time": {
          message.channel.send(dateString(new Date(Date.now() - getTimeOffset(new Date(), defaultTimeZone))));
          message.channel.send(new Date().toString());
          break;
        }

        case "youtube":
        case "yt": {
          message.channel.send("No longer supported! Use the slash command instead.");
          break;
          message.delete();
          if (message.member.voice.channel && argument) {
            joinVoiceChannel(message.member.voice.channel);
            if (argument.startsWith("http")) {
              if (argument.includes("list=")) {
                let n = argument.indexOf("list=");
                let listId = argument.slice(n + 5);
                playYoutubePlaylist(listId, message.channel);
              }
              else {
                youtubePlaylist = [];
                playYoutube(argument, message.channel);
              }
            }
            else {
              youtubePlaylist = [];
              searchYoutube(argument).then((id) => { playYoutube("https://www.youtube.com/watch?v=" + id, message.channel); }).catch(() => { message.channel.send("No results") });
            }
          }

          break;
        }
        case "skip": {
          console.log("Commans");
          message.delete();
          if (nextYoutube && youtubeAutoplay) {
            console.log("Skipping");
            let voice = message.guild.me.voice.channel;
            if (voice) {
              console.log("Voice");
              if (argument && youtubePlaylist.length > 0) {
                let num = parseInt(argument);
                if (num != "NaN") {
                  //message.channel.send("sas " + youtubePlaylistPosition + " sas " + num);
                  youtubePlaylistPosition += (num - 1);
                  if (youtubePlaylistPosition >= 0 && youtubePlaylistPosition < youtubePlaylist.length) {
                    nextYoutubeData.url = "https://www.youtube.com/watch?v=" + youtubePlaylist[youtubePlaylistPosition];
                  }
                  else {
                    message.channel.send("Cannot skip outside of playlist!");
                    youtubePlaylistPosition -= (num - 1);
                  }
                }
              }
              playYoutube(nextYoutubeData.url, nextYoutubeData.channel);
            }
          }
          break;
        }
        case "remindList": {
          cleanupReminders();
          saveReminders();
          let msg = "__Reminders:__\n";
          reminders.forEach(rem => {
            msg += "• **" + rem.text + "** at <t:" + rem.timestamp + ">\n";
          });
          message.channel.send({ content: msg, allowedMentions: { parse: [] } });
          break;
        }

        default:
          message.channel.send("Unknown command :disappointed:");

      }
    }
    else if (message.content.startsWith("#")) {
      let reg = /^#([0-9a-f]{3}){1,2}$/i;
      if (reg.test(message.content)) {

        let can = Canvas.createCanvas(100, 100);
        let ctx = can.getContext("2d");
        ctx.fillStyle = message.content;
        ctx.fillRect(0, 0, 100, 100);
        let buf = can.createPNGStream();
        message.channel.send({ files: [buf] });
      }

    }
  }
});


//#region REMINDERS

function parseTime(inputString) {
  let units = -1;
  let unitString = inputString.match(/[a-zA-Z]+/g)[0];
  if (unitString == "") return -1;
  if (unitString.startsWith("sec") || unitString == "s") {
    units = 1;
  }
  else if (unitString.startsWith("min") || unitString == "m") {
    units = 60;
  }
  else if (unitString.startsWith("hour") || unitString == "h" || unitString == "hr") {
    units = 3600;
  }
  else if (unitString.startsWith("day") || unitString == "d") {
    units = 86400;
  }
  else if (unitString.startsWith("week") || unitString == "w") {
    units = 604800;
  }
  else if (unitString.startsWith("mon")) {
    units = 2592000;
  }
  return parseFloat(inputString) * units;
}

function createReminder(newRem) {
  let time = newRem.timestamp - now();
  if (time <= reminderThreshold) {
    newRem.timeout = setTimeout(() => {
      executeReminder(newRem);
    }, (time) * 1000);;
    upcomingReminders.push(newRem);
    console.log("Set up 1 reminder immediately.")
  }
  reminders.push(newRem);
  saveReminders();
}

function cleanupReminders() {
  for (let i = 0; i < reminders.length; i++) {
    let rem = reminders[i];
    if (rem.timestamp < now()) {
      reminders.splice(i, 1);
    }
  }
}

function setupReminders() {
  cleanupReminders();
  upcomingReminders = [];
  for (let i = 0; i < reminders.length; i++) {
    let rem = reminders[i];
    if (rem.timestamp > now() && rem.timestamp <= now() + reminderThreshold) {
      let timeout = setTimeout(() => {
        executeReminder(rem);
      }, (rem.timestamp - now()) * 1000);
      if (rem.timeout) {
        clearTimeout(rem.timeout);
      }
      rem.timeout = timeout;
      upcomingReminders.push(rem);
    }

  }
  if (upcomingReminders.length > 0)
    console.log("Set up " + upcomingReminders.length + " reminders.")
}

function now() {
  return Date.now() / 1000;
}

function executeReminder(rem) {
  client.guilds.fetch(rem.guild).then(guild => {
    guild.channels.fetch(rem.channel).then(channel => {
      let mentions = "";
      if (rem.mentions) {
        rem.mentions.forEach(m => {
          mentions += "<@!" + m + "> ";
        });
      }

      let toSend = "**Reminder: **" + rem.text;
      /*let toSend = {
        embeds: [{
          title: "Reminder",
          color: [24, 195, 177],
          description: rem.text
        }]
        if (mentions != "") {
          toSend.content = mentions
        }
      }*/

      channel.send(toSend);

      reminders.splice(reminders.indexOf(rem), 1);
    });
  });
}

//#endregion

//#region KINO
client.on("messageReactionAdd", (messageReaction) => {
  let emojiName = messageReaction.emoji.name;
  let reactionUser = messageReaction.users.cache.last();
  let reactionMessage = messageReaction.message;

  let paymentData = paymentMessages.get(reactionMessage.id);
  if (paymentData != undefined) {
    if (reactionUser.id == paymentData.from) {
      if (emojiName == "✅") {
        if (payMatoshi(paymentData.from, paymentData.to, paymentData.amount)) {
          reactionMessage.reply("Payment successful!");
        }
        else {
          reactionMessage.reply("Insufficient matoshi!");
        }
        paymentMessages.delete(reactionMessage.id);
      } else if (emojiName == "white_cross") {
        reactionMessage.reply("Payment cancelled");
        paymentMessages.delete(reactionMessage.id);
      }
    }
  }
  else {
    let kinoEntry = -1;

    kinoData.forEach(obj => {
      if (obj.message.id == messageReaction.message.id) {
        kinoEntry = obj;
        return;
      }
    });

    if (kinoEntry != -1) {
      let kinoUser = kinoEntry.users.get(reactionUser.username);
      if (reactionUser != client.user) {

        kinoUser.reactionCount++;
        console.log("Reaction " + emojiName);

        if (weekDayNames.indexOf(emojiName) != -1) {
          //console.log("Current count: " + kinoUser.reactionCount);
          kinoUser.response = 1;
        }
        if (emojiName == "white_cross") {
          kinoUser.response = 2;
        }

        updateKinoMessage(kinoEntry);

      }
    }
  }
});

client.on("messageReactionRemove", (messageReaction, user) => {
  //let ind = kinoMessages.indexOf(messageReaction.message);
  let kinoEntry = -1;

  kinoData.forEach(obj => {
    if (obj.message.id == messageReaction.message.id) {
      kinoEntry = obj;
      return;
    }
  });

  if (kinoEntry != -1) {

    let emojiName = messageReaction.emoji.name;
    let kinoUser = kinoEntry.users.get(user.username);

    if (user != client.user) {


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
      updateKinoMessage(kinoEntry);

    }
  }
});

function updateKinoMessage(kinoEntry) {
  let newMessage = "";
  kinoEntry.users.forEach(u => {
    if (u.response == 0) newMessage = newMessage + "❓ ";
    if (u.response == 1) newMessage = newMessage + "✅ ";
    if (u.response == 2) newMessage = newMessage + "<:white_cross:767907092907687956> ";
    newMessage = newMessage + u.mention;
    newMessage = newMessage + "\n";
  });
  //kinoMessageUsers.push({users:m,film:argument});

  kinoEntry.message.edit("Bude ***" + kinoEntry.filmName + "***?\n" + newMessage);
}

function savePlaylist() {
  fs.writeFile(playlistFileName, JSON.stringify(Array.from(kinoPlaylist)), (e) => { console.log("Finished writing", e) });
}

function loadPlaylist() {
  try {
    let read = fs.readFileSync(playlistFileName);
    kinoPlaylist = new Map(JSON.parse(read));
    console.log("Loaded kino playlist.");
  } catch (error) {
    console.log("Could not load kino playlist!");
    console.log(error);
  }
}

function loadMatoshi() {
  try {
    let read = fs.readFileSync(matoshiFileName);
    matoshiBalance = new Map(JSON.parse(read));
    console.log("Loaded matoshi.");
  } catch (error) {
    console.log("Could not load matoshi!");
    console.log(error);
  }
}

function saveMatoshi() {
  fs.writeFile(matoshiFileName, JSON.stringify(Array.from(matoshiBalance)), (e) => { console.log("Finished writing", e) });
}

function modifyMatoshi(user, amount) {
  let m = getMatoshi(user);
  matoshiBalance.set(user, m + amount);
  console.log("User ID " + user + " matoshi modified by " + amount + ", now " + matoshiBalance.get(user));
  saveMatoshi();
}

function payMatoshi(from, to, amount) {
  if (getMatoshi(from) >= amount && amount > 1) {
    modifyMatoshi(from, -amount);
    modifyMatoshi(to, amount - 1);
    modifyMatoshi(client.user.id, 1);
    return true;
  }
  else return false;
}

function costMatoshi(guild, user, amount) {
  if (guild == "549589656606343178") {
    if (getMatoshi(user) > amount) {
      modifyMatoshi(user, -amount);
      modifyMatoshi(client.user.id, amount);
      return true;
    }
    else return false;
  }
  else return true;
}

function awardMatoshi(guild, user, amount) {
  if (guild == "549589656606343178") {
    modifyMatoshi(user, amount);
  }
  return true;
}

async function matoshiList() {
  let sorted = Array.from(matoshiBalance.keys()).sort((a, b) => { return matoshiBalance.get(b) - matoshiBalance.get(a); });
  let msg = "Matoshi balance leaderboard:\n";
  for (let i = 0; i < sorted.length && i < 10; i++) {
    let usr = await afrGuild.members.fetch(sorted[i]);
    if (!usr) usr = "Unknown user";
    else usr = usr.user.username;
    msg += "`" + (i + 1) + "` " + "**" + usr + "**: " + matoshiBalance.get(sorted[i]) + " ₥\n";
  }
  return msg;
}

async function matoshiPaymentMessage(data) {
  let channel = await afrGuild.channels.fetch("753323827093569588");
  let from = await afrGuild.members.fetch(data.from);
  let to = await afrGuild.members.fetch(data.to);
  let newEmbed = new Discord.MessageEmbed()
    .setTitle("Payment request")
    .setDescription(data.description)
    .addField("Amount",data.amount+" ₥",false)
    .addField("From", from.displayName, true)
    .addField("To", to.displayName, true)
    .setFooter({ text: "Only "+from.displayName+" can confirm this payment." })
    .setColor([24, 195, 177])
  let newActionRow = new Discord.MessageActionRow().addComponents([
    new Discord.MessageButton()
      .setCustomId("acceptPayment")
      .setLabel("Accept")
      .setStyle("SUCCESS"),
    new Discord.MessageButton()
      .setCustomId("declinePayment")
      .setLabel("Decline")
      .setStyle("DANGER"),
  ]);
  channel.send({ content:"<@"+from.id+">",embeds: [newEmbed], components: [newActionRow] }).then(msg => {
    //msg.react("✅");
    //msg.react("767907092907687956");
    paymentMessages.set(msg.id, data);
  });
  return true;
}

function getMatoshi(user) {
  if (!matoshiBalance.has(user)) {
    matoshiBalance.set(user, 0);
  }
  let b = matoshiBalance.get(user);
  if (b == null || b == undefined || b == NaN) {
    matoshiBalance.set(user, 0);
    console.log("User ID " + user + " matoshi balance is NaN, resetting to 0");
  }
  return matoshiBalance.get(user);
}


function saveReminders() {
  let f = [];
  reminders.forEach(r => {
    f.push({
      guild: r.guild,
      channel: r.channel,
      text: r.text,
      timestamp: r.timestamp,
      mentions: r.mentions
    })
  });
  fs.writeFile(remindersFileName, JSON.stringify(f), (e) => { console.log("Finished writing", e) });
}

function loadReminders() {
  try {
    let read = fs.readFileSync(remindersFileName);
    reminders = JSON.parse(read);
    console.log("Loaded reminders.");
    console.log(reminders);
    cleanupReminders();
  } catch (error) {
    console.log("Could not load reminders!");
    console.log(error);
  }
}

function setupCommands() {
  try {
    let globalCommands = JSON.parse(fs.readFileSync("globalCommands.json"));
    let guildCommands = JSON.parse(fs.readFileSync("guildCommands.json"));
    if (updateGlobalCommands) {
      client.application?.commands.set(globalCommands);
      commandsToDeleteGlobal.forEach(na => {
        afrGuild.commands.delete(na);
      })
      console.log("Updated global commands.");
    }
    afrGuild.commands.set(guildCommands);
    commandsToDeleteGuild.forEach(na => {
      afrGuild.commands.delete(na);
    })

    console.log("Updated guild commands.");
  } catch (error) {
    console.log("Could not load commands!");
    console.log(error);
  }
}



//#endregion

//#region FIND FUNCTIONS
function findRole(cache, name) {
  array = cache.array();
  for (var i = 0; i < array.length; i++) {
    if (array[i].name == name) return array[i];
  }
  return null;
}

function findMember(guild, name) {
  array = guild.members.cache.array();
  for (var i = 0; i < array.length; i++) {
    if (array[i].name == name) return array[i];
  }
  return null;
}

function findCommand(name) {
  for (var i = 0; i < helpCommands.length; i++) {
    if (helpCommands[i].name == name) return helpCommands[i];
  }
  return null;
}
//#endregion

//#region GOOGLE
function startGoogleSearch(argument, message, type) {

  console.log("Starting Google Search for: " + argument);

  var cx;
  var index = 0;
  var searchTerm;

  if (type == 2) {
    cx = "513b4641b78f8096a";
    searchTerm = argument;
    googleSearch(cx, searchTerm, message);
  }
  if (type == 1) {
    cx = "003836403838224750691:axl53a8emck";
    searchTerm = argument;
    googleSearch(cx, searchTerm, message);
  }
  else if (type == 0) {
    var previousMessage;
    message.channel.messages.fetch({ limit: 2 }).then(messages => {

      previousMessage = messages.array()[1];

      searchTerm = previousMessage.content;
      if (argument == null) {
        cx = "003836403838224750691:wcw78s5sqwm";
      }
      else if (argument == "vše") {
        cx = "003836403838224750691:axl53a8emck";
        console.log("AKKKKKKKKKK");
      }
      else if (argument == "více") {
        cx = "003836403838224750691:axl53a8emck";
        index = 1;
        console.log("AKKKKKKKKKK");
      }
      else if (argument.startsWith("ještě")) {
        tempArg = argument;
        while (tempArg.startsWith("ještě")) {
          tempArg = tempArg.slice("ještě ".length);
          index++;
        }
        if (tempArg == "více") {
          index++;
        }
        else {
          message.channel.send(argument + " is not a valid argument! :angry:", { tts: true });
          return;
        }
      }
      else {
        message.channel.send(argument + " is not a valid argument! :angry:", { tts: true });
        return;
      }
      if (index == 0) {
        googleSearch(cx, searchTerm, message);
      }
      else {
        if (lastSearchResults != null && lastSearchResults[index] != null)
          message.channel.send(lastSearchResults[index].title + "\n" + lastSearchResults[index].snippet + "\n" + lastSearchResults[index].link, { tts: false });
        else
          message.channel.send("No results :disappointed:", { tts: true });
      }
    });
  }
}
function googleSearch(cx, searchTerm, message) {
  Https.get("https://www.googleapis.com/customsearch/v1?key=" + process.env.SEARCH_API_KEY + "&cx=" + cx + "&q=" + searchTerm, function (res) {
    console.log("HTTPS Status:" + res.statusCode);
    var body;
    res.on("data", function (data) {
      body += data;
    });
    res.on("end", function () {
      var parsed = JSON.parse(body.substring(9, body.length));
      var resultsList = parsed.items;


      if (resultsList != null) {
        lastSearchResults = resultsList;
        //console.log(resultsList);
        //console.log(parsed.queries);

        message.channel.send(resultsList[0].title + "\n" + resultsList[0].snippet + "\n" + resultsList[0].link, { tts: false });
      }
      else
        message.channel.send("No results :disappointed:", { tts: true });

    });
  });
}
//#endregion

//#region SONGS AND YOUTUBE

function voiceChannelPlay(channel, audio, volume) {
  if (channel != null)
    joinVoiceChannel(channel);
  let res = DiscordVoice.createAudioResource(audio, { inlineVolume: true });
  let v = volume ?? 1;
  v = Math.min(Math.abs(v), 5);
  res.volume.volume = v;
  audioPlayer.play(res);
}

function joinVoiceChannel(channel) {
  DiscordVoice.joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  }).subscribe(audioPlayer);
}

function clearYoutubeTimeout() {
  youtubePlaying.forEach(d => {
    clearInterval(d.barInterval);
  })
  if (nextYoutube) clearTimeout(nextYoutube);
  nextYoutube = null;
}
youtubePlaylistName = "Unknown Playlist";
function playYoutubePlaylist(playlistUrl, channel) {
  getYoutubePlaylistName(playlistUrl).then(title => {
    youtubePlaylistName = title;
  })
  getYoutubePlaylist(playlistUrl).then((items) => {
    youtubePlaylist = items.map(x => x.contentDetails.videoId);
    youtubePlaylistPosition = 0;
    console.log(youtubePlaylist);
    playYoutube("https://www.youtube.com/watch?v=" + youtubePlaylist[0], channel);
  })
}

function playYoutube(videoUrl, channel) {
  console.log("playing " + videoUrl);
  let videoStream = ytdl(videoUrl, { filter: "audioonly", highWaterMark: 10e6 });
  videoStream.on("info", (info) => {
    let vidId = info.videoDetails.videoId;
    if (!youtubeRecent.includes(vidId)) {
      youtubeRecent.push(vidId);
      if (youtubeRecent.length > youtubeRecentMax) {
        youtubeRecent.shift();
      }
    }
    console.log("info" + info);
    let length = info.videoDetails.lengthSeconds;
    let lenString = timeString(length);
    let embed = new Discord.MessageEmbed()
      .setColor([255, 0, 0])
      .setTitle("► " + info.videoDetails.title)
      .setDescription(lenString + ' | From *' + info.videoDetails.ownerChannelName + '*')
      .setURL(videoUrl);

    if (youtubePlaylist.length > 0) {
      embed.setFooter(youtubePlaylistPosition + 1 + "/" + (youtubePlaylist.length) + " in " + youtubePlaylistName);
    }
    let newPlaying = {
      //statusMsg,
      voiceChannel: channel,
      elapsed: 0,
      length: length * 1000,
      //barInterval,
      //nextUrl,
      //nextData,
      autoplay: youtubeAutoplay,
      embed: embed
    }
    newPlaying.barInterval = setInterval(() => {
      updateYoutubeMessage(newPlaying);
    }, 5000);
    try {
      channel.send({ embeds: [embed, generateYoutubeBarEmbed(0, length * 1000, 9)] }).then(msg => {
        newPlaying.statusMsg = msg;
      });

    } catch (error) {
      console.log(error)
    }
    //console.log(info);
    voiceChannelPlay(null, videoStream, 0.8)
    //voicePlay(voice, videoStream, { volume: 0.8 });
    let nextVideo;
    if (youtubePlaylist.length > 0) {
      youtubePlaylistPosition++;
      if (youtubePlaylist.length > youtubePlaylistPosition) {
        nextVideo = youtubePlaylist[youtubePlaylistPosition];
      }
      else {
        channel.send('End of playlist "' + youtubePlaylistName + '".');
        clearYoutubeTimeout();
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
    if (nextVideo) {
      let nextUrl = "https://www.youtube.com/watch?v=" + nextVideo;
      videoStream.on("finish", () => {
      });
      clearYoutubeTimeout();
      nextYoutube = setTimeout(() => { playYoutube(nextUrl, channel) }, (parseInt(length) + 3) * 1000);
      nextYoutubeData = { url: nextUrl, channel: channel };
      newPlaying.nextUrl = nextYoutube;
      newPlaying.nextData = nextYoutubeData;
    }
    youtubePlaying.push(newPlaying);
  })
}

function getYoutubePlaylist(argument) {
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

function httpPost(url) {
  console.log("asas");
  let opts = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "w2g_api_key": "<api_key>",
      "share": "https://www.youtube.com/watch?v=8Wdp35Z-fRs",
      "bg_color": "#00ff00",
      "bg_opacity": "50"
    })
  }
  return new Promise((resolve, reject) => {
    console.log("HTTPS POST");
    Https.request(url, opts, function (res) {
      console.log("HTTPS POST Status:" + res.statusCode);
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
        else {
          console.log("POST SUCCESS! Items: " + parsed);
          resolve(parsed);
        }
      });
    });
  });
}

function getYoutubePlaylistName(argument) {
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

function searchYoutube(argument) {
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

function updateYoutubeMessage(data) {
  data.elapsed = Math.min(data.elapsed + 5000, data.length);
  if (data.statusMsg) {
    data.statusMsg.edit({ embeds: [data.embed, generateYoutubeBarEmbed(data.elapsed, data.length, 9)] })
  }
  //console.log("Played " + data.elapsed / 1000 + "s out of" + data.length / 1000 + "s");
  if (data.elapsed >= data.length) {
    clearInterval(data.barInterval);
  }
}

function generateYoutubeBarEmbed(elapsed, length, count) {
  let playingBar = "";
  playingBar += "`" + timeString(elapsed / 1000) + "` ";
  let playRatio = elapsed / length;
  let playInt = Math.floor(playRatio * count);
  let modulo = Math.floor(playRatio * count * 4) % 4;
  for (let i = 0; i < count; i++) {
    if (i < playInt) playingBar += "<:yt4:951917157216813056>";
    if (i == playInt) {
      if (modulo == 0) playingBar += "<:yt1:951917157212622858>";
      if (modulo == 1) playingBar += "<:yt2:951917157275533352>";
      if (modulo == 2) playingBar += "<:yt3:951917157279756378>";
      if (modulo == 3) playingBar += "<:yt4:951917157216813056>";
    }
    if (i > playInt) playingBar += "<:yt0:951917157304926238>";
  }
  playingBar += " `" + timeString(length / 1000) + "`";
  return new Discord.MessageEmbed()
    .setColor([255, 0, 0])
    .setTitle(playingBar);
}

function mlpSong(voice, index, autoplay, channel) {
  let id = index;
  if (!index || index == "") id = Math.round(Math.random() * 202)
  Https.get("https://ponyweb.ml/v1/song/" + id + "?time=second", function (res) {
    console.log(res.statusCode);
    var body;
    res.on("data", function (data) {
      body += data;
    });
    res.on("end", function () {

      var parsed = JSON.parse(body.substring(9, body.length));
      let nextSong = 0;
      if (parsed.data.length > 0) {
        let songData = parsed.data[0];
        if (radioTimer) clearTimeout(radioTimer);
        console.log("Playing song, argument: " + id + " data:");
        nextSong = songData.length;
        console.log(songData.video);
        if (channel) {
          channel.send({
            embeds: [{
              title: "► " + songData.name,
              description: Math.floor(songData.length / 60) + ":" + addZero(songData.length % 60) + " | From *" + songData.episode + "*",
              color: alternateFluttershyColor()
            }]
          });
        }
        voiceChannelPlay(voice, ytdl(songData.video, { filter: "audioonly" }), 0.5);
        if (autoplay) {
          radioTimer = setTimeout(function () {
            mlpSong(voice, "", true, channel);
          }, nextSong * 1000 + 6000);
        }
      }
      else {
        console.log("No song found, argument:", id);
        mlpSong(voice, "", true, channel);
      }
    });
  });
}

function playRadio(voice, channel) {
  Https.get("https://ponyweb.ml/api.php?stream&key=" + radioApiKey, function (res) {
    console.log("HTTPS status:" + res.statusCode);
    var body;
    res.on("data", function (data) {
      body += data;
    });
    res.on("end", function () {

      var parsed = JSON.parse(body.substring(9, body.length));
      let timeout_time = 0;

      if (parsed.current) {
        let current_time = Date.now() + radioServerPing;
        let seektime = (current_time - parsed.current.StreamTime) / 1000.0;
        timeout_time = parsed.next.StreamTime - current_time;

        console.log("Playing radio");

        voiceChannelPlay(voice, "https://ponyweb.ml/" + parsed.current.Source, .5);

        if (radioTimer) clearTimeout(radioTimer);
        if (channel) {
          channel.send({
            embeds: [{
              title: "♫ " + parsed.current.Name, description: Math.floor(parsed.current.PlayTime / 60) + ":" + addZero(Math.round(parsed.current.PlayTime % 60)) + " | From *" + parsed.current.Episode + "*",
              color: alternateFluttershyColor(),
              footer: { text: "Next: " + parsed.next.Name }
            }]
          });
        }
      }
      radioTimer = setTimeout(() => {
        playRadio(voice, channel);
      }, timeout_time);

    });
  });
}

function radioApiKeyGet() {
  Https.get("https://ponyweb.ml/api.php?keyrequest", function (res) {
    let startTime = Date.now();
    console.log("HTTPS status:" + res.statusCode);
    var body;
    res.on("data", function (data) {
      body += data;
    });
    res.on("end", function () {
      var parsed = JSON.parse(body.substring(9, body.length));
      radioApiKey = parsed.key;
      radioServerPing = parsed.time - startTime;
      console.log("Server ping: " + radioServerPing);
    });
  });
}
function addZero(x) {
  return String("0" + x).slice(-2);
}
function alternateFluttershyColor() {
  fluttershy = !fluttershy;
  if (fluttershy) return [243, 228, 136];
  else return [229, 129, 177];
}

function playStation(voice, id) {
  let station;
  if (typeof (id) == "string") {
    station = {
      name: "Custom Station",
      color: [128, 128, 128],
      url: id
    };
  }
  else {
    station = radioStations[id];
  }
  voiceChannelPlay(voice, station.url, 0.6);
  return ({
    embeds: [{
      title: "♫ " + station.name,
      color: station.color,
      footer: { text: "Now playing" }
    }]
  });

}

//#endregion

function dateString(inputDate) {
  var minutes = inputDate.getMinutes();
  var hours = inputDate.getHours();
  var day = inputDate.getDate();
  var month = inputDate.getMonth() + 1;
  var year = inputDate.getFullYear();
  return (day + "." + month + "." + year + " " + hours + ":" + minutes);
}

function getTimeOffset(date, timeZone) {
  const tz = date.toLocaleString("en", { timeZone, timeStyle: "long" }).split(" ").slice(-1)[0];
  const dateString = date.toString();
  let offset = Date.parse(`${dateString} ${tz}`) - Date.parse(`${dateString} UTC`);
  return offset;
}

function toTitleCase(phrase) {
  return phrase
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function randomInt(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

function timeString(seconds) {
  let output;
  if (seconds >= 3600) {
    output = Math.floor(seconds / 3600) + ":" + addZero(Math.floor((seconds % 3600) / 60)) + ":" + addZero(seconds % 60);
  }
  else {
    output = Math.floor(seconds / 60) + ":" + addZero(seconds % 60);
  }
  return output;
}