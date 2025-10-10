// StoryGeneration.jsx
import React, { useState, useEffect, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import "./StoryGeneration.css";

const predefinedPrompts = [
  {
    id: 1,
    title: "Making Friends",
    description: "Learn how to make new friends at school",
    emoji: "👥",
    bgColor: "bg-primary-subtle",
    borderColor: "border-primary",
  },
  {
    id: 2,
    title: "Going to the Doctor",
    description: "What happens during a doctor visit",
    emoji: "🏥",
    bgColor: "bg-success-subtle",
    borderColor: "border-success",
  },
  {
    id: 3,
    title: "Sharing Toys",
    description: "How to share and take turns with toys",
    emoji: "🧸",
    bgColor: "bg-warning-subtle",
    borderColor: "border-warning",
  },
  {
    id: 4,
    title: "Brushing Teeth",
    description: "Daily routine for dental hygiene",
    emoji: "🦷",
    bgColor: "bg-info-subtle",
    borderColor: "border-info",
  },
  {
    id: 5,
    title: "School Bus Ride",
    description: "What to expect on the school bus",
    emoji: "🚌",
    bgColor: "bg-danger-subtle",
    borderColor: "border-danger",
  },
  {
    id: 6,
    title: "Birthday Party",
    description: "Celebrating birthdays with friends",
    emoji: "🎂",
    bgColor: "bg-secondary-subtle",
    borderColor: "border-secondary",
  },
];

const promptSuggestions = [
  "Write a story about sharing toys at school",
  "Create a story about going to the dentist",
  "Tell a story about making new friends",
  "Write about trying new foods at lunch",
  "Create a story about loud noises at assemblies",
  "Tell a story about visiting the library",
];

const StoryGeneration = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isValidPrompt, setIsValidPrompt] = useState(true);
  const [validationMsg, setValidationMsg] = useState("");
  const [activeStoryTitle, setActiveStoryTitle] = useState(null);
  const [activeStoryText, setActiveStoryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorModalShow, setErrorModalShow] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const storyDisplayRef = useRef(null);

  // Text-to-Speech references
  const speechSynth = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const utteranceRef = useRef(null);
  const selectedVoice = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        setUserProfile(data);
      } catch (error) {
        console.error("Profile fetch error:", error);
        setUserProfile(null);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const text = customPrompt.toLowerCase();
    if (!customPrompt.length) {
      setIsValidPrompt(true);
      setValidationMsg("");
      return;
    }
    const storyKeywords = [
      "story",
      "tell",
      "write",
      "create",
      "about",
      "make",
      "school",
      "friend",
      "family",
      "home",
      "play",
      "share",
      "help",
      "kind",
      "nice",
      "happy",
      "sad",
      "scared",
      "brave",
      "doctor",
      "dentist",
      "store",
      "park",
      "library",
      "bus",
      "eat",
      "sleep",
      "brush",
      "wash",
      "clean",
      "routine",
      "birthday",
      "party",
      "celebration",
      "visit",
      "trip",
      "learn",
      "teach",
      "practice",
      "try",
      "new",
      "different",
      "going",
      "visiting",
      "learning",
      "feeling",
      "being",
    ];
    const invalidKeywords = [
      "hack",
      "password",
      "login",
      "delete",
      "destroy",
      "hurt",
      "violence",
      "weapon",
      "inappropriate",
      "adult",
      "random",
    ];
    if (invalidKeywords.some((k) => text.includes(k))) {
      setIsValidPrompt(false);
      setValidationMsg(
        "💡 Please write about a story you'd like to hear. Try topics like school, friends, activities, or feelings."
      );
      return;
    }
    if (/^[0-9\s]+$/.test(text) || /^[a-z]{1,3}\s*[0-9]+/.test(text)) {
      setIsValidPrompt(false);
      setValidationMsg(
        "💡 Please write about a story you'd like to hear. Try topics like school, friends, activities, or feelings."
      );
      return;
    }
    const hasStoryKeyword = storyKeywords.some((k) => text.includes(k));
    const hasStoryPattern =
      text.includes("how to") ||
      text.includes("what happens") ||
      /\b(going|visiting|learning|feeling|being|trying|making|sharing)\b/.test(text);
    if (hasStoryKeyword || hasStoryPattern) {
      setIsValidPrompt(true);
      setValidationMsg("✅ Great! This looks like a story request.");
    } else {
      setIsValidPrompt(false);
      setValidationMsg(
        "💡 Please write about a story you'd like to hear. Try topics like school, friends, activities, or feelings."
      );
    }
  }, [customPrompt]);

  // Setup voices for speech synthesis on component mount
  useEffect(() => {
    const synth = speechSynth.current;
    if (!synth) return;

    const loadVoices = () => {
      const voices = synth.getVoices() || [];
      const target = voices.find((v) => /female|zira|child/i.test(v.name));
      selectedVoice.current = target || voices[0] || null;
      // Do NOT create a shared utterance here — we'll create per-speak.
    };

    synth.onvoiceschanged = loadVoices;
    // call now in case voices already loaded
    loadVoices();

    const handleBeforeUnload = () => {
      try {
        if (speechSynth.current && speechSynth.current.speaking) {
          speechSynth.current.cancel();
        }
      } catch (e) {
        console.log(e)
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleBeforeUnload();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup to cancel speechSynthesis on unmount and remove listeners
    return () => {
      synth.onvoiceschanged = null;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      try {
        if (speechSynth.current && speechSynth.current.speaking) {
          speechSynth.current.cancel();
        }
      } catch (e) {console.log(e)}
      utteranceRef.current = null;
    };
  }, []);

  // Function to speak given text — create a fresh utterance per call
  const speak = (text) => {
    if (!speechSynth.current) return;

    // cancel any currently speaking utterance
    if (speechSynth.current.speaking) {
      try {
        speechSynth.current.cancel();
      } catch (e) {
        console.log(e)
      }
    }

    // create new utterance for this text
    const u = new SpeechSynthesisUtterance(text);
    utteranceRef.current = u;

    // apply selected voice/pitch/rate if available
    if (selectedVoice.current) {
      u.voice = selectedVoice.current;
    }
    u.pitch = 1.8;
    u.rate = 0.9;

    // cleanup reference when finished or if error
    u.onend = () => {
      setTimeout(() => {
        if (utteranceRef.current === u) utteranceRef.current = null;
      }, 50);
    };
    u.onerror = () => {
      if (utteranceRef.current === u) utteranceRef.current = null;
    };

    try {
      speechSynth.current.speak(u);
    } catch (e) {
      console.warn("SpeechSynthesis speak error", e);
    }
  };

  // Stop narration helper
  const stopNarration = () => {
    try {
      if (speechSynth.current && speechSynth.current.speaking) {
        speechSynth.current.cancel();
      }
      utteranceRef.current = null;
    } catch (e) {
      console.log(e)
    }
  };

  // Trigger speech when story text changes and is not empty
  useEffect(() => {
    if (activeStoryText.trim()) {
      speak(activeStoryText);
    } else {
      if (speechSynth.current && speechSynth.current.speaking) {
        speechSynth.current.cancel();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoryText]);

  const generatePredefinedPrompt = async (promptId) => {
    const prompt = predefinedPrompts.find((p) => p.id === promptId);
    if (!prompt) return;
    setLoading(true);
    setActiveStoryTitle(null);
    setActiveStoryText("");
    setCustomPrompt("");
    try {
      const response = await fetch("/api/story/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_prompt: prompt.title }),
      });
      if (!response.ok) throw new Error("Failed to generate story from backend.");
      const data = await response.json();
      setActiveStoryTitle(prompt.title);
      setActiveStoryText(data.story);
      storyDisplayRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      setActiveStoryTitle(prompt.title);
      setActiveStoryText(
        userProfile
          ? `Hello! This is a fun story about ${prompt.title.toLowerCase()} personalized just for you, ${userProfile.username}.`
          : `Hello! This is a fun story about ${prompt.title.toLowerCase()} personalized just for you.`
      );
      setErrorMessage(error.message || "There was an error generating the story.");
      setErrorModalShow(true);
    }
    setLoading(false);
  };

  const generateCustomStory = async () => {
    if (!customPrompt.trim()) {
      setErrorMessage("Please write what kind of story you'd like to hear!");
      setErrorModalShow(true);
      return;
    }
    if (!isValidPrompt) {
      setErrorMessage(
        "Please write about a story topic! Try asking for stories about school, friends, family, or daily activities."
      );
      setErrorModalShow(true);
      return;
    }
    setLoading(true);
    setActiveStoryTitle(null);
    setActiveStoryText("");
    try {
      const response = await fetch("/api/story/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_prompt: customPrompt }),
      });
      if (!response.ok) throw new Error("Failed to generate story from backend.");
      const data = await response.json();
      setActiveStoryTitle("Your Custom Story");
      setActiveStoryText(data.story);
      storyDisplayRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setCustomPrompt("");
    } catch (error) {
      setErrorMessage(error.message || "There was an error generating the story.");
      setErrorModalShow(true);
    }
    setLoading(false);
  };

  const closeStoryDisplay = () => {
    setActiveStoryTitle(null);
    setActiveStoryText("");
    stopNarration();
  };

  const printStory = () => {
    if (!activeStoryTitle || !activeStoryText) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeStoryTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Fredoka+One:wght@400&family=ABeeZee:wght@400&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'ABeeZee', Arial, sans-serif; line-height: 1.8; padding: 20px; max-width: 800px; margin: 0 auto; color: #2c3e50; }
          h1 { font-family: 'Fredoka One', cursive; color: #6C9BD1; text-align: center; margin-bottom: 30px; font-size: 2.5rem; }
          .story-text { font-size: 1.1rem; white-space: pre-line; background: linear-gradient(135deg, #f8f9fa, #e3f2fd); padding: 30px; border-radius: 15px; border: 3px solid #6C9BD1; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 0.95rem; font-family: 'Fredoka One', cursive; }
          .header-emoji { font-size: 3rem; display: block; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <span class="header-emoji">📚</span>
        <h1>${activeStoryTitle}</h1>
        <div class="story-text">${activeStoryText.replace(/\n/g, "<br/>")}</div>
        <div class="footer">
          <p>🌟 Created with NeuraLearn Social Story Generator 🌟</p>
          <p>Personalized for ${userProfile ? userProfile.username : "you"}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="story-generation">
      <div className="container-fluid main-background">
        <header className="text-center py-4 mb-4">
          <div className="container">
            <h1 className="display-3 header-title text-white mb-3">
              <span className="logo-emoji">📚</span> NeuraLearn Social Stories
            </h1>
            <p className="lead text-white-75 fs-4">Create personalized stories just for you!</p>
          </div>
        </header>

        <div className="card profile-card shadow-lg border-0 rounded-4 mx-auto h-64">
          <div className="card-header bg-gradient-primary text-white text-center py-3">
            <div className="avatar-circle mx-auto mb-2">👤</div>
            <h2 className="card-title mb-0 fs-3">Your Profile</h2>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {userProfile ? (
                Object.entries(userProfile).map(([key, value]) => (
                  <div key={key} className="col-md-6">
                    <div
                      className={`profile-item rounded-3 p-3 ${
                        key === "age"
                          ? "bg-warning-subtle border border-warning"
                          : key === "favoriteColor"
                          ? "bg-success-subtle border border-success"
                          : key === "favoriteAnimal"
                          ? "bg-primary-subtle border border-primary"
                          : key === "favoriteFood"
                          ? "bg-danger-subtle border border-danger"
                          : key === "favoriteCartoon"
                          ? "bg-secondary-subtle border border-secondary"
                          : "bg-info-subtle border border-info"
                      }`}
                    >
                      <span className="profile-label fw-semibold text-capitalize">
                        {key.replace(/([A-Z])/g, " $1")}:
                      </span>
                      <span className="profile-value ms-2">{value}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>Loading profile...</p>
              )}
            </div>
          </div>
        </div>

        <main className="container">
          <div className="text-center mb-5">
            <h2 className="section-title text-white display-5 mb-3">Choose Your Story Adventure!</h2>
          </div>

          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-header bg-gradient-success text-white text-center py-4">
              <h3 className="card-title mb-0 fs-2 text-white">🌟 Choose Your Story!</h3>
              <p className="mb-0 mt-2 fs-5 text-white">Click on any story to create a personalized version just for you!</p>
            </div>
            <div className="card-body p-4">
              <div className="row g-4">
                {predefinedPrompts.map((prompt) => (
                  <div key={prompt.id} className="col-md-6 col-lg-4">
                    <div className={`card story-card h-100 ${prompt.bgColor} ${prompt.borderColor} shadow-sm rounded-4`}>
                      <div className="card-body text-center p-4">
                        <span className="story-icon d-block" style={{ fontSize: "2rem" }}>
                          {prompt.emoji}
                        </span>
                        <h4 className="story-card-title card-title">{prompt.title}</h4>
                        <p className="story-card-description card-text">{prompt.description}</p>
                        <button
                          className="btn btn-primary btn-lg rounded-pill px-4 w-100"
                          onClick={() => generatePredefinedPrompt(prompt.id)}
                        >
                          <span className="me-2">✨</span>
                          Create This Story
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-header bg-gradient-warning text-white text-center py-4">
              <h3 className="card-title mb-0 fs-2 text-white">✨ Create Your Own Story</h3>
              <p className="mb-0 mt-2 fs-5 text-white">Tell us what story you'd like to hear!</p>
            </div>
            <div className="card-body p-4">
              <div className="mb-4">
                <p className="fw-semibold fs-5 mb-3 text-center">💡 Need ideas? Try these:</p>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  {promptSuggestions.map((prompt, idx) => (
                    <span
                      key={idx}
                      className="suggestion-chip badge fs-6 me-2 mb-2"
                      style={{ cursor: "pointer" }}
                      onClick={() => setCustomPrompt(prompt)}
                    >
                      {prompt}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <textarea
                  id="customPrompt"
                  className="form-control form-control-lg rounded-3 border-2"
                  placeholder="Write about what kind of story you want... For example: 'Write a story about sharing toys at school' or 'Create a story about going to the dentist'"
                  rows="4"
                  style={{ fontSize: "1.1rem" }}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      e.preventDefault();
                      generateCustomStory();
                    }
                  }}
                />
                <div className={`mt-2 ${isValidPrompt ? "text-success" : "text-danger"}`} style={{ fontWeight: "600" }}>
                  {validationMsg}
                </div>
              </div>

              <div className="text-center">
                <button
                  className="btn btn-primary btn-lg px-5 py-3 rounded-pill shadow"
                  disabled={!isValidPrompt}
                  onClick={generateCustomStory}
                  style={{ fontSize: "1.2rem" }}
                >
                  <span className="me-2">✨</span>Create My Story
                </button>
              </div>
            </div>
          </div>

          {activeStoryTitle && (
            <section className="mb-5" ref={storyDisplayRef}>
              <div className="card shadow-lg border-0 rounded-4">
                <div className="card-header bg-gradient-info text-white d-flex justify-content-between align-items-center py-3">
                  <h3 className="card-title mb-0 fs-2 text-white">{activeStoryTitle}</h3>
                  <div className="d-flex gap-2 align-items-center">
                    <button className="btn btn-outline-light btn-sm rounded-pill" onClick={stopNarration} aria-label="Stop narration">
                      ⏹️ Stop
                    </button>
                    <button className="btn btn-outline-light btn-sm rounded-pill" onClick={closeStoryDisplay} aria-label="Close story">
                      <span className="me-1">✖️</span>Close
                    </button>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div
                    className="story-text bg-light border border-2 border-info rounded-3 p-4 mb-4"
                    style={{
                      fontSize: "1.1rem",
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {activeStoryText}
                  </div>
                  <div className="text-center">
                    <div className="btn-group gap-3" role="group">
                      <Button variant="warning" size="lg" className="rounded-pill px-4" onClick={generateCustomStory}>
                        <span className="me-2">🔄</span>Make Another Story
                      </Button>
                      <Button variant="outline-primary" size="lg" className="rounded-pill px-4" onClick={printStory}>
                        <span className="me-2">🖨️</span>Print Story
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Loading Modal */}
      <Modal centered show={loading} backdrop="static" keyboard={false} aria-labelledby="loadingModalLabel">
        <Modal.Body className="text-center p-5">
          <div className="fs-1 mb-4">📖</div>
          <h3 className="text-primary mb-3" id="loadingModalLabel">
            Creating your story...
          </h3>
          <p className="text-secondary fs-5">Please wait while we personalize your story just for you!</p>
          <div className="progress mt-4" style={{ height: "8px" }}>
            <div className="progress-bar bg-gradient-primary progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: "100%" }} />
          </div>
        </Modal.Body>
      </Modal>

      {/* Error Modal */}
      <Modal centered show={errorModalShow} onHide={() => setErrorModalShow(false)} aria-labelledby="errorModalLabel">
        <Modal.Body className="text-center p-5">
          <div className="fs-1 mb-4">😊</div>
          <h3 className="text-primary mb-3" id="errorModalLabel">
            Oops! Let's try again
          </h3>
          <p className="text-secondary fs-5 mb-4">{errorMessage}</p>
          <Button variant="primary" size="lg" className="rounded-pill px-4" onClick={() => setErrorModalShow(false)}>
            <span className="me-2">👍</span>Got it!
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default StoryGeneration;
