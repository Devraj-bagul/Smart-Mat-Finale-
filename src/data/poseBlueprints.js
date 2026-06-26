// Joint Angle helper
const getAngle = (p1, p2, p3) => {
  if (!p1 || !p2 || !p3 || p1.visibility < 0.5 || p2.visibility < 0.5 || p3.visibility < 0.5) return null;
  const rad = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((rad * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return angle;
};

// Check if landmarks are visible
const checkVisible = (landmarks, indices) => {
  return indices.every(idx => landmarks[idx] && landmarks[idx].visibility > 0.5);
};

// Calculate FSR ratio score
const getFsrRatioScore = (fsrVal1, fsrVal2, targetRatio, tolerance = 15) => {
  const sum = fsrVal1 + fsrVal2;
  if (sum === 0) return 0;
  const ratio = (fsrVal1 / sum) * 100;
  const diff = Math.abs(ratio - targetRatio);
  return Math.max(0, 100 - (diff / tolerance) * 100);
};

export const poseBlueprints = {
  // 3: Tree Pose (Vrikshasana)
  3: {
    poseName: "Tree Pose",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand straight with feet together.",
        instruction: "Stand upright, feet together, arms by your sides.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Check feet together
          if (checkVisible(landmarks, [27, 28])) {
            const dist = Math.abs(landmarks[27].x - landmarks[28].x);
            const feetTogetherScore = Math.max(0, 100 - Math.max(0, dist - 0.12) / 0.1 * 100);
            scoreSum += feetTogetherScore;
            count++;
            if (feetTogetherScore < 80) {
              corrections.push("Bring your feet closer together.");
              incorrectJoints.push(27, 28);
            }
          }

          // Check spine verticality
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = Math.max(0, 100 - Math.max(0, spineDiff - 0.08) / 0.08 * 100);
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine upright and straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }

          // FSR weight distribution: even weight
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const fsrScore = getFsrRatioScore(fsr.lf, fsr.rf, 50, 20);
            scoreSum += fsrScore;
            count++;
            if (fsrScore < 75) corrections.push("Distribute your weight evenly on both feet.");
          } else {
            scoreSum += 100;
            count++;
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
            incorrectJoints
          };
        }
      },
      {
        id: 2,
        text: "Shift weight to left leg.",
        instruction: "Shift your body weight fully onto your left leg.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 85, rf: 15 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 50;

          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const total = fsr.lf + fsr.rf;
            const leftRatio = (fsr.lf / total) * 100;
            if (leftRatio >= 70) {
              score = 100;
            } else {
              score = Math.max(0, Math.round((leftRatio / 70) * 100));
              corrections.push("Shift more weight onto your standing left leg.");
              incorrectJoints.push(23, 25, 27);
            }
          } else {
            score = 100; // bypass if no sensor activity detected
          }

          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 85, rf: 15 },
            incorrectJoints
          };
        }
      },
      {
        id: 3,
        text: "Lift right foot.",
        instruction: "Lift your right foot off the mat and balance on your left leg.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 95, rf: 5 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Check right ankle is higher than left ankle
          if (checkVisible(landmarks, [27, 28])) {
            const ankleDiff = landmarks[27].y - landmarks[28].y; // lower y means higher up
            if (ankleDiff > 0.03) {
              scoreSum += 100;
            } else {
              scoreSum += 0;
              corrections.push("Lift your right foot off the floor.");
              incorrectJoints.push(24, 26, 28);
            }
            count++;
          }

          // Balance FSR
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const total = fsr.lf + fsr.rf;
            const leftRatio = (fsr.lf / total) * 100;
            const balanceScore = leftRatio >= 85 ? 100 : Math.round((leftRatio / 85) * 100);
            scoreSum += balanceScore;
            count++;
            if (balanceScore < 80) {
              corrections.push("Keep weight on your standing foot.");
              incorrectJoints.push(23, 25, 27);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 95, rf: 5 },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Place foot on inner thigh.",
        instruction: "Place your right foot against the inner thigh of your left leg.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 100, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Right foot height
          if (checkVisible(landmarks, [27, 28])) {
            const heightDiff = landmarks[27].y - landmarks[28].y;
            const heightScore = heightDiff > 0.12 ? 100 : Math.max(0, Math.round((heightDiff / 0.12) * 100));
            scoreSum += heightScore;
            count++;
            if (heightScore < 80) {
              corrections.push("Place your right foot higher on your left leg.");
              incorrectJoints.push(24, 26, 28);
            }
          }

          // Right knee turned out
          if (checkVisible(landmarks, [24, 26, 28])) {
            const kneeAngle = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (kneeAngle) {
              const kneeScore = kneeAngle > 75 && kneeAngle < 135 ? 100 : Math.max(0, 100 - Math.min(Math.abs(kneeAngle - 105) / 30 * 100, 100));
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Point your right knee outward to the side.");
                incorrectJoints.push(24, 26, 28);
              }
            }
          }

          // Balance FSR
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const rightFootPress = fsr.rf;
            const balanceScore = rightFootPress < 15 ? 100 : Math.max(0, 100 - (rightFootPress / 40) * 100);
            scoreSum += balanceScore;
            count++;
            if (balanceScore < 80) {
              corrections.push("Do not place right foot weight on the mat.");
              incorrectJoints.push(24, 26, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 100, rf: 0 },
            incorrectJoints
          };
        }
      },
      {
        id: 5,
        text: "Bring hands together.",
        instruction: "Bring your hands together in prayer position in front of your chest.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 100, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Hands close together
          if (checkVisible(landmarks, [15, 16])) {
            const dist = Math.hypot(landmarks[15].x - landmarks[16].x, landmarks[15].y - landmarks[16].y);
            const handsScore = dist < 0.18 ? 100 : Math.max(0, 100 - ((dist - 0.18) / 0.15) * 100);
            scoreSum += handsScore;
            count++;
            if (handsScore < 80) {
              corrections.push("Bring your hands together at the center of your chest.");
              incorrectJoints.push(15, 16);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 100, rf: 0 },
            incorrectJoints
          };
        }
      },
      {
        id: 6,
        text: "Raise arms overhead.",
        instruction: "Extend your arms straight overhead, keeping your hands together.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 100, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Arms high
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const leftArmUp = landmarks[11].y - landmarks[15].y;
            const rightArmUp = landmarks[12].y - landmarks[16].y;
            const armUpScore = (leftArmUp > 0.15 && rightArmUp > 0.15) ? 100 : 0;
            scoreSum += armUpScore;
            count++;
            if (armUpScore < 80) {
              corrections.push("Raise your arms fully overhead.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }

          // Arms straight
          if (checkVisible(landmarks, [11, 13, 15])) {
            const leftElbow = getAngle(landmarks[11], landmarks[13], landmarks[15]);
            if (leftElbow) {
              const elbowScore = leftElbow > 150 ? 100 : Math.max(0, 100 - (150 - leftElbow) / 40 * 100);
              scoreSum += elbowScore;
              count++;
              if (elbowScore < 80) {
                corrections.push("Straighten your elbows overhead.");
                incorrectJoints.push(11, 13, 15, 12, 14, 16);
              }
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 100, rf: 0 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 27: Warrior I (Virabhadrasana I)
  27: {
    poseName: "Warrior I",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand straight.",
        instruction: "Stand straight with your feet together, spine aligned.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (l, f) => poseBlueprints[3].steps[0].validate(l, f)
      },
      {
        id: 2,
        text: "Step feet wide apart.",
        instruction: "Step your feet wide apart, about 3 to 4 feet.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 50;
          if (checkVisible(landmarks, [27, 28])) {
            const dist = Math.abs(landmarks[27].x - landmarks[28].x);
            if (dist > 0.32) {
              score = 100;
            } else {
              score = Math.max(0, Math.round((dist / 0.32) * 100));
              corrections.push("Step your feet wider apart.");
              incorrectJoints.push(27, 28);
            }
          }
          return { score, corrections, expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 }, incorrectJoints };
        }
      },
      {
        id: 3,
        text: "Turn front foot out.",
        instruction: "Turn your right foot out 90 degrees and left foot in slightly.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 45, rf: 55 },
        validate: (landmarks, fsr) => {
          // Verify wide stance remains
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [27, 28])) {
            const dist = Math.abs(landmarks[27].x - landmarks[28].x);
            if (dist < 0.3) {
              score = 60;
              corrections.push("Keep your feet wide apart.");
              incorrectJoints.push(27, 28);
            }
          }
          return { score, corrections, expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 45, rf: 55 }, incorrectJoints };
        }
      },
      {
        id: 4,
        text: "Bend right knee.",
        instruction: "Bend your right knee over your right ankle, keeping left leg straight.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 35, rf: 65 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          if (checkVisible(landmarks, [24, 26, 28])) {
            const rKneeAngle = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (rKneeAngle) {
              const kneeScore = rKneeAngle > 90 && rKneeAngle < 145 ? 100 : Math.max(0, 100 - Math.min(Math.abs(rKneeAngle - 117) / 25 * 100, 100));
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Bend your right knee more over your ankle.");
                incorrectJoints.push(24, 26, 28);
              }
            }
          }

          if (checkVisible(landmarks, [23, 25, 27])) {
            const lKneeAngle = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            if (lKneeAngle) {
              const leftScore = lKneeAngle > 155 ? 100 : Math.max(0, 100 - (155 - lKneeAngle) / 30 * 100);
              scoreSum += leftScore;
              count++;
              if (leftScore < 80) {
                corrections.push("Keep your left leg straight and active.");
                incorrectJoints.push(23, 25, 27);
              }
            }
          }

          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const fsrScore = getFsrRatioScore(fsr.rf, fsr.lf, 65, 20);
            scoreSum += fsrScore;
            count++;
            if (fsrScore < 75) {
              corrections.push("Shift more weight onto your bent front foot.");
              incorrectJoints.push(24, 26, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 35, rf: 65 },
            incorrectJoints
          };
        }
      },
      {
        id: 5,
        text: "Raise arms overhead.",
        instruction: "Raise your arms straight up overhead, palms facing each other.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 40, rf: 60 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Validate arms overhead
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const leftArmUp = landmarks[11].y - landmarks[15].y;
            const rightArmUp = landmarks[12].y - landmarks[16].y;
            const armUpScore = (leftArmUp > 0.15 && rightArmUp > 0.15) ? 100 : 0;
            scoreSum += armUpScore;
            count++;
            if (armUpScore < 80) {
              corrections.push("Reach your arms higher overhead.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }

          // Validate front knee bend remains
          if (checkVisible(landmarks, [24, 26, 28])) {
            const rKneeAngle = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (rKneeAngle) {
              const kneeScore = rKneeAngle > 90 && rKneeAngle < 145 ? 100 : 50;
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Keep your right knee bent.");
                incorrectJoints.push(24, 26, 28);
              }
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 40, rf: 60 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 6: Warrior II (Virabhadrasana II)
  6: {
    poseName: "Warrior II",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand with feet wide apart.",
        instruction: "Stand upright, then step your feet wide apart.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => poseBlueprints[27].steps[1].validate(landmarks, fsr)
      },
      {
        id: 2,
        text: "Turn right foot out.",
        instruction: "Turn your right foot out 90 degrees.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 45, rf: 55 },
        validate: (landmarks, fsr) => poseBlueprints[27].steps[2].validate(landmarks, fsr)
      },
      {
        id: 3,
        text: "Raise arms parallel to floor.",
        instruction: "Extend your arms out to the sides, parallel to the floor.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 45, rf: 55 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          if (checkVisible(landmarks, [15, 11])) {
            const lArmDiff = Math.abs(landmarks[15].y - landmarks[11].y);
            const lScore = lArmDiff < 0.15 ? 100 : Math.max(0, 100 - (lArmDiff - 0.15) / 0.15 * 100);
            scoreSum += lScore;
            count++;
            if (lScore < 80) {
              corrections.push("Raise your left arm to shoulder level.");
              incorrectJoints.push(11, 13, 15);
            }
          }

          if (checkVisible(landmarks, [16, 12])) {
            const rArmDiff = Math.abs(landmarks[16].y - landmarks[12].y);
            const rScore = rArmDiff < 0.15 ? 100 : Math.max(0, 100 - (rArmDiff - 0.15) / 0.15 * 100);
            scoreSum += rScore;
            count++;
            if (rScore < 80) {
              corrections.push("Raise your right arm to shoulder level.");
              incorrectJoints.push(12, 14, 16);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 45, rf: 55 },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Bend right knee.",
        instruction: "Bend your right knee over the right ankle, keeping left leg straight.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 35, rf: 65 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Check right knee bend
          if (checkVisible(landmarks, [24, 26, 28])) {
            const rAngle = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (rAngle) {
              const kneeScore = rAngle > 90 && rAngle < 150 ? 100 : Math.max(0, 100 - Math.min(Math.abs(rAngle - 120) / 25 * 100, 100));
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Bend your right knee more over your ankle.");
                incorrectJoints.push(24, 26, 28);
              }
            }
          }

          // Check left leg straight
          if (checkVisible(landmarks, [23, 25, 27])) {
            const lAngle = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            if (lAngle) {
              const leftScore = lAngle > 152 ? 100 : Math.max(0, 100 - (152 - lAngle) / 30 * 100);
              scoreSum += leftScore;
              count++;
              if (leftScore < 80) {
                corrections.push("Keep your left leg straight and strong.");
                incorrectJoints.push(23, 25, 27);
              }
            }
          }

          // Check arms still parallel
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const lArmDiff = Math.abs(landmarks[15].y - landmarks[11].y);
            const rArmDiff = Math.abs(landmarks[16].y - landmarks[12].y);
            if (lArmDiff > 0.18 || rArmDiff > 0.18) {
              scoreSum += 60;
              corrections.push("Keep both arms extended parallel to the floor.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            } else {
              scoreSum += 100;
            }
            count++;
          }

          // FSR check: 65% weight on front (right) foot
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const fsrScore = getFsrRatioScore(fsr.rf, fsr.lf, 65, 20);
            scoreSum += fsrScore;
            count++;
            if (fsrScore < 75) {
              corrections.push("Shift more weight onto your right (front) foot.");
              incorrectJoints.push(24, 26, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 35, rf: 65 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 28: Warrior III (Virabhadrasana III)
  28: {
    poseName: "Warrior III",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand straight.",
        instruction: "Stand tall with your feet together.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (l, f) => poseBlueprints[3].steps[0].validate(l, f)
      },
      {
        id: 2,
        text: "Raise arms overhead.",
        instruction: "Extend both arms straight up overhead.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 50;
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const leftArmUp = landmarks[11].y - landmarks[15].y;
            const rightArmUp = landmarks[12].y - landmarks[16].y;
            if (leftArmUp > 0.15 && rightArmUp > 0.15) {
              score = 100;
            } else {
              corrections.push("Raise your arms straight overhead.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }
          return { score, corrections, expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 }, incorrectJoints };
        }
      },
      {
        id: 3,
        text: "Tilt torso forward & lift left leg.",
        instruction: "Lean your torso forward and extend your left leg straight out behind you.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 15, rf: 85 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Left leg is raised (ankle y higher than standing leg ankle y)
          if (checkVisible(landmarks, [27, 28])) {
            const liftDiff = landmarks[28].y - landmarks[27].y;
            const liftScore = liftDiff > 0.15 ? 100 : Math.max(0, Math.round((liftDiff / 0.15) * 100));
            scoreSum += liftScore;
            count++;
            if (liftScore < 80) {
              corrections.push("Lift your left leg higher behind you.");
              incorrectJoints.push(23, 25, 27);
            }
          }

          // Balance on right foot
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const total = fsr.lf + fsr.rf;
            const rightRatio = (fsr.rf / total) * 100;
            const balanceScore = rightRatio >= 80 ? 100 : Math.round((rightRatio / 80) * 100);
            scoreSum += balanceScore;
            count++;
            if (balanceScore < 80) {
              corrections.push("Keep your balance on your right foot.");
              incorrectJoints.push(24, 26, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 15, rf: 85 },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Make body parallel to floor.",
        instruction: "Align your arms, torso, and raised leg parallel to the floor.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 100 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Check parallel alignment (shoulder y is close to hip y)
          if (checkVisible(landmarks, [11, 23])) {
            const levelDiff = Math.abs(landmarks[11].y - landmarks[23].y);
            const levelScore = levelDiff < 0.12 ? 100 : Math.max(0, 100 - (levelDiff - 0.12) / 0.15 * 100);
            scoreSum += levelScore;
            count++;
            if (levelScore < 80) {
              corrections.push("Lower your torso to be parallel to the floor.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }

          // Check raised leg height
          if (checkVisible(landmarks, [23, 27])) {
            const legDiff = Math.abs(landmarks[27].y - landmarks[23].y);
            const legScore = legDiff < 0.12 ? 100 : Math.max(0, 100 - (legDiff - 0.12) / 0.15 * 100);
            scoreSum += legScore;
            count++;
            if (legScore < 80) {
              corrections.push("Align your raised leg level with your torso.");
              incorrectJoints.push(23, 25, 27);
            }
          }

          // Balance on right leg
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const rightFootVal = (fsr.rf / (fsr.lf + fsr.rf)) * 100;
            const balanceScore = rightFootVal >= 90 ? 100 : Math.round((rightFootVal / 90) * 100);
            scoreSum += balanceScore;
            count++;
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 100 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 12: Chair Pose (Utkatasana)
  12: {
    poseName: "Chair Pose",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand straight.",
        instruction: "Stand straight with feet hip-width apart.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (l, f) => poseBlueprints[3].steps[0].validate(l, f)
      },
      {
        id: 2,
        text: "Raise arms overhead.",
        instruction: "Extend your arms straight up overhead.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => poseBlueprints[28].steps[1].validate(landmarks, fsr)
      },
      {
        id: 3,
        text: "Bend knees and lower hips.",
        instruction: "Bend your knees and sit back like you're sitting in a chair. Keep chest lifted.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Check knees bent
          if (checkVisible(landmarks, [24, 26, 28])) {
            const rKnee = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (rKnee) {
              const kneeScore = rKnee > 100 && rKnee < 145 ? 100 : Math.max(0, 100 - Math.min(Math.abs(rKnee - 122) / 25 * 100, 100));
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Bend your knees and lower your hips more.");
                incorrectJoints.push(23, 24, 25, 26, 27, 28);
              }
            }
          }

          // Check chest lifted
          if (checkVisible(landmarks, [11, 23])) {
            const levelDiff = landmarks[23].y - landmarks[11].y;
            const chestScore = levelDiff > 0.2 ? 100 : Math.max(0, Math.round((levelDiff / 0.2) * 100));
            scoreSum += chestScore;
            count++;
            if (chestScore < 80) {
              corrections.push("Keep your chest lifted and straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }

          // Check weight distribution
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const fsrScore = getFsrRatioScore(fsr.lf, fsr.rf, 50, 15);
            scoreSum += fsrScore;
            count++;
            if (fsrScore < 75) {
              corrections.push("Distribute your weight evenly across both feet.");
              incorrectJoints.push(27, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 7: Cobra Pose (Bhujangasana)
  7: {
    poseName: "Cobra Pose",
    holdDuration: 20,
    steps: [
      {
        id: 1,
        text: "Lie face down.",
        instruction: "Lie flat on your stomach, legs extended, tops of feet flat on the mat.",
        expectedPressureDistribution: { lh: 10, rh: 10, lk: 0, rk: 0, lf: 40, rf: 40 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const lowBody = landmarks[11].y > 0.5 && landmarks[23].y > 0.5;
            if (!lowBody) {
              score = 50;
              corrections.push("Lie fully flat down on the mat.");
              incorrectJoints.push(11, 12, 23, 24, 25, 26, 27, 28);
            }
          }
          return { score, corrections, expectedFsr: { lh: 10, rh: 10, lk: 0, rk: 0, lf: 40, rf: 40 }, incorrectJoints };
        }
      },
      {
        id: 2,
        text: "Place hands near chest.",
        instruction: "Place your hands flat on the mat directly under your shoulders.",
        expectedPressureDistribution: { lh: 20, rh: 20, lk: 0, rk: 0, lf: 30, rf: 30 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [15, 11])) {
            const dist = Math.hypot(landmarks[15].x - landmarks[11].x, landmarks[15].y - landmarks[11].y);
            if (dist > 0.2) {
              score = 60;
              corrections.push("Bring your hands directly underneath your shoulders.");
              incorrectJoints.push(11, 12, 15, 16);
            }
          }
          return { score, corrections, expectedFsr: { lh: 20, rh: 20, lk: 0, rk: 0, lf: 30, rf: 30 }, incorrectJoints };
        }
      },
      {
        id: 3,
        text: "Inhale and lift chest.",
        instruction: "Press into your hands and slowly lift your chest off the mat. Keep elbows bent.",
        expectedPressureDistribution: { lh: 30, rh: 30, lk: 0, rk: 0, lf: 20, rf: 20 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Chest raised
          if (checkVisible(landmarks, [11, 23])) {
            const lift = landmarks[23].y - landmarks[11].y;
            const liftScore = lift > 0.12 ? 100 : Math.max(0, Math.round((lift / 0.12) * 100));
            scoreSum += liftScore;
            count++;
            if (liftScore < 80) {
              corrections.push("Lift your chest higher off the mat.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }

          // Elbows bent
          if (checkVisible(landmarks, [11, 13, 15])) {
            const elbow = getAngle(landmarks[11], landmarks[13], landmarks[15]);
            if (elbow) {
              const elbowScore = elbow < 160 ? 100 : 60;
              scoreSum += elbowScore;
              count++;
              if (elbowScore < 80) {
                corrections.push("Keep a slight bend in your elbows.");
                incorrectJoints.push(11, 13, 15, 12, 14, 16);
              }
            }
          }

          // Hand pressure
          if (fsr && (fsr.lh > 5 || fsr.rh > 5)) {
            const handScore = (fsr.lh > 10 && fsr.rh > 10) ? 100 : 70;
            scoreSum += handScore;
            count++;
            if (handScore < 80) {
              corrections.push("Press firmly into both hands.");
              incorrectJoints.push(15, 16);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 30, rh: 30, lk: 0, rk: 0, lf: 20, rf: 20 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 17: Bridge Pose (Setu Bandhasana)
  17: {
    poseName: "Bridge Pose",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Lie on back with knees bent.",
        instruction: "Lie on your back, bend knees, and place feet flat on the floor close to your hips.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [24, 26, 28])) {
            const kneeAngle = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (kneeAngle && kneeAngle > 100) {
              score = 60;
              corrections.push("Bend your knees more, placing feet flat.");
              incorrectJoints.push(23, 24, 25, 26, 27, 28);
            }
          }
          return { score, corrections, expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 }, incorrectJoints };
        }
      },
      {
        id: 2,
        text: "Press feet and lift hips.",
        instruction: "Press into your feet and arms to lift your hips and back high off the mat.",
        expectedPressureDistribution: { lh: 10, rh: 10, lk: 0, rk: 0, lf: 40, rf: 40 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Hip raised high
          if (checkVisible(landmarks, [23, 11, 25])) {
            const midKneeShoulderY = (landmarks[11].y + landmarks[25].y) / 2;
            const liftAmount = midKneeShoulderY - landmarks[23].y;
            const liftScore = liftAmount > 0.08 ? 100 : Math.max(0, Math.round((liftAmount / 0.08) * 100));
            scoreSum += liftScore;
            count++;
            if (liftScore < 80) {
              corrections.push("Lift your hips higher toward the ceiling.");
              incorrectJoints.push(23, 24, 25, 26, 27, 28);
            }
          }

          // Feet pressure
          if (fsr && (fsr.lf > 5 || fsr.rf > 5)) {
            const feetScore = (fsr.lf > 15 && fsr.rf > 15) ? 100 : 70;
            scoreSum += feetScore;
            count++;
            if (feetScore < 80) {
              corrections.push("Press down firmly through both feet.");
              incorrectJoints.push(27, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 10, rh: 10, lk: 0, rk: 0, lf: 40, rf: 40 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 4: Plank Pose (Phalakasana)
  4: {
    poseName: "Plank Pose",
    holdDuration: 45,
    steps: [
      {
        id: 1,
        text: "Start on hands and knees.",
        instruction: "Come to your hands and knees on the mat, wrists under shoulders.",
        expectedPressureDistribution: { lh: 20, rh: 20, lk: 30, rk: 30, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [25, 26])) {
            const lowKnees = landmarks[25].y > 0.5 && landmarks[26].y > 0.5;
            if (!lowKnees) {
              score = 60;
              corrections.push("Place your knees down on the mat.");
              incorrectJoints.push(25, 26);
            }
          }
          return { score, corrections, expectedFsr: { lh: 20, rh: 20, lk: 30, rk: 30, lf: 0, rf: 0 }, incorrectJoints };
        }
      },
      {
        id: 2,
        text: "Extend legs and make straight line.",
        instruction: "Extend your legs back, lifting knees. Keep your body straight from head to heels.",
        expectedPressureDistribution: { lh: 25, rh: 25, lk: 0, rk: 0, lf: 25, rf: 25 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Verify knees off mat
          if (checkVisible(landmarks, [23, 25, 27])) {
            const lKnee = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            if (lKnee) {
              const kneeScore = lKnee > 158 ? 100 : Math.max(0, 100 - (158 - lKnee) / 20 * 100);
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Straighten your legs and lift your knees.");
                incorrectJoints.push(23, 24, 25, 26, 27, 28);
              }
            }
          }

          // Body straight line
          if (checkVisible(landmarks, [11, 23, 27])) {
            const bodyLine = getAngle(landmarks[11], landmarks[23], landmarks[27]);
            if (bodyLine) {
              const lineScore = bodyLine > 155 && bodyLine < 195 ? 100 : Math.max(0, 100 - Math.abs(bodyLine - 175) / 25 * 100);
              scoreSum += lineScore;
              count++;
              if (lineScore < 80) {
                corrections.push("Keep your hips level. Don't let your lower back sag.");
                incorrectJoints.push(11, 12, 23, 24);
              }
            }
          }

          // FSR weight distribution
          if (fsr && (fsr.lh > 5 || fsr.rh > 5 || fsr.lf > 5 || fsr.rf > 5)) {
            const total = fsr.lh + fsr.rh + fsr.lf + fsr.rf;
            const handRatio = ((fsr.lh + fsr.rh) / total) * 100;
            const handScore = handRatio > 35 && handRatio < 65 ? 100 : 70;
            scoreSum += handScore;
            count++;
            if (handScore < 80) {
              corrections.push("Distribute weight evenly between hands and feet.");
              incorrectJoints.push(15, 16, 27, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 25, rh: 25, lk: 0, rk: 0, lf: 25, rf: 25 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 2: Downward Dog (Adho Mukha Svanasana)
  2: {
    poseName: "Downward Dog",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Start on hands and knees.",
        instruction: "Start on your hands and knees on the mat.",
        expectedPressureDistribution: { lh: 20, rh: 20, lk: 30, rk: 30, lf: 0, rf: 0 },
        validate: (l, f) => poseBlueprints[4].steps[0].validate(l, f)
      },
      {
        id: 2,
        text: "Lift hips up and back.",
        instruction: "Press into your hands, lift knees, and push your hips up and back to form an inverted V.",
        expectedPressureDistribution: { lh: 25, rh: 25, lk: 0, rk: 0, lf: 25, rf: 25 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Hips high
          if (checkVisible(landmarks, [11, 23, 27])) {
            const hipHigh = landmarks[23].y < landmarks[11].y && landmarks[23].y < landmarks[27].y;
            const hipScore = hipHigh ? 100 : 50;
            scoreSum += hipScore;
            count++;
            if (!hipHigh) {
              corrections.push("Lift your hips higher up and back.");
              incorrectJoints.push(23, 24);
            }
          }

          // Knee angle
          if (checkVisible(landmarks, [23, 25, 27])) {
            const kAngle = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            if (kAngle) {
              const kneeScore = kAngle > 145 ? 100 : Math.max(0, 100 - (145 - kAngle) / 30 * 100);
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Straighten your legs (or keep a micro-bend if tight).");
                incorrectJoints.push(23, 24, 25, 26, 27, 28);
              }
            }
          }

          // Elbow angle
          if (checkVisible(landmarks, [11, 13, 15])) {
            const armAngle = getAngle(landmarks[11], landmarks[13], landmarks[15]);
            if (armAngle) {
              const armScore = armAngle > 155 ? 100 : Math.max(0, 100 - (155 - armAngle) / 35 * 100);
              scoreSum += armScore;
              count++;
              if (armScore < 80) {
                corrections.push("Press firmly into your palms and straighten arms.");
                incorrectJoints.push(11, 12, 13, 14, 15, 16);
              }
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 25, rh: 25, lk: 0, rk: 0, lf: 25, rf: 25 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 14: Triangle Pose (Trikonasana)
  14: {
    poseName: "Triangle Pose",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand with feet wide apart.",
        instruction: "Step your feet wide apart, about 3 to 4 feet.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => poseBlueprints[27].steps[1].validate(landmarks, fsr)
      },
      {
        id: 2,
        text: "Extend arms to the side.",
        instruction: "Raise your arms parallel to the floor, extending out to the side.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 45, rf: 55 },
        validate: (landmarks, fsr) => poseBlueprints[6].steps[2].validate(landmarks, fsr)
      },
      {
        id: 3,
        text: "Hinge at hip and reach down.",
        instruction: "Reach to the right, hinge at your hip, and lower your right hand to your shin or floor. Left arm points straight up.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 40, rf: 60 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Check right hand is low
          if (checkVisible(landmarks, [16, 24])) {
            const handLow = landmarks[16].y > landmarks[24].y;
            const handScore = handLow ? 100 : 50;
            scoreSum += handScore;
            count++;
            if (!handLow) {
              corrections.push("Lower your right hand down to your shin or floor.");
              incorrectJoints.push(12, 14, 16);
            }
          }

          // Check left hand is high
          if (checkVisible(landmarks, [15, 11])) {
            const handHigh = landmarks[15].y < landmarks[11].y - 0.12;
            const handScore = handHigh ? 100 : 50;
            scoreSum += handScore;
            count++;
            if (!handHigh) {
              corrections.push("Extend your left arm straight up toward the ceiling.");
              incorrectJoints.push(11, 13, 15);
            }
          }

          // Check legs straight
          if (checkVisible(landmarks, [24, 26, 28])) {
            const knee = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (knee) {
              const legScore = knee > 150 ? 100 : Math.max(0, 100 - (150 - knee) / 25 * 100);
              scoreSum += legScore;
              count++;
              if (legScore < 80) {
                corrections.push("Keep your front leg straight.");
                incorrectJoints.push(24, 26, 28);
              }
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 40, rf: 60 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 10: Boat Pose (Navasana)
  10: {
    poseName: "Boat Pose",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Sit on floor with knees bent.",
        instruction: "Sit with knees bent, feet flat on the floor, spine straight.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 23])) {
            const vertical = landmarks[23].y > landmarks[11].y;
            if (!vertical) {
              score = 60;
              corrections.push("Sit up straight with a tall spine.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return { score, corrections, expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 }, incorrectJoints };
        }
      },
      {
        id: 2,
        text: "Tilt back & lift feet off floor.",
        instruction: "Lean back slightly and lift your feet off the mat, balancing on your tailbone.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Hips low, feet high
          if (checkVisible(landmarks, [23, 27, 28])) {
            const feetHigh = landmarks[27].y < landmarks[23].y - 0.05 && landmarks[28].y < landmarks[23].y - 0.05;
            const liftScore = feetHigh ? 100 : 50;
            scoreSum += liftScore;
            count++;
            if (!feetHigh) {
              corrections.push("Lift your feet higher off the floor.");
              incorrectJoints.push(27, 28);
            }
          }

          // FSR: no contact
          if (fsr) {
            const touch = fsr.lh + fsr.rh + fsr.lf + fsr.rf;
            const balanceScore = touch < 20 ? 100 : Math.max(0, 100 - (touch / 50) * 100);
            scoreSum += balanceScore;
            count++;
            if (balanceScore < 80) {
              corrections.push("Balance on your sitting bones, feet in the air.");
              incorrectJoints.push(27, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 },
            incorrectJoints
          };
        }
      },
      {
        id: 3,
        text: "Extend arms forward parallel to floor.",
        instruction: "Extend your arms straight forward parallel to the floor, forming a V shape.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Arms parallel
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const lArmDiff = Math.abs(landmarks[15].y - landmarks[11].y);
            const rArmDiff = Math.abs(landmarks[16].y - landmarks[12].y);
            const armScore = (lArmDiff < 0.2 && rArmDiff < 0.2) ? 100 : 60;
            scoreSum += armScore;
            count++;
            if (armScore < 80) {
              corrections.push("Extend your arms straight forward.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }

          // Feet still high
          if (checkVisible(landmarks, [23, 27, 28])) {
            const feetHigh = landmarks[27].y < landmarks[23].y - 0.05;
            scoreSum += feetHigh ? 100 : 50;
            count++;
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 0, rf: 0 },
            incorrectJoints
          };
        }
      }
    ]
  },

  // 9: Crow Pose (Bakasana)
  9: {
    poseName: "Crow Pose",
    holdDuration: 20,
    steps: [
      {
        id: 1,
        text: "Come into a deep squat.",
        instruction: "Squat down low with your feet together, knees wide apart.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [23])) {
            const lowHips = landmarks[23].y > 0.6;
            if (!lowHips) {
              score = 70;
              corrections.push("Squat down deeply, lowering your hips.");
              incorrectJoints.push(23, 24, 25, 26, 27, 28);
            }
          }
          return { score, corrections, expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 }, incorrectJoints };
        }
      },
      {
        id: 2,
        text: "Place hands flat on mat.",
        instruction: "Place your hands flat on the mat, shoulder-width apart, fingers spread wide.",
        expectedPressureDistribution: { lh: 20, rh: 20, lk: 0, rk: 0, lf: 30, rf: 30 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [15, 16])) {
            const lowWrists = landmarks[15].y > 0.6 && landmarks[16].y > 0.6;
            if (!lowWrists) {
              score = 60;
              corrections.push("Place your hands flat on the floor.");
              incorrectJoints.push(15, 16);
            }
          }
          return { score, corrections, expectedFsr: { lh: 20, rh: 20, lk: 0, rk: 0, lf: 30, rf: 30 }, incorrectJoints };
        }
      },
      {
        id: 3,
        text: "Place knees on triceps.",
        instruction: "Lean forward and place your knees high up on the back of your upper arms.",
        expectedPressureDistribution: { lh: 35, rh: 35, lk: 0, rk: 0, lf: 15, rf: 15 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [25, 26, 13, 14])) {
            const lDist = Math.hypot(landmarks[25].x - landmarks[13].x, landmarks[25].y - landmarks[13].y);
            const rDist = Math.hypot(landmarks[26].x - landmarks[14].x, landmarks[26].y - landmarks[14].y);
            if (lDist > 0.25 || rDist > 0.25) {
              score = 65;
              corrections.push("Press your knees firmly into the back of your upper arms.");
              incorrectJoints.push(13, 14, 25, 26);
            }
          }
          return { score, corrections, expectedFsr: { lh: 35, rh: 35, lk: 0, rk: 0, lf: 15, rf: 15 }, incorrectJoints };
        }
      },
      {
        id: 4,
        text: "Lift feet off floor.",
        instruction: "Lean forward, shift weight into hands, and lift your feet off the floor.",
        expectedPressureDistribution: { lh: 50, rh: 50, lk: 0, rk: 0, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;

          // Check feet y is higher than wrists y
          if (checkVisible(landmarks, [27, 28])) {
            const raisedFeet = landmarks[27].y < 0.75 && landmarks[28].y < 0.75;
            const feetScore = raisedFeet ? 100 : 40;
            scoreSum += feetScore;
            count++;
            if (!raisedFeet) {
              corrections.push("Shift weight forward and lift your feet off the mat.");
              incorrectJoints.push(27, 28);
            }
          }

          // FSR check
          if (fsr && (fsr.lh > 5 || fsr.rh > 5)) {
            const footTouch = fsr.lf + fsr.rf;
            const balanceScore = footTouch < 15 ? 100 : Math.max(0, 100 - (footTouch / 40) * 100);
            scoreSum += balanceScore;
            count++;
            if (balanceScore < 80) {
              corrections.push("Take all weight off your feet and onto hands.");
              incorrectJoints.push(27, 28);
            }
          }

          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 50, rh: 50, lk: 0, rk: 0, lf: 0, rf: 0 },
            incorrectJoints
          };
        }
      }
    ]
  },
  1: {
    poseName: "Tadasana",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand upright with feet together",
        instruction: "Stand upright with feet together, arms by your sides.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [27, 28])) {
            const dist = Math.abs(landmarks[27].x - landmarks[28].x);
            const feetTogetherScore = Math.max(0, 100 - Math.max(0, dist - 0.12) / 0.1 * 100);
            scoreSum += feetTogetherScore;
            count++;
            if (feetTogetherScore < 80) {
              corrections.push("Bring your feet closer together.");
              incorrectJoints.push(27, 28);
            }
          }
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = Math.max(0, 100 - Math.max(0, spineDiff - 0.08) / 0.08 * 100);
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 2,
        text: "Keep both legs straight",
        instruction: "Engage your thighs and keep both legs fully straight.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [23, 25, 27])) {
            const leftKnee = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            if (leftKnee) {
              const kneeScore = leftKnee > 160 ? 100 : Math.max(0, 100 - (160 - leftKnee) / 30 * 100);
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Keep both knees straight.");
                incorrectJoints.push(23, 25, 27, 24, 26, 28);
              }
            }
          }
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = Math.max(0, 100 - Math.max(0, spineDiff - 0.08) / 0.08 * 100);
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 3,
        text: "Keep your spine straight",
        instruction: "Lengthen your spine upward, keeping it completely upright.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = Math.max(0, 100 - Math.max(0, spineDiff - 0.08) / 0.08 * 100);
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Raise both arms overhead",
        instruction: "Extend both arms fully straight overhead, palms facing each other.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const leftArmUp = landmarks[11].y - landmarks[15].y;
            const rightArmUp = landmarks[12].y - landmarks[16].y;
            const armUpScore = (leftArmUp > 0.15 && rightArmUp > 0.15) ? 100 : 0;
            scoreSum += armUpScore;
            count++;
            if (armUpScore < 80) {
              corrections.push("Raise your arms overhead.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = Math.max(0, 100 - Math.max(0, spineDiff - 0.08) / 0.08 * 100);
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 5,
        text: "Look straight and breathe normally",
        instruction: "Find a point of focus in front of you, look straight, and breathe steadily.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [27, 28])) {
            const dist = Math.abs(landmarks[27].x - landmarks[28].x);
            const feetTogetherScore = Math.max(0, 100 - Math.max(0, dist - 0.12) / 0.1 * 100);
            scoreSum += feetTogetherScore;
            count++;
            if (feetTogetherScore < 80) {
              corrections.push("Bring your feet closer together.");
              incorrectJoints.push(27, 28);
            }
          }
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = Math.max(0, 100 - Math.max(0, spineDiff - 0.08) / 0.08 * 100);
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const leftArmUp = landmarks[11].y - landmarks[15].y;
            const rightArmUp = landmarks[12].y - landmarks[16].y;
            const armUpScore = (leftArmUp > 0.15 && rightArmUp > 0.15) ? 100 : 0;
            scoreSum += armUpScore;
            count++;
            if (armUpScore < 80) {
              corrections.push("Raise your arms overhead.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      }
    ]
  },
  31: {
    poseName: "Vakrakonasana",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Stand with feet apart",
        instruction: "Stand upright and step your feet wide apart (wider than shoulder width).",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [27, 28])) {
            const dist = Math.abs(landmarks[27].x - landmarks[28].x);
            if (dist < 0.22) {
              score = 60;
              corrections.push("Bend sideways more.");
              incorrectJoints.push(27, 28);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 2,
        text: "Raise both arms sideways",
        instruction: "Extend both arms straight out to the sides at shoulder height, palms facing down.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [11, 13, 15, 12, 14, 16])) {
            const leftElbow = getAngle(landmarks[11], landmarks[13], landmarks[15]);
            const rightElbow = getAngle(landmarks[12], landmarks[14], landmarks[16]);
            const lElbowScore = leftElbow && leftElbow > 150 ? 100 : 50;
            const rElbowScore = rightElbow && rightElbow > 150 ? 100 : 50;
            const armsScore = (lElbowScore + rElbowScore) / 2;
            scoreSum += armsScore;
            count++;
            if (armsScore < 80) {
              corrections.push("Extend your arms fully.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 3,
        text: "Bend sideways from the waist",
        instruction: "Inhale, then exhale and bend your torso sideways from the waist.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 60, rf: 40 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const bendOffset = Math.abs(shCenter - hipCenter);
            if (bendOffset < 0.12) {
              score = 65;
              corrections.push("Bend sideways more.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 60, rf: 40, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Keep both legs straight",
        instruction: "Do not bend your knees as you maintain the sideways stretch.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 60, rf: 40 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [23, 25, 27])) {
            const leftKnee = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            if (leftKnee) {
              const kneeScore = leftKnee > 155 ? 100 : Math.max(0, 100 - (155 - leftKnee) / 30 * 100);
              scoreSum += kneeScore;
              count++;
              if (kneeScore < 80) {
                corrections.push("Keep both knees straight.");
                incorrectJoints.push(23, 25, 27, 24, 26, 28);
              }
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 60, rf: 40, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 5,
        text: "Look upward towards upper hand",
        instruction: "Turn your neck gently to look upward toward your raised hand.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 60, rf: 40 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [0, 11, 12])) {
            const headY = landmarks[0].y;
            const shY = (landmarks[11].y + landmarks[12].y) / 2;
            if (headY > shY - 0.05) {
              score = 80;
              corrections.push("Look upward.");
              incorrectJoints.push(0, 11, 12);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 60, rf: 40, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      }
    ]
  },
  32: {
    poseName: "Swastikasana",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Sit comfortably on the mat",
        instruction: "Sit flat on the mat with your legs extended straight forward.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 25, rk: 25, lf: 25, rf: 25 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shY = (landmarks[11].y + landmarks[12].y) / 2;
            const hipY = (landmarks[23].y + landmarks[24].y) / 2;
            if (hipY - shY < 0.15) {
              score = 60;
              corrections.push("Sit comfortably with crossed legs.");
              incorrectJoints.push(23, 24, 25, 26, 27, 28);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 2,
        text: "Cross both legs comfortably",
        instruction: "Bend your knees and cross your shins, drawing your feet close under your thighs.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [23, 25, 27, 24, 26, 28])) {
            const leftKnee = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            const rightKnee = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            if (leftKnee > 110 || rightKnee > 110) {
              score = 70;
              corrections.push("Sit comfortably with crossed legs.");
              incorrectJoints.push(23, 24, 25, 26, 27, 28);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 3,
        text: "Keep spine upright",
        instruction: "Lengthen your spine, sit tall, and roll your shoulders back and down.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            if (spineDiff > 0.08) {
              score = 70;
              corrections.push("Keep your spine upright.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Rest hands on knees",
        instruction: "Place your hands on your knees in a comfortable, relaxed mudra.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [15, 25, 16, 26])) {
            const lDist = Math.hypot(landmarks[15].x - landmarks[25].x, landmarks[15].y - landmarks[25].y);
            const rDist = Math.hypot(landmarks[16].x - landmarks[26].x, landmarks[16].y - landmarks[26].y);
            if (lDist > 0.22 || rDist > 0.22) {
              score = 75;
              corrections.push("Place your hands on your knees.");
              incorrectJoints.push(15, 16, 25, 26);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 5,
        text: "Close eyes and breathe deeply",
        instruction: "Softly close your eyes, relax your face, and take slow, deep breaths.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = spineDiff <= 0.08 ? 100 : 70;
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine upright.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          if (checkVisible(landmarks, [15, 25, 16, 26])) {
            const lDist = Math.hypot(landmarks[15].x - landmarks[25].x, landmarks[15].y - landmarks[25].y);
            const rDist = Math.hypot(landmarks[16].x - landmarks[26].x, landmarks[16].y - landmarks[26].y);
            const handsScore = (lDist <= 0.22 && rDist <= 0.22) ? 100 : 75;
            scoreSum += handsScore;
            count++;
            if (handsScore < 80) {
              corrections.push("Place your hands on your knees.");
              incorrectJoints.push(15, 16, 25, 26);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      }
    ]
  },
  33: {
    poseName: "Baddha Konasana",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Sit with legs extended",
        instruction: "Sit upright on the mat with legs extended straight out in front of you.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            if (spineDiff > 0.08) {
              score = 70;
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 2,
        text: "Bring soles of feet together",
        instruction: "Bend your knees and draw your heels towards your pelvis, pressing soles of feet together.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [27, 28])) {
            const dist = Math.hypot(landmarks[27].x - landmarks[28].x, landmarks[27].y - landmarks[28].y);
            if (dist > 0.15) {
              score = 65;
              corrections.push("Bring the soles of your feet together.");
              incorrectJoints.push(27, 28);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 3,
        text: "Hold feet with both hands",
        instruction: "Clasp your feet or big toes firmly with both hands.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [15, 16, 27, 28])) {
            const lDist = Math.hypot(landmarks[15].x - landmarks[27].x, landmarks[15].y - landmarks[27].y);
            const rDist = Math.hypot(landmarks[16].x - landmarks[28].x, landmarks[16].y - landmarks[28].y);
            if (lDist > 0.25 || rDist > 0.25) {
              score = 75;
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(15, 16, 27, 28);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Keep spine straight",
        instruction: "Sit upright, lift your chest, and lengthen the back of your neck.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            if (spineDiff > 0.08) {
              score = 70;
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      },
      {
        id: 5,
        text: "Move knees gently toward the floor",
        instruction: "Gently press your thighs and knees downward toward the floor to open the hips.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [23, 25, 27, 24, 26, 28])) {
            const leftKnee = getAngle(landmarks[23], landmarks[25], landmarks[27]);
            const rightKnee = getAngle(landmarks[24], landmarks[26], landmarks[28]);
            const lKneeScore = (leftKnee && leftKnee < 110) ? 100 : 70;
            const rKneeScore = (rightKnee && rightKnee < 110) ? 100 : 70;
            const kneeScore = (lKneeScore + rKneeScore) / 2;
            scoreSum += kneeScore;
            count++;
            if (kneeScore < 80) {
              corrections.push("Open your knees outward.");
              incorrectJoints.push(25, 26);
            }
          }
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = spineDiff <= 0.08 ? 100 : 70;
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Keep your spine straight.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 0, rk: 0, lf: 50, rf: 50, leftFoot: true, rightFoot: true },
            incorrectJoints
          };
        }
      }
    ]
  },
  34: {
    poseName: "Parvatasana",
    holdDuration: 30,
    steps: [
      {
        id: 1,
        text: "Sit comfortably in cross-legged position",
        instruction: "Sit tall on the mat and cross your legs comfortably (Sukhasana).",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shY = (landmarks[11].y + landmarks[12].y) / 2;
            const hipY = (landmarks[23].y + landmarks[24].y) / 2;
            if (hipY - shY < 0.15) {
              score = 60;
              corrections.push("Sit upright.");
              incorrectJoints.push(23, 24, 25, 26, 27, 28);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 2,
        text: "Interlock fingers",
        instruction: "Place your hands in front of your body and interlock your fingers.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [15, 16])) {
            const dist = Math.hypot(landmarks[15].x - landmarks[16].x, landmarks[15].y - landmarks[16].y);
            if (dist > 0.18) {
              score = 75;
              corrections.push("Sit upright.");
              incorrectJoints.push(15, 16);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 3,
        text: "Raise both arms overhead",
        instruction: "Inhale and raise your interlocked hands straight up overhead, palms facing skyward.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let score = 100;
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const leftArmUp = landmarks[11].y - landmarks[15].y;
            const rightArmUp = landmarks[12].y - landmarks[16].y;
            if (leftArmUp < 0.15 || rightArmUp < 0.15) {
              score = 65;
              corrections.push("Raise both arms overhead.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }
          return {
            score,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 4,
        text: "Keep elbows straight",
        instruction: "Extend your arms fully, keeping your elbows locked and straight.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [11, 13, 15])) {
            const leftElbow = getAngle(landmarks[11], landmarks[13], landmarks[15]);
            if (leftElbow) {
              const elbowScore = leftElbow > 150 ? 100 : Math.max(0, 100 - (150 - leftElbow) / 40 * 100);
              scoreSum += elbowScore;
              count++;
              if (elbowScore < 80) {
                corrections.push("Keep your elbows straight.");
                incorrectJoints.push(11, 13, 15, 12, 14, 16);
              }
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      },
      {
        id: 5,
        text: "Maintain an upright spine",
        instruction: "Sit tall with an upright spine, extending from the base to the crown.",
        expectedPressureDistribution: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0 },
        validate: (landmarks, fsr) => {
          const corrections = [];
          const incorrectJoints = [];
          let scoreSum = 0;
          let count = 0;
          if (checkVisible(landmarks, [11, 12, 23, 24])) {
            const shCenter = (landmarks[11].x + landmarks[12].x) / 2;
            const hipCenter = (landmarks[23].x + landmarks[24].x) / 2;
            const spineDiff = Math.abs(shCenter - hipCenter);
            const spineScore = spineDiff <= 0.08 ? 100 : 70;
            scoreSum += spineScore;
            count++;
            if (spineScore < 80) {
              corrections.push("Sit upright.");
              incorrectJoints.push(11, 12, 23, 24);
            }
          }
          if (checkVisible(landmarks, [15, 16, 11, 12])) {
            const leftArmUp = landmarks[11].y - landmarks[15].y;
            const rightArmUp = landmarks[12].y - landmarks[16].y;
            const armUpScore = (leftArmUp > 0.15 && rightArmUp > 0.15) ? 100 : 0;
            scoreSum += armUpScore;
            count++;
            if (armUpScore < 80) {
              corrections.push("Raise both arms overhead.");
              incorrectJoints.push(11, 13, 15, 12, 14, 16);
            }
          }
          return {
            score: count > 0 ? Math.round(scoreSum / count) : 100,
            corrections,
            expectedFsr: { lh: 0, rh: 0, lk: 50, rk: 50, lf: 0, rf: 0, leftKnee: true, rightKnee: true },
            incorrectJoints
          };
        }
      }
    ]
  }
};
