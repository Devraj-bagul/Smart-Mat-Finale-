import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Send, Volume2, VolumeX, Loader, Settings, 
  Activity, Apple, Zap, Sparkles, Key, Heart, Smile, 
  Calendar, Clock, AlertTriangle, Flame, Compass, ChevronRight, Check, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import yogaGuruImg from '../assets/Yoga Guru.png';
import './AIGuruPage.css';
import { dbService } from '../services/dbService';
import { yogaPoses } from '../data/yogaPoses';
import { aiService, getHealthMetrics, calculateBMI, getBMICategory, getLanguageConfig } from '../services/aiService';

export default function AIGuruPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => dbService.getCurrentUser());
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState('en-IN'); // en-IN, hi-IN, mr-IN
  const [inputText, setInputText] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [statusError, setStatusError] = useState(false);
  
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Gemini API Configuration State
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDWOIVqMNcr4ehDrCDtnZH4WM9eTECZGVE');
  const [showSettings, setShowSettings] = useState(false);

  // Available voices for speech synthesis
  const [availableVoices, setAvailableVoices] = useState([]);

  // Health Metrics
  const healthMetrics = getHealthMetrics(currentUser);

  const saveApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key);
    setGeminiKey(key);
    setShowSettings(false);
  };

  // Load SpeechSynthesis voices asynchronously
  useEffect(() => {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Helper to retrieve the best voice for a selected language
  const getVoiceForLanguage = (lang) => {
    const cfg = getLanguageConfig(lang);
    const targetLang = cfg.speechSynthesis.toLowerCase();

    // 1. Exact match (locale)
    let voice = availableVoices.find(v => v.lang.toLowerCase() === targetLang || v.lang.toLowerCase().replace('_', '-') === targetLang);

    // 2. Language code prefix match (e.g. "hi", "mr", "en")
    if (!voice) {
      const prefix = targetLang.split('-')[0];
      voice = availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix));
    }

    // 3. Fallback for Indian accents if looking for Hindi/Marathi
    if (!voice && (targetLang.includes('hi') || targetLang.includes('mr'))) {
      voice = availableVoices.find(v => v.lang.toLowerCase().includes('in'));
    }

    // 4. Default fallback
    if (!voice) {
      voice = availableVoices.find(v => v.default) || availableVoices[0];
    }

    return voice;
  };

  // Sync state on user profile updates
  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(dbService.getCurrentUser());
    };
    window.addEventListener('userDataUpdated', handleUpdate);
    return () => window.removeEventListener('userDataUpdated', handleUpdate);
  }, []);

  // Multilingual Initial Greeting
  useEffect(() => {
    const nameToDisplay = currentUser?.name ? currentUser.name.split(' ')[0] : 'Yogi';
    const streak = currentUser?.streak || 0;
    const health = getHealthMetrics(currentUser);
    const cfg = getLanguageConfig(language);

    let greeting = '';
    if (cfg.language === 'Hindi') {
      greeting = `नमस्ते ${nameToDisplay}! मैं आपका एआई योग गुरु हूँ। `;
      if (streak > 0) {
        greeting += `आपकी ${streak}-दिनों की योग लकीर बनाए रखने के लिए बहुत बढ़िया काम! 🔥 `;
      }
      if (health.stressLevel === "High") {
        greeting += `मुझे लगता है कि आज आपका तनाव कुछ बढ़ा हुआ है। क्या हम एक शांत श्वास सत्र या हल्के खिंचाव से शुरू करें?`;
      } else {
        greeting += `आपका ऊर्जा स्तर आज ${health.energyScore}/100 है। आज मैं आपकी कल्याण यात्रा में आपका मार्गदर्शन कैसे करूँ?`;
      }
    } else if (cfg.language === 'Marathi') {
      greeting = `नमस्कार ${nameToDisplay}! मी तुमचा एआई योग गुरू आहे. `;
      if (streak > 0) {
        greeting += `तुमचा ${streak}-दिवसांचा योग सातत्य टिकवून ठेवल्याबद्दल खूप अभिनंदन! 🔥 `;
      }
      if (health.stressLevel === "High") {
        greeting += `मला वाटते की आज तुमचा तणाव वाढलेला आहे. आपण श्वास सत्राने किंवा हलक्या ताणाने सुरुवात करायची का?`;
      } else {
        greeting += `तुमची ऊर्जा पातळी आज ${health.energyScore}/100 आहे. आज मी तुमच्या आरोग्य प्रवासात मार्गदर्शन कसे करू?`;
      }
    } else {
      greeting = `Namaste ${nameToDisplay}! I am AI Yoga Guru, your virtual yoga coach. `;
      if (streak > 0) {
        greeting += `Incredible job on maintaining a ${streak}-day yoga streak! 🔥 `;
      }
      if (health.stressLevel === "High") {
        greeting += `I notice your stress index is slightly elevated today. How about we start with some gentle stretching or a relaxing breathing session?`;
      } else {
        greeting += `Your energy level is at ${health.energyScore}/100. How can I guide your wellness journey today?`;
      }
    }

    // Auto-play greeting if browser allows
    setTimeout(() => {
      if (soundEnabled) speakText(greeting, language);
    }, 800);
  }, [language]);

  // Initialize the speech recognition engine with proper settings and callbacks
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const cfg = getLanguageConfig(language);
    recognition.lang = cfg.speechRecognition;

    let silenceTimer = null;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusError(false);
    };

    recognition.onspeechstart = () => {
      // Speech has started
    };

    recognition.onspeechend = () => {
      // Speech has ended
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let latestFinal = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          latestFinal += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = (latestFinal || interimTranscript).trim();
      if (text) {
        setInputText(text);

        // Reset silence detection timer
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (text && !isProcessingRef.current) {
            handleUserSubmit(text);
          }
        }, 1500);
      }
    };

    recognition.onnomatch = () => {
      console.log("No speech matching the dictionary was recognized.");
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatusError(true);
        setIsSessionActive(false);
        setIsListening(false);
        alert("Microphone access was denied. Please enable microphone permissions in your browser settings to use voice sessions.");
      } else if (event.error === 'no-speech') {
        // Handled silently, onend will restart if appropriate
      } else {
        setStatusError(true);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
      
      // Auto-restart if session is active and not currently processing/speaking
      if (isSessionActive && !isProcessingRef.current) {
        setTimeout(() => {
          try {
            if (isSessionActive && !isProcessingRef.current) {
              recognition.start();
              setIsListening(true);
            }
          } catch (e) {
            console.warn("Failed to restart speech recognition:", e);
          }
        }, 300);
      }
    };

    return recognition;
  };

  // Re-initialize speech recognition on language changes
  useEffect(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const rec = initializeSpeechRecognition();
    recognitionRef.current = rec;

    if (isSessionActive && rec && !isProcessingRef.current) {
      try {
        rec.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start speech recognition after language change:", e);
      }
    }

    return () => {
      if (rec) {
        try {
          rec.stop();
        } catch (e) {}
      }
    };
  }, [language]);

  const getSuggestedQueries = () => {
    const cfg = getLanguageConfig(language);
    if (cfg.language === 'Hindi') {
      return [
        { icon: '🧘', text: 'योगासन सुझाव', query: 'योगासनों की सिफारिश करें' },
        { icon: '🥗', text: 'आहार योजना', query: 'आहार योजना बनाएं' },
        { icon: '📅', text: 'दैनिक योग कार्यक्रम', query: 'दैनिक योग योजना दिखाएं' },
        { icon: '😌', text: 'तनाव मुक्ति उपाय', query: 'तनाव से राहत के उपाय दें' }
      ];
    }
    if (cfg.language === 'Marathi') {
      return [
        { icon: '🧘', text: 'योग शिफारसी', query: 'योगासनांची शिफारस करा' },
        { icon: '🥗', text: 'आहार योजना', query: 'आहार पत्रक तयार करा' },
        { icon: '📅', text: 'दैनिक योग कार्यक्रम', query: 'दैनिक योग योजना दाखवा' },
        { icon: '😌', text: 'तणावमुक्तीचे उपाय', query: 'तणावमुक्तीसाठी उपाय सांगा' }
      ];
    }
    return [
      { icon: '🧘', text: 'Recommend Poses', query: 'Recommend yoga poses for me' },
      { icon: '🥗', text: 'Create Diet Plan', query: 'Create a diet plan' },
      { icon: '📅', text: 'Daily Yoga Plan', query: 'Show my daily yoga plan' },
      { icon: '😌', text: 'Stress Relief Tips', query: 'Give me stress relief tips' }
    ];
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Voice session controls
  const handleToggleListen = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isSessionActive) {
      setIsSessionActive(false);
      isProcessingRef.current = false;
      recognitionRef.current.stop();
      window.speechSynthesis.cancel();
      setIsListening(false);
      setIsSpeaking(false);
    } else {
      setIsSessionActive(true);
      isProcessingRef.current = false;
      window.speechSynthesis.cancel(); 
      setIsSpeaking(false);
      setStatusError(false);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {}
    }
  };

  const speakText = (text, lang = language) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const cfg = getLanguageConfig(lang);
    const preferredVoice = getVoiceForLanguage(lang);

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = cfg.speechSynthesis;
    }

    utterance.pitch = 1.25; 
    utterance.rate = 0.95; 

    utterance.onend = () => {
      setIsSpeaking(false);
      isProcessingRef.current = false;
      if (isSessionActive && recognitionRef.current) {
        try { 
          recognitionRef.current.start(); 
          setIsListening(true);
        } catch (e) { }
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      isProcessingRef.current = false;
      if (isSessionActive && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {}
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Navigates to practice session pre-selecting the target pose
  const handlePracticePose = (poseName) => {
    if (!poseName) return;
    
    // Find matching pose
    const cleanName = poseName.split(' (')[0].trim();
    const matched = yogaPoses.find(p => 
      p.name.toLowerCase().includes(cleanName.toLowerCase()) || 
      cleanName.toLowerCase().includes(p.name.toLowerCase().split('(')[0].trim())
    );

    const poseId = matched ? matched.id : 6;
    localStorage.setItem('selected_pose_id', poseId);

    navigate("/start-yoga", {
      state: {
        selectedPose: cleanName,
        poseId: poseId
      }
    });
  };

  const handleUserSubmit = async (text) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const newUserMsg = { id: Date.now(), sender: 'user', text, type: 'text' };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');

    // 2. Set processing states - ensure only one state shows
    isProcessingRef.current = true;
    setIsThinking(true);
    setIsSpeaking(false);
    setIsListening(false);
    setStatusError(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }

    try {
      const lower = text.toLowerCase();
      let type = 'text';
      let data = null;
      let verbalResponse = '';

      const isDiet = lower.includes('diet') || lower.includes('food') || lower.includes('meal') || lower.includes('eat') || lower.includes('nutrition') || lower.includes('calorie') || lower.includes('आहार') || lower.includes('जेवण');
      const isPose = lower.includes('pose') || lower.includes('yoga recommendation') || lower.includes('recommend yoga') || lower.includes('recommend poses') || lower.includes('stretch') || lower.includes('exercise') || lower.includes('आसन') || lower.includes('योगासन');
      const isDailyPlan = lower.includes('daily plan') || lower.includes('yoga plan') || lower.includes('schedule') || lower.includes('plan for today') || lower.includes('दिनचर्या') || lower.includes('कार्यक्रम');
      const isRoutine = lower.includes('routine') || lower.includes('tips') || lower.includes('activities') || lower.includes('stress relief tips') || lower.includes('habits') || lower.includes('उपाया') || lower.includes('सवयी');

      if (isDiet) {
        type = 'diet';
        data = await aiService.generateDietPlan(currentUser, language, geminiKey);
        verbalResponse = language === 'hi-IN' ? `निश्चित रूप से, मैंने आपके ${currentUser.mainGoal} लक्ष्य के लिए आहार योजना तैयार की है। दैनिक ऊर्जा आवश्यकता लगभग ${data.calories} है।` :
                         language === 'mr-IN' ? `नक्कीच, मी तुमच्या ${currentUser.mainGoal} ध्येयासाठी आहार पत्रक तयार केले आहे. अंदाजे कॅलरीज ${data.calories} आहेत.` :
                         `Sure, I have generated a customized diet plan for your ${currentUser.mainGoal} goal, estimating around ${data.calories}. Let me know if you would like me to adjust it.`;
      } else if (isPose) {
        type = 'poses';
        data = await aiService.generateYogaAdvice(currentUser, language, geminiKey);
        verbalResponse = language === 'hi-IN' ? `मैंने आपके ${currentUser.fitnessLevel} स्तर के अनुसार कुछ योगासनों की सिफारिश की है। वे आपकी स्क्रीन पर दिखाई दे रहे हैं!` :
                         language === 'mr-IN' ? `मी तुमच्या ${currentUser.fitnessLevel} पातळीनुसार काही योगासने सुचवली आहेत. ती तुमच्या स्क्रीनवर दिसत आहेत!` :
                         `I've put together some tailored yoga recommendations based on your ${currentUser.fitnessLevel} level. They are displayed on your screen now!`;
      } else if (isDailyPlan) {
        type = 'dailyPlan';
        data = await aiService.generateDailyYogaPlan(currentUser, language, geminiKey);
        verbalResponse = language === 'hi-IN' ? `यहाँ आपका दैनिक योग कार्यक्रम है, जो आपके ${currentUser.timeCommitment}-मिनट के समय के अनुकूल है।` :
                         language === 'mr-IN' ? `येथे तुमचा दैनिक योग कार्यक्रम आहे, जो तुमच्या ${currentUser.timeCommitment}-मिनिटांच्या वेळेनुसार आहे.` :
                         `Here is your daily session timeline for today, optimized for your ${currentUser.timeCommitment}-minute commit.`;
      } else if (isRoutine) {
        type = 'routine';
        data = await aiService.generateDailyRoutine(currentUser, language, geminiKey);
        verbalResponse = language === 'hi-IN' ? `आपके स्वास्थ्य लक्ष्यों का समर्थन करने के लिए, मैंने कुछ दैनिक आदतें तैयार की हैं।` :
                         language === 'mr-IN' ? `तुमच्या आरोग्याच्या ध्येयांना पाठिंबा देण्यासाठी, मी काही दैनिक सवयी तयार केल्या आहेत.` :
                         `To support your ${currentUser.mainGoal} focus, I've outlined some helpful daily routine habits.`;
      } else {
        verbalResponse = await aiService.chatWithGuru(currentUser, messages, text, language, geminiKey);
      }

      setIsThinking(false);
      const aiResponse = {
        id: Date.now() + 1,
        sender: 'ai',
        text: verbalResponse,
        type,
        data,
        isAudio: soundEnabled
      };
      setMessages(prev => [...prev, aiResponse]);

      // 3. Audio synthesis - transition to speaking state
      if (soundEnabled) {
        setIsSpeaking(true);
        speakText(verbalResponse, language);
      } else {
        setIsSpeaking(false);
        isProcessingRef.current = false;
        if (isSessionActive && recognitionRef.current) {
          try { 
            recognitionRef.current.start(); 
            setIsListening(true);
          } catch (e) { }
        }
      }

    } catch (error) {
      console.error("Guru Submit Error:", error);
      setIsThinking(false);
      setIsSpeaking(false);
      isProcessingRef.current = false;
      setStatusError(true);

      const fallbackMsg = language === 'hi-IN' ? "मुझे प्रतिक्रिया देने में थोड़ी परेशानी हो रही है। कृपया पुनः प्रयास करें।" :
                          language === 'mr-IN' ? "मला प्रतिसाद देण्यात थोडी अडचण येत आहे. कृपया पुन्हा प्रयत्न करा." :
                          "I'm having a slight trouble connecting right now. Let me know if we can try again!";
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: fallbackMsg,
        type: 'text'
      }]);
      if (soundEnabled) speakText(fallbackMsg, language);
    }
  };

  const formatText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ color: '#00f2fe' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // State based rendering of status text (Ensures only one visible state)
  const renderStatusText = () => {
    const cfg = getLanguageConfig(language);
    if (statusError) {
      return (
        <span className="status-error">
          <AlertTriangle size={15} /> 
          {cfg.language === 'Hindi' ? 'जवाब देने में असमर्थ। कृपया पुनः प्रयास करें।' : cfg.language === 'Marathi' ? 'प्रतिसाद देण्यात अक्षम. कृपया पुन्हा प्रयत्न करा.' : 'Unable to respond. Please try again.'}
        </span>
      );
    }
    if (isThinking) {
      return (
        <span className="status-thinking">
          <Loader size={15} className="spin-icon" /> 
          {cfg.language === 'Hindi' ? 'एआई योग गुरु सोच रहे हैं...' : cfg.language === 'Marathi' ? 'एआय योग गुरू विचार करत आहेत...' : 'AI Yoga Guru is thinking...'}
        </span>
      );
    }
    if (isSpeaking) {
      return (
        <span className="status-speaking animate-fade-in">
          <Volume2 size={16} className="speaking-speaker" />
          {cfg.language === 'Hindi' ? 'योग गुरु बोल रहे हैं...' : cfg.language === 'Marathi' ? 'योग गुरू बोलत आहेत...' : 'Yoga Guru is speaking...'}
          <div className="speaking-waves">
            <span className="speak-bar"></span>
            <span className="speak-bar"></span>
            <span className="speak-bar"></span>
          </div>
        </span>
      );
    }
    if (isListening) {
      return (
        <span className="status-listening animate-fade-in">
          <Mic size={16} className="pulsing-mic" /> 
          {cfg.language === 'Hindi' ? 'सुन रहा हूँ...' : cfg.language === 'Marathi' ? 'ऐकत आहे...' : 'Listening...'}
          <div className="listening-waves">
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
          </div>
        </span>
      );
    }
    return <span className="status-idle">{cfg.language === 'Hindi' ? 'मदद के लिए तैयार' : cfg.language === 'Marathi' ? 'मदतीसाठी तयार' : 'Ready to Help'}</span>;
  };

  // Localized UI text helpers
  const getUiText = (key) => {
    const cfg = getLanguageConfig(language);
    const trans = {
      'en-IN': {
        practice: "Practice Now",
        breakfast: "🍳 Breakfast",
        lunch: "🍱 Lunch",
        dinner: "🍲 Dinner",
        snacks: "🍇 Snacks",
        hydration: "💧 Hydration",
        avoid: "Foods to Avoid",
        alternatives: "Healthy Alternatives",
        bmi: "BMI Index",
        goal: "Daily Goal",
        morningWarm: "🌅 Morning Warm-up",
        mainSess: "🧘 Main Session",
        coolD: "🌌 Cool Down",
        wellnessTitle: "Daily Wellness Activities"
      },
      'hi-IN': {
        practice: "अभ्यास करें",
        breakfast: "🍳 नाश्ता",
        lunch: "🍱 दोपहर का भोजन",
        dinner: "🍲 रात का खाना",
        snacks: "🍇 स्नैक्स",
        hydration: "💧 जल योजन",
        avoid: "परहेज करें",
        alternatives: "स्वस्थ विकल्प",
        bmi: "बीएमआई सूचकांक",
        goal: "दैनिक लक्ष्य",
        morningWarm: "🌅 सुबह का वार्म-अप",
        mainSess: "🧘 मुख्य सत्र",
        coolD: "🌌 कूल डाउन",
        wellnessTitle: "दैनिक कल्याण गतिविधियां"
      },
      'mr-IN': {
        practice: "सराव करा",
        breakfast: "🍳 न्याहारी",
        lunch: "🍱 दुपारचे जेवण",
        dinner: "🍲 रात्रीचे जेवण",
        snacks: "🍇 स्नॅक्स",
        hydration: "💧 हायड्रेशन",
        avoid: "टाळावयाचे अन्न",
        alternatives: "निरोगी पर्याय",
        bmi: "बीएमआय निर्देशांक",
        goal: "दैनिक ध्येय",
        morningWarm: "🌅 सकाळचा वॉर्म-अप",
        mainSess: "🧘 मुख्य सत्र",
        coolD: "🌌 कूल डाऊन",
        wellnessTitle: "दैनिक आरोग्य उपक्रम"
      }
    };
    return trans[language]?.[key] || trans['en-IN'][key];
  };

  // Card Content Renderers
  const renderPosesCard = (poses) => {
    return (
      <div className="poses-grid-container animate-slide-up">
        <h4 className="card-section-title"><Compass size={16} color="#00f2fe" /> {language === 'hi-IN' ? 'योग गुरु अनुशंसाएँ' : language === 'mr-IN' ? 'योग गुरू शिफारसी' : 'Guru Poses Recommendations'}</h4>
        <div className="poses-cards-list">
          {poses.map((pose, i) => (
            <div key={i} className="pose-recommendation-card glass-panel">
              <div className="pose-card-header flex-between">
                <span className="pose-card-name">{pose.name}</span>
                <span className="badge badge-cyan">{pose.level}</span>
              </div>
              <p className="pose-card-why">{pose.whyRecommended}</p>
              <div className="pose-card-meta flex-between">
                <span className="duration-tag"><Clock size={12} /> {pose.duration}</span>
                <div className="pose-card-benefits">
                  {pose.benefits.slice(0, 2).map((b, idx) => (
                    <span key={idx} className="benefit-pill">{b}</span>
                  ))}
                </div>
              </div>
              <button 
                className="btn-practice-now btn-primary-gradient flex-center"
                onClick={() => handlePracticePose(pose.name)}
              >
                {getUiText('practice')} <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDietCard = (diet) => {
    return (
      <div className="diet-card-container glass-panel animate-slide-up">
        <h4 className="card-section-title"><Apple size={16} color="#2ecc71" /> {language === 'hi-IN' ? 'आहार योजना' : language === 'mr-IN' ? 'आहार पत्रक' : 'Customized Diet Plan'} ({diet.goal})</h4>
        
        <div className="diet-calories-summary flex-between">
          <div>
            <span className="text-secondary text-xs">{getUiText('bmi')}</span>
            <div className="bmi-text">{diet.bmi} ({diet.bmiCategory})</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="text-secondary text-xs">{getUiText('goal')}</span>
            <div className="calories-text">{diet.calories}</div>
          </div>
        </div>

        <div className="meals-schedule">
          <div className="meal-item">
            <span className="meal-label">{getUiText('breakfast')}</span>
            <p className="meal-desc">{diet.breakfast}</p>
          </div>
          <div className="meal-item">
            <span className="meal-label">{getUiText('lunch')}</span>
            <p className="meal-desc">{diet.lunch}</p>
          </div>
          <div className="meal-item">
            <span className="meal-label">{getUiText('dinner')}</span>
            <p className="meal-desc">{diet.dinner}</p>
          </div>
          <div className="meal-item">
            <span className="meal-label">{getUiText('snacks')}</span>
            <p className="meal-desc">{diet.snacks}</p>
          </div>
          <div className="meal-item">
            <span className="meal-label">{getUiText('hydration')}</span>
            <p className="meal-desc">{diet.hydration}</p>
          </div>
        </div>

        <div className="diet-guidelines grid-2">
          <div className="guideline-block avoid-list">
            <span className="guideline-title"><X size={14} color="#ff4b4b" /> {getUiText('avoid')}</span>
            <ul>
              {diet.avoid.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
          <div className="guideline-block replace-list">
            <span className="guideline-title"><Check size={14} color="#2ecc71" /> {getUiText('alternatives')}</span>
            <ul>
              {diet.alternatives.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderDailyPlanCard = (plan) => {
    return (
      <div className="plan-card-container glass-panel animate-slide-up">
        <h4 className="card-section-title"><Calendar size={16} color="#00f2fe" /> {plan.title}</h4>
        
        <div className="timeline-section">
          <div className="timeline-step">
            <div className="timeline-bullet morning-bullet"></div>
            <div className="timeline-content">
              <span className="timeline-time">{getUiText('morningWarm')}</span>
              {plan.morning.map((act, idx) => (
                <div key={idx} className="timeline-activity flex-between">
                  <span>{act.activity}</span>
                  <span className="badge-duration">{act.duration}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="timeline-step">
            <div className="timeline-bullet active-bullet"></div>
            <div className="timeline-content">
              <span className="timeline-time">{getUiText('mainSess')}</span>
              {plan.mainSession.map((pose, idx) => (
                <div key={idx} className="timeline-activity flex-between pose-activity" onClick={() => handlePracticePose(pose.name)}>
                  <span>{pose.name}</span>
                  <span className="badge-duration">{pose.duration}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="timeline-step">
            <div className="timeline-bullet night-bullet"></div>
            <div className="timeline-content">
              <span className="timeline-time">{getUiText('coolD')}</span>
              {plan.coolDown.map((act, idx) => (
                <div key={idx} className="timeline-activity flex-between">
                  <span>{act.activity}</span>
                  <span className="badge-duration">{act.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {plan.advice && (
          <div className="plan-advice-box">
            <Sparkles size={14} color="#00f2fe" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p>{plan.advice}</p>
          </div>
        )}
      </div>
    );
  };

  const renderRoutineCard = (routine) => {
    return (
      <div className="routine-card-container glass-panel animate-slide-up">
        <h4 className="card-section-title"><Zap size={16} color="#e2b93b" /> {getUiText('wellnessTitle')}</h4>
        <div className="routine-timeline-grid">
          {routine.map((item, idx) => (
            <div key={idx} className="routine-timeline-item">
              <div className="routine-time-badge">
                <Clock size={12} /> {item.time}
              </div>
              <p className="routine-desc">{item.activity}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render localized empty chat state
  const renderEmptyChatState = () => {
    const cfg = getLanguageConfig(language);
    
    if (cfg.language === 'Hindi') {
      return (
        <div className="empty-chat-state animate-fade-in">
          <div className="welcome-header flex-col flex-center">
            <div className="welcome-icon-wrapper">
              <Sparkles size={28} color="#00f2fe" />
            </div>
            <h3 className="welcome-title">👋 AI योग गुरु में आपका स्वागत है</h3>
            <p className="welcome-subtitle text-secondary">आपका व्यक्तिगत कल्याण साथी। वास्तविक समय में सलाह, दिनचर्या और आहार योजनाएं प्राप्त करें।</p>
          </div>
          
          <div className="welcome-suggestions-grid">
            <span className="suggestions-header-text">मुझसे पूछें:</span>
            
            <div className="suggestion-item" onClick={() => handleUserSubmit('योगासनों की सिफारिश करें')}>
              <span className="suggestion-emoji">🧘</span>
              <div className="suggestion-details">
                <span className="suggestion-label">योग सिफारिशें (Yoga)</span>
                <span className="suggestion-subtext">अपने स्तर के लिए सर्वोत्तम योगासन खोजें</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('आहार योजना बनाएं')}>
              <span className="suggestion-emoji">🥗</span>
              <div className="suggestion-details">
                <span className="suggestion-label">आहार योजना (Diet)</span>
                <span className="suggestion-subtext">वजन या तनाव के लिए भोजन योजनाएं प्राप्त करें</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('तनाव से राहत के उपाय दें')}>
              <span className="suggestion-emoji">😌</span>
              <div className="suggestion-details">
                <span className="suggestion-label">तनाव प्रबंधन (Stress)</span>
                <span className="suggestion-subtext">त्वरित श्वास व्यायाम और विश्राम के टिप्स</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('दैनिक योग योजना दिखाएं')}>
              <span className="suggestion-emoji">📅</span>
              <div className="suggestion-details">
                <span className="suggestion-label">दैनिक दिनचर्या (Routines)</span>
                <span className="suggestion-subtext">वार्म-अप, सक्रिय सत्र और शवासन समयरेखा</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('कल्याण सलाह दें')}>
              <span className="suggestion-emoji">❤️</span>
              <div className="suggestion-details">
                <span className="suggestion-label">कल्याण सलाह (Wellness)</span>
                <span className="suggestion-subtext">स्वास्थ्य, बीएमआई और योग प्रगति पर चर्चा करें</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleToggleListen()}>
              <span className="suggestion-emoji">🎤</span>
              <div className="suggestion-details">
                <span className="suggestion-label">योग गुरु से बात करें (Talk with AI Guru)</span>
                <span className="suggestion-subtext">अपनी आवाज का उपयोग करके बातचीत शुरू करें</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>
          </div>
        </div>
      );
    }

    if (cfg.language === 'Marathi') {
      return (
        <div className="empty-chat-state animate-fade-in">
          <div className="welcome-header flex-col flex-center">
            <div className="welcome-icon-wrapper">
              <Sparkles size={28} color="#00f2fe" />
            </div>
            <h3 className="welcome-title">👋 AI योग गुरूमध्ये आपले स्वागत आहे</h3>
            <p className="welcome-subtitle text-secondary">तुमचा वैयक्तिक आरोग्य साथीदार. सराव मार्गदर्शन, आहार तक्ता आणि सल्ले मिळवा.</p>
          </div>
          
          <div className="welcome-suggestions-grid">
            <span className="suggestions-header-text">मला विचारा:</span>
            
            <div className="suggestion-item" onClick={() => handleUserSubmit('योगासनांची शिफारस करा')}>
              <span className="suggestion-emoji">🧘</span>
              <div className="suggestion-details">
                <span className="suggestion-label">योग शिफारसी (Yoga)</span>
                <span className="suggestion-subtext">तुमच्या पातळीनुसार सर्वोत्तम आसने शोधा</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('आहार पत्रक तयार करा')}>
              <span className="suggestion-emoji">🥗</span>
              <div className="suggestion-details">
                <span className="suggestion-label">आहार नियोजन (Diet)</span>
                <span className="suggestion-subtext">वजन किंवा तणाव कमी करण्यासाठी आहार योजना</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('तणावमुक्तीसाठी उपाय सांगा')}>
              <span className="suggestion-emoji">😌</span>
              <div className="suggestion-details">
                <span className="suggestion-label">तणाव व्यवस्थापन (Stress)</span>
                <span className="suggestion-subtext">जलद श्वासोच्छ्वास व्यायाम आणि टिप्स</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('दैनिक योग योजना दाखवा')}>
              <span className="suggestion-emoji">📅</span>
              <div className="suggestion-details">
                <span className="suggestion-label">दैनिक दिनचर्या (Routines)</span>
                <span className="suggestion-subtext">वॉर्म-अप, योग सत्र आणि शवासन टाइमलाइन</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleUserSubmit('आरोग्य सल्ला सांगा')}>
              <span className="suggestion-emoji">❤️</span>
              <div className="suggestion-details">
                <span className="suggestion-label">आरोग्य सल्ला (Wellness)</span>
                <span className="suggestion-subtext">आरोग्य, बीएमआय आणि योग प्रगतीवर चर्चा करा</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>

            <div className="suggestion-item" onClick={() => handleToggleListen()}>
              <span className="suggestion-emoji">🎤</span>
              <div className="suggestion-details">
                <span className="suggestion-label">योग गुरुशी थेट बोला (Talk with AI Guru)</span>
                <span className="suggestion-subtext">तुमचा आवाज वापरून संभाषण सुरू करा</span>
              </div>
              <ChevronRight size={14} className="arrow-icon" />
            </div>
          </div>
        </div>
      );
    }



    return (
      <div className="empty-chat-state animate-fade-in">
        <div className="welcome-header flex-col flex-center">
          <div className="welcome-icon-wrapper">
            <Sparkles size={28} color="#00f2fe" />
          </div>
          <h3 className="welcome-title">👋 Welcome to AI Yoga Guru</h3>
          <p className="welcome-subtitle text-secondary">Your personal wellness companion. Get real-time advice, routines, and meal plans.</p>
        </div>
        
        <div className="welcome-suggestions-grid">
          <span className="suggestions-header-text">Ask me about:</span>
          
          <div className="suggestion-item" onClick={() => handleUserSubmit('Recommend yoga poses for me')}>
            <span className="suggestion-emoji">🧘</span>
            <div className="suggestion-details">
              <span className="suggestion-label">Yoga Recommendations</span>
              <span className="suggestion-subtext">Find the best poses for your level</span>
            </div>
            <ChevronRight size={14} className="arrow-icon" />
          </div>

          <div className="suggestion-item" onClick={() => handleUserSubmit('Create a diet plan')}>
            <span className="suggestion-emoji">🥗</span>
            <div className="suggestion-details">
              <span className="suggestion-label">Diet Planning</span>
              <span className="suggestion-subtext">Get meal plans for weight, strength, or stress</span>
            </div>
            <ChevronRight size={14} className="arrow-icon" />
          </div>

          <div className="suggestion-item" onClick={() => handleUserSubmit('Give me stress relief tips')}>
            <span className="suggestion-emoji">😌</span>
            <div className="suggestion-details">
              <span className="suggestion-label">Stress Management</span>
              <span className="suggestion-subtext">Quick breathing exercises and walks</span>
            </div>
            <ChevronRight size={14} className="arrow-icon" />
          </div>

          <div className="suggestion-item" onClick={() => handleUserSubmit('Show my daily yoga plan')}>
            <span className="suggestion-emoji">📅</span>
            <div className="suggestion-details">
              <span className="suggestion-label">Daily Routines</span>
              <span className="suggestion-subtext">Full warm-up, session, and cool-down timeline</span>
            </div>
            <ChevronRight size={14} className="arrow-icon" />
          </div>

          <div className="suggestion-item" onClick={() => handleUserSubmit('Give me wellness advice')}>
            <span className="suggestion-emoji">❤️</span>
            <div className="suggestion-details">
              <span className="suggestion-label">Wellness Advice</span>
              <span className="suggestion-subtext">Chat about health, BMI, and yoga progress</span>
            </div>
            <ChevronRight size={14} className="arrow-icon" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout activeTab="guru">
      <div className="guru-page-container animate-fade-in">

        {/* Left Side: Voice Assistant & Health Metrics */}
        <div className="guru-visualizer-section glass-panel flex-col">
          <div className="guru-header w-100">
            <div className="guru-title-block">
              <h2 className="text-gradient guru-title">Virtual Yoga Guru</h2>
              <span className="text-secondary text-sm guru-subtitle">Personal Wellness Coach.</span>
            </div>
            
            <div className="guru-controls-row w-100">
              <span className="control-label text-secondary">Voice Config</span>
              <div className="flex-center" style={{ gap: '10px' }}>
                <select
                  className="vs-input language-selector"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en-IN">English</option>
                  <option value="hi-IN">Hindi (हिंदी)</option>
                  <option value="mr-IN">Marathi (मराठी)</option>
                </select>
                <button
                  className="icon-btn-soft"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Mute Guru Voice' : 'Unmute Guru Voice'}
                >
                  {soundEnabled ? <Volume2 size={18} color="#00f2fe" /> : <VolumeX size={18} color="#ff4b4b" />}
                </button>
                <button 
                  className="icon-btn-soft" 
                  onClick={() => setShowSettings(!showSettings)}
                  title="API Settings"
                >
                  <Key size={18} color={geminiKey ? "#00f2fe" : "#ff4b4b"} />
                </button>
              </div>
            </div>
          </div>

          <div className="guru-avatar-container flex-center">
            <div className={`guru-orb ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
              <div className="orb-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
              <img src={yogaGuruImg} alt="AI Yoga Guru" className="guru-image" />
            </div>
          </div>

          <div className="guru-status-text">
            {renderStatusText()}
          </div>

          {/* Health Stats Overview Dashboard */}
          <div className="health-stats-panel w-100">
            <div className="stat-row">
              <div className="stat-item flex-col">
                <span className="stat-label"><Flame size={12} color="#ff4b4b" /> Streak</span>
                <span className="stat-val">{currentUser?.streak || 0} Days</span>
              </div>
              <div className="stat-item flex-col">
                <span className="stat-label"><Heart size={12} color="#e63946" /> Heart Rate</span>
                <span className="stat-val">{healthMetrics.heartRate} BPM</span>
              </div>
            </div>
            <div className="stat-row" style={{ marginTop: '10px' }}>
              <div className="stat-item flex-col">
                <span className="stat-label"><Activity size={12} color="#00f2fe" /> Stress Level</span>
                <span className="stat-val" style={{ 
                  color: healthMetrics.stressLevel === 'High' ? '#ff4b4b' : healthMetrics.stressLevel === 'Medium' ? '#f2994a' : '#2ecc71'
                }}>{healthMetrics.stressLevel}</span>
              </div>
              <div className="stat-item flex-col">
                <span className="stat-label"><Smile size={12} color="#e2b93b" /> Energy Score</span>
                <span className="stat-val">{healthMetrics.energyScore}/100</span>
              </div>
            </div>
          </div>

          <button
            className={`mic-trigger-btn ${isSessionActive ? 'active' : ''}`}
            onClick={handleToggleListen}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} /> Stop Session
              </>
            ) : (
              <>
                <Mic size={20} /> Start Voice Session
              </>
            )}
          </button>
        </div>

        {/* Right Side: Chat & Interactive Transcript */}
        <div className="guru-chat-section flex-col">

          <div className="chat-transcript glass-panel">
            {messages.length === 0 ? (
              renderEmptyChatState()
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}>
                  {msg.sender === 'ai' && (
                    <div className="ai-avatar-mini">
                      <img src={yogaGuruImg} alt="AI" />
                    </div>
                  )}
                  <div className={`chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                    <div className="message-text">{formatText(msg.text)}</div>
                    
                    {/* Render visual cards inside the chat transcript dynamically */}
                    {msg.sender === 'ai' && msg.type === 'poses' && msg.data && renderPosesCard(msg.data)}
                    {msg.sender === 'ai' && msg.type === 'diet' && msg.data && renderDietCard(msg.data)}
                    {msg.sender === 'ai' && msg.type === 'dailyPlan' && msg.data && renderDailyPlanCard(msg.data)}
                    {msg.sender === 'ai' && msg.type === 'routine' && msg.data && renderRoutineCard(msg.data)}

                    {msg.isAudio && soundEnabled && msg.sender === 'ai' && (
                      <div className="audio-playing-indicator">
                        <span className="bar"></span><span className="bar"></span><span className="bar"></span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isThinking && (
              <div className="chat-bubble-wrapper ai-wrapper">
                <div className="ai-avatar-mini">
                  <img src={yogaGuruImg} alt="AI" />
                </div>
                <div className="chat-bubble ai-bubble typing-bubble">
                  <div className="typing-indicator">
                    <span className="bouncing-dot"></span>
                    <span className="bouncing-dot"></span>
                    <span className="bouncing-dot"></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          <div className="suggestions-container">
            {getSuggestedQueries().map((q, i) => (
              <button
                key={i}
                className="suggestion-chip glass-panel"
                onClick={() => handleUserSubmit(q.query)}
              >
                <span className="chip-icon">{q.icon}</span> {q.text}
              </button>
            ))}
          </div>

          <div className="text-input-area glass-panel flex-center">
            <input
              type="text"
              placeholder={language === 'hi-IN' ? 'योग, आहार या दिनचर्या के बारे में कुछ भी पूछें...' : language === 'mr-IN' ? 'योग, आहार किंवा सवयींबद्दल काहीही विचारा...' : 'Ask your coach anything about yoga, diet, or routines...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUserSubmit(inputText)}
            />
            <button
              className="send-text-btn flex-center"
              onClick={() => handleUserSubmit(inputText)}
              disabled={!inputText.trim() || isThinking}
            >
              <Send size={18} />
            </button>
          </div>

        </div>

        {/* Settings Modal overlay */}
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
              <h3 style={{ color: '#00f2fe', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} /> Guru API Integration</h3>
              <p style={{ fontSize: '0.88rem', color: '#ccc', lineHeight: '1.4' }}>Paste your Google Gemini API Key here to enable personalized, live intelligent responses. If left empty or invalid, the assistant will automatically fall back to free online models and local rule engines.</p>
              <input 
                type="password" 
                placeholder="AIzaSy..." 
                defaultValue={geminiKey}
                id="gemini-key-input"
                className="vs-input"
                style={{ width: '100%', marginBottom: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', color: '#fff' }}
              />
              <div className="flex-between">
                <button className="btn btn-outline" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#ccc', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }} onClick={() => setShowSettings(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '8px', padding: '8px 20px', cursor: 'pointer' }} onClick={() => saveApiKey(document.getElementById('gemini-key-input').value)}>Save Key</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
