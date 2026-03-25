/** URI de retour OAuth — doit être identique dans Google Cloud / Azure AD */
export function getMailRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/dashboard/mail`;
}

export const OAUTH_STATE_GOOGLE = "aos-mail-google";
export const OAUTH_STATE_OUTLOOK = "aos-mail-outlook";

export function buildGoogleAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getMailRedirectUri(),
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email openid",
    access_type: "offline",
    prompt: "consent",
    state: OAUTH_STATE_GOOGLE,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildMicrosoftAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getMailRedirectUri(),
    response_type: "code",
    scope:
      "https://graph.microsoft.com/Mail.Read offline_access openid profile",
    response_mode: "query",
    state: OAUTH_STATE_OUTLOOK,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}
