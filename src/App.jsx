import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const GAME_WIDTH = 300;
const GAME_HEIGHT = 500;
const INITIAL_BLOCK_WIDTH = 100;
const BLOCK_HEIGHT = 25;
const SPEED_INCREMENT = 0.3;
const INITIAL_SPEED = 3;

function App() {
  const [gameState, setGameState] = useState('start');
  const [blocks, setBlocks] = useState([]);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [fallingPieces, setFallingPieces] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('blockStackerHighScore');
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
      color: getBlockColor(0)
    };
    
    setBlocks([baseBlock]);
    setCurrentBlock({
      x: 0,
      y: GAME_HEIGHT - BLOCK_HEIGHT * 2,
      width: INITIAL_BLOCK_WIDTH,
      color: getBlockColor(1)
    });
    setFallingPieces([]);
    setScore(0);
    setPerfectStreak(0);
    setCameraOffset(0);
    speedRef.current = INITIAL_SPEED;
    directionRef.current = 1;
    setGameState('playing');
  }, []);

  function getBlockColor(index) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8B500', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9',
      '#92A8D1', '#955251', '#B565A7', '#009B77', '#DD4124'
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
        localStorage.setItem('blockStackerHighScore', score.toString());
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
    
    const newCameraOffset = Math.max(0, (newBlocks.length - 15) * BLOCK_HEIGHT);
    setCameraOffset(newCameraOffset);
    
    if (newBlockWidth < 10) {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('blockStackerHighScore', score.toString());
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
      color: getBlockColor(newBlocks.length)
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

  return (
    <div className="game-container" onClick={handleTap}>
      <div className="game-header">
        <div className="score-display">
          <span className="score-label">SCORE</span>
          <span className="score-value">{score}</span>
        </div>
        <div className="high-score-display">
          <span className="score-label">BEST</span>
          <span className="score-value">{highScore}</span>
        </div>
      </div>
      
      <div className="game-area">
        <div 
          className="game-world"
          style={{ transform: `translateY(${cameraOffset}px)` }}
        >
          {/* Placed blocks - rendered with z-index based on position (higher blocks on top) */}
          {blocks.map((block, index) => (
            <div
              key={index}
              className="block placed-block"
              style={{
                left: block.x,
                bottom: GAME_HEIGHT - block.y - BLOCK_HEIGHT,
                width: block.width,
                height: BLOCK_HEIGHT,
                backgroundColor: block.color,
                zIndex: index + 1
              }}
            >
              <div className="block-top" style={{ backgroundColor: adjustColor(block.color, 20) }} />
              <div className="block-front" style={{ backgroundColor: block.color }} />
              <div className="block-side" style={{ backgroundColor: adjustColor(block.color, -30) }} />
            </div>
          ))}
          
          {/* Current moving block */}
          {currentBlock && gameState === 'playing' && (
            <div
              className="block current-block"
              style={{
                left: currentBlock.x,
                bottom: GAME_HEIGHT - currentBlock.y - BLOCK_HEIGHT,
                width: currentBlock.width,
                height: BLOCK_HEIGHT,
                backgroundColor: currentBlock.color,
                zIndex: blocks.length + 2
              }}
            >
              <div className="block-top" style={{ backgroundColor: adjustColor(currentBlock.color, 20) }} />
              <div className="block-front" style={{ backgroundColor: currentBlock.color }} />
              <div className="block-side" style={{ backgroundColor: adjustColor(currentBlock.color, -30) }} />
            </div>
          )}
          
          {/* Falling pieces */}
          {fallingPieces.map((piece, index) => (
            <div
              key={`fall-${index}`}
              className="block falling-block"
              style={{
                left: piece.x,
                bottom: GAME_HEIGHT - piece.y - BLOCK_HEIGHT,
                width: piece.width,
                height: BLOCK_HEIGHT,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                opacity: 0.8,
                zIndex: 1000
              }}
            />
          ))}
        </div>
        
        {/* Perfect text */}
        {showPerfect && (
          <div className="perfect-text">
            PERFECT!
            {perfectStreak > 1 && <span className="streak">x{perfectStreak}</span>}
          </div>
        )}
        
        {/* Start screen */}
        {gameState === 'start' && (
          <div className="overlay start-overlay">
            <h1 className="game-title">BLOCK<br/>STACKER</h1>
            <p className="tap-text">TAP TO START</p>
            <div className="instructions">
              <p>Stack the blocks!</p>
              <p>Tap to drop each block</p>
              <p>Perfect alignment = bonus points!</p>
            </div>
          </div>
        )}
        
        {/* Game over screen */}
        {gameState === 'gameOver' && (
          <div className="overlay gameover-overlay">
            <h2 className="gameover-title">GAME OVER</h2>
            <div className="final-score">
              <span>SCORE</span>
              <span className="final-score-value">{score}</span>
            </div>
            {score >= highScore && score > 0 && (
              <div className="new-record">🏆 NEW RECORD!</div>
            )}
            <p className="tap-text">TAP TO RETRY</p>
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
