// StoryReader.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./StoryReader.css";

/** -------- Config -------- */
const API_BASE =
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || "";

const IMAGES_ENABLED = true; // turn images ON

/** -------- Native TTS (no puter.js) -------- */
const hasTTS = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof window.speechSynthesis?.speak === "function";

// Voice-enabled TTS with options
const TextToSpeech = (sentence, wait = false, opts = {}) => {
  return new Promise((resolve) => {
    if (!hasTTS() || !sentence) return resolve();

    try {
      window.speechSynthesis.cancel();
    } catch (e) {console.log(e)}

    const utterance = new SpeechSynthesisUtterance(sentence);

    const voices = window.speechSynthesis.getVoices?.() || [];
    const {
      voiceName,         // exact voice name to use (if available)
      pitch = 1.5,       // childlike default
      rate = 1.05,       // slightly faster
      volume = 1.0,
    } = opts;

    let chosen = null;
    if (voiceName) {
      chosen = voices.find((v) => v.name === voiceName) || null;
    }
    if (!chosen) {
      // Auto pick a female/childlike English voice if possible
      const preferName = voices.find(
        (v) =>
          /(child|girl|female|woman|Ava|Samantha|Karen|Zira|Aria|Neural)/i.test(v.name) &&
          /en-/i.test(v.lang)
      );
      chosen =
        preferName ||
        voices.find((v) => /en-/i.test(v.lang)) ||
        voices[0] ||
        null;
    }
    if (chosen) utterance.voice = chosen;

    utterance.pitch = pitch;   // 0–2
    utterance.rate = rate;     // 0.1–10
    utterance.volume = volume; // 0–1

    if (wait) {
      utterance.onend = () => resolve();
    } else {
      resolve();
    }

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {console.log(e)}
  });
};

/** -------- Utilities -------- */
function splitStoryIntoPages(storyText = "") {
  const t = storyText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const pages = [];
  const re = /^\s*(\d+)\.\s*(.*)$/gm; // match "1. Title", "2. ...", etc.
  const hits = [];
  let m;
  while ((m = re.exec(t)) !== null) hits.push({ n: parseInt(m[1], 10), i: m.index });

  if (hits.length === 0) return [{ n: 1, title: "Story", text: t }];

  for (let k = 0; k < hits.length; k++) {
    const { n, i } = hits[k];
    const end = k + 1 < hits.length ? hits[k + 1].i : t.length;
    const block = t.slice(i, end).trim();
    const lines = block.split("\n");
    const head = (lines[0] || "").replace(/^\s*\d+\.\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim();
    pages.push({ n, title: head || `Section ${n}`, text: body });
  }
  return pages.sort((a, b) => a.n - b.n).slice(0, 9);
}

/** -------- Component -------- */
const StoryReader = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Provided by StoryGeneration via navigate("/story/reader", { state: { payload, profile } })
  const payload = state?.payload;
  const profile = state?.profile;

  const [phase, setPhase] = useState("loading"); // 'loading' | 'choose' | 'reading' | 'error'
  const [title, setTitle] = useState("Story");
  const [partial14, setPartial14] = useState("");
  const [options, setOptions] = useState([]);

  const [pages, setPages] = useState([]);
  const [pageIdx, setPageIdx] = useState(0);

  const [error, setError] = useState("");
  const [imgCache, setImgCache] = useState({}); // { [sectionNumber]: imageUrl }
  const [imgReady, setImgReady] = useState({}); // { [sectionNumber]: true when decoded }

  // TTS settings + voice list
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState(null); // auto-picked in useEffect
  const [pitch, setPitch] = useState(1.5);
  const [rate, setRate] = useState(1.05);

  // StrictMode guard to avoid double /start in dev
  const startedRef = useRef(false);

  // Debounce/timeout for auto-speak
  const speakTimerRef = useRef(null);

  // Helper to POST with optional baseURL
  const postJSON = async (path, body) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    try {
      return await axios.post(path, body, { headers });
    } catch (e) {
      if (API_BASE) {
        return await axios.post(`${API_BASE}${path}`, body, { headers });
      }
      throw e;
    }
  };

  // ---- Preload helper so we only swap images when decoded ----
  const preloadImage = (sectionNumber, url) => {
    if (!url) return;
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.onload = () => {
      setImgReady((r) => ({ ...r, [sectionNumber]: true }));
    };
    img.onerror = () => {};
    img.src = url;
  };

  // ---- Fetch illustrations (batch) ----
  const fetchIllustrations = async (pagesArr, userProfile) => {
    if (!IMAGES_ENABLED || !Array.isArray(pagesArr) || pagesArr.length === 0) return;
    try {
      const sections = pagesArr.map((p) => `${p.n}. ${p.title}\n${p.text}`);
      const body = {
        sections,
        username: userProfile?.username || "Child",
        width: 896,
        height: 896,
        nologo: true,
      };
      const res = await postJSON("/api/images/illustrate/batch", body);
      const images = res?.data?.images || [];
      const next = {};
      images.forEach(({ section, url }) => {
        if (section && url) next[section] = url;
      });

      setImgCache((prev) => {
        const merged = { ...prev, ...next };
        Object.entries(next).forEach(([sectionStr, url]) => {
          const section = Number(sectionStr);
          preloadImage(section, url);
        });
        return merged;
      });
    } catch (e) {
      console.warn("Illustrations fetch failed:", e?.response?.data || e?.message || e);
    }
  };

  // -------- Start story on mount --------
  const startStory = async () => {
    if (!payload) {
      setError("Missing story payload from previous page.");
      setPhase("error");
      return;
    }
    setError("");
    setPhase("loading");
    try {
      const res = await postJSON("/api/story/generate-story/start", payload);
      const s14 = res.data?.partial_story || "";
      setTitle(res.data?.title || "Story");
      setPartial14(s14);
      setOptions(Array.isArray(res.data?.options) ? res.data.options : []);

      const pp = splitStoryIntoPages(s14); // likely sections 1..4
      setPages(pp);
      setPageIdx(0); // start at section 1
      setPhase("choose");

      fetchIllustrations(pp, profile);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to reach the backend. Check proxy/base URL and CORS.";
      setError(msg);
      setPhase("error");
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startStory();
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch (e) {console.log(e)}
      if (speakTimerRef.current) {
        clearTimeout(speakTimerRef.current);
        speakTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Continue after choice (fetch 5..9 together) --------
  const chooseOption = async (opt) => {
    setError("");
    setPhase("loading");
    try {
      const res = await postJSON("/api/story/generate-story/continue", {
        partial_story: partial14,
        selected_option: opt,
      });
      const cont = res.data?.continuation || "";
      const all = splitStoryIntoPages(`${partial14}\n\n${cont}`);
      setPages(all);

      const fiveIdx = all.findIndex((p) => p.n === 5);
      if (fiveIdx !== -1) {
        setPageIdx(fiveIdx); // jump to section 5
      } else {
        const fourIdx = Math.max(0, all.findIndex((p) => p.n === 4));
        setPageIdx(fourIdx);
      }
      if (all.length <= 4) {
        setError("Could not parse the continuation (sections 5–9).");
      }
      setPhase("reading");

      fetchIllustrations(all, profile);
    } catch (e) {
      const msg =
        e?.response?.data?.detail || e?.message || "Failed to continue the story.";
      setError(msg);
      setPhase("choose");
    }
  };

  // Keyboard navigation (enabled in reading phase + choose phase)
  useEffect(() => {
    const onKey = (e) => {
      if (phase !== "reading" && phase !== "choose") return;
      if (e.key === "ArrowLeft") setPageIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setPageIdx((i) => Math.min(pages.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pages.length]);

  const cur = pages[pageIdx];

  /** ------- TTS: load voices and pick defaults ------- */
  useEffect(() => {
    if (!hasTTS()) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices?.() || [];
      setVoices(list);
      if (!voiceName && list.length) {
        const prefer =
          list.find(
            (v) =>
              /(child|girl|female|woman|Ava|Samantha|Karen|Zira|Aria|Neural)/i.test(v.name) &&
              /en-/i.test(v.lang)
          ) || list.find((v) => /en-/i.test(v.lang)) || list[0];
        if (prefer) setVoiceName(prefer.name);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ------- Nav helpers (one section per screen) ------- */
  const indexOfSection = (n) => pages.findIndex((p) => p.n === n);

  const canGoLeft = () => {
    if (!pages.length) return false;
    return pageIdx > 0;
  };

  const canGoRight = () => {
    if (!pages.length) return false;
    if (phase === "choose") {
      const fourIdx = Math.max(0, indexOfSection(4));
      return pageIdx < fourIdx;
    }
    return pageIdx < pages.length - 1;
  };

  const goLeft = () => {
    if (canGoLeft()) setPageIdx((i) => i - 1);
  };

  const goRight = () => {
    if (canGoRight()) setPageIdx((i) => i + 1);
  };

  /** ------- TTS helpers ------- */
  const buildSectionSpeech = useCallback((p) => {
    if (!p) return "";
    const titlePart = p?.title ? `${p.title}. ` : "";
    const bodyPart = (p?.text || "").replace(/\s+/g, " ").trim();
    return `${titlePart}${bodyPart}`;
  }, []);

  const speakCurrentSection = useCallback(
    (immediate = false) => {
      if (!hasTTS()) return;
      const sentence = buildSectionSpeech(cur);
      if (!sentence) return;

      if (speakTimerRef.current) {
        clearTimeout(speakTimerRef.current);
        speakTimerRef.current = null;
      }

      const fire = () => {
        try {
          window.speechSynthesis?.cancel();
        } catch (e) {console.log(e)}
        TextToSpeech(sentence, false, { voiceName, pitch, rate });
      };

      if (immediate) {
        fire();
      } else {
        speakTimerRef.current = setTimeout(fire, 150);
      }
    },
    [cur, buildSectionSpeech, voiceName, pitch, rate]
  );

  // Auto-speak when the visible section changes (and when phase flips)
  useEffect(() => {
    if (!cur) return;
    if (phase !== "choose" && phase !== "reading") return;
    speakCurrentSection(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, phase, cur?.n, voiceName, pitch, rate]);

  // Re-speak on hover
  const handleHoverSpeak = () => {
    speakCurrentSection(true);
  };

  // Stop TTS when entering loading/error phases
  useEffect(() => {
    if (phase === "loading" || phase === "error") {
      try {
        window.speechSynthesis?.cancel();
      } catch (e) {console.log(e)}
    }
  }, [phase]);

  // -------- Render --------
  return (
    <div className="reader-shell" role="main" aria-label="Interactive Story Reader">
      {/* Local reader header (NOT your global navbar) */}
      <div className="reader-header">
        <button
          className="linkish"
          onClick={() => {
            try {
              window.speechSynthesis?.cancel();
            } catch (e) {console.log(e)}
            navigate(-1);
          }}
        >
          ⌂ Close Book
        </button>
        <div className="spacer" />
        <div className="book-title">{title}</div>

        {/* --- Optional: Tiny TTS controls --- */}
        {hasTTS() && (
          <div className="tts-controls" style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Voice</label>
            <select
              value={voiceName || ""}
              onChange={(e) => setVoiceName(e.target.value)}
              style={{ padding: "4px 6px", borderRadius: 6, maxWidth: 260 }}
              aria-label="Choose TTS voice"
              title="Choose TTS voice"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>

            <label style={{ fontSize: 12, opacity: 0.8 }}>Pitch</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              aria-label="TTS pitch"
              title={`Pitch: ${pitch.toFixed(1)}`}
            />

            <label style={{ fontSize: 12, opacity: 0.8 }}>Rate</label>
            <input
              type="range"
              min="0.7"
              max="1.6"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              aria-label="TTS rate"
              title={`Rate: ${rate.toFixed(2)}`}
            />
          </div>
        )}
      </div>

      {/* Error state with Retry */}
      {phase === "error" && (
        <div className="reader-error">
          <div style={{ marginBottom: 8 }}>⚠️ {error}</div>
          <button className="btn" onClick={startStory}>
            Retry
          </button>
          {API_BASE ? (
            <div style={{ marginTop: 8, opacity: 0.7 }}>
              Using base URL: <code>{API_BASE}</code>
            </div>
          ) : (
            <div style={{ marginTop: 8, opacity: 0.7 }}>
              No base URL set. Ensure your dev server proxies <code>/api</code> to your backend
              or set <code>VITE_API_BASE</code>.
            </div>
          )}
        </div>
      )}

      {/* Loading phase */}
      {phase === "loading" && (
        <div className="loading-wrap" aria-busy="true" aria-live="polite">
          <div className="empty-book" aria-label="Empty book loading">
            <div className="book-spine" />
            <div className="book-left-page">
              <div className="page-lines" />
            </div>
            <div className="book-right-page">
              <div className="page-lines" />
            </div>
          </div>
          <p className="loading-text">Preparing your interactive story…</p>
        </div>
      )}

      {/* Choosing phase: show ONE section per screen (1..4) */}
      {phase === "choose" && cur && (
        <div className="viewer-wrap">
          {/* LEFT ARROW */}
          <button
            className={`nav-btn left ${!canGoLeft() ? "disabled" : ""}`}
            onClick={goLeft}
            disabled={!canGoLeft()}
            aria-label="Previous page"
          >
            ‹
          </button>

          <div className="book-frame">
            <div className="book-left">
              {IMAGES_ENABLED && imgCache[cur?.n] && imgReady[cur?.n] ? (
                <img
                  key={`${cur.n}-${imgCache[cur.n]}`}
                  src={imgCache[cur.n]}
                  alt={`Section ${cur.n} illustration`}
                  className="story-illustration"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <div className="img-placeholder" role="img" aria-label="Illustration placeholder">
                  <div className="ph-illus-circle" />
                  <div className="ph-illus-lines" />
                  <small style={{ opacity: 0.6 }}>
                    {IMAGES_ENABLED
                      ? "Illustration loading…"
                      : cur.n === 1
                      ? "Cover illustration coming soon"
                      : "Illustration coming soon"}
                  </small>
                </div>
              )}
            </div>
            <div
              className="book-right"
              onMouseEnter={handleHoverSpeak}
              role="region"
              aria-label={`Section ${cur.n} text, hover to hear`}
            >
              <div className="page-breadcrumb">Section {cur.n} / 9</div>
              {cur.n === 4 ? null : <h3>{cur.title || `Section ${cur.n}`}</h3>}
              {cur.n === 4 ? null : <pre className="book-text">{cur.text}</pre>}


              {/* Decision buttons only on section 4 */}
              {cur.n === 4 && (
                <div className="decision-row">
                  {options.map((opt, i) => (
                    <button key={i} className="btn option" onClick={() => chooseOption(opt)}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT ARROW */}
          <button
            className={`nav-btn right ${!canGoRight() ? "disabled" : ""}`}
            onClick={goRight}
            disabled={!canGoRight()}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}

      {/* Reading phase: show ONE section per screen (5..9) */}
      {phase === "reading" && cur && (
        <div className="viewer-wrap">
          {/* LEFT ARROW */}
          <button
            className={`nav-btn left ${!canGoLeft() ? "disabled" : ""}`}
            onClick={goLeft}
            disabled={!canGoLeft()}
            aria-label="Previous page"
          >
            ‹
          </button>

          <div className="book-frame">
            <div className="book-left">
              {IMAGES_ENABLED && imgCache[cur?.n] && imgReady[cur?.n] ? (
                <img
                  key={`${cur.n}-${imgCache[cur.n]}`}
                  src={imgCache[cur.n]}
                  alt={`Section ${cur.n} illustration`}
                  className="story-illustration"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <div className="img-placeholder" role="img" aria-label="Illustration placeholder">
                  <div className="ph-illus-circle" />
                  <div className="ph-illus-lines" />
                  <small style={{ opacity: 0.6 }}>
                    Illustration {IMAGES_ENABLED ? "loading…" : "coming soon"}
                  </small>
                </div>
              )}
            </div>
            <div
              className="book-right"
              onMouseEnter={handleHoverSpeak}
              role="region"
              aria-label={`Section ${cur.n} text, hover to hear`}
            >
              <div className="page-breadcrumb">Section {cur.n} / 9</div>
              <h3>{cur.title || `Section ${cur.n}`}</h3>
              <pre className="book-text">{cur.text}</pre>
            </div>
          </div>

          {/* RIGHT ARROW */}
          <button
            className={`nav-btn right ${!canGoRight() ? "disabled" : ""}`}
            onClick={goRight}
            disabled={!canGoRight()}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default StoryReader;
