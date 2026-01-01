import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const GAME_WIDTH = 300;
const GAME_HEIGHT = 500;
const INITIAL_BLOCK_WIDTH = 100;
const BLOCK_HEIGHT = 20;
const SPEED_INCREMENT = 0.3;
const INITIAL_SPEED = 3;

function App() {
  const [gameState, setGameState] = useState('start');
  const [blocks, setBlocks] = useState([]);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [fallingPieces, setFallingPieces] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pattyStackerHighScore');
    return saved ? parseInt(saved) : 0;
  });
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [cameraOffset, setCameraOffset] = useState(0);
  
  const animationRef = useRef();
  const speedRef = useRef(INITIAL_SPEED);
  const directionRef = useRef(1);

  const startGame = useCallback(() => {
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
    setPerfectStreak(0);
    setCameraOffset(0);
    speedRef.current = INITIAL_SPEED;
    directionRef.current = 1;
    setGameState('playing');
  }, []);

  // Patty colors - various cooked beef tones
  function getPattyColor(index) {
    const colors = [
      '#8B4513', // Saddle brown
      '#6B3E26', // Dark brown
      '#7B3F00', // Chocolate
      '#5C4033', // Dark liver
      '#804000', // Brown
      '#654321', // Dark brown
      '#8B5A2B', // Tan
      '#6F4E37', // Coffee
      '#7B5544', // Medium brown
      '#5D3A1A', // Seal brown
    ];
    return colors[index % colors.length];
  }

  useEffect(() => {
    if (gameState !== 'playing' || !currentBlock) return;

    const animate = () => {
      setCurrentBlock(prev => {
        if (!prev) return prev;
        
        let newX = prev.x + speedRef.current * directionRef.current;
        
        if (newX <= 0) {
          newX = 0;
          directionRef.current = 1;
        } else if (newX + prev.width >= GAME_WIDTH) {
          newX = GAME_WIDTH - prev.width;
          directionRef.current = -1;
        }
        
        return { ...prev, x: newX };
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, currentBlock?.y]);

  useEffect(() => {
    if (fallingPieces.length === 0) return;
    
    const interval = setInterval(() => {
      setFallingPieces(prev => 
        prev
          .map(piece => ({
            ...piece,
            y: piece.y + 8,
            rotation: piece.rotation + piece.rotationSpeed
          }))
          .filter(piece => piece.y < GAME_HEIGHT + 100)
      );
    }, 16);
    
    return () => clearInterval(interval);
  }, [fallingPieces.length]);

  const handleTap = useCallback(() => {
    if (gameState === 'start') {
      startGame();
      return;
    }
    
    if (gameState === 'gameOver') {
      startGame();
      return;
    }
    
    if (gameState !== 'playing' || !currentBlock) return;
    
    const lastBlock = blocks[blocks.length - 1];
    
    const overlapLeft = Math.max(currentBlock.x, lastBlock.x);
    const overlapRight = Math.min(currentBlock.x + currentBlock.width, lastBlock.x + lastBlock.width);
    const overlapWidth = overlapRight - overlapLeft;
    
    if (overlapWidth <= 0) {
      setFallingPieces(prev => [...prev, {
        ...currentBlock,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 10
      }]);
      
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pattyStackerHighScore', score.toString());
      }
      
      setGameState('gameOver');
      return;
    }
    
    const isPerfect = Math.abs(currentBlock.x - lastBlock.x) < 5 && 
                      Math.abs(currentBlock.width - lastBlock.width) < 5;
    
    let newBlockWidth = overlapWidth;
    let newBlockX = overlapLeft;
    
    if (isPerfect) {
      newBlockWidth = lastBlock.width;
      newBlockX = lastBlock.x;
      setPerfectStreak(prev => prev + 1);
      setShowPerfect(true);
      setTimeout(() => setShowPerfect(false), 500);
      setScore(prev => prev + 20 + perfectStreak * 5);
    } else {
      setPerfectStreak(0);
      setScore(prev => prev + 10);
      
      if (currentBlock.x < lastBlock.x) {
        setFallingPieces(prev => [...prev, {
          x: currentBlock.x,
          y: currentBlock.y,
          width: lastBlock.x - currentBlock.x,
          color: currentBlock.color,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 15
        }]);
      }
      if (currentBlock.x + currentBlock.width > lastBlock.x + lastBlock.width) {
        setFallingPieces(prev => [...prev, {
          x: lastBlock.x + lastBlock.width,
          y: currentBlock.y,
          width: (currentBlock.x + currentBlock.width) - (lastBlock.x + lastBlock.width),
          color: currentBlock.color,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 15
        }]);
      }
    }
    
    const newBlock = {
      x: newBlockX,
      y: currentBlock.y,
      width: newBlockWidth,
      color: currentBlock.color
    };
    
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    
    const newCameraOffset = Math.max(0, (newBlocks.length - 18) * BLOCK_HEIGHT);
    setCameraOffset(newCameraOffset);
    
    if (newBlockWidth < 10) {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pattyStackerHighScore', score.toString());
      }
      setGameState('gameOver');
      return;
    }
    
    speedRef.current = Math.min(INITIAL_SPEED + blocks.length * SPEED_INCREMENT, 12);
    
    const nextY = currentBlock.y - BLOCK_HEIGHT;
    setCurrentBlock({
      x: directionRef.current === 1 ? 0 : GAME_WIDTH - newBlockWidth,
      y: nextY,
      width: newBlockWidth,
      color: getPattyColor(newBlocks.length)
    });
    
  }, [gameState, currentBlock, blocks, score, highScore, perfectStreak, startGame]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleTap();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap]);

  // Patty component with burger patty appearance
  const Patty = ({ block, zIndex, isMoving }) => (
    <div
      className={`patty ${isMoving ? 'patty-moving' : ''}`}
      style={{
        left: block.x,
        bottom: GAME_HEIGHT - block.y - BLOCK_HEIGHT,
        width: block.width,
        height: BLOCK_HEIGHT,
        zIndex: zIndex
      }}
    >
      {/* Patty top - slightly lighter with grill marks */}
      <div className="patty-top" style={{ backgroundColor: adjustColor(block.color, 15) }}>
        <div className="grill-marks">
          <div className="grill-mark"></div>
          <div className="grill-mark"></div>
          <div className="grill-mark"></div>
        </div>
      </div>
      {/* Patty side - darker edge */}
      <div className="patty-side" style={{ backgroundColor: adjustColor(block.color, -20) }}></div>
    </div>
  );

  return (
    <div className="game-container" onClick={handleTap}>
      <div className="game-header">
        <div className="score-display">
          <span className="score-label">PATTIES</span>
          <span className="score-value">{score}</span>
        </div>
        <div className="high-score-display">
          <span className="score-label">BEST</span>
          <span className="score-value">{highScore}</span>
        </div>
      </div>
      
      <div className="game-area">
        {/* Grill background */}
        <div className="grill-bg"></div>
        
        <div 
          className="game-world"
          style={{ transform: `translateY(${cameraOffset}px)` }}
        >
          {/* Stacked patties */}
          {blocks.map((block, index) => (
            <Patty key={index} block={block} zIndex={index + 1} isMoving={false} />
          ))}
          
          {/* Current moving patty */}
          {currentBlock && gameState === 'playing' && (
            <Patty block={currentBlock} zIndex={blocks.length + 2} isMoving={true} />
          )}
          
          {/* Falling patty pieces */}
          {fallingPieces.map((piece, index) => (
            <div
              key={`fall-${index}`}
              className="patty falling-patty"
              style={{
                left: piece.x,
                bottom: GAME_HEIGHT - piece.y - BLOCK_HEIGHT,
                width: piece.width,
                height: BLOCK_HEIGHT,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                opacity: 0.8,
                zIndex: 1000,
                borderRadius: '4px'
              }}
            />
          ))}
        </div>
        
        {/* Perfect text */}
        {showPerfect && (
          <div className="perfect-text">
            🔥 SIZZLIN'!
            {perfectStreak > 1 && <span className="streak">x{perfectStreak}</span>}
          </div>
        )}
        
        {/* Start screen */}
        {gameState === 'start' && (
          <div className="overlay start-overlay">
            <div className="logo-burger">🍔</div>
            <h1 className="game-title">PATTY<br/>STACKER</h1>
            <p className="subtitle">by Patty Shack</p>
            <p className="tap-text">TAP TO GRILL</p>
            <div className="instructions">
              <p>Stack the patties!</p>
              <p>Tap to drop each patty</p>
              <p>Perfect stack = bonus points!</p>
            </div>
          </div>
        )}
        
        {/* Game over screen */}
        {gameState === 'gameOver' && (
          <div className="overlay gameover-overlay">
            <h2 className="gameover-title">ORDER UP!</h2>
            <div className="final-score">
              <span>PATTIES STACKED</span>
              <span className="final-score-value">{score}</span>
            </div>
            {score >= highScore && score > 0 && (
              <div className="new-record">🏆 NEW RECORD!</div>
            )}
            <p className="tap-text">TAP TO PLAY AGAIN</p>
          </div>
        )}
      </div>
      
      <div className="game-footer">
        <p>Tap anywhere or press SPACE</p>
      </div>
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
