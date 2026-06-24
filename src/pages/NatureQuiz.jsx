import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { playCorrectSound, playIncorrectSound, playFinishSound } from '../audio';
import { db } from '../db';

// クイズの全プール
const allQuizzes = [
  { q: 'この おはな の なまえは なにかな？', img: '/images/nature/himawari.webp', options: ['あさがお', 'ひまわり', 'さくら'], answer: 'ひまわり' },
  { q: 'この むし の なまえは なにかな？', img: '/images/nature/kabutomushi.webp', options: ['かぶとむし', 'くわがた', 'てんとうむし'], answer: 'かぶとむし' },
  { q: 'はる に さく きれいな おはな は どれ？', img: '/images/nature/sakura.webp', options: ['ちゅーりっぷ', 'さくら', 'たんぽぽ'], answer: 'さくら' },
  { q: 'この きれいな むし の なまえは なにかな？', img: '/images/nature/chocho.webp', options: ['とんぼ', 'ちょうちょ', 'はち'], answer: 'ちょうちょ' },
  { q: 'なつ に さく この おはな の なまえは？', img: '/images/nature/asagao.webp', options: ['ひまわり', 'あさがお', 'ゆり'], answer: 'あさがお' },
  { q: 'かっこいい この むし の なまえは？', img: '/images/nature/kamakiri.webp', options: ['かまきり', 'ばった', 'せみ'], answer: 'かまきり' },
  { q: 'はる に さく かわいい おはな の なまえは？', img: '/images/nature/tulip.webp', options: ['さくら', 'ちゅーりっぷ', 'ひまわり'], answer: 'ちゅーりっぷ' },
  { q: 'わたげ が とぶ この おはな は？', img: '/images/nature/tanpopo.webp', options: ['たんぽぽ', 'ひまわり', 'あさがお'], answer: 'たんぽぽ' },
  { q: 'きれい で いい におい が する おはな は？', img: '/images/nature/rose.webp', options: ['ばら', 'ゆり', 'すずらん'], answer: 'ばら' },
  { q: 'ははのひ に わたす おはな の なまえは？', img: '/images/nature/carnation.webp', options: ['かーねーしょん', 'ちゅーりっぷ', 'ばら'], answer: 'かーねーしょん' },
  { q: 'しろく て おおきな この おはな は？', img: '/images/nature/lily.webp', options: ['ゆり', 'すずらん', 'こすもす'], answer: 'ゆり' },
  { q: 'ちいさく て かわいい この おはな は？', img: '/images/nature/suzuran.webp', options: ['すずらん', 'たんぽぽ', 'ゆり'], answer: 'すずらん' },
  { q: 'あめ の ひ に きれい に さく おはな は？', img: '/images/nature/ajisai.webp', options: ['あじさい', 'あさがお', 'さくら'], answer: 'あじさい' },
  { q: 'あき に なると さく おはな の なまえは？', img: '/images/nature/cosmos.webp', options: ['こすもす', 'ひまわり', 'たんぽぽ'], answer: 'こすもす' },
  { q: 'いろんな いろ が ある この おはな は？', img: '/images/nature/pansy.webp', options: ['ぱんじー', 'ばら', 'あじさい'], answer: 'ぱんじー' },
  { q: 'はる の はじめ に さく おはな は？', img: '/images/nature/ume.webp', options: ['うめ', 'さくら', 'ちゅーりっぷ'], answer: 'うめ' }
];

const NatureQuiz = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [characterState, setCharacterState] = useState('normal');
  const [showImageError, setShowImageError] = useState(false);

  useEffect(() => {
    // ランダムに5問を選ぶ
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
        setShowImageError(false);
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
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn" onClick={() => navigate('/life')}>もどる</button>
        <h2 style={{ fontSize: '1.2rem' }}>しぜんかんさつ</h2>
        <div style={{ fontWeight: 'bold', color: '#FFE66D' }}>ポイント: {score}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        <CharacterSVG type={characterState} width={80} height={80} />
      </div>

      <div style={{ textAlign: 'center', fontSize: '1.3rem', margin: '15px 0', minHeight: '60px' }}>
        {currentQuiz.q}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {!showImageError ? (
          <img 
            src={currentQuiz.img} 
            alt="クイズの画像" 
            style={{ 
              maxWidth: '100%', 
              height: '200px', 
              objectFit: 'cover', 
              borderRadius: '16px',
              border: '4px solid #FFE66D',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }} 
            onError={() => setShowImageError(true)}
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: '200px', 
            background: '#f1f5f9', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: '16px',
            border: '2px dashed #cbd5e1',
            color: '#64748b',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: '2rem' }}>📸</span>
            <span>がぞうがよみこめません</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        {currentQuiz.options.map((opt, i) => (
          <button 
            key={i} 
            className="btn" 
            style={{ width: '90%', background: '#4ECDC4', color: '#fff', fontSize: '1.2rem', padding: '12px' }}
            onClick={() => handleAnswer(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
        {questionCount + 1} / {quizzes.length} もんめ
      </div>
    </div>
  );
};

export default NatureQuiz;
