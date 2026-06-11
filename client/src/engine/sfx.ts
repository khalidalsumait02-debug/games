// Tiny synthesized sound design — no audio assets needed.
let ctx: AudioContext | null = null;
let muted = localStorage.getItem('dcb_muted') === '1';

export function isMuted() {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem('dcb_muted', muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  return muted;
}

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function tone(
  freq: number,
  dur = 0.12,
  type: OscillatorType = 'sine',
  gain = 0.05,
  when = 0,
  slideTo?: number
) {
  if (muted) return;
  try {
    const c = ac();
    if (c.state === 'suspended') void c.resume();
    const o = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + when;
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  } catch {
    /* audio unavailable — stay silent */
  }
}

export const sfx = {
  click: () => tone(480, 0.05, 'triangle', 0.035),
  hover: () => tone(720, 0.03, 'sine', 0.012),
  best: () => {
    tone(523, 0.1, 'sine', 0.05);
    tone(659, 0.12, 'sine', 0.05, 0.08);
    tone(784, 0.2, 'sine', 0.05, 0.16);
  },
  good: () => {
    tone(523, 0.1, 'sine', 0.045);
    tone(659, 0.16, 'sine', 0.045, 0.09);
  },
  poor: () => tone(320, 0.18, 'triangle', 0.05, 0, 260),
  bad: () => {
    tone(220, 0.22, 'sawtooth', 0.04, 0, 150);
    tone(150, 0.28, 'sawtooth', 0.035, 0.12, 110);
  },
  cash: () => {
    tone(880, 0.06, 'square', 0.025);
    tone(1318, 0.09, 'square', 0.025, 0.06);
  },
  step: () => tone(620, 0.05, 'triangle', 0.03),
  wrong: () => tone(196, 0.13, 'square', 0.04, 0, 150),
  achievement: () => {
    tone(659, 0.1, 'sine', 0.05);
    tone(784, 0.1, 'sine', 0.05, 0.09);
    tone(988, 0.12, 'sine', 0.05, 0.18);
    tone(1319, 0.25, 'sine', 0.05, 0.27);
  },
  month: () => {
    tone(392, 0.14, 'sine', 0.04);
    tone(587, 0.22, 'sine', 0.04, 0.12);
  },
  fanfare: () => {
    tone(523, 0.12, 'sine', 0.05);
    tone(659, 0.12, 'sine', 0.05, 0.12);
    tone(784, 0.12, 'sine', 0.05, 0.24);
    tone(1047, 0.4, 'sine', 0.055, 0.36);
    tone(784, 0.4, 'sine', 0.03, 0.36);
  },
};
