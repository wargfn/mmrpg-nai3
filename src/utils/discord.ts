/// <reference types="vite/client" />

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '';

let discordSdkInstance: any = null;
let discordUser: { username: string; globalName?: string; avatar?: string; id: string } | null = null;
let isDiscordActivity = false;

export function getDiscordSdk(): any {
  return discordSdkInstance;
}

export function getDiscordUser() {
  return discordUser;
}

export function checkIsDiscordActivity(): boolean {
  return isDiscordActivity;
}

export async function initializeDiscordSdk(): Promise<{ discordSdk: any | null; user: typeof discordUser }> {
  try {
    // Check if we are running inside Discord Activity iframe (URL contains instance_id or frame_id)
    const urlParams = new URLSearchParams(window.location.search);
    const isFrame = urlParams.has('frame_id') || urlParams.has('instance_id') || window.location.hostname.includes('discordsays.com');
    
    // Strict detection: If Discord client ID is missing/placeholder or we are not in a Discord frame and not forcing, skip Discord entirely.
    const hasValidClientId = DISCORD_CLIENT_ID && DISCORD_CLIENT_ID !== '123456789012345678';
    if ((!isFrame && !import.meta.env.VITE_FORCE_DISCORD) || !hasValidClientId) {
      console.log('Running in standard browser preview mode (Discord Activity modules bypassed).');
      return { discordSdk: null, user: null };
    }

    isDiscordActivity = true;
    const { DiscordSDK } = await import('@discord/embedded-app-sdk');
    discordSdkInstance = new DiscordSDK(DISCORD_CLIENT_ID);
    
    await discordSdkInstance.ready();
    console.log('Discord SDK ready.');

    // Authenticate user
    const { code } = await discordSdkInstance.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds'],
    });

    const response = await fetch('/api/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    
    if (response.ok) {
      const { access_token } = await response.json();
      const auth = await discordSdkInstance.commands.authenticate({ access_token });
      if (auth && auth.user) {
        discordUser = {
          id: auth.user.id,
          username: auth.user.username,
          globalName: auth.user.global_name || auth.user.username,
          avatar: auth.user.avatar ? `https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png` : undefined,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to initialize Discord SDK:', error);
  }

  return { discordSdk: discordSdkInstance, user: discordUser };
}
