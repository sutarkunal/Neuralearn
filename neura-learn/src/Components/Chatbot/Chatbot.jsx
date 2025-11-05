import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./Chatbot.css";

function Pill({ emoji, label, accent }) {
  return (
    <div className={`chatbot-pill ${accent}`}>
      <span className="chatbot-pill-emoji">{emoji}</span>
      <span className="chatbot-pill-label">{label}</span>
    </div>
  );
}

export default function Chatbot() {
  const navigate = useNavigate();
  const chatRef = useRef(null);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to Neuralearn! 🎓 I'm NeuraBot, your friendly learning assistant. Ask me anything!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(0.95);

  // Initialize Gemini API
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: `You are NeuraBot, a friendly educational assistant for NeuraLearn platform. You help students learn in a clear, patient, and encouraging way.

Guidelines:
- Use clear, simple language
- Break down complex topics into easy steps
- Be encouraging and supportive
- Use examples and analogies when explaining
- Keep responses concise but informative (2-4 paragraphs)
- Be patient and never judgmental
- Use emojis occasionally to be friendly
- For students with autism or learning differences, provide structured, step-by-step explanations
- Always stay positive and educational`,
  });

  // Load available voices (prioritize female voices)
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      
      // Filter for English female voices
      const femaleVoices = availableVoices.filter(
        (voice) =>
          voice.lang.startsWith("en") &&
          (voice.name.toLowerCase().includes("female") ||
            voice.name.toLowerCase().includes("woman") ||
            voice.name.toLowerCase().includes("zira") ||
            voice.name.toLowerCase().includes("samantha") ||
            voice.name.toLowerCase().includes("karen") ||
            voice.name.toLowerCase().includes("aria") ||
            voice.name.toLowerCase().includes("jenny") ||
            voice.name.toLowerCase().includes("victoria") ||
            voice.name.toLowerCase().includes("serena") ||
            (voice.name.includes("Google") && voice.name.includes("Female")))
      );

      // Use female voices if available, otherwise all English voices
      const voiceList = femaleVoices.length > 0 
        ? femaleVoices 
        : availableVoices.filter(v => v.lang.startsWith("en"));
      
      setVoices(voiceList);
      
      // Auto-select best female voice
      if (!selectedVoice && voiceList.length > 0) {
        const bestVoice = voiceList.find(v => 
          v.name.includes("Google") && v.name.includes("Female")
        ) || voiceList.find(v => 
          v.name.includes("Microsoft") && v.name.includes("Natural")
        ) || voiceList.find(v =>
          v.name.includes("Samantha")
        ) || voiceList[0];
        
        setSelectedVoice(bestVoice);
        console.log("🎤 Auto-selected voice:", bestVoice?.name);
      }
    };

    loadVoices();
    
    // Chrome needs this event listener
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  // Enhanced Text-to-Speech function with natural female voice
  const speakText = (text) => {
    window.speechSynthesis.cancel();

    // Remove emojis and special characters for better TTS
    const cleanText = text.replace(/[⚠️🎓💭✨🚀📚🧠🤝💡😊👋💬🌟]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure voice settings for natural, warm speech
    utterance.rate = speechRate;
    utterance.pitch = 1.1; // Slightly higher for warmth
    utterance.volume = 1.0;

    // Use selected voice or find best female voice
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        (v.name.includes("Google") && v.name.includes("Female")) ||
        v.name.includes("Zira") ||
        v.name.includes("Samantha")
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const send = async () => {
    const trimmed = q.trim();
    if (!trimmed) return;

    stopSpeaking();

    const userMessage = { role: "user", text: trimmed };
    setMessages((m) => [...m, userMessage]);
    setQ("");
    setIsLoading(true);

    try {
      const chatHistory = messages
        .slice(1)
        .map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.text }],
        }));

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(trimmed);
      const response = await result.response;
      const text = response.text();

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: text,
        },
      ]);

      // Auto-speak the response if enabled
      if (autoSpeak) {
        setTimeout(() => speakText(text), 100);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMsg = "Oops! I encountered an error. Please try again or rephrase your question.";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "⚠️ " + errorMsg,
        },
      ]);
      
      if (autoSpeak) {
        setTimeout(() => speakText(errorMsg), 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatbot-page">
      {/* Hover Button */}
      <div className="chatbot-hover-container">
        <button
          className="chatbot-hover-btn"
          onClick={() =>
            chatRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        >
          💬
        </button>
      </div>

      <div className="chatbot-container">
        {/* Top: Welcome + Pills */}
        <div className="chatbot-card">
          <div className="chatbot-header">
            <div className="chatbot-left">
              <h1 className="chatbot-title">NeuraBot</h1>
              <p className="chatbot-subtitle">
                Your friendly learning buddy, ask anything. ✨
              </p>
              <div className="chatbot-pill-grid">
                <Pill
                  emoji="📚"
                  label="General knowledge"
                  accent="chatbot-accent-yellow"
                />
                <Pill
                  emoji="🧠"
                  label="Application questions"
                  accent="chatbot-accent-sky"
                />
                <Pill
                  emoji="🤝"
                  label="Virtual Therapist"
                  accent="chatbot-accent-rose"
                />
                <Pill
                  emoji="💡"
                  label="Problem solving"
                  accent="chatbot-accent-lime"
                />
              </div>
            </div>
            <div className="chatbot-right">
              <div className="chatbot-bot-card">
                <div className="chatbot-bot-avatar">NL</div>
                <p className="chatbot-bot-name">NeuraBot</p>
                <div className="chatbot-bot-desc">
                  Made for learning, playful & safe
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div ref={chatRef} className="chatbot-chat-section">
          {/* Enhanced TTS Controls */}
          <div className="chatbot-tts-controls">
            <button
              className={`btn btn--sm ${autoSpeak ? "btn--primary" : "btn--outline"}`}
              onClick={() => setAutoSpeak(!autoSpeak)}
              title={autoSpeak ? "Auto-speak enabled" : "Auto-speak disabled"}
            >
              {autoSpeak ? "🔊 Auto-speak ON" : "🔇 Auto-speak OFF"}
            </button>
            
            {/* Voice Selection */}
            {voices.length > 0 && (
              <select
                className="chatbot-voice-select"
                value={selectedVoice?.name || ""}
                onChange={(e) => {
                  const voice = voices.find((v) => v.name === e.target.value);
                  setSelectedVoice(voice);
                  console.log("🎤 Voice changed to:", voice?.name);
                }}
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name.split(" - ")[0]}
                  </option>
                ))}
              </select>
            )}

            {/* Speed Control */}
            <div className="chatbot-speed-control">
              <label>Speed: {speechRate.toFixed(2)}x</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="chatbot-speed-slider"
              />
            </div>

            {isSpeaking && (
              <button
                className="btn btn--sm btn--secondary"
                onClick={stopSpeaking}
              >
                ⏹ Stop
              </button>
            )}
          </div>

          <div className="chatbot-chat-messages">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`chatbot-message-row ${
                    isUser ? "user" : "assistant"
                  }`}
                >
                  <div
                    className={`chatbot-message-bubble ${
                      isUser ? "user-bubble" : "assistant-bubble"
                    }`}
                  >
                    <div className="chatbot-message-text">{m.text}</div>
                    <div className="chatbot-message-actions">
                      <div
                        className={`chatbot-message-meta ${
                          isUser ? "user-meta" : "assistant-meta"
                        }`}
                      >
                        {isUser ? "You" : "NeuraBot"}
                      </div>
                      {!isUser && (
                        <button
                          className="chatbot-speak-btn"
                          onClick={() => speakText(m.text)}
                          title="Read aloud"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="chatbot-message-row assistant">
                <div className="chatbot-message-bubble assistant-bubble">
                  <div className="chatbot-message-text">
                    <em>Thinking... 💭</em>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chatbot-chat-input">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) send();
              }}
              placeholder="Type to ask (try: how does attention work?)"
              className="chatbot-input"
              disabled={isLoading}
            />
            <button
              onClick={send}
              className="chatbot-send-btn"
              disabled={isLoading}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>

          <p className="chatbot-tip">
            🚀 Connected to Google Gemini AI • 🔊 Natural Female Voice TTS
          </p>
        </div>

        <div className="chatbot-footer">
          Try resizing the window for responsive vibes ✨
        </div>
      </div>
    </div>
  );
}
