import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { playFinishSound } from '../audio';
import { db } from '../db';

const English = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const flashcards = [
    { word: 'Apple', meaning: 'りんご', emoji: '🍎' },
    { word: 'Dog', meaning: 'いぬ', emoji: '🐶' },
    { word: 'Cat', meaning: 'ねこ', emoji: '🐱' },
    { word: 'Sun', meaning: 'たいよう', emoji: '☀️' },
    { word: 'Water', meaning: 'みず', emoji: '💧' },
  ];

  const playVoice = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // 少しゆっくり
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // 最初のカードの音声を再生
    playVoice(flashcards[0].word);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = async () => {
    setScore(s => s + 10);
    
    if (currentIndex + 1 < flashcards.length) {
      setCurrentIndex(c => c + 1);
      playVoice(flashcards[currentIndex + 1].word);
    } else {
      playFinishSound();
      await db.saveScore('english', { score: score + 10, date: new Date().toLocaleDateString() });
      alert('えいごの おべんきょう おわり！ポイントゲット！');
      navigate('/');
    }
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn" onClick={() => navigate('/')}>もどる</button>
        <h2>えいご（カード）</h2>
        <div style={{ fontWeight: 'bold', color: '#1A535C' }}>ポイント: {score}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <CharacterSVG type="happy" width={80} height={80} />
      </div>

      <div 
        style={{ 
          background: 'white', 
          borderRadius: '20px', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          marginBottom: '30px'
        }}
        onClick={() => playVoice(currentCard.word)}
      >
        <div style={{ fontSize: '5rem', margin: '20px 0' }}>{currentCard.emoji}</div>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#1A535C' }}>{currentCard.word}</div>
        <div style={{ fontSize: '1.5rem', color: '#666', marginTop: '10px' }}>{currentCard.meaning}</div>
        
        <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '20px' }}>
          （カードをタップすると おとがなるよ）
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" style={{ background: '#1A535C' }} onClick={handleNext}>
          つぎへ
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>
        {currentIndex + 1} / {flashcards.length}
      </div>
    </div>
  );
};

export default English;
