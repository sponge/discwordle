import commonWords from './common_words.mjs';
import dictionaryWords from './dictionary_words.mjs';
import excludedWords from './excluded_words.mjs';

const validWords = commonWords
  .slice(0, 20000)
  .filter((word) => dictionaryWords.has(word) && !excludedWords.has(word));

function startGame(wordLength) {
  const eligible = validWords.filter(word => word.length === wordLength);
  const word = eligible[Math.floor(Math.random() * eligible.length)];
  const letters = {};
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => letters[letter] = {letter, status: 'unknown'});
    
  return {
    word,
    splitWord: word.split(''),
    guesses: [],
    maxGuesses: 6,
    letters,
  }
}

function guess(game, guessedWord) {
  if (guessedWord.length != game.word.length) {
    return { success: false, status: 'wrong-word-length'};
  }

  if (!dictionaryWords.has(guessedWord)) {
    return { success: false, status: 'not-a-word'};
  }

  const guess = {
    word: guessedWord,
    letters: []
  };

  const tempSplit = [...game.splitWord];
  for (let i = 0; i < game.word.length; i++) {
    const letterStatus = {
    letter: guessedWord[i],
    status: guessedWord[i] == game.splitWord[i] ? 'correct' : tempSplit.includes(guessedWord[i]) ? 'in-word' : 'not-in-word'
  }
    guess.letters.push(letterStatus);

    if (letterStatus.status === 'correct') {
      game.letters[letterStatus.letter].status = 'correct';
    } else if (letterStatus.status === 'in-word' && game.letters[letterStatus.letter].status !== 'correct') {
      game.letters[letterStatus.letter].status = 'in-word';
    } else {
      game.letters[letterStatus.letter].status = 'unused';
    }

    const idx = tempSplit.indexOf(guessedWord[i]);
    if (idx != -1) {
      tempSplit.splice(idx, 1);
    }
  }

  game.guesses.push(guess);

  if (game.word == guessedWord) {
    return { success: true, status: 'game-won', guess }
  } else if (game.guesses.length >= game.maxGuesses) {
    return { success: true, status: 'game-lost', guess }
  } else {
    return { success: true, status: 'guess-made', guess }
  }
}

export { startGame, guess }