import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { DiscImageBackend, DiscImageBuildRequest } from './discImage.js';
import { runPowerShellScript } from './windowsPowerShell.js';

/**
 * PowerShell + COM script that builds a pure UDF image with IMAPI2's
 * `MsftFileSystemImage`. Inputs arrive as environment variables so package paths
 * and volume labels are never interpolated into the script (no command
 * injection). The inline C# helper streams the result image to a file, the
 * well-known IMAPI2 image-writing pattern. Any failure writes to stderr and exits
 * non-zero so the caller can surface it.
 */
const BUILD_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'

Add-Type -CompilerParameters (New-Object System.CodeDom.Compiler.CompilerParameters -Property @{ CompilerOptions = '/unsafe' }) -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices.ComTypes;

public static class OmdImageWriter {
  public unsafe static void Write(string path, object comStream, int blockSize, int totalBlocks) {
    IStream stream = comStream as IStream;
    if (stream == null) { throw new Exception("Result image stream is not an IStream."); }
    int bytes = 0;
    byte[] buffer = new byte[blockSize];
    IntPtr pBytes = (IntPtr)(&bytes);
    using (FileStream file = File.Open(path, FileMode.Create, FileAccess.Write)) {
      while (totalBlocks-- > 0) {
        stream.Read(buffer, blockSize, pBytes);
        file.Write(buffer, 0, bytes);
      }
      file.Flush();
    }
  }
}
'@

try {
  $src = $env:OMD_IMG_SRC
  $out = $env:OMD_IMG_OUT
  $label = $env:OMD_IMG_LABEL

  $fsi = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
  try {
    # FsiFileSystemUDF = 4 (pure UDF, per spec/OMD_DISC_LAYOUT.md).
    $fsi.FileSystemsToCreate = 4
    $fsi.VolumeName = $label
    # AddTree(path, includeBaseDirectory=$false): add package CONTENTS at the root.
    $fsi.Root.AddTree($src, $false)
    $result = $fsi.CreateResultImage()
    [OmdImageWriter]::Write($out, $result.ImageStream, [int]$result.BlockSize, [int]$result.TotalBlocks)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($fsi) | Out-Null
  }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;

/**
 * Windows disc-image backend built on IMAPI2 (`IMAPI2FS.MsftFileSystemImage`).
 * Produces a pure UDF image file and needs no optical drive.
 */
export class WindowsImapiImageBackend implements DiscImageBackend {
  readonly name = 'Windows IMAPI2';

  async isAvailable(): Promise<boolean> {
    return process.platform === 'win32';
  }

  async build(request: DiscImageBuildRequest): Promise<void> {
    const src = path.resolve(request.packageDir);
    const out = path.resolve(request.outPath);
    await mkdir(path.dirname(out), { recursive: true });

    await runPowerShellScript(BUILD_SCRIPT, {
      ...process.env,
      OMD_IMG_SRC: src,
      OMD_IMG_OUT: out,
      OMD_IMG_LABEL: request.volumeLabel,
    });
  }
}
