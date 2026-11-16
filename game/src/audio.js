// audio.js — all of LUMEN's sound is synthesized with WebAudio oscillators.
// No audio files, no network: every effect is a short envelope over one or
// two oscillators, mixed through a single master gain.
const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880.0 };

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noiseBuf = null;
  }

  // Must be called from a user gesture at least once (browser autoplay rule).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  _tone({ type = 'sine', from = 440, to = null, dur = 0.12, vol = 0.5, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.15, vol = 0.4, when = 0, low = 400 }) {
    if (!this.ctx || this.muted) return;
    if (!this._noiseBuf) {
      const len = this.ctx.sampleRate * 0.5;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = low;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  shoot() { this._tone({ type: 'square', from: 880, to: 420, dur: 0.07, vol: 0.16 }); }
  hit() { this._noise({ dur: 0.08, vol: 0.25, low: 900 }); }
  shadeDie() { this._tone({ type: 'triangle', from: 320, to: 60, dur: 0.22, vol: 0.4 }); this._noise({ dur: 0.18, vol: 0.2, low: 600 }); }
  shard() { this._tone({ type: 'sine', from: 1318, to: 1760, dur: 0.09, vol: 0.22 }); }
  hurt() { this._tone({ type: 'sawtooth', from: 220, to: 90, dur: 0.25, vol: 0.4 }); }
  dash() { this._noise({ dur: 0.16, vol: 0.22, low: 2400 }); }
  levelUp() {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5 * 2].forEach((f, i) =>
      this._tone({ type: 'sine', from: f, dur: 0.18, vol: 0.3, when: i * 0.09 }));
  }
  waveHorn() {
    this._tone({ type: 'sawtooth', from: 196, to: 392, dur: 0.5, vol: 0.22 });
    this._tone({ type: 'sawtooth', from: 294, to: 587, dur: 0.5, vol: 0.14, when: 0.05 });
  }
  bossRoar() {
    this._tone({ type: 'sawtooth', from: 98, to: 49, dur: 0.9, vol: 0.4 });
    this._noise({ dur: 0.7, vol: 0.25, low: 300 });
  }
  win() {
    [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) =>
      this._tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.3, when: i * 0.11 }));
  }
  lose() {
    [NOTE.A4, NOTE.F4, NOTE.D4, NOTE.C4].forEach((f, i) =>
      this._tone({ type: 'triangle', from: f, dur: 0.4, vol: 0.3, when: i * 0.16 }));
  }
  click() { this._tone({ type: 'sine', from: 660, dur: 0.05, vol: 0.2 }); }
}
