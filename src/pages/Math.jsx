import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { playCorrectSound, playIncorrectSound, playFinishSound } from '../audio';
import { db } from '../db';

const MathPage = () => {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 5;
  const [question, setQuestion] = useState({ num1: 0, num2: 0, op: '+', answer: 0, options: [] });
  const [characterState, setCharacterState] = useState('normal');

  const generateQuestion = () => {
    const isAddition = Math.random() > 0.5;
    let num1, num2, answer;

    if (isAddition) {
      num1 = Math.floor(Math.random() * 10) + 1; // 1-10
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 + num2;
    } else {
      num1 = Math.floor(Math.random() * 10) + 10; // 10-19
      num2 = Math.floor(Math.random() * 9) + 1; // 1-9
      answer = num1 - num2;
    }

    // ダミーの選択肢を生成
    let options = new Set([answer]);
    while (options.size < 3) {
      let dummy = answer + Math.floor(Math.random() * 5) - 2;
      if (dummy > 0 && dummy !== answer) {
        options.add(dummy);
      }
    }
    // シャッフル
    options = Array.from(options).sort(() => Math.random() - 0.5);

    setQuestion({ num1, num2, op: isAddition ? '+' : '-', answer, options });
    setCharacterState('normal');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      generateQuestion();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleAnswer = async (selected) => {
    if (selected === question.answer) {
      playCorrectSound();
      setScore(s => s + 10);
      setCharacterState('happy');
    } else {
      playIncorrectSound();
      setCharacterState('sad');
    }

    setTimeout(async () => {
      if (questionCount + 1 < maxQuestions) {
        setQuestionCount(c => c + 1);
        generateQuestion();
      } else {
        playFinishSound();
        const finalScore = score + (selected === question.answer ? 10 : 0);
        await db.saveScore('math', { score: finalScore, date: new Date().toLocaleDateString() });
        alert('よくできました！がんばりポイントをゲットしたよ！');
        navigate('/');
      }
    }, 1000);
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn" onClick={() => navigate('/')}>もどる</button>
        <h2>さんすう（けいさん）</h2>
        <div style={{ fontWeight: 'bold', color: '#4ECDC4' }}>ポイント: {score}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <CharacterSVG type={characterState} width={100} height={100} />
      </div>

      <div style={{ textAlign: 'center', fontSize: '3rem', margin: '30px 0', fontFamily: "'Kosugi Maru', sans-serif" }}>
        {question.num1} {question.op} {question.num2} = ?
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        {question.options.map((opt, i) => (
          <button 
            key={i} 
            className="btn btn-secondary" 
            style={{ fontSize: '2rem', width: '80px', height: '80px', borderRadius: '20px' }}
            onClick={() => handleAnswer(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>
        {questionCount + 1} / {maxQuestions} もんめ
      </div>
    </div>
  );
};

export default MathPage;
