import type { TeamSession } from "@/lib/teamApi";

export const TEAM_SESSION_KEY = "team_session";
export const TEAM_SESSION_EVENT = "aosrenov:team-session";

export function readTeamSession(): TeamSession | null {
  try {
    const raw = localStorage.getItem(TEAM_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeamSession;
  } catch {
    return null;
  }
}

export function writeTeamSession(session: TeamSession): void {
  localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(TEAM_SESSION_EVENT));
}

export function clearTeamSession(): void {
  localStorage.removeItem(TEAM_SESSION_KEY);
  window.dispatchEvent(new Event(TEAM_SESSION_EVENT));
}
