export type ChimeType = "arrival" | "alert" | "recovery";

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedAudioContext) return sharedAudioContext;

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null;

  try {
    sharedAudioContext = new AudioContextCtor();
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Unlocks Web Audio API on first user gesture (required on iOS Safari/WebKit).
 */
export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ignore unlock errors on restricted contexts
  }
}

function scheduleTone(
  ctx: AudioContext,
  options: {
    frequency: number;
    startOffset: number;
    duration: number;
    gainPeak: number;
    waveType: OscillatorType;
  },
): void {
  const { frequency, startOffset, duration, gainPeak, waveType } = options;
  const now = ctx.currentTime + startOffset;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveType;
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/**
 * Plays a synthesized notification chime via Web Audio API without external audio files.
 * Returns recommended delay (ms) before starting TTS so speech does not overlap the chime.
 */
export function playNotificationChime(type: ChimeType): number {
  const ctx = getAudioContext();
  if (!ctx) return 0;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    if (type === "arrival") {
      // 일반 도착/하차 알림: 부드러운 2음 상승 차임벨 (C5 -> G5)
      scheduleTone(ctx, {
        frequency: 523.25,
        startOffset: 0,
        duration: 0.16,
        gainPeak: 0.18,
        waveType: "sine",
      });
      scheduleTone(ctx, {
        frequency: 783.99,
        startOffset: 0.14,
        duration: 0.24,
        gainPeak: 0.2,
        waveType: "sine",
      });
      return 380;
    }

    if (type === "alert") {
      // 경로 이상 경고: 주의 환기용 뚜렷한 3연속 알림음 (A5 x 3)
      [0, 0.16, 0.32].forEach((offset) => {
        scheduleTone(ctx, {
          frequency: 880,
          startOffset: offset,
          duration: 0.12,
          gainPeak: 0.2,
          waveType: "triangle",
        });
      });
      return 500;
    }

    // 버스 놓침 / 하차 실패: 차분한 1음 안심 알림음 (G4)
    scheduleTone(ctx, {
      frequency: 392,
      startOffset: 0,
      duration: 0.34,
      gainPeak: 0.18,
      waveType: "sine",
    });
    return 380;
  } catch {
    return 0;
  }
}
