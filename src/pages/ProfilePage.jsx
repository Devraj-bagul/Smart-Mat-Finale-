import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, CheckCircle2, Target, AlertCircle, Shield, Phone, Mail } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { dbService } from '../services/dbService';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(() => dbService.getCurrentUser());
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    contactNo: currentUser?.contactNo || '',
    age: currentUser?.age || '',
    gender: currentUser?.gender || 'Male',
    height: currentUser?.height || '',
    weight: currentUser?.weight || '',
    weightGoal: currentUser?.weightGoal || '',
    fitnessLevel: currentUser?.fitnessLevel || 'Beginner',
    mainGoal: currentUser?.mainGoal || 'Weight Loss',
    timeCommitment: currentUser?.timeCommitment || 20,
    hasMedicalCondition: currentUser?.hasMedicalCondition ?? false,
    medicalConditionDetails: currentUser?.medicalConditionDetails || '',
    photo: currentUser?.photo || '',
    emergencyContactName: currentUser?.emergencyContactName || '',
    emergencyContactPhone: currentUser?.emergencyContactPhone || '',
    emergencyContactEmail: currentUser?.emergencyContactEmail || '',
    emergencyContactRelation: currentUser?.emergencyContactRelation || 'Spouse'
  });

  const [message, setMessage] = useState({ text: '', type: '' });

  // Update form if user updates from elsewhere
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        ...currentUser
      }));
    }
  }, [currentUser]);

  // Sync state changes on user profile updates
  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(dbService.getCurrentUser());
    };
    window.addEventListener('userDataUpdated', handleUpdate);
    return () => window.removeEventListener('userDataUpdated', handleUpdate);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectOption = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.email || !formData.contactNo) {
      setMessage({ text: 'Please fill in Name, Email and Contact Number.', type: 'error' });
      return;
    }
    
    try {
      await dbService.updateCurrentUser({
        ...formData,
        age: Number(formData.age) || 20,
        height: Number(formData.height) || 170,
        weight: Number(formData.weight) || 60,
        weightGoal: Number(formData.weightGoal) || 58,
        timeCommitment: Number(formData.timeCommitment) || 20
      });

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setIsEditing(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({ text: 'Failed to save profile: ' + err.message, type: 'error' });
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      setFormData({
        ...currentUser
      });
    }
    setIsEditing(false);
    setMessage({ text: '', type: '' });
  };

  const handleImageUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: "Image is too large. Choose an image under 2MB.", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, photo: dataUrl }));
        setMessage({ text: "Image loaded! Save changes to finalize.", type: "success" });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const AVATARS = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&q=80"
  ];

  return (
    <DashboardLayout activeTab="profile">
      <div className="tab-content profile-tab animate-fade-in" style={{ padding: '8px' }}>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={handleImageUpload} 
          style={{ display: 'none' }} 
        />

        {/* Cover Banner */}
        <div className="profile-cover-banner" style={{
          height: '160px',
          width: '100%',
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(155, 81, 224, 0.15) 100%)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--glass-border)',
          borderBottom: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,242,254,0.1) 0%, rgba(0,0,0,0) 70%)'
          }}></div>
        </div>

        {/* Profile Header */}
        <div className="profile-header-card glass-panel" style={{
          position: 'relative',
          padding: '24px 32px',
          borderRadius: '0 0 20px 20px',
          borderTop: 'none',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          {/* Avatar and Info Block */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap', marginTop: '-70px' }}>
            <div 
              className="avatar-preview-container" 
              onClick={isEditing ? handleImageUploadClick : undefined}
              style={{ 
                position: 'relative', 
                width: '110px', 
                height: '110px', 
                borderRadius: '50%', 
                border: '4px solid #0b0f19', 
                background: '#0b0f19',
                padding: '0', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                cursor: isEditing ? 'pointer' : 'default',
                zIndex: 2
              }}
            >
              <img 
                src={formData.photo || AVATARS[0]} 
                alt="Profile Avatar" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
              {isEditing && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: 'var(--accent-cyan)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  border: '2px solid #0b0f19'
                }}>
                  <Camera size={14} color="#000" />
                </div>
              )}
            </div>

            <div style={{ paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1.8rem', margin: '0 0 4px', fontWeight: '700' }}>{formData.name || 'Yogi'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>{formData.email}</p>
            </div>
          </div>

          {/* Action Button: Edit Profile or Save/Cancel */}
          <div style={{ paddingBottom: '8px' }}>
            {!isEditing ? (
              <button 
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
                style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)', border: 'none', padding: '10px 24px', borderRadius: '100px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}
              >
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleSave} 
                  className="btn btn-primary" 
                  style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)', border: 'none', padding: '10px 24px', borderRadius: '100px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}
                >
                  Save Changes
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCancel}
                  style={{ padding: '10px 24px', borderRadius: '100px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-grid">
          
          {/* LEFT COLUMN: Stats & Emergency Contact */}
          <div className="profile-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick Stats Card */}
            <div className="profile-card-summary glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--accent-lavender)" /> Activity Summary
              </h4>
              <div className="profile-quick-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>{currentUser?.streak || 0}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Streak</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-lavender)' }}>{currentUser?.totalSessions || 0}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sessions</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: '700', color: '#ff4b4b' }}>{currentUser?.caloriesBurned || 0}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Calories</span>
                </div>
              </div>
            </div>

            {/* Emergency Contact Card */}
            <div className="profile-card-summary glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#ff4b4b" /> Emergency Contact
              </h4>
              
              {!isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Contact Name</span>
                    <span style={{ fontSize: '1rem', color: '#fff', fontWeight: '600' }}>{formData.emergencyContactName || '-'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Relation</span>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      color: 'var(--accent-cyan)', 
                      fontWeight: '600', 
                      background: 'rgba(0, 242, 254, 0.1)', 
                      padding: '4px 10px', 
                      borderRadius: '100px',
                      border: '1px solid rgba(0, 242, 254, 0.2)',
                      display: 'inline-block'
                    }}>
                      {formData.emergencyContactRelation || 'Spouse'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Contact Number</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="var(--text-secondary)" /> {formData.emergencyContactPhone || '-'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address</span>
                    <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-all' }}>
                      <Mail size={14} color="var(--text-secondary)" /> {formData.emergencyContactEmail || '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Contact Name</label>
                    <input 
                      type="text" 
                      name="emergencyContactName" 
                      value={formData.emergencyContactName} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Relation</label>
                    <select 
                      name="emergencyContactRelation" 
                      value={formData.emergencyContactRelation} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Contact Number</label>
                    <input 
                      type="text" 
                      name="emergencyContactPhone" 
                      value={formData.emergencyContactPhone} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                    <input 
                      type="email" 
                      name="emergencyContactEmail" 
                      value={formData.emergencyContactEmail} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Avatar Selector */}
            {isEditing && (
              <div className="avatar-selector-panel glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Choose Premium Avatar</h4>
                <div className="avatar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {AVATARS.map((url, idx) => (
                    <div 
                      key={idx} 
                      className={`avatar-option ${formData.photo === url ? 'selected' : ''}`}
                      onClick={() => handleSelectOption('photo', url)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: formData.photo === url ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                        boxShadow: formData.photo === url ? '0 0 10px rgba(0, 242, 254, 0.5)' : 'none',
                        padding: '2px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img src={url} alt="Avatar option" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Or Paste Image URL</label>
                  <input 
                    type="text" 
                    name="photo" 
                    value={formData.photo} 
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Personal Details & Wellness parameters */}
          <div className="profile-right-col">
            {message.text && (
              <div className={`form-feedback-banner ${message.type}`} style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '0.95rem',
                background: message.type === 'success' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 75, 75, 0.1)',
                border: message.type === 'success' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid rgba(255, 75, 75, 0.3)',
                color: message.type === 'success' ? '#00f2fe' : '#ff4b4b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>{message.text}</span>
              </div>
            )}

            {!isEditing ? (
              <div className="profile-form-panel glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '1.35rem', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={20} color="var(--accent-cyan)" /> Personal Details
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Full Name</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.name || '-'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Contact Number</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.contactNo || '-'}</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
                  <Target size={20} color="var(--accent-lavender)" /> Physical & Goal Metrics
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Age</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.age} Years</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Height</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.height} cm</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Gender</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.gender}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Current Weight</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.weight} kg</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Target Weight</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.weightGoal} kg</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Daily Commitment</span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{formData.timeCommitment} min</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Fitness Level</span>
                    <span style={{ fontSize: '1.05rem', color: '#00f2fe', fontWeight: '600' }}>{formData.fitnessLevel}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Main Goal</span>
                    <span style={{ fontSize: '1.05rem', color: '#00f2fe', fontWeight: '600' }}>{formData.mainGoal}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#ff4b4b', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '6px' }}>
                    <AlertCircle size={16} /> Injuries / Medical Conditions
                  </span>
                  <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '500' }}>
                    {formData.hasMedicalCondition ? formData.medicalConditionDetails : 'None Reported'}
                  </span>
                </div>
              </div>
            ) : (
              <form className="profile-form-panel glass-panel" onSubmit={handleSave} style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '1.35rem', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={20} color="var(--accent-cyan)" /> Personal Details
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Contact Number</label>
                    <input 
                      type="text" 
                      name="contactNo" 
                      value={formData.contactNo} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
                  <Target size={20} color="var(--accent-lavender)" /> Physical & Goal Metrics
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Age (Years)</label>
                    <input 
                      type="number" 
                      name="age" 
                      value={formData.age} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Height (cm)</label>
                    <input 
                      type="number" 
                      name="height" 
                      value={formData.height} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Gender</label>
                    <select 
                      name="gender" 
                      value={formData.gender} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Current Weight (kg)</label>
                    <input 
                      type="number" 
                      name="weight" 
                      value={formData.weight} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Target Weight (kg)</label>
                    <input 
                      type="number" 
                      name="weightGoal" 
                      value={formData.weightGoal} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Goal Commitment</label>
                    <select 
                      name="timeCommitment" 
                      value={formData.timeCommitment} 
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    >
                      <option value="10">10 min</option>
                      <option value="20">20 min</option>
                      <option value="30">30+ min</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Fitness Level</label>
                    <div className="chips-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                        <div 
                          key={lvl} 
                          className={`chip ${formData.fitnessLevel === lvl ? 'active' : ''}`}
                          onClick={() => handleSelectOption('fitnessLevel', lvl)}
                          style={{
                            padding: '8px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: formData.fitnessLevel === lvl ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: formData.fitnessLevel === lvl ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.05)',
                            color: formData.fitnessLevel === lvl ? '#00f2fe' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {lvl}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Main Goal</label>
                    <select 
                      name="mainGoal" 
                      value={formData.mainGoal} 
                      onChange={handleChange} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    >
                      <option value="Weight Loss">Weight Loss</option>
                      <option value="Flexibility">Flexibility</option>
                      <option value="Strength">Strength</option>
                      <option value="Stress Relief">Stress Relief</option>
                      <option value="General Fitness">General Fitness</option>
                    </select>
                  </div>
                </div>

                <div className="form-group health-safety" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', marginBottom: '24px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4b4b', fontSize: '0.95rem', fontWeight: '600' }}>
                      <AlertCircle size={16} color="#ff4b4b" /> Health Safety Details
                    </span>
                  </label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Do you have any injuries or medical conditions?</p>
                  <div className="chips-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div 
                      className={`chip ${formData.hasMedicalCondition === true ? 'active-alert' : ''}`} 
                      onClick={() => handleSelectOption('hasMedicalCondition', true)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        background: formData.hasMedicalCondition === true ? 'rgba(255, 75, 75, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: formData.hasMedicalCondition === true ? '1px solid #ff4b4b' : '1px solid rgba(255, 255, 255, 0.05)',
                        color: formData.hasMedicalCondition === true ? '#ff4b4b' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Yes
                    </div>
                    <div 
                      className={`chip ${formData.hasMedicalCondition === false ? 'active' : ''}`} 
                      onClick={() => handleSelectOption('hasMedicalCondition', false)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        background: formData.hasMedicalCondition === false ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: formData.hasMedicalCondition === false ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.05)',
                        color: formData.hasMedicalCondition === false ? '#00f2fe' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      No
                    </div>
                  </div>
                  {formData.hasMedicalCondition && (
                    <div className="form-group animate-fade-in">
                      <input 
                        type="text" 
                        name="medicalConditionDetails" 
                        value={formData.medicalConditionDetails} 
                        onChange={handleChange} 
                        placeholder="Specify condition (e.g. back injury, knee pain)..." 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, background: 'linear-gradient(135deg, #00f2fe, #4facfe)', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}
                  >
                    Save Changes
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCancel}
                    style={{ flex: 1, padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
