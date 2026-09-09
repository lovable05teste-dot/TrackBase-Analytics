type SoundFn = (ctx: AudioContext) => void;

let sharedCtx:AudioContext|null=null;
function createCtx(): AudioContext|null {
  try{
    if(typeof window==="undefined")return null;
    if(!sharedCtx){
      const AC=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      sharedCtx=new AC();
    }
    if(sharedCtx.state==="suspended")void sharedCtx.resume();
    return sharedCtx;
  }catch{return null;}
}
if(typeof window!=="undefined"){
  const unlock=()=>{try{createCtx();}catch{}};
  window.addEventListener("pointerdown",unlock,{once:true});
  window.addEventListener("touchend",unlock,{once:true});
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

function scheduleNoise(ctx: AudioContext, start: number, dur: number, gain = 0.15, filterFreq = 0) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  if (filterFreq > 0) {
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = filterFreq; f.Q.value = 0.8;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
  } else {
    src.connect(g); g.connect(ctx.destination);
  }
  src.start(ctx.currentTime + start);
  src.stop(ctx.currentTime + start + dur);
}

// "KA" mecânico da registradora: pancada grave + clique metálico.
function clunk(ctx: AudioContext, at: number) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(220, ctx.currentTime + at);
  o.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + at + 0.08);
  g.gain.setValueAtTime(0.8, ctx.currentTime + at);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.1);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.12);
  scheduleNoise(ctx, at, 0.05, 0.5, 2600);
}

// "CHING": sino metálico com parciais inarmônicos e decaimento longo.
function ching(ctx: AudioContext, at: number, vol = 1) {
  const partials:[number,number][]=[[2093,0.55],[2794,0.4],[3520,0.34],[4699,0.24],[5593,0.16],[7040,0.1]];
  for (const [f, g0] of partials) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.002);
    g.gain.setValueAtTime(g0 * vol, ctx.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.9);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 1);
  }
  scheduleNoise(ctx, at, 0.12, 0.22 * vol, 6800);
}

export const sounds: { id: string; name: string; icon: string; fn: SoundFn }[] = [
  {
    id: "caixa-registradora",
    name: "Caixa registradora",
    icon: "💰",
    fn(ctx) {
      clunk(ctx, 0); ching(ctx, 0.08, 1);
    },
  },
  {
    id: "cha-ching",
    name: "Cha-ching alto",
    icon: "🔔",
    fn(ctx) {
      ching(ctx, 0, 1); ching(ctx, 0.16, 0.7);
    },
  },
  {
    id: "moedas",
    name: "Moedas caindo",
    icon: "🪙",
    fn(ctx) {
      const pings = [4186, 3520, 4699, 3136, 3951, 5274];
      pings.forEach((f, i) => scheduleNote(ctx, f, i * 0.07, 0.16, "triangle", 0.5));
      scheduleNoise(ctx, 0, 0.3, 0.2, 8000);
    },
  },
  {
    id: "sino-venda",
    name: "Sino de venda",
    icon: "✅",
    fn(ctx) {
      scheduleNote(ctx, 1046, 0, 0.25, "sine", 0.55);
      scheduleNote(ctx, 1568, 0.13, 0.4, "sine", 0.55);
      scheduleNote(ctx, 2093, 0.13, 0.2, "sine", 0.25);
    },
  },
];

export const DEFAULT_SOUND_ID = "caixa-registradora";

export function playSound(id: string) {
  const sound = sounds.find((s) => s.id === id) || sounds[0];
  const ctx = createCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") { void ctx.resume().then(() => { try { sound.fn(ctx); } catch {} }); return; }
    sound.fn(ctx);
  } catch {}
}
