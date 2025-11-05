import { Link } from 'react-router-dom';
import './ChooseGames.css';

function GameCard({ image, title, description, link }) {
  return (
    <div className="col-md-4 col-sm-6 mb-4">
      <div className="game-card">
        <img src={image} alt={title} className="img-fluid" />
        <div className="card-content d-flex flex-column h-100">
          <h3 className="text-center">{title}</h3>
          <p className="text-center">{description}</p>
          <Link className="btn btn-primary mt-auto" to={link}>Play Now!</Link>
        </div>
      </div>
    </div>
  );
}

function ChooseGames() {
  return (
    <section className="games-section py-5" style={{ backgroundImage: 'url(/Images/cloudStar.png)' }}>
      <div className="container">

        <h1 className="text-center mb-4 "><b>Fun Interactive Games</b></h1>
        
        <div className="row justify-content-center">

          <GameCard
            image="/Images/shapeSnap.png"
            title="Shape Snap Puzzle"
            description="A fun drag-and-drop puzzle game where players match 3D shapes to their correct silhouettes."
            link="/games/shape-snap"
          />
          <GameCard
            image="/Images/shapeDrag.jpg"
            title="Shape Play"
            description="Drag and drop colorful shapes to play and learn."
            link="/games/shape-drag-drop"
          />
          <GameCard
            image="/Images/memoryGame.png"
            title="Memory Card Game"
            description="Match identical cards to test your memory and concentration skills in this fun and challenging game."
            link="/games/memory-card"
          />
          <GameCard
            image="/Images/wordleImg.png"
            title="Wordle Game"
            description="Guess the 5-letter word in 6 attempts or less."
            link="/games/wordle"
          />
          <GameCard
            image="/Images/guessNumber.jpg"
            title="Guess the Number"
            description="Challenge yourself to guess the secret number and boost your problem-solving and logic skills!"
            link="/games/guess-number"
          />


        </div>
      </div>
    </section>
  );
}

export default ChooseGames;
