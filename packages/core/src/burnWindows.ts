import path from 'node:path';
import type { BurnBackend, BurnDrive, BurnImageRequest } from './burn.js';
import { runPowerShellScript } from './windowsPowerShell.js';

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
  try { $rec.EjectMedia() } catch { }
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
