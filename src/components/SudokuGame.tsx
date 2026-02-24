'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateSudoku, getGridInfo, SudokuSize, Difficulty, GridInfo, getConflicts } from '../utils/sudokuLogic';

export default function SudokuGame() {
  const [size, setSize] = useState<SudokuSize>(9);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [activeSize, setActiveSize] = useState<SudokuSize>(9); // Tracks the size of the current board
  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [initialGrid, setInitialGrid] = useState<boolean[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [time, setTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isWon, setIsWon] = useState(false);

  const startNewGame = useCallback(() => {
    const { puzzle, solution: sol } = generateSudoku(size, difficulty);
    setGrid(puzzle);
    setInitialGrid(puzzle.map((row) => row.map((cell) => cell !== null)));
    setSolution(sol);
    setSelectedCell(null);
    setTime(0);
    setIsGameOver(false);
    setIsWon(false);
    setActiveSize(size);
    setIsGameStarted(true);
  }, [size, difficulty]);

  // Compute conflicts dynamically using activeSize
  const conflicts = useMemo(() => {
    if (!isGameStarted) return new Set<string>();
    return getConflicts(grid, getGridInfo(activeSize));
  }, [grid, activeSize, isGameStarted]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (isGameStarted && !isGameOver && !isWon) {
      timerId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isGameStarted, isGameOver, isWon]);

  const handleCellClick = (r: number, c: number) => {
    if (!isWon) setSelectedCell([r, c]);
  };

  const getLabel = (num: number | null) => {
    if (num === null) return '';
    if (activeSize === 16) {
      const labels = '123456789ABCDEFG';
      return labels[num - 1];
    }
    return num.toString();
  };

  const handleInput = (num: number | null) => {
    if (!selectedCell || isWon) return;
    const [r, c] = selectedCell;
    if (initialGrid[r][c]) return;

    const newGrid = grid.map((row, ri) => 
      row.map((cell, ci) => (ri === r && ci === c ? num : cell))
    );
    setGrid(newGrid);

    // Check if game is complete and correct
    const isComplete = newGrid.every((row, ri) => 
      row.every((cell, ci) => cell === solution[ri][ci])
    );
    if (isComplete) {
      setIsWon(true);
      setSelectedCell(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const info = getGridInfo(activeSize);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || isWon) return;
      
      const [r, c] = selectedCell;
      if (e.key >= '1' && e.key <= '9' && activeSize >= 9) {
        handleInput(parseInt(e.key));
      } else if (e.key >= '1' && e.key <= '6' && activeSize === 6) {
        handleInput(parseInt(e.key));
      } else if (activeSize === 16 && /^[a-gA-G]$/.test(e.key)) {
        const val = e.key.toUpperCase().charCodeAt(0) - 55; // 'A' becomes 10, 'B' becomes 11, etc.
        handleInput(val);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleInput(null);
      } else if (e.key.startsWith('Arrow')) {
        let nr = r, nc = c;
        if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
        else if (e.key === 'ArrowDown') nr = Math.min(info.rows - 1, r + 1);
        else if (e.key === 'ArrowLeft') nc = Math.max(0, c - 1);
        else if (e.key === 'ArrowRight') nc = Math.min(info.cols - 1, c + 1);
        setSelectedCell([nr, nc]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isWon, activeSize, info, handleInput]);

  return (
    <div className="container">
      <h1>Teutza Sudoku</h1>
      
      <div className="controls">
        <select value={size} onChange={(e) => setSize(Number(e.target.value) as SudokuSize)}>
          <option value={6}>6 x 6</option>
          <option value={9}>9 x 9</option>
          <option value={16}>16 x 16</option>
        </select>
        
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        
        <button onClick={startNewGame}>New Game</button>
      </div>

      {isGameStarted && (
        <>
          <div className="timer">{formatTime(time)}</div>
          <div 
            className={`sudoku-grid grid-${activeSize}x${activeSize} ${isWon ? 'won' : ''}`}
            style={{
              gridTemplateColumns: `repeat(${info.cols}, 1fr)`,
            }}
          >
            {grid.map((row, r) => 
              row.map((cell, c) => {
                const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
                const isFixed = initialGrid[r][c];
                const hasConflict = conflicts.has(`${r}-${c}`);
                
                // Highlight logic
                let isRelated = false;
                let isSameNumber = false;
                if (selectedCell) {
                  const [sr, sc] = selectedCell;
                  const sameSubgrid = 
                    Math.floor(r / info.subRows) === Math.floor(sr / info.subRows) &&
                    Math.floor(c / info.subCols) === Math.floor(sc / info.subCols);
                  
                  isRelated = r === sr || c === sc || sameSubgrid;
                  
                  const selectedVal = grid[sr][sc];
                  if (selectedVal !== null && selectedVal === cell && !isSelected) {
                    isSameNumber = true;
                  }
                }

                // Special border styling for subgrids
                const style: React.CSSProperties = {};
                if ((c + 1) % info.subCols === 0 && c !== info.cols - 1) {
                  style.borderRight = '3px solid var(--border-color)';
                }
                if ((r + 1) % info.subRows === 0 && r !== info.rows - 1) {
                  style.borderBottom = '3px solid var(--border-color)';
                }

                const classes = [
                  'sudoku-cell',
                  isSelected ? 'selected' : '',
                  isFixed ? 'fixed' : 'user-input',
                  hasConflict ? 'conflict' : '',
                  !isSelected && isSameNumber ? 'same-number' : '',
                  !isSelected && !isSameNumber && isRelated ? 'related' : '',
                  isWon ? 'won-cell' : ''
                ].filter(Boolean).join(' ');

                return (
                  <div 
                    key={`${r}-${c}`}
                    className={classes}
                    onClick={() => handleCellClick(r, c)}
                    style={{
                      ...style,
                      animationDelay: isWon ? `${(r * info.cols + c) * 10}ms` : '0ms'
                    }}
                  >
                    {getLabel(cell)}
                  </div>
                );
              })
            )}
          </div>

          {!isWon && (
            <div className="controls" style={{ marginTop: '20px' }}>
              {Array.from({ length: info.maxVal }, (_, i) => i + 1).map((num) => (
                <button key={num} onClick={() => handleInput(num)} style={{ padding: '8px 15px', minWidth: '45px' }}>
                  {getLabel(num)}
                </button>
              ))}
              <button onClick={() => handleInput(null)} style={{ padding: '8px 15px' }}>DEL</button>
            </div>
          )}
          
          {isWon && (
            <h2 style={{ color: 'var(--primary-pink)', marginTop: '20px', animation: 'celebrate 1s infinite' }}>
              Congratulations! Solved in {formatTime(time)}
            </h2>
          )}
        </>
      )}
    </div>
  );
}
