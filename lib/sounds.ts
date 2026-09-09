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

function scheduleNoise(ctx: AudioContext, start: number, dur: number, gain = 0.15) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
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

// Sino metálico com parciais inarmônicos (sons de moeda/caixa registradora)
function bell(ctx: AudioContext, freq: number, start: number, dur: number, gain = 0.3) {
  const partials = [1, 2.7, 5.4];
  const amps = [1, 0.5, 0.22];
  const decays = [1, 0.6, 0.35];
  partials.forEach((mult, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    const t = ctx.currentTime + start;
    g.gain.setValueAtTime(gain * amps[i], t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * decays[i]);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  });
}

function tink(ctx: AudioContext, freq: number, start: number, gain = 0.25) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.14);
}

export const sounds: { id: string; name: string; icon: string; fn: SoundFn }[] = [
  // Caixa registradora — Cash Register Sound (clássico da Hotmart): desliza a gaveta e dá dois "dings".
  {
    id: "cash-register",
    name: "Caixa registradora",
    icon: "💰",
    fn(ctx) {
      scheduleNoise(ctx, 0, 0.08, 0.12);
      tink(ctx, 1046, 0.00, 0.18);
      tink(ctx, 1318, 0.04, 0.18);
      tink(ctx, 1568, 0.08, 0.18);
      bell(ctx, 2093, 0.2, 0.45, 0.32);
      bell(ctx, 2637, 0.36, 0.6, 0.28);
    },
  },
  // Cha-Ching — onomatopeia da caixa registradora: "cha" abafado + "CHING" brilhante.
  {
    id: "cha-ching",
    name: "Cha-Ching",
    icon: "🛎️",
    fn(ctx) {
      scheduleNoise(ctx, 0, 0.06, 0.1);
      scheduleNote(ctx, 660, 0, 0.08, "triangle", 0.22);
      scheduleNote(ctx, 740, 0.05, 0.08, "triangle", 0.18);
      bell(ctx, 1760, 0.12, 0.8, 0.34);
      bell(ctx, 2637, 0.12, 0.4, 0.12);
    },
  },
  // Moedas caindo — Coins Dropping / Coins Clinking (Kiwify e Cakto): várias moedas de metal batendo.
  {
    id: "coins",
    name: "Moedas caindo",
    icon: "🪙",
    fn(ctx) {
      const seq = [2637, 2093, 3135, 2349, 2793, 2093, 3135, 2349, 1760];
      seq.forEach((f, i) => bell(ctx, f, i * 0.045, 0.18, 0.2 + (i < 4 ? i * 0.02 : (8 - i) * 0.02)));
      bell(ctx, 3135, 0.42, 0.4, 0.22);
    },
  },
  // Sino de sucesso — Success Chime / Success Ping (Kirvano): "bip" digital curto e limpo em duas notas.
  {
    id: "success-chime",
    name: "Sino de sucesso",
    icon: "✅",
    fn(ctx) {
      scheduleNote(ctx, 1046, 0, 0.22, "sine", 0.3);
      scheduleNote(ctx, 1568, 0.14, 0.32, "sine", 0.32);
      scheduleNote(ctx, 2093, 0.14, 0.18, "sine", 0.14);
    },
  },
];

export function playSound(id: string) {
  const sound = sounds.find((s) => s.id === id);
  if (!sound) return;
  const ctx = createCtx();
  if (!ctx) return;
  try {
    if(ctx.state==="suspended"){void ctx.resume().then(()=>{try{sound.fn(ctx);}catch{}});return;}
    sound.fn(ctx);
  } catch {}
}