import path from 'node:path';
import { MANIFEST_FILENAME } from './constants.js';
import type {
  BurnBackend,
  BurnDrive,
  BurnImageRequest,
  MediaInfo,
  DiscMediaKind,
} from './burn.js';
import { runPowerShellScript } from './windowsPowerShell.js';

/**
 * IMAPI `IMAPI_MEDIA_PHYSICAL_TYPE` values mapped to a friendly name and whether
 * the media is rewritable or write-once. Read-only ROM types map to `unknown`.
 */
const MEDIA_TYPES: Record<number, { kind: DiscMediaKind; name: string }> = {
  1: { kind: 'unknown', name: 'CD-ROM' },
  2: { kind: 'write-once', name: 'CD-R' },
  3: { kind: 'rewritable', name: 'CD-RW' },
  4: { kind: 'unknown', name: 'DVD-ROM' },
  5: { kind: 'rewritable', name: 'DVD-RAM' },
  6: { kind: 'write-once', name: 'DVD+R' },
  7: { kind: 'rewritable', name: 'DVD+RW' },
  8: { kind: 'write-once', name: 'DVD+R DL' },
  9: { kind: 'write-once', name: 'DVD-R' },
  10: { kind: 'rewritable', name: 'DVD-RW' },
  11: { kind: 'write-once', name: 'DVD-R DL' },
  13: { kind: 'rewritable', name: 'DVD+RW DL' },
  14: { kind: 'unknown', name: 'HD DVD-ROM' },
  15: { kind: 'write-once', name: 'HD DVD-R' },
  16: { kind: 'rewritable', name: 'HD DVD-RAM' },
  17: { kind: 'unknown', name: 'BD-ROM' },
  18: { kind: 'write-once', name: 'BD-R' },
  19: { kind: 'rewritable', name: 'BD-RE' },
};

/**
 * Windows burn backend built on IMAPI2 (`IMAPI2.MsftDiscMaster2`,
 * `MsftDiscRecorder2`, `MsftDiscFormat2Data`, `MsftDiscFormat2Erase`).
 *
 * Drive enumeration ({@link listDrives}) is read-only and safe. Blanking and
 * writing are destructive and require a rewritable disc in the drive; they are
 * validated manually, not in CI. Inputs are passed via environment variables so
 * paths and ids are never interpolated into a script.
 */

/** Enumerate optical recorders. Read-only. */
const LIST_DRIVES_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $dm = New-Object -ComObject IMAPI2.MsftDiscMaster2
  $parts = foreach ($id in $dm) {
    $rec = New-Object -ComObject IMAPI2.MsftDiscRecorder2
    $rec.InitializeDiscRecorder($id)
    $mount = @($rec.VolumePathNames)[0]
    [pscustomobject]@{
      id = $id
      mountPath = $mount
      description = (("{0} {1}" -f $rec.VendorId, $rec.ProductId).Trim())
    } | ConvertTo-Json -Compress
  }
  '[' + (@($parts) -join ',') + ']'
} catch {
  [Console]::Error.WriteLine($_.Exception.Message); exit 1
}
`;

/** Report whether the media currently in the recorder is blank. */
const IS_BLANK_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $rec = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $rec.InitializeDiscRecorder($env:OMD_REC_ID)
  $data = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
  $data.Recorder = $rec
  $data.ClientName = 'Open Media Disc'
  if ($data.MediaHeuristicallyBlank) { 'true' } else { 'false' }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message); exit 1
}
`;

/** Probe the media type, blank state, and capacity of the disc in the recorder. */
const PROBE_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$absent = '{"present":false,"type":0,"blank":false,"sectors":0}'
try {
  $rec = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $rec.InitializeDiscRecorder($env:OMD_REC_ID)
  $data = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
  # With an empty tray IMAPI may refuse the recorder outright rather than
  # reporting a media type, so treat any failure here as "no disc loaded".
  try {
    $data.Recorder = $rec
    $data.ClientName = 'Open Media Disc'
  } catch { $absent; exit 0 }
  $type = 0
  try { $type = [int]$data.CurrentPhysicalMediaType } catch { $type = 0 }
  if ($type -eq 0) { $absent; exit 0 }
  $blank = $false
  $sectors = 0
  try { $blank = [bool]$data.MediaHeuristicallyBlank } catch { $blank = $false }
  try { $sectors = [long]$data.TotalSectorsOnMedia } catch { $sectors = 0 }
  [pscustomobject]@{ present = $true; type = $type; blank = $blank; sectors = $sectors } | ConvertTo-Json -Compress
} catch {
  [Console]::Error.WriteLine($_.Exception.Message); exit 1
}
`;

/** Quick-erase a rewritable disc. DESTRUCTIVE. */
const BLANK_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $rec = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $rec.InitializeDiscRecorder($env:OMD_REC_ID)
  $erase = New-Object -ComObject IMAPI2.MsftDiscFormat2Erase
  $erase.Recorder = $rec
  $erase.ClientName = 'Open Media Disc'
  $erase.FullErase = $false
  $erase.EraseMedia()
} catch {
  [Console]::Error.WriteLine($_.Exception.Message); exit 1
}
`;

/** Write an image file to the disc. DESTRUCTIVE. */
const WRITE_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public static class OmdStreamFactory {
  [DllImport("shlwapi.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
  static extern int SHCreateStreamOnFileEx(string pszFile, uint grfMode, uint dwAttributes, bool fCreate, IStream pstmTemplate, out IStream ppstm);

  public static IStream Open(string path) {
    IStream stream;
    // STGM_READ (0x0) | STGM_SHARE_DENY_WRITE (0x20); FILE_ATTRIBUTE_NORMAL (0x80)
    int hr = SHCreateStreamOnFileEx(path, 0x20u, 0x80u, false, null, out stream);
    if (hr != 0) { throw new Exception("SHCreateStreamOnFileEx failed: 0x" + hr.ToString("X8")); }
    return stream;
  }
}
'@

try {
  $rec = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $rec.InitializeDiscRecorder($env:OMD_REC_ID)
  $data = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
  $data.Recorder = $rec
  $data.ClientName = 'Open Media Disc'
  $stream = [OmdStreamFactory]::Open($env:OMD_BURN_IMG)
  $data.Write($stream)
} catch {
  [Console]::Error.WriteLine($_.Exception.Message); exit 1
}
`;

/**
 * Force Windows to re-read the freshly burned disc without a physical reinsert.
 *
 * Right after an IMAPI2 burn the OS still shows the pre-burn (blank) volume, so a
 * read-back verify fails. This first dismounts the volume (no tray movement) and
 * waits for the new UDF filesystem to appear; if that is not enough it performs a
 * software eject + load cycle (the equivalent of reinserting) and waits again.
 * Readiness is confirmed by the presence of the manifest at the mount root.
 */
const REMOUNT_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class OmdDisc {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern IntPtr CreateFileW(string name, uint access, uint share, IntPtr sec, uint disp, uint flags, IntPtr tmpl);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool DeviceIoControl(IntPtr h, uint code, IntPtr inBuf, uint inSize, IntPtr outBuf, uint outSize, out uint ret, IntPtr ov);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool CloseHandle(IntPtr h);

  const uint GENERIC_READ = 0x80000000;
  const uint FILE_SHARE_READ = 1, FILE_SHARE_WRITE = 2;
  const uint OPEN_EXISTING = 3;
  const uint FSCTL_DISMOUNT_VOLUME = 0x00090020;
  const uint IOCTL_STORAGE_EJECT_MEDIA = 0x002D4808;
  const uint IOCTL_STORAGE_LOAD_MEDIA = 0x002D480C;

  static bool Ioctl(string letter, uint code) {
    IntPtr h = CreateFileW("\\\\.\\" + letter, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
    if (h == (IntPtr)(-1)) { return false; }
    try { uint r; return DeviceIoControl(h, code, IntPtr.Zero, 0, IntPtr.Zero, 0, out r, IntPtr.Zero); }
    finally { CloseHandle(h); }
  }
  public static bool Dismount(string letter) { return Ioctl(letter, FSCTL_DISMOUNT_VOLUME); }
  public static bool Eject(string letter) { return Ioctl(letter, IOCTL_STORAGE_EJECT_MEDIA); }
  public static bool Load(string letter) { return Ioctl(letter, IOCTL_STORAGE_LOAD_MEDIA); }
}
'@

$drive = $env:OMD_DRIVE
$ready = $env:OMD_READY_FILE
function Test-Ready { Test-Path -LiteralPath $ready }

# Attempt 1: dismount and let Windows re-read the disc (no tray movement).
[OmdDisc]::Dismount($drive) | Out-Null
for ($i = 0; $i -lt 12; $i++) { if (Test-Ready) { exit 0 }; Start-Sleep -Milliseconds 700 }

# Attempt 2: software eject + load cycle (equivalent to reinserting the disc).
[OmdDisc]::Eject($drive) | Out-Null
Start-Sleep -Milliseconds 1000
[OmdDisc]::Load($drive) | Out-Null
for ($i = 0; $i -lt 25; $i++) { if (Test-Ready) { exit 0 }; Start-Sleep -Milliseconds 800 }

[Console]::Error.WriteLine("Disc did not remount after burning. Reinsert the disc and run: omd checksum $drive\")
exit 1
`;

/** Eject the disc. Used as the completion signal after a successful burn. */
const EJECT_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $rec = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $rec.InitializeDiscRecorder($env:OMD_REC_ID)
  $rec.EjectMedia()
} catch {
  [Console]::Error.WriteLine($_.Exception.Message); exit 1
}
`;

interface RawDrive {
  id: string;
  mountPath: string;
  description?: string;
}

export class WindowsImapiBurnBackend implements BurnBackend {
  readonly name = 'Windows IMAPI2';

  async isAvailable(): Promise<boolean> {
    return process.platform === 'win32';
  }

  async listDrives(): Promise<BurnDrive[]> {
    const out = await runPowerShellScript(LIST_DRIVES_SCRIPT, { ...process.env });
    const raw = JSON.parse(out.trim() || '[]') as RawDrive[];
    return raw.map((d) => ({
      mountPath: d.mountPath,
      id: d.id,
      ...(d.description ? { description: d.description } : {}),
    }));
  }

  async isBlank(drive: BurnDrive): Promise<boolean> {
    const out = await runPowerShellScript(IS_BLANK_SCRIPT, {
      ...process.env,
      OMD_REC_ID: this.recorderId(drive),
    });
    return out.trim() === 'true';
  }

  async probeMedia(drive: BurnDrive): Promise<MediaInfo> {
    const out = await runPowerShellScript(PROBE_SCRIPT, {
      ...process.env,
      OMD_REC_ID: this.recorderId(drive),
    });
    const raw = JSON.parse(out.trim() || '{}') as {
      present?: boolean;
      type?: number;
      blank?: boolean;
      sectors?: number;
    };
    const mapped = raw.type !== undefined ? MEDIA_TYPES[raw.type] : undefined;
    return {
      present: raw.present === true,
      kind: mapped?.kind ?? 'unknown',
      blank: raw.blank === true,
      ...(mapped?.name ? { typeName: mapped.name } : {}),
      ...(raw.sectors && raw.sectors > 0 ? { capacityBytes: raw.sectors * 2048 } : {}),
    };
  }

  async blank(drive: BurnDrive): Promise<void> {
    await runPowerShellScript(BLANK_SCRIPT, {
      ...process.env,
      OMD_REC_ID: this.recorderId(drive),
    });
  }

  async writeImage(request: BurnImageRequest): Promise<void> {
    await runPowerShellScript(WRITE_SCRIPT, {
      ...process.env,
      OMD_REC_ID: this.recorderId(request.drive),
      OMD_BURN_IMG: path.resolve(request.imagePath),
    });
  }

  async remount(drive: BurnDrive): Promise<void> {
    const driveLetter = drive.mountPath.replace(/[\\/]+$/, '');
    const readyFile = path.join(drive.mountPath, MANIFEST_FILENAME);
    await runPowerShellScript(REMOUNT_SCRIPT, {
      ...process.env,
      OMD_DRIVE: driveLetter,
      OMD_READY_FILE: readyFile,
    });
  }

  async eject(drive: BurnDrive): Promise<void> {
    await runPowerShellScript(EJECT_SCRIPT, {
      ...process.env,
      OMD_REC_ID: this.recorderId(drive),
    });
  }

  private recorderId(drive: BurnDrive): string {
    if (!drive.id) {
      throw new Error(
        `Burn drive is missing its IMAPI2 recorder id (mountPath ${drive.mountPath}). ` +
          `Use a drive returned by listDrives().`,
      );
    }
    return drive.id;
  }
}
