import { useState } from 'react';

const COLORS = ['#3b97e6', '#5b7fff', '#10b981', '#ec4899', '#f59e0b', '#06b6d4', '#f4f7ff'];

interface Piece {
  left: number;
  delay: number;
  dur: number;
  color: string;
  size: number;
  drift: number;
  round: boolean;
}

export default function Confetti({ count = 110 }: { count?: number }) {
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 2.4 + Math.random() * 2,
      color: COLORS[i % COLORS.length],
      size: 5 + Math.random() * 7,
      drift: -60 + Math.random() * 120,
      round: Math.random() > 0.6,
    }))
  );

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.45),
            background: p.color,
            borderRadius: p.round ? '50%' : 1,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
