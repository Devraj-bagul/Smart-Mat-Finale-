import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import './MeditationPage.css';

// ── Sound frequencies for binaural/tone generation ──
const SOUNDS = [
  { id: 'om', label: '🕉️ Om Chant', freq: 136.1, type: 'om' },
  { id: 'rain', label: '🌧️ Rain', freq: 0, type: 'rain' },
  { id: 'bowl', label: '🎵 Singing Bowl', freq: 432, type: 'bowl' },
  { id: 'forest', label: '🌿 Forest', freq: 0, type: 'forest' },
  { id: 'ocean', label: '🌊 Ocean Waves', freq: 0, type: 'ocean' },
  { id: 'binaural', label: '🧠 Binaural Beats', freq: 10, type: 'binaural' },
];

const SESSIONS = [
  { id: 'quick', label: 'Quick Reset', duration: 5, icon: '⚡', desc: 'A short 5-minute refresh' },
  { id: 'morning', label: 'Morning Calm', duration: 10, icon: '🌅', desc: 'Begin the day with clarity' },
  { id: 'deep', label: 'Deep Focus', duration: 20, icon: '🧘', desc: 'Dive into deep awareness' },
  { id: 'sleep', label: 'Sleep Prep', duration: 30, icon: '🌙', desc: 'Ease into restful sleep' },
  { id: 'custom', label: 'Custom', duration: null, icon: '⚙️', desc: 'Set your own duration' },
];

const BREATHING_PATTERNS = [
  { id: '4-7-8', label: '4-7-8 Relaxing', inhale: 4, hold: 7, exhale: 8 },
  { id: 'box', label: 'Box Breathing', inhale: 4, hold: 4, exhale: 4 },
  { id: 'calm', label: '4-4-6 Calm', inhale: 4, hold: 4, exhale: 6 },
  { id: 'energize', label: '6-2-4 Energize', inhale: 6, hold: 2, exhale: 4 },
];

function useAudioContext() {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  return { getCtx };
}

// Simple procedural sounds using Web Audio API
function createRainSound(ctx) {
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.06;
    }
  };
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;
  node.connect(filter);
  filter.connect(ctx.destination);
  return { node, filter };
}

function createOmSound(ctx) {
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  const freqs = [136.1, 272.2, 408.3];
  const oscs = freqs.map(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
    return osc;
  });
  gain.connect(ctx.destination);
  return { oscs, gain };
}

function createBowlSound(ctx) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 432;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 528;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc2.start();
  return { oscs: [osc, osc2], gain };
}

function createBinauralSound(ctx) {
  const gainL = ctx.createGain();
  const gainR = ctx.createGain();
  gainL.gain.value = 0.1;
  gainR.gain.value = 0.1;
  const merger = ctx.createChannelMerger(2);
  const oscL = ctx.createOscillator();
  oscL.frequency.value = 200;
  const oscR = ctx.createOscillator();
  oscR.frequency.value = 210; // 10Hz alpha beat
  oscL.connect(gainL);
  oscR.connect(gainR);
  gainL.connect(merger, 0, 0);
  gainR.connect(merger, 0, 1);
  merger.connect(ctx.destination);
  oscL.start();
  oscR.start();
  return { oscs: [oscL, oscR], gains: [gainL, gainR], merger };
}

export default function MeditationPage() {
  const [selectedSession, setSelectedSession] = useState(SESSIONS[0]);
  const [customMinutes, setCustomMinutes] = useState(15);
  const [activeSound, setActiveSound] = useState(null);
  const [soundVolume, setSoundVolume] = useState(60);
  const [breathPattern, setBreathPattern] = useState(BREATHING_PATTERNS[0]);
  const [timerState, setTimerState] = useState('idle'); // idle | running | paused | done
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [breathPhase, setBreathPhase] = useState('inhale'); // inhale | hold | exhale
  const [breathCount, setBreathCount] = useState(0);
  const [breathProgress, setBreathProgress] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [sessionCount, setSessionCount] = useState(() => parseInt(localStorage.getItem('meditationSessions') || '0'));
  const [totalMins, setTotalMins] = useState(() => parseInt(localStorage.getItem('meditationMins') || '0'));

  const timerRef = useRef(null);
  const breathRef = useRef(null);
  const soundNodeRef = useRef(null);
  const { getCtx } = useAudioContext();

  // ── Duration ──
  const getDuration = () => {
    if (selectedSession.id === 'custom') return customMinutes * 60;
    return selectedSession.duration * 60;
  };

  // ── Sound Control ──
  const stopSound = useCallback(() => {
    if (!soundNodeRef.current) return;
    const s = soundNodeRef.current;
    try {
      if (s.oscs) s.oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch (_) {} });
      if (s.node) { s.node.disconnect(); }
      if (s.filter) { s.filter.disconnect(); }
      if (s.gain) { s.gain.disconnect(); }
      if (s.gains) s.gains.forEach(g => { try { g.disconnect(); } catch (_) {} });
      if (s.merger) { try { s.merger.disconnect(); } catch (_) {} }
    } catch (_) {}
    soundNodeRef.current = null;
  }, []);

  const playSound = useCallback((soundId) => {
    stopSound();
    if (!soundId) return;
    try {
      const ctx = getCtx();
      let node = null;
      switch (soundId) {
        case 'om': node = createOmSound(ctx); break;
        case 'rain': node = createRainSound(ctx); break;
        case 'bowl': node = createBowlSound(ctx); break;
        case 'binaural': node = createBinauralSound(ctx); break;
        default: break;
      }
      soundNodeRef.current = node;
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }, [stopSound, getCtx]);

  const toggleSound = (soundId) => {
    if (activeSound === soundId) {
      setActiveSound(null);
      stopSound();
    } else {
      setActiveSound(soundId);
      playSound(soundId);
    }
  };

  // ── Timer ──
  const startTimer = () => {
    const secs = getDuration();
    setSecondsLeft(secs);
    setTotalSeconds(secs);
    setTimerState('running');
    setShowBreathing(true);
    setBreathPhase('inhale');
    setBreathCount(0);
    setBreathProgress(0);
  };

  const pauseTimer = () => {
    setTimerState(prev => prev === 'running' ? 'paused' : 'running');
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    clearInterval(breathRef.current);
    setTimerState('idle');
    setSecondsLeft(0);
    setTotalSeconds(0);
    setShowBreathing(false);
    setBreathPhase('inhale');
    setBreathProgress(0);
  };

  // Main countdown
  useEffect(() => {
    if (timerState === 'running') {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerState('done');
            setShowBreathing(false);
            const mins = Math.round(getDuration() / 60);
            setSessionCount(c => { const n = c + 1; localStorage.setItem('meditationSessions', n); return n; });
            setTotalMins(m => { const n = m + mins; localStorage.setItem('meditationMins', n); return n; });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerState]);

  // Breathing cycle
  useEffect(() => {
    if (!showBreathing || timerState !== 'running') {
      clearInterval(breathRef.current);
      return;
    }
    const pattern = breathPattern;
    const cycleDuration = (pattern.inhale + pattern.hold + pattern.exhale) * 1000;
    let startTime = Date.now();
    let phase = 'inhale';
    setBreathPhase('inhale');

    const tick = () => {
      const elapsed = (Date.now() - startTime) % cycleDuration;
      const inhaleMs = pattern.inhale * 1000;
      const holdMs = pattern.hold * 1000;
      const exhaleMs = pattern.exhale * 1000;

      if (elapsed < inhaleMs) {
        setBreathPhase('inhale');
        setBreathProgress(elapsed / inhaleMs);
        if (phase !== 'inhale') { phase = 'inhale'; setBreathCount(c => c + 1); }
      } else if (elapsed < inhaleMs + holdMs) {
        setBreathPhase('hold');
        setBreathProgress((elapsed - inhaleMs) / holdMs);
        phase = 'hold';
      } else {
        setBreathPhase('exhale');
        setBreathProgress((elapsed - inhaleMs - holdMs) / exhaleMs);
        phase = 'exhale';
      }
    };

    breathRef.current = setInterval(tick, 50);
    return () => clearInterval(breathRef.current);
  }, [showBreathing, timerState, breathPattern]);

  // ── Format time ──
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const circleR = 90;
  const circleC = 2 * Math.PI * circleR;

  const breathLabel = breathPhase === 'inhale' ? 'Breathe In' : breathPhase === 'hold' ? 'Hold' : 'Breathe Out';
  const breathScale = breathPhase === 'inhale' ? 1 + breathProgress * 0.35 : breathPhase === 'hold' ? 1.35 : 1.35 - breathProgress * 0.35;

  return (
    <DashboardLayout activeTab="meditation">
      <div className="meditation-page">
        {/* ── Page Header ── */}
        <div className="med-header">
          <h1 className="med-title">
            🧘 <span className="text-gradient">Mindful Meditation</span>
          </h1>
          <p className="med-subtitle">Find your stillness. Breathe. Be present.</p>
          <div className="med-stats-row">
            <div className="med-stat-chip">
              <span className="med-stat-num">{sessionCount}</span>
              <span className="med-stat-lbl">Sessions</span>
            </div>
            <div className="med-stat-chip">
              <span className="med-stat-num">{totalMins}</span>
              <span className="med-stat-lbl">Total Mins</span>
            </div>
            <div className="med-stat-chip">
              <span className="med-stat-num">{breathCount}</span>
              <span className="med-stat-lbl">Breaths Today</span>
            </div>
          </div>
        </div>

        <div className="med-grid">
          {/* ── Left Column ── */}
          <div className="med-left-col">
            {/* Session Picker */}
            <div className="med-card">
              <h3 className="med-card-title">🕐 Session Type</h3>
              <div className="session-grid">
                {SESSIONS.map(s => (
                  <button
                    key={s.id}
                    className={`session-btn ${selectedSession.id === s.id ? 'active' : ''}`}
                    onClick={() => { setSelectedSession(s); if (timerState === 'idle') resetTimer(); }}
                    disabled={timerState === 'running'}
                  >
                    <span className="session-icon">{s.icon}</span>
                    <span className="session-label">{s.label}</span>
                    {s.duration && <span className="session-dur">{s.duration} min</span>}
                  </button>
                ))}
              </div>
              {selectedSession.id === 'custom' && (
                <div className="custom-input-row">
                  <label>Duration (minutes)</label>
                  <div className="custom-slider-wrap">
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={customMinutes}
                      onChange={e => setCustomMinutes(+e.target.value)}
                      className="med-slider"
                      disabled={timerState === 'running'}
                    />
                    <span className="slider-val">{customMinutes} min</span>
                  </div>
                </div>
              )}
            </div>

            {/* Breathing Pattern */}
            <div className="med-card">
              <h3 className="med-card-title">💨 Breathing Pattern</h3>
              <div className="breath-pattern-grid">
                {BREATHING_PATTERNS.map(p => (
                  <button
                    key={p.id}
                    className={`breath-pattern-btn ${breathPattern.id === p.id ? 'active' : ''}`}
                    onClick={() => setBreathPattern(p)}
                  >
                    <span className="bp-label">{p.label}</span>
                    <span className="bp-ratio">{p.inhale}-{p.hold}-{p.exhale}</span>
                  </button>
                ))}
              </div>
              <div className="breath-legend">
                <span>Inhale <b>{breathPattern.inhale}s</b></span>
                <span>→</span>
                <span>Hold <b>{breathPattern.hold}s</b></span>
                <span>→</span>
                <span>Exhale <b>{breathPattern.exhale}s</b></span>
              </div>
            </div>

            {/* Ambient Sounds */}
            <div className="med-card">
              <h3 className="med-card-title">🎧 Ambient Sounds</h3>
              <div className="sound-grid">
                {SOUNDS.map(sound => (
                  <button
                    key={sound.id}
                    className={`sound-btn ${activeSound === sound.id ? 'active' : ''}`}
                    onClick={() => toggleSound(sound.id)}
                  >
                    {sound.label}
                  </button>
                ))}
              </div>
              {activeSound && (
                <div className="volume-row">
                  <span>🔈</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={soundVolume}
                    onChange={e => setSoundVolume(+e.target.value)}
                    className="med-slider"
                  />
                  <span>🔊</span>
                  <span className="slider-val">{soundVolume}%</span>
                </div>
              )}
              {(activeSound === 'forest' || activeSound === 'ocean') && (
                <p className="sound-note">⚠️ Forest & Ocean sounds require external audio files. Try Om, Rain, Bowl or Binaural Beats for built-in audio.</p>
              )}
            </div>
          </div>

          {/* ── Center: Timer ── */}
          <div className="med-center-col">
            <div className="med-card timer-card">
              {/* Circular Timer */}
              <div className="timer-circle-wrap">
                <svg className="timer-svg" viewBox="0 0 220 220">
                  {/* Background track */}
                  <circle
                    cx="110" cy="110" r={circleR}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="10"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="110" cy="110" r={circleR}
                    fill="none"
                    stroke="url(#timerGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circleC}
                    strokeDashoffset={circleC - (progressPct / 100) * circleC}
                    transform="rotate(-90 110 110)"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                  <defs>
                    <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00f2fe" />
                      <stop offset="100%" stopColor="#9b51e0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center display */}
                <div className="timer-center-display">
                  {timerState === 'idle' && (
                    <>
                      <span className="timer-idle-icon">🧘</span>
                      <span className="timer-idle-txt">Ready</span>
                    </>
                  )}
                  {(timerState === 'running' || timerState === 'paused') && (
                    <>
                      <span className="timer-time">{formatTime(secondsLeft)}</span>
                      <span className="timer-label">{timerState === 'paused' ? 'Paused' : 'Remaining'}</span>
                    </>
                  )}
                  {timerState === 'done' && (
                    <>
                      <span className="timer-done-icon">✨</span>
                      <span className="timer-done-txt">Complete!</span>
                    </>
                  )}
                </div>
              </div>

              {/* Timer Controls */}
              <div className="timer-controls">
                {timerState === 'idle' && (
                  <button className="med-btn-primary" onClick={startTimer}>
                    ▶ Begin Session
                  </button>
                )}
                {(timerState === 'running' || timerState === 'paused') && (
                  <div className="timer-btn-row">
                    <button className="med-btn-primary" onClick={pauseTimer}>
                      {timerState === 'running' ? '⏸ Pause' : '▶ Resume'}
                    </button>
                    <button className="med-btn-ghost" onClick={resetTimer}>
                      ↺ Reset
                    </button>
                  </div>
                )}
                {timerState === 'done' && (
                  <div className="timer-btn-row">
                    <button className="med-btn-primary" onClick={() => { resetTimer(); }}>
                      ↺ New Session
                    </button>
                  </div>
                )}
              </div>

              {/* Session info */}
              <div className="timer-session-info">
                <span className="session-icon-sm">{selectedSession.icon}</span>
                <span>{selectedSession.label}</span>
                <span className="session-dot">·</span>
                <span>{selectedSession.id === 'custom' ? customMinutes : selectedSession.duration} min</span>
              </div>
            </div>

            {/* Breathing Orb */}
            {showBreathing && (
              <div className="med-card breathing-card">
                <h3 className="med-card-title">Breathing Guide</h3>
                <div className="breathing-orb-wrap">
                  <div
                    className={`breathing-orb ${breathPhase}`}
                    style={{ transform: `scale(${breathScale})` }}
                  >
                    <div className="orb-inner">
                      <span className="orb-phase-label">{breathLabel}</span>
                    </div>
                  </div>
                  <div className="breath-rings">
                    <div className={`breath-ring ring-1 ${breathPhase}`} />
                    <div className={`breath-ring ring-2 ${breathPhase}`} />
                  </div>
                </div>
                <p className="breath-phase-text">{breathLabel}</p>
                <p className="breath-pattern-text">{breathPattern.label}</p>
              </div>
            )}
          </div>

          {/* ── Right Column: Tips & Affirmations ── */}
          <div className="med-right-col">
            <div className="med-card">
              <h3 className="med-card-title">🌿 Today's Intention</h3>
              <div className="affirmation-card">
                <p className="affirmation-text">
                  "In the stillness of this moment, I am exactly where I need to be. Peace begins with me."
                </p>
              </div>
            </div>

            <div className="med-card">
              <h3 className="med-card-title">📖 Meditation Tips</h3>
              <ul className="tips-list">
                <li>
                  <span className="tip-icon">🪑</span>
                  <span>Sit comfortably with your spine straight. You may also lie down.</span>
                </li>
                <li>
                  <span className="tip-icon">👁️</span>
                  <span>Gently close your eyes or soften your gaze downward.</span>
                </li>
                <li>
                  <span className="tip-icon">🧠</span>
                  <span>When thoughts arise, simply notice them and return to your breath.</span>
                </li>
                <li>
                  <span className="tip-icon">💨</span>
                  <span>Follow the breathing orb — let it guide your natural rhythm.</span>
                </li>
                <li>
                  <span className="tip-icon">🔔</span>
                  <span>Start with shorter sessions and gradually increase duration.</span>
                </li>
              </ul>
            </div>

            <div className="med-card">
              <h3 className="med-card-title">🏆 Your Journey</h3>
              <div className="journey-grid">
                <div className="journey-item">
                  <span className="journey-num">{sessionCount}</span>
                  <span className="journey-lbl">Sessions</span>
                </div>
                <div className="journey-item">
                  <span className="journey-num">{totalMins}</span>
                  <span className="journey-lbl">Minutes</span>
                </div>
                <div className="journey-item">
                  <span className="journey-num">{Math.floor(totalMins / 10)}</span>
                  <span className="journey-lbl">Milestones</span>
                </div>
                <div className="journey-item">
                  <span className="journey-num">{sessionCount >= 7 ? '🔥' : sessionCount >= 3 ? '✨' : '🌱'}</span>
                  <span className="journey-lbl">Streak</span>
                </div>
              </div>
              {sessionCount === 0 && (
                <p className="journey-empty">Start your first session to begin your journey! 🧘</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
