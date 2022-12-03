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
import * as Api from "./api";
import * as Youtube from "./youtube";
import * as Utilities from "./utilities";
import { calc, isCalc, setCalcContext } from "./calc";
import * as Polls from "./polls";
import * as Kino from "./kino";
import * as Sheets from "./sheets";
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
export let mainVoiceChannel: Discord.VoiceChannel;
export let managerRole: Discord.Role;

let audioPlayer = DiscordVoice.createAudioPlayer({ behaviors: { noSubscriber: DiscordVoice.NoSubscriberBehavior.Pause } });
var kocek = 0;
var lastSearchResults = null;
const prefix = "$";
let startDate: Date;
let defaultTimeZone = "Europe/Prague";

let voiceListeners = [];

// https://jacekkocek.coal.games/
export const port = process.env.PORT;
export const httpServer = express();
httpServer.use(express.json());

export async function setPolicyValue(name: string, value: number) {
  let [category, policy] = name.split(".");
  policyValues[category][policy] = value;
  Database.PolicyDatabase.setPolicy(name, value);
}

export function getPolicyValue(name: string) {
  let [category, policy] = name.split(".");
  return policyValues[category][policy];
}

export function getPolicyName(name: string) {
  let [category, policy] = name.split(".");
  return policyNames[category][policy];
}

export function generatePolicyList() {
  let list = "**__JacekKocek Policy List:__**\n";
  const name = 0;
  const unit = 1;

  for (const category in policyValues) {
    list += "**" + Utilities.toTitleCase(category) + ":**\n";
    for (const policy in policyValues[category]) {
      const value = policyValues[category][policy];
      list += "• " + policyNames[category][policy][name] + ": **" + value + " " + policyNames[category][policy][unit] + "**\n";
    }
  }
  return list;
}

export let policyValues = {
  matoshi: {
    transactionFeePercent: 0,
    transactionFeeMin: 1,
    stockFee: 0.5,
    weeklyTaxPercent: 0,
    weeklyTaxFlat: 0,
  },
  kino: {
    suggestReward: 50,
    watchReward: 200,
    lateFee: 100,
    defaultTimeHrs: 19
  }
}
export let policyNames = {
  matoshi: {
    transactionFeePercent: ["Matoshi transaction fee percentage (Doesn't apply if below minimum fee)", "%"],
    transactionFeeMin: ["Matoshi minimum transaction fee", "₥"],
    stockFee: ["Stock transaction fee", "%"],
    weeklyTaxPercent: ["Weekly percent tax", "%"],
    weeklyTaxFlat: ["Weekly flat tax", "₥"],
  },
  kino: {
    suggestReward: ["Kino suggest reward", "₥"],
    watchReward: ["Kino watch reward", "₥"],
    lateFee: ["Kino late fee", "₥"],
    defaultTimeHrs: ["Kino default time", "hours"],
  }
}




var helpCommands = [
  {
    name: "help",
    prefix: true,
    arguments: "",
    description: "Display help",
  },
  {
    name: "version",
    prefix: true,
    arguments: "",
    description: "Short changelog of the latest release",
  },
  {
    name: "spell",
    prefix: true,
    arguments: "word",
    description: "Spell word in emoji reactions",
  },
  {
    name: "s",
    prefix: true,
    arguments: "dotaz",
    description: "Zobrazit hledaný dotaz",
  },
  {
    name: ":gif2: / :spin: / :loading:",
    prefix: false,
    arguments: "",
    description: "Animated emoji",
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

];


var changelog = {
  version: "1.19.2",
  releaseDate: "26.11.2022",
  changes: [
    "Not specified",
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

export const weekDayNames = ["po", "ut", "st", "ct", "pa", "so", "ne"];

var radioTimer;
var fluttershy = true;
var radioApiKey;
var radioServerPing = 0;
radioApiKeyGet();

const reminderThreshold = 3600;

let reminders = [];

let upcomingReminders = [];
const remindersFileName = "reminders.json";
loadReminders();

let baseUrl = "https://jacekkocek.coal.games";

// Log our bot in using the token from https://discordapp.com/developers/applications/me

client.login(process.env.DISCORD_API_KEY);

client.on('ready', async () => {

  afrGuild = client.guilds.cache.get('549589656606343178');
  mainVoiceChannel = await afrGuild.channels.fetch("1024767805586935888") as Discord.VoiceChannel;
  managerRole = await afrGuild.roles.fetch("1046868723048382494");

  if (process.env.DISABLE_PRODUCTION_FEATURES == undefined) client.guilds.fetch('728312628413333584').then(guild => { guild.emojis.fetch() });
  console.error("\n-----------RESTART-----------\n" + new Date().toUTCString() + "\n");
  client.user.setActivity({ name: prefix + "help", type: Discord.ActivityType.Listening });
  startDate = new Date();

  Stocks.init();
  await Database.init();
  Matoshi.init();
  Api.init();

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
  httpServer.get("/kino/start", (req, res) => {
    try {
      console.log("Kino start event received!");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send("OK");
    } catch (e) {
      res.send("Something went wrong :(");
    }
  });

  httpServer.listen(port, () => {
    console.log("HTTP Listening on port " + port);
  })

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

client.on('interactionCreate', async interaction => {
  //console.log("Interaction", interaction);
  const uid = interaction.user.id;
  const member = interaction.member as Discord.GuildMember;
  if (interaction.isChatInputCommand()) {
    console.log("Slash command by " + interaction.user.username + ": " + interaction.commandName);
    switch (interaction.commandName) {
      case "kino": {
        switch (interaction.options.getSubcommand()) {
          case "suggest": {
            let filmName = Utilities.toTitleCase(interaction.options.getString("film"));
            let existingFilm = await Database.KinoDatabase.getFilmByName(filmName);
            if (existingFilm) {
              interaction.reply({ content: "***" + filmName + "*** has already been suggested by **" + (await client.users.fetch(existingFilm.suggestedBy)).username + "**.", ephemeral: true });
            }
            /* IF KINOEVENT for this film
            interaction.reply({ content: "There is already a plan to watch ***" + Utilities.toTitleCase(filmName) + "***: " + kinoData.get(filmName).message.url, ephemeral: true });
            */
            Kino.Film.fromCommand(filmName, interaction.user.id);
            interaction.reply("**" + interaction.user.username + "** added ***" + filmName + "*** to film suggestions. Reward: " + policyValues.kino.suggestReward + " ₥");
            if (!await Matoshi.pay({ from: client.user.id, to: interaction.user.id, amount: policyValues.kino.suggestReward }, false)) {
              interaction.channel.send("Not enough matoshi available for reward. Sorry! :(");
            }
            break;
          }
          case "playlist": {
            let filter = interaction.options.getString("filter");
            let kinoFilms = await Database.KinoDatabase.getAllFilms(filter);
            if (kinoFilms.length > 0) {
              let newMessage = "**__Film suggestions:__**\n";
              for (const f of kinoFilms) {
                newMessage += "• ";
                if (f.watched) {
                  newMessage += "~~*" + f.name + "*~~";
                }
                else {
                  newMessage += "***" + f.name + "***";
                }
                newMessage += "\n";
              }
              await interaction.reply(newMessage).catch(e => console.error);
            }
            else {
              interaction.reply({ content: "The playlist is empty!", ephemeral: true });
            }
            break;
          }
          case "info": {
            let film = interaction.options.getString("film");
            try {
              let results = await googleSearch(SearchEngines.CSFD, film);
              interaction.reply(results[0].title + "\n" + results[0].snippet + "\n" + results[0].link);
            } catch (error) {
              interaction.reply({ content: "No results!", ephemeral: true });
            }
            break;
          }
          case "vote-film": {
            let event = Kino.Event.fromCommand();
            event.filmVote(interaction);
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
            //guild: interaction.guildId,
            channel: interaction.channelId,
            dm: interaction.channelId,
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
        switch (interaction.options.getSubcommand()) {
          case "play": {
            let voice = member.voice.channel;
            let station = interaction.options.getInteger("station");
            if (station < radioStations.length && station >= 0) {
              interaction.reply(playStation(voice, station));
            }
            break;
          }
          case "custom": {
            let voice = member.voice.channel;
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
              await Matoshi.modify(target.id, amount);
              interaction.reply({ content: "Successfully awarded " + amount + " ₥ to **" + target.username + "**", ephemeral: false });
            }
            else {
              interaction.reply({ content: "You are not permitted to mint matoshi! 1 ₥ deducted! :angry:", ephemeral: false });
              await Matoshi.modify(interaction.user.id, -1);
            }
            break;
          }
          case "pay": {
            let from = interaction.user;
            let to = interaction.options.getUser("user");
            let amount = interaction.options.getInteger("amount");

            if (await Matoshi.pay({ from: from.id, to: to.id, amount: amount })) {
              interaction.reply({ content: "Successfully paid **" + amount + "** ₥ to **" + to.username + "** (fee " + Matoshi.calcFee(amount) + " ₥)", ephemeral: false });
            }
            else {
              interaction.reply({ content: "Insufficient matoshi! :disappointed:", ephemeral: false });
            }
            break;
          }
          case "request": {
            let to = interaction.user;
            let from = interaction.options.getUser("user");
            let amount = interaction.options.getInteger("amount");
            let description = Utilities.escapeFormatting(interaction.options.getString("description"));
            if (to == from) {
              interaction.reply({ content: "Invalid request!", ephemeral: true });
              break;
            }
            if (amount > 1 && amount <= await Matoshi.balance(from.id)) {
              Matoshi.requestPayment({ from: from.id, to: to.id, amount: amount, description: description || undefined, interaction: interaction });
            }
            else {
              interaction.reply({ content: "Invalid amount!", ephemeral: false })
            }
            break;
          }
          case "balance": {
            let user = interaction.options.getUser("user");
            if (!user) user = interaction.user;
            let balance = await Matoshi.balance(user.id);
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
      case "poll": {
        let customOptionsEnabled = interaction.options.getBoolean("custom-options-enabled") === null || interaction.options.getBoolean("custom-options-enabled");
        let poll = await Polls.Poll.fromCommand(Utilities.escapeFormatting(interaction.options.getString("name")), interaction, interaction.options.getInteger("max-votes") || 0, customOptionsEnabled);
        for (let i = 1; i < 10; i++) {
          let optionName = interaction.options.getString("option" + i);
          if (!optionName) continue;
          await poll.addOption(optionName);
        }
        break;
      }
      case "policy": {
        switch (interaction.options.getSubcommand()) {
          case "edit": {
            try {
              let policy = interaction.options.getString("policy");
              let newValue = interaction.options.getNumber("value");
              let curValue = getPolicyValue(policy);
              let policyName = getPolicyName(policy)
              await setPolicyValue(policy, newValue);
              interaction.reply({ content: `<@${member.id}> changed the policy **${policyName[0]}** to **${newValue} ${policyName[1]}** (previously ${curValue} ${policyName[1]})`, ephemeral: false, allowedMentions: { users: [], parse: [] } })
            } catch (error) {
              interaction.reply({ content: "Policy setting failed!", ephemeral: true });
            }
            break;
          }
        }
        break;
      }
      case "policy-list": {
        interaction.reply(generatePolicyList());
        break;
      }
    }
  }
  else if (interaction.isButton()) {
    switch (interaction.customId) {
      case "acceptPayment": {
        let paymentData = Matoshi.paymentMessages.get(interaction.message.id);
        if (paymentData) {
          if (uid == paymentData.from || (uid == client.user.id && member.roles.cache.has(managerRole.id))) {
            if (await Matoshi.pay(paymentData)) {
              interaction.reply("Payment successful!");
            }
            else {
              interaction.reply("Payment failed!");
            }
            Matoshi.paymentMessages.delete(interaction.message.id);
            Utilities.disableMessageButtons(interaction.message);
          }
        }
        break;
      }
      case "declinePayment": {
        let paymentData = Matoshi.paymentMessages.get(interaction.message.id);
        if (paymentData) {
          if (uid == paymentData.from || (uid == client.user.id && member.roles.cache.has(managerRole.id))) {
            interaction.reply("Payment cancelled");
            Matoshi.paymentMessages.delete(interaction.message.id);
            Utilities.disableMessageButtons(interaction.message);
          }
        }
        break;
      }
      case "lockFilmVote": {
        console.log("Button clicked");
        if (await Kino.interactionWeightCheck(interaction)) {
          console.log("check pass");
          let event = Kino.Event.list.find(e => {
            console.log(e.lockMessageId, interaction.message.id);
            return e.lockMessageId == interaction.message.id
          });

          console.log("ebent", event);
          if (event && event?.filmPoll.options.length > 0) {
            interaction.message.delete();

            event.dateVote(interaction);
          }
        }
        break;
      }
      case "lockDayVote": {
        if (await Kino.interactionWeightCheck(interaction)) {
          let event = Kino.Event.list.find(e => e.lockMessageId == interaction.message.id);
          if (event && event?.datePoll?.options.length > 0) {
            interaction.message.delete();
            event.lockDate();
          }
        }
        break;
      }
    }
  }
  else if (interaction.isContextMenuCommand()) {
    switch (interaction.commandName) {
      case "Nuke Here": {
        let maxDelete = 20;
        if (interaction.user.id == "532918953014722560") maxDelete = 100;
        interaction.channel.messages.fetch({ limit: maxDelete }).then(messages => {
          const previousMessages = Array.from(messages.values()) as Discord.Message[];
          const nukeIndex = previousMessages.findIndex(m => { return m.id == interaction.targetId });
          if (nukeIndex < 0 || nukeIndex >= maxDelete) {
            interaction.reply({ content: "Cannot nuke this far!", ephemeral: true });
          }
          else {
            interaction.reply({ content: "Nuking " + (nukeIndex + 1) + " messages", ephemeral: true });
            for (let i = 0; i <= nukeIndex; i++) {
              previousMessages[i].delete();
            }
          }

        });
      }
    }
  }
});

client.on('messageCreate', async message => {
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
            if (!poll.customOptionsAllowed) throw new Error("Poll custom options disabled");
            poll.addOption(message.content);
          } catch (error) {
            Utilities.messageError(channel, error);
          }
          message.delete();
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
          let changeChanges = "";
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


            channel.send({
              embeds: [{
                color: 0x18C3B1,
                title: "Help", description: "Type `" + prefix + "help <command>` to get further info on a command", fields: [
                  {
                    name: "Commands", value: helpBasic
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
          if (await Matoshi.cost(message.author.id, 1, message.guildId)) {
            console.log("SEARCH!");
            try {
              let results = await googleSearch(SearchEngines.EVERYTHING, argument);
              message.channel.send(results[0].title + "\n" + results[0].snippet + "\n" + results[0].link);
            } catch (error) {
              message.reply("No results!");
            }
          }
          else {
            message.reply({ content: "Insufficient matoshi!", allowedMentions: { repliedUser: false } });
          }
          break;
        case "img":
          if (await Matoshi.cost(message.author.id, 20, message.guildId)) {
            console.log("SEARCH!");
            try {
              let results = await googleSearch(SearchEngines.EVERYTHING, argument, SearchTypes.IMAGE);
              message.channel.send(results[0].link);
            } catch (error) {
              message.reply("No results!");
            }
          }
          else {
            message.reply({ content: "Insufficient matoshi!", allowedMentions: { repliedUser: false } });
          }
          break;
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
        case "search": {
          googleSearch(SearchEngines.CSFD, "test");
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

function parseTime(inputString: string) {
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
  let channel = await client.channels.fetch(rem.channel) as Discord.TextBasedChannel;
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






function saveReminders() {
  let f = [];
  for (const r of reminders) {
    f.push({
      //guild: r.guild,
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

export enum SearchEngines {
  CSFD = "513b4641b78f8096a",
  EVERYTHING = "003836403838224750691:axl53a8emck",
  WIKIPEDIA = "003836403838224750691:wcw78s5sqwm"
}
export enum SearchTypes {
  IMAGE = "image",
  PAGE = "searchTypeUndefined"
}

export async function googleSearch(engine: SearchEngines, searchTerm: string, searchType: SearchTypes = SearchTypes.PAGE): Promise<any[]> {
  let response = await axios.get(`https://www.googleapis.com/customsearch/v1?key=${process.env.SEARCH_API_KEY}&cx=${engine}&q=${encodeURIComponent(searchTerm)}&searchType=${searchType}&num=2`)
  if (!response.data.items || response.data?.items.length == 0) {
    console.error("No search results");
    return [];
  }//console.log(response.data.items);
  return response.data.items;
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

