import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const GAME_WIDTH = 300;
const GAME_HEIGHT = 480;
const INITIAL_BLOCK_WIDTH = 100;
const BLOCK_HEIGHT = 18;

const DIFFICULTIES = {
  easy: { speed: 2, increment: 0.15, maxSpeed: 6 },
  medium: { speed: 3, increment: 0.25, maxSpeed: 10 },
  hard: { speed: 4, increment: 0.35, maxSpeed: 14 }
};

function App() {
  const [gameState, setGameState] = useState('menu');
  const [difficulty, setDifficulty] = useState('medium');
  const [blocks, setBlocks] = useState([]);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [fallingPieces, setFallingPieces] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pattyStackerHighScore');
    return saved ? parseInt(saved) : 0;
  });
  const [combo, setCombo] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [cameraOffset, setCameraOffset] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pattiesCount, setPattiesCount] = useState(0);
  
  const animationRef = useRef();
  const speedRef = useRef(DIFFICULTIES.medium.speed);
  const directionRef = useRef(1);
  const audioContextRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sound effects using Web Audio API
  const playSound = useCallback((type) => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    switch(type) {
      case 'drop':
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      case 'perfect':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'gameOver':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;
      default:
        break;
    }
  }, [soundEnabled]);

  function getPattyColor(index) {
    const colors = [
      '#8B4513', '#6B3E26', '#7B3F00', '#5C4033', '#804000',
      '#654321', '#8B5A2B', '#6F4E37', '#7B5544', '#5D3A1A',
    ];
    return colors[index % colors.length];
  }

  const startGame = useCallback(() => {
    const settings = DIFFICULTIES[difficulty];
    const baseBlock = {
      x: (GAME_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
      y: GAME_HEIGHT - BLOCK_HEIGHT,
      width: INITIAL_BLOCK_WIDTH,
      color: getPattyColor(0)
    };
    
    setBlocks([baseBlock]);
    setCurrentBlock({
      x: 0,
      y: GAME_HEIGHT - BLOCK_HEIGHT * 2,
      width: INITIAL_BLOCK_WIDTH,
      color: getPattyColor(1)
    });
    setFallingPieces([]);
    setScore(0);
    setCombo(0);
    setCameraOffset(0);
    setPattiesCount(1);
    speedRef.current = settings.speed;
    directionRef.current = 1;
    setGameState('playing');
  }, [difficulty]);

  useEffect(() => {
    if (gameState !== 'playing' || !currentBlock) return;

    const animate = () => {
      setCurrentBlock(prev => {
        if (!prev) return prev;
        let newX = prev.x + speedRef.current * directionRef.current;
        if (newX <= 0) { newX = 0; directionRef.current = 1; }
        else if (newX + prev.width >= GAME_WIDTH) { newX = GAME_WIDTH - prev.width; directionRef.current = -1; }
        return { ...prev, x: newX };
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [gameState, currentBlock?.y]);

  useEffect(() => {
    if (fallingPieces.length === 0) return;
    const interval = setInterval(() => {
      setFallingPieces(prev => 
        prev.map(piece => ({ ...piece, y: piece.y + 8, rotation: piece.rotation + piece.rotationSpeed }))
            .filter(piece => piece.y < GAME_HEIGHT + 100)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [fallingPieces.length]);

  const handleTap = useCallback(() => {
    if (gameState === 'menu') return;
    if (gameState === 'gameOver') { setGameState('menu'); return; }
    if (gameState !== 'playing' || !currentBlock) return;
    
    const lastBlock = blocks[blocks.length - 1];
    const overlapLeft = Math.max(currentBlock.x, lastBlock.x);
    const overlapRight = Math.min(currentBlock.x + currentBlock.width, lastBlock.x + lastBlock.width);
    const overlapWidth = overlapRight - overlapLeft;
    
    if (overlapWidth <= 0) {
      playSound('gameOver');
      setFallingPieces(prev => [...prev, { ...currentBlock, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 10 }]);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pattyStackerHighScore', score.toString());
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      setGameState('gameOver');
      return;
    }
    
    const isPerfect = Math.abs(currentBlock.x - lastBlock.x) < 5 && Math.abs(currentBlock.width - lastBlock.width) < 5;
    let newBlockWidth = overlapWidth;
    let newBlockX = overlapLeft;
    let pointsEarned = 10;
    
    if (isPerfect) {
      playSound('perfect');
      newBlockWidth = lastBlock.width;
      newBlockX = lastBlock.x;
      setCombo(prev => prev + 1);
      setShowPerfect(true);
      setTimeout(() => setShowPerfect(false), 600);
      pointsEarned = 20 + (combo * 10); // Combo multiplier
    } else {
      playSound('drop');
      setCombo(0);
      if (currentBlock.x < lastBlock.x) {
        setFallingPieces(prev => [...prev, { x: currentBlock.x, y: currentBlock.y, width: lastBlock.x - currentBlock.x, color: currentBlock.color, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 15 }]);
      }
      if (currentBlock.x + currentBlock.width > lastBlock.x + lastBlock.width) {
        setFallingPieces(prev => [...prev, { x: lastBlock.x + lastBlock.width, y: currentBlock.y, width: (currentBlock.x + currentBlock.width) - (lastBlock.x + lastBlock.width), color: currentBlock.color, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 15 }]);
      }
    }
    
    setScore(prev => prev + pointsEarned);
    
    const newBlock = { x: newBlockX, y: currentBlock.y, width: newBlockWidth, color: currentBlock.color };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    setPattiesCount(newBlocks.length);
    setCameraOffset(Math.max(0, (newBlocks.length - 20) * BLOCK_HEIGHT));
    
    if (newBlockWidth < 10) {
      playSound('gameOver');
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pattyStackerHighScore', score.toString());
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      setGameState('gameOver');
      return;
    }
    
    const settings = DIFFICULTIES[difficulty];
    speedRef.current = Math.min(settings.speed + blocks.length * settings.increment, settings.maxSpeed);
    
    setCurrentBlock({
      x: directionRef.current === 1 ? 0 : GAME_WIDTH - newBlockWidth,
      y: currentBlock.y - BLOCK_HEIGHT,
      width: newBlockWidth,
      color: getPattyColor(newBlocks.length)
    });
  }, [gameState, currentBlock, blocks, score, highScore, combo, difficulty, playSound]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { 
        e.preventDefault(); 
        if (gameState === 'menu') startGame();
        else handleTap(); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap, gameState, startGame]);

  const shareScore = () => {
    const text = `🍔 I stacked ${pattiesCount} patties and scored ${score} points in Patty Stacker! Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: 'Patty Stacker', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Score copied to clipboard!');
    }
  };

  // Patty Component
  const Patty = ({ block, zIndex, isMoving }) => (
    <div className={`patty ${isMoving ? 'patty-sizzle' : ''}`}
      style={{ left: block.x, bottom: GAME_HEIGHT - block.y - BLOCK_HEIGHT, width: block.width, height: BLOCK_HEIGHT, zIndex }}>
      <div className="patty-top" style={{ backgroundColor: adjustColor(block.color, 20) }}>
        <div className="grill-marks">
          <div className="grill-mark"></div>
          <div className="grill-mark"></div>
          <div className="grill-mark"></div>
        </div>
      </div>
      <div className="patty-side" style={{ backgroundColor: adjustColor(block.color, -15) }}></div>
    </div>
  );

  // Confetti Component
  const Confetti = () => (
    <div className="confetti-container">
      {[...Array(50)].map((_, i) => (
        <div key={i} className="confetti" style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ['#ffc107', '#ff6b35', '#dc3545', '#28a745', '#007bff'][Math.floor(Math.random() * 5)],
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${2 + Math.random() * 2}s`
        }} />
      ))}
    </div>
  );

  return (
    <div className="app-container">
      {/* iOS Status Bar Safe Area */}
      <div className="safe-area-top"></div>
      
      {/* Header */}
      <header className="ios-header">
        <div className="header-content">
          <div className="score-pill">
            <span className="score-icon">🍔</span>
            <span className="score-num">{score}</span>
          </div>
          {gameState === 'playing' && combo > 0 && (
            <div className="combo-pill">
              <span className="combo-fire">🔥</span>
              <span className="combo-num">x{combo + 1}</span>
            </div>
          )}
          <button className="settings-btn" onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Game Area */}
      <main className="game-wrapper" onClick={gameState === 'playing' ? handleTap : undefined}>
        <div className="game-area">
          <div className="grill-surface"></div>
          <div className="game-world" style={{ transform: `translateY(${cameraOffset}px)` }}>
            {blocks.map((block, index) => (
              <Patty key={index} block={block} zIndex={index + 1} isMoving={false} />
            ))}
            {currentBlock && gameState === 'playing' && (
              <Patty block={currentBlock} zIndex={blocks.length + 2} isMoving={true} />
            )}
            {fallingPieces.map((piece, index) => (
              <div key={`fall-${index}`} className="falling-patty"
                style={{ left: piece.x, bottom: GAME_HEIGHT - piece.y - BLOCK_HEIGHT, width: piece.width, height: BLOCK_HEIGHT, backgroundColor: piece.color, transform: `rotate(${piece.rotation}deg)` }} />
            ))}
          </div>
          
          {/* Perfect Indicator */}
          {showPerfect && (
            <div className="perfect-indicator">
              <span className="perfect-emoji">🔥</span>
              <span className="perfect-text">PERFECT!</span>
              {combo > 0 && <span className="perfect-combo">+{20 + combo * 10}</span>}
            </div>
          )}
        </div>
        
        {/* Patty Counter */}
        {gameState === 'playing' && (
          <div className="patty-counter">
            <span>{pattiesCount}</span>
            <small>patties</small>
          </div>
        )}
      </main>

      {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="ios-modal menu-modal">
          <div className="modal-content">
            <div className="menu-logo">🍔</div>
            <h1 className="menu-title">Patty Stacker</h1>
            <p className="menu-subtitle">by Patty Shack</p>
            
            <div className="difficulty-selector">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} className={`diff-btn ${difficulty === d ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setDifficulty(d); }}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            
            <button className="play-btn" onClick={startGame}>
              <span>Start Grilling</span>
              <span className="btn-icon">→</span>
            </button>
            
            <div className="high-score-display">
              <span className="trophy">🏆</span>
              <span>Best: {highScore}</span>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Bottom Sheet */}
      {gameState === 'gameOver' && (
        <div className="ios-bottom-sheet">
          {showConfetti && <Confetti />}
          <div className="sheet-handle"></div>
          <div className="sheet-content">
            <h2 className="sheet-title">Order Up! 🍔</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{score}</span>
                <span className="stat-label">Score</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{pattiesCount}</span>
                <span className="stat-label">Patties</span>
              </div>
            </div>
            
            {score >= highScore && score > 0 && (
              <div className="new-record-badge">
                <span>🏆 New Record!</span>
              </div>
            )}
            
            <div className="sheet-actions">
              <button className="action-btn primary" onClick={startGame}>
                Play Again
              </button>
              <button className="action-btn secondary" onClick={shareScore}>
                Share Score
              </button>
            </div>
            
            <button className="menu-link" onClick={() => setGameState('menu')}>
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="ios-modal settings-modal" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Settings</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="settings-list">
              <div className="setting-row">
                <span>Sound Effects</span>
                <button className={`ios-toggle ${soundEnabled ? 'on' : ''}`}
                  onClick={() => setSoundEnabled(!soundEnabled)}>
                  <div className="toggle-knob"></div>
                </button>
              </div>
              <div className="setting-row">
                <span>High Score</span>
                <span className="setting-value">{highScore}</span>
              </div>
            </div>
            <button className="reset-btn" onClick={() => {
              localStorage.removeItem('pattyStackerHighScore');
              setHighScore(0);
            }}>Reset High Score</button>
          </div>
        </div>
      )}
      
      {/* Tap hint */}
      {gameState === 'playing' && blocks.length === 1 && (
        <div className="tap-hint">
          <span>Tap to drop!</span>
        </div>
      )}
    </div>
  );
}

function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

export default App;
