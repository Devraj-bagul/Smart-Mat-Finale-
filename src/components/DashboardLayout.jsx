import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, MessageSquare, Video, LogOut, Home, BookOpen, User } from 'lucide-react';
import logo from '../assets/logo.png';
import './DashboardLayout.css';
import { dbService } from '../services/dbService';

export default function DashboardLayout({ children, activeTab, onNavClick }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => dbService.getCurrentUser());

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(dbService.getCurrentUser());
    };
    window.addEventListener('userDataUpdated', handleUpdate);
    return () => window.removeEventListener('userDataUpdated', handleUpdate);
  }, []);

  const handleLogout = async () => {
    await dbService.logoutUser();
    navigate('/');
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-logo flex-center">
          <img src={logo} alt="NextGen Logo" className="brand-logo" />
          <span className="logo-text">NextGen <span className="text-gradient">Yoga Mat</span></span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'dashboard') navigate('/home', { state: { tab: 'dashboard' } });
              if (onNavClick) onNavClick('dashboard');
            }}
          >
            <Home size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'yoga-book' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'yoga-book') navigate('/yogabook');
              if (onNavClick) onNavClick('yoga-book');
            }}
          >
            <BookOpen size={20} />
            <span>Yoga Book</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'start' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'start') navigate('/start-yoga');
              if (onNavClick) onNavClick('start');
            }}
          >
            <PlayCircle size={20} /> Start Yoga
          </button>
          <button
            className={`nav-item ${activeTab === 'guru' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'guru') navigate('/ai-guru');
              if (onNavClick) onNavClick('guru');
            }}
          >
            <MessageSquare size={20} /> AI Yoga Guru
          </button>
          <button
            className={`nav-item ${activeTab === 'virtual-session' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'virtual-session') navigate('/virtual-session');
              if (onNavClick) onNavClick('virtual-session');
            }}
          >
            <Video size={20} /> Virtual Session
          </button>
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'profile') navigate('/profile');
              if (onNavClick) onNavClick('profile');
            }}
          >
            <User size={20} />
            <span>Profile</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header flex-between">
          <h2>
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'practice' && 'Your Progress'}
            {activeTab === 'start' && 'Live Session'}
            {activeTab === 'guru' && 'AI Yoga Guru'}
            {activeTab === 'virtual-session' && 'Virtual Session'}
            {activeTab === 'yoga-book' && ''}
            {activeTab === 'profile' && 'My Profile'}
          </h2>
          <div className="user-profile glass-panel inline-flex-center" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <img src={currentUser.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"} alt="User Profile" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }} />
            <span>Namaste, {currentUser.name.split(' ')[0]}</span>
          </div>
        </header>

        <div className="tab-container animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
