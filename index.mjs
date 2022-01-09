import Config from './config.mjs';
import { Client, Intents, MessageEmbed } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { green, yellow, gray, darkGray } from './letters.mjs';
import { startGame, guess, getErrorString } from './game.mjs';

// our commands
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

// mapping of channel id to the active game, this is the master list of games
const games = new Map();

// prints a string of letters with the correct color (this does not handle the letter display
// because that has an extra state of "unused" vs "unknown")
function printGuessLetters(letters) {
  let str = '';

  for (const letter of letters) {
    const color = letter.status === 'correct' ? green : letter.status === 'in-word' ? yellow : gray;
    str += `${color[letter.letter]} `;
  }

  return str;
}

// creates the whole rich embed for the game, can be used in interactions or messages
function createRichEmbed(game) {
  // print the guesses so far
  let board = '';

  for (const guess of game.guesses) {
    board += `${printGuessLetters(guess.letters)}\n`;
  }

  // print empty spaces for the rest
  for (let i = game.guesses.length; i < game.maxGuesses; i++) {
    for (let j = 0; j < game.word.length; j++) {
      board += '<:blank:929248507016118322> ';
    }
    board += '\n';
  }

  // the letter display underneath the game board, note that we need to distinguish between
  // "unknown" and "unused" here, otherwise we could use printGuessLetters
  let lettersStatus = '';
  for (const letter of Object.values(game.letters)) {
    const color = letter.status === 'correct' ? green :
      letter.status === 'in-word' ? yellow :
      letter.status === 'unknown' ? gray :
      darkGray;
    lettersStatus += `${color[letter.letter]} `;
    
    // break halfway through
    if (letter.letter === 'm') lettersStatus += '\n';
  }

  // build the actual embed
  const embed = new MessageEmbed()
    .setDescription(board)
    .addFields({ name: 'Letters', value: lettersStatus });

  // decorate the board after the game ends
  if (game.status === 'game-won') {
    embed.setTitle('You win!');
  } else if (game.status === 'game-lost') {
    embed.setTitle('You lose!');
    embed.addFields({ name: 'The word was', value: game.word });
  }

  return embed;
}

// interaction tokens only last 15 minutes, but some folks may want to play a very slow version of the game
// so send a new message if the interaction update fails
async function tryUpdateInteraction(client, game) {
  try {
    // TODO: once this happens once, it always fails. can maybe skip this by throwing an error to jump right to the catch
    await game.originalInteraction.editReply({ embeds: [createRichEmbed(game)] });
  } catch (err) {
    // create a new message, or reuse an existing one
    if (!game.originalMessage) {
      await game.originalInteraction.guild.channels.fetch();
      game.originalMessage = await client.channels.cache.get(game.originalInteraction.channelId).send({ embeds: [createRichEmbed(game)] });
    } else {
      await game.originalMessage.edit({ embeds: [createRichEmbed(game)] });
    }
  }
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
    // wrap the whole game in a try/catch and end it if anything goes wrong
    try {
      if (!interaction.isCommand()) return;

      switch (interaction.commandName) {
        // command for starting a new game
        case 'discwordle': {
          const wordLength = interaction.options.getInteger('length') ?? 5;

          // if a game already is ongoing, reprint the message and start updating that one instead
          if (games.has(interaction.channelId)) {
            const game = games.get(interaction.channelId);
            game.originalInteraction = interaction;
            await interaction.reply({ embeds: [createRichEmbed(game)] });
            return;
          }

          // create a new game
          const game = startGame(wordLength);
          game.originalInteraction = interaction;
          games.set(interaction.channelId, game);

          console.log(`Started game: guild:${interaction.guildId} channel:${interaction.channelId} word:${game.word}`);
          if (Config.verbose) console.log(game);

          await interaction.reply({ embeds: [createRichEmbed(game)] });
          return;
        }

        // command for guessing a word
        case 'guess': {
          // TODO: this probably shouldn't ever be blank since enforced by the client, but it'll kill the game if it somehow is
          const guessedWord = interaction.options.getString('word', true);

          // no game ongoing
          if (!games.has(interaction.channelId)) {
            await interaction.reply({ content: 'No game active! Try /discwordle to start a new one.', ephemeral: true });
            return;
          }

          // run the guess through the actual game logic
          const game = games.get(interaction.channelId);
          const result = guess(game, guessedWord);

          if (Config.verbose) console.log(game, result);

          // usually just an input error
          if (!result.success) {
            await interaction.reply({ content: getErrorString(result.status), ephemeral: true });
            return;
          }

          // print the guess with the correct colors, and print win/loss if applicable
          let reply = `${game.guesses.length}/${game.maxGuesses}: ${printGuessLetters(result.guess.letters)}`;

          if (result.status == 'game-won') {
            reply += '\n**Game Over:** You win!';
            console.log(`Game won: guild:${interaction.guildId} channel:${interaction.channelId} word:${game.word}`);
          } else if (result.status == 'game-lost') {
            reply += `\n**Game Over:** you lost!\nThe word was: **${game.word}**`;
            console.log(`Game lost: guild:${interaction.guildId} channel:${interaction.channelId} word:${game.word}`);
          } else if (result.status == 'guess-made') {
            console.log(`Guess made: guild:${interaction.guildId} channel:${interaction.channelId} word:${game.word} guess:${result.guess.word}`);
          }

          // update both at once, no need to wait for one or the other to finish
          await Promise.all([
            interaction.reply(reply),
            tryUpdateInteraction(client, game),
          ]);

          // if the game is over, remove it from the active games list
          if (result.status === 'game-won' || result.status === 'game-lost') {
            games.delete(interaction.channelId);
          }

          return;
        }
      }
    } catch (error) {
      // end the game if anything goes wrong
      console.error(error);
      console.error(error.stack);
      games.delete(interaction.channelId);

      // just send a message to the channel, that usually won't fail unless something really terrible is going on
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