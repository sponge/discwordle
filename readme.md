![Logo](logo-sm.png)

# Discwordle
Play Wordle with your friends on your Discord server.

## Invite
[Add Discwordle to your server!](https://discord.com/api/oauth2/authorize?client_id=929196686243397672&permissions=264192&scope=bot%20applications.commands)

## About
Discwordle is a simple Discord bot that plays as many games of [Wordle](https://www.powerlanguage.co.uk/wordle/) as your heart desires.

Figure out the random word in a set amount of guesses. Green letters mean that the letter is in the word and in the correct spot, yellow letters are in the word but in the wrong spot, and gray letters are not in the word at all. All players cooperate on the same board, with a shared amount of guesses.

Below the board, a reference for what letters have been used is displayed. Letters not in the word will dim out if they are not in the final word, making it easy to tell which letters to focus on.

![Screenshot](screenshot.png)

## Commands

`/discwordle (wordLength)` - starts a game of Discwordle, optionally specifying how long the word should be. Defaults to the classic 5 length. Issue this command at anytime to send a new message with the board, useful if the original has scrolled way out of view.

`/guess (word)` - guesses a word. Guesses must be valid dictionary words, and must be the same amount of letters as 

## Future Enhancements

Competitive mode? Board is hidden, and all guesses are shown only to the player who sent them. Race to be the first to guess it.

Have any others, or running into any issues? Open an issue and let me know!

## Thanks

Word list and some code used from [hello wordl](http://foldr.moe/hello-wordl/) ([Github](https://github.com/lynn/hello-wordl)), a great Wordle clone!