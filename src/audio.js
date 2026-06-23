// Web Audio APIのコンテキスト
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// 正解音（ピンポン！）
export const playCorrectSound = () => {
  const ctx = getAudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';
  
  // ピン（高音）
  osc1.frequency.setValueAtTime(800, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
  // ポン（少し低い音）
  osc1.frequency.setValueAtTime(600, ctx.currentTime + 0.15);
  osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
  gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.2);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  osc1.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.6);
};

// 不正解音（ブブー）
export const playIncorrectSound = () => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sawtooth'; // 濁った音にするためノコギリ波
  
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(0, ctx.currentTime + 0.15); // 一瞬切る
  osc.frequency.setValueAtTime(150, ctx.currentTime + 0.2);
  osc.frequency.setValueAtTime(150, ctx.currentTime + 0.3);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
};

// 完了音（ファンファーレ風）
export const playFinishSound = () => {
  const ctx = getAudioContext();
  const freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 (イ長調コード)
  
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * 0.15));
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime + (i * 0.15));
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + (i * 0.15) + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i * 0.15) + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(ctx.currentTime + (i * 0.15));
    osc.stop(ctx.currentTime + (i * 0.15) + 0.6);
  });
};
