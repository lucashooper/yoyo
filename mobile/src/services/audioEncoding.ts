/**
 * Encode ArrayBuffer to base64 without spreading into call stack
 * (large audio buffers crash with String.fromCharCode(...arr)).
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Wrap raw PCM16 LE mono/stereo in a WAV container for expo-audio playback. */
export function pcm16ToWav(
  pcm: ArrayBuffer,
  sampleRate = 16000,
  channels = 1,
): ArrayBuffer {
  const pcmBytes = new Uint8Array(pcm);
  const headerSize = 44;
  const wav = new ArrayBuffer(headerSize + pcmBytes.length);
  const view = new DataView(wav);

  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcmBytes.length, true);
  new Uint8Array(wav).set(pcmBytes, headerSize);
  return wav;
}

export function parsePcmSampleRate(format: string | undefined): number {
  if (!format) return 16000;
  const match = format.match(/pcm_(\d+)/i);
  return match ? parseInt(match[1]!, 10) : 16000;
}
