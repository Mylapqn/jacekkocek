const Discord = require('discord.js');
//const Dotenv = require('dotenv');
const Https = require('https');
const Http = require('http');
const ytdl = require('ytdl-core');
const fs = require('fs');
//const icecastParser = require("icecast-parser");
//const Parser = icecastParser.Parser;
//const { env } = require('process');
//Dotenv.config();

const client = new Discord.Client();

var kocek = 0;
var lastSearchResults = null;
const prefix = "$";
var cringeScore = {};
var cringelord;
var cringelordScore = 0;
var cringelordRole;
var startDate;
var defaultTimeZone = "Europe/Prague";
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
    name: "hit",
    prefix: true,
    arguments: "",
    description: "yes",
  },
  {
    name: "listCringe",
    prefix: true,
    arguments: "",
    description: "Display the Cringe leaderboard",
  },
  {
    name: "cringe",
    prefix: false,
    arguments: "",
    description: "Award Cringe",
    longDescription: "Award Cringe to someone - if they have more Cringe than anyone else, this will also make them the Cringelord",
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
    arguments: "",
    description: "Start playing synchronised radio from server",
    longDescription: "Start playing synchronised radio from server. You cannot specify which song to play."
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
    name: "hint",
    prefix: true,
    description: "Hint for #ano",
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
  version: "1.8.0",
  releaseDate: "6.1.2020",
  commands: ["hint"],
  changes: [
    "The bot can now play in #ano",
    "Use $hint while playing to get a hint"
  ]
};

var letterEmoji = {
  a: "🇦", b: "🇧", c: "🇨", d: "🇩", e: "🇪", f: "🇫", g: "🇬", h: "🇭", i: "🇮", j: "🇯", k: "🇰", l: "🇱", m: "🇲", n: "🇳", o: "🇴", p: "🇵", q: "🇶", r: "🇷", s: "🇸", t: "🇹", u: "🇺", v: "🇻", w: "🇼", x: "🇽", y: "🇾", z: "🇿",
  "#": "#️⃣",
  "0": "0️⃣", "1": "1️⃣", "2": "2️⃣", "3": "3️⃣", "4": "4️⃣", "5": "5️⃣", "6": "6️⃣", "7": "7️⃣", "8": "8️⃣", "9": "9️⃣"
};

console.log("--------------------------------------\nStarting up!")

var kinoMessages = [];
var kinoMessageUsers = [];
var kinoData = new Map();
var weekDayNames = ["po", "ut", "st", "ct", "pa", "so", "ne"];

var radioTimer;
var fluttershy = true;
var radioApiKey;
var radioServerPing = 0;
radioApiKey();

var kinoPlaylist = new Map();
var playlistFileName = "kinoPlaylist.json";
loadPlaylist();

var currentWord = "";
var lastSelectedWord = "";

// Log our bot in using the token from https://discordapp.com/developers/applications/me

client.login(process.env.DISCORD_API_KEY);

client.on('ready', () => {

  console.log('I am ready!');
  client.user.setActivity({ name: prefix + "help", type: "LISTENING" });
  //console.log(client.user);
  startDate = new Date();
});

client.on('message', message => {
  if (message.author.id != client.user.id) {

    if (message.mentions.has(client.user)) {
      message.channel.send(message.author.toString());
    }
    if (message.channel.name == "ano" && message.content.length == 1) {
      findWord(message.content, message);
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
    else if (message.content.toLowerCase() == "cringe") {
      message.channel.messages.fetch({ limit: 2 }).then(messages => {

        var previousMessage = messages.array()[1];
        addCringe(previousMessage.member);


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
            embed: {
              title: "JacekKocek v" + changelog.version, description: "Released " + changelog.releaseDate, fields: [
                {
                  name: "New commands", value: commandChanges
                },
                {
                  name: "Changes", value: changeChanges
                },

              ]
            }
          });
          break;
        }
        case "help":

          /*message.channel.send({
            embed: {
              title: "Help", description: "Type `¤help <command>` to get further info on a command", fields: [
                { name: "Display help", value: "```¤help```", inline: true },
                { name: "Spell a word in reactions", value: "```¤spell <word>```", inline: true },
                { name: "List letter emoji", value: "```¤listLetterEmoji```", inline: true },
                { name: "Send animated emoji", value: "```:gif2:```", inline: true },

              ]
            }
          });*/
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
              embed: {
                title: "Help", description: "Type `" + prefix + "help <command>` to get further info on a command", fields: [
                  {
                    name: "Basic commands", value: helpBasic
                  },
                  {
                    name: "Admin commands", value: helpAdmin
                  },

                ]
              }
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
                embed: {
                  title: "Help - " + c.name, description: (c.longDescription != null ? c.longDescription : c.description)
                }
              });

            }
            else {
              message.channel.send("`" + argument + "` is not a command!");
            }
          }
          break;
        case "s":
          console.log("SEARCH!");
          startGoogleSearch(argument, message, 1);
          break;
        case "film":
          console.log("SEARCH!");
          startGoogleSearch(argument, message, 2);
          break;

        case "zobrazit":
          startGoogleSearch(argument, message, 0);

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
                message.channel.messages.fetch({ limit: argNumber }).then(messages => {

                  var previousMessages = messages.array();
                  for (var i = 0; i < argNumber; i++) {
                    var reacts = previousMessages[i].reactions.cache.mapValues(reaction => reaction._emoji.name).array();
                    //message.channel.send(argument.charAt(i));
                    previousMessages[i].delete();
                    if (reacts.includes("♋")) break;
                  }

                });
              }
            });
          }
          else {
            message.channel.send("cringe");
            addCringe(message.member);
          }
          break;
        case "listCringe":

          if (Object.keys(cringeScore).length == 0) { message.channel.send("No cringe :disappointed:"); }
          else {
            //var output = "**Cringe leaderboard since " + dateString(startDate) + ":**\n";
            var output = "__**Cringe leaderboard:**__\n";
            var cringeUsers = cringeLeaderboard();
            for (var i = 0; i < cringeUsers.length; i++) {
              if (cringeUsers[i] != -1) {
                if (i == 0) output += (i + 1) + ". Cringelord **" + cringeUsers[i] + "**: " + cringeScore[cringeUsers[i]] + " cringe\n";
                else
                  output += (i + 1) + ". **" + cringeUsers[i] + "**: " + cringeScore[cringeUsers[i]] + " cringe\n";
              }
            }

            /*for (var u in cringeScore) {
              console.log(u, cringeScore[u]);
              output += u + ": " + cringeScore[u] + " cringe\n";
            }*/
            message.channel.send(output);
          }
          break;
        case "hit":
          message.channel.send("cringe");
          addCringe(message.member);
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
          message.delete();
          if (message.member.voice.channel)
            message.member.voice.channel.join().then(voice => {
              //voice.play("https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_1MG.mp3", { volume: 0.2 });
              voice.play("http://uk1.internet-radio.com:8004/live", { volume: 0.063 });

            }, function (e) { console.log("REJECTED!!!", e) });
          break;
        }
        case "song": {
          message.delete();
          if (message.member.voice.channel)
            message.member.voice.channel.join().then(voice => {
              mlpSong(voice, argument, false, message.channel);
            }, function (e) { console.log("REJECTED!!!", e) });
          break;
        }
        case "songs": {
          message.delete();
          if (message.member.voice.channel)
            message.member.voice.channel.join().then(voice => {
              mlpSong(voice, argument, true, message.channel);
            }, function (e) { console.log("REJECTED!!!", e) });
          break;
        }
        case "radio": {
          message.delete();
          if (message.member.voice.channel)
            message.member.voice.channel.join().then(voice => {
              playRadio(voice, message.channel);
            }, function (e) { console.log("REJECTED!!!", e) });
          break;
        }

        case "stop": {
          message.delete();
          let v = message.guild.voice;
          if (v) {
            if (v.connection.dispatcher)
              v.connection.dispatcher.pause();
            v.kick();
          }
          if (radioTimer) clearTimeout(radioTimer);
          break;
        }
        case "time": {
          message.channel.send(dateString(new Date(Date.now() - getTimeOffset(new Date(), defaultTimeZone))));
          message.channel.send(new Date().toString());
          break;
        }
        case "remind": {
          if (argument != null) {
            message.channel.send(argument.split(" ")[0]);
          }
          else {
            message.channel.send("remind WHEN???");
          }
          break;
        }
        case "hint": {
          if (lastSelectedWord != "") {
            message.channel.send(lastSelectedWord.toUpperCase());
          }
          else {
            message.channel.send("There is nothing to hint");
          }
          break;
        }

        default:
          message.channel.send("Unknown command :disappointed:");

      }
    }
  }
});

//#region KINO
client.on("messageReactionAdd", (messageReaction) => {
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
    let reactionUser = messageReaction.users.cache.last();
    let kinoUser = kinoEntry.users.get(reactionUser.username);
    let reactionMessage = messageReaction.message;

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
  fs.writeFile(playlistFileName, JSON.stringify(Array.from(kinoPlaylist)), (e) => { console.log(e) });
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



//#endregion
//#region CRINGE
function cringeLeaderboard() {
  var tempScores = new Array(9);
  tempScores.fill(-1);

  var usedIDs = new Array(9);
  usedIDs.fill(-1);

  var con = true;

  for (var t = 0; t < tempScores.length; t++) {
    //console.log("a");
    for (var u in cringeScore) {
      //console.log("b");
      if (cringeScore[u] > tempScores[t]) {
        con = true;
        for (var v = 0; v < t; v++) {
          if (usedIDs[v] == u) {
            con = false;
          }
        }
        if (con) {
          tempScores[t] = cringeScore[u];
          usedIDs[t] = u;
        }
      }
    }
  }
  return usedIDs;
}
function addCringe(member) {
  var user = member.user;
  if (cringeScore[user.username] != null) cringeScore[user.username]++;
  else cringeScore[user.username] = 1;
  if (cringeScore[user.username] > cringelordScore) {
    cringelordScore = cringeScore[user.username];
    cringelord = user;
    //cringelordRole = member.guild.roles.cache.find(r => r.name = "Cringelord");
    //console.log(member.guild.roles.cache);
    cringelordRole = findRole(member.guild.roles.cache, "Cringelord");
    console.log("Cringelord member amount: " + cringelordRole.members.size);
    cringelordRole.members.forEach(m => {
      if (m != member) {
        m.roles.remove(cringelordRole);
        console.log("Removing cringelord from " + m.user.username)
      }
    });
    member.roles.add(cringelordRole);
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
  Https.get("https://www.googleapis.com/customsearch/v1?key=AIzaSyBmL2RtAHmlDbAzUUcUK27SFq9byJWTAyc&cx=" + cx + "&q=" + searchTerm, function (res) {
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
//#region SONGS

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
        //console.log(songData.video);
        if (channel) {
          channel.send({
            embed: {
              title: "► " + songData.name, description: Math.floor(songData.length / 60) + ":" + addZero(songData.length % 60) + " | From *" + songData.episode + "*",
              color: alternateFluttershyColor()
            }
          });
        }
        voice.play(ytdl(songData.video, { filter: "audioonly" }), { volume: 0.5 });
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

        voice.play("https://ponyweb.ml/" + parsed.current.Source, { seek: seektime, volume: 0.5 });

        if (radioTimer) clearTimeout(radioTimer);
        if (channel) {
          channel.send({
            embed: {
              title: "♫ " + parsed.current.Name, description: Math.floor(parsed.current.PlayTime / 60) + ":" + addZero(Math.round(parsed.current.PlayTime % 60)) + " | From *" + parsed.current.Episode + "*",
              color: alternateFluttershyColor(),
              footer: { text: "Next: " + parsed.next.Name }
            }
          });
        }
      }
      radioTimer = setTimeout(() => {
        playRadio(voice, channel);
      }, timeout_time);

    });
  });
}

function radioApiKey() {
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

//#endregion
//#region LETTERS
function findWord(newLetter, message) {
  newLetter = newLetter.toLowerCase();
  if (isLetter(newLetter)) {
    console.log(newLetter);
    let searchWord = currentWord + newLetter;
    Https.get("https://api.datamuse.com/sug?max=50&s=" + searchWord + "*", function (res) {
      console.log("HTTPS Status:" + res.statusCode);
      var body;
      res.on("data", function (data) {
        body += data;
      });
      res.on("end", function () {
        var parsed = JSON.parse(body.substring(9, body.length));
        console.log("Searched for: \"" + searchWord + "\"");
        console.log(parsed.length);
        if (parsed.length > 0) {
          let selectedWord = parsed[randomInt(0, parsed.length-1)].word;
          selectedWord = selectedWord.replace(/\s+/g, '');
          lastSelectedWord = selectedWord;
          if (currentWord + newLetter == selectedWord) {
            message.channel.send(":white_check_mark:");
          }
          else {
            let selectedLetter = selectedWord.charAt(currentWord.length + 1);
            currentWord += newLetter + selectedLetter;
            console.log("selected:" + selectedWord);
            console.log("  letter:" + selectedLetter);
            console.log("currentW:" + currentWord);
            message.channel.send(selectedLetter.toUpperCase());
          }
        }
        else if (currentWord.length > 0) {
          console.log("couldn't find word, resetting");
          currentWord = "";
          findWord(newLetter, message);
        }

      });
    });
  }
}

function isLetter(str) {
  return str.length === 1 && str.match(/[a-z]/i);
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


