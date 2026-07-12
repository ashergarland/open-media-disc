import type { OmdStudioApi } from '../shared/types';

declare global {
  interface Window {
    omd: OmdStudioApi;
  }
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function setListMessage(list: HTMLElement, message: string): void {
  list.textContent = '';
  const item = document.createElement('li');
  item.textContent = message;
  list.appendChild(item);
}

async function main(): Promise<void> {
  try {
    const info = await window.omd.getInfo();
    setText(
      'info',
      `OMD Studio ${info.studioVersion} - format ${info.omdFormat} v${info.omdVersion} - ` +
        `Electron ${info.electron}, Node ${info.node}`,
    );
  } catch (err) {
    setText('info', `Failed to load version info: ${(err as Error).message}`);
  }

  const list = document.getElementById('drive-list');
  if (!list) {
    return;
  }

  try {
    const drives = await window.omd.listDrives();
    if (drives.length === 0) {
      setListMessage(list, 'No optical drives detected (burning is Windows-only).');
      return;
    }
    list.textContent = '';
    for (const drive of drives) {
      const item = document.createElement('li');
      item.textContent = drive.description
        ? `${drive.mountPath} - ${drive.description}`
        : drive.mountPath;
      list.appendChild(item);
    }
  } catch (err) {
    setListMessage(list, `Failed to list drives: ${(err as Error).message}`);
  }
}

void main();
