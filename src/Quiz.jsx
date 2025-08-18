// src/Quiz.jsx
import { useMemo, useState } from 'react';
import {
  baseRecommendations,
  jobFamilies,
  detailedFedipMapping,
} from './quizData.jsx';

/**
 * Grouping helpers
 */
const LEVELS = [
  'Trainee',
  'Apprentice',
  'Associate',
  'Junior',
  '', // base/no prefix
  'Qualified',
  'Senior',
  'Lead',
  'Principal',
  'Manager', // generic "X Manager" (when it's the base)
  'Head of',
  'Assistant Director of',
  'Director of',
  'Chief',
  'CXIO',
];

const LEVEL_PREFIXES = [
  'Trainee',
  'Apprentice',
  'Associate',
  'Junior',
  'Senior',
  'Lead',
  'Principal',
  'Head of',
  'Assistant Director of',
  'Director of',
  'Chief',
  'Qualified',
  'CXIO',
];

// return { level, base }
function parseRole(roleRaw) {
  const role = roleRaw.trim().replace(/\s+-\s*Management$/i, ''); // drop " - Management"
  // parenthetical specialization stays as part of base (e.g., "(Operations)")
  for (const p of LEVEL_PREFIXES) {
    const re = new RegExp(`^${p}\\b\\s*`, 'i');
    if (re.test(role)) {
      const base = role.replace(re, '').trim();
      return { level: p, base };
    }
  }
  // If role contains "Head of X", etc. but didn’t match (case/casing), normalize once more
  const headMatch = role.match(/^(Head of|Assistant Director of|Director of)\s+(.*)$/i);
  if (headMatch) {
    return { level: headMatch[1], base: headMatch[2] };
  }
  const chiefMatch = role.match(/^Chief\s+(.*)$/i);
  if (chiefMatch) {
    return { level: 'Chief', base: `Chief ${chiefMatch[1]}` }; // keep "Chief ..." as its own base
  }
  // For "X Manager" treat as base with implicit "Manager" level only if there are prefixed variants too
  return { level: '', base: role };
}

function levelRank(level) {
  const idx = LEVELS.indexOf(level);
  return idx === -1 ? LEVELS.indexOf('') : idx;
}

// Given an array OR already-nested object, return nested object { base: [roles...] }
function toNested(value) {
  if (Array.isArray(value)) {
    const groups = {};
    for (const r of value) {
      const { level, base } = parseRole(r);
      if (!groups[base]) groups[base] = new Set();
      groups[base].add(r);
    }
    // sort each bucket by level rank then alphabetically
    const nested = {};
    Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .forEach((base) => {
        const sorted = Array.from(groups[base]).sort((a, b) => {
          const la = parseRole(a).level;
          const lb = parseRole(b).level;
          const ra = levelRank(la);
          const rb = levelRank(lb);
          if (ra !== rb) return ra - rb;
          return a.localeCompare(b);
        });
        nested[base] = sorted;
      });
    return nested;
  }
  // already nested (object of arrays) — ensure sorted
  const nested = {};
  Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .forEach((k) => {
      const arr = value[k];
      nested[k] = Array.isArray(arr)
        ? [...arr].sort((a, b) => {
            const la = parseRole(a).level;
            const lb = parseRole(b).level;
            const ra = levelRank(la);
            const rb = levelRank(lb);
            if (ra !== rb) return ra - rb;
            return a.localeCompare(b);
          })
        : arr;
    });
  return nested;
}

export default function Quiz() {
  const [step, setStep] = useState(0);           // 0: base, 1: family, 2: subcat (if any), 3: role
  const [answers, setAnswers] = useState({});    // {0,1,2,3}
  const [result, setResult] = useState(null);

  // Build a fully nested structure for ALL families
  const nestedFamilies = useMemo(() => {
    const out = {};
    for (const family of Object.keys(jobFamilies)) {
      out[family] = toNested(jobFamilies[family]);
    }
    return out;
  }, []);

  const resetDownstream = (upToStep, nextAnswers) => {
    for (let i = upToStep + 1; i <= 3; i++) delete nextAnswers[i];
  };

  const calculateResult = (src = answers) => {
    const baseAnswer = src[0];
    // role can be at step 2 (flat families converted to nested still have a role step)
    const roleAnswer = src[3] ?? src[2];

    const professionalBody =
      baseRecommendations[baseAnswer] || 'FEDIP - General Membership';

    const fedipLevel =
      detailedFedipMapping[roleAnswer] || 'FEDIP Level not determined';

    setResult({ professionalBody, fedipLevel });
  };

  const handleSelect = (answer) => {
    const next = { ...answers, [step]: answer };

    // Clear downstream if earlier choice changed
    resetDownstream(step, next);
    setAnswers(next);

    // Decide next step
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      // If this family has multiple subcategories, go to subcategory step (2)
      const family = next[1];
      const subs = Object.keys(nestedFamilies[family] || {});
      if (subs.length > 1) {
        setStep(2);
      } else {
        // Only one subcategory: auto-pick it and jump to role step
        const onlySub = subs[0];
        next[2] = onlySub;
        setAnswers({ ...next });
        setStep(3);
      }
      return;
    }
    if (step === 2) {
      // Chose subcategory → go choose specific role
      setStep(3);
      return;
    }
    if (step === 3) {
      // Final selection → compute result
      calculateResult(next);
    }
  };

  const handleNext = () => {
    // Guard: must select something
    if (answers[step] == null) {
      alert('Please select an option first.');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      calculateResult(answers);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  const renderQuestion = () => {
    if (step === 0) {
      return (
        <>
          <h2>What Best Describes You?</h2>
          <div className="options-container">
            {Object.keys(baseRecommendations).map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={answers[0] === option ? 'selected' : ''}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <h2>Which job family are you in?</h2>
          <div className="options-container">
            {Object.keys(nestedFamilies).map((family) => (
              <button
                key={family}
                onClick={() => handleSelect(family)}
                className={answers[1] === family ? 'selected' : ''}
              >
                {family}
              </button>
            ))}
          </div>
        </>
      );
    }

    if (step === 2) {
      const family = answers[1];
      const subcats = Object.keys(nestedFamilies[family] || {});
      return (
        <>
          <h2>Select your role category</h2>
          <div className="options-container">
            {subcats.map((sub) => (
              <button
                key={sub}
                onClick={() => handleSelect(sub)}
                className={answers[2] === sub ? 'selected' : ''}
              >
                {sub}
              </button>
            ))}
          </div>
        </>
      );
    }

    if (step === 3) {
      const family = answers[1];
      const sub = answers[2];
      const roles = (nestedFamilies[family] && nestedFamilies[family][sub]) || [];
      return (
        <>
          <h2>Select your specific role</h2>
          <div className="options-container">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => handleSelect(role)}
                className={answers[3] === role ? 'selected' : ''}
              >
                {role}
              </button>
            ))}
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="quiz-container">
      {result ? (
        <div className="result-container">
          <h2>Your Recommendations</h2>
          <div className="result-item">
            <strong>Professional Body:</strong>
            <p>{result.professionalBody}</p>
          </div>
          <div className="result-item">
            <strong>FEDIP Level:</strong>
            <p>{result.fedipLevel}</p>
          </div>
          <button onClick={handleRestart} className="nav-button">
            Start Again
          </button>
        </div>
      ) : (
        <div>
          {renderQuestion()}
          <div className="navigation-buttons">
            {step > 0 && (
              <button onClick={handleBack} className="nav-button back-button">
                Back
              </button>
            )}
            <button onClick={handleNext} className="nav-button">
              {step < 3 ? 'Next' : 'See Result'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
