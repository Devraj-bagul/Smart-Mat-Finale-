import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Sparkles, Users, ArrowRight, Video, Target, Heart, CheckCircle2, ShieldCheck, Cpu, Smartphone, Calendar, Apple } from 'lucide-react';
import logo from '../assets/logo.png';
import Khushal_img from '../assets/Khushal.png';
import Devraj_img from '../assets/Devraj.png';
import Aboli_img from '../assets/Aboli.png';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="landing-page">
      <nav className="navbar flex-between container">
        <div className="logo flex-center">
          <img src={logo} alt="NextGen Logo" className="brand-logo" />
          <span className="logo-text">NextGen <span className="text-gradient">Yoga Mat</span></span>
        </div>
        <div className="nav-actions">
          <button className="btn btn-glass" onClick={handleLogin}>Log In</button>
          <button className="btn btn-primary" onClick={handleLogin}>Start Demo</button>
        </div>
      </nav>

      {/* 1. Clear Hero Section */}
      <main className="hero-section container flex-center">
        <div className="hero-content animate-fade-in">
          <div className="badge glass-panel inline-flex-center">
            <Sparkles size={16} color="#4facfe" style={{ marginRight: '8px' }} />
            <span>The Future of Wellness</span>
          </div>
          <h1 className="hero-title">
            Transform Your Yoga with <br />
            <span className="text-gradient">AI Precision</span>
          </h1>
          <p className="hero-subtitle">
            Say goodbye to poor form and unguided routines. The NextGen Yoga Mat uses advanced sensors to correct your posture, deliver personalized training, and elevate your daily practice.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-large glow-pulse" onClick={handleLogin}>
              Try Demo <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <div className="hero-visual animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="mat-mockup glass-panel">
            <div className="mat-grid"></div>
            <div className="mat-glow"></div>
            <div className="mat-stats flex-between">
              <div>
                <span className="stat-label">Alignment Score</span>
                <span className="stat-value text-gradient">98% Perfect</span>
              </div>
              <Target color="#00f2fe" size={24} />
            </div>
          </div>
        </div>
      </main>

      {/* 2. Strong Value Proposition */}
      <section className="value-prop-section container">
        <h2 className="section-title text-center">Why Choose <span className="text-gradient-purple">NextGen?</span></h2>
        <div className="value-grid">
          <div className="value-item">
            <CheckCircle2 size={32} color="#00f2fe" className="value-icon" />
            <div>
              <h3>Correct Posture using AI</h3>
              <p>Thousands of micro-sensors detect your exact position, ensuring you never strain a muscle or practice with bad form.</p>
            </div>
          </div>
          <div className="value-item">
            <Heart size={32} color="#9b51e0" className="value-icon" />
            <div>
              <h3>Personalized Training</h3>
              <p>Your practice evolves with you. Our AI builds adaptive routines based on your goals, flexibility, and daily energy levels.</p>
            </div>
          </div>
          <div className="value-item">
            <Activity size={32} color="#4facfe" className="value-icon" />
            <div>
              <h3>Real-Time Feedback</h3>
              <p>Instant visual and audio cues guide you through every transition, making it feel like a personal trainer is right there with you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feature Section (Interactive Cards) */}
      <section className="features-section container">
        <h2 className="section-title text-center">Everything You Need to <span className="text-gradient">Thrive</span></h2>
        <div className="features-grid">
          <div className="feature-card glass-panel glass-panel-hover">
            <div className="feature-icon bg-cyan-glow">
              <Sparkles size={28} color="#fff" />
            </div>
            <h3>AI Yoga Guru</h3>
            <p>Get personalized audio cues, visual adjustments, and deep insights from our smart AI instructor during every session.</p>
          </div>
          <div className="feature-card glass-panel glass-panel-hover">
            <div className="feature-icon bg-purple-glow">
              <Calendar size={28} color="#fff" />
            </div>
            <h3>Daily Sessions</h3>
            <p>Access a vast library of guided yoga practices and training info tailored to your skill level, updated daily.</p>
          </div>
          <div className="feature-card glass-panel glass-panel-hover">
            <div className="feature-icon bg-green-glow">
              <Apple size={28} color="#fff" />
            </div>
            <h3>Diet Planner</h3>
            <p>Complement your practice with AI-generated nutrition plans and macro tracking to fuel your body the right way.</p>
          </div>
          <div className="feature-card glass-panel glass-panel-hover">
            <div className="feature-icon bg-blue-glow">
              <Video size={28} color="#fff" />
            </div>
            <h3>Group Video Yoga</h3>
            <p>Connect with friends and join live virtual classes, syncing your mats and sharing progress in real-time.</p>
          </div>
        </div>
      </section>

      {/* 4. Trust / Innovation Section */}
      <section className="innovation-section container">
        <div className="innovation-box glass-panel">
          <div className="innovation-content">
            <h2>Built on <span className="text-gradient">Cutting-Edge</span> Tech</h2>
            <p>Our goal is to seamlessly blend ancient wellness traditions with modern technology to create the ultimate yoga experience.</p>
            <ul className="innovation-list">
              <li><Cpu color="#00f2fe" size={20} /> AI-powered posture detection</li>
              <li><Activity color="#9b51e0" size={20} /> Real-time feedback system</li>
              <li><Smartphone color="#4facfe" size={20} /> Smart wearable integration</li>
            </ul>
          </div>
          <div className="innovation-badge flex-center">
            <ShieldCheck size={80} color="#00f2fe" className="glow-pulse" />
          </div>
        </div>
      </section>
      {/* Founders Section */}
      <section className="founders-section container">
        <h2 className="section-title text-center">Meet the <span className="text-gradient">Founders</span></h2>
        <div className="founders-grid">
          <div className="founder-card glass-panel glass-panel-hover">
            <div className="founder-img-wrapper">
              <img src={Khushal_img} alt="Khushal Gawali" className="founder-img" />
            </div>
            <h3 className="founder-name">Khushal Gawali</h3>
            <p className="founder-role text-gradient-purple">IOT & ML Engineer</p>
          </div>

          <div className="founder-card glass-panel glass-panel-hover">
            <div className="founder-img-wrapper">
              <img src={Aboli_img} alt="Aboli More" className="founder-img" />
            </div>
            <h3 className="founder-name">Aboli More</h3>
            <p className="founder-role text-gradient-purple">Researcher</p>
          </div>

          <div className="founder-card glass-panel glass-panel-hover">
            <div className="founder-img-wrapper">
              <img src={Devraj_img} alt="Devraj Bagul" className="founder-img" />
            </div>
            <h3 className="founder-name">Devraj Bagul</h3>
            <p className="founder-role text-gradient-purple">Software Engineer</p>
          </div>
        </div>
      </section>

      {/* 5. Clean Footer */}
      <footer className="footer-section">
        <div className="container footer-content flex-between">
          <div className="footer-brand">
            <div className="logo flex-center" style={{ justifyContent: 'flex-start', marginBottom: '16px' }}>
              <img src={logo} alt="NextGen Logo" className="brand-logo" />
              <span className="logo-text">NextGen <span className="text-gradient">Yoga Mat</span></span>
            </div>
            <p className="footer-motto">Empowering your wellness journey through innovation and mindfulness.</p>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <p style={{ cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</p>
            <p style={{ cursor: 'pointer' }} onClick={() => document.querySelector('.features-section').scrollIntoView({ behavior: 'smooth' })}>Features</p>
          </div>

          <div className="footer-contact">
            <h4>Contact Info</h4>
            <p>gawalikhushal26@gmail.com</p>
            <a href="https://www.linkedin.com/in/gawalikhushal" target="_blank" rel="noreferrer" className="linkedin-link">
              Connect on LinkedIn (Khushal Gawali)
            </a>
          </div>
        </div>
        <div className="footer-bottom container text-center">
          <p>&copy; 2025 NextGen Yoga Mat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
