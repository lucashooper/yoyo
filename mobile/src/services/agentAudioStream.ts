import { AudioModule } from 'expo-audio';
import type { AudioStreamBuffer } from 'expo-audio';
import { arrayBufferToBase64 } from './audioEncoding';
import { logger } from './logger';

const STREAM_BUFFER_EVENT = 'audioStreamBuffer';
const DEFAULT_SAMPLE_RATE = 16000;

export type PcmChunkHandler = (chunk: {
  base64: string;
  amplitude: number;
  sampleRate: number;
}) => void;

/** Real-time PCM capture for ElevenLabs convai (16 kHz mono int16). */
export class AgentAudioStream {
  private stream: InstanceType<typeof AudioModule.AudioStream> | null = null;
  private subscription: { remove: () => void } | null = null;

  async start(onChunk: PcmChunkHandler): Promise<void> {
    await this.stop();

    const stream = new AudioModule.AudioStream({
      sampleRate: DEFAULT_SAMPLE_RATE,
      channels: 1,
      encoding: 'int16',
    });
    this.stream = stream;

    let chunkCount = 0;

    try {
      this.subscription = stream.addListener(
        STREAM_BUFFER_EVENT,
        (buffer: AudioStreamBuffer | null) => {
          if (!buffer?.data?.byteLength) return;

          chunkCount += 1;
          const amplitude = pcmAmplitude(buffer.data);
          const sampleRate =
            buffer?.sampleRate ?? stream?.sampleRate ?? this.stream?.sampleRate ?? DEFAULT_SAMPLE_RATE;

          if (chunkCount === 1) {
            logger.info('agentAudioStream', 'First PCM buffer received', {
              bytes: buffer.data.byteLength,
              amplitude: Number(amplitude.toFixed(3)),
              sampleRate,
            });
          }

          onChunk({
            base64: arrayBufferToBase64(buffer.data),
            amplitude,
            sampleRate,
          });
        },
      );

      await stream.start();

      // Use the local stream ref — stop() may clear this.stream during reconnect races.
      logger.info('agentAudioStream', 'PCM stream started', {
        sampleRate: stream?.sampleRate ?? DEFAULT_SAMPLE_RATE,
        channels: stream?.channels ?? 1,
      });
    } catch (err) {
      await this.stop();
      logger.error('agentAudioStream', 'Failed to start PCM stream — check mic permission', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    this.subscription?.remove();
    this.subscription = null;
    if (this.stream) {
      try {
        this.stream.stop();
      } catch {
        // ignore
      }
      this.stream = null;
    }
  }
}

function pcmAmplitude(data: ArrayBuffer): number {
  const samples = new Int16Array(data);
  if (samples.length === 0) return 0;

  let peak = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const n = Math.abs(samples[i]!) / 32768;
    peak = Math.max(peak, n);
    sum += n * n;
  }

  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, Math.max(rms * 10, peak * 6));
}
