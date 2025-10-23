import { useNavigate } from "react-router-dom";
import "./ChatbotHover.css";
import { Button } from "react-bootstrap";

const ChatbotHover = () => {
  const navigate = useNavigate();

  return (
    <div className="chatbot-hover-container">
      <Button
        variant="primary"
        className="chatbot-hover-btn shadow-lg rounded-circle"
        onClick={() => navigate("/chatbot")}
      >
        <span className="chatbot-hover-emoticon">💬</span>
      </Button>
    </div>
  );
};

export default ChatbotHover;
