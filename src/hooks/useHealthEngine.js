import { useState, useEffect } from 'react';

export function useHealthEngine(bpmInput, isActive) {
  const [currentBpm, setCurrentBpm] = useState(null);
  const [hrStatus, setHrStatus] = useState("Waiting for Heart Rate Sensor");
  const [hrHistory, setHrHistory] = useState([]);
  const [sessionAvgBpm, setSessionAvgBpm] = useState(0);
  const [sessionMaxBpm, setSessionMaxBpm] = useState(0);
  const [sessionMinBpm, setSessionMinBpm] = useState(0);
  const [safetyAlert, setSafetyAlert] = useState("");
  const [elevatedSeconds, setElevatedSeconds] = useState(0);

  // Future health placeholders
  const [spo2] = useState(98); // SpO2 %
  const [temperature] = useState(36.6); // Body Temp °C
  const [respRate] = useState(16); // Respiratory Rate breaths/min
  const [stressIndex] = useState("Low"); // Stress level

  useEffect(() => {
    if (!isActive) {
      setCurrentBpm(null);
      setHrStatus("Waiting for Heart Rate Sensor");
      setHrHistory([]);
      setSessionAvgBpm(0);
      setSessionMaxBpm(0);
      setSessionMinBpm(0);
      setSafetyAlert("");
      setElevatedSeconds(0);
      return;
    }

    if (bpmInput === null || bpmInput === undefined || bpmInput <= 0 || isNaN(bpmInput)) {
      return;
    }

    const bpm = Number(bpmInput);
    // Validation Rules: Accept range: 40 BPM – 220 BPM
    if (bpm < 40 || bpm > 220) return;

    setCurrentBpm(bpm);

    // Heart Rate Status Engine
    let status = "Normal";
    if (bpm < 60) status = "Low";
    else if (bpm <= 100) status = "Normal";
    else if (bpm <= 120) status = "Elevated";
    else if (bpm <= 140) status = "High";
    else status = "Very High";
    setHrStatus(status);

    // Rolling Heart Rate History (recent entries for performance)
    setHrHistory(prev => {
      const entry = { timestamp: Date.now(), bpm };
      const newHistory = [...prev, entry].slice(-100); // Limit to last 100 entries
      
      const bpms = newHistory.map(h => h.bpm);
      setSessionMaxBpm(Math.max(...bpms));
      setSessionMinBpm(Math.min(...bpms));
      setSessionAvgBpm(Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length));
      
      return newHistory;
    });
  }, [bpmInput, isActive]);

  // Safety Engine: Alerts & Timers
  useEffect(() => {
    if (!isActive || currentBpm === null) {
      setSafetyAlert("");
      setElevatedSeconds(0);
      return;
    }

    if (currentBpm > 160) {
      setSafetyAlert("Take a short recovery break.");
      setElevatedSeconds(0);
    } else if (currentBpm > 140) {
      setSafetyAlert("Heart rate is elevated. Slow your breathing.");
      const interval = setInterval(() => {
        setElevatedSeconds(prev => {
          const next = prev + 1;
          if (next >= 15) {
            setSafetyAlert("Consider ending the session and resting.");
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setSafetyAlert("");
      setElevatedSeconds(0);
    }
  }, [currentBpm, isActive]);

  return {
    currentBpm,
    hrStatus,
    hrHistory,
    sessionAvgBpm,
    sessionMaxBpm,
    sessionMinBpm,
    safetyAlert,
    
    // Future-ready health channels
    spo2,
    temperature,
    respRate,
    stressIndex
  };
}
