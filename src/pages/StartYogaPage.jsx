import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Camera, Battery, Heart, Activity, CheckCircle, AlertTriangle, Volume2, RotateCcw, Play, Square, Bluetooth, BluetoothConnected, Loader } from 'lucide-react';
import './StartYogaPage.css';
import { useSmartMatBLE } from '../hooks/useSmartMatBLE';
import { useHealthEngine } from '../hooks/useHealthEngine';
import { yogaPoses } from '../data/yogaPoses';
import { poseBlueprints } from '../data/poseBlueprints';
import { dbService } from '../services/dbService';

import { yogaImages } from '../data/yogaImages';

export default function StartYogaPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load Pose from state, localStorage, or default to Warrior II (id: 6)
  const [selectedPoseId, setSelectedPoseId] = useState(() => {
    const statePoseId = location.state?.poseId;
    if (statePoseId) return Number(statePoseId);
    const localPoseId = localStorage.getItem('selected_pose_id');
    return localPoseId ? Number(localPoseId) : 6;
  });

  const currentPose = yogaPoses.find(p => p.id === selectedPoseId) || yogaPoses.find(p => p.id === 6);
  const selectedPose = currentPose?.name;

  // Fallback blueprint generator for future/unsupported poses
  const getPoseBlueprint = (pose) => {
    if (!pose) return null;
    const bp = poseBlueprints[pose.id];
    if (bp) return bp;

    // Create dynamic fallback blueprint
    return {
      poseName: pose.name,
      holdDuration: pose.holdTime || 30,
      steps: pose.steps.map((text, idx) => ({
        id: idx + 1,
        text: text,
        instruction: text,
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          // Verify basic presence
          const essential = [11, 12, 23, 24]; // shoulders and hips
          const visible = essential.every(idx => landmarks[idx] && landmarks[idx].visibility > 0.5);
          if (!visible) {
            score = 30;
            corrections.push("Ensure your full body is visible in the camera frame.");
            incorrectJoints.push(11, 12, 23, 24, 27, 28);
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
            incorrectJoints
          };
        }
      }))
    };
  };

  const blueprint = getPoseBlueprint(currentPose);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraInstanceRef = useRef(null);
  const poseInstanceRef = useRef(null);

  // Session state machine: 'inactive' | 'verifying' | 'coaching' | 'holding' | 'completed'
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPhase, setSessionPhase] = useState('inactive');
  const [currentStep, setCurrentStep] = useState(0);
  const [holdTimer, setHoldTimer] = useState(null);
  const [stepHoldTime, setStepHoldTime] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Connection Simulation & Warning
  const [isMockConnected, setIsMockConnected] = useState(false);
  const [showConnectionWarning, setShowConnectionWarning] = useState(false);

  // Score & feedback states
  const [stepScore, setStepScore] = useState(100);
  const [activeCorrections, setActiveCorrections] = useState([]);
  const [activeIncorrectJoints, setActiveIncorrectJoints] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");
  
  // Checklist readiness state
  const [verificationStatus, setVerificationStatus] = useState({
    cameraActive: false,
    bodyVisible: false,
    matConnected: false,
    fsrActive: false
  });
  const [verificationTime, setVerificationTime] = useState(0);

  const [cameraError, setCameraError] = useState("");
  const [modelLoading, setModelLoading] = useState(false);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);

  // Real Hardware BLE Connection
  const { connect, disconnect, isConnected, isConnecting, sensorData, error: bleError, sendCommand } = useSmartMatBLE();
  const { hr: heartRate, bat: battery, fsr: fsrData, emergency } = sensorData;

  const [currentUser] = useState(() => dbService.getCurrentUser());
  const [emergencyActive, setEmergencyActive] = useState(false);
  const sirenIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);

  const startSiren = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      oscRef.current = osc;

      let goingUp = true;
      sirenIntervalRef.current = setInterval(() => {
        if (!oscRef.current || !audioCtxRef.current) return;
        const currFreq = osc.frequency.value;
        if (goingUp) {
          osc.frequency.setValueAtTime(currFreq + 20, ctx.currentTime);
          if (osc.frequency.value >= 800) goingUp = false;
        } else {
          osc.frequency.setValueAtTime(currFreq - 20, ctx.currentTime);
          if (osc.frequency.value <= 350) goingUp = true;
        }
      }, 25);
    } catch (e) {
      console.error("Audio Context failed", e);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch (e) {}
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const triggerEmergencyAlerts = () => {
    startSiren();
    const relativeName = currentUser?.emergencyContactName || "Relative Support";
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `Emergency button pressed. Alerting your emergency contact, ${relativeName}, via S.M.S. and email.`
      );
      window.speechSynthesis.speak(utterance);
    }
  };

  const resolveEmergency = () => {
    setEmergencyActive(false);
    stopSiren();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Emergency resolved. Resetting yoga mat alarm.");
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (isConnected && emergency === 1) {
      if (!emergencyActive) {
        setEmergencyActive(true);
        triggerEmergencyAlerts();
      }
    }
  }, [emergency, isConnected, emergencyActive]);

  useEffect(() => {
    return () => {
      stopSiren();
    };
  }, []);

  // Simulation settings
  const [simulatedAlignment, setSimulatedAlignment] = useState(true);
  const [simulatedSensorData, setSimulatedSensorData] = useState({
    hr: 75,
    bat: 95,
    fsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 }
  });

  // Health Monitoring Hook (Heart Rate states, validation, safety alerts, SpO2/temp placeholders)
  const {
    currentBpm,
    hrStatus,
    hrHistory,
    sessionAvgBpm,
    sessionMaxBpm,
    sessionMinBpm,
    safetyAlert,
    spo2,
    temperature,
    respRate,
    stressIndex
  } = useHealthEngine(isConnected ? heartRate : simulatedSensorData.hr, sessionActive);

  const displayBattery = isConnected ? battery : simulatedSensorData.bat;

  // Safe FSR reader - guarantees reading all 6 sensors
  const getSafeFsrData = () => {
    const rawFsr = isConnected ? fsrData : simulatedSensorData.fsr;
    return {
      lh: rawFsr?.lh ?? 0,
      rh: rawFsr?.rh ?? 0,
      lk: rawFsr?.lk ?? 0,
      rk: rawFsr?.rk ?? 0,
      lf: rawFsr?.lf ?? 0,
      rf: rawFsr?.rf ?? 0
    };
  };
  const displayFsrData = getSafeFsrData();

  // Refs for tracking async updates and callbacks without closure locks
  const latestLandmarks = useRef(null);
  const voiceCooldownRef = useRef({});
  const lastSpokenRef = useRef({ phase: '', step: -1, correction: '', hrStatus: '', safetyAlert: '' });
  const lastSpeakTimeRef = useRef(0);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      lastSpeakTimeRef.current = Date.now();
    }
  };

  const speakFeedback = (text, cooldownMs = 6000) => {
    const now = Date.now();
    const lastSpoken = voiceCooldownRef.current[text] || 0;
    if (now - lastSpoken > cooldownMs) {
      speak(text);
      voiceCooldownRef.current[text] = now;
    }
  };



  // 1. MediaPipe CDN Script Loader and Setup
  useEffect(() => {
    if (!sessionActive) {
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
        cameraInstanceRef.current = null;
      }
      if (poseInstanceRef.current) {
        poseInstanceRef.current.close();
        poseInstanceRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setMediaPipeLoaded(false);
      setModelLoading(false);
      setVerificationStatus({ cameraActive: false, bodyVisible: false, matConnected: false, fsrActive: false });
      return;
    }

    setCameraError("");
    setModelLoading(true);
    let isMounted = true;

    const initializeMediaPipe = async () => {
      try {
        if (!window.Camera || !window.Pose) {
          const loadScript = (src) => {
            return new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = src;
              script.async = true;
              script.onload = () => resolve();
              script.onerror = (e) => reject(e);
              document.head.appendChild(script);
            });
          };

          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");
        }

        if (!isMounted) return;

        setMediaPipeLoaded(true);
        setModelLoading(false);

        const pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onPoseResults);
        poseInstanceRef.current = pose;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && poseInstanceRef.current) {
                try {
                  await poseInstanceRef.current.send({ image: videoRef.current });
                } catch (e) {
                  console.warn("MediaPipe Pose send error:", e);
                }
              }
            },
            width: 640,
            height: 480
          });

          camera.start();
          cameraInstanceRef.current = camera;
        } else {
          setCameraError("Camera API is not supported in this browser.");
        }
      } catch (err) {
        console.error("Error setting up MediaPipe Pose:", err);
        if (isMounted) {
          setCameraError(`Camera/Model Error: ${err.message || err}.`);
          setModelLoading(false);
        }
      }
    };

    initializeMediaPipe();

    return () => {
      isMounted = false;
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
        cameraInstanceRef.current = null;
      }
      if (poseInstanceRef.current) {
        poseInstanceRef.current.close();
        poseInstanceRef.current = null;
      }
    };
  }, [sessionActive]);

  // Skeleton Painter
  const drawSkeleton = (landmarks, currentIncorrectJoints = []) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    const width = canvas.width;
    const height = canvas.height;

    const getCoords = (lm) => ({
      x: lm.x * width,
      y: lm.y * height
    });

    const connections = [
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // torso
      [23, 24], // hips
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28]  // right leg
    ];

    const wrongJoints = new Set(currentIncorrectJoints);

    ctx.lineWidth = 4;
    connections.forEach(([p1, p2]) => {
      const pt1 = getCoords(landmarks[p1]);
      const pt2 = getCoords(landmarks[p2]);
      if (landmarks[p1].visibility > 0.5 && landmarks[p2].visibility > 0.5) {
        const wrong = wrongJoints.has(p1) || wrongJoints.has(p2);
        ctx.strokeStyle = wrong ? "#ff0000" : "#00ff00";
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      }
    });

    connections.flat().forEach(idx => {
      const pt = getCoords(landmarks[idx]);
      if (landmarks[idx].visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = wrongJoints.has(idx) ? "#ff0000" : "#00ff00";
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  };

  // 30fps Evaluation Callback
  const onPoseResults = (results) => {
    if (!results || !results.poseLandmarks) {
      setVerificationStatus(prev => ({ ...prev, cameraActive: false, bodyVisible: false }));
      return;
    }

    setVerificationStatus(prev => ({ ...prev, cameraActive: true }));

    const landmarks = results.poseLandmarks;
    latestLandmarks.current = landmarks;

    // Check if body is fully visible (shoulders, hips, ankles are key)
    const essential = [11, 12, 23, 24, 27, 28];
    const visible = essential.every(idx => landmarks[idx] && landmarks[idx].visibility > 0.5);
    setVerificationStatus(prev => ({ ...prev, bodyVisible: visible }));

    // Get the latest values from ref to avoid stale closures
    const state = latestState.current;
    const sessionPhaseVal = state.sessionPhase;
    const currentStepVal = state.currentStep;
    const blueprintVal = state.blueprint;
    const displayFsrDataVal = state.displayFsrData;
    const stepHoldTimeVal = state.stepHoldTime;

    let validationResult = { score: 100, corrections: [], incorrectJoints: [] };

    // Live calculations if session is actively coaching or holding
    if (sessionPhaseVal === 'coaching' && blueprintVal?.steps[currentStepVal]) {
      const stepData = blueprintVal.steps[currentStepVal];
      validationResult = stepData.validate(landmarks, displayFsrDataVal);
    } else if (sessionPhaseVal === 'holding') {
      const finalStep = blueprintVal.steps[blueprintVal.steps.length - 1];
      validationResult = finalStep.validate(landmarks, displayFsrDataVal);
    }

    const poseIsCorrect = validationResult.score >= 85 &&
                          (validationResult.corrections || []).length === 0 &&
                          (validationResult.incorrectJoints || []).length === 0;

    // Requirement 6: Debugging Logs
    console.log("Score:", validationResult.score);
    console.log("Corrections:", validationResult.corrections || []);
    console.log("Incorrect joints:", validationResult.incorrectJoints || []);
    console.log("Pose Correct:", poseIsCorrect);

    setStepScore(validationResult.score);
    setActiveCorrections(validationResult.corrections || []);
    setActiveIncorrectJoints(validationResult.incorrectJoints || []);

    // Requirement 3: Show Corrections Continuously
    if (sessionPhaseVal === 'coaching' || sessionPhaseVal === 'holding') {
      if (validationResult.corrections && validationResult.corrections.length > 0) {
        setFeedbackText(validationResult.corrections.join(" "));
      } else {
        const remaining = 3 - stepHoldTimeVal;
        if (remaining > 0 && remaining < 3) {
          setFeedbackText(`Good posture. Hold for ${remaining} seconds.`);
        } else {
          setFeedbackText("Good posture. Hold for 3 seconds.");
        }
      }
    }

    drawSkeleton(landmarks, validationResult.incorrectJoints || []);
  };

  // Live checks updates - mat stays connected until explicitly disconnected
  useEffect(() => {
    setVerificationStatus(prev => ({
      ...prev,
      matConnected: isConnected || isMockConnected || simulatedAlignment,
      fsrActive: isConnected || isMockConnected || simulatedAlignment
    }));
  }, [isConnected, isMockConnected, simulatedAlignment]);

  // Keep latest state synced for interval access to avoid closure stale traps
  const latestState = useRef({});
  const scoresListRef = useRef([]);
  useEffect(() => {
    latestState.current = {
      sessionPhase,
      currentStep,
      stepScore,
      holdTimer,
      stepHoldTime,
      verificationStatus,
      verificationTime,
      isConnected,
      isMockConnected,
      simulatedAlignment,
      blueprint,
      activeCorrections,
      activeIncorrectJoints,
      currentBpm,
      hrStatus,
      hrHistory,
      safetyAlert,
      sessionDuration,
      displayFsrData
    };
  });

  // Synchronize Voice Coach with UI State transitions, corrections, and safety alerts in real time
  useEffect(() => {
    if (!sessionActive) {
      lastSpokenRef.current = { phase: '', step: -1, correction: '', hrStatus: '', safetyAlert: '' };
      return;
    }

    const lastSpoken = lastSpokenRef.current;
    
    // 1. High Priority Safety Alert
    if (safetyAlert && safetyAlert !== lastSpoken.safetyAlert) {
      lastSpokenRef.current.safetyAlert = safetyAlert;
      speak(safetyAlert);
      return;
    } else if (!safetyAlert) {
      lastSpokenRef.current.safetyAlert = '';
    }

    // 2. Heart Rate Status change notifications
    if (hrStatus !== lastSpoken.hrStatus) {
      lastSpokenRef.current.hrStatus = hrStatus;
      if (hrStatus === 'Elevated' || hrStatus === 'High') {
        speak("Heart rate is elevated. Focus on slow breathing.");
      } else if (hrStatus === 'Very High') {
        speak("Heart rate is very high. Take a short recovery break.");
      } else if (lastSpoken.hrStatus && (hrStatus === 'Normal' || hrStatus === 'Low')) {
        speak("Excellent recovery. Continue holding the pose.");
      }
      return;
    }

    // Safety Alert overrides normal coaching voice prompts
    if (safetyAlert) return;

    // 3. Phase change synchronization
    if (sessionPhase !== lastSpoken.phase) {
      lastSpokenRef.current.phase = sessionPhase;
      if (sessionPhase === 'verifying') {
        speak("Initializing session. Please stand on the mat and face the camera.");
      } else if (sessionPhase === 'holding') {
        speak("Pose achieved! Hold this position.");
      } else if (sessionPhase === 'completed') {
        speak("Excellent session! Pose complete. You can slowly return to a standing position.");
      }
      return;
    }

    // 4. Step change synchronization (only in coaching phase)
    if (sessionPhase === 'coaching' && currentStep !== lastSpoken.step) {
      lastSpokenRef.current.step = currentStep;
      const stepInst = blueprint?.steps[currentStep]?.instruction;
      if (stepInst) {
        speak(`Step ${currentStep + 1}. ${stepInst}`);
      }
      return;
    }

    // 5. Correction synchronization (only in coaching/holding when alignment fails)
    const isCorrect = stepScore >= 85 && activeCorrections.length === 0 && activeIncorrectJoints.length === 0;
    if ((sessionPhase === 'coaching' || sessionPhase === 'holding') && !isCorrect && activeCorrections && activeCorrections.length > 0) {
      const topCorrection = activeCorrections[0];
      if (topCorrection !== lastSpoken.correction) {
        speakFeedback(topCorrection);
        lastSpokenRef.current.correction = topCorrection;
      }
    } else {
      lastSpokenRef.current.correction = '';
    }
  }, [sessionPhase, currentStep, activeCorrections, activeIncorrectJoints, sessionActive, blueprint, stepScore, safetyAlert, hrStatus]);

  // Main Logic Loop (1-second intervals) - dependent ONLY on active state and communication hooks
  useEffect(() => {
    if (!sessionActive) return;

    const interval = setInterval(() => {
      const state = latestState.current;

      // 1. Simulate FSR and BPM data if not physically connected
      if (!state.isConnected) {
        // Simulation Heart Rate values depending on pose intensity
        let targetBpmMin = 70;
        let targetBpmMax = 80;
        if (state.sessionPhase === 'coaching') {
          targetBpmMin = 80;
          targetBpmMax = 110;
        } else if (state.sessionPhase === 'holding') {
          targetBpmMin = 110;
          targetBpmMax = 130;
        }

        const mockedHr = targetBpmMin + Math.floor(Math.random() * (targetBpmMax - targetBpmMin + 1));

        const expected = state.blueprint?.steps[state.currentStep]?.expectedPressureDistribution || { lf: 50, rf: 50 };
        let mockedFsr = {};

        if (state.simulatedAlignment) {
          // Simulate perfect distribution + small noise
          Object.keys(expected).forEach(k => {
            mockedFsr[k] = expected[k] > 0 ? expected[k] - 2 + Math.floor(Math.random() * 5) : 0;
          });
        } else {
          // Simulate incorrect distribution
          Object.keys(expected).forEach(k => {
            mockedFsr[k] = expected[k] > 0 ? Math.max(0, Math.round(expected[k] * 0.2)) : 0;
          });
          // Shift major weight incorrectly
          if (expected.lf > expected.rf) mockedFsr.rf = 75;
          else if (expected.rf > expected.lf) mockedFsr.lf = 75;
          else mockedFsr.lh = 45;
        }

        setSimulatedSensorData({
          hr: mockedHr,
          bat: 98,
          fsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0, ...mockedFsr }
        });
      }

      // Determine if posture is correct based on phase
      let poseIsCorrect = false;
      if (state.sessionPhase === 'coaching') {
        poseIsCorrect = state.stepScore >= 85 && state.activeCorrections.length === 0 && state.activeIncorrectJoints.length === 0;
      } else if (state.sessionPhase === 'holding') {
        poseIsCorrect = state.stepScore >= 70 && state.activeCorrections.length === 0 && state.activeIncorrectJoints.length === 0;
      } else if (state.sessionPhase === 'verifying') {
        poseIsCorrect = state.verificationStatus.cameraActive && state.verificationStatus.bodyVisible && state.verificationStatus.matConnected && state.verificationStatus.fsrActive;
      }

      if (!state.isConnected && state.simulatedAlignment) {
        poseIsCorrect = true;
      }

      // Send correct status to Mat LED/Buzzer (if connected)
      if (sendCommand) {
        sendCommand({ 
          correct: poseIsCorrect,
          pose: state.blueprint?.poseName || "Standby",
          phase: state.sessionPhase
        });
      }

      // Voice feedback loop for incorrect posture
      if (poseIsCorrect) {
        lastSpeakTimeRef.current = 0;
      } else {
        if ((state.sessionPhase === 'coaching' || state.sessionPhase === 'holding') && state.activeCorrections && state.activeCorrections.length > 0) {
          const now = Date.now();
          if (now - lastSpeakTimeRef.current >= 6000) {
            speak(state.activeCorrections[0]);
            lastSpeakTimeRef.current = now;
          }
        }
      }

      // Track session elapsed time
      if (state.sessionPhase === 'coaching' || state.sessionPhase === 'holding') {
        setSessionDuration(prev => prev + 1);
        if (document.visibilityState === 'visible') {
          dbService.incrementActiveTime(1);
        }
        scoresListRef.current.push(state.stepScore || 100);
      }

      // 2. State Machine Routing
      if (state.sessionPhase === 'verifying') {
        const ready = state.verificationStatus.cameraActive && state.verificationStatus.bodyVisible && state.verificationStatus.matConnected && state.verificationStatus.fsrActive;
        if (ready) {
          setVerificationTime(prev => {
            const nextTime = prev + 1;
            if (nextTime >= 2) {
              setSessionPhase('coaching');
              setCurrentStep(0);
              const welcome = `All systems active. Let's begin ${state.blueprint?.poseName || 'your pose'}.`;
              setFeedbackText(welcome);
              return 0;
            }
            return nextTime;
          });
        } else {
          setVerificationTime(0);
        }
      } 
      
      else if (state.sessionPhase === 'coaching') {
        const stepData = state.blueprint?.steps[state.currentStep];
        if (!stepData) return;

        if (poseIsCorrect) {
          setStepHoldTime(prev => {
            const nextTime = prev + 1;
            if (nextTime >= 3) {
              // Advance step
              if (state.currentStep < state.blueprint.steps.length - 1) {
                const nextStep = state.currentStep + 1;
                setCurrentStep(nextStep);
                setFeedbackText(state.blueprint.steps[nextStep].instruction);
              } else {
                // Achieve Pose -> Hold Mode
                setSessionPhase('holding');
                setHoldTimer(state.blueprint.holdDuration);
                setFeedbackText("Pose Achieved! Begin holding the position.");
              }
              return 0;
            } else {
              setFeedbackText(`Good posture. Hold for ${3 - nextTime} seconds.`);
              return nextTime;
            }
          });
        } else {
          setStepHoldTime(0);
          if (state.safetyAlert) {
            setFeedbackText(state.safetyAlert);
          } else if (state.activeCorrections.length > 0) {
            setFeedbackText(state.activeCorrections.join(" "));
          } else {
            setFeedbackText("Aligning stance...");
          }
        }
      } 
      
      else if (state.sessionPhase === 'holding') {
        let isHoldingCorrect = state.stepScore >= 70 && state.activeCorrections.length === 0 && state.activeIncorrectJoints.length === 0;
        if (!state.isConnected && state.simulatedAlignment) {
          isHoldingCorrect = true;
        }

        if (isHoldingCorrect) {
          setHoldTimer(prev => {
            if (prev > 1) {
              // Monitor heart rate trend during Hold Mode
              const history = latestState.current.hrHistory;
              let risingRapidly = false;
              if (history.length > 5) {
                const currentVal = latestState.current.currentBpm || 0;
                const pastBpm = history[history.length - 6]?.bpm || history[0].bpm;
                if (currentVal - pastBpm >= 8) {
                  risingRapidly = true;
                }
              }

              // Display and voice prompt overrides
              if (!latestState.current.safetyAlert) {
                if (risingRapidly) {
                  setFeedbackText("Hold this pose. Maintain steady breathing.");
                  speakFeedback("Maintain steady breathing.", 8000);
                } else {
                  setFeedbackText(`Holding perfectly. ${prev - 1} seconds remaining.`);
                  speakFeedback("Excellent control. Hold the pose.", 12000);
                }
              } else {
                setFeedbackText(latestState.current.safetyAlert);
              }
              return prev - 1;
            } else {
              setSessionPhase('completed');
              setFeedbackText("Excellent session! Pose complete.");
              setSessionActive(false);
              
              // Save completed session to local/cloud DB
              const avgBpm = latestState.current.currentBpm || 80;
              const duration = latestState.current.sessionDuration || 30;
              const totalScore = scoresListRef.current.reduce((sum, s) => sum + s, 0);
              const avgAccuracy = scoresListRef.current.length > 0 ? Math.round(totalScore / scoresListRef.current.length) : 85;
              dbService.completeSession(duration, avgBpm, selectedPoseId, avgAccuracy);
              
              return 0;
            }
          });
        } else {
          setStepHoldTime(0);
          if (state.safetyAlert) {
            setFeedbackText(state.safetyAlert);
          } else {
            setFeedbackText(`Posture lost. Timer paused. ${state.activeCorrections.join(" ")}`);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive, sendCommand]);

  // Session Control Toggle
  const toggleSession = () => {
    if (!sessionActive) {
      if (!isConnected && !isMockConnected) {
        setShowConnectionWarning(true);
        return;
      }
      scoresListRef.current = [];
      setSessionActive(true);
      setSessionPhase('verifying');
      setCurrentStep(0);
      setHoldTimer(null);
      setStepHoldTime(0);
      setVerificationTime(0);
      setSessionDuration(0);
      setStepScore(100);
      setActiveCorrections([]);
      setFeedbackText("Initializing tracking... Stand on the mat in front of the camera.");
    } else {
      setSessionActive(false);
      // Wait to keep completed phase if completing organically
      if (sessionPhase !== 'completed') {
        setSessionPhase('inactive');
      }
      setFeedbackText("");
      setHoldTimer(null);
      setStepHoldTime(0);
    }
  };

  return (
    <DashboardLayout activeTab="start">
      {emergencyActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          background: 'rgba(100, 10, 10, 0.88)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff'
        }}>
          <div className="glass-panel" style={{
            padding: '40px',
            borderRadius: '24px',
            background: 'rgba(20, 10, 10, 0.95)',
            border: '2px solid #ff4b4b',
            boxShadow: '0 0 35px rgba(255, 75, 75, 0.4)',
            maxWidth: '520px',
            width: '90%',
            textAlign: 'center'
          }}>
            <AlertTriangle size={72} color="#ff3333" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#ff4b4b', fontSize: '2.1rem', margin: '0 0 12px 0', fontWeight: '800', letterSpacing: '1px' }}>EMERGENCY ACTIVE</h2>
            <p style={{ fontSize: '1.05rem', color: '#bbb', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              The emergency button on your mat was pressed. We are notifying your registered emergency contact:
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '18px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ marginBottom: '8px', fontSize: '0.95rem' }}><strong style={{ color: '#888' }}>Contact Name:</strong> <span style={{ color: '#fff', fontWeight: '600' }}>{currentUser?.emergencyContactName || "Relative Support"}</span></div>
              <div style={{ marginBottom: '8px', fontSize: '0.95rem' }}><strong style={{ color: '#888' }}>SMS Alert Phone:</strong> <span style={{ color: '#fff', fontWeight: '600' }}>{currentUser?.emergencyContactPhone || "+91 9876543211"}</span></div>
              <div style={{ fontSize: '0.95rem' }}><strong style={{ color: '#888' }}>Email Alert Address:</strong> <span style={{ color: '#fff', fontWeight: '600' }}>{currentUser?.emergencyContactEmail || "relative@example.com"}</span></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#2ecc71' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 8px #2ecc71' }}></span>
                SMS message sent to emergency contact.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#2ecc71' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 8px #2ecc71' }}></span>
                Email alert dispatched to emergency contact inbox.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#ff4b4b' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ff4b4b', boxShadow: '0 0 8px #ff4b4b' }}></span>
                Physical mat buzzer sound triggering locally.
              </div>
            </div>

            <button className="btn btn-primary" onClick={resolveEmergency} style={{
              background: 'linear-gradient(135deg, #ff4b4b, #e74c3c)',
              color: '#fff',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '10px',
              fontSize: '1.05rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255, 75, 75, 0.3)',
              width: '100%'
            }}>
              Dismiss & Reset Alarm
            </button>
          </div>
        </div>
      )}
      {showConnectionWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          background: 'rgba(11, 15, 25, 0.9)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff'
        }}>
          <div className="glass-panel" style={{
            padding: '40px',
            borderRadius: '24px',
            background: 'rgba(15, 20, 35, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            maxWidth: '480px',
            width: '90%',
            textAlign: 'center'
          }}>
            <Bluetooth size={64} color="var(--accent-cyan)" style={{ marginBottom: '20px' }} />
            <h2 style={{ fontSize: '1.8rem', margin: '0 0 12px 0', fontWeight: '700' }}>Smart Mat Disconnected</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              Your NextGen Smart Yoga Mat is not connected. To track your yoga practice, FSR pressures, and heart rate, please connect your mat or enable the Mock Mat simulator.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-primary" onClick={async () => {
                setShowConnectionWarning(false);
                await connect();
              }} style={{ width: '100%', padding: '14px', borderRadius: '10px', fontWeight: '700' }}>
                Connect Smart Mat via BLE
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setIsMockConnected(true);
                setShowConnectionWarning(false);
              }} style={{ width: '100%', padding: '14px', borderRadius: '10px', fontWeight: '700' }}>
                Enable Mock Mat (Simulation)
              </button>
              <button className="btn btn-secondary" onClick={() => setShowConnectionWarning(false)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="start-yoga-page animate-fade-in">
        
        {/* Left Section - Main View, ChecklistHUD, & Session Report */}
        <div className="main-camera-section">
          <div className="camera-container" style={{ position: 'relative' }}>
            
            {/* Session Analytics Report Completion Screen */}
            {!sessionActive && sessionPhase === 'completed' ? (
              <div className="session-report-card glass-panel animate-fade-in" style={{ padding: '32px', textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(12, 12, 22, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <CheckCircle size={64} color="#2ecc71" style={{ filter: 'drop-shadow(0 0 10px #2ecc71)', marginBottom: '16px' }} />
                <h2 style={{ color: '#00f2fe', fontSize: '2rem', margin: 0 }}>Yoga Pose Achieved!</h2>
                <p style={{ color: '#aaa', margin: '8px 0 32px 0' }}>Namaste. Excellent control and session alignment!</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '500px', marginBottom: '24px' }}>
                  <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#bb86fc', marginBottom: '4px' }}>Average HR</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff' }}>{sessionAvgBpm || 0} <span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>BPM</span></div>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#ff4b4b', marginBottom: '4px' }}>Peak HR</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff' }}>{sessionMaxBpm || 0} <span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>BPM</span></div>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#00f2fe', marginBottom: '4px' }}>Duration</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff' }}>{Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%', maxWidth: '500px', marginBottom: '36px', textAlign: 'left' }}>
                  <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ color: '#9b51e0', fontWeight: '600', fontSize: '0.85rem' }}>HR Variability (SDNN)</div>
                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '4px' }}>58 ms <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'normal' }}>Stable</span></div>
                  </div>
                  <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ color: '#2ecc71', fontWeight: '600', fontSize: '0.85rem' }}>Recovery Rate (HRR)</div>
                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '4px' }}>24 bpm <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'normal' }}>Excellent</span></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button className="btn btn-primary" onClick={() => { setSessionPhase('inactive'); setSessionDuration(0); }} style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)', padding: '12px 30px' }}>
                    Practice Again
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate('/yogabook')} style={{ padding: '12px 30px' }}>
                    Back to Yoga Book
                  </button>
                </div>
              </div>
            ) : sessionActive ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 5 }} />
                
                {modelLoading && (
                  <div className="camera-error-overlay" style={{ borderColor: 'rgba(187, 134, 252, 0.3)' }}>
                    <Loader size={48} className="spin-icon" color="#bb86fc" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <h3>Loading AI Pose Model</h3>
                    <p>Setting up real-time pose tracking...</p>
                  </div>
                )}

                {cameraError && (
                  <div className="camera-error-overlay">
                    <AlertTriangle size={48} color="#e74c3c" />
                    <h3>Camera Unavailable</h3>
                    <p>{cameraError}</p>
                  </div>
                )}

                {/* STEP 1: Verification Checklist HUD */}
                {sessionPhase === 'verifying' && (
                  <div className="verification-hud glass-panel animate-fade-in" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, padding: '16px', borderRadius: '12px', background: 'rgba(15, 15, 25, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)', maxWidth: '320px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#bb86fc' }}>Instructor Checklist</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: verificationStatus.cameraActive ? '#2ecc71' : '#e74c3c', boxShadow: verificationStatus.cameraActive ? '0 0 8px #2ecc71' : '0 0 8px #e74c3c' }}></div>
                        <span>Camera Tracking Active</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: verificationStatus.bodyVisible ? '#2ecc71' : '#e74c3c', boxShadow: verificationStatus.bodyVisible ? '0 0 8px #2ecc71' : '0 0 8px #e74c3c' }}></div>
                        <span>Full Body Visible</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: verificationStatus.matConnected ? '#2ecc71' : '#e74c3c', boxShadow: verificationStatus.matConnected ? '0 0 8px #2ecc71' : '0 0 8px #e74c3c' }}></div>
                        <span>Smart Mat Connected</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: verificationStatus.fsrActive ? '#2ecc71' : '#e74c3c', boxShadow: verificationStatus.fsrActive ? '0 0 8px #2ecc71' : '0 0 8px #e74c3c' }}></div>
                        <span>FSR Sensors Active</span>
                      </div>
                    </div>
                    {!verificationStatus.bodyVisible && (
                      <p style={{ margin: '12px 0 0 0', fontSize: '0.75rem', color: '#ff4b4b', lineHeight: '1.3' }}>
                        ⚠️ Step back. Make sure shoulders, hips, and ankles are all visible.
                      </p>
                    )}
                  </div>
                )}

                {sessionPhase !== 'verifying' && (
                  <div className="step-animation-overlay">
                    <img src={yogaImages[selectedPose]?.steps[currentStep] || currentPose?.image} alt="Pose Reference" className="step-animation-img animate-pulse-slow" />
                    <div className="animation-label">Reference Pose</div>
                  </div>
                )}
              </>
            ) : (
              <div className="camera-placeholder">
                <Camera size={64} opacity={0.5} />
                <h2>Ready to Start?</h2>
                <p>Stand on your smart mat and click Start Session.</p>
              </div>
            )}
            
            <div className="pose-overlay">
              <div className="pose-icon">
                <Activity size={24} color="#bb86fc" />
              </div>
              <div>
                <h3>{currentPose?.name || "Yoga Pose"}</h3>
                <p>{sessionPhase === 'verifying' ? 'Verifying Setup' : sessionPhase === 'holding' ? 'Holding Pose' : 'Step-by-Step Coaching'}</p>
              </div>
            </div>

            {sessionActive && (
              <div className={`instruction-overlay ${safetyAlert ? 'error animate-pulse' : stepScore >= 75 ? 'success' : 'error'}`} style={{ borderColor: safetyAlert ? '#ff4b4b' : '' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="instruction-text" style={{ margin: 0, flex: 1, fontSize: '1.35rem', color: safetyAlert ? '#ff4b4b' : '#fff', textAlign: 'left' }}>
                    {sessionPhase === 'verifying' ? "Verifying setup..." : 
                     sessionPhase === 'holding' ? "Hold the Pose!" : 
                     blueprint?.steps[currentStep]?.instruction}
                  </h4>
                  {sessionPhase === 'coaching' && !safetyAlert && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', background: stepScore >= 75 ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)', color: stepScore >= 75 ? '#2ecc71' : '#ff4b4b', border: stepScore >= 75 ? '1px solid rgba(46,204,113,0.3)' : '1px solid rgba(231,76,60,0.3)' }}>
                      Score: {stepScore}%
                    </span>
                  )}
                </div>
                
                <p className="instruction-subtext" style={{ marginTop: '8px', marginBottom: '8px', color: 'var(--text-secondary)', textAlign: 'left', fontWeight: '600' }}>
                  {safetyAlert ? "⚠️ Vitals Alert" : stepScore >= 75 ? "✓ Stance aligned! Hold position..." : "⚠️ Adjustments required:"}
                </p>

                {sessionPhase === 'coaching' && stepScore < 75 && activeCorrections.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeCorrections.map((corr, idx) => (
                      <li key={idx} style={{ color: '#ff4b4b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff4b4b' }}></span>
                        {corr}
                      </li>
                    ))}
                  </ul>
                )}

                {sessionPhase === 'holding' && stepScore < 70 && activeCorrections.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeCorrections.map((corr, idx) => (
                      <li key={idx} style={{ color: '#ff4b4b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff4b4b' }}></span>
                        {corr}
                      </li>
                    ))}
                  </ul>
                )}

                {sessionPhase === 'coaching' && stepScore >= 75 && !safetyAlert && (
                  <div className="step-progress-container" style={{ marginTop: '16px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                    <div className="step-progress-bar" style={{ width: `${(stepHoldTime / 3) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #2ecc71, #bb86fc)', transition: 'width 0.3s ease' }}></div>
                  </div>
                )}
              </div>
            )}

            {sessionPhase === 'holding' && holdTimer !== null && holdTimer > 0 && (
              <div className="hold-timer-overlay" style={{ borderColor: safetyAlert ? '#ff4b4b' : '#bb86fc' }}>
                <h2>{holdTimer}</h2>
                <span>Hold</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Status & Controls */}
        <div className="hardware-panel">
          
          <div className="controls-card" style={{ flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={sessionActive ? "btn-secondary" : "btn-primary"} 
                onClick={toggleSession}
                style={{flex: 1}}
              >
                {sessionActive ? <><Square size={20} /> Stop Session</> : <><Play size={20} /> Start Session</>}
              </button>
              <button className="btn-secondary" onClick={() => { setCurrentStep(0); setHoldTimer(null); setStepHoldTime(0); setSessionPhase(sessionActive ? 'verifying' : 'inactive'); }} title="Restart Pose">
                <RotateCcw size={20} />
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  if (currentStep < blueprint.steps.length - 1) {
                    setCurrentStep(prev => prev + 1);
                    setStepHoldTime(0);
                  } else if (holdTimer === null) {
                    setSessionPhase('holding');
                    setHoldTimer(blueprint.holdDuration);
                    setStepHoldTime(0);
                  }
                }} 
                title={(stepScore < 85 || activeCorrections.length > 0 || activeIncorrectJoints.length > 0) ? "Align pose correctly to unlock next step" : "Skip Step"} 
                disabled={!sessionActive || sessionPhase === 'holding' || stepScore < 85 || activeCorrections.length > 0 || activeIncorrectJoints.length > 0}
              >
                Skip
              </button>
            </div>
            
            <button 
              className="btn-secondary" 
              onClick={() => {
                if (isConnected) {
                  disconnect();
                } else {
                  setIsMockConnected(false);
                  connect();
                }
              }}
              style={{ backgroundColor: isConnected ? 'rgba(46, 204, 113, 0.2)' : '', borderColor: isConnected ? '#2ecc71' : '' }}
            >
              {isConnecting ? "Connecting..." : isConnected ? <><BluetoothConnected size={20} color="#2ecc71" /> Mat Connected</> : <><Bluetooth size={20} /> Connect Smart Mat</>}
            </button>
            
            <button 
              className="btn-secondary" 
              onClick={() => {
                if (isConnected) {
                  disconnect();
                }
                setIsMockConnected(prev => !prev);
              }}
              style={{ 
                backgroundColor: isMockConnected ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                borderColor: isMockConnected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
                marginTop: '8px'
              }}
            >
              {isMockConnected ? <><BluetoothConnected size={20} color="var(--accent-cyan)" /> Mock Mat Connected</> : <><Bluetooth size={20} /> Enable Mock Mat</>}
            </button>
            {bleError && <p style={{color: '#e74c3c', fontSize: '0.8rem', margin: '0'}}>{bleError}</p>}

            {/* Simulation controls when not connected */}
            {!isConnected && sessionActive && (
              <div className="mock-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '5px' }}>
                <span style={{ fontSize: '0.85rem', color: '#ccc' }}>Simulate Correct Posture</span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                  <input 
                    type="checkbox" 
                    checked={simulatedAlignment} 
                    onChange={(e) => setSimulatedAlignment(e.target.checked)} 
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: simulatedAlignment ? '#2ecc71' : '#ccc', transition: '.4s', borderRadius: '20px' }}>
                    <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: simulatedAlignment ? '22px' : '2px', bottom: '2px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <h4><Activity size={18} /> Hardware Status</h4>
            </div>
            
            <div className="led-container">
              <div className={`led-indicator green ${stepScore >= 75 && sessionActive ? 'active' : ''}`}>
                <div className="led-bulb"></div>
                <span>Correct</span>
              </div>
              <div className={`led-indicator red ${stepScore < 75 && sessionActive ? 'active' : ''}`}>
                <div className="led-bulb"></div>
                <span>Adjust</span>
              </div>
              <div className={`led-indicator buzzer ${stepScore < 75 && sessionActive && sessionPhase !== 'verifying' ? 'active' : ''}`}>
                <div className="led-bulb" style={{borderRadius: '5px'}}></div>
                <span>Buzzer</span>
              </div>
            </div>
          </div>

          {/* Vitals V2 Card: Heart Rate, classified status, and SpO2/Temp future-ready channels */}
          <div className="stat-card">
            <div className="stat-header">
              <h4><Heart size={18} /> Live Vitals</h4>
            </div>
            <div className="stats-grid">
              <div className="stat-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <Heart size={24} className="stat-icon heart" style={{ animation: currentBpm !== null ? `heartbeat ${Math.max(0.3, 60 / currentBpm)}s infinite alternate` : 'none', color: '#ff4b4b' }} />
                <div className="stat-value" style={{ marginTop: '8px' }}>
                  {currentBpm !== null ? currentBpm : <span style={{ fontSize: '0.8rem', color: '#777' }}>BPM sensor</span>}
                  {currentBpm !== null && <span style={{ fontSize: '0.8rem', fontWeight: 'normal', marginLeft: '4px' }}>BPM</span>}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', color: hrStatus === 'Very High' || hrStatus === 'High' ? '#ff4b4b' : hrStatus === 'Elevated' ? '#f2994a' : '#2ecc71' }}>
                  {hrStatus}
                </div>
              </div>
              <div className="stat-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Battery size={24} className="stat-icon" />
                <div className="stat-value" style={{ marginTop: '8px' }}>{displayBattery} <span>%</span></div>
                <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>Mat Battery</div>
              </div>
            </div>

          </div>

          <div className="stat-card">
            <div className="stat-header">
              <h4><CheckCircle size={18} /> Mat FSR Sensors</h4>
            </div>
            <div className="mat-visualizer">
              <div className="mat-row">
                <div className="fsr-sensor">
                  <div className={`fsr-pad ${displayFsrData.lh > 0 ? 'active' : ''}`}>
                    <div className="fsr-fill" style={{ height: `${displayFsrData.lh}%` }}></div>
                    <span className="fsr-value">{displayFsrData.lh}%</span>
                  </div>
                  <span>L Hand</span>
                </div>
                <div className="fsr-sensor">
                  <div className={`fsr-pad ${displayFsrData.rh > 0 ? 'active' : ''}`}>
                    <div className="fsr-fill" style={{ height: `${displayFsrData.rh}%` }}></div>
                    <span className="fsr-value">{displayFsrData.rh}%</span>
                  </div>
                  <span>R Hand</span>
                </div>
              </div>
              <div className="mat-row">
                <div className="fsr-sensor">
                  <div className={`fsr-pad ${displayFsrData.lk > 0 ? 'active' : ''}`}>
                    <div className="fsr-fill" style={{ height: `${displayFsrData.lk}%` }}></div>
                    <span className="fsr-value">{displayFsrData.lk}%</span>
                  </div>
                  <span>L Knee</span>
                </div>
                <div className="fsr-sensor">
                  <div className={`fsr-pad ${displayFsrData.rk > 0 ? 'active' : ''}`}>
                    <div className="fsr-fill" style={{ height: `${displayFsrData.rk}%` }}></div>
                    <span className="fsr-value">{displayFsrData.rk}%</span>
                  </div>
                  <span>R Knee</span>
                </div>
              </div>
              <div className="mat-row">
                <div className="fsr-sensor">
                  <div className={`fsr-pad ${displayFsrData.lf > 0 ? 'active' : ''}`}>
                    <div className="fsr-fill" style={{ height: `${displayFsrData.lf}%` }}></div>
                    <span className="fsr-value">{displayFsrData.lf}%</span>
                  </div>
                  <span>L Foot</span>
                </div>
                <div className="fsr-sensor">
                  <div className={`fsr-pad ${displayFsrData.rf > 0 ? 'active' : ''}`}>
                    <div className="fsr-fill" style={{ height: `${displayFsrData.rf}%` }}></div>
                    <span className="fsr-value">{displayFsrData.rf}%</span>
                  </div>
                  <span>R Foot</span>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-header">
              <h4><CheckCircle size={18} /> Step Tracker</h4>
            </div>
            <div className="steps-timeline">
              {blueprint?.steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`step-item ${index < currentStep ? 'completed' : ''} ${index === currentStep && sessionActive && sessionPhase !== 'verifying' ? 'active' : ''}`}
                >
                  <div className="step-indicator">
                    <div className="step-circle">{index < currentStep ? '✓' : index + 1}</div>
                    <div className="step-line"></div>
                  </div>
                  <div className="step-content">
                    <h5>Step {index + 1}</h5>
                    <p>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
