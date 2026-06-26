import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, PlayCircle, MessageSquare, Video, LogOut, Home, Calendar, BarChart2, Flame, Clock, Target, Award, Users, Play, CheckCircle2, Camera, XCircle, Sparkles, ChevronRight, CheckSquare, BookOpen, Search, X, Star, Mic, MicOff, VideoOff, MonitorUp, Bot, Send, ThumbsUp, User, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import guruAvatar from '../assets/Yoga Guru.png';
import DashboardLayout from '../components/DashboardLayout';
import { dbService } from '../services/dbService';
import { yogaPoses } from '../data/yogaPoses';
import { yogaImages } from '../data/yogaImages';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'dashboard');
  const [currentUser, setCurrentUser] = useState(() => dbService.getCurrentUser());

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(dbService.getCurrentUser());
    };
    window.addEventListener('userDataUpdated', handleUpdate);
    return () => window.removeEventListener('userDataUpdated', handleUpdate);
  }, []);

  const handleNavClick = (tab) => {
    if (tab === 'yoga-book') {
      navigate('/yogabook');
    } else if (tab === 'profile') {
      navigate('/profile');
    } else {
      setActiveTab(tab);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab currentUser={currentUser} />;
      case 'start':
        return <StartYogaTab currentUser={currentUser} />;
      case 'guru':
        return <GuruTab currentUser={currentUser} />;
      default:
        return <DashboardTab currentUser={currentUser} />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onNavClick={handleNavClick}>
      {renderTabContent()}
    </DashboardLayout>
  );
}

// --- Tab Components ---

// --- Dashboard Tab ---
function DashboardTab({ currentUser }) {
  const navigate = useNavigate();
  const [calendarView, setCalendarView] = useState('week'); // 'week' or 'month'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // 7 or 30 days
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handlePracticePose = (poseId) => {
    localStorage.setItem('selected_pose_id', poseId);
    navigate('/start-yoga', { state: { poseId } });
  };

  const handleSkipPose = (e, poseId) => {
    e.stopPropagation();
    if (!currentUser || !currentUser.todayPlan) return;
    
    const updatedPoses = currentUser.todayPlan.poses.map(p => {
      if (p.poseId === poseId) {
        return { ...p, status: 'skipped' };
      }
      return p;
    });
    
    dbService.updateCurrentUser({
      todayPlan: {
        ...currentUser.todayPlan,
        poses: updatedPoses
      }
    });
  };

  // Generate today's plan automatically
  useEffect(() => {
    const todayStr = new Date().toDateString();
    if (!currentUser?.todayPlan || currentUser.todayPlan.date !== todayStr) {
      const mainGoal = currentUser?.mainGoal || 'Weight Loss';
      const fitnessLevel = currentUser?.fitnessLevel || 'Intermediate';
      
      const matchedPoses = yogaPoses.filter(p => p.goal === mainGoal || p.level === fitnessLevel);
      const selected = [];
      
      const toPerformIds = currentUser?.posesToPerform || [];
      const preferredPoses = matchedPoses.filter(p => toPerformIds.includes(p.id));
      
      while (selected.length < Math.min(3, preferredPoses.length)) {
        const idx = Math.floor(Math.random() * preferredPoses.length);
        if (preferredPoses[idx] && !selected.some(s => s.id === preferredPoses[idx].id)) {
          selected.push(preferredPoses[idx]);
        }
      }
      
      while (selected.length < Math.min(4, matchedPoses.length)) {
        const idx = Math.floor(Math.random() * matchedPoses.length);
        if (matchedPoses[idx] && !selected.some(s => s.id === matchedPoses[idx].id)) {
          selected.push(matchedPoses[idx]);
        }
      }
      
      if (selected.length < 4) {
        const remaining = yogaPoses.filter(p => !selected.some(s => s.id === p.id));
        while (selected.length < 4 && remaining.length > 0) {
          const idx = Math.floor(Math.random() * remaining.length);
          selected.push(remaining.splice(idx, 1)[0]);
        }
      }
      
      const generatedPlan = {
        date: todayStr,
        poses: selected.slice(0, 4).map(p => ({
          poseId: p.id,
          name: p.name,
          status: 'pending'
        }))
      };
      
      dbService.updateCurrentUser({ todayPlan: generatedPlan });
    }
  }, [currentUser]);

  // Goal metrics lookup
  const goalMetrics = generateGoalMetrics(currentUser?.mainGoal || 'Weight Loss', currentUser);

  // Goal colors mapping
  const goalColors = {
    'Weight Loss': '#00b4d8', // Teal
    'Stress Relief': '#a370f7', // Lavender
    'Flexibility': '#2ecc71', // Emerald
    'Strength Building': '#f2994a', // Amber/Orange
    'General Fitness': '#5d5fef', // Indigo
    'Posture Correction': '#5d5fef' // Indigo
  };
  const strokeColor = goalColors[goalMetrics.goalName] || '#00f2fe';

  const getGoalUnit = (goalName) => {
    switch (goalName) {
      case 'Weight Loss': return ' kg';
      case 'Stress Relief': return ' Mins';
      case 'Flexibility': return '%';
      case 'Strength Building': return '%';
      default: return '%';
    }
  };

  const getBezierPath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].cx},${points[0].cy}`;
    
    let d = `M ${points[0].cx},${points[0].cy}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.cx + (next.cx - curr.cx) / 2;
      const cp1y = curr.cy;
      const cp2x = curr.cx + (next.cx - curr.cx) / 2;
      const cp2y = next.cy;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.cx},${next.cy}`;
    }
    return d;
  };

  const getGoalTooltipLabel = (goalName) => {
    switch (goalName) {
      case 'Weight Loss': return 'Weight';
      case 'Stress Relief': return 'Mindful Time';
      case 'Flexibility': return 'Accuracy';
      case 'Strength Building': return 'Strength Score';
      default: return 'Alignment Score';
    }
  };

  const tooltipLabel = getGoalTooltipLabel(goalMetrics.goalName);

  const getChangeFormatted = (pt) => {
    if (pt.idx === 0) return '0.0';
    const prev = dailyData[pt.idx - 1];
    const diff = pt.val - prev.val;
    const sign = diff > 0 ? '+' : '';
    
    if (goalMetrics.goalName === 'Weight Loss') {
      return `${sign}${diff.toFixed(1)} kg`;
    } else if (goalMetrics.goalName === 'Stress Relief') {
      return `${sign}${Math.round(diff)} Mins`;
    } else {
      return `${sign}${Math.round(diff)}%`;
    }
  };

  const getChangeColor = (pt, changeText) => {
    if (changeText === '0.0') return '#fff';
    const isWeightGoal = goalMetrics.goalName === 'Weight Loss';
    const isNegative = changeText.startsWith('-');
    if (isWeightGoal) {
      return isNegative ? '#2ecc71' : '#ff8585'; // Weight loss is green, gain is soft coral
    } else {
      return isNegative ? '#ff8585' : '#2ecc71'; // Score increase is green, decrease is soft coral
    }
  };

  const getGoalAchievementPercent = (goalName, val) => {
    if (goalName === 'Weight Loss') {
      const startWeight = currentUser?.startWeight || 76.0;
      const targetWeight = currentUser?.weightGoal || 70.0;
      return Math.max(0, Math.min(100, Math.round(((startWeight - val) / (startWeight - targetWeight || 1)) * 100)));
    } else if (goalName === 'Stress Relief') {
      return Math.max(0, Math.min(100, Math.round((val / 120) * 100)));
    } else if (goalName === 'Flexibility') {
      return Math.max(0, Math.min(100, Math.round(((val - 60) / 40) * 100)));
    } else if (goalName === 'Strength Building') {
      return Math.max(0, Math.min(100, Math.round(((val - 50) / 50) * 100)));
    } else {
      return Math.max(0, Math.min(100, Math.round(((val - 70) / 30) * 100)));
    }
  };

  const dailyData = React.useMemo(() => {
    const history = currentUser?.sessionHistory || [];
    const today = new Date();
    const dataPoints = [];

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      // Get sessions completed on this specific day
      const sessionsOnDay = history.filter(s => {
        const sDate = new Date(s.date);
        return sDate >= d && sDate <= endOfDay;
      });

      // Get all sessions completed up to this specific day
      const sessionsUpToDay = history.filter(s => {
        const sDate = new Date(s.date);
        return sDate <= endOfDay;
      });

      // Calculate value based on goal
      let val = 0;
      const goalName = goalMetrics.goalName;

      if (goalName === 'Weight Loss') {
        const startWeight = currentUser?.startWeight || 76.0;
        const currentWeight = currentUser?.weight || 72.0;
        const totalWeightLost = startWeight - currentWeight;
        
        // Cumulative calories up to this day
        const totalCalories = history.reduce((sum, s) => sum + s.caloriesBurned, 0);
        const caloriesUpTo = sessionsUpToDay.reduce((sum, s) => sum + s.caloriesBurned, 0);
        
        val = startWeight - (totalCalories > 0 ? (caloriesUpTo / totalCalories) * totalWeightLost : 0);
        val = parseFloat(val.toFixed(1));
      } else if (goalName === 'Stress Relief') {
        // Mindful Minutes on this day
        val = sessionsOnDay.reduce((sum, s) => {
          const isMeditation = s.type === 'meditation' || (s.poseName && (s.poseName.toLowerCase().includes('swastikasana') || s.poseName.toLowerCase().includes('corpse') || s.poseName.toLowerCase().includes('shavasana')));
          return sum + (isMeditation ? Math.round(s.duration / 60) : Math.round(s.duration / 120));
        }, 0);
      } else if (goalName === 'Flexibility') {
        // Average daily accuracy
        if (sessionsOnDay.length > 0) {
          val = Math.round(sessionsOnDay.reduce((sum, s) => sum + s.accuracy, 0) / sessionsOnDay.length);
        } else {
          // Carry forward from previous point or baseline
          const prevPoint = dataPoints[dataPoints.length - 1];
          if (prevPoint) {
            val = prevPoint.val;
          } else {
            const previousSessions = history.filter(s => new Date(s.date) < d);
            val = previousSessions.length > 0 
              ? Math.round(previousSessions.reduce((sum, s) => sum + s.accuracy, 0) / previousSessions.length)
              : 80;
          }
        }
      } else if (goalName === 'Strength Building') {
        // Strength score based on strength sessions up to this day
        const strengthSessionsUpToDay = sessionsUpToDay.filter(s => s.poseName && (s.poseName.toLowerCase().includes('warrior') || s.poseName.toLowerCase().includes('plank') || s.poseName.toLowerCase().includes('boat') || s.poseName.toLowerCase().includes('chair') || s.poseName.toLowerCase().includes('bridge')));
        val = Math.min(100, 50 + (strengthSessionsUpToDay.length * 4));
      } else {
        // Posture Correction / General Fitness: Alignment Score up to this day
        const avgAccuracyUpToDay = sessionsUpToDay.length > 0
          ? sessionsUpToDay.reduce((sum, s) => sum + s.accuracy, 0) / sessionsUpToDay.length
          : 85;
        val = Math.min(100, Math.round(70 + (sessionsUpToDay.length * 0.8) * (avgAccuracyUpToDay / 100)));
      }

      const dayName = d.toLocaleDateString('default', { weekday: 'short' });
      const dayDate = d.toLocaleDateString('default', { day: 'numeric', month: 'short' });

      dataPoints.push({
        label: dayName,
        dateStr: dayDate,
        val: val,
        sessionCount: sessionsOnDay.length,
        isToday: d.toDateString() === today.toDateString()
      });
    }

    // Now assign coordinates
    const N = dataPoints.length;
    const values = dataPoints.map(p => p.val);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (minVal === maxVal) {
      minVal -= 5;
      maxVal += 5;
    } else {
      const diff = maxVal - minVal;
      minVal -= diff * 0.15;
      maxVal += diff * 0.15;
    }

    return dataPoints.map((pt, idx) => {
      const cx = 45 + (idx / (N - 1)) * 440; // Leave left margin for y-axis labels
      const cy = 230 - ((pt.val - minVal) / (maxVal - minVal)) * 170; // Height 170, y goes from 60 to 230
      return {
        ...pt,
        idx,
        cx,
        cy,
        minVal,
        maxVal
      };
    });
  }, [currentUser, timeRange, goalMetrics.goalName]);



  const generateGoalInsights = (goalName, userData) => {
    const history = userData?.sessionHistory || [];
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    // 1. Sessions completed this week
    const sessionsThisWeek = history.filter(s => new Date(s.date) >= sevenDaysAgo).length;
    
    // 2. Unique active days in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const activeDaysInMonth = new Set(
      history
        .filter(s => new Date(s.date) >= thirtyDaysAgo)
        .map(s => new Date(s.date).toDateString())
    ).size;

    // 3. Average Accuracy
    const avgAccuracy = history.length > 0 
      ? Math.round(history.reduce((sum, s) => sum + s.accuracy, 0) / history.length) 
      : 85;

    const list = [];
    
    // Insight 1: Consistency
    list.push({
      emoji: '🔥',
      text: `You have completed ${sessionsThisWeek} sessions this week.`
    });

    // Insight 2: Goal progress spec
    if (goalName === 'Weight Loss') {
      const currentWeight = userData?.weight || 72.0;
      const targetWeight = userData?.weightGoal || 70.0;
      const diff = currentWeight - targetWeight;
      if (diff > 0) {
        list.push({
          emoji: '🎯',
          text: `Only ${diff.toFixed(1)}kg remaining to achieve your target weight of ${targetWeight}kg.`
        });
      } else {
        list.push({
          emoji: '🎉',
          text: `Target weight of ${targetWeight}kg achieved! Fantastic job.`
        });
      }
    } else if (goalName === 'Stress Relief') {
      const meditationSessions = history.filter(s => s.type === 'meditation' || (s.poseName && (s.poseName.toLowerCase().includes('swastikasana') || s.poseName.toLowerCase().includes('corpse') || s.poseName.toLowerCase().includes('shavasana'))));
      const totalMindfulMinutes = meditationSessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
      const diff = 120 - totalMindfulMinutes;
      if (diff > 0) {
        list.push({
          emoji: '🎯',
          text: `Only ${diff} mindful minutes remaining to achieve your target.`
        });
      } else {
        list.push({
          emoji: '🧘',
          text: `Excellent! You completed your weekly mindfulness target of 120 minutes.`
        });
      }
    } else if (goalName === 'Flexibility') {
      const flexSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('stretch') || s.poseName.toLowerCase().includes('triangle') || s.poseName.toLowerCase().includes('downward') || s.poseName.toLowerCase().includes('cobra') || s.poseName.toLowerCase().includes('tree')));
      const flexCount = flexSessions.length;
      const mobilityScore = Math.min(100, 60 + flexCount * 2);
      const diff = 100 - mobilityScore;
      if (diff > 0) {
        list.push({
          emoji: '🎯',
          text: `Only ${diff}% mobility score remaining to reach full flexibility.`
        });
      } else {
        list.push({
          emoji: '🤸',
          text: `Congratulations! You achieved maximum flexibility rating.`
        });
      }
    } else if (goalName === 'Strength Building') {
      const strengthSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('warrior') || s.poseName.toLowerCase().includes('plank') || s.poseName.toLowerCase().includes('boat') || s.poseName.toLowerCase().includes('chair') || s.poseName.toLowerCase().includes('bridge')));
      const strengthCount = strengthSessions.length;
      const strengthScore = Math.min(100, 50 + (strengthCount * 4));
      const diff = 100 - strengthScore;
      if (diff > 0) {
        list.push({
          emoji: '🎯',
          text: `Only ${diff}% remaining to achieve your target strength level.`
        });
      } else {
        list.push({
          emoji: '💪',
          text: `Outstanding! You reached your target core strength holds.`
        });
      }
    } else {
      const alignmentScore = Math.min(100, 70 + (history.length * 1.5));
      const diff = 100 - alignmentScore;
      if (diff > 0) {
        list.push({
          emoji: '🎯',
          text: `Only ${diff}% alignment score remaining to reach perfect posture.`
        });
      } else {
        list.push({
          emoji: '🧘',
          text: `Perfect! Your posture alignment is fully calibrated.`
        });
      }
    }

    // Insight 3: Days practiced
    list.push({
      emoji: '🧘',
      text: `Excellent consistency! You practiced on ${activeDaysInMonth} different days.`
    });

    // Insight 4: Pose accuracy
    list.push({
      emoji: '💪',
      text: `Your average pose accuracy is stable at ${avgAccuracy}% over recent sessions.`
    });

    return list.slice(0, 3); // return top 3 insights
  };

  const chartStyles = React.useMemo(() => {
    return `
      @keyframes chartPulseGlow-${goalMetrics.goalName} {
        from {
          r: 5.5;
          filter: drop-shadow(0 0 4px ${strokeColor});
        }
        to {
          r: 7.5;
          filter: drop-shadow(0 0 12px ${strokeColor});
        }
      }
      .today-pulsing-point {
        animation: chartPulseGlow-${goalMetrics.goalName} 1.5s infinite alternate ease-in-out;
      }
    `;
  }, [goalMetrics.goalName, strokeColor]);

  const shouldShowDot = (pt, idx, points) => {
    if (timeRange === 7) return true;
    if (pt.isToday) return true;
    if (hoveredPoint && hoveredPoint.cx === pt.cx) return true;
    
    const N = points.length;
    const values = points.map(p => p.val);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    if (pt.val === minVal || pt.val === maxVal) return true;
    
    if (idx > 0 && idx < N - 1) {
      const isLocalMax = pt.val > values[idx - 1] && pt.val > values[idx + 1];
      const isLocalMin = pt.val < values[idx - 1] && pt.val < values[idx + 1];
      if (isLocalMax || isLocalMin) return true;
    }
    
    return false;
  };

  const getTrendString = (goalName, dataPoints) => {
    if (dataPoints.length < 2) return '';
    const startVal = dataPoints[0].val;
    const endVal = dataPoints[dataPoints.length - 1].val;
    const diff = goalName === 'Weight Loss' ? (startVal - endVal) : (endVal - startVal);
    const weeklyRate = diff / (timeRange / 7);

    switch (goalName) {
      case 'Weight Loss':
        return weeklyRate > 0 
          ? `📉 Losing ${weeklyRate.toFixed(1)} kg/week` 
          : `📉 Weight steady`;
      case 'Stress Relief':
        return weeklyRate > 0 
          ? `📈 Mindful time up by ${Math.round(weeklyRate)}m/week` 
          : `🧘 Calming mind`;
      case 'Flexibility':
        return weeklyRate > 0 
          ? `📈 Improving by ${Math.round(weeklyRate)}% weekly` 
          : `🤸 Core flexibility active`;
      case 'Strength Building':
        return weeklyRate > 0 
          ? `📈 Strength up by ${Math.round(weeklyRate)}% weekly` 
          : `💪 Muscle endurance active`;
      default:
        return weeklyRate > 0 
          ? `📈 Alignment up by ${Math.round(weeklyRate)}% weekly` 
          : `🧘 Aligning posture`;
    }
  };

  const journeyConfig = React.useMemo(() => {
    const goalName = goalMetrics.goalName;
    const history = currentUser?.sessionHistory || [];
    
    if (goalName === 'Weight Loss') {
      const startWeight = currentUser?.startWeight || 76.0;
      const currentWeight = currentUser?.weight || 72.0;
      const targetWeight = currentUser?.weightGoal || 70.0;
      const diffGoal = startWeight - targetWeight;
      const diffCurrent = startWeight - currentWeight;
      const percent = diffGoal > 0 ? Math.max(0, Math.min(100, Math.round((diffCurrent / diffGoal) * 100))) : 0;
      const remaining = Math.max(0, currentWeight - targetWeight);
      const remainingText = remaining > 0 ? `${remaining.toFixed(1)} kg remaining to target` : 'Goal target achieved! 🎉';
      return {
        minLabel: 'Start Weight',
        minVal: `${startWeight} kg`,
        maxLabel: 'Target Weight',
        maxVal: `${targetWeight} kg`,
        currentLabel: 'Current Weight',
        currentVal: `${currentWeight} kg`,
        percent,
        remainingText
      };
    } else if (goalName === 'Stress Relief') {
      const meditationSessions = history.filter(s => s.type === 'meditation' || (s.poseName && (s.poseName.toLowerCase().includes('swastikasana') || s.poseName.toLowerCase().includes('corpse') || s.poseName.toLowerCase().includes('shavasana'))));
      const totalMindfulMinutes = meditationSessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
      const targetMins = 120;
      const percent = Math.max(0, Math.min(100, Math.round((totalMindfulMinutes / targetMins) * 100)));
      const remaining = Math.max(0, targetMins - totalMindfulMinutes);
      const remainingText = remaining > 0 ? `${remaining} Mins mindful practice remaining` : 'Goal target achieved! 🎉';
      return {
        minLabel: 'Start',
        minVal: '0 Mins',
        maxLabel: 'Target',
        maxVal: `${targetMins} Mins`,
        currentLabel: 'Current Mindful Time',
        currentVal: `${totalMindfulMinutes} Mins`,
        percent,
        remainingText
      };
    } else if (goalName === 'Flexibility') {
      const flexSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('stretch') || s.poseName.toLowerCase().includes('triangle') || s.poseName.toLowerCase().includes('downward') || s.poseName.toLowerCase().includes('cobra') || s.poseName.toLowerCase().includes('tree')));
      const flexCount = flexSessions.length;
      const mobilityScore = Math.min(100, 60 + flexCount * 2);
      const percent = Math.max(0, Math.min(100, Math.round(((mobilityScore - 60) / 40) * 100)));
      const remaining = Math.max(0, 100 - mobilityScore);
      const remainingText = remaining > 0 ? `${remaining}% mobility improvement remaining` : 'Goal target achieved! 🎉';
      return {
        minLabel: 'Baseline Mobility',
        minVal: '60%',
        maxLabel: 'Target',
        maxVal: '100%',
        currentLabel: 'Current Mobility',
        currentVal: `${mobilityScore}%`,
        percent,
        remainingText
      };
    } else if (goalName === 'Strength Building') {
      const strengthSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('warrior') || s.poseName.toLowerCase().includes('plank') || s.poseName.toLowerCase().includes('boat') || s.poseName.toLowerCase().includes('chair') || s.poseName.toLowerCase().includes('bridge')));
      const strengthCount = strengthSessions.length;
      const strengthScore = Math.min(100, 50 + (strengthCount * 4));
      const percent = Math.max(0, Math.min(100, Math.round(((strengthScore - 50) / 50) * 100)));
      const remaining = Math.max(0, 100 - strengthScore);
      const remainingText = remaining > 0 ? `${remaining}% strength score remaining` : 'Goal target achieved! 🎉';
      return {
        minLabel: 'Baseline Strength',
        minVal: '50%',
        maxLabel: 'Target',
        maxVal: '100%',
        currentLabel: 'Current Strength Score',
        currentVal: `${strengthScore}%`,
        percent,
        remainingText
      };
    } else {
      // General Fitness / Posture Correction
      const avgAccuracy = history.length > 0 ? Math.round(history.reduce((sum, s) => sum + s.accuracy, 0) / history.length) : 85;
      const alignmentScore = Math.min(100, 70 + (history.length * 1.5));
      const percent = Math.max(0, Math.min(100, Math.round(((alignmentScore - 70) / 30) * 100)));
      const remaining = Math.max(0, 100 - alignmentScore);
      const remainingText = remaining > 0 ? `${remaining}% alignment score remaining` : 'Goal target achieved! 🎉';
      return {
        minLabel: 'Baseline Alignment',
        minVal: '70%',
        maxLabel: 'Target Alignment',
        maxVal: '100%',
        currentLabel: 'Current Alignment Score',
        currentVal: `${alignmentScore}%`,
        percent,
        remainingText
      };
    }
  }, [currentUser, goalMetrics.goalName]);

  const statsConfig = React.useMemo(() => {
    const goalName = goalMetrics.goalName;
    const history = currentUser?.sessionHistory || [];
    
    if (goalName === 'Weight Loss') {
      const startWeight = currentUser?.startWeight || 76.0;
      const currentWeight = currentUser?.weight || 72.0;
      const targetWeight = currentUser?.weightGoal || 70.0;
      const weightLost = startWeight - currentWeight;
      
      return [
        { icon: Flame, label: 'Start Weight', value: `${startWeight} kg`, subtext: 'Initial record' },
        { icon: Activity, label: 'Current Weight', value: `${currentWeight} kg`, subtext: 'Today' },
        { icon: Target, label: 'Target Weight', value: `${targetWeight} kg`, subtext: 'Goal weight' },
        { icon: Award, label: 'Total Weight Lost', value: `${weightLost.toFixed(1)} kg`, subtext: `${Math.round(weightLost / (startWeight - targetWeight || 1) * 100)}% progress` }
      ];
    } else if (goalName === 'Stress Relief') {
      const meditationSessions = history.filter(s => s.type === 'meditation' || (s.poseName && (s.poseName.toLowerCase().includes('swastikasana') || s.poseName.toLowerCase().includes('corpse') || s.poseName.toLowerCase().includes('shavasana'))));
      const medCount = meditationSessions.length;
      const totalMindfulMinutes = meditationSessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
      const heartRateCalming = medCount > 0 ? Math.min(15, medCount * 1.2) : 5;
      
      return [
        { icon: Clock, label: 'Mindful Practice', value: `${totalMindfulMinutes} Mins`, subtext: 'Zen activity duration' },
        { icon: Target, label: 'Sessions Completed', value: `${medCount}`, subtext: 'Meditation sessions' },
        { icon: Activity, label: 'Avg HR Calming', value: `-${heartRateCalming.toFixed(1)} BPM`, subtext: 'Stress reduction rate' },
        { icon: Sparkles, label: 'Mindfulness Target', value: '120 Mins', subtext: 'Weekly wellness goal' }
      ];
    } else if (goalName === 'Flexibility') {
      const flexSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('stretch') || s.poseName.toLowerCase().includes('triangle') || s.poseName.toLowerCase().includes('downward') || s.poseName.toLowerCase().includes('cobra') || s.poseName.toLowerCase().includes('tree')));
      const flexCount = flexSessions.length;
      const avgAccuracy = flexSessions.length > 0 ? Math.round(flexSessions.reduce((sum, s) => sum + s.accuracy, 0) / flexSessions.length) : 85;
      const mobilityScore = Math.min(100, 60 + flexCount * 2);
      
      return [
        { icon: Award, label: 'Mobility Index', value: `${mobilityScore}%`, subtext: 'Joint flexibility rating' },
        { icon: CheckCircle2, label: 'Average Accuracy', value: `${avgAccuracy}%`, subtext: 'Pose posture accuracy' },
        { icon: Activity, label: 'Stretch Sessions', value: `${flexCount}`, subtext: 'Flexibility routines' },
        { icon: Sparkles, label: 'Flexibility Goal', value: '100%', subtext: 'Full muscle extension' }
      ];
    } else if (goalName === 'Strength Building') {
      const strengthSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('warrior') || s.poseName.toLowerCase().includes('plank') || s.poseName.toLowerCase().includes('boat') || s.poseName.toLowerCase().includes('chair') || s.poseName.toLowerCase().includes('bridge')));
      const strengthCount = strengthSessions.length;
      const avgDuration = strengthSessions.length > 0 ? Math.round(strengthSessions.reduce((sum, s) => sum + s.duration, 0) / strengthSessions.length) : 600;
      const avgDurationMin = Math.round(avgDuration / 60);
      const holdImprovement = Math.min(100, strengthCount * 4);
      
      return [
        { icon: Flame, label: 'Strength Sessions', value: `${strengthCount}`, subtext: 'Core routines completed' },
        { icon: Clock, label: 'Avg Pose Duration', value: `${avgDurationMin} mins`, subtext: 'Active hold duration' },
        { icon: Award, label: 'Hold Improvement', value: `+${holdImprovement}%`, subtext: 'Muscular endurance gain' },
        { icon: Target, label: 'Strength Target', value: '100%', subtext: 'Maximum stabilization' }
      ];
    } else {
      // General Fitness / Posture Correction
      const avgAccuracy = history.length > 0 ? Math.round(history.reduce((sum, s) => sum + s.accuracy, 0) / history.length) : 85;
      const correctPosturePercent = Math.min(100, Math.round(avgAccuracy * 1.05));
      const alignmentScore = Math.min(100, 70 + (history.length * 1.5));
      
      return [
        { icon: CheckCircle2, label: 'Alignment Score', value: `${alignmentScore}/100`, subtext: 'Spine posture check' },
        { icon: Target, label: 'Pose Hold Ratio', value: `${correctPosturePercent}%`, subtext: 'Stable pose execution' },
        { icon: Activity, label: 'General Accuracy', value: `${avgAccuracy}%`, subtext: 'Overall balance score' },
        { icon: Award, label: 'Fitness Level', value: currentUser?.fitnessLevel || 'Intermediate', subtext: 'Current baseline' }
      ];
    }
  }, [currentUser, goalMetrics.goalName]);

  // Poses details lookup
  const performedPoses = yogaPoses.filter(p => currentUser?.posesPerformed?.includes(p.id)) || [];
  const toPerformPoses = yogaPoses.filter(p => currentUser?.posesToPerform?.includes(p.id)) || [];

  // Real-time Calendar Logic (Month Grid)
  const today = new Date();
  const currentMonthName = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, today.getMonth(), 1).getDay();
  const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const calendarDays = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const d = new Date(currentYear, today.getMonth(), day);
    const dateKey = d.toDateString();
    const hasCompleted = (currentUser?.sessionHistory || []).some(s => new Date(s.date).toDateString() === dateKey);
    
    let status = 'none';
    if (hasCompleted) {
      status = 'completed';
      const prevDate = new Date(d);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevHasCompleted = (currentUser?.sessionHistory || []).some(s => new Date(s.date).toDateString() === prevDate.toDateString());
      if (prevHasCompleted) {
        status = 'perfect';
      }
    } else if (d < today) {
      status = 'missed';
    }
    
    return { day, status, isToday: day === today.getDate() };
  });

  // Last 7 Days Streak list
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleDateString('default', { weekday: 'short' });
    const dateKey = d.toDateString();
    
    const hasCompleted = (currentUser?.sessionHistory || []).some(s => new Date(s.date).toDateString() === dateKey);
    
    let status = 'missed';
    if (hasCompleted) {
      status = 'completed';
      const prevDate = new Date(d);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevHasCompleted = (currentUser?.sessionHistory || []).some(s => new Date(s.date).toDateString() === prevDate.toDateString());
      if (prevHasCompleted) {
        status = 'perfect';
      }
    }
    
    return {
      dayLabel: dayStr,
      dayNum: d.getDate(),
      status,
      isToday: d.toDateString() === new Date().toDateString()
    };
  });

  const nameToDisplay = currentUser?.name ? currentUser.name.split(' ')[0] : 'Yogi';
  const currentWeight = currentUser?.weight || 72;
  const targetWeight = currentUser?.weightGoal || 70;
  
  const focusTextMap = {
    'Weight Loss': 'High-Burn Cardio & core hold',
    'Flexibility': 'Deep stretching & joint flexibility',
    'Strength': 'Core stabilization & posture hold endurance',
    'Stress Relief': 'Balance & Mindfulness meditation',
    'General Fitness': 'Posture alignment & mindful balance'
  };
  const focusText = focusTextMap[currentUser?.mainGoal] || 'Posture alignment & mindful balance';

  // Format active time today
  const formatActiveTime = (secs) => {
    if (!secs) return "0 Mins";
    const mins = Math.round(secs / 60);
    if (mins < 60) {
      return `${mins} Mins`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const allTimeHours = ((currentUser?.totalTime || 0) / 60).toFixed(1);

  // Today's Practice Plan variables
  const todayPlanPoses = currentUser?.todayPlan?.poses || [];
  const firstPendingPose = todayPlanPoses.find(p => p.status === 'pending');

  // Scheduled virtual session lookup
  const upcomingSession = dbService.getUpcomingSession();

  // Weekly summary stats
  const getWeeklySummary = () => {
    const history = currentUser?.sessionHistory || [];
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const weeklySessions = history.filter(s => new Date(s.date) >= sevenDaysAgo);
    const count = weeklySessions.length;
    const minutes = weeklySessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
    const avgAccuracy = count > 0 ? Math.round(weeklySessions.reduce((sum, s) => sum + s.accuracy, 0) / count) : 88;
    const calories = weeklySessions.reduce((sum, s) => sum + s.caloriesBurned, 0);
    
    return { count, minutes, avgAccuracy, calories };
  };
  const weeklySummary = getWeeklySummary();

  // Health Snapshot calculations
  const todayStr = new Date().toDateString();
  const currentMood = currentUser?.moodLogs?.[todayStr] || null;
  
  const handleMoodSelect = (mood) => {
    const updatedMoodLogs = {
      ...(currentUser?.moodLogs || {}),
      [todayStr]: mood
    };
    dbService.updateCurrentUser({ moodLogs: updatedMoodLogs });
  };
  
  const getAverageHeartRate = () => {
    const history = currentUser?.sessionHistory || [];
    if (history.length === 0) return 72;
    const totalHr = history.reduce((sum, s) => sum + s.avgBpm, 0);
    return Math.round(totalHr / history.length);
  };
  const avgHeartRate = getAverageHeartRate();
  
  let stressLevel = "Normal";
  if (currentMood === '🧘' || currentMood === '😊') stressLevel = "Low";
  else if (currentMood === '😴') stressLevel = "Medium";
  else if (currentMood === '😰') stressLevel = "High";
  else {
    const todaySessionsCount = (currentUser?.sessionHistory || []).filter(s => new Date(s.date).toDateString() === todayStr).length;
    if (todaySessionsCount > 0) stressLevel = "Low";
  }
  
  const todaySessionsCount = (currentUser?.sessionHistory || []).filter(s => new Date(s.date).toDateString() === todayStr).length;
  let energyScore = 75 + (todaySessionsCount * 5);
  if (currentMood === '🧘') energyScore += 10;
  else if (currentMood === '😊') energyScore += 5;
  else if (currentMood === '😴') energyScore -= 10;
  else if (currentMood === '😰') energyScore -= 15;
  energyScore = Math.max(10, Math.min(100, energyScore));

  return (
    <div className="tab-content dashboard-tab">

      {/* 1. Welcome + AI Summary */}
      <div className="dashboard-welcome flex-between animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="greeting" style={{ fontSize: '2.2rem', margin: '0 0 4px' }}>{getGreeting()}, <span className="text-gradient">{nameToDisplay}!</span> 👋</h2>
          <p className="greeting-sub text-secondary" style={{ margin: 0, fontSize: '1rem' }}>Ready to continue your wellness journey?</p>
        </div>
        <div className="ai-suggestion-card glass-panel glass-panel-hover" style={{ flex: '1 1 350px', maxWidth: '500px' }}>
          <div className="flex-center" style={{ gap: '12px', display: 'flex', alignItems: 'center' }}>
            <div className="ai-icon-pulse">
              <Sparkles size={24} color="#00f2fe" />
            </div>
            <div>
              <h4 style={{ color: '#00f2fe', margin: 0, fontSize: '0.9rem' }}>AI Suggestion</h4>
              <p style={{ margin: 0, fontWeight: '500', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Hello {nameToDisplay} 👋 Today's focus: {focusText}. You're on a {currentUser?.streak || 0}-day streak! 🔥
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Stats Cards */}
      <div className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card glass-panel glass-panel-hover">
          <div className="stat-icon glow-pulse" style={{ background: 'rgba(255, 75, 75, 0.1)' }}><Flame size={24} color="#ff4b4b" /></div>
          <div className="stat-info">
            <span className="stat-label">Current Streak</span>
            <span className="stat-value">{currentUser?.streak || 0} Days <span className="stat-trend" style={{ color: '#ff4b4b', background: 'rgba(255,75,75,0.1)' }}>🔥 Keep it up!</span></span>
          </div>
        </div>
        <div className="stat-card glass-panel glass-panel-hover">
          <div className="stat-icon glow-pulse" style={{ background: 'rgba(0, 242, 254, 0.1)' }}><Activity size={24} color="#00f2fe" /></div>
          <div className="stat-info">
            <span className="stat-label">Total Sessions</span>
            <span className="stat-value">{currentUser?.totalSessions || 0} <span className="stat-trend trend-up">completed</span></span>
          </div>
        </div>
        <div className="stat-card glass-panel glass-panel-hover">
          <div className="stat-icon glow-pulse" style={{ background: 'rgba(155, 81, 224, 0.1)' }}><Clock size={24} color="#9b51e0" /></div>
          <div className="stat-info">
            <span className="stat-label">Active Time Today</span>
            <span className="stat-value">
              {formatActiveTime(currentUser?.totalTimeToday || 0)} 
              <span className="stat-trend trend-up">All-Time: {allTimeHours}h</span>
            </span>
          </div>
        </div>
        <div className="stat-card glass-panel glass-panel-hover">
          <div className="stat-icon glow-pulse" style={{ background: 'rgba(79, 172, 254, 0.1)' }}><Target size={24} color="#4facfe" /></div>
          <div className="stat-info">
            <span className="stat-label">
              {currentUser?.mainGoal === 'Weight Loss' ? 'Weight Goal' : 'Goal Progress'}
            </span>
            <span className="stat-value">
              {currentUser?.mainGoal === 'Weight Loss' ? `${currentWeight} kg` : `${goalMetrics.percentage}%`}
              <span className="stat-trend trend-up">
                {currentUser?.mainGoal === 'Weight Loss' ? `Goal: ${targetWeight} kg` : `${currentUser?.mainGoal}`}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        {/* LEFT COLUMN: Graph & Actions */}
        <div className="dashboard-col-left">

          {/* 3. Progress Visualization */}
          <div className="growth-graph glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <style>{chartStyles}</style>

            {/* Header: Title + Summary + Dynamic Trend Indicator + Toggle */}
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Goal Progress ({goalMetrics.goalName})</h3>
                  <span className="badge" style={{ background: `${strokeColor}1a`, border: `1px solid ${strokeColor}4d`, color: strokeColor, fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px', fontWeight: 'bold' }}>
                    {getTrendString(goalMetrics.goalName, dailyData)}
                  </span>
                </div>
                <span className="text-secondary" style={{ fontSize: '0.85rem', display: 'block', marginTop: '4px' }}>Track your yoga goal development day by day</span>
              </div>

              {/* Time Range Toggle */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button 
                  onClick={() => setTimeRange(7)}
                  style={{
                    background: timeRange === 7 ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: timeRange === 7 ? strokeColor : 'var(--text-secondary)',
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  7D
                </button>
                <button 
                  onClick={() => setTimeRange(30)}
                  style={{
                    background: timeRange === 30 ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: timeRange === 30 ? strokeColor : 'var(--text-secondary)',
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  30D
                </button>
              </div>
            </div>

            {/* Journey Tracker Section (Goal Summary / Progress Indicator) */}
            <div className="journey-tracker-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: strokeColor, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Target size={16} /> {journeyConfig.remainingText}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                  {journeyConfig.percent}% Achieved
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  Baseline: <strong>{journeyConfig.minVal}</strong>
                </span>
                
                <div style={{ flex: 1, minWidth: '150px', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: `${journeyConfig.percent}%`, height: '100%', background: `linear-gradient(90deg, ${strokeColor}44, ${strokeColor})`, borderRadius: '4px', boxShadow: `0 0 10px ${strokeColor}66` }}></div>
                  <div style={{ 
                    position: 'absolute', 
                    top: '-4px', 
                    left: `calc(${journeyConfig.percent}% - 8px)`, 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    background: '#fff', 
                    border: `3px solid ${strokeColor}`,
                    boxShadow: `0 0 12px ${strokeColor}`,
                    transition: 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}></div>
                </div>

                <span style={{ fontSize: '0.8rem', color: strokeColor, background: `${strokeColor}11`, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${strokeColor}22` }}>
                  Current: <strong>{journeyConfig.currentVal}</strong>
                </span>
                
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  Target: <strong>{journeyConfig.maxVal}</strong>
                </span>
              </div>
            </div>

            {/* Statistics Cards Grid */}
            <div className="stats-dashboard-grid">
              {statsConfig.map((card, idx) => {
                const CardIcon = card.icon;
                return (
                  <div key={idx} className="glass-panel glass-panel-hover" style={{ padding: '16px', borderLeft: `3px solid ${strokeColor}`, display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.015)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${strokeColor}15`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: strokeColor, flexShrink: 0 }}>
                      <CardIcon size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
                      <strong style={{ fontSize: '1.2rem', color: '#fff', display: 'block', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.subtext}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Large Analytics Chart Enclosure */}
            {(!currentUser?.sessionHistory || currentUser.sessionHistory.length === 0) ? (
              <div className="flex-center flex-column" style={{ height: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                <AlertCircle size={40} style={{ marginBottom: '16px', color: strokeColor }} />
                <p style={{ margin: 0, fontSize: '0.95rem', textAlign: 'center', padding: '0 20px' }}>
                  Complete more yoga sessions to see your progress trends.
                </p>
              </div>
            ) : (
              <div className="graph-container">
                {/* HTML Legend Overlay */}
                <div style={{ position: 'absolute', top: '10px', right: '20px', display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)', zIndex: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: strokeColor }}></span>
                    <span>Daily Progress</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '0px', borderTop: '2px dashed rgba(255,255,255,0.2)' }}></span>
                    <span>Target Threshold</span>
                  </div>
                </div>

                {/* SVG Custom Chart */}
                <svg key={`${timeRange}-${goalMetrics.goalName}`} viewBox="0 0 500 280" className="chart-svg">
                  {/* Grid Lines */}
                  <line x1="45" y1="230" x2="485" y2="230" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <line x1="45" y1="173" x2="485" y2="173" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <line x1="45" y1="116" x2="485" y2="116" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <line x1="45" y1="60" x2="485" y2="60" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

                  {/* Vertical Grid Lines */}
                  {dailyData.map((pt, i) => {
                    const shouldShowGrid = timeRange === 7 || i % 6 === 0 || i === dailyData.length - 1;
                    if (!shouldShowGrid) return null;
                    return (
                      <line 
                        key={`grid-x-${i}`} 
                        x1={pt.cx} 
                        y1="60" 
                        x2={pt.cx} 
                        y2="230" 
                        stroke="rgba(255,255,255,0.04)" 
                        strokeWidth="1" 
                      />
                    );
                  })}

                  {/* Y-Axis Labels */}
                  <text x="10" y="63" fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="700">{parseFloat((dailyData[0]?.maxVal || 100).toFixed(1))}</text>
                  <text x="10" y="120" fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="700">{parseFloat(((dailyData[0]?.minVal || 0) + ((dailyData[0]?.maxVal || 100) - (dailyData[0]?.minVal || 0)) * 0.67).toFixed(1))}</text>
                  <text x="10" y="176" fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="700">{parseFloat(((dailyData[0]?.minVal || 0) + ((dailyData[0]?.maxVal || 100) - (dailyData[0]?.minVal || 0)) * 0.33).toFixed(1))}</text>
                  <text x="10" y="233" fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="700">{parseFloat((dailyData[0]?.minVal || 0).toFixed(1))}</text>

                  {/* Gradient Area under curve */}
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  
                  {/* Dynamic path & area */}
                  {dailyData.length > 1 && (
                    <>
                      <path
                        d={`${getBezierPath(dailyData)} L ${dailyData[dailyData.length - 1].cx},230 L ${dailyData[0].cx},230 Z`}
                        fill="url(#chartGradient)"
                        className="chart-area"
                      />
                      <path
                        d={getBezierPath(dailyData)}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="chart-line"
                      />
                    </>
                  )}

                  {/* Dynamic Data Points */}
                  {dailyData.map((pt, i) => {
                    const isDotVisible = shouldShowDot(pt, i, dailyData);
                    return (
                      <g key={i}>
                        {/* Visible Point */}
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r={pt.isToday ? "6" : "4"}
                          fill={pt.isToday ? strokeColor : "#0b0f19"}
                          stroke={strokeColor}
                          strokeWidth={pt.isToday ? "3" : "2"}
                          className={pt.isToday ? "today-pulsing-point" : ""}
                          style={{
                            opacity: isDotVisible ? 1 : 0,
                            pointerEvents: 'none',
                            transition: 'all 0.2s ease'
                          }}
                        />
                        {/* Large Hover target */}
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r="14"
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => {
                            setHoveredPoint({ ...pt, idx: i, unit: getGoalUnit(goalMetrics.goalName) });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    );
                  })}

                  {/* Exact values near points for 7D view */}
                  {timeRange === 7 && dailyData.map((pt, i) => (
                    <text
                      key={`val-${i}`}
                      x={pt.cx}
                      y={pt.cy - 12}
                      fill="rgba(255,255,255,0.7)"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {pt.val}
                    </text>
                  ))}

                  {/* X-Axis Labels */}
                  {dailyData.map((pt, i) => {
                    const shouldShowLabel = timeRange === 7 ? true : (i % 6 === 0 || i === dailyData.length - 1);
                    if (!shouldShowLabel) return null;
                    return (
                      <text
                        key={`lbl-x-${i}`}
                        x={pt.cx}
                        y="262"
                        fill={pt.isToday ? strokeColor : "rgba(255,255,255,0.6)"}
                        fontSize="10"
                        fontWeight={pt.isToday ? "700" : "600"}
                        textAnchor="middle"
                      >
                        {timeRange === 7 ? pt.label : pt.dateStr.split(' ')[0]}
                      </text>
                    );
                  })}
                </svg>

                {/* Hover Tooltip */}
                {hoveredPoint && (
                  <div 
                    className="chart-tooltip" 
                    style={{
                      left: `${(hoveredPoint.cx / 500) * 100}%`,
                      top: `${(hoveredPoint.cy / 280) * 100}%`,
                      border: `1px solid ${strokeColor}`,
                      boxShadow: `0 8px 32px ${strokeColor}26, 0 0 15px ${strokeColor}1a`,
                      borderLeft: `4px solid ${strokeColor}`
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px', color: 'rgba(255,255,255,0.95)' }}>
                      {hoveredPoint.label}, {hoveredPoint.dateStr}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: strokeColor }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>{tooltipLabel}:</span>
                      <strong style={{ color: '#fff' }}>{hoveredPoint.val}{hoveredPoint.unit}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: strokeColor }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Change:</span>
                      <strong style={{ color: getChangeColor(hoveredPoint, getChangeFormatted(hoveredPoint)) }}>
                        {getChangeFormatted(hoveredPoint)}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: strokeColor }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Sessions:</span>
                      <strong style={{ color: '#fff' }}>{hoveredPoint.sessionCount} Completed</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: strokeColor }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>Progress:</span>
                      <strong style={{ color: strokeColor }}>{getGoalAchievementPercent(goalMetrics.goalName, hoveredPoint.val)}%</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Insights Section */}
            {currentUser?.sessionHistory && currentUser.sessionHistory.length > 0 && (
              <div className="insights-section">
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: strokeColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <Sparkles size={16} /> AI Goal Insights & Recommendations
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {generateGoalInsights(goalMetrics.goalName, currentUser).map((insight, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{insight.emoji}</span>
                      <span>{insight.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Yoga Poses Checklist Progress */}
          <div className="yoga-progress-checklist glass-panel animate-fade-in" style={{ animationDelay: '0.25s', padding: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h3>Yoga Library Progress</h3>
              <span className="badge" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', padding: '4px 10px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '600' }}>
                {performedPoses.length} / {performedPoses.length + toPerformPoses.length} Completed
              </span>
            </div>
            
            <div className="progress-bar" style={{ marginBottom: '24px', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${(performedPoses.length / (performedPoses.length + toPerformPoses.length || 1)) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00f2fe, #4facfe)',
                  borderRadius: '4px'
                }}
              ></div>
            </div>
            
            <div className="pose-lists-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Poses to Try */}
              <div className="pose-list-column">
                <h4 style={{ color: '#00f2fe', fontSize: '0.95rem', marginBottom: '12px' }}>🎯 Poses To Practice</h4>
                <div className="pose-mini-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {toPerformPoses.slice(0, 4).map(pose => (
                    <div key={pose.id} className="pose-mini-card glass-panel flex-between" style={{ padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="flex-center" style={{ gap: '10px', display: 'flex', alignItems: 'center' }}>
                        <img src={yogaImages[pose.name]?.cover || pose.image} alt={pose.name} className="pose-mini-img" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="pose-mini-name" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{pose.name.split(' (')[0]}</span>
                          <span className="pose-mini-level" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pose.level}</span>
                        </div>
                      </div>
                      <button 
                        className="btn-icon-circle flex-center" 
                        onClick={() => handlePracticePose(pose.id)} 
                        title="Start Practicing"
                        style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.2)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Play size={10} fill="#00f2fe" color="#00f2fe" />
                      </button>
                    </div>
                  ))}
                  {toPerformPoses.length === 0 && (
                    <p className="empty-list-text text-secondary" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>No poses left to practice! Great job!</p>
                  )}
                </div>
              </div>

              {/* Poses Performed */}
              <div className="pose-list-column">
                <h4 style={{ color: '#9b51e0', fontSize: '0.95rem', marginBottom: '12px' }}>✅ Poses Completed</h4>
                <div className="pose-mini-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {performedPoses.slice(0, 4).map(pose => (
                    <div key={pose.id} className="pose-mini-card glass-panel flex-between completed" style={{ padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div className="flex-center" style={{ gap: '10px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                        <img src={yogaImages[pose.name]?.cover || pose.image} alt={pose.name} className="pose-mini-img" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="pose-mini-name" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{pose.name.split(' (')[0]}</span>
                          <span className="pose-mini-level" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pose.level}</span>
                        </div>
                      </div>
                      <span className="pose-completed-check"><CheckCircle2 size={16} color="#00f2fe" /></span>
                    </div>
                  ))}
                  {performedPoses.length === 0 && (
                    <p className="empty-list-text text-secondary" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Complete a session to log your first pose!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Action Section: Plan & Guru */}
          <div className="action-grid animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="todays-plan glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="flex-between">Today's Practice Plan <Calendar size={20} color="#9b51e0" /></h3>
              <ul className="plan-list" style={{ flex: 1, padding: 0 }}>
                {todayPlanPoses.map(pose => {
                  const isCompleted = pose.status === 'completed';
                  const isSkipped = pose.status === 'skipped';
                  const isPending = pose.status === 'pending';
                  
                  return (
                    <li 
                      key={pose.poseId} 
                      className={`plan-item ${pose.status}`} 
                      style={{ 
                        cursor: isPending ? 'pointer' : 'default', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '10px', 
                        fontSize: '0.9rem',
                        opacity: isSkipped ? 0.5 : 1
                      }} 
                      onClick={() => {
                        if (isPending) handlePracticePose(pose.poseId);
                      }}
                    >
                      <div className="flex-center" style={{ gap: '10px', display: 'flex', alignItems: 'center' }}>
                        {isCompleted && <CheckCircle2 size={16} color="#00f2fe" />}
                        {isSkipped && <XCircle size={16} color="#ff4b4b" />}
                        {isPending && (
                          <div className="checkbox-empty" style={{ width: '14px', height: '14px', border: '1px solid var(--text-secondary)', borderRadius: '3px' }}></div> 
                        )}
                        <span style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>{pose.name.split(' (')[0]}</span>
                      </div>
                      
                      {isPending && (
                        <button 
                          onClick={(e) => handleSkipPose(e, pose.poseId)} 
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px'
                          }}
                          title="Skip Pose"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </li>
                  );
                })}
                {todayPlanPoses.length === 0 && (
                  <li className="plan-item pending" style={{ color: 'var(--text-secondary)' }}>
                    Generating today's routine...
                  </li>
                )}
              </ul>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingTop: '16px' }}>
                <button 
                  className="btn btn-primary glow-pulse" 
                  style={{ padding: '12px 24px', width: 'auto', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    if (firstPendingPose) {
                      handlePracticePose(firstPendingPose.poseId);
                    } else {
                      navigate('/yogabook');
                    }
                  }}
                >
                  {firstPendingPose ? 'Practice Now' : 'Explore Yoga Book'}
                </button>
              </div>
            </div>

            <div className="ai-guru-access glass-panel flex-center flex-column" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', boxSizing: 'border-box' }}>
              <div className="guru-avatar-wrapper" style={{ margin: '0 auto' }}>
                <img src={guruAvatar} alt="AI Yoga Guru" className="guru-avatar-img" />
              </div>
              <h3 style={{ margin: '16px 0 8px', textAlign: 'center' }}>AI Yoga Guru</h3>
              <p className="text-secondary text-center" style={{ fontSize: '0.9rem', marginBottom: '24px', textAlign: 'center' }}>
                Take suggestions from Yoga Guru
              </p>
              <button 
                className="btn btn-primary btn-large btn-full glow-pulse" 
                style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)', marginTop: 'auto' }}
                onClick={() => navigate('/ai-guru')}
              >
                <MessageSquare size={18} style={{ marginRight: '8px' }} /> Ask AI Yoga Guru
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Calendar & Social */}
        <div className="dashboard-col-right animate-fade-in" style={{ animationDelay: '0.4s' }}>

          {/* 5. Smart Calendar / Streak Chart */}
          <div className="smart-calendar glass-panel">
            <div className="flex-between" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Streak Calendar</h3>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                <button 
                  onClick={() => setCalendarView('week')}
                  style={{
                    background: calendarView === 'week' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: calendarView === 'week' ? '#00f2fe' : 'var(--text-secondary)',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Last 7 Days
                </button>
                <button 
                  onClick={() => setCalendarView('month')}
                  style={{
                    background: calendarView === 'month' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: calendarView === 'month' ? '#00f2fe' : 'var(--text-secondary)',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Month Grid
                </button>
              </div>
            </div>

            {calendarView === 'week' ? (
              <div className="calendar-legend-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  {last7Days.map((dayObj, idx) => (
                    <div 
                      key={idx} 
                      className={`cal-day ${dayObj.status !== 'missed' ? 'has-data' : ''} ${dayObj.isToday ? 'today' : ''}`}
                      style={{ flex: 1, margin: '0 4px', maxWidth: '40px', aspectRatio: '1', borderRadius: '50%' }}
                    >
                      <span className="day-num" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{dayObj.dayLabel[0]}</span>
                      {dayObj.status === 'completed' && <CheckCircle2 size={12} color="#00f2fe" className="day-icon" />}
                      {dayObj.status === 'missed' && <XCircle size={12} color="rgba(255,255,255,0.15)" className="day-icon" />}
                      {dayObj.status === 'perfect' && <Flame size={12} color="#f2994a" className="day-icon" />}
                    </div>
                  ))}
                </div>
                <div className="calendar-legend flex-center" style={{ justifyContent: 'center', gap: '16px', fontSize: '0.75rem' }}>
                  <span title="Completed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} color="#00f2fe" /> Completed</span>
                  <span title="Missed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} color="rgba(255,255,255,0.2)" /> Missed</span>
                  <span title="Perfect Streak" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={12} color="#f2994a" /> Streak Day</span>
                </div>
              </div>
            ) : (
              <>
                <div className="calendar-weekdays">
                  <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>

                <div className="calendar-grid">
                  {/* Empty padding cells for start of month */}
                  {Array.from({ length: startingEmptyCells }).map((_, i) => (
                    <div key={`empty-${i}`} className="cal-day empty"></div>
                  ))}

                  {calendarDays.map((dayObj, i) => (
                    <div key={i} className={`cal-day ${dayObj.status !== 'none' ? 'has-data' : ''} ${dayObj.isToday ? 'today' : ''}`}>
                      <span className="day-num">{dayObj.day}</span>
                      {dayObj.status === 'completed' && <CheckCircle2 size={16} color="#00f2fe" className="day-icon" />}
                      {dayObj.status === 'missed' && <XCircle size={16} color="rgba(255, 75, 75, 0.15)" className="day-icon" />}
                      {dayObj.status === 'perfect' && <Flame size={16} color="#f2994a" className="day-icon" />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 5b. Health Snapshot Card */}
          <div className="health-snapshot-card glass-panel mt-24" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#ff4b4b" /> Health Snapshot
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Avg Heart Rate</span>
                <strong style={{ fontSize: '1.2rem', color: '#ff4b4b' }}>{avgHeartRate} BPM</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Energy Score</span>
                <strong style={{ fontSize: '1.2rem', color: '#f2ca4a' }}>{energyScore}/100</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Stress Level</span>
                <strong style={{ fontSize: '1.2rem', color: stressLevel === 'Low' ? '#2ecc71' : stressLevel === 'High' ? '#ff4b4b' : '#f2994a' }}>{stressLevel}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Logged Mood</span>
                <strong style={{ fontSize: '1.2rem' }}>{currentMood || 'Not Logged'}</strong>
              </div>
            </div>
            
            {/* Mood logger */}
            <div>
              <span className="text-secondary" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>How are you feeling today?</span>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                {[
                  { emoji: '🧘', label: 'Zen' },
                  { emoji: '😊', label: 'Happy' },
                  { emoji: '😴', label: 'Tired' },
                  { emoji: '😰', label: 'Anxious' }
                ].map(m => (
                  <button 
                    key={m.emoji}
                    onClick={() => handleMoodSelect(m.emoji)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      background: currentMood === m.emoji ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: currentMood === m.emoji ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: currentMood === m.emoji ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                    title={m.label}
                  >
                    <span>{m.emoji}</span>
                    <span style={{ fontSize: '0.65rem' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5c. Weekly Summary Card */}
          <div className="weekly-summary-card glass-panel mt-24" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={20} color="#00f2fe" /> Weekly Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Sessions Completed</span>
                <strong style={{ fontSize: '1.2rem', color: '#00f2fe' }}>{weeklySummary.count}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Total Active Mins</span>
                <strong style={{ fontSize: '1.2rem', color: '#9b51e0' }}>{weeklySummary.minutes}m</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Average Accuracy</span>
                <strong style={{ fontSize: '1.2rem', color: '#4facfe' }}>{weeklySummary.avgAccuracy}%</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Calories Burned</span>
                <strong style={{ fontSize: '1.2rem', color: '#ff4b4b' }}>{weeklySummary.calories} kcal</strong>
              </div>
            </div>
          </div>

          {/* 6. Achievements & Social */}
          <div className="gamification-section glass-panel mt-24">
            <h3 style={{ marginBottom: '16px' }}>Achievements</h3>
            <div className="badges-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {calculateAchievements(currentUser).map(badge => (
                <div 
                  key={badge.id} 
                  className={`achievement-badge ${badge.unlocked ? 'unlocked' : 'locked'}`}
                  title={`${badge.name}: ${badge.description}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '4px', filter: badge.unlocked ? 'none' : 'grayscale(100%)', opacity: badge.unlocked ? 1 : 0.4 }}>
                    {badge.icon}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: badge.unlocked ? '#fff' : 'var(--text-secondary)', textAlign: 'center' }}>
                    {badge.name.split(' ')[0]} {badge.name.split(' ')[1] || ''}
                  </span>
                  
                  {/* Progress bar below the badge */}
                  <div style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${badge.progress}%`, height: '100%', background: badge.unlocked ? 'linear-gradient(90deg, #00f2fe, #4facfe)' : 'rgba(255,255,255,0.3)', borderRadius: '2px' }}></div>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{badge.progress}%</span>
                </div>
              ))}
            </div>

            <h3 style={{ margin: '24px 0 16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>Social</h3>
            {upcomingSession ? (
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Video size={18} color="#00f2fe" />
                  <h4 style={{ fontSize: '0.9rem', margin: 0, color: '#00f2fe' }}>Upcoming Virtual Session</h4>
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Session:</strong> {upcomingSession.name}</div>
                  <div><strong>Date:</strong> {upcomingSession.date}</div>
                  <div><strong>Time:</strong> {upcomingSession.time} PM</div>
                  <div><strong>Instructor:</strong> {upcomingSession.instructor}</div>
                </div>
                <button 
                  className="btn btn-primary btn-full btn-small glow-pulse"
                  style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)' }}
                  onClick={() => navigate('/virtual-session', { state: { startImmediately: true, name: upcomingSession.name } })}
                >
                  Join Session
                </button>
              </div>
            ) : (
              <div className="glass-panel text-center" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0 0 12px' }}>No upcoming sessions scheduled.</p>
                <button 
                  className="btn btn-glass btn-full btn-small"
                  onClick={() => navigate('/virtual-session')}
                >
                  Schedule one now
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Dynamic Goal progress generator ---
function generateGoalMetrics(userGoal, userData) {
  const history = userData?.sessionHistory || [];
  
  const currentWeight = userData?.weight || 72;
  const targetWeight = userData?.weightGoal || 70;
  const startWeight = userData?.startWeight || 75;
  
  switch (userGoal) {
    case 'Weight Loss': {
      const weightLost = startWeight - currentWeight;
      const targetLost = startWeight - targetWeight;
      const percent = targetLost > 0 ? Math.max(0, Math.min(100, Math.round((weightLost / targetLost) * 100))) : 0;
      
      const w1 = startWeight;
      const w2 = startWeight - (weightLost * 0.4);
      const w3 = startWeight - (weightLost * 0.8);
      const w4 = currentWeight;
      
      return {
        goalName: "Weight Loss",
        metrics: [
          { label: "Initial Weight", value: `${startWeight} kg` },
          { label: "Current Weight", value: `${currentWeight} kg` },
          { label: "Target Weight", value: `${targetWeight} kg` },
          { label: "Total Weight Lost", value: `${weightLost.toFixed(1)} kg` }
        ],
        percentage: percent,
        chartData: [
          { label: "Start", val: w1, cx: 0, cy: 120 - ((w1 - targetWeight) / (startWeight - targetWeight || 1) * 80) },
          { label: "Week 2", val: w2, cx: 130, cy: 120 - ((w2 - targetWeight) / (startWeight - targetWeight || 1) * 80) },
          { label: "Week 3", val: w3, cx: 270, cy: 120 - ((w3 - targetWeight) / (startWeight - targetWeight || 1) * 80) },
          { label: "Current", val: w4, cx: 400, cy: 120 - ((w4 - targetWeight) / (startWeight - targetWeight || 1) * 80) }
        ],
        badgeText: `Start: ${startWeight}kg → Current: ${currentWeight}kg → Target: ${targetWeight}kg`
      };
    }
    
    case 'Flexibility': {
      const flexSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('stretch') || s.poseName.toLowerCase().includes('triangle') || s.poseName.toLowerCase().includes('downward') || s.poseName.toLowerCase().includes('cobra') || s.poseName.toLowerCase().includes('tree')));
      const flexCount = flexSessions.length;
      const avgAccuracy = flexSessions.length > 0 ? Math.round(flexSessions.reduce((sum, s) => sum + s.accuracy, 0) / flexSessions.length) : 85;
      const mobilityScore = Math.min(100, 60 + flexCount * 2);
      
      return {
        goalName: "Flexibility",
        metrics: [
          { label: "Flexibility Sessions", value: `${flexCount} completed` },
          { label: "Average Accuracy", value: `${avgAccuracy}%` },
          { label: "Mobility Score", value: `${mobilityScore}/100` }
        ],
        percentage: mobilityScore,
        chartData: [
          { label: "Start", val: 60, cx: 0, cy: 120 - (60 / 100 * 80) },
          { label: "Week 2", val: Math.min(100, 60 + Math.round(flexCount * 0.4) * 2), cx: 130, cy: 120 - (Math.min(100, 60 + Math.round(flexCount * 0.4) * 2) / 100 * 80) },
          { label: "Week 3", val: Math.min(100, 60 + Math.round(flexCount * 0.8) * 2), cx: 270, cy: 120 - (Math.min(100, 60 + Math.round(flexCount * 0.8) * 2) / 100 * 80) },
          { label: "Current", val: mobilityScore, cx: 400, cy: 120 - (mobilityScore / 100 * 80) }
        ],
        badgeText: `Mobility Score: ${mobilityScore}% | Accuracy: ${avgAccuracy}%`
      };
    }
    
    case 'Strength': {
      const strengthSessions = history.filter(s => s.poseName && (s.poseName.toLowerCase().includes('warrior') || s.poseName.toLowerCase().includes('plank') || s.poseName.toLowerCase().includes('boat') || s.poseName.toLowerCase().includes('chair') || s.poseName.toLowerCase().includes('bridge')));
      const strengthCount = strengthSessions.length;
      const avgDuration = strengthSessions.length > 0 ? Math.round(strengthSessions.reduce((sum, s) => sum + s.duration, 0) / strengthSessions.length) : 600;
      const avgDurationMin = Math.round(avgDuration / 60);
      const holdImprovement = Math.min(100, strengthCount * 4);
      
      return {
        goalName: "Strength Building",
        metrics: [
          { label: "Strength Sessions", value: `${strengthCount} completed` },
          { label: "Average Duration", value: `${avgDurationMin} mins` },
          { label: "Hold Improvement", value: `+${holdImprovement}%` }
        ],
        percentage: holdImprovement,
        chartData: [
          { label: "Start", val: 5, cx: 0, cy: 120 - (5 / 100 * 80) },
          { label: "Week 2", val: Math.min(100, Math.round(strengthCount * 1.5)), cx: 130, cy: 120 - (Math.min(100, Math.round(strengthCount * 1.5)) / 100 * 80) },
          { label: "Week 3", val: Math.min(100, Math.round(strengthCount * 3)), cx: 270, cy: 120 - (Math.min(100, Math.round(strengthCount * 3)) / 100 * 80) },
          { label: "Current", val: holdImprovement, cx: 400, cy: 120 - (holdImprovement / 100 * 80) }
        ],
        badgeText: `Hold endurance: +${holdImprovement}% | Sessions: ${strengthCount}`
      };
    }
    
    case 'Stress Relief': {
      const meditationSessions = history.filter(s => s.type === 'meditation' || (s.poseName && (s.poseName.toLowerCase().includes('swastikasana') || s.poseName.toLowerCase().includes('corpse') || s.poseName.toLowerCase().includes('shavasana'))));
      const medCount = meditationSessions.length;
      const totalMindfulMinutes = meditationSessions.length > 0 ? Math.round(meditationSessions.reduce((sum, s) => sum + s.duration, 0) / 60) : 0;
      const heartRateCalming = medCount > 0 ? Math.min(15, medCount * 1.2) : 5;
      
      const percent = Math.min(100, Math.round((totalMindfulMinutes / 120) * 100));
      
      return {
        goalName: "Stress Relief",
        metrics: [
          { label: "Meditation Completed", value: `${medCount} sessions` },
          { label: "HR Calmed", value: `-${heartRateCalming.toFixed(1)} BPM` },
          { label: "Mindful Time", value: `${totalMindfulMinutes} mins` }
        ],
        percentage: percent,
        chartData: [
          { label: "Start", val: 78, cx: 0, cy: 120 - ((78 - 60) / 20 * 80) },
          { label: "Week 2", val: Math.max(60, 78 - heartRateCalming * 0.4), cx: 130, cy: 120 - ((Math.max(60, 78 - heartRateCalming * 0.4) - 60) / 20 * 80) },
          { label: "Week 3", val: Math.max(60, 78 - heartRateCalming * 0.8), cx: 270, cy: 120 - ((Math.max(60, 78 - heartRateCalming * 0.8) - 60) / 20 * 80) },
          { label: "Current", val: Math.max(60, 78 - heartRateCalming), cx: 400, cy: 120 - ((Math.max(60, 78 - heartRateCalming) - 60) / 20 * 80) }
        ],
        badgeText: `Mindful: ${totalMindfulMinutes}m / 120m | Stress Reduced`
      };
    }
    
    default: {
      const avgAccuracy = history.length > 0 ? Math.round(history.reduce((sum, s) => sum + s.accuracy, 0) / history.length) : 85;
      const correctPosturePercent = Math.min(100, Math.round(avgAccuracy * 1.05));
      const alignmentScore = Math.min(100, 70 + (history.length * 1.5));
      
      return {
        goalName: userGoal === 'General Fitness' ? 'General Fitness' : 'Posture Correction',
        metrics: [
          { label: "Posture Accuracy", value: `${avgAccuracy}%` },
          { label: "Alignment Score", value: `${alignmentScore}/100` },
          { label: "Correct Hold %", value: `${correctPosturePercent}%` }
        ],
        percentage: alignmentScore,
        chartData: [
          { label: "Start", val: 70, cx: 0, cy: 120 - (70 / 100 * 80) },
          { label: "Week 2", val: Math.min(100, 70 + Math.round(history.length * 0.3) * 1.5), cx: 130, cy: 120 - (Math.min(100, 70 + Math.round(history.length * 0.3) * 1.5) / 100 * 80) },
          { label: "Week 3", val: Math.min(100, 70 + Math.round(history.length * 0.7) * 1.5), cx: 270, cy: 120 - (Math.min(100, 70 + Math.round(history.length * 0.7) * 1.5) / 100 * 80) },
          { label: "Current", val: alignmentScore, cx: 400, cy: 120 - (alignmentScore / 100 * 80) }
        ],
        badgeText: `Alignment Score: ${alignmentScore}/100 | Accuracy: ${avgAccuracy}%`
      };
    }
  }
}

// --- Dynamic Achievements Calculator ---
function calculateAchievements(userData) {
  const history = userData?.sessionHistory || [];
  const streak = userData?.streak || 0;
  const totalSessions = history.length;
  
  const medSessions = history.filter(s => s.type === 'meditation' || (s.poseName && (s.poseName.toLowerCase().includes('swastikasana') || s.poseName.toLowerCase().includes('corpse') || s.poseName.toLowerCase().includes('shavasana')))).length;
  const hasHighBpmSession = history.some(s => s.avgBpm >= 95);
  
  let goalProgressPercent = 0;
  const startWeight = userData?.startWeight || 75;
  const currentWeight = userData?.weight || 72;
  const targetWeight = userData?.weightGoal || 70;
  if (userData?.mainGoal === 'Weight Loss') {
    const weightLost = startWeight - currentWeight;
    const targetLost = startWeight - targetWeight;
    goalProgressPercent = targetLost > 0 ? Math.max(0, Math.min(100, Math.round((weightLost / targetLost) * 100))) : 0;
  } else {
    goalProgressPercent = Math.min(100, Math.round((totalSessions / 15) * 100));
  }

  return [
    {
      id: 'first_session',
      name: 'First Session',
      icon: '🏆',
      description: 'Log your first active session',
      unlocked: totalSessions >= 1,
      progress: totalSessions >= 1 ? 100 : 0
    },
    {
      id: 'streak_7',
      name: '7-Day Streak',
      icon: '🔥',
      description: 'Maintain a 7-day consistency streak',
      unlocked: streak >= 7,
      progress: Math.min(100, Math.round((streak / 7) * 100))
    },
    {
      id: 'sessions_10',
      name: '10 Sessions',
      icon: '💪',
      description: 'Complete 10 sessions on your mat',
      unlocked: totalSessions >= 10,
      progress: Math.min(100, Math.round((totalSessions / 10) * 100))
    },
    {
      id: 'meditation_master',
      name: 'Zen Master',
      icon: '🧘',
      description: 'Complete 3 mindfulness sessions',
      unlocked: medSessions >= 3,
      progress: Math.min(100, Math.round((medSessions / 3) * 100))
    },
    {
      id: 'heart_health',
      name: 'Heart Hero',
      icon: '❤️',
      description: 'Complete any high-cardio session (BPM >= 95)',
      unlocked: hasHighBpmSession,
      progress: hasHighBpmSession ? 100 : Math.min(100, Math.round((totalSessions / 5) * 100))
    },
    {
      id: 'goal_achiever',
      name: 'Goal Achiever',
      icon: '🎯',
      description: 'Reach 100% on your primary goal',
      unlocked: goalProgressPercent >= 100,
      progress: goalProgressPercent
    }
  ];
}

// Just importing ListChecks here to avoid error since I didn't import at top
function ListChecks(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>
}

function StartYogaTab() {
  return (
    <div className="tab-content start-tab">
      <div className="live-view glass-panel">
        <div className="camera-feed">
          <div className="pose-skeleton">
            {/* Mockup for AI pose tracking */}
            <Activity className="pulse-icon glow-pulse" size={48} color="#00f2fe" />
            <p>Stand on your AuraMat to begin tracking</p>
          </div>
        </div>
        <div className="session-controls flex-center">
          <button className="btn btn-primary btn-large">Start Recording</button>
        </div>
      </div>

      <div className="realtime-stats glass-panel">
        <h3>Live Feedback</h3>
        <p className="feedback-text text-gradient-purple">"Keep your back straight. Breathe in deeply."</p>
        <div className="progress-bar"><div className="progress-fill" style={{ width: '70%' }}></div></div>
      </div>
    </div>
  );
}

function GuruTab() {
  return (
    <div className="tab-content guru-tab">
      <div className="chat-interface glass-panel">
        <div className="chat-messages">
          <div className="message guru-message glass-panel">
            <div className="msg-avatar"><Sparkles size={16} color="#00f2fe" /></div>
            <p>Namaste! I noticed your lower back was a bit tense during yesterday's session. Should we focus on gentle stretches today?</p>
          </div>
          <div className="message user-message glass-panel">
            <p>Yes, please. Can you recommend a 15-minute routine?</p>
          </div>
        </div>
        <div className="chat-input-area">
          <input type="text" className="chat-input glass-panel" placeholder="Ask your AI Guru anything..." />
          <button className="btn btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}
