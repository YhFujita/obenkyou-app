import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Japanese from './pages/Japanese';
import MathPage from './pages/Math';
import Life from './pages/Life';
import English from './pages/English';
import NatureQuiz from './pages/NatureQuiz';
import LifeGeneralQuiz from './pages/LifeGeneralQuiz';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/japanese" element={<Japanese />} />
          <Route path="/math" element={<MathPage />} />
          <Route path="/life" element={<Life />} />
          <Route path="/life-quiz" element={<LifeGeneralQuiz />} />
          <Route path="/english" element={<English />} />
          <Route path="/nature-quiz" element={<NatureQuiz />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
