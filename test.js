const Discord = require('discord.js');
//const Dotenv = require('dotenv');
const Http = require('https');
const { url } = require('inspector');
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
    description: "Spell word in emoji reactions to the previous message",
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
    description: "Award Cringe to someone",
    longDescription: "Award Cringe to someone - if they have more Cringe than anyone else, this will also make them the Cringelord",
  },
  {
    name: ":gif2:",
    prefix: false,
    arguments: "",
    description: "Send animated emoji",
  },
  {
    name: ":spin:",
    prefix: false,
    arguments: "",
    description: "Send animated emoji",
  },
];
var helpAdminCommands = [
  {
    name: "listLetterEmoji",
    prefix: true,
    arguments: "",
    description: "List letter emoji",
  }
];

var letterEmoji = {
  a: "🇦", b: "🇧", c: "🇨", d: "🇩", e: "🇪", f: "🇫", g: "🇬", h: "🇭", i: "🇮", j: "🇯", k: "🇰", l: "🇱", m: "🇲", n: "🇳", o: "🇴", p: "🇵", q: "🇶", r: "🇷", s: "🇸", t: "🇹", u: "🇺", v: "🇻", w: "🇼", x: "🇽", y: "🇾", z: "🇿",
  "#": "#️⃣",
  "0": "0️⃣", "1": "1️⃣", "2": "2️⃣", "3": "3️⃣", "4": "4️⃣", "5": "5️⃣", "6": "6️⃣", "7": "7️⃣", "8": "8️⃣", "9": "9️⃣"
};

// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login(process.env.DISCORD_API_KEY);

client.on('ready', () => {

  console.log('I am ready! NEW 2');
  client.user.setActivity({ name: prefix + "help", type: "LISTENING" });
  //console.log(client.user);
  startDate = new Date();
});

client.on('message', message => {
  if (message.author.id != client.user.id) {

    if (message.mentions.has(client.user)) {
      message.channel.send(message.author.toString());
    }


    if (message.content === ':gif2:') {

      kocek++;

      //message.channel.send(message.author.username,{files:[{attachment:message.author.displayAvatarURL()}],embed:{title:"kok",color:15158332,image:{url:message.author.displayAvatarURL()},fields:[{name:"ko",value:"text"}]}});
      //console.log("authro:" + message.author.username);
      //message.react("😌");
      //message.react("728583366030393414");
      message.delete();
      message.channel.send(client.emojis.cache.get("728583366030393414").toString());


      //message.channel.send(client.emojis.get("728583366030393414"));
    }
    if (message.content === ':spin:') {

      message.delete();
      message.channel.send(client.emojis.cache.get("708663999201411122").toString());

    }
    if (message.content.toLowerCase() == "cringe") {
      message.channel.messages.fetch({ limit: 2 }).then(messages => {

        var previousMessage = messages.array()[1];
        addCringe(previousMessage.member);


      });
    }

    if (message.content.startsWith(prefix)) {
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
              helpBasic += "`"
              if (command.prefix) helpBasic += prefix;
              helpBasic += command.name;
              if (command.arguments != "") helpBasic += " <" + command.arguments + ">";
              helpBasic += "` - " + command.description;
              helpBasic += "\n";
            });
            var helpAdmin = "";
            helpAdminCommands.forEach(command => {
              helpAdmin += "`"
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
          StartGoogleSearch(argument, message, 1);
          break;
        case "film":
          console.log("SEARCH!");
          StartGoogleSearch(argument, message, 2);
          break;

        case "zobrazit":
          StartGoogleSearch(argument, message, 0);

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

        default:
          message.channel.send("Unknown command :disappointed:");

      }
    }
  }
});



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

function dateString(inputDate) {
  var minutes = inputDate.getMinutes();
  var hours = inputDate.getHours();
  var day = inputDate.getDay();
  var month = inputDate.getMonth();
  var year = inputDate.getFullYear();
  return (day + "." + month + "." + year + " " + hours + ":" + minutes);
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
    cringelordRole.members.each(m => { m.roles.remove(cringelordRole) });
    member.roles.add(cringelordRole);
  }
}

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

function StartGoogleSearch(argument, message, type) {

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
  Http.get("https://www.googleapis.com/customsearch/v1?key=AIzaSyBmL2RtAHmlDbAzUUcUK27SFq9byJWTAyc&cx=" + cx + "&q=" + searchTerm, function (res) {
    console.log(res.statusCode);
    var body;
    res.on("data", function (data) {
      body += data;
    });
    res.on("end", function () {
      var parsed = JSON.parse(body.substring(9, body.length));
      var resultsList = parsed.items;


      if (resultsList != null) {
        lastSearchResults = resultsList;
        console.log(resultsList);
        console.log(parsed.queries);

        message.channel.send(resultsList[0].title + "\n" + resultsList[0].snippet + "\n" + resultsList[0].link, { tts: false });
      }
      else
        message.channel.send("No results :disappointed:", { tts: true });

    });
  });
}