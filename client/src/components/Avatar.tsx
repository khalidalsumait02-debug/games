const PALETTES: [string, string][] = [
  ['#5b7fff', '#9b59f6'],
  ['#f59e0b', '#ef6c4d'],
  ['#10b981', '#0ea5b7'],
  ['#ec4899', '#8b5cf6'],
  ['#06b6d4', '#3b82f6'],
  ['#d4af37', '#b8860b'],
  ['#f43f5e', '#fb923c'],
  ['#22c55e', '#84cc16'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const words = name.replace(/[^A-Za-z؀-ۿ ]/g, '').split(' ').filter(Boolean);
  const initials = (words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '');
  const [c1, c2] = PALETTES[hash(name) % PALETTES.length];
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden
    >
      {initials.toUpperCase()}
    </span>
  );
}
