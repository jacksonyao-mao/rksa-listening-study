"use strict";

for (const id of ["reference", "test"]) {
  const audio = document.getElementById(id);
  const button = document.querySelector(`[data-audio="${id}"]`);
  const seek = document.querySelector(`[data-seek="${id}"]`);
  const current = document.querySelector(`[data-current="${id}"]`);
  const duration = document.querySelector(`[data-duration="${id}"]`);
  const status = document.querySelector(`[data-status="${id}"]`);
  const label = id === "reference" ? "reference recording" : "test recording";

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "—";
    return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
  }

  function updatePlayer() {
    const playing = !audio.paused && !audio.ended;
    button.classList.toggle("is-playing", playing);
    button.setAttribute("aria-label", (playing ? "Pause " : "Play ") + label);
    current.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
    seek.disabled = !Number.isFinite(audio.duration);
    seek.max = Number.isFinite(audio.duration) ? audio.duration : 1;
    seek.value = audio.currentTime;
    seek.setAttribute("aria-valuetext", formatTime(audio.currentTime) + " of " + formatTime(audio.duration));
  }

  button.addEventListener("click", async () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      status.textContent = "";
      if (audio.error) audio.load();
      await audio.play();
    } catch {
      status.textContent = "Audio could not play. Check your connection and press play to retry.";
    }
  });
  seek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value);
  });
  for (const event of ["timeupdate", "loadedmetadata", "durationchange", "play", "pause", "ended", "emptied"]) {
    audio.addEventListener(event, updatePlayer);
  }
  audio.addEventListener("loadstart", () => {
    status.textContent = "";
    updatePlayer();
  });
  audio.addEventListener("error", () => {
    status.textContent = "Audio could not load. Check your connection and press play to retry.";
  });
}
