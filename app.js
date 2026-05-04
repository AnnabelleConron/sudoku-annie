/** @module app */
import { fetchPuzzle } from './api.js';
import { saveGame, loadGame, loadAllGames, deleteGame, setActiveGameId, getActiveGameId, saveLastDifficulty, getLastDifficulty } from './storage.js';
import { Timer, formatTime } from './timer.js';
import { isCellCorrect, isBoardComplete, getCompletionPercentage, emptyBoard, emptyNotes, emptyHints, getRelatedCells, countDigit } from './sudoku.js';

// ─── State ────────────────────────────────────────────────────────────────────

let gameState = null;         // current loaded game object
let selectedCell = null;      // {row, col}
let notesMode = false;
let errorCheckOn = true;
let timer = null;

// Tracks which cells have already been counted as errors (for error count logic)
let erroredCells = new Set();

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const btnStart = document.getElementById('btn-start');
const errorBanner = document.getElementById('error-banner');
const btnRetry = document.getElementById('btn-retry');
const homeDiffBtns = document.querySelectorAll('#home-difficulty .diff-btn');
const gamesList = document.getElementById('games-list');
const timerDisplay = document.getElementById('timer-display');
const btnPause = document.getElementById('btn-pause');
const btnBack = document.getElementById('btn-back');
const metaDifficulty = document.getElementById('meta-difficulty');
const errorCheckToggle = document.getElementById('error-check-toggle');
const sudokuGrid = document.getElementById('sudoku-grid');
const actionBtns = {
  undo: document.getElementById('btn-undo'),
  erase: document.getElementById('btn-erase'),
  notes: document.getElementById('btn-notes'),
  hint: document.getElementById('btn-hint'),
};
const numBtns = document.querySelectorAll('.num-btn');

// Modals
const pauseModal = document.getElementById('pause-modal');
const pauseTime = document.getElementById('pause-time');
const btnResume = document.getElementById('btn-resume');
const btnLeaveGame = document.getElementById('btn-leave-game');

const completionModal = document.getElementById('completion-modal');
const completionDiff = document.getElementById('completion-diff');
const completionTime = document.getElementById('completion-time');
const completionErrors = document.getElementById('completion-errors');
const btnCompletionNewGame = document.getElementById('btn-completion-new-game');
const btnCompletionHome = document.getElementById('btn-completion-home');

const newGameModal = document.getElementById('new-game-modal');
const modalDiffBtns = document.querySelectorAll('#modal-difficulty .diff-btn');
const btnModalStart = document.getElementById('btn-modal-start');
const btnModalCancel = document.getElementById('btn-modal-cancel');

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  // Restore last difficulty on home screen
  const lastDiff = getLastDifficulty();
  homeDiffBtns.forEach(b => {
    b.classList.toggle('selected', b.dataset.diff === lastDiff);
  });

  buildGrid();
  attachEvents();
  showHome();
}

// ─── Screen navigation ────────────────────────────────────────────────────────

function showHome() {
  homeScreen.classList.add('active');
  gameScreen.classList.remove('active');
  renderOngoingGames();
}

function showGame() {
  homeScreen.classList.remove('active');
  gameScreen.classList.add('active');
}

// ─── Grid construction ────────────────────────────────────────────────────────

function buildGrid() {
  sudokuGrid.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('pointerdown', () => handleCellTap(r, c));
      sudokuGrid.appendChild(cell);
    }
  }
}

/** Returns the DOM cell element at [row, col]. */
function getCell(row, col) {
  return sudokuGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// ─── Render board ─────────────────────────────────────────────────────────────

function renderBoard() {
  if (!gameState) return;
  const { puzzle, solution, board, notes, hints } = gameState;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = getCell(r, c);
      const val = board[r][c];
      const isPrefilled = puzzle[r][c] !== 0;
      const isHint = hints[r][c];
      const cellNotes = notes[r][c];

      // Clear all state classes
      cell.classList.remove('prefilled', 'user-correct', 'user-incorrect', 'user-input', 'hint-cell',
        'selected', 'related', 'same-number');
      cell.innerHTML = '';

      if (isPrefilled) {
        cell.classList.add('prefilled');
        cell.textContent = val;
      } else if (isHint) {
        cell.classList.add('hint-cell');
        cell.textContent = val;
      } else if (val !== 0) {
        if (errorCheckOn) {
          if (val === solution[r][c]) {
            cell.classList.add('user-correct');
          } else {
            cell.classList.add('user-incorrect');
          }
        } else {
          cell.classList.add('user-input');
        }
        cell.textContent = val;
      } else if (cellNotes.length > 0) {
        renderNotes(cell, cellNotes);
      }
    }
  }

  applySelectionHighlight();
  updateNumpad();
  updateActionButtons();
}

function renderNotes(cellEl, activeNotes) {
  const grid = document.createElement('div');
  grid.className = 'notes-grid';
  for (let n = 1; n <= 9; n++) {
    const span = document.createElement('span');
    span.className = 'note-digit' + (activeNotes.includes(n) ? ' active' : '');
    span.textContent = activeNotes.includes(n) ? n : '';
    grid.appendChild(span);
  }
  cellEl.appendChild(grid);
}

function applySelectionHighlight() {
  if (!gameState) return;
  // Clear all highlight classes first
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = getCell(r, c);
      cell.classList.remove('selected', 'related', 'same-number');
    }
  }

  if (!selectedCell) return;

  const { row, col } = selectedCell;
  const val = gameState.board[row][col];

  getCell(row, col).classList.add('selected');

  // Highlight related cells
  getRelatedCells(row, col).forEach(({ row: r, col: c }) => {
    getCell(r, c).classList.add('related');
  });

  // Highlight same-number cells
  if (val !== 0) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if ((r !== row || c !== col) && gameState.board[r][c] === val) {
          const el = getCell(r, c);
          el.classList.remove('related');
          el.classList.add('same-number');
        }
      }
    }
  }
}

// ─── Cell interaction ─────────────────────────────────────────────────────────

function handleCellTap(row, col) {
  if (!gameState) return;
  selectedCell = { row, col };
  applySelectionHighlight();
  updateActionButtons();
  updateNumpad();
}

function isCellEditable(row, col) {
  if (!gameState) return false;
  const { puzzle, solution, board, hints } = gameState;
  if (puzzle[row][col] !== 0) return false;  // prefilled
  if (hints[row][col]) return false;          // hint-revealed
  if (errorCheckOn && board[row][col] !== 0 && board[row][col] === solution[row][col]) {
    return false;  // locked correct
  }
  return true;
}

// ─── Number input ──────────────────────────────────────────────────────────────

function handleNumInput(digit) {
  if (!selectedCell || !gameState) return;
  const { row, col } = selectedCell;
  if (!isCellEditable(row, col)) return;

  if (notesMode) {
    handleNoteInput(row, col, digit);
    return;
  }

  const currentVal = gameState.board[row][col];
  if (currentVal === digit) return;  // same number, do nothing

  // Push to undo stack
  pushUndo(row, col, currentVal, [...gameState.notes[row][col]], false);

  // Track errors: only count first wrong entry per cell
  const cellKey = `${row},${col}`;
  if (digit !== gameState.solution[row][col]) {
    if (!erroredCells.has(cellKey)) {
      erroredCells.add(cellKey);
      gameState.errorCount++;
    }
  } else {
    // Correct entry clears the error tracking for this cell
    erroredCells.delete(cellKey);
  }

  gameState.board[row][col] = digit;
  gameState.notes[row][col] = [];  // clear notes on confirmed entry

  saveGame(gameState);
  renderBoard();

  // Check completion
  if (isBoardComplete(gameState.board)) {
    setTimeout(showCompletion, 600);
  }
}

function handleNoteInput(row, col, digit) {
  const notes = gameState.notes[row][col];
  const prevNotes = [...notes];
  const prevVal = gameState.board[row][col];

  // Can only add notes to empty cells
  if (gameState.board[row][col] !== 0) return;

  pushUndo(row, col, prevVal, prevNotes, false);

  const idx = notes.indexOf(digit);
  if (idx === -1) {
    notes.push(digit);
    notes.sort((a, b) => a - b);
  } else {
    notes.splice(idx, 1);
  }

  saveGame(gameState);
  renderBoard();
}

// ─── Erase ────────────────────────────────────────────────────────────────────

function handleErase() {
  if (!selectedCell || !gameState) return;
  const { row, col } = selectedCell;
  if (!isCellEditable(row, col)) return;

  const val = gameState.board[row][col];
  const notes = gameState.notes[row][col];

  if (notes.length > 0) {
    pushUndo(row, col, val, [...notes], false);
    gameState.notes[row][col] = [];
  } else if (val !== 0) {
    pushUndo(row, col, val, [], false);
    gameState.board[row][col] = 0;
    erroredCells.delete(`${row},${col}`);
  } else {
    return;
  }

  saveGame(gameState);
  renderBoard();
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

function pushUndo(row, col, prevValue, prevNotes, isHint) {
  const stack = gameState.undoStack;
  stack.push({ row, col, prevValue, prevNotes, isHint });
  if (stack.length > 20) stack.shift();
}

function handleUndo() {
  if (!gameState || gameState.undoStack.length === 0) return;

  const last = gameState.undoStack[gameState.undoStack.length - 1];
  if (last.isHint) return;  // can't undo hints

  gameState.undoStack.pop();
  gameState.board[last.row][last.col] = last.prevValue;
  gameState.notes[last.row][last.col] = last.prevNotes;

  saveGame(gameState);
  renderBoard();
}

// ─── Hint ─────────────────────────────────────────────────────────────────────

function handleHint() {
  if (!selectedCell || !gameState) return;
  if (gameState.hintsRemaining <= 0) return;

  const { row, col } = selectedCell;
  const { puzzle, solution, board, hints } = gameState;

  if (puzzle[row][col] !== 0) return;
  if (hints[row][col]) return;
  if (errorCheckOn && board[row][col] === solution[row][col] && board[row][col] !== 0) return;

  // Hints can't be undone, but we still push a marker
  pushUndo(row, col, board[row][col], [...gameState.notes[row][col]], true);

  gameState.board[row][col] = solution[row][col];
  gameState.notes[row][col] = [];
  gameState.hints[row][col] = true;
  gameState.hintsRemaining--;
  erroredCells.delete(`${row},${col}`);

  saveGame(gameState);
  renderBoard();

  if (isBoardComplete(gameState.board)) {
    setTimeout(showCompletion, 600);
  }
}

// ─── Notes mode ───────────────────────────────────────────────────────────────

function toggleNotes() {
  notesMode = !notesMode;
  actionBtns.notes.classList.toggle('notes-active', notesMode);
  actionBtns.notes.querySelector('.action-label').textContent = notesMode ? 'NOTES ON' : 'NOTES';
}

// ─── Update UI elements ───────────────────────────────────────────────────────

function updateNumpad() {
  if (!gameState) return;
  numBtns.forEach(btn => {
    const d = Number(btn.dataset.digit);
    const count = countDigit(gameState.board, gameState.puzzle, gameState.solution, d);
    btn.classList.toggle('exhausted', count >= 9);
  });
}

function updateActionButtons() {
  if (!gameState) return;

  // Undo: disabled if stack empty or top entry is a hint
  const stack = gameState.undoStack;
  const topIsHint = stack.length > 0 && stack[stack.length - 1].isHint;
  actionBtns.undo.classList.toggle('disabled', stack.length === 0 || topIsHint);

  // Hint button label
  actionBtns.hint.querySelector('.action-label').textContent = `HINT (${gameState.hintsRemaining})`;
  actionBtns.hint.classList.toggle('disabled', gameState.hintsRemaining <= 0);
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function initTimer() {
  if (timer) {
    timer.stop();
  }
  timer = new Timer((elapsed) => {
    timerDisplay.textContent = formatTime(elapsed);
    if (gameState) {
      gameState.elapsedSeconds = elapsed;
      saveGame(gameState);
    }
  });
  timer.elapsed = gameState.elapsedSeconds;
  timerDisplay.textContent = formatTime(gameState.elapsedSeconds);
  timer.start();
}

// ─── Start new game ───────────────────────────────────────────────────────────

let pendingDifficulty = 'easy';

/**
 * @param {string} [forceDiff] - If provided, pre-select this difficulty in the modal.
 */
function openNewGameModal(forceDiff) {
  const currentDiff = forceDiff || getSelectedHomeDiff();
  pendingDifficulty = currentDiff;
  modalDiffBtns.forEach(b => b.classList.toggle('selected', b.dataset.diff === currentDiff));
  newGameModal.classList.add('visible');
  btnModalStart.focus();
}

function getSelectedHomeDiff() {
  for (const b of homeDiffBtns) {
    if (b.classList.contains('selected')) return b.dataset.diff;
  }
  return 'easy';
}

async function startNewGame(difficulty) {
  errorBanner.classList.remove('visible');

  // Navigate to home so the loading state and any error banner are visible
  showHome();
  btnStart.disabled = true;
  btnStart.innerHTML = '<span class="spinner"></span>Loading…';

  try {
    const { puzzle, solution } = await fetchPuzzle(difficulty);
    const id = String(Date.now());
    gameState = {
      id,
      difficulty,
      puzzle,
      solution,
      board: JSON.parse(JSON.stringify(puzzle)),  // start board = puzzle
      notes: emptyNotes(),
      hints: emptyHints(),
      elapsedSeconds: 0,
      errorCount: 0,
      hintsRemaining: 3,
      startedAt: new Date().toISOString(),
      completedAt: null,
      undoStack: []
    };
    erroredCells = new Set();
    selectedCell = null;
    notesMode = false;
    errorCheckOn = true;
    errorCheckToggle.classList.add('on');

    saveGame(gameState);
    setActiveGameId(id);
    saveLastDifficulty(difficulty);

    metaDifficulty.textContent = difficulty.toUpperCase();
    showGame();
    initTimer();
    renderBoard();
  } catch (err) {
    errorBanner.classList.add('visible');
  } finally {
    btnStart.disabled = false;
    btnStart.innerHTML = 'Start New Game';
  }
}

// ─── Resume game ──────────────────────────────────────────────────────────────

function resumeGame(id) {
  const game = loadGame(id);
  if (!game) return;
  gameState = game;
  erroredCells = new Set();
  selectedCell = null;
  notesMode = false;
  errorCheckOn = true;
  errorCheckToggle.classList.add('on');

  setActiveGameId(id);
  metaDifficulty.textContent = game.difficulty.toUpperCase();
  showGame();
  initTimer();
  renderBoard();
}

// ─── Completion ───────────────────────────────────────────────────────────────

function showCompletion() {
  if (!gameState) return;
  timer.pause();
  gameState.completedAt = new Date().toISOString();
  saveGame(gameState);

  completionDiff.textContent = gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1);
  completionTime.textContent = formatTime(gameState.elapsedSeconds);
  completionErrors.textContent = gameState.errorCount;

  completionModal.classList.add('visible');
  btnCompletionNewGame.focus();
}

// ─── Pause ────────────────────────────────────────────────────────────────────

function showPauseModal() {
  if (!timer || !gameState) return;
  timer.pause();
  pauseTime.textContent = formatTime(gameState.elapsedSeconds);
  pauseModal.classList.add('visible');
  btnResume.focus();
}

function resumeFromPause() {
  pauseModal.classList.remove('visible');
  if (timer) timer.start();
}

// ─── Ongoing games list ───────────────────────────────────────────────────────

function renderOngoingGames() {
  const games = loadAllGames();
  gamesList.innerHTML = '';

  if (games.length === 0) {
    gamesList.innerHTML = '<div class="empty-state">No ongoing games</div>';
    return;
  }

  games.forEach(game => {
    const pct = getCompletionPercentage(game.board, game.puzzle, game.solution);
    const wrapper = document.createElement('div');
    wrapper.className = 'game-item-wrapper';

    const dateStr = formatDate(game.startedAt);
    wrapper.innerHTML = `
      <div class="game-item" data-id="${game.id}">
        <div class="game-item-info">
          <div class="game-item-top">
            <span class="game-diff-badge">${game.difficulty}</span>
            <span class="game-pct">${pct}% complete</span>
          </div>
          <div class="game-item-bottom">
            <span class="game-time">${formatTime(game.elapsedSeconds)}</span>
            <span class="game-date">${dateStr}</span>
          </div>
        </div>
        <button class="btn-delete" data-id="${game.id}" aria-label="Delete game">Delete</button>
      </div>
      <div class="delete-confirm" id="del-confirm-${game.id}">
        Delete this game?
        <button class="btn-delete-yes" data-id="${game.id}">Yes</button>
        <button class="btn-delete-cancel" data-id="${game.id}">Cancel</button>
      </div>
    `;
    gamesList.appendChild(wrapper);

    // Tap on game item → resume
    wrapper.querySelector('.game-item').addEventListener('pointerdown', (e) => {
      if (e.target.closest('.btn-delete')) return;
      resumeGame(game.id);
    });

    // Delete button
    wrapper.querySelector('.btn-delete').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const confirmEl = document.getElementById(`del-confirm-${game.id}`);
      confirmEl.classList.toggle('visible');
    });

    // Yes confirm
    wrapper.querySelector('.btn-delete-yes').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      deleteGame(game.id);
      renderOngoingGames();
    });

    // Cancel
    wrapper.querySelector('.btn-delete-cancel').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      document.getElementById(`del-confirm-${game.id}`).classList.remove('visible');
    });
  });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Error check toggle ────────────────────────────────────────────────────────

function toggleErrorCheck() {
  errorCheckOn = !errorCheckOn;
  errorCheckToggle.classList.toggle('on', errorCheckOn);
  renderBoard();
}

// ─── Event binding ─────────────────────────────────────────────────────────────

function attachEvents() {
  // Home: Start New Game
  btnStart.addEventListener('pointerdown', () => {
    openNewGameModal();
  });

  // Home: Retry on error banner
  btnRetry.addEventListener('pointerdown', () => {
    startNewGame(pendingDifficulty);
  });

  // Home difficulty selector
  homeDiffBtns.forEach(btn => {
    btn.addEventListener('pointerdown', () => {
      homeDiffBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      saveLastDifficulty(btn.dataset.diff);
    });
  });

  // Game: Back
  btnBack.addEventListener('pointerdown', () => {
    if (timer) timer.pause();
    if (gameState) saveGame(gameState);
    showHome();
  });

  // Game: Pause
  btnPause.addEventListener('pointerdown', showPauseModal);

  // Error check toggle
  errorCheckToggle.addEventListener('pointerdown', toggleErrorCheck);

  // Action buttons
  actionBtns.undo.addEventListener('pointerdown', handleUndo);
  actionBtns.erase.addEventListener('pointerdown', handleErase);
  actionBtns.notes.addEventListener('pointerdown', toggleNotes);
  actionBtns.hint.addEventListener('pointerdown', handleHint);

  // Numpad
  numBtns.forEach(btn => {
    btn.addEventListener('pointerdown', () => {
      const d = Number(btn.dataset.digit);
      if (btn.classList.contains('exhausted')) return;
      handleNumInput(d);
    });
  });

  // Pause modal
  btnResume.addEventListener('pointerdown', resumeFromPause);
  btnLeaveGame.addEventListener('pointerdown', () => {
    pauseModal.classList.remove('visible');
    if (gameState) saveGame(gameState);
    if (timer) timer.pause();
    showHome();
  });
  pauseModal.addEventListener('pointerdown', (e) => {
    if (e.target === pauseModal) resumeFromPause();
  });

  // Completion modal
  btnCompletionNewGame.addEventListener('pointerdown', () => {
    completionModal.classList.remove('visible');
    const diff = gameState ? gameState.difficulty : 'easy';
    openNewGameModal(diff);
  });
  btnCompletionHome.addEventListener('pointerdown', () => {
    completionModal.classList.remove('visible');
    showHome();
  });

  // New game modal
  modalDiffBtns.forEach(btn => {
    btn.addEventListener('pointerdown', () => {
      modalDiffBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      pendingDifficulty = btn.dataset.diff;
    });
  });
  btnModalStart.addEventListener('pointerdown', () => {
    newGameModal.classList.remove('visible');  // close modal; startNewGame handles screen nav
    startNewGame(pendingDifficulty);
  });
  btnModalCancel.addEventListener('pointerdown', () => {
    newGameModal.classList.remove('visible');
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();
