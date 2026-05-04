/** @module storage */

const GAME_PREFIX = 'sudoku-annie-game-';
const ACTIVE_KEY = 'sudoku-annie-active-game-id';
const DIFFICULTY_KEY = 'sudoku-annie-last-difficulty';

/**
 * Saves a game object to localStorage.
 * @param {Object} game
 */
export function saveGame(game) {
  try {
    localStorage.setItem(GAME_PREFIX + game.id, JSON.stringify(game));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

/**
 * Loads a game by ID from localStorage.
 * @param {string} id
 * @returns {Object|null}
 */
export function loadGame(id) {
  try {
    const raw = localStorage.getItem(GAME_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Returns all incomplete games sorted by most recently played.
 * @returns {Object[]}
 */
export function loadAllGames() {
  const games = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(GAME_PREFIX)) {
      try {
        const game = JSON.parse(localStorage.getItem(key));
        if (game && !game.completedAt) {
          games.push(game);
        }
      } catch (e) {
        // skip corrupt entries
      }
    }
  }
  // Sort by most recently played (id is timestamp-based)
  games.sort((a, b) => Number(b.id) - Number(a.id));
  return games;
}

/**
 * Deletes a game from localStorage.
 * @param {string} id
 */
export function deleteGame(id) {
  localStorage.removeItem(GAME_PREFIX + id);
  if (getActiveGameId() === id) {
    removeActiveGameId();
  }
}

/**
 * Sets the active game ID pointer.
 * @param {string} id
 */
export function setActiveGameId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}

/**
 * Gets the active game ID pointer.
 * @returns {string|null}
 */
export function getActiveGameId() {
  return localStorage.getItem(ACTIVE_KEY);
}

/** Removes the active game ID pointer. */
export function removeActiveGameId() {
  localStorage.removeItem(ACTIVE_KEY);
}

/**
 * Saves the last selected difficulty.
 * @param {string} difficulty
 */
export function saveLastDifficulty(difficulty) {
  localStorage.setItem(DIFFICULTY_KEY, difficulty);
}

/**
 * Gets the last selected difficulty, defaulting to 'easy'.
 * @returns {string}
 */
export function getLastDifficulty() {
  return localStorage.getItem(DIFFICULTY_KEY) || 'easy';
}
