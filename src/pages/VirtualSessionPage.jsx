import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Clock, Mic, MicOff, VideoOff, MonitorUp, Bot, Send, ThumbsUp, X, Sparkles, Target, Award, Flame, Video as VideoIcon, Plus, Copy, CheckCircle2, MessageSquare } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { dbService } from '../services/dbService';
import './VirtualSessionPage.css';

export default function VirtualSessionPage() {
  const location = useLocation();
  const [view, setView] = useState('landing'); // 'landing', 'create-1', 'create-2', 'success', 'session'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (location.state?.startImmediately) {
      setView('starting');
      setSessionName(location.state.name || 'Virtual Session');
      setTimeout(() => setView('session'), 3000);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    let interval = null;
    if (view === 'session') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (document.visibilityState === 'visible') {
            dbService.incrementActiveTime(1);
          }
          return next;
        });
      }, 1000);
    } else {
      if (view !== 'completed') {
        setElapsedSeconds(0);
      }
    }
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (view === 'completed') {
      dbService.completeSession(elapsedSeconds, 85, null, 92);
    }
  }, [view]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };
  
  // Create Session State
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [role, setRole] = useState('trainer'); // 'trainer' or 'participant'
  const [participantEmail, setParticipantEmail] = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]);
  
  // Session Access State
  const [sessionCode, setSessionCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // Live Session State
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  
  // Focus Mode & Overhaul State
  const [chatOpen, setChatOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [focusWarning, setFocusWarning] = useState(false);
  const [reactions, setReactions] = useState([]);

  // Handle reaction trigger
  const triggerReaction = (e) => {
    e.stopPropagation();
    const newReaction = { id: Date.now(), emoji: '👍', left: Math.random() * 20 + 80 }; // Float near right side
    setReactions(prev => [...prev, newReaction]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 2000);
  };

  const handleToggleFocusMode = (e) => {
    e.stopPropagation();
    const newFocus = !focusMode;
    setFocusMode(newFocus);
    if (newFocus) {
      setChatOpen(false);
    }
  };

  const handleToggleChat = (e) => {
    e.stopPropagation();
    if (focusMode) {
      setFocusWarning(true);
      setTimeout(() => setFocusWarning(false), 3000);
      return;
    }
    setChatOpen(!chatOpen);
  };

  const handleCreateSession = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    dbService.scheduleVirtualSession({
      name: sessionName || 'Virtual Yoga Session',
      date: sessionDate || new Date().toISOString().split('T')[0],
      time: sessionTime || '18:00',
      instructor: role === 'trainer' ? 'You' : 'AI Yoga Guru',
      type: 'virtual'
    });
    setView('success');
  };

  const handleAddParticipant = () => {
    if (participantEmail) {
      setInvitedUsers([...invitedUsers, { email: participantEmail, role: 'Participant' }]);
      setParticipantEmail('');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const renderLandingView = () => (
    <div className="vs-center-container animate-fade-in">
      <div className="vs-card glass-panel">
        <h2 className="vs-title">Virtual Session</h2>
        <p className="text-secondary mb-32">Join a live yoga flow or start your own.</p>
        
        <div className="vs-join-section">
          <h3>Join a Session</h3>
          <div className="vs-input-group">
            <input 
              type="text" 
              placeholder="Enter Session Code" 
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              className="vs-input"
            />
            <button 
              className="btn btn-primary"
              onClick={() => {
                setView('starting');
                setTimeout(() => setView('session'), 3000);
              }}
              disabled={!sessionCode}
            >
              Join
            </button>
          </div>
        </div>

        <div className="vs-divider"><span>OR</span></div>

        <div className="vs-create-section">
          <button 
            className="btn btn-glass btn-full btn-large"
            onClick={() => setView('create-1')}
          >
            <Plus size={20} /> Create New Session
          </button>
        </div>
      </div>
    </div>
  );

  const renderCreateStep1 = () => (
    <div className="vs-center-container animate-slide-up">
      <div className="vs-card glass-panel">
        <div className="vs-header-flex">
          <h2 className="vs-title">Create Session</h2>
          <span className="text-secondary">Step 1 of 2</span>
        </div>
        
        <div className="vs-form">
          <div className="form-group">
            <label>Session Name</label>
            <input 
              type="text" 
              className="vs-input" 
              placeholder="e.g. Morning Flow"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                className="vs-input"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input 
                type="time" 
                className="vs-input"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Your Role</label>
            <div className="vs-radio-group">
              <label className="vs-radio">
                <input 
                  type="radio" 
                  checked={role === 'trainer'}
                  onChange={() => setRole('trainer')}
                /> 
                <span>Trainer</span>
              </label>
              <label className="vs-radio">
                <input 
                  type="radio" 
                  checked={role === 'host'}
                  onChange={() => setRole('host')}
                /> 
                <span>Host</span>
              </label>
            </div>
          </div>
        </div>

        <div className="vs-actions flex-between mt-32">
          <button className="btn btn-glass" onClick={() => setView('landing')}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={() => setView('create-2')}
            disabled={!sessionName}
          >
            Next <span style={{marginLeft: '8px'}}>→</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCreateStep2 = () => (
    <div className="vs-center-container animate-slide-up">
      <div className="vs-card glass-panel">
        <div className="vs-header-flex">
          <h2 className="vs-title">Add Participants</h2>
          <span className="text-secondary">Step 2 of 2 (Optional)</span>
        </div>
        
        <div className="vs-form">
          <div className="form-group">
            <label>Invite via Email</label>
            <div className="vs-input-group">
              <input 
                type="email" 
                className="vs-input" 
                placeholder="Enter email address"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
              />
              <button className="btn btn-glass" onClick={handleAddParticipant}>+ Add</button>
            </div>
          </div>

          {invitedUsers.length > 0 && (
            <div className="vs-invited-list">
              <p className="text-secondary mb-8">Added Participants:</p>
              {invitedUsers.map((user, i) => (
                <div key={i} className="vs-invited-user glass-panel">
                  <span>{user.email}</span>
                  <span className="text-secondary" style={{fontSize: '0.8rem'}}>{user.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vs-actions flex-between mt-32">
          <button className="btn btn-glass" onClick={() => setView('create-1')}>← Back</button>
          <button 
            className="btn btn-primary glow-pulse" 
            onClick={handleCreateSession}
          >
            Create Session 🚀
          </button>
        </div>
      </div>
    </div>
  );

  const renderSuccessView = () => (
    <div className="vs-center-container animate-fade-in">
      <div className="vs-card glass-panel text-center">
        <div className="success-icon-large mb-16 flex-center mx-auto">
          <CheckCircle2 size={48} color="#00f2fe" />
        </div>
        <h2 className="vs-title" style={{textAlign: 'center'}}>Session Created Successfully!</h2>
        <p className="text-secondary mb-32">Your virtual yoga studio is ready.</p>
        
        <div className="vs-code-box glass-panel mb-16">
          <span className="text-secondary">Session Code</span>
          <h1 className="text-gradient">{generatedCode}</h1>
          <button className="btn btn-glass btn-small" onClick={() => copyToClipboard(generatedCode)}>
            <Copy size={14} /> Copy Code
          </button>
        </div>

        <div className="vs-code-box glass-panel mb-32">
          <span className="text-secondary">Join Link</span>
          <p style={{fontSize: '0.9rem', margin: '8px 0'}}>https://nextgenyoga.com/session/{generatedCode}</p>
          <button className="btn btn-glass btn-small" onClick={() => copyToClipboard(`https://nextgenyoga.com/session/${generatedCode}`)}>
            <Copy size={14} /> Copy Link
          </button>
        </div>

        <button className="btn btn-primary btn-large btn-full glow-pulse" onClick={() => {
          setView('starting');
          setTimeout(() => setView('session'), 3000);
        }}>
          Enter Session Now
        </button>
      </div>
    </div>
  );

  const renderStartingView = () => (
    <div className="vs-center-container animate-fade-in">
      <div className="vs-card glass-panel text-center">
        <h2 className="vs-title mb-16">Session Starting Soon</h2>
        <div className="starting-pulse-circle">
          <span className="text-gradient" style={{ fontSize: '3rem', fontWeight: 'bold' }}>...</span>
        </div>
        <p className="text-secondary mt-16">Get your mat ready.</p>
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
              <strong><Flame size={14} color="#ff9a9e" style={{ display: 'inline', verticalAlign: 'middle' }}/> 13 Days</strong>
            </div>
          </div>
          <button className="btn btn-primary btn-full glow-pulse" onClick={() => setView('landing')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  };

  const renderLiveSession = () => (
    <div 
      className={`tab-content group-tab-advanced animate-fade-in ${guidedMode ? 'guided-mode-active' : ''}`} 
      onClick={() => { if(chatOpen) setChatOpen(false); }}
    >
      
      {/* Toast Notification */}
      {focusWarning && (
        <div className="focus-warning-toast animate-fade-in-out">
          Focus mode is on, chat not open.
        </div>
      )}

      {/* 1. Header Section (Hidden in Guided Mode) */}
      {!guidedMode && (
        <div className="group-call-header flex-between glass-panel">
          <div className="header-info flex-center" style={{ gap: '16px' }}>
            <div className="live-badge flex-center">
              <div className="pulsing-dot"></div>
              LIVE
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{sessionName || 'Morning Flexibility Session'}</h2>
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Trainer: Emma • <Users size={12} style={{ display: 'inline', marginLeft: '4px' }}/> 6/10</span>
            </div>
          </div>
          <div className="header-timer text-gradient">
            <Clock size={16} /> {formatTimer(elapsedSeconds)}
          </div>
        </div>
      )}

      {/* Main Focus Area */}
      <div className={`group-call-body ${focusMode ? 'focus-mode' : ''} ${guidedMode ? 'guided-mode' : ''}`}>
        
        {/* Trainer Video (Full Bleed in Focus/Guided Mode) */}
        <div className="trainer-video glass-panel">
          {!guidedMode && (
            <div className="live-rec-indicator">
              <div className="pulsing-dot"></div> REC
            </div>
          )}
          <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80" alt="Trainer" />
          
          <div className="video-overlay flex-between">
            <div className="trainer-label">
              <span className="participant-name">Trainer • Emma</span>
              <div className="audio-meter">
                <Mic size={14} color="#fff" />
                <div className="meter-bars">
                  <div className="bar active"></div>
                  <div className="bar active"></div>
                  <div className="bar active"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="active-speaker-glow"></div>

          {/* New: Pose Overlay directly on video */}
          <div className="video-pose-overlay glass-panel">
            <h4 style={{ color: '#00f2fe', margin: 0 }}>🌿 Tree Pose</h4>
            <div className="pose-timer">00:15</div>
            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Next: Cobra</span>
          </div>

          {/* Guided Mode Voice Overlay */}
          {guidedMode && (
            <div className="guided-voice-text animate-pulse">
              "Hold... breathe... relax..."
            </div>
          )}

          {/* Floating Reactions overlay */}
          {reactions.map(r => (
            <div key={r.id} className="floating-reaction" style={{ left: `${r.left}%` }}>
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Participants Bottom Strip (Hidden in Guided Mode) */}
        {!guidedMode && (
          <div className="participants-horizontal-strip">
            {/* YOU - The User */}
            <div className={`video-cell strip-cell glass-panel self-view`}>
              {!isVideoOff ? (
                <img src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=300&q=80" alt="You" />
              ) : (
                <div className="video-off-placeholder flex-center">
                  <div className="avatar-circle">You</div>
                </div>
              )}
              <div className="video-overlay strip-overlay">
                <span className="participant-name" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>You</span>
                {isMuted ? <MicOff size={10} color="#ff4b4b" /> : <Mic size={10} color="#fff" />}
              </div>

              {/* AI Smart Hint directly over user's video feed */}
              {aiEnabled && !isVideoOff && (
                <div className="smart-ai-hint animate-fade-in-out">
                  <Sparkles size={12} /> Straighten your back
                </div>
              )}
            </div>

            {/* Other participants */}
            <div className="video-cell strip-cell glass-panel active-speaker">
              <img src="https://images.unsplash.com/photo-1573590917173-8182b8c2ec1f?auto=format&fit=crop&w=300&q=80" alt="Sarah" />
              <div className="video-overlay strip-overlay">
                <span className="participant-name" style={{ fontSize: '0.65rem' }}>Sarah <span className="active-dot"></span></span>
              </div>
            </div>
            <div className="video-cell strip-cell glass-panel">
              <img src="https://images.unsplash.com/photo-1552196563-55259259b662?auto=format&fit=crop&w=300&q=80" alt="David" />
              <div className="video-overlay strip-overlay">
                <span className="participant-name" style={{ fontSize: '0.65rem' }}>David</span>
                <MicOff size={10} color="#ff4b4b" />
              </div>
            </div>
            
            <div className="strip-cell flex-center glass-panel more-participants">
              +3
            </div>
          </div>
        )}
      </div>

      {/* Slide-in Chat Panel */}
      <div 
        className={`slide-in-chat ${chatOpen ? 'open' : ''} glass-panel flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-header flex-between">
          <h3 className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}><MessageSquare size={16} /> Live Chat</h3>
          <button className="icon-btn" onClick={() => setChatOpen(false)}><X size={16} /></button>
        </div>
        <div className="chat-messages-area">
          <div className="chat-msg">
            <span className="chat-user trainer">Emma:</span> Hold the core tight everyone!
          </div>
          <div className="chat-msg">
            <span className="chat-user">Sarah:</span> Feeling the burn 🔥
          </div>
          <div className="chat-msg typing-indicator">
            <span className="text-secondary" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>David is typing...</span>
          </div>
        </div>
        <div className="chat-input-row flex-center">
          <input 
            type="text" 
            placeholder="Message everyone..." 
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
          />
          <button className="chat-send-btn flex-center"><Send size={14} /></button>
        </div>
      </div>

      {/* 4. Controls (Bottom Bar) */}
      {!guidedMode && (
        <div className="group-call-controls glass-panel flex-center">
          <div className="controls-left flex-center">
            <button className={`icon-control-btn ${isMuted ? 'danger' : ''}`} onClick={() => setIsMuted(!isMuted)} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button className={`icon-control-btn ${isVideoOff ? 'danger' : ''}`} onClick={() => setIsVideoOff(!isVideoOff)} title={isVideoOff ? 'Start Video' : 'Stop Video'}>
              {isVideoOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
            </button>
            <button className={`icon-control-btn ai-btn ${aiEnabled ? 'active' : ''}`} onClick={() => setAiEnabled(!aiEnabled)} title="AI Feedback">
              <Bot size={20} />
            </button>
          </div>

          <div className="controls-center flex-center">
            <button className={`icon-control-btn mode-btn ${focusMode ? 'active' : ''}`} onClick={handleToggleFocusMode} title="Focus Mode">
              <Target size={20} />
            </button>
            <button className={`icon-control-btn mode-btn ${guidedMode ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setGuidedMode(!guidedMode); }} title="Guided Mode">
              <Sparkles size={20} />
            </button>
            <button className="icon-control-btn" onClick={triggerReaction} title="React">
              <ThumbsUp size={20} />
            </button>
            <button className="icon-control-btn relative" onClick={handleToggleChat} title="Chat">
              <MessageSquare size={20} />
              <span className="notification-bubble">2</span>
            </button>
          </div>

          <div className="controls-right flex-center">
            <button className="icon-control-btn danger-bg" onClick={() => setView('completed')} title="End Session">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      
      {/* Minimal controls for Guided Mode */}
      {guidedMode && (
        <div className="guided-exit-control">
          <button className="btn btn-glass" onClick={() => setGuidedMode(false)}>
            Exit Guided Mode
          </button>
        </div>
      )}

    </div>
  );

  return (
    <DashboardLayout activeTab="virtual-session">
      {view === 'landing' && renderLandingView()}
      {view === 'create-1' && renderCreateStep1()}
      {view === 'create-2' && renderCreateStep2()}
      {view === 'success' && renderSuccessView()}
      {view === 'starting' && renderStartingView()}
      {view === 'session' && renderLiveSession()}
      {view === 'completed' && renderCompletedView()}
    </DashboardLayout>
  );
}
