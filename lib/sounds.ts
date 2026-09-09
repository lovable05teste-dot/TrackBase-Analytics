type SoundFn = (ctx: AudioContext) => void;

function createCtx(): AudioContext {
  return new AudioContext();
}

function scheduleNote(ctx: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.3) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur);
}

function scheduleNoise(ctx: AudioContext, start: number, dur: number, gain = 0.15) {
  const bufferSize = ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  src.connect(g).connect(ctx.destination);
  src.start(ctx.currentTime + start);
  src.stop(ctx.currentTime + start + dur);
}

export const sounds: { id: string; name: string; icon: string; fn: SoundFn }[] = [
  {
    id: "ka-ching",
    name: "Ka-Ching",
    icon: "💰",
    fn(ctx) {
      scheduleNote(ctx, 1200, 0, 0.08, "triangle", 0.4);
      scheduleNote(ctx, 1600, 0.06, 0.08, "triangle", 0.35);
      scheduleNote(ctx, 2000, 0.12, 0.15, "triangle", 0.3);
      scheduleNote(ctx, 2400, 0.18, 0.2, "sine", 0.2);
    },
  },
  {
    id: "moeda",
    name: "Moeda",
    icon: "🪙",
    fn(ctx) {
      scheduleNote(ctx, 3000, 0, 0.05, "sine", 0.35);
      scheduleNote(ctx, 4000, 0.03, 0.1, "sine", 0.3);
      scheduleNote(ctx, 5000, 0.08, 0.15, "sine", 0.2);
      scheduleNote(ctx, 4500, 0.2, 0.1, "sine", 0.15);
    },
  },
  {
    id: "sino",
    name: "Sino",
    icon: "🔔",
    fn(ctx) {
      scheduleNote(ctx, 880, 0, 0.4, "sine", 0.35);
      scheduleNote(ctx, 1760, 0, 0.3, "sine", 0.15);
      scheduleNote(ctx, 2640, 0, 0.2, "sine", 0.08);
    },
  },
  {
    id: "sucesso",
    name: "Sucesso",
    icon: "✅",
    fn(ctx) {
      scheduleNote(ctx, 523, 0, 0.15, "sine", 0.3);
      scheduleNote(ctx, 659, 0.12, 0.15, "sine", 0.3);
      scheduleNote(ctx, 784, 0.24, 0.3, "sine", 0.35);
    },
  },
  {
    id: "notificacao",
    name: "Notificação",
    icon: "🔔",
    fn(ctx) {
      scheduleNote(ctx, 800, 0, 0.1, "sine", 0.3);
      scheduleNote(ctx, 1000, 0.12, 0.1, "sine", 0.3);
      scheduleNote(ctx, 800, 0.24, 0.15, "sine", 0.25);
    },
  },
  {
    id: "triunfo",
    name: "Triunfo",
    icon: "🎺",
    fn(ctx) {
      scheduleNote(ctx, 523, 0, 0.12, "sawtooth", 0.2);
      scheduleNote(ctx, 659, 0.1, 0.12, "sawtooth", 0.2);
      scheduleNote(ctx, 784, 0.2, 0.12, "sawtooth", 0.2);
      scheduleNote(ctx, 1047, 0.3, 0.35, "sawtooth", 0.25);
    },
  },
  {
    id: "pop",
    name: "Pop",
    icon: "💧",
    fn(ctx) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(g).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    },
  },
  {
    id: "brilho",
    name: "Brilho",
    icon: "✨",
    fn(ctx) {
      for (let i = 0; i < 6; i++) {
        scheduleNote(ctx, 2000 + i * 500, i * 0.04, 0.12, "sine", 0.15);
      }
      scheduleNote(ctx, 4000, 0.25, 0.3, "sine", 0.2);
    },
  },
  {
    id: "whoosh",
    name: "Whoosh",
    icon: "💨",
    fn(ctx) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(g).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
      scheduleNote(ctx, 1500, 0.15, 0.25, "sine", 0.3);
    },
  },
  {
    id: "digital",
    name: "Digital",
    icon: "📱",
    fn(ctx) {
      scheduleNote(ctx, 1000, 0, 0.06, "square", 0.2);
      scheduleNote(ctx, 1200, 0.08, 0.06, "square", 0.2);
      scheduleNote(ctx, 1000, 0.16, 0.06, "square", 0.2);
      scheduleNote(ctx, 1500, 0.28, 0.15, "square", 0.25);
    },
  },
  {
    id: "moeda-caindo",
    name: "Moeda Caindo",
    icon: "🪙",
    fn(ctx) {
      const notes = [3000, 2500, 3000, 2000, 2500, 3000, 3500];
      notes.forEach((freq, i) => {
        scheduleNote(ctx, freq, i * 0.06, 0.08, "sine", 0.25 - i * 0.02);
      });
    },
  },
  {
    id: "fanfarra",
    name: "Fanfarra",
    icon: "🎉",
    fn(ctx) {
      scheduleNote(ctx, 392, 0, 0.15, "sawtooth", 0.2);
      scheduleNote(ctx, 523, 0.12, 0.15, "sawtooth", 0.2);
      scheduleNote(ctx, 659, 0.24, 0.15, "sawtooth", 0.2);
      scheduleNote(ctx, 784, 0.36, 0.15, "sawtooth", 0.2);
      scheduleNote(ctx, 1047, 0.48, 0.4, "sawtooth", 0.3);
    },
  },
];

export function playSound(id: string) {
  const sound = sounds.find((s) => s.id === id);
  if (!sound) return;
  const ctx = createCtx();
  sound.fn(ctx);
  setTimeout(() => ctx.close(), 3000);
}