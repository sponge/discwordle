import commonWords from './common_words.mjs';
import dictionaryWords from './dictionary_words.mjs';
import excludedWords from './excluded_words.mjs';

const validWords = commonWords
  .slice(0, 20000)
  .filter((word) => dictionaryWords.has(word) && !excludedWords.has(word));

function startGame(wordLength) {
  const eligible = validWords.filter(word => word.length === wordLength);
  const word = eligible[Math.floor(Math.random() * eligible.length)];

  return {
    word,
    splitWord: word.split(''),
    guesses: [],
    maxGuesses: 6,
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
    guess.letters.push({
      letter: guessedWord[i],
      status: guessedWord[i] == game.splitWord[i] ? 'correct' : tempSplit.includes(guessedWord[i]) ? 'in-word' : 'not-in-word'
    });

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