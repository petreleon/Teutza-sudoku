export type SudokuSize = 6 | 9 | 16;
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GridInfo {
  rows: number;
  cols: number;
  subRows: number;
  subCols: number;
  maxVal: number;
}

export const getGridInfo = (size: SudokuSize): GridInfo => {
  switch (size) {
    case 6:
      return { rows: 6, cols: 6, subRows: 2, subCols: 3, maxVal: 6 };
    case 9:
      return { rows: 9, cols: 9, subRows: 3, subCols: 3, maxVal: 9 };
    case 16:
      return { rows: 16, cols: 16, subRows: 4, subCols: 4, maxVal: 16 };
  }
};

export const isValid = (
  grid: (number | null)[][],
  row: number,
  col: number,
  num: number,
  info: GridInfo
): boolean => {
  // Check row
  for (let x = 0; x < info.cols; x++) {
    if (grid[row][x] === num) return false;
  }

  // Check column
  for (let x = 0; x < info.rows; x++) {
    if (grid[x][col] === num) return false;
  }

  // Check subgrid
  const startRow = row - (row % info.subRows);
  const startCol = col - (col % info.subCols);
  for (let i = 0; i < info.subRows; i++) {
    for (let j = 0; j < info.subCols; j++) {
      if (grid[i + startRow][j + startCol] === num) return false;
    }
  }

  return true;
};

export const getConflicts = (
  grid: (number | null)[][],
  info: GridInfo
): Set<string> => {
  const conflicts = new Set<string>();

  // Check rows
  for (let r = 0; r < info.rows; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < info.cols; c++) {
      const val = grid[r][c];
      if (val !== null) {
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push(c);
      }
    }
    seen.forEach((cols, val) => {
      if (cols.length > 1) {
        cols.forEach(c => conflicts.add(`${r}-${c}`));
      }
    });
  }

  // Check columns
  for (let c = 0; c < info.cols; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < info.rows; r++) {
      const val = grid[r][c];
      if (val !== null) {
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push(r);
      }
    }
    seen.forEach((rows, val) => {
      if (rows.length > 1) {
        rows.forEach(r => conflicts.add(`${r}-${c}`));
      }
    });
  }

  // Check subgrids
  for (let rBlock = 0; rBlock < info.rows / info.subRows; rBlock++) {
    for (let cBlock = 0; cBlock < info.cols / info.subCols; cBlock++) {
      const seen = new Map<number, string[]>();
      for (let r = 0; r < info.subRows; r++) {
        for (let c = 0; c < info.subCols; c++) {
          const row = rBlock * info.subRows + r;
          const col = cBlock * info.subCols + c;
          const val = grid[row][col];
          if (val !== null) {
            if (!seen.has(val)) seen.set(val, []);
            seen.get(val)!.push(`${row}-${col}`);
          }
        }
      }
      seen.forEach((posList) => {
        if (posList.length > 1) {
          posList.forEach(pos => conflicts.add(pos));
        }
      });
    }
  }

  return conflicts;
};

export const solveSudoku = (
  grid: (number | null)[][],
  info: GridInfo
): boolean => {
  let row = -1;
  let col = -1;
  let isEmpty = false;

  for (let i = 0; i < info.rows; i++) {
    for (let j = 0; j < info.cols; j++) {
      if (grid[i][j] === null) {
        row = i;
        col = j;
        isEmpty = true;
        break;
      }
    }
    if (isEmpty) break;
  }

  if (!isEmpty) return true;

  // Shuffle numbers for different puzzles each time
  const nums = Array.from({ length: info.maxVal }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  for (const num of nums) {
    if (isValid(grid, row, col, num, info)) {
      grid[row][col] = num;
      if (solveSudoku(grid, info)) return true;
      grid[row][col] = null;
    }
  }
  return false;
};

export const countSolutions = (
  grid: (number | null)[][],
  info: GridInfo,
  limit: number = 2
): number => {
  let row = -1;
  let col = -1;
  let isEmpty = false;

  for (let i = 0; i < info.rows; i++) {
    for (let j = 0; j < info.cols; j++) {
      if (grid[i][j] === null) {
        row = i;
        col = j;
        isEmpty = true;
        break;
      }
    }
    if (isEmpty) break;
  }

  if (!isEmpty) return 1;

  let count = 0;
  for (let num = 1; num <= info.maxVal; num++) {
    if (isValid(grid, row, col, num, info)) {
      grid[row][col] = num;
      count += countSolutions(grid, info, limit);
      grid[row][col] = null;
      if (count >= limit) return count;
    }
  }
  return count;
};

export const generateSudoku = (
  size: SudokuSize,
  difficulty: Difficulty
): { puzzle: (number | null)[][]; solution: number[][] } => {
  const info = getGridInfo(size);
  const grid: (number | null)[][] = Array.from({ length: info.rows }, () =>
    Array(info.cols).fill(null)
  );

  // Fill diagonal subgrids for better randomization
  // Only fill if subRows == subCols to avoid overlap and out of bounds
  if (info.subRows === info.subCols) {
    for (let i = 0; i < info.rows; i += info.subRows) {
      fillSubgrid(grid, i, i, info);
    }
  }

  solveSudoku(grid, info);
  const solution = grid.map((row) => [...row]) as number[][];

  // Remove numbers based on difficulty while ensuring a unique solution
  const puzzle = grid.map((row) => [...row]);
  const totalCells = info.rows * info.cols;
  
  // Target number of clues remaining
  let targetClues = 0;
  if (size === 6) {
    if (difficulty === 'easy') targetClues = 20;
    else if (difficulty === 'medium') targetClues = 16;
    else targetClues = 12;
  } else if (size === 9) {
    if (difficulty === 'easy') targetClues = 38;
    else if (difficulty === 'medium') targetClues = 30;
    else targetClues = 24;
  } else { // 16x16
    if (difficulty === 'easy') targetClues = 140;
    else if (difficulty === 'medium') targetClues = 120;
    else targetClues = 100;
  }

  // Create a list of all positions and shuffle them
  const positions = [];
  for (let r = 0; r < info.rows; r++) {
    for (let c = 0; c < info.cols; c++) {
      positions.push([r, c]);
    }
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let cluesRemoved = 0;
  const maxToRemove = totalCells - targetClues;

  for (const [r, c] of positions) {
    if (cluesRemoved >= maxToRemove) break;

    const temp = puzzle[r][c];
    puzzle[r][c] = null;

    // For 16x16, counting solutions is too slow, so we skip the strict uniqueness check
    // and rely on a simpler removal approach to avoid freezing the browser.
    if (size < 16) {
      if (countSolutions(puzzle.map(row => [...row]), info) !== 1) {
        puzzle[r][c] = temp; // Revert if not unique
      } else {
        cluesRemoved++;
      }
    } else {
      // 16x16 is too large for fast brute-force uniqueness check on the main thread
      cluesRemoved++;
    }
  }

  return { puzzle, solution };
};

const fillSubgrid = (grid: (number | null)[][], row: number, col: number, info: GridInfo) => {
  let num;
  for (let i = 0; i < info.subRows; i++) {
    for (let j = 0; j < info.subCols; j++) {
      do {
        num = Math.floor(Math.random() * info.maxVal) + 1;
      } while (!isUnusedInSubgrid(grid, row, col, num, info));
      grid[row + i][col + j] = num;
    }
  }
};

const isUnusedInSubgrid = (grid: (number | null)[][], rowStart: number, colStart: number, num: number, info: GridInfo) => {
  for (let i = 0; i < info.subRows; i++) {
    for (let j = 0; j < info.subCols; j++) {
      if (grid[rowStart + i][colStart + j] === num) return false;
    }
  }
  return true;
};
