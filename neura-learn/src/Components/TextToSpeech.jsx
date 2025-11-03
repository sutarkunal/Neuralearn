const TextToSpeech = (sentence, wait = false) => {
  return new Promise((resolve) => {

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(sentence);

    if (wait) {
      utterance.onend = () => {
        resolve();
      };
    } else {
      resolve();
    }

    speechSynthesis.speak(utterance);
  });
};

export default TextToSpeech;
