const YEAH_BUDDY_SOUND_PATH = "/sounds/yeah-buddy.mp3";

let yeahBuddyAudio: HTMLAudioElement | null = null;

function getYeahBuddyAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!yeahBuddyAudio) {
    yeahBuddyAudio = new Audio(YEAH_BUDDY_SOUND_PATH);
    yeahBuddyAudio.preload = "auto";
    yeahBuddyAudio.volume = 0.8;
    yeahBuddyAudio.load();
  }

  return yeahBuddyAudio;
}

export function primeYeahBuddySound(): void {
  void getYeahBuddyAudio();
}

export function playYeahBuddySound(isMuted: boolean): void {
  if (isMuted || typeof window === "undefined") {
    return;
  }

  const audio = getYeahBuddyAudio();
  if (!audio) {
    return;
  }

  audio.pause();

  try {
    audio.currentTime = 0;
  } catch {
    // Ignore reset failures while the browser is still loading metadata.
  }

  void audio.play().catch(() => {
    // Ignore playback failures caused by browser autoplay restrictions.
  });
}
