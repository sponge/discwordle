import Config from './config.mjs';
import { Client, Intents, MessageEmbed } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { green, yellow, gray, darkGray } from './letters.mjs';
import { startGame, guess, getErrorString } from './game.mjs';

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

function createRichEmbed(game) {
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

  let lettersStatus = '';
  for (const letter of Object.values(game.letters)) {
    const color = letter.status === 'correct' ? green :
      letter.status === 'in-word' ? yellow :
        letter.status === 'unknown' ? gray :
          darkGray;
    lettersStatus += `${color[letter.letter]} `;
    if (letter.letter === 'm') lettersStatus += '\n';
  }

  const embed = new MessageEmbed()
    .setDescription(board)
    .addFields({ name: 'Letters', value: lettersStatus });

  if (game.status === 'game-won') {
    embed.setTitle('You win!');
  } else if (game.status === 'game-lost') {
    embed.setTitle('You lose!');
    embed.addFields({ name: 'The word was', value: game.word });
  }

  return embed;
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

  const client = new Client({ intents: [Intents.FLAGS.GUILD_MESSAGES] });

  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (!interaction.isCommand()) return;

      switch (interaction.commandName) {
        case 'discwordle': {
          const wordLength = interaction.options.getInteger('length') ?? 5;

          if (games.has(interaction.channelId)) {
            const game = games.get(interaction.channelId);
            game.originalInteraction = interaction;
            await interaction.reply({ embeds: [createRichEmbed(game)] });
            return;
          }

          const game = startGame(wordLength);
          game.originalInteraction = interaction;
          games.set(interaction.channelId, game);
          console.log(game);

          await interaction.reply({ embeds: [createRichEmbed(game)] });
          return;
        }

        case 'guess': {
          const guessedWord = interaction.options.getString('word', true);

          if (!games.has(interaction.channelId)) {
            await interaction.reply({ content: 'no game started!', ephemeral: true });
            return;
          }

          const game = games.get(interaction.channelId);
          const result = guess(game, guessedWord);
          console.log(game, result);

          if (!result.success) {
            await interaction.reply({ content: getErrorString(result.status), ephemeral: true });
            return;
          }

          let reply = `${game.guesses.length}/${game.maxGuesses}: ${printGuessLetters(result.guess.letters)}`;

          if (result.status == 'game-won') {
            reply += '\n**Game Over:** You win!';
          }

          if (result.status == 'game-lost') {
            reply += `\n**Game Over:** you lost!\nThe word was: **${game.word}**`;
          }

          await Promise.all([
            interaction.reply(reply),
            game.originalInteraction.editReply({ embeds: [createRichEmbed(game)] }),
          ]);

          if (result.status === 'game-won' || result.status === 'game-lost') {
            games.delete(interaction.channelId);
          }

          return;
        }
      }
    } catch (error) {
      console.error(error);
      console.trace();
      games.delete(interaction.channelId);
      try {
        await interaction.guild.channels.fetch();
        client.channels.cache.get(interaction.channelId).send(`Caught an exception, game over: ${error.message}`);
      } catch (error) {
        console.error(error);
      }
    }
  });

  client.login(Config.token);
}
main();