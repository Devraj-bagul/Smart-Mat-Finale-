import { auth, db, isFirebaseConfigured } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { yogaPoses } from '../data/yogaPoses';

export function calculateCurrentStreak(sessionHistory) {
  if (!sessionHistory || sessionHistory.length === 0) return 0;
  
  const uniqueDates = new Set();
  sessionHistory.forEach(s => {
    if (!s.date) return;
    const d = new Date(s.date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    uniqueDates.add(`${y}-${m}-${day}`);
  });

  const getLocalDateString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  let checkDate = new Date(today);
  
  let todayStr = getLocalDateString(checkDate);
  let hasToday = uniqueDates.has(todayStr);

  let yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  let yesterdayStr = getLocalDateString(yesterday);
  let hasYesterday = uniqueDates.has(yesterdayStr);

  if (!hasToday && !hasYesterday) {
    return 0;
  }

  if (hasToday) {
    checkDate = today;
  } else {
    checkDate = yesterday;
  }

  let streak = 0;
  while (true) {
    const dateStr = getLocalDateString(checkDate);
    if (uniqueDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getPoseNameById(id) {
  if (!yogaPoses) return "Yoga Pose";
  const pose = yogaPoses.find(p => p.id === Number(id));
  return pose ? pose.name : "Yoga Pose";
}

function seedSessionHistory(user) {
  if (user.sessionHistory && user.sessionHistory.length > 0) return user;
  
  const history = [];
  const today = new Date();
  const completedPoseIds = [1, 3, 6, 12, 17];
  
  // Seed the streak days (yesterday down to 5 days ago)
  for (let i = 1; i <= 5; i++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - i);
    sDate.setHours(8, 30, 0, 0);
    
    const poseId = completedPoseIds[(i - 1) % completedPoseIds.length];
    history.push({
      id: "session_streak_" + i,
      date: sDate.toISOString(),
      duration: 600 + Math.floor(Math.random() * 600), // 10-20 mins
      avgBpm: 75 + Math.floor(Math.random() * 20),
      poseId: poseId,
      poseName: getPoseNameById(poseId),
      accuracy: 80 + Math.floor(Math.random() * 15),
      caloriesBurned: 60 + Math.floor(Math.random() * 40),
      type: "yoga"
    });
  }
  
  // Seed remaining 37 sessions randomly in the past (6 to 60 days ago)
  let count = 6;
  const usedDates = new Set();
  for (let i = 1; i <= 5; i++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - i);
    usedDates.add(sDate.toDateString());
  }
  
  while (history.length < 42) {
    const daysAgo = 6 + Math.floor(Math.random() * 50);
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - daysAgo);
    
    if (usedDates.has(sDate.toDateString()) && Math.random() > 0.3) {
      continue;
    }
    usedDates.add(sDate.toDateString());
    sDate.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
    
    const poseId = 1 + Math.floor(Math.random() * 30);
    history.push({
      id: "session_hist_" + count,
      date: sDate.toISOString(),
      duration: 600 + Math.floor(Math.random() * 600),
      avgBpm: 75 + Math.floor(Math.random() * 20),
      poseId: poseId,
      poseName: getPoseNameById(poseId),
      accuracy: 75 + Math.floor(Math.random() * 20),
      caloriesBurned: 50 + Math.floor(Math.random() * 50),
      type: Math.random() > 0.85 ? "meditation" : "yoga"
    });
    count++;
  }
  
  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  user.sessionHistory = history;
  user.streak = 5;
  user.totalSessions = history.length;
  user.totalTime = history.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  user.caloriesBurned = history.reduce((sum, s) => sum + s.caloriesBurned, 0);
  user.startWeight = 76.0;
  user.weight = 72.0;
  user.weightGoal = 70.0;
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + 2);
  targetDate.setHours(19, 0, 0, 0);
  
  user.scheduledSessions = [
    {
      id: "virtual_session_default",
      name: "Work on back",
      date: targetDate.toISOString().split('T')[0],
      time: "19:00",
      instructor: "AI Yoga Guru",
      type: "virtual"
    }
  ];
  
  return user;
}

const DEFAULT_USER = {
  id: "user_khushal",
  name: "Khushal Gawal",
  email: "khushal@smartmat.com",
  contactNo: "+91 9876543210",
  gender: "Male",
  age: 24,
  height: 178, // cm
  weight: 72.0, // kg
  fitnessLevel: "Intermediate",
  mainGoal: "Weight Loss",
  hasMedicalCondition: false,
  medicalConditionDetails: "",
  timeCommitment: 30, // mins/day
  photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80", // Premium avatar
  emergencyContactName: "Relative Support",
  emergencyContactPhone: "+91 9876543211",
  emergencyContactEmail: "relative@example.com",
  emergencyContactRelation: "Spouse",
  
  // Progress Metrics
  streak: 5,
  totalSessions: 42,
  totalTime: 1110, // minutes (18.5 hours)
  caloriesBurned: 8400,
  weightGoal: 70.0, // Target weight
  
  // Poses tracking
  posesPerformed: [1, 3, 6, 12, 17], // Mountain, Tree, Warrior II, Chair, Bridge
  posesToPerform: [2, 4, 7, 9, 10, 14, 27, 28] // Downward Dog, Plank, Cobra, Crow, Boat, Triangle, Warrior I, Warrior III
};

const USERS_REGISTRY_KEY = 'yoga_users_registry';
const ACTIVE_USER_KEY = 'yoga_user_db';

export const dbService = {
  init() {
    if (!localStorage.getItem(ACTIVE_USER_KEY)) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(seedSessionHistory({ ...DEFAULT_USER })));
    } else {
      try {
        const user = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY));
        if (!user.sessionHistory || user.sessionHistory.length === 0) {
          const seeded = seedSessionHistory(user);
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(seeded));
        }
      } catch (e) {
        console.error("Error seeding active user:", e);
      }
    }
    if (!localStorage.getItem(USERS_REGISTRY_KEY)) {
      localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify([seedSessionHistory({ ...DEFAULT_USER })]));
    }
  },

  setupAuthObserver() {
    if (isFirebaseConfigured && auth) {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(userData));
              localStorage.setItem('session_active', 'true');
              window.dispatchEvent(new Event('userDataUpdated'));
            }
          } catch (error) {
            console.error("Auth observer: failed to fetch user document", error);
          }
        } else {
          if (localStorage.getItem('session_active') === 'true') {
            localStorage.removeItem(ACTIVE_USER_KEY);
            localStorage.removeItem('session_active');
            window.dispatchEvent(new Event('userDataUpdated'));
          }
        }
      });
    }
  },

  getCurrentUser() {
    this.init();
    try {
      const activeUser = localStorage.getItem(ACTIVE_USER_KEY);
      return activeUser ? JSON.parse(activeUser) : DEFAULT_USER;
    } catch (e) {
      console.error("Failed to parse active user", e);
      return DEFAULT_USER;
    }
  },

  async registerUser(email, password, additionalData) {
    this.init();
    const cleanEmail = email.trim().toLowerCase();

    if (isFirebaseConfigured) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const uid = userCredential.user.uid;
        const newUserData = {
          id: uid,
          email: cleanEmail,
          name: additionalData.name || cleanEmail.split('@')[0],
          contactNo: additionalData.contactNo || "",
          gender: additionalData.gender || "Male",
          age: Number(additionalData.age) || 24,
          height: Number(additionalData.height) || 170,
          weight: Number(additionalData.weight) || 60,
          fitnessLevel: additionalData.fitnessLevel || "Beginner",
          mainGoal: additionalData.mainGoal || "Weight Loss",
          hasMedicalCondition: additionalData.hasMedicalCondition ?? false,
          medicalConditionDetails: additionalData.medicalConditionDetails || "",
          timeCommitment: Number(additionalData.timeCommitment) || 30,
          photo: additionalData.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
          emergencyContactName: additionalData.emergencyContactName || "Relative Support",
          emergencyContactPhone: additionalData.emergencyContactPhone || "+91 9876543211",
          emergencyContactEmail: additionalData.emergencyContactEmail || "relative@example.com",
          emergencyContactRelation: additionalData.emergencyContactRelation || "Spouse",
          streak: 1,
          totalSessions: 0,
          totalTime: 0,
          caloriesBurned: 0,
          weightGoal: Number(additionalData.weightGoal) || 58,
          posesPerformed: [],
          posesToPerform: [1, 2, 3, 4, 6, 7, 9, 10, 12, 14, 17, 27, 28]
        };

        // Store user details in Firestore
        await setDoc(doc(db, "users", uid), newUserData);

        // Store user details locally for active session
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(newUserData));
        window.dispatchEvent(new Event('userDataUpdated'));
        return newUserData;
      } catch (error) {
        console.error("Firebase registration failed", error);
        throw error;
      }
    } else {
      // Local storage simulation
      const registry = JSON.parse(localStorage.getItem(USERS_REGISTRY_KEY)) || [];
      if (registry.some(user => user.email.toLowerCase() === cleanEmail)) {
        throw new Error("An account with this email already exists.");
      }

      const newUserData = {
        id: "user_" + Date.now(),
        email: cleanEmail,
        password, // stored locally for simulation check
        name: additionalData.name || cleanEmail.split('@')[0],
        contactNo: additionalData.contactNo || "",
        gender: additionalData.gender || "Male",
        age: Number(additionalData.age) || 24,
        height: Number(additionalData.height) || 170,
        weight: Number(additionalData.weight) || 60,
        fitnessLevel: additionalData.fitnessLevel || "Beginner",
        mainGoal: additionalData.mainGoal || "Weight Loss",
        hasMedicalCondition: additionalData.hasMedicalCondition ?? false,
        medicalConditionDetails: additionalData.medicalConditionDetails || "",
        timeCommitment: Number(additionalData.timeCommitment) || 30,
        photo: additionalData.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
        emergencyContactName: additionalData.emergencyContactName || "Relative Support",
        emergencyContactPhone: additionalData.emergencyContactPhone || "+91 9876543211",
        emergencyContactEmail: additionalData.emergencyContactEmail || "relative@example.com",
        emergencyContactRelation: additionalData.emergencyContactRelation || "Spouse",
        streak: 1,
        totalSessions: 0,
        totalTime: 0,
        caloriesBurned: 0,
        weightGoal: Number(additionalData.weightGoal) || 58,
        posesPerformed: [],
        posesToPerform: [1, 2, 3, 4, 6, 7, 9, 10, 12, 14, 17, 27, 28]
      };

      registry.push(newUserData);
      localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(newUserData));
      window.dispatchEvent(new Event('userDataUpdated'));
      return newUserData;
    }
  },

  async loginUser(email, password) {
    this.init();
    const cleanEmail = email.trim().toLowerCase();

    if (isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const uid = userCredential.user.uid;
        
        // Fetch user document from Firestore
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(userData));
          window.dispatchEvent(new Event('userDataUpdated'));
          return userData;
        } else {
          // If Firestore document does not exist, recreate it using basic auth info
          const defaultUserData = {
            id: uid,
            email: cleanEmail,
            name: cleanEmail.split('@')[0],
            photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
            streak: 1,
            totalSessions: 0,
            totalTime: 0,
            caloriesBurned: 0,
            weightGoal: 60,
            posesPerformed: [],
            posesToPerform: [1, 2, 3, 4, 6, 7, 9, 10, 12, 14, 17, 27, 28]
          };
          await setDoc(userDocRef, defaultUserData);
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(defaultUserData));
          window.dispatchEvent(new Event('userDataUpdated'));
          return defaultUserData;
        }
      } catch (error) {
        console.error("Firebase authentication failed", error);
        throw error;
      }
    } else {
      // Local storage simulation
      const registry = JSON.parse(localStorage.getItem(USERS_REGISTRY_KEY)) || [];
      const user = registry.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
      
      if (!user) {
        throw new Error("Invalid email or password.");
      }

      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('userDataUpdated'));
      return user;
    }
  },

  async updateCurrentUser(userData) {
    this.init();
    const current = this.getCurrentUser();
    const updated = { ...current, ...userData };
    
    // Save locally
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updated));

    if (isFirebaseConfigured && auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        await setDoc(doc(db, "users", uid), updated, { merge: true });
      } catch (error) {
        console.error("Failed to sync profile update to cloud:", error);
      }
    } else if (!isFirebaseConfigured) {
      // Update in registry
      const registry = JSON.parse(localStorage.getItem(USERS_REGISTRY_KEY)) || [];
      const updatedRegistry = registry.map(u => u.email.toLowerCase() === current.email.toLowerCase() ? { ...u, ...userData } : u);
      localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(updatedRegistry));
    }

    // Dispatch event to trigger UI reactivity
    window.dispatchEvent(new Event('userDataUpdated'));
    return updated;
  },

  async logoutUser() {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem('session_active');
    
    if (isFirebaseConfigured) {
      try {
        await firebaseSignOut(auth);
      } catch (error) {
        console.error("Firebase sign out failed", error);
      }
    }
    
    window.dispatchEvent(new Event('userDataUpdated'));
  },

  completeSession(durationSeconds, avgBpm, poseId, accuracy = 85) {
    this.init();
    const user = this.getCurrentUser();
    
    const performed = new Set(user.posesPerformed || []);
    let poseName = "Yoga Session";
    
    if (poseId) {
      performed.add(Number(poseId));
      poseName = getPoseNameById(Number(poseId));
    }

    const toPerform = (user.posesToPerform || []).filter(id => id !== Number(poseId));
    const minutes = Math.max(1, Math.round(durationSeconds / 60));
    const kcal = minutes * 6;

    const newSession = {
      id: "session_" + Date.now(),
      date: new Date().toISOString(),
      duration: durationSeconds,
      avgBpm: avgBpm || 80,
      poseId: poseId ? Number(poseId) : null,
      poseName: poseName,
      accuracy: accuracy || 85,
      caloriesBurned: kcal,
      type: "yoga"
    };

    const history = user.sessionHistory || [];
    history.push(newSession);

    const newStreak = calculateCurrentStreak(history);

    let todayPlan = user.todayPlan || null;
    if (todayPlan && todayPlan.poses && poseId) {
      todayPlan.poses = todayPlan.poses.map(p => {
        if (p.poseId === Number(poseId)) {
          return { ...p, status: 'completed' };
        }
        return p;
      });
    }

    const updated = {
      ...user,
      totalSessions: history.length,
      totalTime: (user.totalTime || 0) + minutes,
      caloriesBurned: (user.caloriesBurned || 0) + kcal,
      posesPerformed: Array.from(performed),
      posesToPerform: toPerform,
      sessionHistory: history,
      streak: newStreak,
      todayPlan: todayPlan
    };
    
    this.updateCurrentUser(updated);
    return updated;
  },

  incrementActiveTime(seconds) {
    this.init();
    const user = this.getCurrentUser();
    
    const todayStr = new Date().toDateString();
    let totalTime = user.totalTimeToday || 0;
    if (user.lastActiveDate !== todayStr) {
      totalTime = 0;
    }
    
    const updated = {
      ...user,
      totalTimeToday: totalTime + seconds,
      lastActiveDate: todayStr
    };
    
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('userDataUpdated'));
    
    this.syncActiveTimeCloud(updated);
    return updated;
  },

  syncActiveTimeCloud: (() => {
    let timeout = null;
    return function(userData) {
      if (isFirebaseConfigured && auth.currentUser) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(async () => {
          try {
            const uid = auth.currentUser.uid;
            await setDoc(doc(db, "users", uid), {
              totalTimeToday: userData.totalTimeToday,
              lastActiveDate: userData.lastActiveDate
            }, { merge: true });
          } catch (e) {
            console.error("Failed to sync active time to cloud:", e);
          }
        }, 5000);
      }
    };
  })(),

  scheduleVirtualSession(session) {
    this.init();
    const user = this.getCurrentUser();
    
    const scheduled = user.scheduledSessions || [];
    const newSession = {
      id: "virtual_" + Date.now(),
      name: session.name,
      date: session.date,
      time: session.time,
      instructor: session.instructor || "AI Yoga Guru",
      type: session.type || "virtual"
    };
    scheduled.push(newSession);
    
    const updated = {
      ...user,
      scheduledSessions: scheduled
    };
    
    this.updateCurrentUser(updated);
    return updated;
  },

  getUpcomingSession() {
    const user = this.getCurrentUser();
    const scheduled = user.scheduledSessions || [];
    const now = new Date();
    
    const futureSessions = scheduled.filter(s => {
      const [year, month, day] = s.date.split('-').map(Number);
      const [hour, minute] = s.time.split(':').map(Number);
      const sDateTime = new Date(year, month - 1, day, hour, minute);
      return sDateTime > now;
    });
    
    futureSessions.sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time}`);
      const bTime = new Date(`${b.date}T${b.time}`);
      return aTime - bTime;
    });
    
    return futureSessions.length > 0 ? futureSessions[0] : null;
  }
};
