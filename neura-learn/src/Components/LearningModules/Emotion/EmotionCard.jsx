import NavigationButtons from "../NavigationButtons";
import { useState, useEffect, useRef } from 'react'
// import TextToSpeech from "../../TextToSpeech";

const hasTTS = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof window.speechSynthesis?.speak === "function";

// Voice-aware Text-to-Speech (copied from StoryReader, no UI)
const TextToSpeech = (sentence, wait = false, opts = {}) => {
  return new Promise((resolve) => {
    if (!hasTTS() || !sentence) return resolve();

    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.log(e);
    }

    const utterance = new SpeechSynthesisUtterance(sentence);
    const voices = window.speechSynthesis.getVoices?.() || [];

    const {
      voiceName,
      pitch = 1.2, // lower pitch for natural tone
      rate = 1.0,  // normal rate
      volume = 1.0,
    } = opts;

    let chosen = null;
    if (voiceName) {
      chosen = voices.find((v) => v.name === voiceName) || null;
    }
    if (!chosen) {
      // Auto-pick a female/English voice if possible
      const preferName = voices.find(
        (v) =>
          /(child|girl|female|woman|Ava|Samantha|Karen|Zira|Aria|Neural)/i.test(
            v.name
          ) && /en-/i.test(v.lang)
      );
      chosen =
        preferName ||
        voices.find((v) => /en-/i.test(v.lang)) ||
        voices[0] ||
        null;
    }

    if (chosen) utterance.voice = chosen;
    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = volume;

    if (wait) utterance.onend = () => resolve();
    else resolve();

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.log(e);
    }
  });
};

const EmotionsCard = ({ title, chapter, desc, src, alt, task, answer = true, emotionAnswer }) => {
    const [userAnswer, setUserAnswer] = useState('');

    // TTS Ref
    const hasSpoken = useRef(false);

    // TTS
    useEffect(() => {
        if(!hasSpoken.current && desc){
        TextToSpeech(desc);
        hasSpoken.current = true;
        }
    }, [desc]);

    const handleSubmit = () => {
        emotionAnswer(userAnswer);
        setUserAnswer('');
    };
 
    const handleInputChange = (e) => {
        setUserAnswer(e.target.value);
    };

    return (
        <>
            <h1><strong>{title}</strong></h1><br />
            <h2><strong>Chapter {chapter}</strong></h2>
            <p className="description-card">{desc}</p>
            <img src={src} alt={alt} className="img-fluid" />
            <h3>{task}</h3>
            {answer && (
                <>
                    <select id="userAnswer" className="form-control" value={userAnswer} onChange={handleInputChange}>
                        <option value="">Select an answer</option>
                        <option value="happiness">Happy</option>
                        <option value="anger">Anger</option>
                        <option value="sadness">Sad</option>
                        <option value="surprise">Surprise</option>
                    </select>
                    <NavigationButtons
                        buttons={[
                            { name: "Submit", action: handleSubmit },
                        ]}
                        includeModules={false}
                    />
                </>
            )}
        </>
    );
}

export default EmotionsCard