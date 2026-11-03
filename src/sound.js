// The harbor's sound, made live with the browser's audio engine (no sound files):
// waves, a crowd murmur, gulls and a distant harbor bell. Louder by the water, quieter uphill.
const pref = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
export class HarborSound {
  muted = pref('lavine-sound') === 'off';
  start() {
    if (this.ctx) return;
    const ctx = this.ctx = new AudioContext();
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    const noise = (kind) => {
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
          else d[i] = w;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.start();
      return src;
    };

    // Waves: deep rumbling noise that swells and falls.
    const waves = noise('brown');
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 700;
    this.waveGain = ctx.createGain(); this.waveGain.gain.value = 0.5;
    const swell = ctx.createGain(); swell.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.4;
    lfo.connect(lfoAmt).connect(swell.gain); lfo.start();
    waves.connect(wf).connect(swell).connect(this.waveGain).connect(this.master);

    // Crowd: band-limited noise with a slowly wandering level sounds like many distant voices.
    const crowd = noise('white');
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 520; cf.Q.value = 1.4;
    const cf2 = ctx.createBiquadFilter(); cf2.type = 'peaking'; cf2.frequency.value = 900; cf2.gain.value = 6;
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0.05;
    this.chatter = ctx.createGain(); this.chatter.gain.value = 1;
    crowd.connect(cf).connect(cf2).connect(this.chatter).connect(this.crowdGain).connect(this.master);

    this.music();
    this.nextGull = ctx.currentTime + 2;
    this.nextBell = ctx.currentTime + 15;
    this.nextChatter = 0;
    // Your choices from the Options menu (remembered in this browser).
    if (this.muted) { this.master.gain.value = 0; this.audio.muted = true; }
  }

  // Quiet filler music (Pixabay, free to use): tracks in turn with a little silence between,
  // so it sits under the harbor sounds instead of on top of them. Replace with your own later.
  music() {
    const tracks = ['desert-serenity', 'echoes-of-the-desert', 'desert-wind-meditation', 'desert-voices', 'ancient-ambient'];
    let i = Math.floor(Math.random() * tracks.length);
    const a = this.audio = new Audio();
    const mv = pref('lavine-music');
    a.volume = mv != null ? +mv : 0.18;
    const next = () => { a.src = `assets/music/${tracks[i % tracks.length]}.mp3`; i++; a.play().catch(() => {}); };
    a.addEventListener('ended', () => setTimeout(next, 12000 + Math.random() * 15000));
    next();
  }

  gull() {
    const ctx = this.ctx, t = ctx.currentTime;
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 2 - 1;
    const out = ctx.createGain(); out.gain.value = 0.06 * this.near;
    pan.connect(out).connect(this.master);
    const calls = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < calls; i++) {
      const s = t + i * 0.28;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 3;
      const g = ctx.createGain();
      const base = 1500 + Math.random() * 400;
      o.frequency.setValueAtTime(base * 1.35, s);
      o.frequency.exponentialRampToValueAtTime(base, s + 0.22);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(1, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
      o.connect(f).connect(g).connect(pan);
      o.start(s); o.stop(s + 0.3);
    }
  }

  bell() {
    const ctx = this.ctx, t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = 0.07;
    out.connect(this.master);
    for (const [ratio, amp] of [[1, 1], [2.76, 0.5], [5.4, 0.25], [0.5, 0.4]]) {
      const o = ctx.createOscillator(); o.frequency.value = 330 * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 4.5);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 4.6);
    }
  }

  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('lavine-sound', this.muted ? 'off' : 'on'); } catch { /* fine */ }
    if (!this.ctx) return this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.1);
    if (this.audio) this.audio.muted = this.muted;
    return this.muted;
  }

  // Call every frame with how close to the water (0..1) and how busy the area (0..1) is.
  update(nearWater, busy) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.near = nearWater;
    // Kept low so they sit under the music (they were far too loud).
    this.waveGain.gain.setTargetAtTime(0.03 + 0.14 * nearWater, t, 0.5);
    this.crowdGain.gain.setTargetAtTime(0.008 + 0.045 * busy, t, 0.5);
    if (t > this.nextChatter) {
      this.chatter.gain.setTargetAtTime(0.5 + Math.random() * 0.9, t, 0.25);
      this.nextChatter = t + 0.3 + Math.random() * 0.8;
    }
    if (t > this.nextGull) { this.gull(); this.nextGull = t + 4 + Math.random() * 10; }
    if (t > this.nextBell) { this.bell(); this.nextBell = t + 45 + Math.random() * 40; }
  }
}
