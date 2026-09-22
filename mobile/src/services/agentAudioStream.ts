import { AudioModule } from 'expo-audio';
import type { AudioStreamBuffer } from 'expo-audio';
import { arrayBufferToBase64 } from './audioEncoding';
import { logger } from './logger';

const STREAM_BUFFER_EVENT = 'audioStreamBuffer';

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

    this.stream = new AudioModule.AudioStream({
      sampleRate: 16000,
      channels: 1,
      encoding: 'int16',
    });

    this.subscription = this.stream.addListener(
      STREAM_BUFFER_EVENT,
      (buffer: AudioStreamBuffer) => {
        const amplitude = pcmAmplitude(buffer.data);
        onChunk({
          base64: arrayBufferToBase64(buffer.data),
          amplitude,
          sampleRate: buffer.sampleRate,
        });
      },
    );

    await this.stream.start();
    logger.info('agentAudioStream', 'PCM stream started', {
      sampleRate: this.stream.sampleRate,
      channels: this.stream.channels,
    });
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
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const n = samples[i]! / 32768;
    sum += n * n;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}
