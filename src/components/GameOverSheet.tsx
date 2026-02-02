import React from 'react';

interface GameOverSheetProps {
  score: number;
  highScore: number;
  toppingCount: number;
  onPlayAgain: () => void;
}

const GameOverSheet: React.FC<GameOverSheetProps> = React.memo(
  function GameOverSheet({ score, highScore, toppingCount, onPlayAgain }) {
    return (
      <div className="ios-bottom-sheet">
        <div className="sheet-handle" />
        <div className="sheet-content">
          <h2 className="sheet-title">Order Up! 🍔</h2>
          <div className="score-display-large">
            <span className="score-label">Final Score</span>
            <span className="score-big">{score}</span>
          </div>
          {score >= highScore && score > 0 && (
            <div className="new-record-badge">
              <span>🏆 New Record!</span>
            </div>
          )}
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{toppingCount}</span>
              <span className="stat-label">Toppings</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{highScore}</span>
              <span className="stat-label">Best Score</span>
            </div>
          </div>
          <button className="ios-button primary" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    );
  },
);

export default GameOverSheet;
