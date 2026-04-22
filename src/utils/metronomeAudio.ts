export type MetronomeSound = '808-rimshot' | 'woodblock' | 'indian-classical' | 'jazz-brush' | 'blues-organ' | 'rnb-funk' | 'hiphop-clap' | 'synth-bell' | 'analog-blip';

export interface SoundOption {
  id: MetronomeSound;
  name: string;
  description: string;
  mood: string;
}

export const soundOptions: SoundOption[] = [
  {
    id: '808-rimshot',
    name: '808 Rimshot',
    description: 'Classic drum machine snap',
    mood: 'Hip-Hop / Electronic'
  },
  {
    id: 'woodblock',
    name: 'Studio Woodblock',
    description: 'Warm acoustic click',
    mood: 'Jazz / Acoustic'
  },
  {
    id: 'indian-classical',
    name: 'Tabla Bols',
    description: 'Ta-dhin-dhin-na rhythm pattern',
    mood: 'Indian Classical'
  },
  {
    id: 'jazz-brush',
    name: 'Jazz Brush',
    description: 'Smooth brushed snare swing',
    mood: 'Jazz / Swing'
  },
  {
    id: 'blues-organ',
    name: 'Blues Organ',
    description: 'Warm B3 organ chord stab',
    mood: 'Blues / Soul'
  },
  {
    id: 'rnb-funk',
    name: 'R&B Funk',
    description: 'Groovy funk bass slap',
    mood: 'R&B / Funk'
  },
  {
    id: 'hiphop-clap',
    name: 'Hip-Hop Clap',
    description: 'Crisp hand clap with snap',
    mood: 'Hip-Hop / Trap'
  },
  {
    id: 'synth-bell',
    name: 'Synth Bell',
    description: 'Bright melodic chime',
    mood: 'Pop / Electronic'
  },
  {
    id: 'analog-blip',
    name: 'Analog Blip',
    description: 'Vintage synthesizer pulse',
    mood: 'Retro / Lo-Fi'
  }
];

class MetronomeAudioEngine {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        throw new Error('Web Audio API is not supported');
      }
      this.audioContext = new Ctor();
    }
    return this.audioContext;
  }

  getContext(): AudioContext {
    return this.getAudioContext();
  }

  async resume() {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }

  private create808Rimshot(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.5 : accentLevel === 'normal' ? 1.2 : 0.5;
    const frequency = accentLevel === 'first' ? 1800 : accentLevel === 'normal' ? 1500 : 1200;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(accentLevel === 'first' ? 1200 : accentLevel === 'normal' ? 1000 : 800, time + 0.01);
    oscillator.frequency.exponentialRampToValueAtTime(accentLevel === 'first' ? 800 : accentLevel === 'normal' ? 600 : 400, time + 0.03);

    filter.type = 'highpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(time);
    oscillator.stop(time + 0.08);
  }

  private createWoodblock(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.4 : accentLevel === 'normal' ? 1.0 : 0.45;
    const freq1 = accentLevel === 'first' ? 1800 : accentLevel === 'normal' ? 1600 : 1400;
    const freq2 = accentLevel === 'first' ? 2350 : accentLevel === 'normal' ? 2100 : 1850;

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator1.type = 'square';
    oscillator1.frequency.value = freq1;

    oscillator2.type = 'square';
    oscillator2.frequency.value = freq2;

    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 5;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(time);
    oscillator2.start(time);
    oscillator1.stop(time + 0.04);
    oscillator2.stop(time + 0.04);
  }

  private createIndianClassical(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.4 : accentLevel === 'normal' ? 1.1 : 0.5;
    const baseFreq = accentLevel === 'first' ? 220 : accentLevel === 'normal' ? 196 : 165; // A3, G3, E3

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator1.type = 'triangle';
    oscillator1.frequency.value = baseFreq;

    oscillator2.type = 'triangle';
    oscillator2.frequency.value = baseFreq * 1.5;

    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 3;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.6;

    oscillator1.connect(filter);
    oscillator2.connect(gain2);
    gain2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(time);
    oscillator2.start(time);
    oscillator1.stop(time + 0.08);
    oscillator2.stop(time + 0.08);
  }

  private createJazzBrush(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.3 : accentLevel === 'normal' ? 1.0 : 0.45;
    const freq1 = accentLevel === 'first' ? 2800 : accentLevel === 'normal' ? 2400 : 2000;
    const freq2 = accentLevel === 'first' ? 3600 : accentLevel === 'normal' ? 3200 : 2800;

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(freq1, time);
    oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 0.7, time + 0.02);

    oscillator2.type = 'sawtooth';
    oscillator2.frequency.setValueAtTime(freq2, time);
    oscillator2.frequency.exponentialRampToValueAtTime(freq2 * 0.7, time + 0.02);

    filter.type = 'highpass';
    filter.frequency.value = 1000;
    filter.Q.value = 2;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(time);
    oscillator2.start(time);
    oscillator1.stop(time + 0.04);
    oscillator2.stop(time + 0.04);
  }

  private createBluesOrgan(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.2 : accentLevel === 'normal' ? 0.9 : 0.4;
    const baseFreq = accentLevel === 'first' ? 220 : accentLevel === 'normal' ? 196 : 165; // A3, G3, E3

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const oscillator3 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator1.type = 'sawtooth';
    oscillator1.frequency.value = baseFreq;

    oscillator2.type = 'sawtooth';
    oscillator2.frequency.value = baseFreq * 1.25;

    oscillator3.type = 'sawtooth';
    oscillator3.frequency.value = baseFreq * 1.5;

    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.7;
    const gain3 = ctx.createGain();
    gain3.gain.value = 0.5;

    oscillator1.connect(filter);
    oscillator2.connect(gain2);
    gain2.connect(filter);
    oscillator3.connect(gain3);
    gain3.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(time);
    oscillator2.start(time);
    oscillator3.start(time);
    oscillator1.stop(time + 0.15);
    oscillator2.stop(time + 0.15);
    oscillator3.stop(time + 0.15);
  }

  private createRnBFunk(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.5 : accentLevel === 'normal' ? 1.2 : 0.55;
    const freq1 = accentLevel === 'first' ? 110 : accentLevel === 'normal' ? 98 : 82; // A2, G2, E2
    const freq2 = accentLevel === 'first' ? 220 : accentLevel === 'normal' ? 196 : 165; // A3, G3, E3

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(freq1, time);
    oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 1.2, time + 0.01);
    oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 0.8, time + 0.03);

    oscillator2.type = 'sawtooth';
    oscillator2.frequency.value = freq2;

    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 4;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.8;

    oscillator1.connect(filter);
    oscillator2.connect(gain2);
    gain2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(time);
    oscillator2.start(time);
    oscillator1.stop(time + 0.08);
    oscillator2.stop(time + 0.08);
  }

  private createHiphopClap(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.6 : accentLevel === 'normal' ? 1.3 : 0.6;
    const freq1 = accentLevel === 'first' ? 2800 : accentLevel === 'normal' ? 2400 : 2000;
    const freq2 = accentLevel === 'first' ? 3600 : accentLevel === 'normal' ? 3200 : 2800;

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator1.type = 'square';
    oscillator1.frequency.setValueAtTime(freq1, time);
    oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 0.5, time + 0.02);

    oscillator2.type = 'square';
    oscillator2.frequency.setValueAtTime(freq2, time);
    oscillator2.frequency.exponentialRampToValueAtTime(freq2 * 0.5, time + 0.02);

    filter.type = 'highpass';
    filter.frequency.value = 800;
    filter.Q.value = 3;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(time);
    oscillator2.start(time);
    oscillator1.stop(time + 0.04);
    oscillator2.stop(time + 0.04);
  }

  private createSynthBell(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.2 : accentLevel === 'normal' ? 0.9 : 0.4;
    const baseFreq = accentLevel === 'first' ? 1320 : accentLevel === 'normal' ? 1100 : 660;

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const oscillator3 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator1.type = 'sine';
    oscillator1.frequency.value = baseFreq;

    oscillator2.type = 'sine';
    oscillator2.frequency.value = baseFreq * 2;

    oscillator3.type = 'sine';
    oscillator3.frequency.value = baseFreq * 3;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.5;
    const gain3 = ctx.createGain();
    gain3.gain.value = 0.25;

    oscillator1.connect(gainNode);
    oscillator2.connect(gain2);
    gain2.connect(gainNode);
    oscillator3.connect(gain3);
    gain3.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(time);
    oscillator2.start(time);
    oscillator3.start(time);
    oscillator1.stop(time + 0.12);
    oscillator2.stop(time + 0.12);
    oscillator3.stop(time + 0.12);
  }

  private createAnalogBlip(ctx: AudioContext, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const volume = accentLevel === 'first' ? 1.3 : accentLevel === 'normal' ? 1.0 : 0.45;
    const startFreq = accentLevel === 'first' ? 660 : accentLevel === 'normal' ? 550 : 440;
    const endFreq = accentLevel === 'first' ? 330 : accentLevel === 'normal' ? 275 : 220;
    const filterFreq = accentLevel === 'first' ? 1800 : accentLevel === 'normal' ? 1500 : 1200;
    const filterEndFreq = accentLevel === 'first' ? 600 : accentLevel === 'normal' ? 500 : 400;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(startFreq, time);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, time + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    filter.frequency.exponentialRampToValueAtTime(filterEndFreq, time + 0.06);
    filter.Q.value = 4;

    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.06);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(time);
    oscillator.stop(time + 0.06);
  }



  playSoundAt(soundType: MetronomeSound, time: number, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const ctx = this.getAudioContext();

    switch (soundType) {
      case '808-rimshot':
        this.create808Rimshot(ctx, time, accentLevel);
        break;
      case 'woodblock':
        this.createWoodblock(ctx, time, accentLevel);
        break;
      case 'indian-classical':
        this.createIndianClassical(ctx, time, accentLevel);
        break;
      case 'jazz-brush':
        this.createJazzBrush(ctx, time, accentLevel);
        break;
      case 'blues-organ':
        this.createBluesOrgan(ctx, time, accentLevel);
        break;
      case 'rnb-funk':
        this.createRnBFunk(ctx, time, accentLevel);
        break;
      case 'hiphop-clap':
        this.createHiphopClap(ctx, time, accentLevel);
        break;
      case 'synth-bell':
        this.createSynthBell(ctx, time, accentLevel);
        break;
      case 'analog-blip':
        this.createAnalogBlip(ctx, time, accentLevel);
        break;
    }
  }

  playSound(soundType: MetronomeSound, accentLevel: 'none' | 'normal' | 'first' = 'none') {
    const ctx = this.getAudioContext();
    this.playSoundAt(soundType, ctx.currentTime, accentLevel);
  }
}

export const metronomeAudio = new MetronomeAudioEngine();
