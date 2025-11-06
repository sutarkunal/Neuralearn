import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import axios from "axios";
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

const CameraCard = ({cameraAnswer, setShowCamera, response, task, setAttempts, chapter, totalChapters, setShowResult}) => {
    const [cameraOn, setCameraOn] = useState(true);
    const hasCameraSupport = !!navigator.mediaDevices?.getUserMedia;
    const webcamRef = useRef(null);
    const [emotion, setEmotion] = useState(null);
    const [error, setError] = useState(null);

    const videoConstraints = {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 1280 },
    };

    const capture = useCallback(async () => {
        setAttempts(prev => prev + 1)
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) return;

        try {
            // Convert base64 to binary
            const byteString = atob(imageSrc.split(",")[1]);
            const mimeString = imageSrc.split(",")[0].split(":")[1].split(";")[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });

            // Send to FastAPI backend
            const formData = new FormData();
            formData.append("file", blob, "capture.jpg");

            const response = await axios.post("/api/emotion/predict-emotion", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const temp = response.data.emotion
            setEmotion(temp);
            console.log(cameraAnswer)
            if (temp.toLowerCase() === cameraAnswer.toLowerCase()){
                await TextToSpeech("Correct! Great job!", true);
                setShowCamera(false)
                if (chapter === totalChapters){
                    setShowResult(true)
                }
            }

        } catch (err) {
            console.error("Error sending image to backend:", err);
            setError("Error analyzing emotion.");
        }
    }, []);
    return (

        <>
            <h1 className="app-title"><strong>Emotion Recognition</strong></h1>
            <p className="app-description">Look at the camera and press capture!<br/> we'll help you understand emotions!</p>
            {
                !hasCameraSupport ? (
                    <div className="error-message">⚠️ Camera access is not supported in your browser.</div>
                ) : cameraOn ? (
                    <>
                        <button id="btn-control-socialemotion" className="btn btn-control" onClick={() => setCameraOn(false)}>
                            🚫 Stop Camera
                        </button>
                        <div className="response-message-emotions">{response}</div>
                        <div className="response-message-questions">{task}</div>
                        <div className="camera-wrapper">
                            {error ? (
                                <div className="error-container">
                                    <p className="error-message">{error}</p>
                                </div>
                            ) : (
                                <>
                                    <Webcam
                                        ref={webcamRef}
                                        audio={false}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={videoConstraints}
                                        className="webcam-video"
                                        onUserMediaError={() => setError("Camera access denied. Please enable permissions.")}
                                    />
                                    <button id="btn-capture-socialemotion" className="btn-capture" onClick={capture}>
                                        📸 Capture
                                    </button>
                                    {emotion && (
                                        <div className="display-emotion">😊 Detected Emotion: <strong>{emotion}</strong></div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <button id="btn-start-socialemotion" className="btn btn-start" onClick={() => setCameraOn(true)}>
                        🎬 Start Camera
                    </button>
                )
            }
            <div className="safety-notice">
                🔒 We never store or share your camera feed. Everything stays private on your device.
            </div>
        </>

    );
}

export default CameraCard
