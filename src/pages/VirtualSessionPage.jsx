import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Award, Flame, Plus, AlertTriangle, Video, Users, Monitor, MessageSquare, Link, Heart, Smile, UserCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { dbService } from '../services/dbService';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import './VirtualSessionPage.css';

// Helper to generate standard UUID v4 for guest userID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function VirtualSessionPage() {
  const location = useLocation();

  // View state
  const [view, setView] = useState('landing');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Session config state
  const [sessionName, setSessionName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // ZegoCloud refs
  const zegoContainerRef = useRef(null);
  const zegoInstanceRef = useRef(null);

  // Read environment variables
  const ZEGO_APP_ID = Number(import.meta.env.VITE_ZEGO_APP_ID);
  const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET || '';
  
  const zegoReady = 
    !isNaN(ZEGO_APP_ID) && 
    ZEGO_APP_ID > 0 && 
    ZEGO_SERVER_SECRET.trim() !== '';

  // Get authentication info following user guidelines (Clerk user fallback to Guest123/UUID)
  const getAuthUserInfo = () => {
    let userID = '';
    let userName = '';

    if (window.Clerk?.user) {
      userID = window.Clerk.user.id;
      userName = window.Clerk.user.fullName || window.Clerk.user.username;
    }

    if (!userID) {
      userID = generateUUID();
    }
    if (!userName) {
      userName = 'Guest123';
    }

    // Sanitize userID for ZegoCloud (only allows a-zA-Z0-9_-)
    userID = userID.replace(/[^a-zA-Z0-9_-]/g, '_');

    return { userID, userName };
  };

  // ─── Auto-join from URL query param ───────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('roomID');
    if (roomID) {
      setSessionCode(roomID);
      setView('session');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ─── Auto-start from navigation state ─────────────────────────────────────
  useEffect(() => {
    if (location.state?.startImmediately) {
      setSessionName(location.state.name || 'Virtual Session');
      setView('session');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // ─── Timer while in session ───────────────────────────────────────────────
  useEffect(() => {
    let interval = null;
    if (view === 'session') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          if (document.visibilityState === 'visible') dbService.incrementActiveTime(1);
          return prev + 1;
        });
      }, 1000);
    } else if (view !== 'completed') {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [view]);

  // ─── Save session on complete ─────────────────────────────────────────────
  useEffect(() => {
    if (view === 'completed') {
      dbService.completeSession(elapsedSeconds, 85, null, 92);
    }
  }, [view]);

  // ─── Initialize ZegoCloud when container div mounts ───────────────────────
  useEffect(() => {
    // Only run when we're in session view, Zego is ready, and container exists
    if (view !== 'session' || !zegoReady || !zegoContainerRef.current) return;
    // Don't double-initialize
    if (zegoInstanceRef.current) return;

    let roomID = sessionCode || generatedCode || `room_${Date.now()}`;
    
    // Map 6-digit session codes to Yoga-XXXXXX to allow direct room joining
    if (/^\d{6}$/.test(roomID.trim())) {
      roomID = `Yoga-${roomID.trim()}`;
    }

    const { userID, userName } = getAuthUserInfo();

    try {
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        ZEGO_APP_ID,
        ZEGO_SERVER_SECRET,
        roomID,
        userID,
        userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstanceRef.current = zp;

      zp.joinRoom({
        container: zegoContainerRef.current,
        sharedLinks: [{
          name: 'Invite Link',
          url: `${window.location.origin}/virtual-session?roomID=${roomID}`,
        }],
        scenario: { mode: ZegoUIKitPrebuilt.VideoConference },
        showScreenSharingButton: true,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showUserList: true,
        maxUsers: 10,
        layout: 'Auto',
        onLeaveRoom: () => {
          zegoInstanceRef.current = null;
          setView('completed');
        },
      });
    } catch (err) {
      console.error('ZegoCloud init failed:', err);
    }

    // Cleanup on unmount or view change
    return () => {
      if (zegoInstanceRef.current) {
        try { zegoInstanceRef.current.destroy(); } catch (_) {}
        zegoInstanceRef.current = null;
      }
    };
  }, [view, zegoReady, zegoContainerRef.current]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCreateNewSession = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const roomId = `Yoga-${pin}`;
    
    setSessionCode(roomId);
    setGeneratedCode(pin);
    setSessionName(`Yoga-${pin}`);
    
    dbService.scheduleVirtualSession({
      name: `Yoga Session ${pin}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      instructor: 'You',
      type: 'virtual',
    });
    
    setView('session');
  };

  // ─── Views ────────────────────────────────────────────────────────────────
  const renderLandingView = () => (
    <div className="vs-center-container animate-fade-in">
      <div className="vs-card vs-card-split glass-panel">
        <div className="vs-card-left">
          <div className="vs-banner">
            <img src="https://media.istockphoto.com/id/2232443096/photo/happy-couple-working-out-at-home-following-an-online-class.jpg?s=612x612&w=0&k=20&c=1esk4oAg3feQwG9vWcY1qsKi3Ng7Fsmnoarbl3vW9V8=" alt="Yoga virtually" />
            <div className="vs-banner-overlay"></div>
          </div>
        </div>

        <div className="vs-card-right">
          <h2 className="vs-title" style={{ textAlign: 'left', marginBottom: '8px' }}>Virtual Session</h2>
          <p className="text-secondary" style={{ textAlign: 'left', marginBottom: '24px' }}>
            Interactive video calling optimized for real-time yoga practice.
          </p>

          <div className="vs-features-list animate-slide-up">
            <div className="vs-feature-item">
              <div className="vs-feature-icon-wrapper">
                <Heart size={20} />
              </div>
              <div className="vs-feature-text">
                <h4>Friends & Family Sessions</h4>
                <p>Practice together and stay healthy with your loved ones from anywhere.</p>
              </div>
            </div>

            <div className="vs-feature-item">
              <div className="vs-feature-icon-wrapper">
                <Smile size={20} />
              </div>
              <div className="vs-feature-text">
                <h4>Elderly & Senior Groups</h4>
                <p>Host gentle, low-impact collective flows virtually for senior circles.</p>
              </div>
            </div>

            <div className="vs-feature-item">
              <div className="vs-feature-icon-wrapper">
                <UserCheck size={20} />
              </div>
              <div className="vs-feature-text">
                <h4>1-on-1 Trainer Coaching</h4>
                <p>Connect with your personal yoga guru virtually for posture guidance.</p>
              </div>
            </div>

            <div className="vs-feature-item">
              <div className="vs-feature-icon-wrapper">
                <Video size={20} />
              </div>
              <div className="vs-feature-text">
                <h4>HD Video & Audio Call</h4>
                <p>High-quality real-time calling optimized for online yoga flows.</p>
              </div>
            </div>

            <div className="vs-feature-item">
              <div className="vs-feature-icon-wrapper">
                <Monitor size={20} />
              </div>
              <div className="vs-feature-text">
                <h4>Screen Share & Chat</h4>
                <p>Broadcast slides or routines while keeping chat active in Zego UI.</p>
              </div>
            </div>
          </div>

          <div className="vs-create-section">
            <button className="btn btn-primary btn-full btn-large glow-pulse" onClick={handleCreateNewSession}>
              <Plus size={20} style={{ marginRight: '8px' }} /> Create New Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompletedView = () => {
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
    return (
      <div className="vs-center-container animate-fade-in">
        <div className="vs-card glass-panel text-center">
          <div className="success-icon-large mb-16 flex-center mx-auto">
            <Award size={48} color="#00f2fe" />
          </div>
          <h2 className="vs-title mb-16">🎉 Great job!</h2>
          <p className="text-secondary mb-32">You completed a {minutes}-minute flow.</p>
          <div className="stats-row flex-between mb-32 glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
            <div className="stat-item flex-col">
              <span className="text-secondary">Avg Posture</span>
              <strong className="text-gradient" style={{ fontSize: '1.2rem' }}>92%</strong>
            </div>
            <div className="stat-item flex-col">
              <span className="text-secondary">Streak</span>
              <strong><Flame size={14} color="#ff9a9e" style={{ display: 'inline', verticalAlign: 'middle' }} /> 13 Days</strong>
            </div>
          </div>
          <button className="btn btn-primary btn-full glow-pulse" onClick={() => setView('landing')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  };

  const renderZegoWarning = () => (
    <div className="vs-center-container animate-fade-in">
      <div className="vs-card glass-panel text-center">
        <div className="warning-icon-large mb-16 flex-center mx-auto" style={{ color: '#ff4b4b', marginBottom: '20px' }}>
          <AlertTriangle size={48} />
        </div>
        <h2 className="vs-title" style={{ color: '#ff4b4b', fontSize: '1.5rem', textAlign: 'center' }}>ZEGOCloud Credentials Required</h2>
        <p className="text-secondary mb-24" style={{ fontSize: '1rem', lineHeight: '1.5', marginTop: '12px' }}>
          Please configure ZEGO Cloud credentials.
        </p>
        <button className="btn btn-glass btn-full" onClick={() => setView('landing')}>
          Go Back
        </button>
      </div>
    </div>
  );

  // ─── Live Session: ZegoCloud if credentials set, else warning ────────
  const renderLiveSession = () => {
    if (!zegoReady) {
      return renderZegoWarning();
    }

    return (
      <div className="tab-content group-tab-advanced animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Header */}
        <div className="group-call-header flex-between glass-panel" style={{ marginBottom: '12px' }}>
          <div className="header-info flex-center" style={{ gap: '16px' }}>
            <div className="live-badge flex-center">
              <div className="pulsing-dot"></div>
              LIVE
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{sessionName || 'Virtual Yoga Session'}</h2>
              <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                Room ID: {sessionCode && /^\d{6}$/.test(sessionCode.trim()) ? `Yoga-${sessionCode.trim()}` : (sessionCode || generatedCode)}
              </span>
            </div>
          </div>
          <div className="header-timer text-gradient">
            <Clock size={16} /> {formatTimer(elapsedSeconds)}
          </div>
        </div>

        {/* ZegoCloud mounts here via zegoContainerRef */}
        <div
          ref={zegoContainerRef}
          style={{
            flex: 1,
            width: '100%',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 242, 254, 0.15)',
            background: '#0b0f19',
            minHeight: '400px',
          }}
        />
      </div>
    );
  };

  return (
    <DashboardLayout activeTab="virtual-session">
      {view === 'landing'   && renderLandingView()}
      {view === 'session'   && renderLiveSession()}
      {view === 'completed' && renderCompletedView()}
    </DashboardLayout>
  );
}
