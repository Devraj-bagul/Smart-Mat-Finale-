import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, ArrowLeft, Mail, Lock, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { dbService } from '../services/dbService';
import logo from '../assets/logo.png';
import './AuthPage.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    contactNo: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    fitnessLevel: '',
    mainGoal: '',
    hasMedicalCondition: null, // null for unselected
    medicalConditionDetails: '',
    timeCommitment: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setError(''); // clear error on typing
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectOption = (name, value) => {
    setError(''); // clear error on select
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      await dbService.loginUser(formData.email, formData.password);
      localStorage.setItem('session_active', 'true');
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.contactNo || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all basic information fields.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address.');
        return false;
      }
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      const cleanPhone = formData.contactNo.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10) {
        setError('Please enter a valid 10+ digit phone number including country code (e.g. +91 9876543210).');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.gender || !formData.age || !formData.height || !formData.weight) {
        setError('Please complete all physical metrics to personalize your experience.');
        return false;
      }
    } else if (step === 3) {
      if (!formData.fitnessLevel || !formData.mainGoal || !formData.timeCommitment || formData.hasMedicalCondition === null) {
        setError('Please select all health and fitness options.');
        return false;
      }
      if (formData.hasMedicalCondition === true && !formData.medicalConditionDetails.trim()) {
        setError('Please specify your medical condition so we can ensure safe routines.');
        return false;
      }
    }
    return true;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      try {
        await dbService.registerUser(formData.email, formData.password, {
          name: formData.name,
          contactNo: formData.contactNo,
          gender: formData.gender,
          age: Number(formData.age),
          height: Number(formData.height),
          weight: Number(formData.weight),
          fitnessLevel: formData.fitnessLevel,
          mainGoal: formData.mainGoal,
          hasMedicalCondition: formData.hasMedicalCondition,
          medicalConditionDetails: formData.medicalConditionDetails,
          timeCommitment: parseInt(formData.timeCommitment) || 30
        });
        localStorage.setItem('session_active', 'true');
        navigate('/home');
      } catch (err) {
        setError(err.message || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="auth-page">
      <nav className="auth-nav container">
        <div className="logo flex-center" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src={logo} alt="NextGen Logo" className="brand-logo" />
          <span className="logo-text">NextGen <span className="text-gradient">Yoga Mat</span></span>
        </div>
      </nav>

      <div className="auth-container container flex-center">
        <div className="auth-card glass-panel animate-fade-in">
          
          <div className="auth-header text-center">
            <h2>{isLogin ? 'Welcome Back' : 'Create Your Profile'}</h2>
            <p className="text-secondary">
              {isLogin ? 'Log in to continue your wellness journey.' : 'Let’s personalize your NextGen experience.'}
            </p>
          </div>

          {error && (
            <div className="error-banner animate-fade-in">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN VIEW */}
          {isLogin && (
            <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label>Email ID</label>
                <div className="input-with-icon">
                  <Mail size={20} className="input-icon" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="namaste@example.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-with-icon">
                  <Lock size={20} className="input-icon" />
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full glow-pulse" style={{marginTop: '24px'}}>
                Log In <ArrowRight size={20} />
              </button>
            </form>
          )}

          {/* SIGNUP VIEW */}
          {!isLogin && (
            <form onSubmit={handleSignupSubmit} className="auth-form" noValidate>
              
              {/* Step Indicators */}
              <div className="step-indicators flex-center">
                <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
                <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
                <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
                <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
                <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
              </div>
              <p className="step-text text-center text-secondary">
                {step === 1 && 'Step 1: Account & Basic Info'}
                {step === 2 && 'Step 2: Physical Metrics'}
                {step === 3 && 'Step 3: Health & Fitness Goals'}
              </p>

              {/* STEP 1: Basic Info */}
              {step === 1 && (
                <div className="step-content animate-fade-in">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <div className="input-with-icon">
                        <User size={18} className="input-icon" />
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Contact No</label>
                      <div className="input-with-icon">
                        <Phone size={18} className="input-icon" />
                        <input type="tel" name="contactNo" value={formData.contactNo} onChange={handleChange} placeholder="+91 9876543210" />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email ID</label>
                    <div className="input-with-icon">
                      <Mail size={18} className="input-icon" />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Create Password</label>
                      <div className="input-with-icon">
                        <Lock size={18} className="input-icon" />
                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Re-enter Password</label>
                      <div className="input-with-icon">
                        <CheckCircle2 size={18} className="input-icon" />
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Physical Metrics */}
              {step === 2 && (
                <div className="step-content animate-fade-in">
                  <div className="form-group">
                    <label>Gender</label>
                    <div className="chips-grid">
                      {['Male', 'Female', 'Other'].map(g => (
                        <div 
                          key={g} 
                          className={`chip ${formData.gender === g ? 'active' : ''}`}
                          onClick={() => handleSelectOption('gender', g)}
                        >
                          {g}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Age</label>
                      <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="e.g. 25" min="10" max="100" />
                    </div>
                    <div className="form-group">
                      <label>Height (cm)</label>
                      <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 170" min="50" max="250" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 65" min="20" max="300" />
                  </div>
                </div>
              )}

              {/* STEP 3: Health & Fitness Goals */}
              {step === 3 && (
                <div className="step-content animate-fade-in">
                  <div className="form-group">
                    <label>What is your fitness level?</label>
                    <div className="chips-grid">
                      {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                        <div 
                          key={lvl} 
                          className={`chip ${formData.fitnessLevel === lvl ? 'active' : ''}`}
                          onClick={() => handleSelectOption('fitnessLevel', lvl)}
                        >
                          {lvl}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>What is your main goal?</label>
                    <div className="chips-grid wrap">
                      {['Weight Loss', 'Flexibility', 'Strength', 'Stress Relief', 'General Fitness'].map(goal => (
                        <div 
                          key={goal} 
                          className={`chip ${formData.mainGoal === goal ? 'active' : ''}`}
                          onClick={() => handleSelectOption('mainGoal', goal)}
                        >
                          {goal}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group health-safety">
                    <label className="flex-between">
                      <span className="flex-center" style={{gap: '8px'}}><AlertCircle size={16} color="#ff4b4b"/> Health Safety (Critical)</span>
                    </label>
                    <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '8px'}}>Do you have any injuries or medical conditions?</p>
                    <div className="chips-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                      <div className={`chip ${formData.hasMedicalCondition === true ? 'active-alert' : ''}`} onClick={() => handleSelectOption('hasMedicalCondition', true)}>Yes</div>
                      <div className={`chip ${formData.hasMedicalCondition === false ? 'active' : ''}`} onClick={() => handleSelectOption('hasMedicalCondition', false)}>No</div>
                    </div>
                    {formData.hasMedicalCondition && (
                      <div className="form-group animate-fade-in" style={{marginTop: '16px'}}>
                        <input type="text" name="medicalConditionDetails" value={formData.medicalConditionDetails} onChange={handleChange} placeholder="Please specify (e.g. Lower back pain)..." />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>How much time can you give daily?</label>
                    <div className="chips-grid">
                      {['10 min', '20 min', '30+ min'].map(time => (
                        <div 
                          key={time} 
                          className={`chip ${formData.timeCommitment === time ? 'active' : ''}`}
                          onClick={() => handleSelectOption('timeCommitment', time)}
                        >
                          {time}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Navigation Controls */}
              <div className="form-actions flex-between">
                {step > 1 ? (
                  <button type="button" className="btn btn-glass" onClick={() => { setStep(step - 1); setError(''); }}>
                    <ArrowLeft size={18} /> Back
                  </button>
                ) : (
                  <div></div> /* Spacer */
                )}
                <button type="submit" className="btn btn-primary glow-pulse">
                  {step < 3 ? 'Next Step' : 'Complete Profile'} <ArrowRight size={18} />
                </button>
              </div>

            </form>
          )}

          <div className="auth-footer text-center">
            {isLogin ? (
              <p>Don't have an account? <span className="text-gradient auth-link" onClick={() => { setIsLogin(false); setError(''); }}>Create Profile</span></p>
            ) : (
              <p>Already have an account? <span className="text-gradient auth-link" onClick={() => { setIsLogin(true); setStep(1); setError(''); }}>Log In</span></p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
