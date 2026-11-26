import type { CSSProperties } from 'react';
import { paint } from './palette.ts';
import { compileSprite, type SpriteDef } from './pixel-art.ts';
import styles from './Sprite.module.css';

interface Props {
  sprite: SpriteDef;
  /** CSS pixels per art pixel. */
  scale?: number;
  /** Frames per second for multi-frame sprites. */
  fps?: number;
  /**
   * `loop` plays all the time, `hover` only while a `[data-sprite-host]` ancestor is hovered or
   * focused, `none` shows `frame`. Reduced motion always shows the first frame.
   */
  play?: 'loop' | 'hover' | 'none';
  frame?: number;
  /** Accessible name. Without it the sprite is decorative and hidden from assistive tech. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Pixel-art sprite as inline SVG: one path per colour, crisp edges at any scale, colours from
 * CSS variables (theme-aware). Frames sit side by side and a CSS `steps()` animation slides them.
 */
export function Sprite({
  sprite,
  scale = 3,
  fps = 4,
  play = 'loop',
  frame = 0,
  label,
  className,
  style,
}: Props) {
  const { width, height, frames } = compileSprite(sprite);
  const animated = play !== 'none' && frames.length > 1;
  const shown = animated ? frames : [frames[Math.min(frame, frames.length - 1)] ?? []];
  const vars = { '--n': frames.length, '--w': width, '--fps': fps } as CSSProperties;

  return (
    <svg
      className={className ? `${styles.sprite} ${className}` : styles.sprite}
      style={style}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <g className={animated ? styles.frames : undefined} data-play={play} style={vars}>
        {shown.map((layers, i) => (
          <g key={i} transform={i === 0 ? undefined : `translate(${i * width} 0)`}>
            {layers.map((layer) => (
              <path key={layer.fill} fill={paint(layer.fill)} d={layer.d} />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}
