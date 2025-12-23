import React, { useState } from "react";
import {
  baseRecommendations,
  jobFamilies,
  detailedFedipMapping,
  familyToBodyMapping,
  subFamilyToBodyMapping,
  roleToBodyMapping,
} from "./quizData.jsx";

const Quiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  
  // --- NEW: State for the email form ---
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);


  const handleAnswer = (answer) => {
    const newAnswers = { ...answers, [step]: answer };
    if (step === 0) {
      delete newAnswers[1];
      delete newAnswers[2];
      delete newAnswers[3];
    }
    if (step === 1) {
      delete newAnswers[2];
      delete newAnswers[3];
    }
    if (step === 2) {
      delete newAnswers[3];
    }

    if (step === 1) {
      const familyName = answer;
      const subFamilyNames = Object.keys(jobFamilies[familyName]);
      if (subFamilyNames.length === 1 && subFamilyNames[0] === familyName) {
        newAnswers[2] = subFamilyNames[0];
        setAnswers(newAnswers);
        setStep(3);
        return;
      }
    }

    setAnswers(newAnswers);

    if (step < 3) {
      setStep(step + 1);
    } else {
      calculateResult(newAnswers);
    }
  };
  
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
    // --- NEW: Reset email form on restart ---
    setIsSubmitted(false);
    setEmail("");
  };

  // --- NEW: Handler for the email form submission ---
  // In your Quiz.jsx file, update this function

  const handleEmailSubmit = async (e) => {
    e.preventDefault(); // Prevents the page from reloading
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe.');
      }

      // If successful, show the thank you message
      setIsSubmitted(true);
      
    } catch (error) {
      // You could add some user-facing error message here
      console.error(error);
      alert('Subscription failed. Please try again.');
    }
  };

  const calculateResult = (finalAnswers) => {
    const baseAnswer = finalAnswers[0];
    const familyAnswer = finalAnswers[1];
    const subFamilyAnswer = finalAnswers[2];
    const jobRoleAnswer = finalAnswers[3];

    const recommendations = new Set();

     // Role based override or additions
    const roleBody = roleToBodyMapping[jobRoleAnswer];

    if (Array.isArray(roleBody)) {
      roleBody.forEach((b) => recommendations.add(b));
    } else if (roleBody) {
      recommendations.add(roleBody);
    }

    const subFamilySpecificBody = subFamilyToBodyMapping[subFamilyAnswer];
    if (subFamilySpecificBody) {
      recommendations.add(subFamilySpecificBody);
    }

    const familySpecificBody = familyToBodyMapping[familyAnswer];
    if (familySpecificBody) {
      recommendations.add(familySpecificBody);
    }

    const primaryBody = baseRecommendations[baseAnswer];
    if (primaryBody) {
      recommendations.add(primaryBody);
    }

    const fedipLevel =
      detailedFedipMapping[jobRoleAnswer] || "FEDIP Level not determined";

    if (recommendations.size === 0) {
      recommendations.add("FEDIP - General Membership");
    }

    setResult({ professionalBody: Array.from(recommendations), fedipLevel });
  };

  const renderQuestion = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2>What Best Describes You?</h2>
            <div className="options-container">
              {Object.keys(baseRecommendations).map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className={answers[0] === option ? "selected" : ""}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        );
      case 1:
        return (
          <>
            <h2>Which job family are you in?</h2>
            <div className="options-container">
              {Object.keys(jobFamilies).map((family) => (
                <button
                  key={family}
                  onClick={() => handleAnswer(family)}
                  className={answers[1] === family ? "selected" : ""}
                >
                  {family}
                </button>
              ))}
            </div>
          </>
        );
      case 2:
        const selectedFamily = answers[1];
        const subFamilies = selectedFamily ? Object.keys(jobFamilies[selectedFamily]) : [];
        return (
          <>
            <h2>Which sub-section are you in?</h2>
            <div className="options-container">
              {subFamilies.map((subFamily) => (
                <button
                  key={subFamily}
                  onClick={() => handleAnswer(subFamily)}
                  className={answers[2] === subFamily ? "selected" : ""}
                >
                  {subFamily}
                </button>
              ))}
            </div>
          </>
        );
      case 3:
        const family = answers[1];
        const subFamily = answers[2];
        let roles = (family && subFamily) ? (jobFamilies[family][subFamily] || []) : [];

        const seniorityOrder = {
          "FEDIP Associate Practitioner": 1,
          "FEDIP Practitioner": 2,
          "FEDIP Senior Practitioner": 3,
          "FEDIP Advanced Practitioner": 4,
          "FEDIP Leading Practitioner": 5,
          "None": 0
        };
        roles.sort((a, b) => {
          const levelA = detailedFedipMapping[a] || "None";
          const levelB = detailedFedipMapping[b] || "None";
          const seniorityA = seniorityOrder[levelA] || 0;
          const seniorityB = seniorityOrder[levelB] || 0;
          return seniorityA - seniorityB;
        });
        return (
          <>
            <h2>What is your current job role?</h2>
            <div className="options-container">
              {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleAnswer(role)}
                    className={answers[3] === role ? "selected" : ""}
                  >
                    {role}
                  </button>
                ))}
            </div>
          </>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="quiz-container">
      {result ? (
        <div className="result-container">
          <h2>Your Recommendations</h2>
          <div className="result-item">
            <strong>Professional Body / Bodies:</strong>
            <p>{result.professionalBody.join(' or ')}</p>
          </div>
          <div className="result-item">
            <strong>FEDIP Level:</strong>
            <p>{result.fedipLevel}</p>
          </div>
          
          {/* --- Email Collection Form --- */}
          <div className="email-form-container">
            {isSubmitted ? (
              <p className="thank-you-message">Thank you! Your brochure will be sent shortly.</p>
            ) : (
              <form onSubmit={handleEmailSubmit}>
                <p>To receive a brochure with more information, please enter your email address:</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
                <button type="submit" className="nav-button submit-button">Send Brochure</button>
              </form>
            )}
          </div>

          <div className="contact-note">
            <p className="contact-message">
              If you have any questions, or would like more personalised recommedations, please contact us at{" "}
              <a href="mailto:info@fedip.org">info@fedip.org</a>.
            </p>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;