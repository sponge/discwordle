import Config from './config.mjs';
import { Client, Intents } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { green, yellow, gray } from './letters.mjs';
import { startGame, guess } from './game.mjs';

const commands = [
  {
    name: 'discwordle',
    description: 'Start a game of Discwordle',
    options: [{
      name: 'length',
      type: 4,
      description: 'Amount of letters in the word, default is 5',
      required: false
    }]
  },
  {
    name: 'guess',
    description: 'Guess a word',
    options: [{
      name: 'word',
      type: 3,
      description: 'Word to guess',
      required: true
    }],
  }
];

const games = new Map();

function printGuessLetters(letters) {
  let str = '';

  for (const letter of letters) {
    const color = letter.status === 'correct' ? green : letter.status === 'in-word' ? yellow : gray;
    str += `${color[letter.letter]} `;
  }

  return str;
}

function printGameBoard(game) {
  let board = '';

  for (const guess of game.guesses) {
    board += `${printGuessLetters(guess.letters)}\n`;
  }

  for (let i = game.guesses.length; i < game.maxGuesses; i++) {
    for (let j = 0; j < game.word.length; j++) {
      board += '<:blank:929248507016118322> ';
    }
    board += '\n';
  }

  return board;
}

async function main() {
  // const rest = new REST({ version: '9' }).setToken(Config.token);
  // try {
  //   console.log('Started refreshing application (/) commands.');

  //   await rest.put(
  //     Routes.applicationCommands(Config.applicationId),
  //     { body: commands },
  //   );

  //   console.log('Successfully reloaded application (/) commands.');
  // } catch (error) {
  //   console.error(error);
  // }

  const client = new Client({intents: [Intents.FLAGS.GUILD_MESSAGES]});

  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isCommand()) return;

      if (interaction.commandName === 'discwordle') {
        const wordLength = interaction.options.getInteger('length') ?? 5;
        
        if (games.has(interaction.channelId)) {
          await interaction.reply({ content: 'there is already a game in progress in this channel.', ephemeral: true });
          return;
        }

        const game = startGame(wordLength);
        game.originalInteraction = interaction;
        games.set(interaction.channelId, game);
        console.log(game);

        let reply = printGameBoard(game);

        await interaction.reply(reply);
        return;
      }

      if (interaction.commandName === 'guess') {
        const guessedWord = interaction.options.getString('word', true);

        if (!games.has(interaction.channelId)) {
          await interaction.reply({ content: 'no game started!', ephemeral: true });
          return;
        }

        const game = games.get(interaction.channelId);
        const result = guess(game, guessedWord);
        console.log(game, result);

        if (!result.success) {
          await interaction.reply({ content: result.status, ephemeral: true });
          return;
        }

        let reply = `${game.guesses.length}/${game.maxGuesses}: ${printGuessLetters(result.guess.letters)}`;

        if (result.status == 'game-won') {
          reply += '\ngame over: you win!';
        }

        if (result.status == 'game-lost') {
          reply += `\ngame over: you lost!\nthe word was: ${game.word}`;
        }

        // FIXME: does this try still work if there's no await? i don't think so
        await interaction.reply(reply);
        // await interaction.reply({ content: reply, ephemeral: true });
        await game.originalInteraction.editReply(printGameBoard(game));

        if (result.status === 'game-won' || result.status === 'game-lost') {
          games.delete(interaction.channelId);
        }

      }
    } catch (error) {
      console.error(error);
      games.delete(interaction.channelId);
      // FIXME: better double exception handling!!!
      try {
        await interaction.reply("something went wrong!");
      } catch (error) {

      }
    }
  });

  client.login(Config.token);
}
main();