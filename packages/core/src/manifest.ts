import { z } from 'zod';
import {
  AUDIO_CODEC,
  DEFAULT_FILESYSTEM_TARGET,
  DEFAULT_MEDIA_TYPE,
  OMD_FORMAT,
  OMD_VERSION,
} from './constants.js';

/**
 * Zod schema for a single OMD manifest track entry.
 * Mirrors the `tracks[]` definition in `spec/OMD_MANIFEST_SCHEMA.json`.
 */
export const trackSchema = z
  .object({
    number: z.number().int().min(1),
    title: z.string().min(1),
    filename: z
      .string()
      .regex(/^AUDIO\/.+\.flac$/, 'track filename must be a relative AUDIO/<name>.flac path'),
    durationSeconds: z.number().min(0).optional(),
    sizeBytes: z.number().int().min(0),
    sha256: z.string().regex(/^[a-f0-9]{64}$/, 'sha256 must be 64 lowercase hex chars'),
  })
  .strict();

/**
 * Zod schema for the full OMD manifest.
 * Mirrors `spec/OMD_MANIFEST_SCHEMA.json` and is the runtime source of truth
 * for `validateManifest()`.
 */
export const manifestSchema = z
  .object({
    omdFormat: z.literal(OMD_FORMAT),
    omdVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'omdVersion must be semver x.y.z'),
    discId: z
      .string()
      .min(1, 'discId (disc title) must not be empty')
      .max(200, 'discId must be at most 200 characters'),
    mediaType: z.string().min(1),
    filesystemTarget: z.enum(['UDF', 'ISO9660', 'ISO9660+UDF']),
    artist: z.string().min(1),
    album: z.string().min(1),
    releaseYear: z.number().int().min(1900).max(2200).optional(),
    audioCodec: z.literal(AUDIO_CODEC),
    trackCount: z.number().int().min(1),
    totalDurationSeconds: z.number().min(0),
    totalSizeBytes: z.number().int().min(0),
    coverArt: z.string().min(1).optional(),
    booklet: z.string().min(1).optional(),
    tracks: z.array(trackSchema).min(1),
    createdAt: z.string().datetime(),
    generator: z
      .object({
        name: z.string().min(1),
        version: z.string().min(1),
      })
      .strict(),
  })
  .strict();

/** A validated OMD manifest track. */
export type OmdTrack = z.infer<typeof trackSchema>;

/** A validated OMD manifest. */
export type OmdManifest = z.infer<typeof manifestSchema>;

/** Result of {@link validateManifest}. */
export interface ManifestValidationResult {
  valid: boolean;
  /** Present when `valid` is true. */
  manifest?: OmdManifest;
  /** Human-readable issues, empty when valid. */
  issues: string[];
}

/** Inputs used to build a manifest via {@link createManifest}. */
export interface CreateManifestInput {
  discId: string;
  artist: string;
  album: string;
  releaseYear?: number;
  tracks: OmdTrack[];
  coverArt?: string;
  booklet?: string;
  mediaType?: string;
  filesystemTarget?: 'UDF' | 'ISO9660' | 'ISO9660+UDF';
  generator: { name: string; version: string };
  /** Defaults to `new Date()`. Accepts a Date for deterministic output in tests. */
  createdAt?: Date;
}

/**
 * Build a normalized, schema-valid OMD manifest from track metadata and
 * project settings. Derives `trackCount`, `totalDurationSeconds`, and
 * `totalSizeBytes` from the provided tracks so callers cannot desync them.
 */
export function createManifest(input: CreateManifestInput): OmdManifest {
  const tracks = [...input.tracks].sort((a, b) => a.number - b.number);

  const totalDurationSeconds = tracks.reduce((sum, t) => sum + (t.durationSeconds ?? 0), 0);
  const totalSizeBytes = tracks.reduce((sum, t) => sum + t.sizeBytes, 0);

  const manifest: OmdManifest = {
    omdFormat: OMD_FORMAT,
    omdVersion: OMD_VERSION,
    discId: input.discId,
    mediaType: input.mediaType ?? DEFAULT_MEDIA_TYPE,
    filesystemTarget: input.filesystemTarget ?? DEFAULT_FILESYSTEM_TARGET,
    artist: input.artist,
    album: input.album,
    ...(input.releaseYear !== undefined ? { releaseYear: input.releaseYear } : {}),
    audioCodec: AUDIO_CODEC,
    trackCount: tracks.length,
    totalDurationSeconds,
    totalSizeBytes,
    ...(input.coverArt ? { coverArt: input.coverArt } : {}),
    ...(input.booklet ? { booklet: input.booklet } : {}),
    tracks,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
    generator: input.generator,
  };

  // Validate our own output so createManifest never emits an invalid manifest.
  return manifestSchema.parse(manifest);
}

/** Parse a manifest from a JSON string. Throws on invalid JSON. */
export function parseManifest(json: string): unknown {
  return JSON.parse(json);
}

/**
 * Validate an unknown value against the OMD manifest schema.
 * Returns a structured result rather than throwing.
 */
export function validateManifest(data: unknown): ManifestValidationResult {
  const parsed = manifestSchema.safeParse(data);
  if (parsed.success) {
    return { valid: true, manifest: parsed.data, issues: [] };
  }
  const issues = parsed.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { valid: false, issues };
}

/** Serialize a manifest to a stable, pretty-printed JSON string. */
export function stringifyManifest(manifest: OmdManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
