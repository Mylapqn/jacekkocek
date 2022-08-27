import * as Discord from "discord.js";
import * as DiscordVoice from "@discordjs/voice";
import * as Https from "https";
import Canvas from "canvas";
import Jimp from "jimp";
import ytdl from "ytdl-core";
import fs from "fs";
import axios from "axios";
import express from "express";
import * as Database from "./database";
import * as Stocks from "./stocks";
import * as Matoshi from "./matoshi";
import * as Youtube from "./youtube";
import * as Utilities from "./utilities";
import { calc, isCalc, setCalcContext } from "./calc";
import * as Polls from "./polls";
import * as Kino from "./kino";
import { handleMessageReaction } from "./reactions";

//const icecastParser = require("icecast-parser");
//const Parser = icecastParser.Parser;
//const { env } = require('process');

//require('dotenv').config();

const Intents = Discord.GatewayIntentBits;
const intents = new Discord.IntentsBitField();
intents.add(Intents.GuildMessages);
intents.add(Intents.GuildMessageReactions);
intents.add(Intents.Guilds);
intents.add(Intents.GuildEmojisAndStickers);
intents.add(Intents.GuildVoiceStates);
intents.add(Intents.GuildMembers);
intents.add(Intents.MessageContent);
export const client = new Discord.Client({ intents: intents });

const updateGlobalCommands = false;
const commandsToDeleteGlobal = [];
const commandsToDeleteGuild = [];

export let afrGuild: Discord.Guild;

let audioPlayer = DiscordVoice.createAudioPlayer({ behaviors: { noSubscriber: DiscordVoice.NoSubscriberBehavior.Pause } });
var kocek = 0;
var lastSearchResults = null;
const prefix = "$";
var startDate;
var defaultTimeZone = "Europe/Prague";

let voiceListeners = [];

export const port = process.env.PORT;
export const httpServer = express();
httpServer.use(express.json());





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
  version: "1.18.4",
  releaseDate: "21.8.2022",
  commands: ["help"],
  changes: [
    "Added poll system",
  ]
};

var radioStations = [
  {
    name: "Evropa 2",
    color: 0x3C50DC,
    url: "http://ice.actve.net/fm-evropa2-128"
  },
  {
    name: "Anime Radio 1 ヾ(⌒∇⌒*)♪",
    color: 0xEB87B4,
    //url: "https://japanimradiotokyo.fr/8002/stream"
    //url: "https://streamingv2.shoutcast.com/japanimradio-tokyo"
    url: "https://listen.moe/stream"
  },
  {
    name: "Anime Radio 2 ♪(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    color: 0xEB87B4,
    //url: "https://japanimradiotokyo.fr/8002/stream"
    //url: "https://streamingv2.shoutcast.com/japanimradio-tokyo"
    url: "https://kathy.torontocast.com:3060/;"
  },
  {
    name: "Anime Radio 3 ☆٩(◕‿◕｡)۶☆",
    color: 0xEB87B4,
    url: "http://79.111.119.111:8002/anime"
  },
  {
    name: "SOCKENSCHUSS X",
    color: 0x6400B4,
    url: "https://stream.laut.fm/sockenschuss-x"
  },
  {
    name: "Nightdrive",
    color: 0x000000,
    url: "https://stream.laut.fm/nightdrive"
  },
  {
    name: "Instrumental Radio",
    color: 0x43D1CC,
    url: "http://agnes.torontocast.com:8151/;"
  },
  {
    name: "Radcap Synthwave",
    color: 0xC80046,
    url: "http://79.120.39.202:8002/retrowave"
  },
  {
    name: "Radcap Space",
    color: 0xC80046,
    url: "http://79.111.119.111:8002/spacemusic"
  },
  {
    name: "Radcap Spacesynth",
    color: 0xC80046,
    url: "http://79.120.39.202:8002/spacesynth"
  },
  {
    name: "Cinemix",
    color: 0x197591,
    url: "https://kathy.torontocast.com:1825/stream"
  },


];

export let letterEmoji = {
  a: "🇦", b: "🇧", c: "🇨", d: "🇩", e: "🇪", f: "🇫", g: "🇬", h: "🇭", i: "🇮", j: "🇯", k: "🇰", l: "🇱", m: "🇲", n: "🇳", o: "🇴", p: "🇵", q: "🇶", r: "🇷", s: "🇸", t: "🇹", u: "🇺", v: "🇻", w: "🇼", x: "🇽", y: "🇾", z: "🇿",
  "#": "#️⃣",
  "0": "0️⃣", "1": "1️⃣", "2": "2️⃣", "3": "3️⃣", "4": "4️⃣", "5": "5️⃣", "6": "6️⃣", "7": "7️⃣", "8": "8️⃣", "9": "9️⃣"
};

console.log("\n-----------RESTART-----------")

export var kinoData = new Map();
export var weekDayNames = ["po", "ut", "st", "ct", "pa", "so", "ne"];

var radioTimer;
var fluttershy = true;
var radioApiKey;
var radioServerPing = 0;
radioApiKeyGet();



var kinoPlaylist = new Map();
var playlistFileName = "kinoPlaylist.json";
loadPlaylist();



const reminderThreshold = 3600;

let reminders = [];

let upcomingReminders = [];
const remindersFileName = "reminders.json";
loadReminders();

let baseUrl = "https://jacekkocek.coal.games";

// Log our bot in using the token from https://discordapp.com/developers/applications/me

client.login(process.env.DISCORD_API_KEY);

client.on('ready', () => {

  Stocks.init();
  Database.init();
  Matoshi.init();

  httpServer.get("/radio/play", (req, res) => {
    try {
      console.log(req.query);
      if (req.query.guild) {
        let guild = client.guilds.cache.get(req.query.guild as string);
        let voiceChannel = guild.channels.cache.get(req.query.channel as string);
        let radioId = parseInt(req.query.station as string);
        playStation(voiceChannel, radioId);
      }
      //let data = JSON.parse(req.body);
      res.send("OK");
    } catch (e) {
      res.send("Something went wrong :(");
    }
  });

  httpServer.listen(port, () => {
    console.log("HTTP Listening on port " + port);
  })

  afrGuild = client.guilds.cache.get('549589656606343178');
  if (process.env.DISABLE_PRODUCTION_FEATURES == undefined) client.guilds.fetch('728312628413333584').then(guild => { guild.emojis.fetch() });
  console.error("\n-----------RESTART-----------\n" + new Date().toUTCString() + "\n");
  client.user.setActivity({ name: prefix + "help", type: Discord.ActivityType.Listening });
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
  //console.log(upcomingReminders);


  console.log('' + new Date().toUTCString() + ' I am ready!');
});

client.on('interactionCreate', interaction => {
  //console.log("Interaction", interaction);
  if (interaction.isChatInputCommand()) {
    console.log("Slash command by " + interaction.user.username + ": " + interaction.commandName);
    switch (interaction.commandName) {
      case "kino": {
        switch (interaction.options.getSubcommand()) {
          case "vote day": {
            Kino.Event.fromCommand();
            new Polls.Poll("");
          }
            break;
          case "vote film": {

          }
            break;
          case "suggest": {
            let filmName = interaction.options.getString("film").toLowerCase();
            if (kinoPlaylist.has(filmName)) {
              interaction.reply({ content: "***" + Utilities.toTitleCase(filmName) + "*** has already been suggested by **" + kinoPlaylist.get(filmName).suggestedBy + "**.", ephemeral: true });
            }
            else if (kinoData.has(filmName)) {
              interaction.reply({ content: "There is already a plan to watch ***" + Utilities.toTitleCase(filmName) + "***: " + kinoData.get(filmName).message.url, ephemeral: true });
            }
            else {
              let newSug = {
                name: Utilities.toTitleCase(filmName),
                suggestedBy: interaction.user.username,
                watched: false
              }
              kinoPlaylist.set(filmName, newSug);
              savePlaylist();
              interaction.reply("**" + interaction.user.username + "** added ***" + newSug.name + "*** to film suggestions. Reward: 10 ₥");
              Matoshi.award(interaction.guildId, interaction.user.id, 10);
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
              let time = 3;
              if (interaction.options.getString("when")) {
                time = parseTime(interaction.options.getString("when"));
              }
              if (isNaN(time) || time <= 0) interaction.reply({ content: "Invalid time!", ephemeral: true });
              else if (time > 31968000) interaction.reply({ content: "Cannot create timers over 1 year!", ephemeral: true });
              else if (time > 0) {
                let remText = newMessage;
                let newRem = {
                  guild: interaction.guildId,
                  channel: interaction.channelId,
                  text: remText,
                  timestamp: Math.round(nowSeconds() + time),
                  mentions: []
                }
                createReminder(newRem);
                interaction.reply({
                  content: "Added reminder for **_" + Utilities.toTitleCase(film) + "_** at <t:" + newRem.timestamp + ">",
                  allowedMentions: { parse: [] },
                  ephemeral: true
                });
              }
              else {
                interaction.reply({ content: "Invalid time!", ephemeral: true });
              }
            }
            else {
              interaction.reply({ content: "Cannot find any vote for ***" + Utilities.toTitleCase(film) + "*** :disappointed:", ephemeral: true });
            }
            break;
          }
          case "reset": {
            let film = interaction.options.getString("film").toLowerCase();
            if (kinoData.has(film)) {
              kinoData.delete(film);
              interaction.reply("The data for ***" + Utilities.toTitleCase(film) + "*** was successfully reset.");
            }
            if (kinoPlaylist.has(film)) {
              kinoPlaylist.delete(film);
              savePlaylist();
              interaction.reply("The suggestion for ***" + Utilities.toTitleCase(film) + "*** was successfully reset.");
            }
            else {
              interaction.reply({ content: "Cannot find any vote or suggestion for ***" + Utilities.toTitleCase(film) + "*** :disappointed:", ephemeral: true });
            }
            break;
          }
          case "watch": {
            //interaction.reply({ content: "Not yet supported :disappointed:", ephemeral: true });
            let film = interaction.options.getString("film").toLowerCase();

            if (kinoData.has(film)) {
              interaction.reply("There is already a vote on ***" + Utilities.toTitleCase(film) + "***! Use `$kinoReset " + film + "` to reset the vote.");
            }
            else {
              startGoogleSearch(film, interaction, 2);
              let newMessage = "";
              let m = {};

              let obj = {
                filmName: Utilities.toTitleCase(film),
                message: null,
                users: new Map()
              }

              interaction.guild.members.fetch().then(function (membersList) {
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

                interaction.reply({ content: "Bude ***" + obj.filmName + "***?\n" + newMessage, fetchReply: true }).then((m: Discord.Message) => {
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
                    name: Utilities.toTitleCase(film),
                    suggestedBy: interaction.user.username,
                    watched: true
                  });
                }
                console.log("Kino done.");
              }).catch(console.log);

            }

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
        if (isNaN(time) || time <= 0) interaction.reply({ content: "Invalid time!", ephemeral: true });
        else if (time > 31968000) interaction.reply({ content: "Cannot create timers over 1 year!", ephemeral: true });
        else if (time > 0) {
          let remText = interaction.options.getString("text").trim();
          if (remText == "") remText = "Unnamed reminder";
          let newRem = {
            guild: interaction.guildId,
            channel: interaction.channelId,
            text: remText,
            timestamp: Math.round(nowSeconds() + time),
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
        Youtube.play(interaction);
        break;
      }
      case "radio": {
        let bember = interaction.member as Discord.GuildMember;
        switch (interaction.options.getSubcommand()) {
          case "play": {
            let voice = bember.voice.channel;
            let station = interaction.options.getInteger("station");
            if (station < radioStations.length && station >= 0) {
              interaction.reply(playStation(voice, station));
            }
            break;
          }
          case "custom": {
            let voice = bember.voice.channel;
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
                color: 0x18C3B1
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
              Matoshi.modify(target.id, amount);
              interaction.reply({ content: "Successfully awarded " + amount + " ₥ to **" + target.username + "**", ephemeral: false });
            }
            else {
              interaction.reply({ content: "You are not permitted to mint matoshi! 1 ₥ deducted! :angry:", ephemeral: false });
              Matoshi.modify(interaction.user.id, -1);
            }
            break;
          }
          case "pay": {
            let from = interaction.user;
            let to = interaction.options.getUser("user");
            let amount = interaction.options.getInteger("amount");

            if (Matoshi.pay(from.id, to.id, amount)) {
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
            let balance = Matoshi.balance(user.id);
            interaction.reply({ content: "Matoshi balance for **" + user.username + "**: " + balance + " ₥", ephemeral: false });
            setCalcContext(balance, interaction.channelId);
            break;
          }
          case "list": {
            Matoshi.generateLeaderboard().then(msg => { interaction.reply({ content: msg, ephemeral: false }); });
            break;
          }
        }
        break;
      }
      case "stocks": {
        let stockId = interaction.options.getString("stock")?.toUpperCase();
        let stockName, displayString;
        if (stockId) {
          stockName = Stocks.findStockPreset(stockId).name || "Unknown";
          displayString = stockName + " (" + stockId + ")";
        }
        switch (interaction.options.getSubcommand()) {
          case "buy": {
            Stocks.buy(interaction.user.id, stockId, interaction.options.getInteger("amount")).then(res => {
              if (res) {
                interaction.reply("Successfully purchased " + displayString + " for " + interaction.options.getInteger("amount") + " ₥.");
              }
              else {
                interaction.reply("Purchase of " + displayString + " failed.");
              }
            })
            break;
          }
          case "sell": {
            Stocks.sell(interaction.user.id, stockId, interaction.options.getInteger("amount")).then(res => {
              if (res) {
                interaction.reply("Successfully sold " + displayString + " for " + interaction.options.getInteger("amount") + " ₥.");
              }
              else {
                interaction.reply("Sell of " + displayString + " failed.");
              }
            })
            break;
          }
          case "info": {
            if (Stocks.stockData.has(stockId)) {
              let buf = Stocks.generateGraph(stockId);
              if (buf) {
                interaction.reply({ content: displayString + " prices for <t:" + nowSeconds() + "> - Current " + Stocks.currentPrice(stockId), files: [buf] });
              }
              else {
                interaction.reply("Failed to create graph!");
              }
            }
            else {
              interaction.reply("Invalid stock!");
            }
            break;
          }
          case "list": {
            interaction.reply(Stocks.list());
            break;
          }
          case "balance": {
            let user = interaction.options.getUser("user");
            if (!user) user = interaction.user;
            Stocks.balance(user.id, stockId).then(balance => {
              let price = Stocks.currentPrice(stockId);
              let stockBalanceMatoshi = Math.floor(balance * price);
              interaction.reply(displayString + " balance for **" + user.username + "**: " + balance + " (worth " + stockBalanceMatoshi + " ₥)");
              setCalcContext(stockBalanceMatoshi, interaction.channelId);
            });
            break;
          }
        }
        break;
      }
    }
  }
  if (interaction.isButton()) {
    switch (interaction.customId) {
      case "acceptPayment": {
        let paymentData = Matoshi.paymentMessages.get(interaction.message.id);
        if (paymentData != undefined) {
          if (interaction.user.id == paymentData.from) {
            if (Matoshi.pay(paymentData.from, paymentData.to, paymentData.amount)) {
              interaction.reply("Payment successful!");
            }
            else {
              interaction.reply("Payment failed!");
            }
            Matoshi.paymentMessages.delete(interaction.message.id);
            let msg = interaction.message;
            let comp = msg.components;

            let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
            for (const component of comp[0].components) {
              if (component instanceof Discord.ButtonComponent)
                newActionRow.addComponents(new Discord.ButtonBuilder(component).setDisabled(true));
              else
                throw new Error("Expected only ButtonComponent");
            }

            /*let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents([
              new Discord.ButtonBuilder()
                .setCustomId("acceptPayment")
                .setLabel("Accept")
                .setStyle(Discord.ButtonStyle.Success)
                .setDisabled(true),
              new Discord.ButtonBuilder()
                .setCustomId("declinePayment")
                .setLabel("Decline")
                .setStyle(Discord.ButtonStyle.Danger)
                .setDisabled(true),
            ]);*/
            msg.edit({ content: msg.content, embeds: msg.embeds, components: [newActionRow] })
          }
        }
        break;
      }
      case "declinePayment": {
        let paymentData = Matoshi.paymentMessages.get(interaction.message.id);
        if (paymentData != undefined) {
          if (interaction.user.id == paymentData.from) {
            interaction.reply("Payment cancelled");
            Matoshi.paymentMessages.delete(interaction.message.id);
            let msg = interaction.message;
            let comp = msg.components;
            let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
            for (const component of comp[0].components) {
              if (component instanceof Discord.ButtonComponent)
                newActionRow.addComponents(new Discord.ButtonBuilder(component).setDisabled(true));
              else
                throw new Error("Expected only ButtonComponent");
            }
            msg.edit({ content: msg.content, embeds: msg.embeds, components: [newActionRow] })
          }
        }
        break;
      }
    }
  }
});

client.on('messageCreate', message => {
  const channel = message.channel as Discord.TextBasedChannel;
  if (message.author.id != client.user.id) {

    if (message.mentions.has(client.user) && message.type != Discord.MessageType.Reply) {
      channel.send(message.author.toString());
    }
    else if (message.content === ':gif2:') {

      kocek++;

      //channel.send(message.author.username,{files:[{attachment:message.author.displayAvatarURL()}],embed:{title:"kok",color:15158332,image:{url:message.author.displayAvatarURL()},fields:[{name:"ko",value:"text"}]}});
      //console.log("authro:" + message.author.username);
      //message.react("😌");
      //message.react("728583366030393414");
      message.delete();
      channel.send(client.emojis.cache.get("728583366030393414").toString());


      //channel.send(client.emojis.get("728583366030393414"));
    }
    else if (message.content === ':spin:') {

      message.delete();
      channel.send(client.emojis.cache.get("708663999201411122").toString());

    }
    else if (message.content === ':loading:') {

      message.delete();
      channel.send(client.emojis.cache.get("772234862652424203").toString());

    }
    else if (message.type == Discord.MessageType.Reply) {
      channel.messages.fetch(message.reference.messageId).then(repliedMessage => {
        let lowerCase = message.content.toLowerCase();
        let poll = Polls.Poll.getPollFromMessage(repliedMessage);
        if (poll != undefined) {
          try {
            poll.addOption(message.content);
            message.delete();
          } catch (error) {
            console.error(error);
            channel.send(error.name + ": " + error.message);
          }
        }
        if (lowerCase == "usmažit prosím" || lowerCase == "deep fried please") {

          let url = null;
          if (repliedMessage.attachments.size > 0) {
            url = repliedMessage.attachments.first().proxyURL;
          }
          else if (repliedMessage.content.includes("http")) {
            url = repliedMessage.content.substr(repliedMessage.content.indexOf("http"));
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
                //.color([{ apply: "saturate", params: [70] }])
                .convolute(kernelSharpen)
                .writeAsync("./outputImg.jpg").then(e => {
                  console.log("jimp done")
                  message.reply({ files: ["./outputImg.jpg"] }).then(
                    function () { fs.unlink("./outputImg.jpg", null) });
                });
            }).catch(error => { channel.send(error.name + ": " + error.message) })
          }

        }
      });
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
          channel.send({
            embeds: [{
              title: "Cheese",
              color: 0xFEB502,
              description: 'Cheese'
            }]
          });
          break;
        case "say":
          message.delete();
          channel.send(argument);
          break;
        case "spell":
          message.delete().then(() => {
            argument = argument.replace(/ /g, "").toLowerCase();
            console.log("Sanitized argument: " + argument);
            channel.messages.fetch({ limit: 1 }).then(messages => {

              var previousMessage = messages.values()[0];
              for (var i = 0; i < argument.length; i++) {
                //channel.send(argument.charAt(i));
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
          channel.send(result);
          console.log(result, emoji);
          break;
        case "changelog":
        case "changes":
        case "version": {
          message.delete();
          let commandChanges = "";
          let changeChanges = "";
          changelog.commands.forEach(commandName => {
            let c = undefined;
            helpCommands.forEach(helpEntry => {
              if (helpEntry.name == commandName) {
                c = helpEntry;
                return;
              }
            });
            if (c) {
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
          channel.send({
            embeds: [
              {
                color: 0x18C3B1,
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


            channel.send({
              embeds: [{
                color: 0x18C3B1,
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
            channel.send("If you use " + prefix + "help to get help for " + prefix + "help you need help");
          }
          else {
            var cleanArg;
            if (argument.startsWith(prefix)) {
              cleanArg = argument.slice(prefix.length);
            }
            else cleanArg = argument;
            var c = findCommand(cleanArg);
            if (c != null) {
              channel.send({
                embeds: [{
                  title: "Help - " + c.name, description: (c.longDescription != null ? c.longDescription : c.description)
                }]
              });

            }
            else {
              channel.send("`" + argument + "` is not a command!");
            }
          }
          break;
        case "s":
          if (Matoshi.cost(message.author.id, 1, message.guildId)) {
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
        case "w2g":
          channel.send("No longer supported!");
          break;
        //httpPost("https://w2g.tv/rooms/create.json").then(parsed => { channel.send(parsed) });
        case "nuke":
          if (message.author.id != "245616926485643264") {
            message.delete().then(() => {
              var argNumber = 1;
              argNumber = parseInt(argument);
              if (isNaN(argNumber)) argNumber = 0;
              if (argNumber > 0) {
                if (argNumber > 20 && message.author.id != "532918953014722560") argNumber = 20;
                let channelName = channel.id;
                if (Utilities.isActualChannel(channel))
                  channelName = "#" + channel.name;
                else if (channel.isDMBased()) {
                  channelName = "DM with " + channel.recipient.username;
                }
                console.log("Deleting " + argNumber + " last messages in " + channelName + ", command by " + message.author.username);
                channel.messages.fetch({ limit: argNumber }).then(messages => {

                  var previousMessages = Array.from(messages.values()) as Discord.Message[];
                  for (var i = 0; i < argNumber; i++) {
                    var reacts = Array.from(previousMessages[i].reactions.cache.mapValues(reaction => reaction.emoji.name).values());
                    //channel.send(argument.charAt(i));
                    previousMessages[i].delete();
                    if (reacts.includes("♋")) break;
                  }

                });
                /*channel.fetch().then(channel => {for (var i = 0; i < argNumber; i++) {
                  let lastMessage= channel.lastMessage;
                  var reacts = lastMessage.reactions.cache.mapValues(reaction => reaction._emoji.name).array();
                  //channel.send(argument.charAt(i));
                  lastMessage.delete();
                  if (reacts.includes("♋")) break;
                }});*/
              }
            });
          }
          else {
            channel.send("cringe");
          }
          break;

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
        case "song": {
          message.delete();
          if (message.member.voice.channel)
            mlpSong(message.member.voice.channel, argument, false, channel);
          break;
        }
        case "songs": {
          message.delete();
          if (message.member.voice.channel)
            mlpSong(message.member.voice.channel, argument, true, channel);
          break;
        }
        case "mlpRadio": {
          message.delete();
          if (message.member.voice.channel)
            playRadio(message.member.voice.channel, channel);
          break;
        }
        case "mlpMix": {
          message.delete();
          if (message.member.voice.channel) {
            fs.existsSync("mlp-mix.ogg");
            voiceChannelPlay(message.member.voice.channel, "mlp-mix.ogg", .5);
            //voiceChannelPlay(message.member.voice.channel, "mlp-mix.ogg", .5);
            channel.send({
              embeds: [{
                title: "► " + "MLP Mix",
                color: 0x9F65E0,
                description: '4:17 | From *Andrej*'
              }]
            });
          }
          break;
        }

        case "stop": {
          let connection = DiscordVoice.getVoiceConnection(message.guildId);
          audioPlayer.stop(true);
          voiceListeners.forEach(l => {
            l.destroy();
          })
          if (connection) {
            connection.disconnect();
            message.delete();
            channel.send("Stopped.");
          }
          Youtube.stop();
          if (radioTimer) clearTimeout(radioTimer);
          break;
        }
        case "listen": {
          if (message.member.voice.channel) {
            let channel = message.member.voice.channel;
            let target = message.member.user;
            if (message.mentions.users.size > 0) {
              target = message.mentions.users.first();
            }
            let connection = DiscordVoice.joinVoiceChannel({
              channelId: channel.id,
              guildId: channel.guild.id,
              adapterCreator: channel.guild.voiceAdapterCreator,
              selfDeaf: false
            })
            //let receiver = new DiscordVoice.VoiceReceiver(connection);
            //connection.subscribe(audioPlayer);
            let receiver = connection.receiver;
            let audioStream = receiver.subscribe(target.id);
            voiceListeners.push(audioStream.on("data", (data) => {
              connection.playOpusPacket(data);
            }));
            //receiver.onWsPacket((p)=>{console.log("data!!");connection.playOpusPacket(p)});
          }
          break;
        }
        case "time": {
          channel.send(Utilities.dateString(new Date(Date.now() - Utilities.getTimeOffset(new Date(), defaultTimeZone))));
          channel.send(new Date().toString());
          break;
        }
        case "skip": {
          message.delete();
          let num = parseInt(argument);
          if (!isNaN(num)) {
            Youtube.skip(message.guild, num, channel);
          }
          else {
            Youtube.skip(message.guild, 1, channel);
          }
          break;
        }
        case "remindList": {
          cleanupReminders();
          saveReminders();
          let msg = "__Reminders:__\n";
          for (const rem of reminders) {
            msg += "• **" + rem.text + "** at <t:" + rem.timestamp + ">\n";
          }
          channel.send({ content: msg, allowedMentions: { parse: [] } });
          break;
        }
        case "restart": {
          if (message.author.id == "532918953014722560") {
            message.delete().then(() => {
              process.exit()
            });
          }
          else {
            channel.send("insufficient permissions!");
          }
          break;
        }
        case "poll": {
          let newPoll = new Polls.Poll(argument);
          //newPoll.addOption("Koče");
          //newPoll.addOption("Bloče");
          newPoll.sendMessage(channel);
          break;
        }
        default:
          channel.send("Unknown command :disappointed:");

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
        channel.send({ files: [buf] });
      }

    }
    else if (isCalc(message.content)) {
      let result = calc(message);
      if (result) channel.send(result);
    }
  }
});

client.on("messageReactionAdd", (messageReaction, user) => {
  handleMessageReaction(messageReaction, user, false);
});

client.on("messageReactionRemove", (messageReaction, user) => {
  handleMessageReaction(messageReaction, user, true);
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
  let time = newRem.timestamp - nowSeconds();
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
    if (rem.timestamp < nowSeconds()) {
      reminders.splice(i, 1);
    }
  }
}

function setupReminders() {
  cleanupReminders();
  upcomingReminders = [];
  for (const rem of reminders) {
    if (rem.timestamp > nowSeconds() && rem.timestamp <= nowSeconds() + reminderThreshold) {
      let timeout = setTimeout(() => {
        executeReminder(rem);
      }, (rem.timestamp - nowSeconds()) * 1000);
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

export function nowSeconds() {
  return Math.round(Date.now() / 1000);
}

async function executeReminder(rem) {
  let channel = await Utilities.fetchChannel(rem.guild, rem.channel);
  let toSend = "**Reminder: **" + rem.text;
  /*let mentions = "";
  if (rem.mentions) {
    rem.mentions.forEach(m => {
      mentions += "<@!" + m + "> ";
    });
  }
  let toSend = {
    embeds: [{
      title: "Reminder",
      color: [0x18C3B1],
      description: rem.text
    }]
    if (mentions != "") {
      toSend.content = mentions
    }
  }*/
  channel.send(toSend);
  reminders.splice(reminders.indexOf(rem), 1);
}

//#endregion

//#region KINO


export function updateKinoMessage(kinoEntry) {
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
    let read = fs.readFileSync(playlistFileName, { encoding: 'utf8' });
    kinoPlaylist = new Map(JSON.parse(read));
    console.log("Loaded kino playlist.");
  } catch (error) {
    console.log("Could not load kino playlist!");
    console.log(error);
  }
}




function saveReminders() {
  let f = [];
  for (const r of reminders) {
    f.push({
      guild: r.guild,
      channel: r.channel,
      text: r.text,
      timestamp: r.timestamp,
      mentions: r.mentions
    })
  }
  fs.writeFile(remindersFileName, JSON.stringify(f), (e) => { console.log("Finished writing", e) });
}

function loadReminders() {
  try {
    let read = fs.readFileSync(remindersFileName, { encoding: 'utf8' });
    reminders = JSON.parse(read);
    console.log("Loaded reminders.");
    //console.log(reminders);
    cleanupReminders();
  } catch (error) {
    console.log("Could not load reminders!");
    console.log(error);
  }
}

function setupCommands() {
  try {
    let globalCommands = JSON.parse(fs.readFileSync("globalCommands.json", { encoding: 'utf8' }));
    let guildCommands = JSON.parse(fs.readFileSync("guildCommands.json", { encoding: 'utf8' }));
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

export function voiceChannelPlay(channel, audio, volume) {
  if (channel != null) {
    //audioPlayer = DiscordVoice.createAudioPlayer({ behaviors: { noSubscriber: "pause" } });
    joinVoiceChannel(channel);
  }
  let res = DiscordVoice.createAudioResource(audio, { inlineVolume: true });
  let v = volume ?? 1;
  v = Math.min(Math.abs(v), 5);
  res.volume.volume = v;
  audioPlayer.stop();
  audioPlayer.play(res);
}

export function joinVoiceChannel(channel) {
  let conn = DiscordVoice.joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
  conn.subscribe(audioPlayer);
  return conn;
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
              description: Math.floor(songData.length / 60) + ":" + Utilities.addZero(songData.length % 60) + " | From *" + songData.episode + "*",
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
              title: "♫ " + parsed.current.Name, description: Math.floor(parsed.current.PlayTime / 60) + ":" + Utilities.addZero(Math.round(parsed.current.PlayTime % 60)) + " | From *" + parsed.current.Episode + "*",
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
    //console.log("HTTPS status:" + res.statusCode);
    var body;
    res.on("data", function (data) {
      body += data;
    });
    res.on("end", function () {
      var parsed = JSON.parse(body.substring(9, body.length));
      radioApiKey = parsed.key;
      radioServerPing = parsed.time - startTime;
      //console.log("Server ping: " + radioServerPing);
    });
  });
}

function alternateFluttershyColor() {
  fluttershy = !fluttershy;
  if (fluttershy) return 0xF3E488;
  else return 0xE581B1;
}

function playStation(voice, id) {
  let station;
  if (typeof (id) == "string") {
    station = {
      name: "Custom Station",
      color: 0x808080,
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
      footer: { text: "Now playing" },
    }]
  });

}

//#endregion

