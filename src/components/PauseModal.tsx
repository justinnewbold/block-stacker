import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onQuit: () => void;
}

const PauseModal: React.FC<PauseModalProps> = React.memo(
  function PauseModal({ onResume, onQuit }) {
    return (
      <div className="ios-modal pause-modal">
        <div className="modal-content">
          <h2 className="modal-title">Paused</h2>
          <button className="ios-button primary" onClick={onResume}>
            Resume
          </button>
          <button className="ios-button secondary" onClick={onQuit}>
            Quit Game
          </button>
        </div>
      </div>
    );
  },
);

export default PauseModal;
