/** Short UI chimes — respects user “sound effects” preference from caller. */

export function playTimerChime(kind: 'start' | 'end'): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = kind === 'start' ? 720 : 480;
    gain.gain.value = 0.06;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    /* autoplay / unsupported */
  }
}

export function tryDesktopNotify(title: string, body: string): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}

export async function ensureNotifyPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
