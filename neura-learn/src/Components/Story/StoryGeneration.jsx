// StoryGeneration.jsx
import React, { useState, useEffect } from "react";
import "./StoryGeneration.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const StoryGeneratorUI = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Toggles for which favorites to include in the prompt
  const [selectedInterests, setSelectedInterests] = useState({
    favoriteColor: false,
    favoriteFood: false,
    favoriteCartoon: false,
    favoriteAnimal: false,
  });

  const [targetBehavior, setTargetBehavior] = useState("");
  const [selectedSticker, setSelectedSticker] = useState(null); // optional UI only
  const [errorMessage, setErrorMessage] = useState("");
  const [generating, setGenerating] = useState(false);

  // Interactive flow state
  // phases: creation -> choose -> end
  const [phase, setPhase] = useState("creation");
  const [partialStory, setPartialStory] = useState("");     // sections 1–4
  const [title, setTitle] = useState("Story");
  const [options, setOptions] = useState([]);               // exactly 3 options (A/B/C)
  const [finalTail, setFinalTail] = useState("");           // sections 5–9

  const rewardStickers = [
    { id: 1, emoji: "⭐", label: "Star" },
    { id: 2, emoji: "😊", label: "Happy Face" },
    { id: 3, emoji: "🎭", label: "Theatre" },
    { id: 4, emoji: "🎪", label: "Circus" },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("/api/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUserProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrorMessage("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInterestToggle = (interest) => {
    setSelectedInterests((prev) => ({ ...prev, [interest]: !prev[interest] }));
  };

  const handleStickerSelect = (stickerId) => setSelectedSticker(stickerId);

  // ======= INTERACTIVE MODE =======
  const navigate = useNavigate();
  const startInteractiveStory = async () => {
  setErrorMessage("");
  if (!targetBehavior.trim()) {
    setErrorMessage("Please describe the target behavior");
    return;
  }

  // Build the exact payload your backend expects
  const nz = (v) => (v && String(v).trim().length ? String(v).trim() : "not specified");
  const payload = {
    username: userProfile?.username || "Child",
    gender: nz(userProfile?.gender),
    age: Number.isInteger(userProfile?.age) ? userProfile.age : 0,
    favoriteColor: selectedInterests.favoriteColor ? nz(userProfile?.favoriteColor) : "not specified",
    favoriteAnimal: selectedInterests.favoriteAnimal ? nz(userProfile?.favoriteAnimal) : "not specified",
    favoriteFood: selectedInterests.favoriteFood ? nz(userProfile?.favoriteFood) : "not specified",
    favoriteCartoon: selectedInterests.favoriteCartoon ? nz(userProfile?.favoriteCartoon) : "not specified",
    target_behavior: targetBehavior.trim(),
  };

  // Route to the reader; the reader will hit /start and /continue
  navigate("/story/reader", { state: { payload, profile: userProfile } });
};

  const pickOption = async (optText) => {
    setErrorMessage("");
    setGenerating(true);
    try {
      const res = await axios.post(
        "/api/story/generate-story/continue",
        { partial_story: partialStory, selected_option: optText },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setFinalTail(res.data.continuation || "");
      setPhase("end");
    } catch (e) {
      console.error(e);
      setErrorMessage(e.response?.data?.detail || "Failed to continue story.");
    } finally {
      setGenerating(false);
    }
  };

  // ======= MISC =======

  const handleReset = () => {
    setSelectedInterests({
      favoriteColor: false,
      favoriteFood: false,
      favoriteCartoon: false,
      favoriteAnimal: false,
    });
    setTargetBehavior("");
    setSelectedSticker(null);
    setErrorMessage("");
    setGenerating(false);

    setPartialStory("");
    setFinalTail("");
    setTitle("Story");
    setOptions([]);

    setPhase("creation");
  };

  const renderProfileCard = () => (
    <div className="profile-card-box">
      <div className="profile-card-header">
        <span className="profile-icon">👤</span>
        <h3>Child Profile</h3>
      </div>
      <div className="profile-details">
        <div className="profile-row">
          <span className="profile-label">Name:</span>
          <span className="profile-value">{userProfile?.username || "N/A"}</span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Gender:</span>
          <span className="profile-value">{userProfile?.gender || "N/A"}</span>
        </div>
        <div className="profile-row">
          <span className="profile-label">Age:</span>
          <span className="profile-value">{userProfile?.age ?? "N/A"}</span>
        </div>
      </div>
    </div>
  );

  const renderInterestToggles = () => (
    <div className="form-section-box">
      <h2 className="section-number">
        <span>Select Interests</span>
      </h2>
      <div className="interests-list">
        {userProfile?.favoriteColor && (
          <div className="interest-item">
            <div className="interest-info">
              <span className="interest-icon">🎨</span>
              <div className="interest-text">
                <span className="interest-label">Favorite Color:</span>
                <span className="interest-value">{userProfile.favoriteColor}</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={selectedInterests.favoriteColor}
                onChange={() => handleInterestToggle("favoriteColor")}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        )}

        {userProfile?.favoriteFood && (
          <div className="interest-item">
            <div className="interest-info">
              <span className="interest-icon">🍕</span>
              <div className="interest-text">
                <span className="interest-label">Favorite Food:</span>
                <span className="interest-value">{userProfile.favoriteFood}</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={selectedInterests.favoriteFood}
                onChange={() => handleInterestToggle("favoriteFood")}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        )}

        {userProfile?.favoriteCartoon && (
          <div className="interest-item">
            <div className="interest-info">
              <span className="interest-icon">📺</span>
              <div className="interest-text">
                <span className="interest-label">Favorite Cartoon:</span>
                <span className="interest-value">{userProfile.favoriteCartoon}</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={selectedInterests.favoriteCartoon}
                onChange={() => handleInterestToggle("favoriteCartoon")}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        )}

        {userProfile?.favoriteAnimal && (
          <div className="interest-item">
            <div className="interest-info">
              <span className="interest-icon">🐾</span>
              <div className="interest-text">
                <span className="interest-label">Favorite Animal:</span>
                <span className="interest-value">{userProfile.favoriteAnimal}</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={selectedInterests.favoriteAnimal}
                onChange={() => handleInterestToggle("favoriteAnimal")}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        )}
      </div>
    </div>
  );

  const renderBehavior = () => (
    <div className="form-section-box">
      <h2 className="section-number">
        <span>Describe Target Behavior</span>
      </h2>
      <textarea
        className="behavior-textarea"
        placeholder="Example: Taking turns during playground time, going to the doctor, trying new foods..."
        value={targetBehavior}
        onChange={(e) => setTargetBehavior(e.target.value)}
        rows={3}
      />
    </div>
  );

  const renderRightColumn = () => (
    <div className="story-info-column">
      <div className="info-box how-it-works-box">
        <div className="info-header">
          <span className="info-icon">💡</span>
          <h3>How It Works</h3>
        </div>
        <div className="steps-list">
          <div className="step">
            <span className="step-badge">1</span>
            <p>Choose your child's interests...</p>
          </div>
          <div className="step">
            <span className="step-badge">2</span>
            <p>Describe the ground situation</p>
          </div>
          <div className="step">
            <span className="step-badge">3</span>
            <p>(Optional) Select a reward sticker</p>
          </div>
          <div className="step">
            <span className="step-badge">4</span>
            <p>Read and choose together</p>
          </div>
        </div>
      </div>

      <div className="info-box example-box">
        <div className="info-header">
          <span className="info-icon">📚</span>
          <h3>Example Topics</h3>
        </div>
        <div className="examples-list">
          <div className="example-item">
            <span className="example-icon">🎪</span>
            <span>Taking turns at the playground</span>
            <span className="arrow">›</span>
          </div>
          <div className="example-item">
            <span className="example-icon">😊</span>
            <span>Going to the doctor</span>
            <span className="arrow">›</span>
          </div>
          <div className="example-item">
            <span className="example-icon">🍽️</span>
            <span>Trying new foods</span>
            <span className="arrow">›</span>
          </div>
        </div>
      </div>

      <div className="form-section-box">
        <h2 className="section-number">
          <span>Select Reward Sticker (Optional)</span>
        </h2>
        <div className="sticker-selection">
          {rewardStickers.map((sticker) => (
            <div
              key={sticker.id}
              className={`sticker-option ${selectedSticker === sticker.id ? "selected" : ""}`}
              onClick={() => handleStickerSelect(sticker.id)}
              title={sticker.label}
            >
              <span className="sticker-emoji">{sticker.emoji}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ======= RENDER =======

  if (loading) {
    return (
      <div className="story-ui-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (phase === "creation") {
    return (
      <div className="story-ui-container">
        {/* Header */}
        <div className="story-header-section">
          <h1>Create a Personalized Story</h1>
          <p>Help your child learn through personalized social stories</p>
        </div>

        <div className="story-main-content">
          {/* Left Column - Form */}
          <div className="story-form-column">
            {renderProfileCard()}
            {renderInterestToggles()}
            {renderBehavior()}

            {/* Error */}
            {errorMessage && (
              <div className="error-box">
                <span className="error-icon">⚠️</span>
                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          {renderRightColumn()}
        </div>

        {/* Action Buttons */}
        <button className="create-story-btn" onClick={startInteractiveStory} disabled={generating}>
          {generating ? "Generating..." : "✨ Start Interactive Story"}
        </button>
      </div>
    );
  }

  if (phase === "choose") {
    return (
      <div className="story-reader-container">
        <div className="reader-toolbar">
          <button className="close-reader-btn" onClick={handleReset}>✕</button>
          <button className="btn-secondary" onClick={() => setPhase("creation")}>Back</button>
        </div>

        <div className="reader-content">
          <h2>{title}</h2>
          <pre className="story-text" style={{ whiteSpace: "pre-wrap" }}>{partialStory}</pre>

          <div className="options-row">
            {options.map((opt, idx) => (
              <button
                key={idx}
                className="option-btn"
                onClick={() => pickOption(opt)}
                disabled={generating}
                title={`Choose option ${String.fromCharCode(65 + idx)}`}
              >
                {String.fromCharCode(65 + idx)}. {opt}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div className="error-box" style={{ marginTop: 12 }}>
              <span className="error-icon">⚠️</span>
              <p>{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "end") {
    const finalText = (partialStory + (finalTail ? "\n\n" + finalTail : "")).trim();

    const computedTitle = (() => {
      if (!finalText) return "Story";
      const firstLine = finalText.split("\n")[0] || "";
      const tidy = firstLine.replace(/^(\d\.\s*)?Title[:\s-]*/i, "").trim();
      return tidy.length && tidy.length < 100 ? tidy : title || "Story";
    })();

    return (
      <div className="story-reader-container">
        <div className="reader-toolbar">
          <button className="close-reader-btn" onClick={handleReset}>✕</button>
          <button className="btn-secondary" onClick={() => setPhase("creation")}>Create New</button>
        </div>

        <div className="reader-content">
          <h2>{computedTitle}</h2>
          <pre className="story-text" style={{ whiteSpace: "pre-wrap" }}>{finalText}</pre>
        </div>
      </div>
    );
  }

  return null;
};

export default StoryGeneratorUI;
