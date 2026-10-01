/// <reference types="vite/client" />
import { DiscordSDK } from '@discord/embedded-app-sdk';

// Replace with your Discord Application Client ID or configure VITE_DISCORD_CLIENT_ID environment variable
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '123456789012345678';

let discordSdkInstance: DiscordSDK | null = null;
let discordUser: { username: string; globalName?: string; avatar?: string; id: string } | null = null;
let isDiscordActivity = false;

export function getDiscordSdk(): DiscordSDK | null {
  return discordSdkInstance;
}

export function getDiscordUser() {
  return discordUser;
}

export function checkIsDiscordActivity(): boolean {
  return isDiscordActivity;
}

export async function initializeDiscordSdk(): Promise<{ discordSdk: DiscordSDK | null; user: typeof discordUser }> {
  // Check if we are running inside Discord Activity iframe (URL contains instance_id or frame_id)
  const urlParams = new URLSearchParams(window.location.search);
  const isFrame = urlParams.has('frame_id') || urlParams.has('instance_id') || window.location.hostname.includes('discordsays.com');
  
  if (!isFrame && !import.meta.env.VITE_FORCE_DISCORD) {
    console.log('Running in standard browser mode (not Discord Activity).');
    return { discordSdk: null, user: null };
  }

  try {
    isDiscordActivity = true;
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

    // Exchange auth code for session token via backend endpoint if available
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
    } else {
      // Fallback: get current channel or basic instance info
      const channelId = discordSdkInstance.channelId;
      console.log('Discord Channel ID:', channelId);
    }
  } catch (error) {
    console.warn('Failed to initialize Discord SDK (running standalone or missing client config):', error);
  }

  return { discordSdk: discordSdkInstance, user: discordUser };
}
