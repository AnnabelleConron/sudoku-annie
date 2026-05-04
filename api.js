/** @module api */
import { generatePuzzle } from './sudoku.js';

const API_KEY = 'ML4tHCSn9Vmd0KOM73tSh5lAZMnoUbwD4Efl9RRJ';
const ENDPOINT = 'https://api.api-ninjas.com/v1/sudoku';

/**
 * Fetches a Sudoku puzzle from API Ninjas.
 * Falls back to local generation on CORS or network failure (e.g. localhost dev).
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {Promise<{puzzle: number[][], solution: number[][]}>}
 * @throws {Error} Only on HTTP error responses (not network/CORS failures).
 */
export async function fetchPuzzle(difficulty) {
  try {
    const url = `${ENDPOINT}?difficulty=${difficulty}`;
    const response = await fetch(url, {
      headers: { 'X-Api-Key': API_KEY }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      puzzle: parseBoard(data.puzzle),
      solution: parseBoard(data.solution)
    };
  } catch (err) {
    // TypeError = CORS / network failure — silently fall back to local generator
    if (err instanceof TypeError) {
      return generatePuzzle(difficulty);
    }
    throw err;
  }
}

/**
 * Parses an 81-character string into a 9×9 number array.
 * @param {string} str
 * @returns {number[][]}
 */
function parseBoard(str) {
  const board = [];
  for (let r = 0; r < 9; r++) {
    board.push([]);
    for (let c = 0; c < 9; c++) {
      board[r].push(Number(str[r * 9 + c]));
    }
  }
  return board;
}
