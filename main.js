const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// ── 데이터 저장 경로 (사용자별 앱 데이터 폴더) ──
const DATA_DIR = app.getPath('userData');
const DATA_FILE = path.join(DATA_DIR, 'moa-data.json');

let mainWindow = null;
let tray = null;
let alarmTimers = []; // 예약된 알림 타이머들

// ── 데이터 읽기/쓰기 ──
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('데이터 로드 실패:', e);
  }
  return null; // 없으면 null → 렌더러가 기본 데이터로 시작
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('데이터 저장 실패:', e);
    return false;
  }
}

// ── 창 생성 ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 1100,
    minHeight: 700,
    title: '모아 캘린더',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#f4f2f8',
    frame: false,          // Windows 기본 타이틀바 제거
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 상단 메뉴바 숨김 (Alt로 잠깐 보이게 하려면 아래 줄 제거)
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 닫기 → 트레이로 최소화 (알림 계속 받으려고). 완전 종료는 트레이 메뉴에서.
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── 트레이 아이콘 ──
function createTray() {
  try {
    tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'));
    const menu = Menu.buildFromTemplate([
      { label: '모아 캘린더 열기', click: () => { mainWindow.show(); } },
      { type: 'separator' },
      { label: '종료', click: () => { app.isQuitting = true; app.quit(); } },
    ]);
    tray.setToolTip('모아 캘린더');
    tray.setContextMenu(menu);
    tray.on('double-click', () => mainWindow.show());
  } catch (e) {
    console.error('트레이 생성 실패(아이콘 없음일 수 있음):', e);
  }
}

// ── 알림 스케줄링 ──
// 렌더러가 일정 전체를 넘겨주면, 앞으로 울릴 알림들을 setTimeout으로 예약
function clearAlarms() {
  alarmTimers.forEach((t) => clearTimeout(t));
  alarmTimers = [];
}

function scheduleAlarms(events, soundOn, soundType) {
  clearAlarms();
  const now = Date.now();
  const MAX_DELAY = 2 ** 31 - 1; // setTimeout 최대치(약 24.8일)

  Object.entries(events || {}).forEach(([dateKey, list]) => {
    (list || []).forEach((ev) => {
      if (!ev.alarm || !ev.time) return;
      const [y, m, d] = dateKey.split('-').map(Number);
      const [hh, mm] = ev.time.split(':').map(Number);
      const target = new Date(y, m - 1, d, hh, mm, 0).getTime();
      const lead = (ev.lead || 0) * 60 * 1000; // 분 → ms
      const fireAt = target - lead;
      const delay = fireAt - now;
      if (delay <= 0 || delay > MAX_DELAY) return; // 지났거나 너무 먼 건 스킵

      const timer = setTimeout(() => {
        fireNotification(ev, soundOn, soundType);
      }, delay);
      alarmTimers.push(timer);
    });
  });
}

function fireNotification(ev, soundOn, soundType) {
  // OS 네이티브 알림
  const leadText = ev.lead ? `${ev.lead}분 후 ` : '';
  const n = new Notification({
    title: '🔔 모아 캘린더',
    body: `${leadText}${ev.title}${ev.time ? ' (' + ev.time + ')' : ''}`,
    silent: true, // 소리는 우리가 직접 재생 (종류 선택 반영 위해)
  });
  n.on('click', () => { if (mainWindow) mainWindow.show(); });
  n.show();

  // 창이 살아있으면 렌더러에서 소리 재생 (선택한 소리 종류로)
  if (soundOn && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('play-alarm-sound', soundType);
    // 알림이 오면 창을 잠깐 깜빡여 주의 환기
    mainWindow.flashFrame(true);
  }
}

// ── IPC: 렌더러 ↔ 메인 ──
ipcMain.handle('load-data', () => loadData());
ipcMain.handle('save-data', (e, data) => saveData(data));

// 창 제어 (커스텀 타이틀바용)
ipcMain.on('win-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('win-close', () => { if (mainWindow) mainWindow.hide(); }); // 트레이로 내려감
ipcMain.handle('reschedule-alarms', (e, payload) => {
  scheduleAlarms(payload.events, payload.soundOn, payload.soundType);
  return true;
});
// 테스트용: 렌더러가 "지금 알림 미리보기" 요청
ipcMain.handle('test-notification', (e, soundType) => {
  fireNotification({ title: '테스트 알림이에요', time: null, lead: 0 }, true, soundType);
  return true;
});

// ── 단일 인스턴스 보장 (두 번 켜져도 창 하나만) ──
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // 이미 실행 중이면 이 두 번째 인스턴스는 바로 종료
  app.quit();
} else {
  // 두 번째로 켜려 하면, 기존 창을 복구해서 보여줌
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // ── 앱 라이프사이클 ──
  app.whenReady().then(() => {
    createWindow();
    createTray();
    setupAutoUpdate();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// ── 자동 업데이트 ──
function setupAutoUpdate() {
  if (!app.isPackaged) return; // 개발 모드에선 확인 안 함

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    const res = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      buttons: ['지금 업데이트', '나중에'],
      defaultId: 0,
      title: '새 버전이 있어요',
      message: `모아 캘린더 ${info.version} 버전이 준비됐어요.`,
      detail: '지금 업데이트하면 앱을 다시 시작해요.',
    });
    if (res === 0) {
      app.isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('업데이트 확인 실패:', err);
  });

  autoUpdater.checkForUpdates().catch((e) => console.error(e));
}

app.on('window-all-closed', () => {
  // 트레이 상주라 여기선 종료 안 함 (macOS 관례와 동일하게 둠)
  if (process.platform !== 'darwin') {
    // 트레이로 계속 돌리려면 아무것도 안 함. 완전 종료 원하면 app.quit();
  }
});

app.on('before-quit', () => { app.isQuitting = true; });
