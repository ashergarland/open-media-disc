import { spawn } from 'node:child_process';
import type { AudioCodec } from './constants.js';

/** Options for {@link convertAudioFile}. */
export interface ConvertAudioOptions {
  /** Absolute path to an ffmpeg executable (e.g. from `ffmpeg-static`). */
  ffmpegPath: string;
  /** Source audio file to read. */
  input: string;
  /** Destination file to write. Its extension should match `codec`. */
  output: string;
  /** Target audio codec to encode to. */
  codec: AudioCodec;
  /**
   * Target bitrate in kbps for lossy codecs (MP3, AAC, Vorbis, Opus). Ignored
   * for lossless codecs (FLAC, WAV). When omitted a sensible quality default is
   * used.
   */
  bitrateKbps?: number;
}

/**
 * ffmpeg encoder arguments per codec. Lossy codecs use a good-quality VBR
 * default; an explicit `-b:a` bitrate is appended by {@link convertAudioFile}
 * when the caller requests one.
 */
const CODEC_ENCODER_ARGS: Record<AudioCodec, string[]> = {
  FLAC: ['-c:a', 'flac'],
  MP3: ['-c:a', 'libmp3lame', '-q:a', '2'],
  AAC: ['-c:a', 'aac', '-q:a', '1.2'],
  Vorbis: ['-c:a', 'libvorbis', '-q:a', '6'],
  Opus: ['-c:a', 'libopus', '-b:a', '160k'],
  WAV: ['-c:a', 'pcm_s16le'],
};

const LOSSY_CODECS: readonly AudioCodec[] = ['MP3', 'AAC', 'Vorbis', 'Opus'];

/** Whether ffmpeg-based conversion supports encoding to the given codec. */
export function canConvertTo(codec: AudioCodec): boolean {
  return codec in CODEC_ENCODER_ARGS;
}

/**
 * Transcode a single audio file to another codec using ffmpeg. The output
 * container is inferred from `output`'s extension, so it must match `codec`
 * (e.g. `.mp3` for MP3). Video/artwork streams are dropped (`-vn`).
 *
 * Rejects with a descriptive error (including ffmpeg's stderr tail) on failure.
 */
export function convertAudioFile(opts: ConvertAudioOptions): Promise<void> {
  const encoderArgs = [...CODEC_ENCODER_ARGS[opts.codec]];
  if (opts.bitrateKbps && LOSSY_CODECS.includes(opts.codec)) {
    // Replace any default quality flag with an explicit target bitrate.
    const qFlag = encoderArgs.indexOf('-q:a');
    if (qFlag !== -1) encoderArgs.splice(qFlag, 2);
    const bFlag = encoderArgs.indexOf('-b:a');
    if (bFlag !== -1) encoderArgs.splice(bFlag, 2);
    encoderArgs.push('-b:a', `${opts.bitrateKbps}k`);
  }

  const args = [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    opts.input,
    '-vn',
    ...encoderArgs,
    opts.output,
  ];

  return new Promise<void>((resolve, reject) => {
    let stderr = '';
    let child;
    try {
      child = spawn(opts.ffmpegPath, args, { windowsHide: true });
    } catch (err) {
      reject(new Error(`Failed to start ffmpeg: ${(err as Error).message}`));
      return;
    }
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 8192) stderr = stderr.slice(-8192);
    });
    child.on('error', (err) => {
      reject(new Error(`Failed to run ffmpeg: ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const tail = stderr.trim().split('\n').slice(-3).join(' ');
        reject(new Error(`ffmpeg exited with code ${code}${tail ? `: ${tail}` : ''}`));
      }
    });
  });
}
