import React from 'react';
import type { Block } from '../types';
import { GAME_HEIGHT } from '../constants';
import { adjustColor } from '../utils';

interface ToppingProps {
  block: Block;
  zIndex: number;
  isMoving?: boolean;
}

const Topping: React.FC<ToppingProps> = React.memo(
  function Topping({ block, zIndex, isMoving = false }) {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: block.x,
      bottom: GAME_HEIGHT - block.y - block.height,
      width: block.width,
      height: block.height,
      zIndex,
      transition: isMoving
        ? 'none'
        : 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: isMoving ? 'scale(1.02)' : 'scale(1)',
    };

    switch (block.type) {
      case 'cheese':
        return (
          <div style={baseStyle} className="topping cheese">
            <div
              className="cheese-melt"
              style={{ backgroundColor: block.color }}
            />
          </div>
        );

      case 'lettuce':
        return (
          <div style={baseStyle} className="topping lettuce">
            <div
              className="lettuce-wave"
              style={{ backgroundColor: block.color }}
            />
          </div>
        );

      case 'tomato':
        return (
          <div style={baseStyle} className="topping tomato">
            <div
              className="tomato-slice"
              style={{ backgroundColor: block.color }}
            />
          </div>
        );

      case 'onion':
        return (
          <div style={baseStyle} className="topping onion">
            <div
              className="onion-rings"
              style={{ backgroundColor: block.color }}
            />
          </div>
        );

      default:
        return (
          <div
            style={baseStyle}
            className={`topping patty ${isMoving ? 'sizzling' : ''}`}
          >
            <div
              className="patty-top"
              style={{ backgroundColor: adjustColor(block.color, 15) }}
            >
              <div className="grill-marks">
                <div className="grill-mark" />
                <div className="grill-mark" />
                <div className="grill-mark" />
              </div>
            </div>
            <div
              className="patty-side"
              style={{ backgroundColor: adjustColor(block.color, -20) }}
            />
          </div>
        );
    }
  },
);

export default Topping;
