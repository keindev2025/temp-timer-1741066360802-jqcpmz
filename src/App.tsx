import React from 'react';
import { Clock, Timer as TimerIcon, Music, Volume2, Volume1, VolumeX, Upload, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

type TimerType = 'time' | 'duration';

interface BGMTrack {
  id: string;
  title: string;
  composer: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/x-m4a'
];

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timerType, setTimerType] = useState<TimerType>('time');
  const [targetTime, setTargetTime] = useState('');
  const [durationInput, setDurationInput] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isBGMPlaying, setIsBGMPlaying] = useState(false);
  const [isBGMLoaded, setIsBGMLoaded] = useState(false);
  const [tracks, setTracks] = useState<BGMTrack[]>(() => {
    try {
      const saved = localStorage.getItem('bgmTracks');
      if (!saved) return [];

      const parsedTracks = JSON.parse(saved);
      // 以前のBlobURLを無効化
      parsedTracks.forEach((track: BGMTrack) => {
        if (track.filename.startsWith('blob:')) {
          URL.revokeObjectURL(track.filename);
        }
      });
      return [];
    } catch (error) {
      console.error('Error loading tracks:', error);
      return [];
    }
  });
  const [selectedTrack, setSelectedTrack] = useState<BGMTrack | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [volume, setVolume] = useState(0.5);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number>();

  useEffect(() => {
    let mounted = true;

    const loadAudio = async () => {
      if (!bgmRef.current) return;

      console.log('Setting up BGM audio...');
      
      try {
        bgmRef.current.oncanplaythrough = () => {
          console.log('BGM can play through');
          if (mounted) {
            setIsBGMLoaded(true);
          }
        };

        bgmRef.current.onerror = (e) => {
          console.error('BGM loading error:', e);
          if (mounted) {
            setIsBGMLoaded(false);
          }
        };

        bgmRef.current.volume = volume;
        
        if (!isBGMLoaded) {
          await bgmRef.current.load();
          console.log('BGM load called');
        }

      } catch (error) {
        console.error('Error in BGM setup:', error);
        if (mounted) {
          setIsBGMLoaded(false);
        }
      }
    };

    loadAudio();

    return () => {
      mounted = false;
      if (bgmRef.current) {
        bgmRef.current.oncanplaythrough = null;
        bgmRef.current.onerror = null;
      }
    };
  }, [selectedTrack]);

  // ボリューム変更時の処理を分離
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (endTime) {
        const now = new Date();
        if (now >= endTime) {
          playAlarm();
          setEndTime(null);
          clearInterval(timerRef.current);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const startTimer = () => {
    let targetDate: Date;

    if (timerType === 'time') {
      if (!targetTime) return;
      const [hours, minutes] = targetTime.split(':').map(Number);
      targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);
      if (targetDate < new Date()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    } else {
      const { hours, minutes, seconds } = durationInput;
      if (hours === 0 && minutes === 0 && seconds === 0) return;
      const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
      targetDate = new Date(Date.now() + totalSeconds * 1000);
    }

    setEndTime(targetDate);
  };

  const stopTimer = () => {
    setEndTime(null);
  };

  const playAlarm = () => {
    if (audioRef.current) {
      if (bgmRef.current && isBGMPlaying) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
        setIsBGMPlaying(false);
      }
      audioRef.current.play();
    }
  };

  const toggleBGM = () => {
    if (bgmRef.current && isBGMLoaded) {
      if (isBGMPlaying) {
        try {
          bgmRef.current.pause();
          bgmRef.current.currentTime = 0;
          setIsBGMPlaying(false);
        } catch (error) {
          console.error('Error stopping BGM:', error);
        }
      } else {
        try {
          const playPromise = bgmRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsBGMPlaying(true);
              })
              .catch((error) => {
                console.error('Error playing BGM:', error);
                setIsBGMPlaying(false);
              });
          } else {
            setIsBGMPlaying(false);
          }
        } catch (error) {
          console.error('Error starting BGM:', error);
          setIsBGMPlaying(false);
        }
      }
    }
  };

  const getTimeLeft = (): string | null => {
    if (!endTime) return null;
    const now = new Date();
    const diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-800">
              {currentTime.toLocaleTimeString()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={toggleBGM}
                className={`p-2 rounded-full transition-colors ${
                  !isBGMLoaded
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : isBGMPlaying
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                disabled={!isBGMLoaded}
              >
                <Music className="w-5 h-5" />
              </button>
              
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-3 hidden group-hover:block z-10">
                <div className="space-y-2">
                  {showUploadForm ? (
                    <div className="p-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // ファイルサイズチェック
                          if (file.size > MAX_FILE_SIZE) {
                            setUploadError('ファイルサイズは10MB以下にしてください');
                            return;
                          }

                          // ファイル形式チェック
                          if (!ACCEPTED_FORMATS.includes(file.type)) {
                            setUploadError('対応していないファイル形式です');
                            return;
                          }

                          setUploadError(null);

                          // ファイル名を生成
                          const timestamp = Date.now();
                          const ext = file.name.split('.').pop();
                          const filename = `${timestamp}.${ext}`;

                          try {
                            // FormDataを使用してファイルをアップロード
                            const formData = new FormData();
                            formData.append('file', file);

                            // ファイルを移動
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              if (!event.target?.result) return;

                              // ArrayBufferをBlobに変換
                              const blob = new Blob([event.target.result], { type: file.type });

                              // BlobURLを作成
                              const blobUrl = URL.createObjectURL(blob);

                              // トラック情報を保存
                              const newTrack: BGMTrack = {
                                id: timestamp.toString(),
                                title: file.name.split('.')[0],
                                composer: '不明',
                                filename: blobUrl,
                                originalName: file.name,
                                size: file.size,
                                type: file.type,
                                uploadedAt: new Date().toISOString()
                              };

                              const updatedTracks = [...tracks, newTrack];
                              setTracks(updatedTracks);
                              localStorage.setItem('bgmTracks', JSON.stringify(updatedTracks));
                              setSelectedTrack(newTrack);
                              setShowUploadForm(false);
                            };

                            reader.readAsArrayBuffer(file);
                          } catch (error) {
                            console.error('Upload error:', error);
                            setUploadError('アップロード中にエラーが発生しました');
                          }
                        }}
                        accept={ACCEPTED_FORMATS.join(',')}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 px-4 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          <span>ファイルを選択</span>
                        </button>
                        {uploadError && (
                          <p className="text-sm text-red-600">{uploadError}</p>
                        )}
                        <button
                          onClick={() => setShowUploadForm(false)}
                          className="w-full py-2 px-4 text-gray-600 rounded hover:bg-gray-100"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {tracks.map((track) => (
                        <div
                          key={track.id}
                          className={`w-full text-left p-2 rounded transition-colors flex items-center justify-between ${
                            selectedTrack?.id === track.id
                              ? 'bg-blue-50 text-blue-600'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (isBGMPlaying) {
                                bgmRef.current?.pause();
                              }
                              setSelectedTrack(track);
                              setIsBGMPlaying(false);
                            }}
                            className="flex-1"
                          >
                            <div className="font-medium">{track.title}</div>
                            <div className="text-sm text-gray-600">{track.composer}</div>
                          </button>
                          <button
                            onClick={() => {
                              if (selectedTrack?.id === track.id) {
                                bgmRef.current?.pause();
                                setSelectedTrack(null);
                                setIsBGMPlaying(false);
                              }
                              if (track.filename.startsWith('blob:')) {
                                URL.revokeObjectURL(track.filename);
                              }
                              const updatedTracks = tracks.filter(t => t.id !== track.id);
                              setTracks(updatedTracks);
                              localStorage.setItem('bgmTracks', JSON.stringify(updatedTracks));
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="w-full py-2 px-4 text-gray-600 rounded hover:bg-gray-100 flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>BGMをアップロード</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVolume(v => Math.max(0, v - 0.1))}
                className="p-1 rounded hover:bg-gray-100"
              >
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setTimerType('time')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                timerType === 'time'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              時刻指定
            </button>
            <button
              onClick={() => setTimerType('duration')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                timerType === 'duration'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              時間指定
            </button>
          </div>

          {timerType === 'time' ? (
            <input
              type="time"
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={durationInput.hours}
                  onChange={(e) => setDurationInput(prev => ({
                    ...prev,
                    hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setDurationInput(prev => ({
                        ...prev,
                        hours: Math.min(23, prev.hours + 1)
                      }));
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setDurationInput(prev => ({
                        ...prev,
                        hours: Math.max(0, prev.hours - 1)
                      }));
                    } else if (e.key >= '0' && e.key <= '9') {
                      e.preventDefault();
                      const newValue = (durationInput.hours * 10 + parseInt(e.key)) % 100;
                      setDurationInput(prev => ({
                        ...prev,
                        hours: Math.min(23, newValue)
                      }));
                      // 2桁入力後に次のフィールドへ
                      if (durationInput.hours >= 2 || newValue > 23) {
                        const nextInput = document.querySelector(`input[tabindex="2"]`) as HTMLElement;
                        nextInput?.focus();
                      }
                    } else if (e.key === 'Backspace' && durationInput.hours === 0) {
                      // 前のフィールドへ
                      const prevInput = document.querySelector(`input[tabindex="3"]`) as HTMLElement;
                      prevInput?.focus();
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center outline-none"
                  tabIndex={1}
                />
                <div className="text-sm text-gray-600 text-center">時間</div>
              </div>
              <div className="space-y-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationInput.minutes}
                  onChange={(e) => setDurationInput(prev => ({
                    ...prev,
                    minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setDurationInput(prev => ({
                        ...prev,
                        minutes: Math.min(59, prev.minutes + 1)
                      }));
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setDurationInput(prev => ({
                        ...prev,
                        minutes: Math.max(0, prev.minutes - 1)
                      }));
                    } else if (e.key >= '0' && e.key <= '9') {
                      e.preventDefault();
                      const newValue = (durationInput.minutes * 10 + parseInt(e.key)) % 100;
                      setDurationInput(prev => ({
                        ...prev,
                        minutes: Math.min(59, newValue)
                      }));
                      // 2桁入力後に次のフィールドへ
                      if (durationInput.minutes >= 5 || newValue > 59) {
                        const nextInput = document.querySelector(`input[tabindex="3"]`) as HTMLElement;
                        nextInput?.focus();
                      }
                    } else if (e.key === 'Backspace' && durationInput.minutes === 0) {
                      // 前のフィールドへ
                      const prevInput = document.querySelector(`input[tabindex="1"]`) as HTMLElement;
                      prevInput?.focus();
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center outline-none"
                  tabIndex={2}
                />
                <div className="text-sm text-gray-600 text-center">分</div>
              </div>
              <div className="space-y-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationInput.seconds}
                  onChange={(e) => setDurationInput(prev => ({
                    ...prev,
                    seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setDurationInput(prev => ({
                        ...prev,
                        seconds: Math.min(59, prev.seconds + 1)
                      }));
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setDurationInput(prev => ({
                        ...prev,
                        seconds: Math.max(0, prev.seconds - 1)
                      }));
                    } else if (e.key >= '0' && e.key <= '9') {
                      e.preventDefault();
                      const newValue = (durationInput.seconds * 10 + parseInt(e.key)) % 100;
                      setDurationInput(prev => ({
                        ...prev,
                        seconds: Math.min(59, newValue)
                      }));
                      if (durationInput.seconds >= 5 || newValue > 59) {
                        (e.target as HTMLInputElement).blur(); // フォーカスを外す
                      }
                    } else if (e.key === 'Backspace' && durationInput.seconds === 0) {
                      // 前のフィールドへ
                      const prevInput = document.querySelector(`input[tabindex="2"]`) as HTMLElement;
                      prevInput?.focus();
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center outline-none"
                  tabIndex={3}
                />
                <div className="text-sm text-gray-600 text-center">秒</div>
              </div>
            </div>
          )}

          {endTime !== null && (
            <div className="text-center py-4 px-6 bg-gray-50 rounded-lg">
              <p className="text-3xl font-mono text-gray-800">
                {getTimeLeft()}
              </p>
            </div>
          )}

          <button
            onClick={endTime ? stopTimer : startTimer}
            className={`w-full py-3 px-6 rounded-lg font-medium flex items-center justify-center space-x-2 ${
              endTime
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <TimerIcon className="w-5 h-5" />
            <span>{endTime ? 'タイマー停止' : 'タイマー開始'}</span>
          </button>
        </div>

        <audio ref={audioRef}>
          <source src="/audio/alarm.mp3" type="audio/mpeg" />
        </audio>
        <audio ref={bgmRef} loop preload="auto">
          {selectedTrack && (
            <source src={selectedTrack.filename} type={selectedTrack.type} />
          )}
        </audio>
      </div>
    </div>
  );
}

export default App;
