/** @module sudoku */

/**
 * Checks if a single cell's value matches the solution.
 * @param {number[][]} board
 * @param {number[][]} solution
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
export function isCellCorrect(board, solution, row, col) {
  return board[row][col] !== 0 && board[row][col] === solution[row][col];
}

/**
 * Checks if the board is fully and correctly filled using Sudoku rules.
 * Does not rely solely on matching the solution array.
 * @param {number[][]} board
 * @returns {boolean}
 */
export function isBoardComplete(board) {
  // Every cell must be non-zero
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return validateBoard(board);
}

/**
 * Validates board using standard Sudoku rules (no repeats per row/col/box).
 * @param {number[][]} board
 * @returns {boolean}
 */
export function validateBoard(board) {
  const hasAllDigits = (arr) => {
    const set = new Set(arr);
    return set.size === 9 && !set.has(0);
  };

  for (let i = 0; i < 9; i++) {
    // Check row
    if (!hasAllDigits(board[i])) return false;
    // Check column
    if (!hasAllDigits(board.map(r => r[i]))) return false;
    // Check 3×3 box
    const br = Math.floor(i / 3) * 3;
    const bc = (i % 3) * 3;
    const box = [];
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        box.push(board[r][c]);
      }
    }
    if (!hasAllDigits(box)) return false;
  }
  return true;
}

/**
 * Calculates completion percentage.
 * = (correctly filled cells / total originally empty cells) × 100
 * @param {number[][]} board
 * @param {number[][]} puzzle  - original puzzle (0 = empty)
 * @param {number[][]} solution
 * @returns {number} 0–100 integer
 */
export function getCompletionPercentage(board, puzzle, solution) {
  let total = 0;
  let correct = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] === 0) {
        total++;
        if (board[r][c] !== 0 && board[r][c] === solution[r][c]) {
          correct++;
        }
      }
    }
  }
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

/**
 * Creates an empty 9×9 board filled with zeros.
 * @returns {number[][]}
 */
export function emptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

/**
 * Creates an empty 9×9 notes board (each cell is an empty array).
 * @returns {Array[][]}
 */
export function emptyNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

/**
 * Creates an empty 9×9 hints board (each cell false).
 * @returns {boolean[][]}
 */
export function emptyHints() {
  return Array.from({ length: 9 }, () => Array(9).fill(false));
}

/**
 * Returns an array of cells related to [row, col]: same row, col, or 3×3 box.
 * @param {number} row
 * @param {number} col
 * @returns {{row: number, col: number}[]}
 */
export function getRelatedCells(row, col) {
  const related = new Set();
  for (let i = 0; i < 9; i++) {
    related.add(`${row},${i}`);
    related.add(`${i},${col}`);
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      related.add(`${r},${c}`);
    }
  }
  related.delete(`${row},${col}`);
  return [...related].map(k => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c };
  });
}

// ─── Local puzzle generator (used when API is unavailable) ───────────────────

// A known-valid base grid; all transformations below preserve Sudoku validity.
const BASE_GRID = [
  [1,2,3,4,5,6,7,8,9],
  [4,5,6,7,8,9,1,2,3],
  [7,8,9,1,2,3,4,5,6],
  [2,3,4,5,6,7,8,9,1],
  [5,6,7,8,9,1,2,3,4],
  [8,9,1,2,3,4,5,6,7],
  [3,4,5,6,7,8,9,1,2],
  [6,7,8,9,1,2,3,4,5],
  [9,1,2,3,4,5,6,7,8],
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeSolution() {
  let g = BASE_GRID.map(r => [...r]);

  // Remap digits
  const map = shuffle([1,2,3,4,5,6,7,8,9]);
  g = g.map(row => row.map(v => map[v - 1]));

  // Shuffle rows within each band
  for (let b = 0; b < 3; b++) {
    const perm = shuffle([0,1,2]);
    const band = [g[b*3+perm[0]], g[b*3+perm[1]], g[b*3+perm[2]]];
    [g[b*3], g[b*3+1], g[b*3+2]] = band;
  }

  // Shuffle cols within each stack
  for (let s = 0; s < 3; s++) {
    const perm = shuffle([0,1,2]);
    for (let r = 0; r < 9; r++) {
      const base = s * 3;
      const old = [g[r][base], g[r][base+1], g[r][base+2]];
      g[r][base] = old[perm[0]]; g[r][base+1] = old[perm[1]]; g[r][base+2] = old[perm[2]];
    }
  }

  // Shuffle bands
  const bp = shuffle([0,1,2]);
  g = [...g.slice(bp[0]*3, bp[0]*3+3), ...g.slice(bp[1]*3, bp[1]*3+3), ...g.slice(bp[2]*3, bp[2]*3+3)];

  // Shuffle stacks
  const sp = shuffle([0,1,2]);
  g = g.map(row => [...row.slice(sp[0]*3, sp[0]*3+3), ...row.slice(sp[1]*3, sp[1]*3+3), ...row.slice(sp[2]*3, sp[2]*3+3)]);

  return g;
}

function canPlace(g, r, c, d) {
  for (let i = 0; i < 9; i++) {
    if (g[r][i] === d || g[i][c] === d) return false;
  }
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
    if (g[br+dr][bc+dc] === d) return false;
  }
  return true;
}

/** Counts solutions up to maxSolutions (stops early). Returns count found. */
function countSolutions(g, maxSolutions = 2) {
  const grid = g.map(r => [...r]);
  let count = 0;

  function solve() {
    let bestRow = -1, bestCol = -1, bestCount = 10;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        let opts = 0;
        for (let d = 1; d <= 9; d++) if (canPlace(grid, r, c, d)) opts++;
        if (opts === 0) return;
        if (opts < bestCount) { bestCount = opts; bestRow = r; bestCol = c; }
      }
    }
    if (bestRow === -1) { count++; return; }
    for (let d = 1; d <= 9; d++) {
      if (!canPlace(grid, bestRow, bestCol, d)) continue;
      grid[bestRow][bestCol] = d;
      solve();
      grid[bestRow][bestCol] = 0;
      if (count >= maxSolutions) return;
    }
  }

  solve();
  return count;
}

const CLUES = { easy: 38, medium: 30, hard: 25 };

/**
 * Generates a locally-produced Sudoku puzzle with a unique solution.
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {{puzzle: number[][], solution: number[][]}}
 */
export function generatePuzzle(difficulty) {
  const solution = makeSolution();
  const targetClues = CLUES[difficulty] ?? 38;
  const toRemove = 81 - targetClues;
  const puzzle = solution.map(r => [...r]);
  const cells = shuffle(Array.from({length: 81}, (_, i) => [Math.floor(i/9), i%9]));
  let removed = 0;

  for (const [r, c] of cells) {
    if (removed >= toRemove) break;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[r][c] = saved;
    }
  }

  return { puzzle, solution };
}

// ─── End generator ────────────────────────────────────────────────────────────

/**
 * Counts how many times a digit appears as prefilled or correctly placed.
 * @param {number[][]} board
 * @param {number[][]} puzzle
 * @param {number[][]} solution
 * @param {number} digit
 * @returns {number}
 */
export function countDigit(board, puzzle, solution, digit) {
  let count = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] === digit) {
        count++;
      } else if (board[r][c] === digit && board[r][c] === solution[r][c]) {
        count++;
      }
    }
  }
  return count;
}
