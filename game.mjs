import commonWords from './common_words.mjs';
import dictionaryWords from './dictionary_words.mjs';
import excludedWords from './excluded_words.mjs';

const validWords = commonWords
  .slice(0, 20000)
  .filter((word) => dictionaryWords.has(word) && !excludedWords.has(word));

const errors = {
  'wrong-word-length': 'The word you guessed is not the correct length.',
  'not-a-word': 'The word you guessed is not a word.',
}

function getErrorString(status) {
  return errors[status] ?? `An unknown error occurred. (${status})`;
}

function startGame(wordLength) {
  if (!validWords.some((word) => word.length == wordLength)) {
    wordLength = 5;
  }

  const eligible = validWords.filter(word => word.length === wordLength);
  const word = eligible[Math.floor(Math.random() * eligible.length)];
  
  const letters = {};
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => letters[letter] = { letter, status: 'unknown' });

  return {
    word,
    splitWord: word.split(''),
    guesses: [],
    maxGuesses: 6,
    letters,
    status: 'game-started',
  }
}

function guess(game, guessedWord) {
  if (guessedWord.length != game.word.length) {
    return { success: false, status: 'wrong-word-length' };
  }

  if (!dictionaryWords.has(guessedWord)) {
    return { success: false, status: 'not-a-word' };
  }

  const guess = {
    word: guessedWord,
    letters: []
  };

  // FIXME: this sucks, probably dont need old for loops anymore
  const remainingLetters = [...game.splitWord];
  // first pass: correct letters only
  // (ex. word is "glove" but you guess "geode", the first e needs to be gray)
  for (let i = 0; i < game.word.length; i++) {
    const correct = guessedWord[i] == game.splitWord[i];
    const letterStatus = {
      letter: guessedWord[i],
      status: correct ? 'correct' : 'unused'
    }

    if (correct) remainingLetters.splice(remainingLetters.indexOf(guessedWord[i]), 1);
    guess.letters.push(letterStatus);
  }

  // second pass: correct letters in the wrong position
  for (let i = 0; i < guess.letters.length; i++) {
    if (guess.letters[i].status === 'correct') continue;
    const status = remainingLetters.includes(guessedWord[i]) ? 'in-word' : 'unused';
    guess.letters[i].status = status;
    if (status === 'in-word') {
      remainingLetters.splice(remainingLetters.indexOf(guessedWord[i]), 1);
    }
  }

  // update the global letters status now, not allowing any status to get downgraded
  // (this can probably be improved with enums and Math.max())
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

  // update the game object with the status, too, and return the guess
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