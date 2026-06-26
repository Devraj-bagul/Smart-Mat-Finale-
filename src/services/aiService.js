import { GoogleGenerativeAI } from '@google/generative-ai';
import { yogaPoses } from '../data/yogaPoses';

// Language Config Helper
export function getLanguageConfig(selectedLanguage) {
  const lang = selectedLanguage || 'en-IN';
  if (lang === 'hi-IN' || lang.toLowerCase() === 'hindi') {
    return {
      language: "Hindi",
      speechRecognition: "hi-IN",
      speechSynthesis: "hi-IN"
    };
  }
  if (lang === 'mr-IN' || lang.toLowerCase() === 'marathi') {
    return {
      language: "Marathi",
      speechRecognition: "mr-IN",
      speechSynthesis: "mr-IN"
    };
  }
  return {
    language: "English",
    speechRecognition: "en-IN",
    speechSynthesis: "en-IN"
  };
}

// Helper to calculate health metrics from user history and logs
export function getHealthMetrics(user) {
  const todayStr = new Date().toDateString();
  const currentMood = user?.moodLogs?.[todayStr] || null;
  const history = user?.sessionHistory || [];
  
  let stressLevel = "Normal";
  if (currentMood === '🧘' || currentMood === '😊') stressLevel = "Low";
  else if (currentMood === '😴') stressLevel = "Medium";
  else if (currentMood === '😰') stressLevel = "High";
  else {
    const todaySessionsCount = history.filter(s => new Date(s.date).toDateString() === todayStr).length;
    if (todaySessionsCount > 0) stressLevel = "Low";
  }

  const todaySessionsCount = history.filter(s => new Date(s.date).toDateString() === todayStr).length;
  let energyScore = 75 + (todaySessionsCount * 5);
  if (currentMood === '🧘') energyScore += 10;
  if (currentMood === '😊') energyScore += 5;
  if (currentMood === '😴') energyScore -= 10;
  if (currentMood === '😰') energyScore -= 15;
  energyScore = Math.max(10, Math.min(100, energyScore));

  let heartRate = 72;
  if (history.length > 0) {
    const totalHr = history.reduce((sum, s) => sum + s.avgBpm, 0);
    heartRate = Math.round(totalHr / history.length);
  }

  return {
    mood: currentMood,
    stressLevel,
    energyScore,
    heartRate,
    todaySessionsCount
  };
}

// Calculate BMI
export function calculateBMI(weight, height) {
  if (!weight || !height) return 22.0;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

// Get BMI Category text (Localized)
export function getBMICategory(bmi, language = 'en-IN') {
  const cfg = getLanguageConfig(language);
  if (cfg.language === 'Hindi') {
    if (bmi < 18.5) return 'कम वजन (Underweight)';
    if (bmi < 25) return 'सामान्य वजन (Normal)';
    if (bmi < 30) return 'अधिक वजन (Overweight)';
    return 'मोटापा (Obese)';
  }
  if (cfg.language === 'Marathi') {
    if (bmi < 18.5) return 'कमी वजन (Underweight)';
    if (bmi < 25) return 'सामान्य वजन (Normal)';
    if (bmi < 30) return 'जादा वजन (Overweight)';
    return 'स्थूलपणा (Obese)';
  }
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// Local Rule-Based Recommendation Engine (Approach 2 Fallback with full multilingual support)
export const localRecommendationEngine = {
  getYogaPoses(user, language = 'en-IN') {
    const goal = user.mainGoal || 'Weight Loss';
    const level = user.fitnessLevel || 'Beginner';
    const bmi = calculateBMI(user.weight, user.height);
    const bmiCat = getBMICategory(bmi, language);
    const cfg = getLanguageConfig(language);
    
    // Select poses based on goal and level
    let matchedPoses = yogaPoses.filter(p => p.level === level && p.goal === goal);
    if (matchedPoses.length === 0) {
      matchedPoses = yogaPoses.filter(p => p.goal === goal);
    }
    if (matchedPoses.length === 0) {
      matchedPoses = yogaPoses.filter(p => p.level === level);
    }
    if (matchedPoses.length === 0) {
      matchedPoses = yogaPoses.slice(0, 4);
    }

    const posesToRecommend = matchedPoses.slice(0, 4);

    return posesToRecommend.map(pose => {
      let why = '';
      let localName = pose.name;
      let localLevel = pose.level;
      let localDuration = level === 'Beginner' ? '2 min' : level === 'Intermediate' ? '3 min' : '5 min';
      let localBenefits = pose.benefits || [];

      if (cfg.language === 'Hindi') {
        // Translation mapper
        localLevel = level === 'Beginner' ? 'शुरुआती (Beginner)' : level === 'Intermediate' ? 'मध्यम (Intermediate)' : 'उन्नत (Advanced)';
        localDuration = level === 'Beginner' ? '2 मिनट' : level === 'Intermediate' ? '3 मिनट' : '5 मिनट';
        
        if (goal === 'Weight Loss') {
          why = `चूंकि आपका लक्ष्य वजन कम करना है, यह ${localLevel} स्तर का आसन आपके ${pose.bodyPart} को सक्रिय करता है और चयापचय को बढ़ावा देता है।`;
        } else if (goal === 'Stress Relief') {
          why = `तनाव दूर करने के लिए, यह आसन मुख्य रूप से ${pose.focus} पर ध्यान केंद्रित करता है जिससे तंत्रिका तंत्र शांत होता है।`;
        } else if (goal === 'Strength') {
          why = `यह आसन आपके ${pose.bodyPart} में मांसपेशियों की ताकत और कोर स्थिरता को बढ़ाने में मदद करता है।`;
        } else if (goal === 'Flexibility') {
          why = `लचीलेपन को बढ़ावा देने के लिए, यह मुद्रा विशेष रूप से ${pose.bodyPart} को खींचने का काम करती है।`;
        } else {
          why = `यह आसन सामान्य शारीरिक संरेखण, संतुलन और शरीर की सजगता के लिए अनुशंसित है।`;
        }

        if (bmi > 25) {
          why += ` आपके ${bmi.toFixed(1)} बीएमआई (${bmiCat}) के लिए यह आसन जोड़ों पर अतिरिक्त तनाव दिए बिना सुरक्षा प्रदान करता है।`;
        }
      } else if (cfg.language === 'Marathi') {
        localLevel = level === 'Beginner' ? 'प्राथमिक (Beginner)' : level === 'Intermediate' ? 'मध्यम (Intermediate)' : 'प्रगत (Advanced)';
        localDuration = level === 'Beginner' ? '2 मिनिटे' : level === 'Intermediate' ? '3 मिनिटे' : '5 मिनिटे';

        if (goal === 'Weight Loss') {
          why = `तुमचे ध्येय वजन कमी करणे असल्यामुळे, हे ${localLevel} आसन तुमच्या ${pose.bodyPart} स्नायूंना सक्रिय करते आणि कॅलरी बर्न करण्यास मदत करते.`;
        } else if (goal === 'Stress Relief') {
          why = `तणावमुक्तीसाठी, हे आसन प्रामुख्याने ${pose.focus} वर भर देते, ज्यामुळे मानसिक शांतता मिळते.`;
        } else if (goal === 'Strength') {
          why = `हे आसन तुमच्या ${pose.bodyPart} स्नायूंची ताकद आणि कोर स्थिरता वाढवण्यासाठी सुचवले आहे.`;
        } else if (goal === 'Flexibility') {
          why = `लवचिकतेसाठी सुचवलेले हे आसन तुमच्या ${pose.bodyPart} भागाला चांगला ताण देते.`;
        } else {
          why = `हे आसन सामान्य शरीर संतुलन आणि शारीरिक सजगता वाढवण्यासाठी उत्तम आहे.`;
        }

        if (bmi > 25) {
          why += ` तुमच्या ${bmi.toFixed(1)} बीएमआय (${bmiCat}) नुसार हे आसन सांध्यांवर ताण न पडता फायदेशीर ठरेल.`;
        }
      } else {
        // English defaults
        if (goal === 'Weight Loss') {
          why = `Since your goal is weight management, this ${pose.level} pose engages your ${pose.bodyPart} and helps boost metabolic activity.`;
        } else if (goal === 'Stress Relief') {
          why = `To support your stress relief goals, this pose emphasizes ${pose.focus} to help calm the nervous system.`;
        } else if (goal === 'Strength') {
          why = `This pose is recommended to build muscular endurance and core stability in your ${pose.bodyPart}.`;
        } else if (goal === 'Flexibility') {
          why = `Recommended for joint mobility, this pose targets stretching in the ${pose.bodyPart}.`;
        } else {
          why = `This pose is great for general alignment, balance, and improving overall physical awareness.`;
        }

        if (bmi > 25) {
          why += ` It provides excellent joint support for your BMI of ${bmi.toFixed(1)} (${bmiCat}).`;
        }
      }

      return {
        id: pose.id,
        name: localName,
        whyRecommended: why,
        level: localLevel,
        duration: localDuration,
        benefits: localBenefits
      };
    });
  },

  getDailyPlan(user, language = 'en-IN') {
    const poses = this.getYogaPoses(user, language);
    const commitment = user.timeCommitment || 20;
    const cfg = getLanguageConfig(language);

    const morningTime = Math.round(commitment * 0.25);
    const coolDownTime = Math.round(commitment * 0.25);

    const mainSessionPoses = poses.map(p => ({
      poseId: p.id,
      name: p.name,
      duration: p.duration
    }));

    if (cfg.language === 'Hindi') {
      return {
        title: `${user.mainGoal} दैनिक योग कार्यक्रम`,
        morning: [
          { activity: "गहरी सांस (अनुलोम विलोम / प्राणायाम)", duration: `${morningTime} मिनट` },
          { activity: "रीढ़ की हड्डी और गर्दन का हल्का खिंचाव", duration: "2 मिनट" }
        ],
        mainSession: mainSessionPoses,
        coolDown: [
          { activity: "शवासन (गहरे विश्राम के साथ)", duration: `${coolDownTime} minute` }
        ],
        advice: `यह योजना आपके ${user.fitnessLevel} स्तर और ${commitment}-मिनट की प्रतिबद्धता के लिए विशेष रूप से बनाई गई है। आपका ${user.streak}-दिनों का लकीर रिकॉर्ड शानदार है, इसे जारी रखें!`
      };
    }

    if (cfg.language === 'Marathi') {
      return {
        title: `${user.mainGoal} दैनिक योग कार्यक्रम`,
        morning: [
          { activity: "खोल श्वासोच्छ्वास (अनुलोम विलोम / प्राणायाम)", duration: `${morningTime} मिनिटे` },
          { activity: "पाठीचा कणा आणि मानेचे हलके व्यायाम", duration: "२ मिनिटे" }
        ],
        mainSession: mainSessionPoses,
        coolDown: [
          { activity: "शवासन (पूर्ण शारीरिक विश्रांतीसह)", duration: `${coolDownTime} मिनिटे` }
        ],
        advice: `हा कार्यक्रम तुमच्या ${user.fitnessLevel} पातळीसाठी आणि ${commitment}-मिनिटांच्या वेळेसाठी तयार केला आहे. तुमचा ${user.streak}-दिवसांचा सातत्य रेकॉर्ड कायम ठेवा!`
      };
    }

    return {
      title: `${user.mainGoal} Daily Routine`,
      morning: [
        { activity: "Deep Breathing (Anulom Vilom / Pranayama)", duration: `${morningTime} min` },
        { activity: "Gentle Spine Stretches & Neck Rolls", duration: "2 min" }
      ],
      mainSession: mainSessionPoses,
      coolDown: [
        { activity: "Savasana (Corpse Pose) with deep relaxation", duration: `${coolDownTime} min` }
      ],
      advice: `This plan is tailored for your ${user.fitnessLevel} level and ${commitment}-minute daily commitment. Since you have a ${user.streak}-day streak, keep the momentum going!`
    };
  },

  getDietPlan(user, language = 'en-IN') {
    const goal = user.mainGoal || 'Weight Loss';
    const gender = user.gender || 'Male';
    const age = user.age || 24;
    const weight = user.weight || 70;
    const height = user.height || 170;
    const bmi = calculateBMI(weight, height);
    const cfg = getLanguageConfig(language);

    let bmr = 10 * weight + 6.25 * height - 5 * age;
    if (gender === 'Male') bmr += 5;
    else bmr -= 161;

    const factor = user.streak > 7 ? 1.55 : 1.375;
    const maintenanceCalories = Math.round(bmr * factor);
    let targetCalories = maintenanceCalories;

    let plan = {};

    if (cfg.language === 'Hindi') {
      if (goal === 'Weight Loss') {
        targetCalories = Math.round(maintenanceCalories - 500);
        plan = {
          calories: `${targetCalories} किलोकैलोरी (कैलोरी घाटा)`,
          breakfast: "बादाम दूध, अलसी के बीज और ताजे जामुन के साथ गर्म ओट्स + ग्रीन टी।",
          lunch: "ग्रिल्ड टोफू/चिकन ब्रेस्ट, खीरा और क्विनोआ के साथ हरा सलाद।",
          dinner: "मसालेदार दाल के सूप के साथ उबली हुई मिश्रित सब्जियां (ब्रोकोली, गाजर)।",
          snacks: "एक मुट्ठी बादाम (10-12) या मूंगफली के मक्खन के साथ कटी हुई सेब।",
          hydration: "3.5 लीटर पानी पिएं। अपने सुबह की शुरुआत गर्म नींबू पानी से करें।",
          avoid: ["रिफाइंड चीनी", "सफेद ब्रेड", "तले हुए स्नैक्स", "सोडा"],
          alternatives: ["सफेद चावल की जगह ब्राउन राइस लें", "मीठे की जगह खजूर खाएं"]
        };
      } else if (goal === 'Strength') {
        targetCalories = Math.round(maintenanceCalories + 300);
        plan = {
          calories: `${targetCalories} किलोकैलोरी (मांसपेशियों के लिए कैलोरी लाभ)`,
          breakfast: "3 अंडे की सफेदी (या पनीर भुर्जी), साबुत गेहूं की टोस्ट और केला स्मूदी।",
          lunch: "ब्राउन राइस, चिकन करी (या सोया चंक्स/चना मसाला) और उबला हुआ पालक।",
          dinner: "पके हुए सामन मछली (या ग्रिल्ड पनीर/टोफू टिक्का), शकरकंद और हरी बीन्स।",
          snacks: "चिया सीड्स और शहद के साथ ग्रीक योगर्ट, या उबला हुआ स्प्राउट्स चाट।",
          hydration: "4 लीटर पानी पिएं। नारियल पानी से शरीर में इलेक्ट्रोलाइट्स बनाए रखें।",
          avoid: ["प्रोसेस्ड ट्रांस फैट", "अत्यधिक कैफीन", "मैदा और रिफाइंड उत्पाद"],
          alternatives: ["रिफाइंड तेल की जगह जैतून का तेल इस्तेमाल करें", "सत्र के बाद प्रोटीन शेक लें"]
        };
      } else if (goal === 'Stress Relief') {
        plan = {
          calories: `${targetCalories} किलोकैलोरी (तनाव मुक्ति के लिए आहार)`,
          breakfast: "अखरोट, कद्दू के बीज के साथ गर्म दलिया और एक कप कैमोमाइल चाय।",
          lunch: "एवोकाडो सलाद के साथ ब्राउन राइस, काली दाल और ककड़ी के स्लाइस।",
          dinner: "हल्दी सब्जी शोरबा, शकरकंद, गाजर और टोफू के साथ।",
          snacks: "डार्क चॉकलेट (70%+ कोको) या गर्म बादाम का दूध एक चुटकी जायफल के साथ।",
          hydration: "3 लीटर पानी पिएं। हर्बल चाय (तुलसी, पुदीना) का सेवन करें।",
          avoid: ["अत्यधिक कैफीन (कॉफी, एनर्जी ड्रिंक्स)", "ज्यादा मीठे डेसर्ट", "शराब"],
          alternatives: ["दूध वाली चाय/कॉफी की जगह अश्वगंधा चाय लें", "मीठे स्नैक्स की जगह ताजे बेरीज खाएं"]
        };
      } else {
        plan = {
          calories: `${targetCalories} किलोकैलोरी (संतुलित पोषण)`,
          breakfast: "सब्जी उपमा या उबले अंडे के साथ एवोकाडो टोस्ट + ग्रीन टी।",
          lunch: "सब्जी करी, साबुत गेहूं की रोटी, दही और सलाद।",
          dinner: "दाल का सूप, तवा पनीर/टोफू और मशरूम के साथ।",
          snacks: "भुना हुआ मखाना या फलों का सलाद (पपीता, संतरा)।",
          hydration: "3.2 लीटर पानी पिएं। पुदीना और खीरे से युक्त पानी का सेवन करें।",
          avoid: ["गहरे तले हुए भोजन", "अत्यधिक सोडियम युक्त पैक्ड चिप्स", "कृत्रिम मीठे सिरप"],
          alternatives: ["चीनी की जगह गुड़ या शहद लें", "बिस्कुट के बजाय मिश्रित मेवे खाएं"]
        };
      }
    } else if (cfg.language === 'Marathi') {
      if (goal === 'Weight Loss') {
        targetCalories = Math.round(maintenanceCalories - 500);
        plan = {
          calories: `${targetCalories} किलोकॅलरी (कॅलरी तूट)`,
          breakfast: "बदाम दूध, अळशीच्या बिया आणि ताज्या बेरीसह गरम ओट्स + ग्रीन टी.",
          lunch: "ग्रिल्ड टोफू/चिकन ब्रेस्ट, काकडी आणि क्विनोआसह हिरवा कोशिंबीर.",
          dinner: "मसालेदार डाळ/वरण सूपसह वाफवलेल्या मिश्र भाज्या (ब्रोकोली, गाजर).",
          snacks: "मूठभर बदाम (१०-१२) किंवा शेंगदाण्याच्या लोण्यासोबत सफरचंदाचे काप.",
          hydration: "३.५ लिटर पाणी प्या. सकाळी कोमट लिंबू पाण्याने सुरुवात करा.",
          avoid: ["रिफाइंड साखर", "सफेद ब्रेड", "तळलेले पदार्थ", "सोडा"],
          alternatives: ["पांढऱ्या तांदळाऐवजी ब्राऊन राइस वापरा", "गोड खाण्याऐवजी खजूर खा"]
        };
      } else if (goal === 'Strength') {
        targetCalories = Math.round(maintenanceCalories + 300);
        plan = {
          calories: `${targetCalories} किलोकॅलरी (स्नायूंसाठी अतिरिक्त कॅलरीज)`,
          breakfast: "३ अंड्याचे पांढरे भाग (किंवा पनीर भुर्जी), गव्हाची टोस्ट आणि केळीची स्मूदी.",
          lunch: "ब्राऊन राइस, चिकन करी (किंवा सोया चंक्स/चणा मसाला) आणि वाफवलेली पालक.",
          dinner: "बेक केलेले सॅल्मन मासे (किंवा ग्रिल्ड पनीर/टोफू टिक्का), रताळे आणि हिरव्या घेवड्याची भाजी.",
          snacks: "चिया बिया आणि मध घालून ग्रीक योगर्ट, किंवा मोड आलेले कडधान्य चाट.",
          hydration: "४ लिटर पाणी प्या. इलेक्ट्रोलाइट्स राखण्यासाठी शहाळ्याचे पाणी वापरा.",
          avoid: ["प्रोसेस्ड ट्रान्स फॅट्स", "अति कॅफिन", "मैदा आणि मैद्याचे पदार्थ"],
          alternatives: ["रिफाइंड तेलाऐवजी ऑलिव्ह किंवा मोहरीचे तेल वापरा", "योगासन सत्रानंतर प्रोटीन शेक घ्या"]
        };
      } else if (goal === 'Stress Relief') {
        plan = {
          calories: `${targetCalories} किलोकॅलरी (मानसिक शांतीसाठी पोषण)`,
          breakfast: "अक्रोड, भोपळ्याच्या बियांसह गरम दलिया आणि एक कप कॅमोमाइल चहा.",
          lunch: "अ‍ॅव्होकॅडो सॅलडसह ब्राऊन राइस, काळी डाळ आणि काकडीचे काप.",
          dinner: "हळद घालून व्हेजिटेबल सूप, रताळे, गाजर आणि टोफूसह.",
          snacks: "डार्क चॉकलेट (७०%+ कोको) किंवा चिमूटभर जायफळ घालून गरम बदाम दूध.",
          hydration: "३ लिटर पाणी प्या. हर्बल चहा (तुळशी, पुदीना) वापरा.",
          avoid: ["अति कॅफिन (कॉफी, एनर्जी ड्रिंक्स)", "अति गोड पदार्थ", "अल्कोहोल"],
          alternatives: ["दुधाच्या चहा/कॉफीऐवजी अश्वगंधा चहा वापरा", "गोड बिस्किटांऐवजी ताजी फळे खा"]
        };
      } else {
        plan = {
          calories: `${targetCalories} किलोकॅलरी (संतुलित आहार)`,
          breakfast: "भाज्यांचा उपमा किंवा उकडलेल्या अंड्यासह अ‍ॅव्होकॅडो टोस्ट + ग्रीन टी.",
          lunch: "मिक्स व्हेजिटेबल करी, गव्हाची चपाती, दही आणि सॅलड.",
          dinner: "वरण सूप, पनीर/टोफू आणि मशरूम सोबत.",
          snacks: "भाजलेले मखाने किंवा फळांचे काप (पपई, संत्री).",
          hydration: "३.२ लिटर पाणी प्या. पाण्यात पुदीना आणि काकडी घालून वापरा.",
          avoid: ["खूप तळलेले अन्न", "जास्त सोडियम असलेले पॅक केलेले चिप्स", "कृत्रिम गोड पाक"],
          alternatives: ["साखरेऐवजी गूळ किंवा मध वापरा", "बिस्किटांऐवजी मिश्र सुकामेवा खा"]
        };
      }
    } else {
      // English Defaults
      if (goal === 'Weight Loss') {
        targetCalories = Math.round(maintenanceCalories - 500);
        plan = {
          calories: `${targetCalories} kcal (Caloric Deficit)`,
          breakfast: "Warm oats with almond milk, flaxseeds, and fresh berries + green tea.",
          lunch: "Tossed green salad with grilled tofu/chicken breasts, cucumber, and quinoa.",
          dinner: "Steamed mixed vegetables (broccoli, carrots) with spiced lentil/dal soup.",
          snacks: "A handful of almonds (10-12) or sliced apples with a spoon of peanut butter.",
          hydration: "Drink 3.5 liters of water. Start your morning with warm lemon water.",
          avoid: ["Refined sugars", "White bread", "Fried snacks", "Fizzy sodas"],
          alternatives: ["Replace white rice with brown rice", "Replace sweet cravings with dates"]
        };
      } else if (goal === 'Strength') {
        targetCalories = Math.round(maintenanceCalories + 300);
        plan = {
          calories: `${targetCalories} kcal (Caloric Surplus for Muscle)`,
          breakfast: "3 scrambled egg whites (or paneer scramble), whole wheat toast, and banana smoothie.",
          lunch: "Brown rice with chicken curry (or soya chunks/chana masala) and steamed spinach.",
          dinner: "Baked salmon (or grilled paneer/tofu tikka) with sweet potatoes and green beans.",
          snacks: "Greek yogurt with chia seeds and honey, or boiled sprouts chart.",
          hydration: "Drink 4 liters of water. Keep coconut water handy for post-workout electrolytes.",
          avoid: ["Processed trans fats", "Alcohol", "Excess caffeine", "Refined flour (maida)"],
          alternatives: ["Replace refined cooking oil with olive or mustard oil", "Protein shakes post-session"]
        };
      } else if (goal === 'Stress Relief') {
        plan = {
          calories: `${targetCalories} kcal (Maintenance for Calm)`,
          breakfast: "Warm porridge with walnuts, pumpkin seeds, and a cup of warm chamomile tea.",
          lunch: "Avocado salad with brown rice, black lentils, and sliced cucumbers.",
          dinner: "Warm turmeric vegetable broth with sweet potatoes, carrots, and tofu.",
          snacks: "A piece of dark chocolate (70%+ cacao) or warm almond milk with a pinch of nutmeg.",
          hydration: "Drink 3 liters of water. Focus on herbal infusions (tulsi, peppermint).",
          avoid: ["High caffeine (coffee, energy drinks)", "Sugar-loaded desserts", "Alcohol"],
          alternatives: ["Replace milk tea/coffee with Ashwagandha tea", "Eat berries instead of processed sweets"]
        };
      } else {
        plan = {
          calories: `${targetCalories} kcal (Balanced Nutrition)`,
          breakfast: "Multigrain vegetable upma or avocado toast with a poached egg + green tea.",
          lunch: "Mixed vegetable curry with whole wheat roti, curd/yogurt, and salad.",
          dinner: "Lentil soup with stir-fried paneer/tofu and sautéed mushrooms.",
          snacks: "Roasted makhana (foxnuts) or a fruit cup (papaya, orange).",
          hydration: "Drink 3.2 liters of water. Infuse water with cucumber and mint.",
          avoid: ["Deep-fried meals", "High-sodium packed chips", "Processed sugary syrups"],
          alternatives: ["Replace white sugar with jaggery or honey", "Snack on mixed nuts instead of biscuits"]
        };
      }
    }

    return {
      goal,
      bmi: bmi.toFixed(1),
      bmiCategory: getBMICategory(bmi, language),
      ...plan
    };
  },

  getDailyRoutine(user, language = 'en-IN') {
    const goal = user.mainGoal || 'Weight Loss';
    const cfg = getLanguageConfig(language);
    
    if (cfg.language === 'Hindi') {
      if (goal === 'Weight Loss') {
        return [
          { time: "सुबह", activity: "15 मिनट की तेज सैर + जागने पर गर्म नींबू पानी" },
          { time: "दोपहर", activity: "सीढ़ियों की चुनौती: लिफ्ट के बजाय सीढ़ियों का उपयोग करें (6+ मंजिल)" },
          { time: "शाम", activity: "आस-पास में 20 मिनट की हल्की दौड़ या साइकिल चलाना" },
          { time: "रात", activity: "रात के खाने के बाद टहलना: 10 मिनट की कोमल सैर" }
        ];
      } else if (goal === 'Stress Relief') {
        return [
          { time: "सुबह", activity: "5 मिनट गहरी सांस लेने का व्यायाम + 5 मिनट सकारात्मक विचार लिखना" },
          { time: "दोपहर", activity: "डिजिटल डिटॉक्स: 15 मिनट के लिए स्क्रीन बंद करें और हर्बल चाय पिएं" },
          { time: "शाम", activity: "प्रकृति में 20 मिनट की धीमी सैर" },
          { time: "रात", activity: "सोने से पहले 10 मिनट ध्यान या योग निद्रा अभ्यास" }
        ];
      } else if (goal === 'Strength') {
        return [
          { time: "सुबह", activity: "मांसपेशियों को सक्रिय करने के लिए 10 मिनट का गतिशील खिंचाव" },
          { time: "दोपहर", activity: "कोर गतिविधि: काम के बीच 30 सेकंड के 3 प्लैंक सेट" },
          { time: "शाम", activity: "शारीरिक वजन व्यायाम: 15 स्क्वैट्स और 10 पुश-अप्स" },
          { time: "रात", activity: "मांसपेशियों के दर्द को कम करने के लिए स्ट्रेचिंग" }
        ];
      } else {
        return [
          { time: "सुबह", activity: "5 मिनट गर्दन, कंधे और छाती खोलने वाले व्यायाम" },
          { time: "दोपहर", activity: "काम से ब्रेक: हर घंटे 2 मिनट सीधे खड़े होकर बाहों को तानें" },
          { time: "शाम", activity: "15 मिनट सक्रिय गतिशील खिंचाव या कूल्हे खोलने के व्यायाम" },
          { time: "रात", activity: "सोने से पहले 3 मिनट मार्जरी आसन (कैट-काउ) रीढ़ की हड्डी के लिए" }
        ];
      }
    }

    if (cfg.language === 'Marathi') {
      if (goal === 'Weight Loss') {
        return [
          { time: "सकाळी", activity: "१५ मिनिटे जलद चालणे + उठल्यानंतर कोमट लिंबू पाणी पिणे" },
          { time: "दुपारी", activity: "पायऱ्यांचे आव्हान: आज लिफ्टऐवजी पायऱ्या वापरा (६+ मजले)" },
          { time: "संध्याकाळी", activity: "२० मिनिटे हलकी धावणे किंवा सायकल चालवणे" },
          { time: "रात्री", activity: "रात्रीच्या जेवणानंतर शतपावली: १० मिनिटे हळू चालणे" }
        ];
      } else if (goal === 'Stress Relief') {
        return [
          { time: "सकाळी", activity: "५ मिनिटे दीर्घ श्वासोच्छ्वास व्यायाम + ५ मिनिटे सकारात्मक विचार लिहिणे" },
          { time: "दुपारी", activity: "डिजिटल डिटॉक्स: १५ मिनिटे स्क्रीन बंद ठेवा आणि चहाचा आस्वाद घ्या" },
          { time: "संध्याकाळी", activity: "बागेत किंवा निसर्गात २० मिनिटे शांत चालणे" },
          { time: "रात्री", activity: "झोपण्यापूर्वी १० मिनिटे ध्यान किंवा योग निद्रा करणे" }
        ];
      } else if (goal === 'Strength') {
        return [
          { time: "सकाळी", activity: "स्नायूंना सक्रिय करण्यासाठी १० मिनिटे गतिशील हालचाली" },
          { time: "दुपारी", activity: "कोर व्यायाम: कामाच्या ठिकाणी ३०-सेकंद प्लँक्सचे ३ सेट्स" },
          { time: "संध्याकाळी", activity: "शरीराच्या वजनाचे व्यायाम: १५ स्क्वॅट्स आणि १० पुश-अप्स" },
          { time: "रात्री", activity: "स्नायूंचा कडकपणा कमी करण्यासाठी योगासने आणि ताणणे" }
        ];
      } else {
        return [
          { time: "सकाळी", activity: "५ मिनिटे मान, खांदे आणि छाती मोकळी करणारे व्यायाम" },
          { time: "दुपारी", activity: "कामातून ब्रेक: दर तासाला उभे राहा, हात उंच करा आणि थोडे वळा" },
          { time: "संध्याकाळी", activity: "१५ मिनिटे सक्रिय योग हालचाली किंवा कूल्हे मोकळे करणारे व्यायाम" },
          { time: "रात्री", activity: "झोपण्यापूर्वी ३ मिनिटे मार्जरी आसन (कॅट-काउ) पाठीच्या कण्यासाठी" }
        ];
      }
    }

    // English Default
    if (goal === 'Weight Loss') {
      return [
        { time: "Morning", activity: "15 min Brisk outdoor walk + warm lemon water upon waking up" },
        { time: "Afternoon", activity: "Stairs challenge: Take the stairs instead of lift/escalator today (aim for 6+ flights)" },
        { time: "Evening", activity: "20 min light jogging or cycling in the neighborhood" },
        { time: "Night", activity: "Post-dinner stroll: 10 minutes of gentle walking" }
      ];
    } else if (goal === 'Stress Relief') {
      return [
        { time: "Morning", activity: "5 min box breathing exercise + 5 min positive affirmations journal" },
        { time: "Afternoon", activity: "Digital Detox: Turn off all screens for 15 minutes and enjoy a cup of green tea" },
        { time: "Evening", activity: "20 min slow walk in a park/nature while observing surroundings" },
        { time: "Night", activity: "10 min guided mindfulness meditation or Yoga Nidra before sleeping" }
      ];
    } else if (goal === 'Strength') {
      return [
        { time: "Morning", activity: "10 min dynamic mobility & joint rotations to wake up muscles" },
        { time: "Afternoon", activity: "Core activation: 3 sets of 30-sec planks at your desk" },
        { time: "Evening", activity: "Light bodyweight movements: 15 squats and 10 push-ups" },
        { time: "Night", activity: "Deep foam rolling or static hamstring stretching to reduce soreness" }
      ];
    } else {
      return [
        { time: "Morning", activity: "5 min neck, shoulder, and chest opening stretching sequence" },
        { time: "Afternoon", activity: "Desk break: Every 60 minutes stand up, stretch your arms high and twist gently" },
        { time: "Evening", activity: "15 min active dynamic yoga movements or hip-opening stretches" },
        { time: "Night", activity: "3 min cat-cow sequence followed by child's pose to decompress your spine" }
      ];
    }
  },

  getChatResponse(user, chatHistory, userMessage, language = 'en-IN') {
    const msg = userMessage.toLowerCase();
    const name = user.name ? user.name.split(' ')[0] : 'Yogi';
    const goal = user.mainGoal || 'Weight Loss';
    const streak = user.streak || 0;
    const health = getHealthMetrics(user);
    const cfg = getLanguageConfig(language);

    if (cfg.language === 'Hindi') {
      if (msg.match(/\b(नमस्ते|नमस्कार|हैलो|हाय|हे|ग्रीट)\b/)) {
        let greet = `नमस्ते ${name}! 🙏 `;
        if (streak > 0) {
          greet += `आपकी ${streak}-दिनों की योग लकीर बनाए रखने के लिए बहुत बढ़िया काम! 🔥 `;
        }
        if (health.stressLevel === "High") {
          greet += `मैं देख रहा हूँ कि आज आपका तनाव स्तर बढ़ा हुआ है। क्या हम एक शांत श्वास सत्र या हल्के खिंचाव से शुरू करें?`;
        } else {
          greet += `आपका ऊर्जा स्तर आज ${health.energyScore}/100 है। आज मैं आपकी कल्याण यात्रा में आपका मार्गदर्शन कैसे करूँ?`;
        }
        return greet;
      }
      if (msg.match(/\b(आसन|मुद्रा|योग|व्यायाम|स्ट्रेच|प्रैक्टिस)\b/)) {
        return `आपके **${goal}** लक्ष्य और **${user.fitnessLevel}** स्तर के आधार पर, मैं ताड़ासन, वृक्षासन और भुजंगासन की सलाह देता हूँ। विवरण देखने के लिए ऊपर **🧘 Recommend Yoga** बटन पर क्लिक करें!`;
      }
      if (msg.match(/\b(आहार|भोजन|खाना|डाइट|कैलोरी|नाश्ता|दोपहर|रात|पानी)\b/)) {
        return `आपके **${goal}** उद्देश्य के लिए, संतुलित पोषण आवश्यक है। आपका बीएमआई **${calculateBMI(user.weight, user.height).toFixed(1)}** है। आहार योजना देखने के लिए **🥗 Create Diet Plan** पर क्लिक करें!`;
      }
      if (msg.match(/\b(योजना|कार्यक्रम|दैनिक|दिनचर्या|सुबह|शाम)\b/)) {
        return `मैंने आपके ${user.timeCommitment}-मिनट के समय के अनुकूल एक दैनिक योग योजना तैयार की है। इसे देखने के लिए **📅 Daily Plan** पर क्लिक करें!`;
      }
      if (msg.match(/\b(तनाव|थकान|उदास|शांत|सांस|प्राणायाम)\b/)) {
        return `सुनिए ${name}, जब आप थका हुआ महसूस कर रहे हों, तो ध्यान और श्वसन अभ्यास सबसे अच्छे होते हैं। मैं ५ मिनट के अनुलोम विलोम प्राणायाम की सलाह दूंगा। इससे हृदय गति (वर्तमान में ${health.heartRate} बीपीएम) संतुलित होगी।`;
      }
      return `योग कोच के रूप में, मैं आपकी **${goal}** यात्रा का समर्थन करना चाहता हूँ। मुझे बताएं कि आज मैं आपकी कैसे मदद कर सकता हूँ!`;
    }

    if (cfg.language === 'Marathi') {
      if (msg.match(/\b(नमस्कार|नमस्ते|हॅलो|हाय|हे|ग्रीट)\b/)) {
        let greet = `नमस्कार ${name}! 🙏 `;
        if (streak > 0) {
          greet += `तुमचा ${streak}-दिवसांचा योग सातत्य टिकवून ठेवल्याबद्दल खूप अभिनंदन! 🔥 `;
        }
        if (health.stressLevel === "High") {
          greet += `मला दिसते आहे की आज तुमचा तणाव वाढलेला आहे. आपण श्वास सत्राने किंवा हलक्या ताणाने सुरुवात करायची का?`;
        } else {
          greet += `तुमची ऊर्जा पातळी आज ${health.energyScore}/100 आहे. आज मी तुमच्या आरोग्य प्रवासात मार्गदर्शन कसे करू?`;
        }
        return greet;
      }
      if (msg.match(/\b(आसन|आसने|योग|व्यायाम|ताणणे|सराव|प्रॅक्टिस)\b/)) {
        return `तुमच्या **${goal}** ध्येयानुसार आणि **${user.fitnessLevel}** पातळीनुसार, मी ताडासन, वृक्षासन आणि भुजंगासन सुचवतो. सविस्तर माहितीसाठी **🧘 Recommend Yoga** बटन दाबा!`;
      }
      if (msg.match(/\b(आहार|जेवण|डाइट|कॅलरी|न्याहारी|दुपार|रात्री|पाणी)\b/)) {
        return `तुमच्या **${goal}** उद्दिष्टासाठी, संतुलित आहार आवश्यक आहे. तुमचा बीएमआय **${calculateBMI(user.weight, user.height).toFixed(1)}** आहे. आहार पत्रक पाहण्यासाठी **🥗 Create Diet Plan** दाबा!`;
      }
      if (msg.match(/\b(योजना|कार्यक्रम|दैनिक|दिनचर्या|सकाळ|रात्र)\b/)) {
        return `मी तुमच्या ${user.timeCommitment}-मिनिटांच्या वेळेनुसार एक दैनिक योग कार्यक्रम तयार केला आहे. तो पाहण्यासाठी **📅 Daily Plan** दाबा!`;
      }
      if (msg.match(/\b(तणाव|थकवा|उदासीन|शांत|श्वास|प्राणायाम)\b/)) {
        return `ऐका ${name}, थकवा आल्यावर श्वासोच्छ्वासाचे व्यायाम सर्वोत्तम ठरतात. मी ५ मिनिटे अनुलोम विलोम करण्याचा सल्ला देईन, ज्याने हृदयाचे ठोके (${health.heartRate} बीपीएम) शांत होतील.`;
      }
      return `योग प्रशिक्षक म्हणून, मला तुमच्या **${goal}** प्रवासात मदत करायची आहे. मला सांगा आज मी काय करू?`;
    }

    // English Default
    if (msg.match(/\b(hi|hello|hey|greetings|good morning|good evening|namaste|yo)\b/)) {
      let greet = `Namaste ${name}! 🙏 `;
      if (streak > 0) {
        greet += `Awesome job maintaining your ${streak}-day yoga streak! 🔥 `;
      }
      if (health.stressLevel === "High") {
        greet += `I notice your stress index might be slightly elevated today. How about we focus on relaxing breathing exercises? Let me know how you'd like to proceed!`;
      } else {
        greet += `I hope you are feeling energetic today. Your energy score is ${health.energyScore}/100. How can your yoga guru guide you today?`;
      }
      return greet;
    }

    if (msg.match(/\b(pose|poses|yoga|recommend|exercise|stretch|movement|practice)\b/)) {
      return `Based on your goal of **${goal}** and **${user.fitnessLevel}** level, I recommend focusing on poses like **Tadasana**, **Vrikshasana**, **Bhujangasana**, and **Setu Bandhasana**. Click the **🧘 Recommend Yoga** button above to get a detailed breakdown with durations and benefits!`;
    }

    if (msg.match(/\b(diet|food|eat|meal|nutrition|calorie|calories|snack|breakfast|lunch|dinner|hydration|water)\b/)) {
      return `For a **${goal}** objective, maintaining a tailored nutritional balance is key. Since your BMI is **${calculateBMI(user.weight, user.height).toFixed(1)}**, I've generated a customized meal blueprint. Click on **🥗 Create Diet Plan** to view your breakfast, lunch, and dinner options!`;
    }

    if (msg.match(/\b(plan|schedule|daily|routine|program|morning|cool down)\b/)) {
      return `I have organized a custom **${user.timeCommitment}-minute** daily yoga plan containing breathing prep, active poses, and a cooling Savasana. Tap the **📅 Daily Plan** button to view the detailed schedule!`;
    }

    if (msg.match(/\b(stress|anxious|tired|fatigued|depressed|sad|calm|relax|breath|breathing)\b/)) {
      return `I hear you, ${name}. When feeling stressed or tired, it's best to avoid heavy postures and focus on restorative work. I suggest practicing a short **Child's Pose (Balasana)** followed by 5 minutes of **Anulom Vilom (alternate nostril breathing)**. This will lower your heart rate (currently averaging ${health.heartRate} BPM) and restore your energy.`;
    }

    if (msg.match(/\b(back|pain|neck|spine|posture|hurt|ache)\b/)) {
      return `To help with back or spinal stiffness, gentle extension and twist poses are best. Try **Bhujangasana (Cobra Pose)** to strengthen the spine and **Setu Bandhasana (Bridge Pose)** to support the lower back. Avoid deep forward bending if the pain is acute. Would you like a posture check routine?`;
    }

    if (msg.match(/\b(heart|bpm|pulse|health|status|metrics|stress level|energy)\b/)) {
      return `Your health snapshot today shows a resting average of **${health.heartRate} BPM**, a **${health.stressLevel}** stress index, and an overall energy level of **${health.energyScore}/100**. Yoga practice is a great way to balance these values!`;
    }

    return `As your yoga coach, I want to support your journey towards **${goal}**. Remember that yoga is as much about breathing and mindfulness as it is about physical poses. Let me know if you want pose recommendations, diet planning, or a daily routine review!`;
  }
};

// Unified AI Service Layer (Approach 1 Preferred + Approach 2 Fallback)
export const aiService = {
  // Constructed prompt context based on user profile and health metrics
  constructContext(user, language = 'en-IN') {
    const health = getHealthMetrics(user);
    const bmi = calculateBMI(user.weight, user.height);
    const bmiCategory = getBMICategory(bmi, language);
    const langConfig = getLanguageConfig(language);

    return `
You are "AI Yoga Guru", a 22-year-old friendly, supportive, and motivating male AI Yoga Coach and Wellness Mentor.
The user's profile is:
- Name: ${user.name}
- Age: ${user.age} years old
- Gender: ${user.gender}
- Height: ${user.height} cm
- Weight: ${user.weight} kg
- BMI: ${bmi.toFixed(1)} (${bmiCategory})
- Fitness Level: ${user.fitnessLevel}
- Main Goal: ${user.mainGoal}
- Time Commitment: ${user.timeCommitment} mins/day
- Streak: ${user.streak}-day streak
- Completed Poses IDs: [${(user.posesPerformed || []).join(', ')}]
- Today's Mood: ${health.mood || 'Not Logged'}
- Today's Stress Level: ${health.stressLevel}
- Today's Energy Score: ${health.energyScore}/100
- Today's Average Heart Rate: ${health.heartRate} BPM

CRITICAL: You must write your entire response completely in the ${langConfig.language} language. All headings, labels, pose descriptions, benefits, meals, routine items, warnings, and chats must be generated in ${langConfig.language}. Do not mix other languages.
Always write in a highly personalized, supportive, and encouraging tone. Speak like a friend and a professional coach.
`;
  },

  // 1. Generate Yoga Pose recommendations
  async generateYogaAdvice(user, language = 'en-IN', apiKey = null) {
    const context = this.constructContext(user, language);
    const langConfig = getLanguageConfig(language);
    const prompt = `${context}
Task: Recommend 3-4 specific yoga poses from the standard yoga list.
For EVERY pose, provide exactly:
1. Pose Name (e.g. Tadasana (Mountain Pose))
2. Why it is recommended (must mention user's goal of ${user.mainGoal}, age of ${user.age}, and level of ${user.fitnessLevel} specifically)
3. Difficulty Level (written in ${langConfig.language})
4. Estimated Duration
5. Benefits (written in ${langConfig.language})

Please format the response in a structured JSON format matching this schema:
{
  "poses": [
    {
      "name": "Pose Name",
      "whyRecommended": "Reason in ${langConfig.language}",
      "level": "Level in ${langConfig.language}",
      "duration": "X min",
      "benefits": ["benefit 1", "benefit 2"]
    }
  ]
}
Do NOT return markdown format codes or wrappers, just output raw JSON directly.`;

    const result = await this.callAI(prompt, apiKey);
    if (result) {
      try {
        const jsonStr = this.extractJSON(result);
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.poses && Array.isArray(parsed.poses)) {
          return parsed.poses;
        }
      } catch (e) {
        console.warn("Failed to parse AI pose recommendation JSON, fallback to local:", e, result);
      }
    }

    return localRecommendationEngine.getYogaPoses(user, language);
  },

  // 2. Generate Diet Plan
  async generateDietPlan(user, language = 'en-IN', apiKey = null) {
    const context = this.constructContext(user, language);
    const langConfig = getLanguageConfig(language);
    const prompt = `${context}
Task: Create a personalized diet plan based on the user's details.
Provide suggestions for:
- Breakfast (suggested in ${langConfig.language})
- Lunch (suggested in ${langConfig.language})
- Dinner (suggested in ${langConfig.language})
- Snacks (suggested in ${langConfig.language})
- Hydration (suggested in ${langConfig.language})
- Calories Estimate

Include:
- Foods to Avoid (suggested in ${langConfig.language})
- Healthy Alternatives (suggested in ${langConfig.language})

Please format the response in a structured JSON format matching this schema:
{
  "calories": "X kcal",
  "breakfast": "Meal suggestion",
  "lunch": "Meal suggestion",
  "dinner": "Meal suggestion",
  "snacks": "Snack suggestion",
  "hydration": "Hydration advice",
  "avoid": ["food to avoid 1", "food to avoid 2"],
  "alternatives": ["alternative 1", "alternative 2"]
}
Do NOT return markdown format codes or wrappers, just output raw JSON directly.`;

    const result = await this.callAI(prompt, apiKey);
    if (result) {
      try {
        const jsonStr = this.extractJSON(result);
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.breakfast) {
          return {
            goal: user.mainGoal,
            bmi: calculateBMI(user.weight, user.height).toFixed(1),
            bmiCategory: getBMICategory(calculateBMI(user.weight, user.height), language),
            ...parsed
          };
        }
      } catch (e) {
        console.warn("Failed to parse AI diet plan JSON, fallback to local:", e, result);
      }
    }

    return localRecommendationEngine.getDietPlan(user, language);
  },

  // 3. Generate Daily Routine (timeline)
  async generateDailyRoutine(user, language = 'en-IN', apiKey = null) {
    const context = this.constructContext(user, language);
    const langConfig = getLanguageConfig(language);
    const prompt = `${context}
Task: Suggest extra daily activities to perform based on their goals (e.g. walk, stretch, desk breaks).
Format the response in a structured JSON format matching this schema:
{
  "routine": [
    { "time": "Morning (in ${langConfig.language})", "activity": "Activity details in ${langConfig.language}" },
    { "time": "Afternoon (in ${langConfig.language})", "activity": "Activity details in ${langConfig.language}" },
    { "time": "Evening (in ${langConfig.language})", "activity": "Activity details in ${langConfig.language}" },
    { "time": "Night (in ${langConfig.language})", "activity": "Activity details in ${langConfig.language}" }
  ]
}
Do NOT return markdown format codes or wrappers, just output raw JSON directly.`;

    const result = await this.callAI(prompt, apiKey);
    if (result) {
      try {
        const jsonStr = this.extractJSON(result);
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.routine && Array.isArray(parsed.routine)) {
          return parsed.routine;
        }
      } catch (e) {
        console.warn("Failed to parse AI daily routine JSON, fallback to local:", e, result);
      }
    }

    return localRecommendationEngine.getDailyRoutine(user, language);
  },

  // 4. Conversational Chat
  async chatWithGuru(user, chatHistory, userMessage, language = 'en-IN', apiKey = null) {
    const context = this.constructContext(user, language);
    const formattedHistory = chatHistory.slice(-6).map(msg => 
      `${msg.sender === 'user' ? 'User' : 'Guru'}: ${msg.text}`
    ).join('\n');

    const langConfig = getLanguageConfig(language);

    const prompt = `${context}
Here is the recent conversation history:
${formattedHistory}

The user just said: "${userMessage}"

Reply directly to the user as AI Yoga Guru. Keep your response friendly, supportive, coach-like, and highly personalized.
You must reply completely in the ${langConfig.language} language.
Keep your response relatively brief (max 3 sentences) so that it is suitable for speech synthesis.`;

    const result = await this.callAI(prompt, apiKey);
    if (result) {
      return result.trim();
    }

    return localRecommendationEngine.getChatResponse(user, chatHistory, userMessage, language);
  },

  // 5. Generate Daily Yoga Schedule
  async generateDailyYogaPlan(user, language = 'en-IN', apiKey = null) {
    const context = this.constructContext(user, language);
    const langConfig = getLanguageConfig(language);
    const prompt = `${context}
Task: Generate a complete daily yoga session plan matching the user commitment of ${user.timeCommitment} minutes.
Format the response in structured JSON matching this schema:
{
  "title": "Plan Title in ${langConfig.language}",
  "morning": [
    { "activity": "Activity Name in ${langConfig.language}", "duration": "Duration (e.g. 5 min in ${langConfig.language})" }
  ],
  "mainSession": [
    { "name": "Pose Name", "duration": "Duration (e.g. 3 min in ${langConfig.language})" }
  ],
  "coolDown": [
    { "activity": "Activity Name in ${langConfig.language}", "duration": "Duration (e.g. 5 min in ${langConfig.language})" }
  ],
  "advice": "Encouraging closing advice in ${langConfig.language}"
}
Do NOT return markdown format codes or wrappers, just output raw JSON directly.`;

    const result = await this.callAI(prompt, apiKey);
    if (result) {
      try {
        const jsonStr = this.extractJSON(result);
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.mainSession) {
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to parse AI daily plan JSON, fallback to local:", e, result);
      }
    }

    return localRecommendationEngine.getDailyPlan(user, language);
  },

  // Base AI Request router
  async callAI(prompt, apiKey) {
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          return text;
        }
      } catch (error) {
        console.error("Gemini API call failed:", error);
      }
    }

    return null;
  },

  extractJSON(str) {
    let clean = str.trim();
    if (clean.startsWith("```json")) {
      clean = clean.substring(7);
    } else if (clean.startsWith("```")) {
      clean = clean.substring(3);
    }
    if (clean.endsWith("```")) {
      clean = clean.substring(0, clean.length - 3);
    }
    return clean.trim();
  }
};
