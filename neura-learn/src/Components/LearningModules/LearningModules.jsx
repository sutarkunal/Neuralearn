import { Link } from 'react-router-dom';
import './LearningModules.css';
import VideoSection from './VideoSection';
import TextToSpeech from "../TextToSpeech";


function LearningModules() {
    return (
        <div className="body-learning">
            <div className="container">
                <h1 className="text-center mt-4">Select a Subject</h1>

                <VideoSection
                    title="Before starting, please watch this video:"
                    src="https://www.youtube.com/embed/hU8xEH5yRnA"
                />

                <div className="row subject-selection">
                    <LearningModulesCard
                        to="maths"
                        divname="subject-card"
                        icons={["fa-calculator"]}
                        title="Maths"
                        desc="Learn numbers and counting!"
                    />

                    <LearningModulesCard
                        to="alphabets"
                        divname="subject-card"
                        icons={["fa-font"]}
                        title="Alphabet"
                        desc="Explore letters and words!"
                    />
                    
                    <LearningModulesCard
                        to="colors"
                        divname="subject-card"
                        icons={["fa-paint-brush"]}
                        title="Colors"
                        desc="Learn about colors!"
                    />

                    <LearningModulesCard
                        to="shapes"
                        divname="subject-card"
                        icons={["fa-square"]}
                        title="Shapes"
                        desc="Discover shapes!"
                    />
                    
                    <LearningModulesCard
                        to="social-emotions"
                        divname="subject-card-multiple"
                        icons={["fa-smile", "fa-frown", "fa-surprise", "fa-angry"]}
                        title="Social Emotions"
                        desc="Learn about Social cues and Emotions!"
                    />
                    
                    <LearningModulesCard
                        to="VoiceRecognition"
                        divname="subject-card"
                        icons={["fa-microphone"]}
                        title="Speech Training"
                        desc="Enhance the conversational skills!"
                    />

                </div>


            </div>
        </div>

    )
}

export default LearningModules;

function LearningModulesCard(props) {


    return (
        <div className="col-md-6 col-lg-3">
            <Link to={"/learning-modules/" + props.to} className="learning-modules-link">
                <div className={props.divname}
                    onMouseEnter={() => TextToSpeech(props.title)}
                    onMouseLeave={() => speechSynthesis.cancel()}>
                    {props.icons.map((icon, idx) => (
                        <i key={idx} className={"fas " + icon}></i>
                    ))}
                    <h3>{props.title}</h3>
                    <p>{props.desc}</p>
                </div>
            </Link>
        </div>
    )
}