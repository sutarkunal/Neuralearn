import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    { role: "assistant", text: "Welcome to Neuralearn! Ask me anything — I love teaching. 🧑‍🏫" }
  ]);

  const send = () => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setQ("");

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Nice Q! Here's a playful reply about "${trimmed}" — this is still a demo.` },
      ]);
    }, 600);
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
          onClick={() => chatRef.current?.scrollIntoView({ behavior: "smooth" })}
        >
          💬
        </button>
      </div>

      <div className="chatbot-container">
        {/* Top Welcome + Pills */}
        <div className="chatbot-card">
          <div className="chatbot-header">
            <div className="chatbot-left">
              <h1 className="chatbot-title">NeuraBot</h1>
              <p className="chatbot-subtitle">Your friendly learning buddy — ask anything. ✨</p>

              <div className="chatbot-pill-grid">
                <Pill emoji="💡" label="General knowledge" accent="chatbot-accent-yellow" />
                <Pill emoji="🛠️" label="Application questions" accent="chatbot-accent-sky" />
                <Pill emoji="📝" label="Virtual Therapist" accent="chatbot-accent-rose" />
                <Pill emoji="🧠" label="Problem solving" accent="chatbot-accent-lime" />
              </div>
            </div>

            <div className="chatbot-right">
              <div className="chatbot-bot-card">
                <div className="chatbot-bot-avatar">NL</div>
                <p className="chatbot-bot-name">NeuraBot</p>
                <div className="chatbot-bot-desc">Made for learning — playful & safe</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div ref={chatRef} className="chatbot-chat-section">
          <div className="chatbot-chat-messages">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={`chatbot-message-row ${isUser ? "user" : "assistant"}`}>
                  <div className={`chatbot-message-bubble ${isUser ? "user-bubble" : "assistant-bubble"}`}>
                    <div className="chatbot-message-text">{m.text}</div>
                    <div className={`chatbot-message-meta ${isUser ? "user-meta" : "assistant-meta"}`}>
                      {isUser ? "You" : "NeuraBot"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chatbot-chat-input">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type to ask (try: how does attention work?)"
              className="chatbot-input"
            />
            <button onClick={send} className="chatbot-send-btn">Send</button>
          </div>
          <p className="chatbot-tip">Responses are simulated — connect an LLM to go live 🚀</p>
        </div>

        <div className="chatbot-footer">
          • Try resizing the window for responsive vibes 📱💻
        </div>
      </div>
    </div>
  );
}
