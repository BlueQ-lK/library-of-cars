"use client";

import { useEffect, useRef } from "react";

type AudioNodes = {
  ctx: AudioContext;
  master: GainNode;
  // engine
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  engineGain: GainNode;
  // tire screech
  noiseGain: GainNode;
};

/**
 * Synthesizes engine + tyre sound from live telemetry using the Web Audio API.
 * - Engine: two detuned sawtooth oscillators whose pitch rises with speed and
 *   whose loudness tracks throttle.
 * - Tyres: filtered noise that swells when lateral G is high (cornering grip).
 *
 * `enabled` gates all sound; the AudioContext is created/resumed lazily so it
 * only starts after a user gesture (e.g. pressing Play).
 */
export function useTrackAudio({
  enabled,
  playing,
  speedKmh,
  throttle,
  latG,
  topSpeedKmh,
}: {
  enabled: boolean;
  playing: boolean;
  speedKmh: number;
  throttle: number;
  latG: number;
  topSpeedKmh: number;
}) {
  const nodesRef = useRef<AudioNodes | null>(null);

  // Build the audio graph once, on first enable.
  useEffect(() => {
    if (!enabled || nodesRef.current) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();

    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    // Engine: two detuned sawtooth oscillators through a lowpass.
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc2.detune.value = 12;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.0001;
    osc1.connect(engineGain);
    osc2.connect(engineGain);
    engineGain.connect(lp);
    lp.connect(master);
    osc1.start();
    osc2.start();

    // Tyre screech: looping white noise through a bandpass.
    const bufSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    bp.Q.value = 1.2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0001;
    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    nodesRef.current = { ctx, master, osc1, osc2, engineGain, noiseGain };

    return () => {
      try {
        osc1.stop();
        osc2.stop();
        noise.stop();
        ctx.close();
      } catch {
        /* already closed */
      }
      nodesRef.current = null;
    };
  }, [enabled]);

  // Update synth parameters from telemetry each render.
  useEffect(() => {
    const n = nodesRef.current;
    if (!n) return;
    const { ctx, master, osc1, osc2, engineGain, noiseGain } = n;
    const active = enabled && playing;

    if (active && ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const ramp = 0.08;

    // Master fades in/out with active state.
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(active ? 0.6 : 0.0, now, ramp);

    // Engine pitch: idle → redline mapped to speed fraction (with a little rev).
    const frac = Math.min(1, Math.max(0, speedKmh / Math.max(60, topSpeedKmh)));
    const base = 55 + frac * 240; // Hz
    osc1.frequency.setTargetAtTime(base, now, ramp);
    osc2.frequency.setTargetAtTime(base * 1.5, now, ramp);
    engineGain.gain.setTargetAtTime(active ? 0.05 + throttle * 0.13 : 0.0001, now, ramp);

    // Tyre screech swells past ~0.9 g of lateral load.
    const screech = Math.max(0, latG - 0.9) / 1.2;
    noiseGain.gain.setTargetAtTime(active ? Math.min(0.25, screech * 0.25) : 0.0001, now, ramp);
  }, [enabled, playing, speedKmh, throttle, latG, topSpeedKmh]);
}
