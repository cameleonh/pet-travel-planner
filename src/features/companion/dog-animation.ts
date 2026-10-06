export type CompanionClips = {
  idle: string | null;
  walk: string | null;
  happy: string | null;
};

/** glTF clips from FBX2glTF are named like `Rig|Rig|Rig|Idle`; use the last segment. */
export function clipBaseName(name: string): string {
  const parts = name.split("|");
  return (parts[parts.length - 1] ?? name).trim();
}

const IDLE = ["idle", "idle_eating"];
const WALK = ["walk", "run", "gallop"];
const HAPPY = ["headbutt", "jump_loop", "jump_start", "attack", "kick"];

/**
 * Map the model's animation clips to the three companion moods. Idle is the
 * resting loop, walk is the ambient wander, happy is the one-shot reaction
 * played when the visitor pets the dog. Returns null for a missing mood so the
 * caller can fall back gracefully.
 */
export function resolveCompanionClips(names: readonly string[]): CompanionClips {
  const byBase = new Map<string, string>();
  for (const name of names) byBase.set(clipBaseName(name).toLowerCase(), name);
  const pick = (candidates: readonly string[]): string | null => {
    for (const candidate of candidates) {
      const hit = byBase.get(candidate);
      if (hit) return hit;
    }
    return null;
  };
  return { idle: pick(IDLE), walk: pick(WALK), happy: pick(HAPPY) };
}
