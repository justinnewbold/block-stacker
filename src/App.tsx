import React, { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import './App.css';

import type { Particle, FallingPiece } from './types';
import {
  GAME_HEIGHT,
  PHYSICS_INTERVAL,
  SCORE_ANIMATION_INTERVAL,
  SCORE_ANIMATION_DIVISOR,
  PERFECT_POPUP_DURATION,
  PERFECT_PARTICLE_COUNT,
  NORMAL_PARTICLE_COUNT,
  PARTICLE_SPREAD,
  PARTICLE_SPEED_X,
  PARTICLE_MIN_SPEED_Y,
  PARTICLE_MAX_SPEED_Y,
  PARTICLE_MIN_SIZE,
  PARTICLE_MAX_SIZE,
  PARTICLE_GRAVITY,
  PARTICLE_DECAY,
  FALLING_PIECE_SPEED,
  FALLING_PIECE_BOUNDARY,
} from './constants';
import { triggerHaptic } from './utils';
import { gameReducer, createInitialState } from './gameReducer';

import Topping from './components/Topping';
import StartScreen from './components/StartScreen';
import PauseModal from './components/PauseModal';
import GameOverSheet from './components/GameOverSheet';

// ---------------------------------------------------------------------------
// Particle helpers
// ---------------------------------------------------------------------------

let particleId = 0;

function spawnParticles(
  x: number,
  y: number,
  color: string,
  count: number,
): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: ++particleId,
      x: x + Math.random() * PARTICLE_SPREAD * 2 - PARTICLE_SPREAD,
      y,
      vx: (Math.random() - 0.5) * PARTICLE_SPEED_X,
      vy: -Math.random() * (PARTICLE_MAX_SPEED_Y - PARTICLE_MIN_SPEED_Y) - PARTICLE_MIN_SPEED_Y,
      color,
      size: Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE) + PARTICLE_MIN_SIZE,
      life: 1,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  // --- Side-effect state (particles, falling pieces, display score) ---
  const [particles, setParticles] = useState<Particle[]>([]);
  const [fallingPieces, setFallingPieces] = useState<FallingPiece[]>([]);
  const [displayScore, setDisplayScore] = useState(0);

  // Refs for the animation loop — avoids stale closures
  const animationRef = useRef<number>();
  const dispatchRef = useRef(dispatch);

  // Keep dispatchRef current (dispatch is stable, but pattern is safe)
  dispatchRef.current = dispatch;

  // ------------------------------------------------------------------
  // Block movement animation — only depends on phase & pause state.
  // Reads nothing from React state inside the rAF callback; it just
  // dispatches TICK actions that the reducer handles with current state.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'playing' || state.isPaused) return;

    const animate = () => {
      dispatchRef.current({ type: 'TICK' });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state.phase, state.isPaused]);

  // ------------------------------------------------------------------
  // React to placement events → haptics + particles + falling debris
  // ------------------------------------------------------------------
  const lastEventCounter = useRef(0);

  useEffect(() => {
    if (state.eventCounter === lastEventCounter.current) return;
    lastEventCounter.current = state.eventCounter;

    const ev = state.lastEvent;
    if (!ev) return;

    switch (ev.kind) {
      case 'perfect':
        triggerHaptic('heavy');
        setParticles((p) => [
          ...p,
          ...spawnParticles(ev.x, ev.y, ev.color, PERFECT_PARTICLE_COUNT),
        ]);
        break;
      case 'normal':
        triggerHaptic('light');
        setParticles((p) => [
          ...p,
          ...spawnParticles(ev.x, ev.y, ev.color, NORMAL_PARTICLE_COUNT),
        ]);
        break;
      case 'miss':
        triggerHaptic('heavy');
        if (ev.missedBlock) {
          setFallingPieces((fp) => [
            ...fp,
            {
              ...ev.missedBlock!,
              rotation: 0,
              rotationSpeed: (Math.random() - 0.5) * 10,
            },
          ]);
        }
        break;
      case 'tooSmall':
        triggerHaptic('heavy');
        break;
    }

    // Add debris from imperfect placements
    if (ev.debris.length > 0) {
      setFallingPieces((fp) => [...fp, ...ev.debris]);
    }
  }, [state.eventCounter, state.lastEvent]);

  // ------------------------------------------------------------------
  // Hide perfect popup after duration
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!state.showPerfect) return;
    const timer = setTimeout(
      () => dispatch({ type: 'HIDE_PERFECT' }),
      PERFECT_POPUP_DURATION,
    );
    return () => clearTimeout(timer);
  }, [state.showPerfect, state.eventCounter]);

  // ------------------------------------------------------------------
  // Particle physics
  // ------------------------------------------------------------------
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + PARTICLE_GRAVITY,
            life: p.life - PARTICLE_DECAY,
          }))
          .filter((p) => p.life > 0),
      );
    }, PHYSICS_INTERVAL);
    return () => clearInterval(interval);
  }, [particles.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Falling pieces physics
  // ------------------------------------------------------------------
  useEffect(() => {
    if (fallingPieces.length === 0) return;
    const interval = setInterval(() => {
      setFallingPieces((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y + FALLING_PIECE_SPEED,
            rotation: p.rotation + p.rotationSpeed,
          }))
          .filter((p) => p.y < GAME_HEIGHT + FALLING_PIECE_BOUNDARY),
      );
    }, PHYSICS_INTERVAL);
    return () => clearInterval(interval);
  }, [fallingPieces.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Animated score counter
  // ------------------------------------------------------------------
  useEffect(() => {
    if (displayScore >= state.score) return;
    const timer = setTimeout(() => {
      setDisplayScore((prev) =>
        Math.min(
          prev + Math.ceil((state.score - prev) / SCORE_ANIMATION_DIVISOR),
          state.score,
        ),
      );
    }, SCORE_ANIMATION_INTERVAL);
    return () => clearTimeout(timer);
  }, [displayScore, state.score]);

  // Reset display score on new game
  useEffect(() => {
    if (state.phase === 'playing' && state.score === 0) {
      setDisplayScore(0);
      setParticles([]);
      setFallingPieces([]);
    }
  }, [state.phase, state.score]);

  // ------------------------------------------------------------------
  // Handlers (memoized with useCallback, stable deps)
  // ------------------------------------------------------------------
  const handleStart = useCallback(() => {
    triggerHaptic('heavy');
    dispatch({ type: 'START_GAME' });
  }, []);

  const handleTap = useCallback(() => {
    if (state.isPaused) return;
    if (state.phase === 'start' || state.phase === 'gameOver') {
      triggerHaptic('heavy');
      dispatch({ type: 'START_GAME' });
      return;
    }
    if (state.phase !== 'playing' || !state.currentBlock) return;
    triggerHaptic('light');
    dispatch({ type: 'PLACE_BLOCK' });
  }, [state.phase, state.isPaused, state.currentBlock]);

  const handleResume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const handleQuit = useCallback(() => dispatch({ type: 'QUIT' }), []);

  const handlePause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_PAUSE' });
  }, []);

  // ------------------------------------------------------------------
  // Keyboard controls (stable handler via ref)
  // ------------------------------------------------------------------
  const handleTapRef = useRef(handleTap);
  handleTapRef.current = handleTap;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleTapRef.current();
      }
      if (e.code === 'Escape') {
        dispatch({ type: 'TOGGLE_PAUSE' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // Runs once — uses refs so never stale

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const { phase, blocks, currentBlock, perfectStreak, showPerfect, cameraOffset, isPaused, score, highScore } = state;

  return (
    <div className="app-container">
      {/* iOS Status Bar Space */}
      <div className="status-bar-space" />

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
      {perfectStreak > 1 && phase === 'playing' && (
        <div className="streak-badge">
          <span className="streak-flame">🔥</span>
          <span className="streak-count">{perfectStreak}x Combo</span>
        </div>
      )}

      {/* Game Area */}
      <div className="game-area" onClick={handleTap}>
        <div className="grill-surface" />

        <div
          className="game-world"
          style={{ transform: `translateY(${cameraOffset}px)` }}
        >
          {/* Stacked toppings */}
          {blocks.map((block, i) => (
            <Topping key={i} block={block} zIndex={i + 1} />
          ))}

          {/* Current moving piece */}
          {currentBlock && phase === 'playing' && !isPaused && (
            <Topping
              block={currentBlock}
              zIndex={blocks.length + 2}
              isMoving
            />
          )}

          {/* Falling pieces */}
          {fallingPieces.map((piece, i) => (
            <div
              key={`fall-${i}`}
              className="falling-piece"
              style={{
                left: piece.x,
                bottom: GAME_HEIGHT - piece.y - piece.height,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                borderRadius: piece.type === 'patty' ? '6px' : '4px',
              }}
            />
          ))}

          {/* Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={{
                left: p.x,
                bottom: GAME_HEIGHT - p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life,
              }}
            />
          ))}
        </div>

        {/* Perfect popup */}
        {showPerfect && (
          <div className="perfect-popup">
            <span className="perfect-emoji">🔥</span>
            <span className="perfect-text">Perfect!</span>
            {perfectStreak > 1 && (
              <span className="perfect-bonus">
                +{20 + (perfectStreak - 1) * 10}
              </span>
            )}
          </div>
        )}

        {/* Start Screen */}
        {phase === 'start' && <StartScreen onStart={handleStart} />}

        {/* Pause Screen */}
        {isPaused && phase === 'playing' && (
          <PauseModal onResume={handleResume} onQuit={handleQuit} />
        )}

        {/* Game Over */}
        {phase === 'gameOver' && (
          <GameOverSheet
            score={score}
            highScore={highScore}
            toppingCount={blocks.length}
            onPlayAgain={handleStart}
          />
        )}
      </div>

      {/* Pause button */}
      {phase === 'playing' && !isPaused && (
        <button className="pause-button" onClick={handlePause}>
          <span>⏸</span>
        </button>
      )}

      {/* Home indicator space */}
      <div className="home-indicator-space" />
    </div>
  );
}

export default App;
