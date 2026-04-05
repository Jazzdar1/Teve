export interface Channel {
  name: string;
  logo: string;
  group: string;
  url: string;
  type?: 'm3u' | 'web';
  drm?: any;
  headers?: Record<string, string>;
}

export const parseM3U = (content: string, playlistName?: string): Channel[] => {
  // Try parsing as JSON first
  try {
    const json = JSON.parse(content);
    const channels: Channel[] = [];
    
    // Helper to extract channels from an array
    const extractChannels = (arr: any[]) => {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        if (item && typeof item === 'object') {
          // Look for common properties
          const name = item.name || item.title || item.channel_name || item.channelName || 'Unknown Channel';
          const url = item.url || item.link || item.stream_url || item.streamUrl || item.file;
          const logo = item.logo || item.icon || item.tvg_logo || item.image || '';
          const group = item.group || item.category || item.group_title || item.groupTitle || 'Uncategorized';
          
          if (url) {
            const isSultanVip = playlistName && (playlistName.toLowerCase().includes('sultan') || playlistName.toLowerCase().includes('vip'));
            // Force all channels to use the video player unless the playlist is Sultan or VIP
            const isWeb = isSultanVip;
            
            let drm: any = undefined;
            const clearKey = item.clearkey || item.clear_key || (item.drm_scheme === 'clearkey' ? item.drm_license_uri || item.drm_key : null);
            if (clearKey) {
              if (typeof clearKey === 'string') {
                if (clearKey.includes(':') && !clearKey.startsWith('http') && !clearKey.startsWith('{')) {
                  const [keyId, key] = clearKey.split(':');
                  drm = { clearkey: { keyId, key } };
                } else if (clearKey.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(clearKey);
                    if (parsed.keyId && parsed.key) {
                      drm = { clearkey: { keyId: parsed.keyId, key: parsed.key } };
                    }
                  } catch (e) {
                    // Ignore JSON parse error
                  }
                }
              } else if (typeof clearKey === 'object' && clearKey.keyId && clearKey.key) {
                drm = { clearkey: { keyId: clearKey.keyId, key: clearKey.key } };
              }
            }
            
            if (!drm) {
              if (item.drm_scheme === 'widevine' || (item.drm_license_uri && item.drm_license_uri.includes('widevine'))) {
                drm = { widevine: { url: item.drm_license_uri } };
              } else if (item.drm_scheme === 'playready') {
                drm = { playready: { url: item.drm_license_uri } };
              }
            }

            channels.push({ name, url, logo, group, type: isWeb ? 'web' : undefined, drm });
          }
        }
      }
    };

    if (Array.isArray(json)) {
      extractChannels(json);
    } else if (typeof json === 'object' && json !== null) {
      // Look for array properties
      for (const key in json) {
        if (Array.isArray(json[key])) {
          extractChannels(json[key]);
        }
      }
    }
    
    if (channels.length > 0) {
      return channels;
    }
  } catch (e) {
    // Not JSON, continue to M3U parsing
  }

  const lines = content.split('\n');
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};
  let currentDrm: any = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      // Parse metadata
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const nameMatch = line.split(',').pop();

      currentChannel = {
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Uncategorized',
        name: nameMatch ? nameMatch.trim() : 'Unknown Channel',
      };
    } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=')) {
      const type = line.split('=')[1].trim().toLowerCase();
      if (!currentDrm) currentDrm = {};
      currentDrm.type = type;
    } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      const key = line.substring(line.indexOf('=') + 1).trim();
      if (!currentDrm) currentDrm = {};
      currentDrm.key = key;
    } else if (line && !line.startsWith('#')) {
        // This is the URL
        if (currentChannel.name) {
          const isSultanVip = playlistName && (playlistName.toLowerCase().includes('sultan') || playlistName.toLowerCase().includes('vip'));
          const isWeb = isSultanVip;
          
          let url = line;
          let headers: Record<string, string> | undefined = undefined;
          
          if (line.includes('|')) {
            const parts = line.split('|');
            url = parts[0].trim();
            const headerStr = parts[1];
            if (headerStr) {
              headers = {};
              const headerPairs = headerStr.split('&');
              headerPairs.forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) {
                  headers![key.trim()] = value.trim();
                }
              });
            }
          }

          let drm: any = undefined;
          if (currentDrm) {
            if (currentDrm.type === 'clearkey' || (currentDrm.key && currentDrm.key.includes(':') && !currentDrm.key.startsWith('http'))) {
               const parts = currentDrm.key.split(':');
               if (parts.length >= 2) {
                 drm = { clearkey: { keyId: parts[0], key: parts[1] } };
               }
            } else if (currentDrm.type === 'com.widevine.alpha' || currentDrm.type === 'widevine') {
               drm = { widevine: { url: currentDrm.key, headers: headers } };
            } else if (currentDrm.type === 'com.microsoft.playready' || currentDrm.type === 'playready') {
               drm = { playready: { url: currentDrm.key, headers: headers } };
            }
          }

          channels.push({
            name: currentChannel.name,
            logo: currentChannel.logo || '',
            group: currentChannel.group || 'Uncategorized',
            url: url,
            type: isWeb ? 'web' : undefined,
            drm: drm,
            headers: headers
          });
        currentChannel = {};
        currentDrm = undefined;
      }
    }
  }
  return channels;
};
