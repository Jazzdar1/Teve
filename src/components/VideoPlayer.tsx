import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import DPlayer from 'dplayer';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Settings, AlertCircle, MonitorPlay, Activity, Play, Wifi, Terminal, Zap } from 'lucide-react';

// Make Hls globally available for DPlayer
if (typeof window !== 'undefined' && !(window as any).Hls) {
  (window as any).Hls = Hls;
}

interface VideoPlayerProps {
  url: string;
  drm?: any;
  className?: string;
}

type Engine = 'Auto' | 'HLS.js' | 'DPlayer' | 'JWPlayer' | 'Video.js';
type Quality = 'Auto' | 'Low' | 'Medium' | 'High';
type BufferSize = 'Small' | 'Medium' | 'Large' | 'XL';
type ABRStrategy = 'Default' | 'Conservative' | 'Aggressive';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, drm, className }) => {
  const [selectedEngine, setSelectedEngine] = useState<Engine>(() => {
    return (localStorage.getItem('player_engine') as Engine) || 'Auto';
  });
  const [fallbackEngine, setFallbackEngine] = useState<Engine | null>(null);
  const [quality, setQuality] = useState<Quality>(() => {
    return (localStorage.getItem('player_quality') as Quality) || 'Auto';
  });
  const [bufferSize, setBufferSize] = useState<BufferSize>(() => {
    return (localStorage.getItem('player_buffer') as BufferSize) || 'Medium';
  });
  const [abrStrategy, setAbrStrategy] = useState<ABRStrategy>(() => {
    return (localStorage.getItem('player_abr') as ABRStrategy) || 'Default';
  });
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    const saved = localStorage.getItem('player_autoplay');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [bandwidthThrottling, setBandwidthThrottling] = useState<boolean>(() => {
    const saved = localStorage.getItem('player_throttle');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [lowLatency, setLowLatency] = useState<boolean>(() => {
    const saved = localStorage.getItem('player_lowlat');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('player_engine', selectedEngine);
  }, [selectedEngine]);

  useEffect(() => {
    localStorage.setItem('player_quality', quality);
  }, [quality]);

  useEffect(() => {
    localStorage.setItem('player_buffer', bufferSize);
  }, [bufferSize]);

  useEffect(() => {
    localStorage.setItem('player_abr', abrStrategy);
  }, [abrStrategy]);

  useEffect(() => {
    localStorage.setItem('player_autoplay', JSON.stringify(autoplay));
  }, [autoplay]);

  useEffect(() => {
    localStorage.setItem('player_throttle', JSON.stringify(bandwidthThrottling));
  }, [bandwidthThrottling]);

  useEffect(() => {
    localStorage.setItem('player_lowlat', JSON.stringify(lowLatency));
  }, [lowLatency]);

  const [audioTracks, setAudioTracks] = useState<{id: number, name: string}[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{id: number, name: string}[]>([]);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<number>(-1);

  // Reset error and fallback when URL or engine changes
  useEffect(() => {
    setError(null);
    setFallbackEngine(null);
    setAudioTracks([]);
    setSelectedAudioTrack(-1);
    setSubtitleTracks([]);
    setSelectedSubtitleTrack(-1);
  }, [url, selectedEngine]);

  const activeEngine = useMemo(() => {
    if (fallbackEngine) return fallbackEngine;
    if (selectedEngine !== 'Auto') return selectedEngine;
    if (!url) return 'Video.js';
    
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.m3u8')) {
      return 'HLS.js';
    }
    // Default fallback
    return 'Video.js';
  }, [url, selectedEngine, fallbackEngine]);

  const handleError = (msg: string) => {
    if (msg === "JWPLAYER_FALLBACK" || msg === "DPLAYER_FALLBACK" || msg === "VIDEOJS_FALLBACK") {
      setFallbackEngine('HLS.js');
      return;
    }
    setError(msg);
  };

  return (
    <div className={`relative bg-black mx-auto group ${className}`}>
      {/* Engine Renderer */}
      <div className="w-full h-full absolute inset-0">
        {activeEngine === 'HLS.js' && <HlsJsPlayer url={url} onError={handleError} quality={quality} autoplay={autoplay} lowLatency={lowLatency} limitBandwidth={bandwidthThrottling} bufferSize={bufferSize} abrStrategy={abrStrategy} onAudioTracks={setAudioTracks} onSubtitleTracks={setSubtitleTracks} selectedAudioTrack={selectedAudioTrack} selectedSubtitleTrack={selectedSubtitleTrack} />}
        {activeEngine === 'DPlayer' && <DPlayerComponent url={url} onError={handleError} autoplay={autoplay} bufferSize={bufferSize} abrStrategy={abrStrategy} />}
        {activeEngine === 'JWPlayer' && <JWPlayerComponent url={url} drm={drm} onError={handleError} autoplay={autoplay} />}
        {activeEngine === 'Video.js' && <VideoJsComponent url={url} onError={handleError} autoplay={autoplay} />}
      </div>

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40 backdrop-blur-sm">
          <div className="text-center flex flex-col items-center gap-4 p-6 bg-[#1a1a1a] rounded-2xl border border-white/10 max-w-md mx-4 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-gray-200 font-medium">{error}</p>
            <p className="text-sm text-gray-400">Try selecting a different player engine from the settings menu in the top right.</p>
          </div>
        </div>
      )}

      {/* Settings Toggle */}
      <div className="absolute top-4 left-4 z-50 transition-opacity duration-300">
        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/10 transition-colors shadow-lg flex items-center gap-2"
            title="Player Engine Settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium pr-1 hidden sm:block">Settings</span>
          </button>
          
          {showSettings && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-[#1a1a1a] z-10">
                <MonitorPlay className="w-3 h-3" />
                Select Engine
              </div>
              {(['Auto', 'HLS.js', 'DPlayer', 'JWPlayer', 'Video.js'] as Engine[]).map((engine) => (
                <button
                  key={engine}
                  onClick={() => {
                    setSelectedEngine(engine);
                    setShowSettings(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedEngine === engine 
                      ? 'bg-[#00ff88]/10 text-[#00ff88] font-medium' 
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {engine} {selectedEngine === 'Auto' && engine === 'Auto' ? `(${activeEngine})` : ''}
                  {fallbackEngine && selectedEngine === engine ? ` (Fell back to ${fallbackEngine})` : ''}
                </button>
              ))}
              
              <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                <Activity className="w-3 h-3" />
                Video Quality
              </div>
              {(['Auto', 'Low', 'Medium', 'High'] as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuality(q);
                    setShowSettings(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    quality === q 
                      ? 'bg-[#00ff88]/10 text-[#00ff88] font-medium' 
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {q}
                </button>
              ))}

              <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                <Activity className="w-3 h-3" />
                Buffer Size
              </div>
              {(['Small', 'Medium', 'Large', 'XL'] as BufferSize[]).map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBufferSize(b);
                    setShowSettings(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    bufferSize === b 
                      ? 'bg-[#00ff88]/10 text-[#00ff88] font-medium' 
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {b}
                </button>
              ))}

              <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                <Activity className="w-3 h-3" />
                ABR Strategy
              </div>
              {(['Default', 'Conservative', 'Aggressive'] as ABRStrategy[]).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAbrStrategy(a);
                    setShowSettings(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    abrStrategy === a 
                      ? 'bg-[#00ff88]/10 text-[#00ff88] font-medium' 
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {a}
                </button>
              ))}

              {audioTracks.length > 0 && (
                <>
                  <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                    <Activity className="w-3 h-3" />
                    Audio Track
                  </div>
                  {audioTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        setSelectedAudioTrack(track.id);
                        setShowSettings(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedAudioTrack === track.id 
                          ? 'bg-[#00ff88]/10 text-[#00ff88] font-medium' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {track.name}
                    </button>
                  ))}
                </>
              )}

              {subtitleTracks.length > 0 && (
                <>
                  <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                    <Activity className="w-3 h-3" />
                    Subtitle Track
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSubtitleTrack(-1);
                      setShowSettings(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedSubtitleTrack === -1 
                        ? 'bg-[#00ff88]/10 text-[#00ff88] font-medium' 
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    Off
                  </button>
                  {subtitleTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        setSelectedSubtitleTrack(track.id);
                        setShowSettings(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedSubtitleTrack === track.id 
                          ? 'bg-[#00ff88]/10 text-[#00ff88] font-medium' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {track.name}
                    </button>
                  ))}
                </>
              )}

              <div className="px-3 py-3 border-t border-gray-800 flex items-center justify-between mt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Play className="w-3 h-3" />
                  Autoplay
                </div>
                <button 
                  onClick={() => setAutoplay(!autoplay)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoplay ? 'bg-[#00ff88]' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoplay ? 'translate-x-4.5' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="px-3 py-3 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Zap className="w-3 h-3" />
                  Low Latency
                </div>
                <button 
                  onClick={() => setLowLatency(!lowLatency)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${lowLatency ? 'bg-[#00ff88]' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${lowLatency ? 'translate-x-4.5' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="px-3 py-3 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Wifi className="w-3 h-3" />
                  Throttle B/W
                </div>
                <button 
                  onClick={() => setBandwidthThrottling(!bandwidthThrottling)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${bandwidthThrottling ? 'bg-[#00ff88]' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${bandwidthThrottling ? 'translate-x-4.5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Player Components ---

const HlsJsPlayer = ({ url, onError, quality, autoplay, lowLatency, limitBandwidth, bufferSize, abrStrategy, onAudioTracks, onSubtitleTracks, selectedAudioTrack, selectedSubtitleTrack }: { url: string, onError: (msg: string) => void, quality: Quality, autoplay: boolean, lowLatency?: boolean, limitBandwidth?: boolean, bufferSize?: BufferSize, abrStrategy?: ABRStrategy, onAudioTracks?: (tracks: {id: number, name: string}[]) => void, onSubtitleTracks?: (tracks: {id: number, name: string}[]) => void, selectedAudioTrack?: number, selectedSubtitleTrack?: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const applyQuality = (hlsInstance: Hls) => {
    if (quality === 'Auto') {
      hlsInstance.currentLevel = -1;
    } else {
      const levels = hlsInstance.levels;
      if (levels && levels.length > 0) {
        let targetLevel = 0;
        if (quality === 'High') targetLevel = levels.length - 1;
        else if (quality === 'Medium') targetLevel = Math.floor(levels.length / 2);
        hlsInstance.currentLevel = targetLevel;
      }
    }
  };

  useEffect(() => {
    if (hlsRef.current) applyQuality(hlsRef.current);
  }, [quality]);

  useEffect(() => {
    if (hlsRef.current && selectedAudioTrack !== undefined && selectedAudioTrack !== -1) {
      hlsRef.current.audioTrack = selectedAudioTrack;
    }
  }, [selectedAudioTrack]);

  useEffect(() => {
    if (hlsRef.current && selectedSubtitleTrack !== undefined) {
      hlsRef.current.subtitleTrack = selectedSubtitleTrack;
    }
  }, [selectedSubtitleTrack]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let networkErrorCount = 0;

    if (Hls.isSupported()) {
      let maxBufferLength = lowLatency ? 10 : 30;
      let maxMaxBufferLength = 600;
      if (bufferSize === 'Small') { maxBufferLength = 10; maxMaxBufferLength = 20; }
      else if (bufferSize === 'Large') { maxBufferLength = 60; maxMaxBufferLength = 120; }
      else if (bufferSize === 'XL') { maxBufferLength = 120; maxMaxBufferLength = 240; }

      let abrEwmaFastLive = 3;
      let abrEwmaSlowLive = 9;
      let abrEwmaFastVoD = 3;
      let abrEwmaSlowVoD = 9;

      if (abrStrategy === 'Conservative') {
         abrEwmaFastLive = 5;
         abrEwmaSlowLive = 15;
         abrEwmaFastVoD = 5;
         abrEwmaSlowVoD = 15;
      } else if (abrStrategy === 'Aggressive') {
         abrEwmaFastLive = 1;
         abrEwmaSlowLive = 3;
         abrEwmaFastVoD = 1;
         abrEwmaSlowVoD = 3;
      }

      hls = new Hls({
        maxBufferSize: limitBandwidth ? 5 * 1000 * 1000 : 0, // 5MB if throttled
        maxBufferLength,
        maxMaxBufferLength,
        abrEwmaFastLive,
        abrEwmaSlowLive,
        abrEwmaFastVoD,
        abrEwmaSlowVoD,
        liveSyncDurationCount: lowLatency ? 2 : 3,
        liveMaxLatencyDurationCount: lowLatency ? 5 : 10,
        enableWorker: true,
        capLevelToPlayerSize: limitBandwidth,
      });
      hlsRef.current = hls;
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyQuality(hls!);
        if (onAudioTracks && hls!.audioTracks) {
          onAudioTracks(hls!.audioTracks.map(t => ({ id: t.id, name: t.name })));
        }
        if (onSubtitleTracks && hls!.subtitleTracks) {
          onSubtitleTracks(hls!.subtitleTracks.map(t => ({ id: t.id, name: t.name })));
        }
        if (autoplay) {
          video.play().catch(e => {
            // Ignore autoplay errors
          });
        }
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount <= 3) {
                hls?.startLoad();
              } else {
                hls?.destroy();
                onError("Network error. The stream might be offline, geo-blocked, or have CORS issues.");
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              onError("HLS.js encountered a fatal error.");
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        if (autoplay) {
          video.play().catch(e => {
            // Ignore autoplay errors
          });
        }
      });
      video.addEventListener('error', () => onError("Native playback error."));
    } else {
      onError("HLS is not supported in this browser.");
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      hlsRef.current = null;
    };
  }, [url, onError]);

  return <video ref={videoRef} className="w-full h-full object-contain" controls crossOrigin="anonymous" playsInline autoPlay={autoplay} />;
};



const DPlayerComponent = ({ url, onError, autoplay, bufferSize, abrStrategy }: { url: string, onError: (msg: string) => void, autoplay: boolean, bufferSize?: BufferSize, abrStrategy?: ABRStrategy }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dpRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const lowerUrl = url.toLowerCase();
      const isHls = lowerUrl.includes('.m3u8') || lowerUrl.includes('.ts') || (!lowerUrl.includes('.mp4') && !lowerUrl.includes('.webm') && !lowerUrl.includes('.mkv') && !lowerUrl.includes('.mpd'));
      const dp = new DPlayer({
        container: containerRef.current,
        video: {
          url: url,
          type: isHls ? 'customHls' : 'auto',
          customType: {
            customHls: function (video: HTMLVideoElement, player: any) {
              let maxBufferLength = 30;
              let maxMaxBufferLength = 600;
              if (bufferSize === 'Small') { maxBufferLength = 10; maxMaxBufferLength = 20; }
              else if (bufferSize === 'Large') { maxBufferLength = 60; maxMaxBufferLength = 120; }
              else if (bufferSize === 'XL') { maxBufferLength = 120; maxMaxBufferLength = 240; }

              let abrEwmaFastLive = 3;
              let abrEwmaSlowLive = 9;
              let abrEwmaFastVoD = 3;
              let abrEwmaSlowVoD = 9;

              if (abrStrategy === 'Conservative') {
                 abrEwmaFastLive = 5;
                 abrEwmaSlowLive = 15;
                 abrEwmaFastVoD = 5;
                 abrEwmaSlowVoD = 15;
              } else if (abrStrategy === 'Aggressive') {
                 abrEwmaFastLive = 1;
                 abrEwmaSlowLive = 3;
                 abrEwmaFastVoD = 1;
                 abrEwmaSlowVoD = 3;
              }

              const hls = new Hls({
                maxBufferLength,
                maxMaxBufferLength,
                abrEwmaFastLive,
                abrEwmaSlowLive,
                abrEwmaFastVoD,
                abrEwmaSlowVoD,
              });
              hls.loadSource(video.src);
              hls.attachMedia(video);
              
              hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                  onError('DPLAYER_FALLBACK');
                }
              });
              
              player.events.on('destroy', () => {
                hls.destroy();
              });
            },
          },
        },
        autoplay: autoplay,
      });
      
      dpRef.current = dp;
      
      dp.on('error', () => {
        onError('DPLAYER_FALLBACK');
      });
    } catch (e) {
      onError("Failed to initialize DPlayer.");
    }
    
    return () => {
      if (dpRef.current) {
        dpRef.current.destroy();
      }
    };
  }, [url, onError]);

  return <div ref={containerRef} className="w-full h-full" />;
};

const JWPlayerComponent = ({ url, drm, onError, autoplay }: { url: string, drm?: any, onError: (msg: string) => void, autoplay: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerId = useMemo(() => `jw-player-${Math.random().toString(36).substr(2, 9)}`, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const initPlayer = () => {
      if (!(window as any).jwplayer) {
        onError("JWPlayer script failed to load.");
        return;
      }
      
      try {
        const player = (window as any).jwplayer(playerId);
        
        if (player && typeof player.setup === 'function') {
          let type = 'hls';
          const lowerUrl = url.toLowerCase();
          if (lowerUrl.includes('.mpd')) type = 'dash';
          else if (lowerUrl.includes('.mp4')) type = 'mp4';
          else if (lowerUrl.includes('.webm')) type = 'webm';
          else if (lowerUrl.includes('.mkv')) type = 'mp4';
          else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) type = 'youtube';

          let finalUrl = url;
          if (window.location.protocol === 'https:' && url.startsWith('http://')) {
            finalUrl = url.replace('http://', 'https://');
          }

          const setupConfig: any = {
            playlist: [{
              file: finalUrl,
              type: type,
              ...(drm ? { drm } : {})
            }],
            autostart: autoplay,
            width: '100%',
            height: '100%',
          };

          player.setup(setupConfig);
          
          player.on('error', (e: any) => {
            onError("JWPLAYER_FALLBACK");
          });
          
          player.on('setupError', (e: any) => {
            onError("JWPLAYER_FALLBACK");
          });
        } else {
          onError("JWPlayer failed to initialize properly.");
        }
      } catch (e) {
        onError("Failed to initialize JWPlayer.");
      }
    };

    if (!(window as any).jwplayer) {
      const script = document.createElement('script');
      script.src = "https://content.jwplatform.com/libraries/KB5zFt7A.js";
      script.onload = initPlayer;
      script.onerror = () => onError("Failed to load JWPlayer script.");
      document.body.appendChild(script);
    } else {
      initPlayer();
    }

    return () => {
      try {
        const player = (window as any).jwplayer && (window as any).jwplayer(playerId);
        if (player && typeof player.remove === 'function') {
          player.remove();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [url, onError, autoplay, playerId]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div id={playerId} ref={containerRef} className="w-full h-full" />
    </div>
  );
};



const VideoJsComponent = ({ url, onError, autoplay }: { url: string, onError: (msg: string) => void, autoplay: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const videoElement = document.createElement('video');
    videoElement.className = 'video-js vjs-big-play-centered w-full h-full';
    containerRef.current.appendChild(videoElement);

    const lowerUrl = url.toLowerCase();
    const isHls = lowerUrl.includes('.m3u8') || lowerUrl.includes('.ts') || (!lowerUrl.includes('.mp4') && !lowerUrl.includes('.webm') && !lowerUrl.includes('.mkv') && !lowerUrl.includes('.mpd'));
    
    playerRef.current = videojs(videoElement, {
      autoplay: autoplay,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [{
        src: url,
        type: isHls ? 'application/x-mpegURL' : 'video/mp4'
      }]
    }, () => {
      // Video.js player is ready
    });

    playerRef.current.on('error', () => {
      onError('VIDEOJS_FALLBACK');
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [url, onError]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black" data-vjs-player ref={containerRef}>
    </div>
  );
};
