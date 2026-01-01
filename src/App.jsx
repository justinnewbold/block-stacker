import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const GAME_WIDTH = 300;
const GAME_HEIGHT = 520;
const INITIAL_BLOCK_WIDTH = 100;
const BLOCK_HEIGHT = 22;
const SPEED_INCREMENT = 0.25;
const INITIAL_SPEED = 2.5;

// Topping types for variety
const TOPPING_TYPES = [
  { type: 'patty', height: 22, colors: ['#8B4513', '#6B3E26', '#7B3F00', '#5C4033', '#804000'] },
  { type: 'cheese', height: 8, colors: ['#FFD700', '#FFA500', '#FFCC00'] },
  { type: 'lettuce', height: 10, colors: ['#88B04B', '#7CB342', '#9CCC65'] },
  { type: 'tomato', height: 12, colors: ['#E53935', '#EF5350', '#C62828'] },
  { type: 'onion', height: 8, colors: ['#E8D5E0', '#F3E5F5', '#FCE4EC'] },
];

function App() {
  const [gameState, setGameState] = useState('start');
  const [blocks, setBlocks] = useState([]);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [fallingPieces, setFallingPieces] = useState([]);
  const [particles, setParticles] = useState([]);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pattyStackerHighScore');
    return saved ? parseInt(saved) : 0;
  });
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [cameraOffset, setCameraOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const animationRef = useRef();
  const speedRef = useRef(INITIAL_SPEED);
  const directionRef = useRef(1);
  const toppingIndexRef = useRef(0);

  // Animated score counter
  useEffect(() => {
    if (displayScore < score) {
      const timer = setTimeout(() => {
        setDisplayScore(prev => Math.min(prev + Math.ceil((score - prev) / 5), score));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [displayScore, score]);

  // Haptic feedback
  const triggerHaptic = (style = 'light') => {
    if (navigator.vibrate) {
      navigator.vibrate(style === 'heavy' ? 20 : 10);
    }
  };

  const getNextTopping = () => {
    toppingIndexRef.current++;
    // Every 3-5 blocks, add a non-patty topping
    if (toppingIndexRef.current > 2 && Math.random() > 0.6) {
      const toppingType = TOPPING_TYPES[Math.floor(Math.random() * (TOPPING_TYPES.length - 1)) + 1];
      return {
        ...toppingType,
        color: toppingType.colors[Math.floor(Math.random() * toppingType.colors.length)]
      };
    }
    const patty = TOPPING_TYPES[0];
    return {
      ...patty,
      color: patty.colors[Math.floor(Math.random() * patty.colors.length)]
    };
  };

  const createParticles = (x, y, color, count = 8) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: x + Math.random() * 60 - 30,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        color: color,
        size: Math.random() * 6 + 3,
        life: 1
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Particle animation
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - 0.03
        })).filter(p => p.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [particles.length]);

  const startGame = useCallback(() => {
    triggerHaptic('heavy');
    toppingIndexRef.current = 0;
    const patty = TOPPING_TYPES[0];
    const baseBlock = {
      x: (GAME_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
      y: GAME_HEIGHT - BLOCK_HEIGHT,
      width: INITIAL_BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      type: 'patty',
      color: patty.colors[0]
    };
    
    const nextTopping = getNextTopping();
    setBlocks([baseBlock]);
    setCurrentBlock({
      x: 0,
      y: GAME_HEIGHT - BLOCK_HEIGHT - nextTopping.height - 5,
      width: INITIAL_BLOCK_WIDTH,
      height: nextTopping.height,
      type: nextTopping.type,
      color: nextTopping.color
    });
    setFallingPieces([]);
    setParticles([]);
    setScore(0);
    setDisplayScore(0);
    setPerfectStreak(0);
    setCameraOffset(0);
    setIsPaused(false);
    speedRef.current = INITIAL_SPEED;
    directionRef.current = 1;
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (gameState !== 'playing' || !currentBlock || isPaused) return;

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
  }, [gameState, currentBlock?.y, isPaused]);

  useEffect(() => {
    if (fallingPieces.length === 0) return;
    const interval = setInterval(() => {
      setFallingPieces(prev => 
        prev.map(piece => ({ ...piece, y: piece.y + 10, rotation: piece.rotation + piece.rotationSpeed }))
            .filter(piece => piece.y < GAME_HEIGHT + 100)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [fallingPieces.length]);

  const handleTap = useCallback(() => {
    if (isPaused) return;
    if (gameState === 'start' || gameState === 'gameOver') { startGame(); return; }
    if (gameState !== 'playing' || !currentBlock) return;
    
    triggerHaptic();
    
    const lastBlock = blocks[blocks.length - 1];
    const overlapLeft = Math.max(currentBlock.x, lastBlock.x);
    const overlapRight = Math.min(currentBlock.x + currentBlock.width, lastBlock.x + lastBlock.width);
    const overlapWidth = overlapRight - overlapLeft;
    
    if (overlapWidth <= 0) {
      triggerHaptic('heavy');
      setFallingPieces(prev => [...prev, { ...currentBlock, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 10 }]);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pattyStackerHighScore', score.toString());
      }
      setGameState('gameOver');
      return;
    }
    
    const isPerfect = Math.abs(currentBlock.x - lastBlock.x) < 5 && Math.abs(currentBlock.width - lastBlock.width) < 5;
    let newBlockWidth = overlapWidth;
    let newBlockX = overlapLeft;
    
    // Calculate stack position
    const totalHeight = blocks.reduce((sum, b) => sum + b.height, 0);
    const newY = GAME_HEIGHT - totalHeight - currentBlock.height;
    
    if (isPerfect) {
      newBlockWidth = lastBlock.width;
      newBlockX = lastBlock.x;
      setPerfectStreak(prev => prev + 1);
      setShowPerfect(true);
      setTimeout(() => setShowPerfect(false), 600);
      const bonus = 20 + perfectStreak * 10;
      setScore(prev => prev + bonus);
      createParticles(newBlockX + newBlockWidth / 2, newY, '#FFD700', 12);
      triggerHaptic('heavy');
    } else {
      setPerfectStreak(0);
      setScore(prev => prev + 10);
      createParticles(newBlockX + newBlockWidth / 2, newY, currentBlock.color, 6);
      
      if (currentBlock.x < lastBlock.x) {
        setFallingPieces(prev => [...prev, { 
          x: currentBlock.x, y: currentBlock.y, 
          width: lastBlock.x - currentBlock.x, height: currentBlock.height,
          color: currentBlock.color, type: currentBlock.type,
          rotation: 0, rotationSpeed: (Math.random() - 0.5) * 15 
        }]);
      }
      if (currentBlock.x + currentBlock.width > lastBlock.x + lastBlock.width) {
        setFallingPieces(prev => [...prev, { 
          x: lastBlock.x + lastBlock.width, y: currentBlock.y, 
          width: (currentBlock.x + currentBlock.width) - (lastBlock.x + lastBlock.width), 
          height: currentBlock.height,
          color: currentBlock.color, type: currentBlock.type,
          rotation: 0, rotationSpeed: (Math.random() - 0.5) * 15 
        }]);
      }
    }
    
    const newBlock = { 
      x: newBlockX, y: newY, width: newBlockWidth, 
      height: currentBlock.height, type: currentBlock.type, color: currentBlock.color 
    };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    
    const newTotalHeight = newBlocks.reduce((sum, b) => sum + b.height, 0);
    if (newTotalHeight > GAME_HEIGHT - 150) {
      setCameraOffset(newTotalHeight - (GAME_HEIGHT - 150));
    }
    
    if (newBlockWidth < 10) {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pattyStackerHighScore', score.toString());
      }
      setGameState('gameOver');
      return;
    }
    
    speedRef.current = Math.min(INITIAL_SPEED + newBlocks.length * SPEED_INCREMENT, 10);
    
    const nextTopping = getNextTopping();
    const nextY = newY - nextTopping.height - 5;
    setCurrentBlock({
      x: directionRef.current === 1 ? 0 : GAME_WIDTH - newBlockWidth,
      y: nextY,
      width: newBlockWidth,
      height: nextTopping.height,
      type: nextTopping.type,
      color: nextTopping.color
    });
  }, [gameState, currentBlock, blocks, score, highScore, perfectStreak, isPaused, startGame]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleTap(); }
      if (e.code === 'Escape' && gameState === 'playing') { setIsPaused(p => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap, gameState]);

  // Render topping based on type
  const renderTopping = (block, zIndex, isMoving = false) => {
    const baseStyle = {
      position: 'absolute',
      left: block.x,
      bottom: GAME_HEIGHT - block.y - block.height,
      width: block.width,
      height: block.height,
      zIndex: zIndex,
      transition: isMoving ? 'none' : 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: isMoving ? 'scale(1.02)' : 'scale(1)'
    };

    switch (block.type) {
      case 'cheese':
        return (
          <div key={zIndex} style={baseStyle} className="topping cheese">
            <div className="cheese-melt" style={{ backgroundColor: block.color }}></div>
          </div>
        );
      case 'lettuce':
        return (
          <div key={zIndex} style={baseStyle} className="topping lettuce">
            <div className="lettuce-wave" style={{ backgroundColor: block.color }}></div>
          </div>
        );
      case 'tomato':
        return (
          <div key={zIndex} style={baseStyle} className="topping tomato">
            <div className="tomato-slice" style={{ backgroundColor: block.color }}></div>
          </div>
        );
      case 'onion':
        return (
          <div key={zIndex} style={baseStyle} className="topping onion">
            <div className="onion-rings" style={{ backgroundColor: block.color }}></div>
          </div>
        );
      default: // patty
        return (
          <div key={zIndex} style={baseStyle} className={`topping patty ${isMoving ? 'sizzling' : ''}`}>
            <div className="patty-top" style={{ backgroundColor: adjustColor(block.color, 15) }}>
              <div className="grill-marks">
                <div className="grill-mark"></div>
                <div className="grill-mark"></div>
                <div className="grill-mark"></div>
              </div>
            </div>
            <div className="patty-side" style={{ backgroundColor: adjustColor(block.color, -20) }}></div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {/* iOS Status Bar Space */}
      <div className="status-bar-space"></div>
      
      {/* Header */}
      <div className="header">
        <div className="score-pill">
          <span className="score-icon">🍔</span>
          <span className="score-number">{displayScore}</span>
        </div>
        <div className="header-title">Patty Stacker</div>
        <div className="high-score-pill">
          <span className="score-icon">👑</span>
          <span className="score-number">{highScore}</span>
        </div>
      </div>
      
      {/* Streak indicator */}
      {perfectStreak > 1 && gameState === 'playing' && (
        <div className="streak-badge">
          <span className="streak-flame">🔥</span>
          <span className="streak-count">{perfectStreak}x Combo</span>
        </div>
      )}
      
      {/* Game Area */}
      <div className="game-area" onClick={handleTap}>
        <div className="grill-surface"></div>
        
        <div className="game-world" style={{ transform: `translateY(${cameraOffset}px)` }}>
          {/* Stacked toppings */}
          {blocks.map((block, index) => renderTopping(block, index + 1))}
          
          {/* Current moving piece */}
          {currentBlock && gameState === 'playing' && !isPaused && 
            renderTopping(currentBlock, blocks.length + 2, true)
          }
          
          {/* Falling pieces */}
          {fallingPieces.map((piece, index) => (
            <div
              key={`fall-${index}`}
              className="falling-piece"
              style={{
                left: piece.x,
                bottom: GAME_HEIGHT - piece.y - piece.height,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                borderRadius: piece.type === 'patty' ? '6px' : '4px'
              }}
            />
          ))}
          
          {/* Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="particle"
              style={{
                left: p.x,
                bottom: GAME_HEIGHT - p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life
              }}
            />
          ))}
        </div>
        
        {/* Perfect popup */}
        {showPerfect && (
          <div className="perfect-popup">
            <span className="perfect-emoji">🔥</span>
            <span className="perfect-text">Perfect!</span>
            {perfectStreak > 1 && <span className="perfect-bonus">+{20 + (perfectStreak - 1) * 10}</span>}
          </div>
        )}
        
        {/* Start Screen */}
        {gameState === 'start' && (
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
              <button className="ios-button primary" onClick={startGame}>
                Start Grilling
              </button>
            </div>
          </div>
        )}
        
        {/* Pause Screen */}
        {isPaused && gameState === 'playing' && (
          <div className="ios-modal pause-modal">
            <div className="modal-content">
              <h2 className="modal-title">Paused</h2>
              <button className="ios-button primary" onClick={() => setIsPaused(false)}>
                Resume
              </button>
              <button className="ios-button secondary" onClick={() => setGameState('start')}>
                Quit Game
              </button>
            </div>
          </div>
        )}
        
        {/* Game Over - iOS Bottom Sheet Style */}
        {gameState === 'gameOver' && (
          <div className="ios-bottom-sheet">
            <div className="sheet-handle"></div>
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
                  <span className="stat-value">{blocks.length}</span>
                  <span className="stat-label">Toppings</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{highScore}</span>
                  <span className="stat-label">Best Score</span>
                </div>
              </div>
              <button className="ios-button primary" onClick={startGame}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Pause button */}
      {gameState === 'playing' && !isPaused && (
        <button className="pause-button" onClick={(e) => { e.stopPropagation(); setIsPaused(true); }}>
          <span>⏸</span>
        </button>
      )}
      
      {/* Home indicator space */}
      <div className="home-indicator-space"></div>
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
