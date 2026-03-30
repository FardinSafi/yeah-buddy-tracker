const YEAH_BUDDY_SOUND_PATH = "/sounds/yeah-buddy.mp3";

export function playYeahBuddySound(isMuted: boolean): void {
  if (isMuted || typeof window === "undefined") {
    return;
  }

  const audio = new Audio(YEAH_BUDDY_SOUND_PATH);
  audio.volume = 0.8;
  void audio.play().catch(() => {
    // Ignore playback failures caused by browser autoplay restrictions.
  });
}
