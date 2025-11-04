import { useState } from "react";
import "./GuessNumber.css";

function GuessNumber() {
    const [computerChoice, setComputerChoice] = useState(Math.floor(Math.random() * 21));
    const [guess, setGuess] = useState("");
    const [attempts, setAttempts] = useState(0);
    const [message, setMessage] = useState("Try To Guess The Number Between 0 And 20.");
    const [streak, setStreak] = useState(0);
    const [score, setScore] = useState(0);
    const [guesses, setGuesses] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [image, setImage] = useState("question-image");
    const [giveupdisable, setGiveUpDisable] = useState(false);

    const generateNumber = () => {
        setComputerChoice(Math.floor(Math.random() * 21));
        setImage("question-image");
        setAttempts(0);
        setMessage("Try To Guess The Number Between 0 And 20.");
        setGuesses([]);
        setGiveUpDisable(false);
        setGameOver(false);
    };

    const checkGuess = () => {

        if (gameOver || guess === "") return;
        const numGuess = parseInt(guess);
        if (isNaN(numGuess) || numGuess < 0 || numGuess > 20) {
            setMessage("Enter a valid number between 0 and 20!");
            return;
        }

        setAttempts(prev => prev + 1);
        setGuesses(prev => [...prev, numGuess]);

        if (numGuess === computerChoice) {
            setMessage(`Well Done! The Number Was ${computerChoice}.`);
            setGiveUpDisable(true);
            setImage("winner-image");
            setScore(prev => prev + 1);
            setStreak(prev => prev + 1);
            setGameOver(true);
        } else if (attempts >= 14) {
            setMessage(`You Ran Out Of Attempts. The Number Was ${computerChoice}. Try Again.`);
            setGiveUpDisable(true);
            setImage("sad-image");
            setStreak(0);
            setGameOver(true);
        } else if (numGuess < computerChoice) {
            setMessage("Too Low... Guess Higher!");
            setImage("submarine-image");
        } else {
            setMessage("Too High... Guess Lower!");
            setImage("aeroplane-image");
        }
    };

    const revealNumber = () => {
        setMessage(`The Number Was ${computerChoice}. Try Again!`);
        setImage("sad-image");
        setStreak(0);
        setGameOver(true);
    };

    return (
        <div className="body-guessnumber">
            <h1 id="h1-guessnumber">Guess The Number</h1>
            <h2 id="h2-guessnumber">Between 0 and 20</h2>
            <h5 id="h5-guessnumber">{message}</h5>
            <div id="resultarea">
                <section id="result" className={image}></section>
                <section id="result2">
                    <h4 id="h4-guessnumber">{message}</h4>
                </section>

                <section id="result3">
                    <p id="stats">Game Stats:</p>
                    <div id="attempt">Attempts:<span className="span-guessnumber" id="attemptcounter">{attempts}/15</span></div>
                    <div id="guessessofar">Your Guesses:<span className="span-guessnumber" id="guesscounter">{guesses.join(", ")}</span></div>
                    <div id="score">Wins:<span className="span-guessnumber" id="scorecounter">{score}</span></div>
                    <div id="streak">Win Streak:<span className="span-guessnumber" id="streakcounter">{streak}</span></div>
                </section>
            </div>
            <div id="inputarea">
                <input
                    className="input-guessnumber"
                    type="number"
                    placeholder="Your Guess Here..."
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    disabled={gameOver}
                />
                <button className="button-guessnumber" onClick={checkGuess} id="submit">Submit Guess</button>
                <button className="button-guessnumber" onClick={revealNumber} id="giveup" disabled={giveupdisable}> Give Up?</button>
                <button className="button-guessnumber" onClick={generateNumber} id="other"> Try Another Number</button>
            </div>
        </div>
    );
}

export default GuessNumber;
