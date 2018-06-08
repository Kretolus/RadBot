const fs = require('fs');
const Discord = require('discord.js');
const winston = require('winston');

const { token, owner, prefix } = require("./config.json"); // import config
const commandFiles = fs.readdirSync('./commands'); // import command files

const client = new Discord.Client();
client.commands = new Discord.Collection();
const cooldowns = new Discord.Collection();

const channelNames = {
  general: 'general',
  radcoins: 'radcoins-redemption-rules',
  rules: 'rules-and-info'
};

// set up a winston logger
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// iterate over command files and set available client commands
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  // set a new item in the Collection
  // with the key as the command name and the value as the exported module
  client.commands.set(command.name, command);
}

// client 'ready' event
client.on('ready', () => {
  logger.log({
      level: 'info',
      message: 'RadBot online!'
  });
});

// message handler
client.on('message', message => {
  // check for prefix and whether the message was posted by a bot
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  // get command arguments and name
  const args = message.content.slice(prefix.length).split(/ +/);
  const commandName = args.shift().toLowerCase();

  // check if given command exists
  if (!client.commands.has(commandName)) return;
  const command = client.commands.get(commandName);

  if (command.owner_only && message.author.id !== owner) return;

  // check if arguments are required, and if so if they were provided
  if (command.args && !args.length) {
    return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
  }

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 1) * 1000;

  if (!timestamps.has(message.author.id)) {
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  }
  else {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  }

  // command execution
  try {
    command.execute(logger, client, message, args);
  }
  catch (error) {
    logger.log({
        level: 'error',
        message: error
    });
    message.reply('there was an error trying to execute that command!');
  }
});

client.on('guildMemberAdd', member => {
  // get the general channel:
  const general = member.guild.channels.find('name', channelNames.general);
  // do nothing if the channel wasn't found on this server
  if (!general) return;

  // find the 'Trial' role to be given to the new member
  const trial = member.guild.roles.find('name', 'Trial');
  // do nothing if the role wasn't found on this server
  if (!trial) return;

  // find channels to be mentioned in the greeting
  const radcoins = member.guild.channels.find('name', channelNames.radcoins);
  const rules = member.guild.channels.find('name', channelNames.rules);

  member.addRole(trial).then((member) => {
    // Send the greeting message message, mentioning the member
    general.send(
        `Welcome ${member}! Be sure to read through ${rules} and check out ${radcoins}`);
  });
});

client.login(token); // client API login
