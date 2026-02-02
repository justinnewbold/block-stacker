import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = React.memo(
  function StartScreen({ onStart }) {
    return (
      <div className="ios-modal start-modal">
        <div className="modal-content">
          <div className="logo-emoji">🍔</div>
          <h1 className="modal-title">Patty Stacker</h1>
          <p className="modal-subtitle">by Patty Shack</p>
          <div className="instructions-card">
            <div className="instruction-row">
              <span className="instruction-icon">👆</span>
              <span>Tap to drop each topping</span>
            </div>
            <div className="instruction-row">
              <span className="instruction-icon">🎯</span>
              <span>Stack perfectly for combo bonus</span>
            </div>
            <div className="instruction-row">
              <span className="instruction-icon">🏆</span>
              <span>Build the tallest burger!</span>
            </div>
          </div>
          <button className="ios-button primary" onClick={onStart}>
            Start Grilling
          </button>
        </div>
      </div>
    );
  },
);

export default StartScreen;
