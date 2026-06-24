import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { playCorrectSound, playIncorrectSound, playFinishSound } from '../audio';
import { db } from '../db';

const allQuizzes = [
  { q: 'はる に さく ピンクいろ の おはな は どれ？', options: ['さくら', 'ひまわり', 'もみじ'], answer: 'さくら' },
  { q: 'あか しんごう の ときは どうする？', options: ['はしる', 'とまる', 'すすむ'], answer: 'とまる' },
  { q: 'あき に なると おちてくる どんぐり。 どんぐり を たべる どうぶつ は？', options: ['りす', 'きりん', 'ぺんぎん'], answer: 'りす' },
  { q: 'あさ おきたら なんて あいさつ する？', options: ['おはよう', 'こんにちは', 'おやすみ'], answer: 'おはよう' },
  { q: 'としより の ひと が バス に のってきたら？', options: ['せき を ゆずる', 'ねたふり を する', 'おおごえ で なく'], answer: 'せき を ゆずる' },
  { q: 'て を あらう とき は なに を つかう？', options: ['せっけん', 'どろ', 'えのぐ'], answer: 'せっけん' },
  { q: 'よる ねる まえ に は なに を する？', options: ['はみがき', 'おやつ を たべる', 'あそぶ'], answer: 'はみがき' },
  { q: 'おともだち と けんか してしまったら？', options: ['ごめんなさい', 'ありがとう', 'さようなら'], answer: 'ごめんなさい' },
  { q: 'ごはん を たべる まえ に なんて いう？', options: ['いただきます', 'ごちそうさま', 'おやすみ'], answer: 'いただきます' },
  { q: 'がっこう に いく とき は なに を もっていく？', options: ['らんどせる', 'おもちゃ', 'すいか'], answer: 'らんどせる' },
  { q: 'なつやすみ に なく むし は？', options: ['せみ', 'すずむし', 'かぶとむし'], answer: 'せみ' },
  { q: 'あお しんごう の ときは どうする？', options: ['すすむ', 'とまる', 'もどる'], answer: 'すすむ' },
  { q: 'ものを もらった ときは なんて いう？', options: ['ありがとう', 'さようなら', 'おはよう'], answer: 'ありがとう' },
  { q: 'えんぴつ は どこ に しまう？', options: ['ふでばこ', 'れいぞうこ', 'ぽけっと'], answer: 'ふでばこ' },
  { q: 'じてんしゃ に のる とき は かぶる もの は？', options: ['へるめっと', 'ぼうし', 'なべ'], answer: 'へるめっと' }
];

const LifeGeneralQuiz = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [characterState, setCharacterState] = useState('normal');

  useEffect(() => {
    const shuffled = [...allQuizzes].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuizzes(shuffled);
  }, []);

  const handleAnswer = async (selected) => {
    const currentQ = quizzes[questionCount];
    if (selected === currentQ.answer) {
      playCorrectSound();
      setScore(s => s + 10);
      setCharacterState('happy');
    } else {
      playIncorrectSound();
      setCharacterState('sad');
    }

    setTimeout(async () => {
      if (questionCount + 1 < quizzes.length) {
        setQuestionCount(c => c + 1);
        setCharacterState('normal');
      } else {
        playFinishSound();
        const finalScore = score + (selected === currentQ.answer ? 10 : 0);
        await db.saveScore('life', { score: finalScore, date: new Date().toLocaleDateString() });
        alert('よくできました！がんばりポイントをゲットしたよ！');
        navigate('/life');
      }
    }, 1500);
  };

  if (quizzes.length === 0) return null;

  const currentQuiz = quizzes[questionCount];

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn" onClick={() => navigate('/life')}>もどる</button>
        <h2>せいかつ（いっぱん）</h2>
        <div style={{ fontWeight: 'bold', color: '#FFE66D' }}>ポイント: {score}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <CharacterSVG type={characterState} width={100} height={100} />
      </div>

      <div style={{ textAlign: 'center', fontSize: '1.5rem', margin: '30px 0', minHeight: '80px' }}>
        {currentQuiz.q}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
        {currentQuiz.options.map((opt, i) => (
          <button 
            key={i} 
            className="btn" 
            style={{ width: '80%', background: '#FFE66D', color: '#1A535C' }}
            onClick={() => handleAnswer(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>
        {questionCount + 1} / {quizzes.length} もんめ
      </div>
    </div>
  );
};

export default LifeGeneralQuiz;
