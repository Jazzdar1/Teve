import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, AlertCircle, Play, Wifi, X, RotateCcw, RotateCw, ChevronRight, Volume2, Maximize2, Sun, Activity, RefreshCw, Cpu } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import DPlayer from 'dplayer';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';

const detectStreamType = (url: string): string => {
  if (!url) return 'hls';
  const lowerUrl = url.toLowerCase();
  
  // Check for DASH
  if (lowerUrl.includes('.mpd') || lowerUrl.includes('dash') || lowerUrl.includes('manifest')) return 'dash';
  
  // Check for HLS
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('hls') || lowerUrl.includes('.m3u') || lowerUrl.includes('playlist.m3u8') || lowerUrl.includes('master.m3u8')) return 'hls';
  
  // Check for MP4/WebM
  if (lowerUrl.includes('.mp4') || lowerUrl.includes('.m4v') || lowerUrl.includes('.mov')) return 'mp4';
  if (lowerUrl.includes('.webm')) return 'webm';
  if (lowerUrl.includes('.mkv')) return 'mp4';
  
  // Check for YouTube
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  
  // Common IPTV patterns
  if (lowerUrl.includes('/stream/') || lowerUrl.includes('/live/') || lowerUrl.includes('/playlist/') || lowerUrl.includes(':8000') || lowerUrl.includes(':8080') || lowerUrl.includes('/get.php')) return 'hls';
  
  // If it has no extension but looks like a stream
  if (!lowerUrl.split('?')[0].includes('.')) return 'hls';
  
  return 'hls'; // Default to HLS for IPTV
};

interface DRMConfig {
  widevine?: {
    url: string;
    headers?: Record<string, string>;
  };
  playready?: {
    url: string;
    headers?: Record<string, string>;
  };
  clearkey?: {
    keyId: string;
    key: string;
  };
}

interface VideoPlayerProps {
  url: string;
  drm?: DRMConfig;
  headers?: Record<string, string>;
  className?: string;
  onToggleOverlay?: () => void;
}

type Quality = 'Auto' | 'Low' | 'Medium' | 'High';
type PlayerEngine = 'JWPlayer' | 'VideoJS' | 'DPlayer';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, drm, headers, className, onToggleOverlay }) => {
  const [engine, setEngine] = useState<PlayerEngine>(() => {
    return (localStorage.getItem('player_engine') as PlayerEngine) || 'JWPlayer';
  });
  const [quality, setQuality] = useState<Quality>(() => {
    return (localStorage.getItem('player_quality') as Quality) || 'Auto';
  });
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('player_autoplay');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });
  const [useProxy, setUseProxy] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('player_use_proxy');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });
  const [forceProxy, setForceProxy] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('player_force_proxy');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });
  const [proxyAttempted, setProxyAttempted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'quality' | 'debug' | 'engine'>('main');
  const [error, setError] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(100);
  const [showGestureIndicator, setShowGestureIndicator] = useState<{ type: 'volume' | 'brightness', value: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const resetSettings = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('player_engine', engine);
  }, [engine]);

  useEffect(() => {
    localStorage.setItem('player_quality', quality);
  }, [quality]);

  useEffect(() => {
    localStorage.setItem('player_autoplay', JSON.stringify(autoplay));
  }, [autoplay]);

  useEffect(() => {
    localStorage.setItem('player_use_proxy', JSON.stringify(useProxy));
  }, [useProxy]);

  useEffect(() => {
    localStorage.setItem('player_force_proxy', JSON.stringify(forceProxy));
  }, [forceProxy]);

  // Reset error when URL changes
  useEffect(() => {
    setError(null);
    setProxyAttempted(false);
  }, [url]);

  const handleError = (msg: string) => {
    console.error("Player Error:", msg);
    if (!proxyAttempted && !forceProxy && !useProxy) {
      console.log("Attempting playback with proxy due to error...");
      setProxyAttempted(true);
      return;
    }
    setError(msg);
  };

  const getProxiedUrl = (u: string) => {
    if (!u || u.startsWith('http://localhost') || u.startsWith('blob:') || u.startsWith('https://api.github.com')) {
      return u;
    }
    return `https://sports-proxy.darajazb.workers.dev/?${encodeURIComponent(u)}`;
  };

  const activeUrl = useMemo(() => {
    const isHttps = window.location.protocol === 'https:';
    const isHttpUrl = url.startsWith('http://');
    
    if ((isHttps && isHttpUrl) || proxyAttempted || useProxy || forceProxy) {
      return getProxiedUrl(url);
    }
    return url;
  }, [url, proxyAttempted, useProxy, forceProxy]);

  // Gesture handling
  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
  const startBrightnessRef = useRef(100);
  const startVolumeRef = useRef(100);
  const gestureTypeRef = useRef<'volume' | 'brightness' | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    startBrightnessRef.current = brightness;
    startVolumeRef.current = volume;
    gestureTypeRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaY = touchStartRef.current.y - touch.clientY;
    
    if (!gestureTypeRef.current && Math.abs(deltaY) > 10) {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPercent = (touchStartRef.current.x - rect.left) / rect.width;
      gestureTypeRef.current = xPercent < 0.5 ? 'brightness' : 'volume';
    }

    if (gestureTypeRef.current === 'brightness') {
      const newBrightness = Math.max(0, Math.min(200, startBrightnessRef.current + (deltaY / 2)));
      setBrightness(newBrightness);
      setShowGestureIndicator({ type: 'brightness', value: Math.round((newBrightness / 200) * 100) });
    } else if (gestureTypeRef.current === 'volume') {
      const newVolume = Math.max(0, Math.min(100, startVolumeRef.current + (deltaY / 2)));
      setVolume(newVolume);
      setShowGestureIndicator({ type: 'volume', value: Math.round(newVolume) });
      
      const player = (window as any).jwplayer && (window as any).jwplayer(0);
      if (player && typeof player.setVolume === 'function') {
        player.setVolume(newVolume);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current) {
      const duration = Date.now() - touchStartRef.current.time;
      if (duration < 200 && !gestureTypeRef.current) {
        if (onToggleOverlay) onToggleOverlay();
      }
    }
    touchStartRef.current = null;
    setTimeout(() => setShowGestureIndicator(null), 500);
  };

  const handlePlayerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (engine === 'JWPlayer') {
      const player = (window as any).jwplayer && (window as any).jwplayer(0);
      if (player && typeof player.getState === 'function') {
        const state = player.getState();
        state === 'playing' ? player.pause() : player.play();
      }
    }
    if (!touchStartRef.current && onToggleOverlay) onToggleOverlay();
  };

  return (
    <div 
      className={`relative bg-black mx-auto group overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handlePlayerClick}
    >
      {/* Brightness Overlays */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
        style={{ backgroundColor: 'black', opacity: brightness < 100 ? (100 - brightness) / 100 : 0, mixBlendMode: 'multiply' }}
      />
      <div 
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
        style={{ backgroundColor: 'white', opacity: brightness > 100 ? (brightness - 100) / 100 : 0, mixBlendMode: 'overlay' }}
      />

      {/* Main Player Engine */}
      <div className="w-full h-full absolute inset-0">
        {engine === 'JWPlayer' && (
          <JWPlayerEngine 
            key={`jw-${activeUrl}`} 
            url={activeUrl} 
            drm={drm} 
            headers={headers}
            onError={handleError} 
            autoplay={autoplay} 
            onPlayStateChange={setIsPaused}
            quality={quality}
          />
        )}
        {engine === 'VideoJS' && (
          <VideoJSEngine 
            key={`vjs-${activeUrl}`} 
            url={activeUrl} 
            drm={drm} 
            headers={headers}
            onError={handleError} 
            autoplay={autoplay} 
            onPlayStateChange={setIsPaused}
          />
        )}
        {engine === 'DPlayer' && (
          <DPlayerEngine 
            key={`dp-${activeUrl}`} 
            url={activeUrl} 
            drm={drm} 
            headers={headers}
            onError={handleError} 
            autoplay={autoplay} 
            onPlayStateChange={setIsPaused}
          />
        )}
      </div>

      {/* Gesture Indicators */}
      <AnimatePresence>
        {showGestureIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex flex-col items-center gap-3"
          >
            {showGestureIndicator.type === 'volume' ? <Volume2 className="w-8 h-8 text-[#00ff88]" /> : <Sun className="w-8 h-8 text-[#00ff88]" />}
            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#00ff88]" animate={{ width: `${showGestureIndicator.value}%` }} />
            </div>
            <span className="text-white font-bold text-sm">{showGestureIndicator.value}%</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playback Controls Overlay */}
      {isPaused && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-[#00ff88] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.5)] pointer-events-auto active:scale-90 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              if (engine === 'JWPlayer') {
                const player = (window as any).jwplayer && (window as any).jwplayer(0);
                if (player) player.play();
              }
            }}
          >
            <Play className="w-10 h-10 text-black fill-current ml-1" />
          </motion.button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-40 backdrop-blur-xl p-6 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Playback Error</h3>
          <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">{error}</p>
          <div className="flex flex-wrap gap-4 justify-center w-full max-w-sm">
            <button 
              onClick={() => { setError(null); setProxyAttempted(false); }}
              className="flex-1 px-6 py-3 bg-[#00ff88] hover:bg-[#00dd77] text-black font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" /> Retry
            </button>
            <button 
              onClick={() => { setShowSettings(true); setActiveTab('engine'); }}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Cpu className="w-5 h-5" /> Switch Engine
            </button>
            <button 
              onClick={() => { setProxyAttempted(true); setError(null); }}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Wifi className="w-5 h-5" /> Use Proxy
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setActiveTab('main'); }}
          className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-xl border border-white/10 transition-all shadow-2xl flex items-center gap-2 group/btn"
        >
          <Settings className={`w-5 h-5 transition-transform duration-500 ${showSettings ? 'rotate-90' : 'group-hover/btn:rotate-45'}`} />
          <span className="text-xs font-bold pr-1 hidden sm:block">Settings</span>
        </button>
        
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-3 w-80 bg-[#0a0a0a]/98 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden z-50"
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                  {activeTab !== 'main' && (
                    <button onClick={() => setActiveTab('main')} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors mr-1">
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                  )}
                  <span className="text-xs font-black text-white tracking-widest uppercase">{activeTab === 'main' ? 'Player Config' : activeTab}</span>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {activeTab === 'main' && (
                  <div className="space-y-1.5">
                    <SettingsItem icon={<Cpu className="w-4 h-4" />} label="Player Engine" value={engine} onClick={() => setActiveTab('engine')} />
                    <SettingsItem icon={<Activity className="w-4 h-4" />} label="Quality" value={quality} onClick={() => setActiveTab('quality')} />
                    <SettingsItem icon={<AlertCircle className="w-4 h-4" />} label="Debug Console" onClick={() => setActiveTab('debug')} />
                    <SettingsItem 
                      icon={<Maximize2 className="w-4 h-4" />} 
                      label="Picture-in-Picture" 
                      onClick={() => {
                        const player = (window as any).jwplayer && (window as any).jwplayer();
                        if (player?.setPip) { player.setPip(true); setShowSettings(false); }
                      }}
                    />
                    
                    <div className="pt-3 mt-3 border-t border-white/5 space-y-4 px-2 pb-2">
                      <ToggleItem icon={<Play className="w-4 h-4" />} label="Autoplay" active={autoplay} onToggle={() => setAutoplay(!autoplay)} />
                      <ToggleItem icon={<Wifi className="w-4 h-4" />} label="Auto Proxy" active={useProxy} onToggle={() => setUseProxy(!useProxy)} />
                      <ToggleItem icon={<Wifi className="w-4 h-4" />} label="Force Proxy" active={forceProxy} onToggle={() => setForceProxy(!forceProxy)} />
                      <button 
                        onClick={resetSettings}
                        className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black text-red-400/70 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all mt-4 border border-dashed border-red-400/20"
                      >
                        <RotateCcw className="w-3 h-3" /> CLEAR CACHE & RELOAD
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'quality' && (
                  <div className="space-y-1.5">
                    {(['Auto', 'Low', 'Medium', 'High'] as Quality[]).map((q) => (
                      <SelectionItem key={q} label={q} selected={quality === q} onClick={() => { setQuality(q); setActiveTab('main'); }} />
                    ))}
                  </div>
                )}

                {activeTab === 'engine' && (
                  <div className="space-y-1.5">
                    {(['JWPlayer', 'VideoJS', 'DPlayer'] as PlayerEngine[]).map((e) => (
                      <SelectionItem key={e} label={e} selected={engine === e} onClick={() => { setEngine(e); setActiveTab('main'); }} />
                    ))}
                  </div>
                )}

                {activeTab === 'debug' && (
                  <div className="p-4 space-y-5 text-[10px] font-mono text-gray-500 break-all leading-relaxed">
                    <div className="space-y-2">
                      <p className="text-white font-black uppercase tracking-tighter opacity-50">Source URL</p>
                      <p className="bg-white/5 p-3 rounded-xl border border-white/5 select-all">{url}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white font-black uppercase tracking-tighter opacity-50">Resolved URL</p>
                      <p className="bg-white/5 p-3 rounded-xl border border-white/5 select-all">{activeUrl}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-white font-black uppercase opacity-50">Engine</p>
                        <p className="text-white">{engine}</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-white font-black uppercase opacity-50">Quality</p>
                        <p className="text-white">{quality}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-black rounded-xl uppercase tracking-widest transition-all"
                    >
                      Hard Refresh App
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SettingsItem = ({ icon, label, value, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 rounded-2xl transition-all group/item">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/5 rounded-xl group-hover/item:bg-[#00ff88]/10 group-hover/item:text-[#00ff88] transition-colors">{icon}</div>
      <span className="text-xs font-bold text-gray-400 group-hover/item:text-white transition-colors">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-[10px] font-black text-[#00ff88] uppercase tracking-widest">{value}</span>}
      <ChevronRight className="w-3 h-3 text-gray-700 group-hover/item:text-gray-400 transition-colors" />
    </div>
  </button>
);

const SelectionItem = ({ label, selected, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center justify-between group/sel ${selected ? 'bg-[#00ff88]/10 border border-[#00ff88]/20' : 'hover:bg-white/5 border border-transparent'}`}>
    <span className={`text-xs font-black ${selected ? 'text-[#00ff88]' : 'text-gray-400 group-hover/sel:text-white'}`}>{label}</span>
    {selected && <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_10px_#00ff88]" />}
  </button>
);

const ToggleItem = ({ icon, label, active, onToggle }: any) => (
  <div className="flex items-center justify-between px-2">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-white/5 text-gray-500'}`}>{icon}</div>
      <span className="text-xs font-bold text-gray-400">{label}</span>
    </div>
    <button onClick={onToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ${active ? 'bg-[#00ff88]' : 'bg-gray-800'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition-transform duration-500 ${active ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const JWPlayerEngine: React.FC<{
  url: string, 
  drm?: DRMConfig, 
  headers?: Record<string, string>,
  onError: (msg: string) => void, 
  autoplay: boolean,
  onPlayStateChange?: (isPaused: boolean) => void,
  quality: Quality
}> = ({ url, drm, headers, onError, autoplay, onPlayStateChange, quality }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const playerId = useMemo(() => `jw-player-${Math.random().toString(36).substr(2, 9)}`, []);
  const prevUrlRef = useRef<string>(url);

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;
    let timeoutId: any = null;

    const type = detectStreamType(url);

    // If player already exists, just update source
    if (playerRef.current && prevUrlRef.current !== url) {
      console.log("Updating JWPlayer source to:", url);
      setIsLoading(true);
      playerRef.current.load([{
        file: url,
        type: type === 'hls' ? 'hls' : (type === 'dash' ? 'dash' : (type === 'youtube' ? 'youtube' : 'mp4')),
        ...(drm ? { drm } : {})
      }]);
      if (autoplay) playerRef.current.play();
      prevUrlRef.current = url;
      return;
    }

    const initPlayer = () => {
      if (!isMounted) return;
      if (!(window as any).jwplayer) {
        console.log("JWPlayer script missing, retrying...");
        setTimeout(initPlayer, 200);
        return;
      }
      
      try {
        // Use the ID string for setup
        const playerInstance = playerRef.current = (window as any).jwplayer(playerId);
        
        const setupConfig: any = {
          playlist: [{
            file: url,
            type: type === 'hls' ? 'hls' : (type === 'dash' ? 'dash' : (type === 'youtube' ? 'youtube' : 'mp4')),
            ...(drm ? { drm } : {})
          }],
          autostart: autoplay,
          width: '100%',
          height: '100%',
          preload: 'auto',
          playbackRateControls: true,
          repeat: true,
          stretching: 'uniform',
          pip: true,
          hlsjsConfig: {
            enableWorker: true,
            startLevel: quality === 'Auto' ? -1 : (quality === 'High' ? 10 : (quality === 'Medium' ? 5 : 0)),
            xhrSetup: (xhr: any) => {
              xhr.withCredentials = false;
              if (headers) {
                Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
              }
            }
          },
          primary: "html5",
          base: "https://ssl.p.jwpcdn.com/player/v/8.21.0/"
        };

        console.log("Setting up JWPlayer with:", setupConfig);
        playerInstance.setup(setupConfig);
        
        // Timeout for initialization
        timeoutId = setTimeout(() => {
          if (isMounted && !isReady) {
            console.error("JWPlayer initialization timed out");
            setIsLoading(false);
            onError("Player initialization timed out. The stream might be offline or blocked.");
          }
        }, 15000);

        playerInstance.on('ready', () => { 
          if (isMounted) { 
            clearTimeout(timeoutId);
            setIsReady(true); 
            setIsLoading(false); 
            onPlayStateChange?.(!autoplay); 
          } 
        });
        playerInstance.on('play', () => { if (isMounted) { onPlayStateChange?.(false); setIsLoading(false); } });
        playerInstance.on('pause', () => { if (isMounted) onPlayStateChange?.(true); });
        playerInstance.on('idle', () => { if (isMounted) { onPlayStateChange?.(true); setIsLoading(false); } });
        playerInstance.on('buffer', () => { if (isMounted) setIsLoading(true); });
        playerInstance.on('error', (e: any) => {
          console.error("JWPlayer Error:", e);
          if (isMounted) {
            setIsLoading(false);
            onError(`Playback Error: ${e.message || "Unknown error"}`);
          }
        });
        playerInstance.on('setupError', (e: any) => {
          console.error("JWPlayer Setup Error:", e);
          if (isMounted) {
            setIsLoading(false);
            onError(`Setup Error: ${e.message || "Failed to setup player"}`);
          }
        });
        prevUrlRef.current = url;
      } catch (e) {
        console.error("JWPlayer Init Exception:", e);
        if (isMounted) { setIsLoading(false); onError("Initialization failed."); }
      }
    };

    const initTimeout = setTimeout(() => {
      if (!isMounted) return;
      initPlayer();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      if (timeoutId) clearTimeout(timeoutId);
      // Only remove if unmounting the whole engine
    };
  }, [url, drm, headers, autoplay, quality, onError]);

  useEffect(() => {
    return () => {
      if (playerRef.current?.remove) {
        try { playerRef.current.remove(); } catch (e) {}
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <div id={playerId} ref={containerRef} className="w-full h-full jwplayer-container" />
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
          <Activity className="w-16 h-16 text-[#00ff88] animate-pulse mb-6" />
          <p className="text-white font-black tracking-widest animate-pulse uppercase text-xs">Initializing Stream Engine</p>
        </div>
      )}
    </div>
  );
};

const VideoJSEngine: React.FC<{
  url: string,
  drm?: DRMConfig,
  headers?: Record<string, string>,
  onError: (msg: string) => void,
  autoplay: boolean,
  onPlayStateChange?: (isPaused: boolean) => void
}> = ({ url, drm, headers, onError, autoplay, onPlayStateChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prevUrlRef = useRef<string>(url);

  useEffect(() => {
    if (!videoRef.current) return;
    let isMounted = true;

    const type = detectStreamType(url);
    const mimeType = type === 'dash' ? 'application/dash+xml' : (type === 'hls' ? 'application/x-mpegURL' : (type === 'mp4' ? 'video/mp4' : 'application/x-mpegURL'));

    // If player already exists, just update source
    if (playerRef.current && prevUrlRef.current !== url) {
      console.log("Updating Video.js source to:", url);
      setIsLoading(true);
      playerRef.current.src({ src: url, type: mimeType });
      if (autoplay) {
        const playPromise = playerRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error: any) => console.warn("Video.js play() interrupted:", error));
        }
      }
      prevUrlRef.current = url;
      return;
    }

    const initTimeout = setTimeout(() => {
      if (!isMounted || !videoRef.current || playerRef.current) return;

      const options = {
        autoplay: autoplay,
        controls: false,
        responsive: true,
        fluid: true,
        sources: [{
          src: url,
          type: mimeType
        }],
        html5: {
          vhs: {
            withCredentials: false,
            xhrSetup: (options: any) => {
              if (headers) {
                options.beforeSend = (xhr: any) => {
                  Object.entries(headers).forEach(([key, value]) => {
                    xhr.setRequestHeader(key, value);
                  });
                };
              }
              return options;
            }
          }
        }
      };

      const player = playerRef.current = videojs(videoRef.current, options, () => {
        if (!isMounted) return;
        setIsLoading(false);
        if (autoplay) {
          const playPromise = player.play();
          if (playPromise !== undefined) {
            playPromise.catch((error: any) => {
              console.warn("Video.js play() was interrupted or failed:", error);
            });
          }
        }
      });

      player.on('play', () => onPlayStateChange?.(false));
      player.on('pause', () => onPlayStateChange?.(true));
      player.on('error', (e: any) => {
        if (!isMounted) return;
        console.error("Video.js Error:", player.error());
        onError(`Video.js playback error: ${player.error()?.message || "Unknown error"}`);
      });
      player.on('waiting', () => setIsLoading(true));
      player.on('playing', () => setIsLoading(false));
      prevUrlRef.current = url;
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      // Only dispose if unmounting the whole engine
    };
  }, [url, autoplay, headers, onError, onPlayStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <div data-vjs-player className="w-full h-full">
        <video ref={videoRef} className="video-js vjs-big-play-centered w-full h-full" />
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
          <Activity className="w-16 h-16 text-[#00ff88] animate-pulse mb-6" />
          <p className="text-white font-black tracking-widest animate-pulse uppercase text-xs">Initializing Video.js</p>
        </div>
      )}
    </div>
  );
};

const DPlayerEngine: React.FC<{
  url: string,
  drm?: DRMConfig,
  headers?: Record<string, string>,
  onError: (msg: string) => void,
  autoplay: boolean,
  onPlayStateChange?: (isPaused: boolean) => void
}> = ({ url, drm, headers, onError, autoplay, onPlayStateChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prevUrlRef = useRef<string>(url);

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    const type = detectStreamType(url);

    // If player already exists, just update source
    if (playerRef.current && prevUrlRef.current !== url) {
      console.log("Updating DPlayer source to:", url);
      setIsLoading(true);
      playerRef.current.switchVideo({
        url: url,
        type: type === 'dash' ? 'dash' : (type === 'hls' ? 'hls' : 'normal')
      });
      if (autoplay) playerRef.current.play();
      prevUrlRef.current = url;
      return;
    }

    const initTimeout = setTimeout(() => {
      if (!isMounted || !containerRef.current || playerRef.current) return;

      const dp = playerRef.current = new DPlayer({
        container: containerRef.current,
        autoplay: autoplay,
        video: {
          url: url,
          type: type === 'dash' ? 'dash' : (type === 'hls' ? 'hls' : 'normal'),
          customType: {
            hls: function (video: any) {
              const hls = new Hls({
                xhrSetup: (xhr: any) => {
                  if (headers) {
                    Object.entries(headers).forEach(([key, value]) => {
                      xhr.setRequestHeader(key, value);
                    });
                  }
                }
              });
              hls.loadSource(video.src);
              hls.attachMedia(video);
            },
            dash: function (video: any) {
              const player = dashjs.MediaPlayer().create();
              player.initialize(video, video.src, autoplay);
              if (headers) {
                (player.updateSettings as any)({
                  'streaming': {
                    'xhr': {
                      'customHeaders': Object.entries(headers).map(([key, value]) => ({ key, value }))
                    }
                  }
                });
              }
            }
          }
        },
        controls: false
      });

      dp.on('play', () => onPlayStateChange?.(false));
      dp.on('pause', () => onPlayStateChange?.(true));
      dp.on('error', () => {
        if (!isMounted) return;
        console.error("DPlayer Error");
        onError('DPlayer playback error');
      });
      dp.on('waiting', () => setIsLoading(true));
      dp.on('playing', () => setIsLoading(false));
      dp.on('canplay', () => setIsLoading(false));

      setIsLoading(false);
      prevUrlRef.current = url;
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      // Only dispose if unmounting the whole engine
    };
  }, [url, autoplay, headers, onError, onPlayStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
          <Activity className="w-16 h-16 text-[#00ff88] animate-pulse mb-6" />
          <p className="text-white font-black tracking-widest animate-pulse uppercase text-xs">Initializing DPlayer</p>
        </div>
      )}
    </div>
  );
};
