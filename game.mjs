import commonWords from './common_words.mjs';
import dictionaryWords from './dictionary_words.mjs';
import excludedWords from './excluded_words.mjs';

// commonWords is sorted by usage, so grab the most used words
// excludedWords is manually maintained, also came from hello wordl and just has some names
// and proper nouns
const validWords = commonWords
  .slice(0, 20000)
  .filter((word) => dictionaryWords.has(word) && !excludedWords.has(word));

// returns a string or unknown error if for some reason i didn't update the errors dict above
function getErrorString(status) {
  const errors = {
    'wrong-word-length': 'The word you guessed is not the correct length.',
    'not-a-word': 'The word you guessed is not a word.',
  }
  
  return errors[status] ?? `An unknown error occurred. (${status})`;
}

// public function, starts a game. this function does not fail
// (well not literally, i mean all code can go rogue, but rather there's not intended to be a 
// failure state, no early returns or exceptions)
function startGame(wordLength) {
  // if the requested word length doesn't exist, default back to 5
  // TODO: maybe just decrease by 1 every time, but it'd suck if you typed in 9999999999
  if (!validWords.some((word) => word.length == wordLength)) {
    wordLength = 5;
  }

  // filter the word list down to words of that length and choose a random one
  const eligible = validWords.filter(word => word.length === wordLength);
  const word = eligible[Math.floor(Math.random() * eligible.length)];
  
  // create the selected letters display
  const letters = {};
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => letters[letter] = { letter, status: 'unknown' });

  return {
    word, // the secret word in the game
    splitWord: word.split(''), // just for convenience
    guesses: [], // list of all guesses made and their correctness
    maxGuesses: 6, // max guesses allowed, not configurable atm
    letters, // status of which letters have been used, and if they were correct 
    status: 'game-started', // current stsatus of the game
  }
}

// public function, guesses a letter in the game. if the input is invalid, it will return an
// object with success: false, and a status that can be grabbed from getErrorString
// TODO: maybe just include the error message in the object directly.
function guess(game, guessedWord) {
  // if the guess isn't the right length, don't bother
  if (guessedWord.length != game.word.length) {
    return { success: false, status: 'wrong-word-length' };
  }

  // all guesses have to be valid words. no mashing keys to figure it out.
  if (!dictionaryWords.has(guessedWord)) {
    return { success: false, status: 'not-a-word' };
  }

  // the guess is valid. build the object and figure it out
  const guess = {
    word: guessedWord,
    letters: []
  };

  // make a copy of the letters in the word so we can remove them as they're used
  // this is what makes duplicate letters only light up the amount of times they're used
  const remainingLetters = [...game.splitWord];

  // first pass: find correct letters only. this is separated out because ex. word is "glove" but you
  // guess "geode", the first e needs to be gray, not yellow)
  // TODO: this sucks, probably dont need old for loops anymore
  for (let i = 0; i < game.word.length; i++) {
    const correct = guessedWord[i] == game.splitWord[i];

    guess.letters.push({
      letter: guessedWord[i],
      status: correct ? 'correct' : 'unused'
    });

    if (correct) remainingLetters.splice(remainingLetters.indexOf(guessedWord[i]), 1);
  }

  // second pass: find correct letters in the wrong position
  // TODO: confusing, looping through guess.letters here since it now exists. create the object first
  // and use the same loop twice?
  for (let i = 0; i < guess.letters.length; i++) {
    // ignore correct letters
    if (guess.letters[i].status === 'correct') continue;

    const status = remainingLetters.includes(guessedWord[i]) ? 'in-word' : 'unused';
    guess.letters[i].status = status;
    if (status === 'in-word') {
      remainingLetters.splice(remainingLetters.indexOf(guessedWord[i]), 1);
    }
  }

  // update the global letters status now, not allowing any status to get downgraded
  // TODO: his can probably be improved with enums and Math.max(). very confusing variable naming too!
  for (let i = 0; i < guess.letters.length; i++) {
    const guessLetter = guess.letters[i];
    const gameLetter = game.letters[guessLetter.letter];
    if (guessLetter.status === 'correct') {
      gameLetter.status = 'correct';
    } else if (guessLetter.status === 'in-word' && gameLetter.status !== 'correct') {
      gameLetter.status = 'in-word';
    } else if (guessLetter.status === 'unused' && gameLetter.status !== 'correct' && gameLetter.status !== 'in-word') {
      gameLetter.status = 'unused';
    }
  }

  game.guesses.push(guess);

  // check game ending conditions, or just continue on
  if (game.word == guessedWord) {
    game.status = 'game-won';
    return { success: true, status: 'game-won', guess }
  } else if (game.guesses.length >= game.maxGuesses) {
    game.status = 'game-lost';
    return { success: true, status: 'game-lost', guess }
  } else {
    game.status = 'guess-made';
    return { success: true, status: 'guess-made', guess }
  }
}

export { startGame, guess, getErrorString }