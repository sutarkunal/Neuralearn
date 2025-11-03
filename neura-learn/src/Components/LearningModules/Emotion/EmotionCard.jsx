import NavigationButtons from "../NavigationButtons";
import { useState, useEffect, useRef } from 'react'
import TextToSpeech from "../../TextToSpeech";

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