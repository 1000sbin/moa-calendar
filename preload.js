const { contextBridge, ipcRenderer } = require('electron');

// 렌더러(웹 화면)에서 window.moaAPI 로 접근
contextBridge.exposeInMainWorld('moaAPI', {
  // 데이터 저장/불러오기
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // 알림 재예약 (일정이 바뀔 때마다 호출)
  rescheduleAlarms: (payload) => ipcRenderer.invoke('reschedule-alarms', payload),

  // 테스트 알림
  testNotification: (soundType) => ipcRenderer.invoke('test-notification', soundType),

  // 메인 → 렌더러: 알림 시각에 소리 재생하라는 신호
  onPlayAlarmSound: (callback) => {
    ipcRenderer.on('play-alarm-sound', (event, soundType) => callback(soundType));
  },

  // 창 제어 (커스텀 타이틀바)
  minimizeWindow: () => ipcRenderer.send('win-minimize'),
  closeWindow: () => ipcRenderer.send('win-close'),
});
