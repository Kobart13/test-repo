// Pomodoro Timer Logic
class PomodoroTimer {
  constructor() {
    this.totalSeconds = 25 * 60; // Default 25 minutes
    this.remainingSeconds = this.totalSeconds;
    this.isRunning = false;
    this.intervalId = null;

    this.initElements();
    this.initEventListeners();
    this.updateDisplay();
  }

  initElements() {
    this.timerDisplay = document.getElementById("timerDisplay");
    this.startBtn = document.getElementById("startBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.progressFill = document.getElementById("progressFill");
    this.status = document.getElementById("status");
    this.customMinutes = document.getElementById("customMinutes");
    this.setCustomBtn = document.getElementById("setCustomBtn");
    this.presetBtns = document.querySelectorAll(".preset-btn");
  }

  initEventListeners() {
    this.startBtn.addEventListener("click", () => this.start());
    this.pauseBtn.addEventListener("click", () => this.pause());
    this.resetBtn.addEventListener("click", () => this.reset());
    this.setCustomBtn.addEventListener("click", () => this.setCustomTime());

    this.presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const minutes = parseInt(btn.dataset.minutes);
        this.setTime(minutes);
      });
    });

    // Allow Enter key to set custom time
    this.customMinutes.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.setCustomTime();
      }
    });
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startBtn.disabled = true;
      this.pauseBtn.disabled = false;
      this.updateStatus("Таймер запущен...", "running");

      this.intervalId = setInterval(() => {
        this.tick();
      }, 1000);
    }
  }

  pause() {
    if (this.isRunning) {
      this.isRunning = false;
      this.startBtn.disabled = false;
      this.pauseBtn.disabled = true;
      this.updateStatus("Таймер на паузе", "");

      clearInterval(this.intervalId);
    }
  }

  reset() {
    this.pause();
    this.remainingSeconds = this.totalSeconds;
    this.updateDisplay();
    this.updateProgress();
    this.updateStatus("Готов к работе", "");
    this.startBtn.disabled = false;
    this.pauseBtn.disabled = true;
  }

  tick() {
    if (this.remainingSeconds > 0) {
      this.remainingSeconds--;
      this.updateDisplay();
      this.updateProgress();

      // Update title with remaining time
      document.title = `${this.formatTime(
        this.remainingSeconds
      )} - Pomodoro Timer`;
    } else {
      this.complete();
    }
  }

  complete() {
    this.pause();
    this.updateStatus("Время вышло! 🎉", "completed");
    document.title = "Время вышло! - Pomodoro Timer";

    // Play notification sound (browser notification)
    this.notify();

    // Flash the timer display
    this.timerDisplay.classList.add("changed");
    setTimeout(() => {
      this.timerDisplay.classList.remove("changed");
    }, 300);
  }

  notify() {
    // Request notification permission if not granted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Pomodoro Timer", {
        body: "Время вышло! Пора сделать перерыв.",
        icon: "⏰",
      });
    } else if (
      "Notification" in window &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("Pomodoro Timer", {
            body: "Время вышло! Пора сделать перерыв.",
            icon: "⏰",
          });
        }
      });
    }

    // Try to play a beep sound using Web Audio API
    this.playBeep();
  }

  playBeep() {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log("Audio notification not supported");
    }
  }

  setTime(minutes) {
    if (!this.isRunning) {
      this.totalSeconds = minutes * 60;
      this.remainingSeconds = this.totalSeconds;
      this.updateDisplay();
      this.updateProgress();
      this.updateStatus("Готов к работе", "");
      this.customMinutes.value = minutes;

      // Animation
      this.timerDisplay.classList.add("changed");
      setTimeout(() => {
        this.timerDisplay.classList.remove("changed");
      }, 300);
    }
  }

  setCustomTime() {
    const minutes = parseInt(this.customMinutes.value);
    if (minutes > 0 && minutes <= 180) {
      this.setTime(minutes);
    } else {
      alert("Пожалуйста, введите время от 1 до 180 минут");
    }
  }

  updateDisplay() {
    this.timerDisplay.textContent = this.formatTime(this.remainingSeconds);
  }

  updateProgress() {
    const percentage = (this.remainingSeconds / this.totalSeconds) * 100;
    this.progressFill.style.width = `${percentage}%`;
  }

  updateStatus(message, className) {
    this.status.textContent = message;
    this.status.className = "status";
    if (className) {
      this.status.classList.add(className);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
}

// Initialize timer when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const timer = new PomodoroTimer();

  // Request notification permission on load
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
});
