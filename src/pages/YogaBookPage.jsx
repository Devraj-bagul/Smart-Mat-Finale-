import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckCircle2, XCircle, Heart, Play } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { yogaPoses } from '../data/yogaPoses';
import { yogaImages } from '../data/yogaImages';
import './YogaBookPage.css';

export default function YogaBookPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterGoal, setFilterGoal] = useState('All');
  const [filterBodyPart, setFilterBodyPart] = useState('All');
  const [selectedPose, setSelectedPose] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [activeModalTab, setActiveModalTab] = useState('guide'); // 'guide', 'benefits', 'muscles'

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedPose) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPose]);

  const filteredPoses = yogaPoses.filter(pose => {
    const matchesSearch = pose.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'All' || pose.level === filterLevel;
    const matchesGoal = filterGoal === 'All' || pose.goal === filterGoal;
    const matchesBodyPart = filterBodyPart === 'All' || pose.bodyPart === filterBodyPart;
    return matchesSearch && matchesLevel && matchesGoal && matchesBodyPart;
  });

  const toggleFavorite = (e, poseId) => {
    e.stopPropagation();
    if (favorites.includes(poseId)) {
      setFavorites(favorites.filter(id => id !== poseId));
    } else {
      setFavorites([...favorites, poseId]);
    }
  };

  const getSimilarPoses = (currentPose) => {
    if (!currentPose) return [];
    return yogaPoses
      .filter(p => p.id !== currentPose.id && (p.goal === currentPose.goal || p.bodyPart === currentPose.bodyPart))
      .slice(0, 3);
  };

  const handlePractice = () => {
    if (selectedPose) {
      localStorage.setItem('selected_pose_id', selectedPose.id);
      navigate('/start-yoga', { state: { poseId: selectedPose.id } });
      setSelectedPose(null);
    }
  };

  return (
    <DashboardLayout activeTab="yoga-book">
      <div className="tab-content yoga-book-tab">
        
        {/* 1. Header Section */}
        <div className="yoga-book-header animate-fade-in">
          <h2>Yoga Pose Library</h2>
          <p className="text-secondary">Explore 360+ yoga poses with detailed guidance</p>
        </div>

        {/* 2. Search & Filter Bar */}
        <div className="filter-bar glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="search-wrapper">
            <Search size={20} color="var(--text-secondary)" className="search-icon" />
            <input 
              type="text" 
              placeholder="Search pose..." 
              className="pose-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-selects">
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="pose-filter">
              <option value="All">Level: All</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <select value={filterGoal} onChange={(e) => setFilterGoal(e.target.value)} className="pose-filter">
              <option value="All">Goal: All</option>
              <option value="Flexibility">Flexibility</option>
              <option value="Strength">Strength</option>
              <option value="Balance">Balance</option>
              <option value="Posture">Posture</option>
            </select>

            <select value={filterBodyPart} onChange={(e) => setFilterBodyPart(e.target.value)} className="pose-filter">
              <option value="All">Body Part: All</option>
              <option value="Full Body">Full Body</option>
              <option value="Back">Back</option>
              <option value="Legs">Legs</option>
              <option value="Core">Core</option>
              <option value="Back & Legs">Back & Legs</option>
            </select>
          </div>
        </div>

        {/* 3. Pose Grid */}
        <div className="pose-grid animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {filteredPoses.map((pose) => (
            <div key={pose.id} className="pose-card glass-panel glass-panel-hover">
              <div className="pose-img-wrapper" onClick={() => setSelectedPose(pose)}>
                <img src={yogaImages[pose.name]?.cover || pose.image} alt={pose.name} className="pose-img" />
                <button 
                  className={`favorite-btn ${favorites.includes(pose.id) ? 'active' : ''}`}
                  onClick={(e) => toggleFavorite(e, pose.id)}
                >
                  <Heart size={18} fill={favorites.includes(pose.id) ? '#ff4b4b' : 'none'} color={favorites.includes(pose.id) ? '#ff4b4b' : '#fff'} />
                </button>
                <div className="pose-tags">
                  {pose.tags.map((tag, idx) => (
                    <span key={idx} className="pose-tag glass-panel">{tag}</span>
                  ))}
                </div>
              </div>
              
              <div className="pose-card-content">
                <h3>{pose.name}</h3>
                <div className="pose-meta">
                  <span className="meta-badge level-badge">{pose.level}</span>
                  <span className="meta-text">Focus: {pose.focus}</span>
                </div>
                
                <button 
                  className="btn btn-primary btn-full mt-16 glow-pulse"
                  onClick={() => setSelectedPose(pose)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
          {filteredPoses.length === 0 && (
            <div className="no-results text-secondary" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '48px'}}>
              No poses found matching your filters.
            </div>
          )}
        </div>

        {/* 4. Details Modal */}
        {selectedPose && createPortal(
          <div className="modal-overlay" onClick={() => setSelectedPose(null)}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
              
              <button className="close-modal-btn" onClick={() => setSelectedPose(null)}>
                <X size={24} />
              </button>
              
              <div className="modal-header">
                <div className="modal-title-row flex-between">
                  <h2>{selectedPose.name}</h2>
                  <button 
                    className={`favorite-btn-large ${favorites.includes(selectedPose.id) ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(e, selectedPose.id)}
                  >
                    <Heart size={24} fill={favorites.includes(selectedPose.id) ? '#ff4b4b' : 'none'} color={favorites.includes(selectedPose.id) ? '#ff4b4b' : 'var(--text-primary)'} />
                  </button>
                </div>
                <div className="modal-badges">
                  <span className="meta-badge level-badge">{selectedPose.level}</span>
                  <span className="meta-badge goal-badge">{selectedPose.goal}</span>
                  <span className="meta-text" style={{marginLeft: 'auto'}}>Focus: {selectedPose.focus}</span>
                </div>
              </div>
              
              <div className="modal-body">
                <div className="modal-img-container">
                  <img src={yogaImages[selectedPose.name]?.cover || selectedPose.image} alt={selectedPose.name} className="modal-img" />
                  <div className="play-overlay flex-center">
                    <div className="play-button-mock flex-center">
                      <Play size={32} color="#fff" fill="#fff" />
                    </div>
                  </div>
                </div>
                
                <div className="modal-interactive-info">
                  
                  <div className="modal-tabs flex-center">
                    <button 
                      className={`modal-tab ${activeModalTab === 'guide' ? 'active' : ''}`}
                      onClick={() => setActiveModalTab('guide')}
                    >
                      Guide
                    </button>
                    <button 
                      className={`modal-tab ${activeModalTab === 'benefits' ? 'active' : ''}`}
                      onClick={() => setActiveModalTab('benefits')}
                    >
                      Benefits & Safety
                    </button>
                  </div>

                  <div className="modal-tab-content">
                    {activeModalTab === 'guide' && (
                      <div className="info-section animate-fade-in">
                        <h3><ListChecks size={20} style={{display: 'inline', verticalAlign: 'sub', marginRight: '8px'}}/> Step-by-Step Instructions</h3>
                        <ol className="steps-list">
                          {selectedPose.steps.map((step, idx) => (
                            <li key={idx}><span>{idx + 1}.</span> {step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {activeModalTab === 'benefits' && (
                      <div className="info-grid animate-fade-in">
                        <div className="info-section benefits">
                          <h3 style={{color: '#00f2fe'}}>Benefits</h3>
                          <ul>
                            {selectedPose.benefits.map((benefit, idx) => (
                              <li key={idx}><CheckCircle2 size={16} color="#00f2fe" style={{verticalAlign: 'middle', marginRight: '8px'}}/> {benefit}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="info-section precautions">
                          <h3 style={{color: '#ff4b4b'}}>Precautions</h3>
                          <ul>
                            {selectedPose.precautions.map((precaution, idx) => (
                              <li key={idx}><XCircle size={16} color="#ff4b4b" style={{verticalAlign: 'middle', marginRight: '8px'}}/> {precaution}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>

              {/* 5. Similar Poses Section */}
              <div className="similar-poses-section">
                <h3>Similar Poses to Try</h3>
                <div className="similar-poses-grid">
                  {getSimilarPoses(selectedPose).map(pose => (
                    <div 
                      key={pose.id} 
                      className="similar-pose-card glass-panel"
                      onClick={() => {
                        setSelectedPose(pose);
                        setActiveModalTab('guide');
                      }}
                    >
                      <img src={yogaImages[pose.name]?.cover || pose.image} alt={pose.name} />
                      <div className="similar-pose-info">
                        <h4>{pose.name}</h4>
                        <span>{pose.level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="btn btn-primary btn-large btn-full glow-pulse"
                  style={{background: 'linear-gradient(135deg, #00f2fe, #4facfe)', fontSize: '1.1rem'}}
                  onClick={handlePractice}
                >
                  <Play size={20} fill="#fff" /> Start Practicing This Pose
                </button>
              </div>
              
            </div>
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}

function ListChecks(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>
}
