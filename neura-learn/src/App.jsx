import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./Components/ProtectedRoute";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import HomePage from "./Components/Home/HomePage";
import Contact from "./Components/Misc/Contact";
import About from "./Components/Misc/About";
import ScrollToTop from "./Components/ScrollToTop";
import LandingPage from "./Components/Landing/LandingPage";
import PrintableActivities from "./Components/Printables/PrintableActivities";

import MainProfile from "./Components/Profile/MainProfile";
import UpdateProfile from "./Components/Profile/UpdateProfile";

import ChooseGames from "./Components/Games/ChooseGames";
import GuessNumber from "./Components/Games/GuessNumber/GuessNumber";
import WordleGame from "./Components/Games/Wordle/WordleGame";
import MemoryGame from "./Components/Games/Memory/MemoryGame";
import ShapeDragDrop from "./Components/Games/ShapeDragDrop/ShapeDragDrop";

import Login from "./Components/Auth/Login";
import Signup from "./Components/Auth/Signup";
import ForgotPassword from "./Components/Auth/ForgotPassword";
import ResetPassword from "./Components/Auth/ResetPassword";

import LearningModules from './Components/LearningModules/LearningModules';
import StoryGeneration from "./Components/Story/StoryGeneration";
import Chatbot from "./Components/Chatbot/Chatbot";
import ModulesMaths from "./Components/LearningModules/ModulesMaths";
import ModulesAlphabets from "./Components/LearningModules/ModulesAlphabets";
import ModulesColors from "./Components/LearningModules/ModulesColors";
import ModulesShapes from "./Components/LearningModules/ModulesShapes";
import SocialEmotions from "./Components/LearningModules/Emotion/SocialEmotions";
import VoiceRecognition from "./Components/LearningModules/Voice/VoiceRecognition";
import SpeechTraining from "./Components/LearningModules/Voice/SpeechTraining";
import ConversationTraining from "./Components/LearningModules/Voice/ConversationTraining";

import TestColors from "./Components/LearningModules/TestColors";
import TestShapes from "./Components/LearningModules/TestShapes";
import TestAlphabets from "./Components/LearningModules/TestAlphabets";
import TestMaths from "./Components/LearningModules/TestMaths";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword/>}/>
        <Route path="/reset-password" element={<ResetPassword/>}/>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/printables" element={<PrintableActivities />} />

          <Route path="/profile" element={<MainProfile/>} />
          <Route path="/profile/update" element={<UpdateProfile />} />

          <Route path="/games" element={<ChooseGames />} />
          <Route path="/games/guess-number" element={<GuessNumber />} />
          <Route path="/games/wordle" element={<WordleGame />} />
          <Route path="/games/memory-card" element={<MemoryGame />} />
          <Route path="/games/shape-drag-drop" element={<ShapeDragDrop />} />
          <Route path="/story" element={<StoryGeneration />} />
          <Route path="/chatbot" element={<Chatbot />} />


          <Route path="/learning-modules" element={<LearningModules />} />

          <Route path="/learning-modules/maths" element={<ModulesMaths />} />
          <Route path="/learning-modules/maths/test" element={<TestMaths />} />

          <Route path="/learning-modules/alphabets" element={<ModulesAlphabets />} />
          <Route path="/learning-modules/alphabets/test" element={<TestAlphabets />} />

          <Route path="/learning-modules/colors" element={<ModulesColors />} />
          <Route path="/learning-modules/colors/test" element={<TestColors />} />

          <Route path="/learning-modules/shapes" element={<ModulesShapes />} />
          <Route path="/learning-modules/shapes/test" element={<TestShapes />} />
          
          <Route path="/learning-modules/Voice/SpeechTraining" element={<SpeechTraining />} />
          {/*<Route path="/learning-modules/Voice/EmotionPractice" element={<EmotionPractice />} />*/}
          <Route path="/learning-modules/Voice/ConversationTraining" element={<ConversationTraining />} />
          
          <Route path="/learning-modules/social-emotions" element={<SocialEmotions />} />
          <Route path="/learning-modules/VoiceRecognition" element={<VoiceRecognition />} />
          <Route path="*" element={<h1>404 - Page Not Found</h1>} />
        </Route>

      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
