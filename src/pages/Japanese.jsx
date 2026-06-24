import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StrokeOrderCanvas from '../components/StrokeOrderCanvas';
import HandwritingRecognizer from '../components/HandwritingRecognizer';
import { CharacterSVG } from '../CharacterSVG';
import { playCorrectSound, playIncorrectSound, playFinishSound } from '../audio';
import { db } from '../db';
import { hiraganaList, katakanaList, kanjiList, kanjiDetails } from '../data/charList';

// 接続詞クイズの問題（ここからランダムに5問出題）
const grammarQuizzesPool = [
  { sentence: 'これ［ 　 ］りんごです。', options: ['は', 'を', 'が'], answer: 'は' },
  { sentence: 'ごはん［ 　 ］たべます。', options: ['は', 'を', 'に'], answer: 'を' },
  { sentence: 'ともだち［ 　 ］あそびます。', options: ['と', 'へ', 'を'], answer: 'と' },
  { sentence: 'がっこう［ 　 ］いきます。', options: ['へ', 'を', 'が'], answer: 'へ' },
  { sentence: 'いぬ［ 　 ］はしっています。', options: ['が', 'を', 'に'], answer: 'が' },
  { sentence: 'つくえの［ 　 ］に えんぴつがあります。', options: ['うえ', 'した', 'なか'], answer: 'うえ' },
  { sentence: 'あめ［ 　 ］ふっています。', options: ['が', 'を', 'へ'], answer: 'が' },
  { sentence: 'ねこ［ 　 ］こっちを みています。', options: ['が', 'を', 'に'], answer: 'が' }
];

// 手書き文字認識 穴埋めクイズの問題（ここからランダムに5問出題）
const handwritingQuizzesPool = [
  { textBefore: 'これ', textAfter: 'ください。', answer: 'を', hint: '「これ（を）ください」の『を』を書いてね！' },
  { textBefore: 'わたし', textAfter: 'いちねんせいです。', answer: 'は', hint: '「わたし（は）いちねんせいです」の『は』を書いてね！' },
  { textBefore: 'ねこ', textAfter: 'います。', answer: 'gが', hint: '「ねこ（が）います」の『が』を書いてね！' }, // 「が」に後ほど補正
  { textBefore: 'こうえん', textAfter: 'あそびます。', answer: 'で', hint: '「こうえんで あそびます」の『で』を書いてね！' },
  { textBefore: 'おとうと', textAfter: 'あめを あげる。', answer: 'に', hint: '「おとうと（に）あめを あげる」の『に』を書いてね！' },
  { textBefore: 'えんぴつ', textAfter: 'かきます。', answer: 'で', hint: '「えんぴつ（で）かきます」の『で』を書いてね！' },
  { textBefore: 'ほん', textAfter: 'よみます。', answer: 'を', hint: '「ほん（を）よみます」の『を』を書いてね！' }
];

// タイプミス補正
handwritingQuizzesPool[2].answer = 'が';

const Japanese = () => {
  const navigate = useNavigate();

  // 国語のおべんきょうメニュー: 
  // 'select' (学習選択) | 'letters' (もじのれんしゅう) | 'grammar' (ことばのクイズ) | 'handwriting' (てがきであなうめ)
  const [studyMenu, setStudyMenu] = useState('select');

  // --- もじのれんしゅう（letters）の状態 ---
  const [lettersViewMode, setLettersViewMode] = useState('menu'); // 'menu' | 'practice'
  const [category, setCategory] = useState('hiragana'); // 'hiragana' | 'katakana' | 'kanji'
  const [playMode, setPlayMode] = useState('game'); // 'game' | 'select'
  const [activeChar, setActiveChar] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // --- じぶんでれんしゅう (AI判定) 用の状態 ---
  const [practiceMode, setPracticeMode] = useState('trace'); // 'trace' | 'free'
  const [showFreeGuideText, setShowFreeGuideText] = useState(true);
  const [freeHandwritingResult, setFreeHandwritingResult] = useState(null); // 'correct' | 'incorrect' | null
  const [freeRecognizedChar, setFreeRecognizedChar] = useState('');

  // --- ことばのクイズ（grammar）の状態 ---
  const [grammarQuizzes, setGrammarQuizzes] = useState([]);
  const [grammarIndex, setGrammarIndex] = useState(0);
  const [grammarScore, setGrammarScore] = useState(0);
  const [grammarCharState, setGrammarCharState] = useState('normal');
  const [selectedGrammarAnswer, setSelectedGrammarAnswer] = useState(null);

  // --- てがきであなうめ（handwriting）の状態 ---
  const [handwritingQuizzes, setHandwritingQuizzes] = useState([]);
  const [handwritingIndex, setHandwritingIndex] = useState(0);
  const [handwritingScore, setHandwritingScore] = useState(0);
  const [handwritingCharState, setHandwritingCharState] = useState('normal');
  const [handwritingResult, setHandwritingResult] = useState(null); // 'correct' | 'incorrect' | null
  const [recognizedChar, setRecognizedChar] = useState('');

  // 共通状態
  const [progress, setProgress] = useState({
    hiragana: { completed: [], currentIdx: 0 },
    katakana: { completed: [], currentIdx: 0 },
    kanji: { completed: [], currentIdx: 0 }
  });
  const [score, setScore] = useState(0);

  // 初期データの読み込み
  useEffect(() => {
    const loadData = async () => {
      const prog = await db.getJapaneseProgress();
      setProgress(prog);

      const scores = await db.getScores('japanese');
      const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
      setScore(totalScore);
    };
    loadData();
  }, []);

  // --- 各学習モードの初期化・終了処理 ---

  // ことばのクイズ開始
  const startGrammarQuizzes = () => {
    const shuffled = [...grammarQuizzesPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setGrammarQuizzes(shuffled);
    setGrammarIndex(0);
    setGrammarScore(0);
    setGrammarCharState('normal');
    setSelectedGrammarAnswer(null);
    setStudyMenu('grammar');
  };

  // てがきであなうめ開始
  const startHandwritingQuizzes = () => {
    const shuffled = [...handwritingQuizzesPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setHandwritingQuizzes(shuffled);
    setHandwritingIndex(0);
    setHandwritingScore(0);
    setHandwritingCharState('normal');
    setHandwritingResult(null);
    setRecognizedChar('');
    setStudyMenu('handwriting');
  };

  // 1. もじのれんしゅう：なぞり書き完了時の処理
  const handleFinishDraw = async () => {
    playCorrectSound();
    
    setScore(s => s + 10);
    await db.saveScore('japanese', { score: 10, date: new Date().toLocaleDateString() });

    const catData = progress[category];
    const charList = getCharList(category);
    const charIdx = charList.indexOf(activeChar);

    const newCompleted = [...catData.completed];
    if (!newCompleted.includes(activeChar)) {
      newCompleted.push(activeChar);
    }

    let newCurrentIdx = catData.currentIdx;
    if (charIdx === catData.currentIdx && catData.currentIdx < charList.length - 1) {
      newCurrentIdx = catData.currentIdx + 1;
    }

    const newProgress = {
      ...progress,
      [category]: {
        completed: newCompleted,
        currentIdx: newCurrentIdx
      }
    };

    setProgress(newProgress);
    await db.saveJapaneseProgress(newProgress);
    setShowSuccess(true);
  };

  // フリーハンド手書き（AI判定）練習の判定処理
  const handleFreeHandwritingResult = (isCorrect, recognizedChar) => {
    setFreeRecognizedChar(recognizedChar);
    if (isCorrect) {
      setFreeHandwritingResult('correct');
      handleFinishDraw(); // なぞり書き同様の花丸・ポイント獲得演出を呼ぶ
    } else {
      playIncorrectSound();
      setFreeHandwritingResult('incorrect');
    }
  };

  const getCharList = (cat) => {
    if (cat === 'hiragana') return hiraganaList;
    if (cat === 'katakana') return katakanaList;
    return kanjiList;
  };

  const getCategoryLabel = (cat) => {
    if (cat === 'hiragana') return 'ひらがな';
    if (cat === 'katakana') return 'カタカナ';
    return 'かんじ（1ねんせい）';
  };

  const handleNextChar = () => {
    const charList = getCharList(category);
    const currentIdx = charList.indexOf(activeChar);
    
    if (currentIdx < charList.length - 1) {
      setActiveChar(charList[currentIdx + 1]);
      setShowSuccess(false);
      // フリーハンド用のステートを初期化
      setFreeHandwritingResult(null);
      setFreeRecognizedChar('');
    } else {
      playFinishSound();
      alert(`おめでとう！ ${getCategoryLabel(category)} を ぜんぶクリアしたよ！`);
      setLettersViewMode('menu');
    }
  };

  const handleResetProgress = async () => {
    if (window.confirm('これまでの すすんだデータを ぜんぶ消して、はじめから やりなおす？')) {
      const resetData = {
        hiragana: { completed: [], currentIdx: 0 },
        katakana: { completed: [], currentIdx: 0 },
        kanji: { completed: [], currentIdx: 0 }
      };
      setProgress(resetData);
      await db.saveJapaneseProgress(resetData);
    }
  };

  // 2. ことばのクイズ：回答処理
  const handleGrammarAnswer = (selected) => {
    const currentQ = grammarQuizzes[grammarIndex];
    setSelectedGrammarAnswer(selected);

    if (selected === currentQ.answer) {
      playCorrectSound();
      setGrammarScore(s => s + 10);
      setGrammarCharState('happy');
    } else {
      playIncorrectSound();
      setGrammarCharState('sad');
    }

    setTimeout(async () => {
      setSelectedGrammarAnswer(null); // 回答状態をクリア
      if (grammarIndex < 4) {
        setGrammarIndex(i => i + 1);
        setGrammarCharState('normal');
      } else {
        // クイズ全問完了
        playFinishSound();
        const finalScore = grammarScore + (selected === currentQ.answer ? 10 : 0);
        setScore(s => s + finalScore);
        await db.saveScore('japanese', { score: finalScore, date: new Date().toLocaleDateString() });
        alert(`よくできました！がんばりポイント ${finalScore} をゲットしたよ！`);
        setStudyMenu('select');
      }
    }, 1500);
  };

  // 3. てがきであなうめ：認識結果処理
  const handleHandwritingResult = (isCorrect, topCandidate) => {
    setRecognizedChar(topCandidate);
    if (isCorrect) {
      playCorrectSound();
      setHandwritingResult('correct');
      setHandwritingScore(s => s + 10);
      setHandwritingCharState('happy');
    } else {
      playIncorrectSound();
      setHandwritingResult('incorrect');
      setHandwritingCharState('sad');
    }
  };

  const handleNextHandwriting = async () => {
    setHandwritingResult(null);
    setRecognizedChar('');
    setHandwritingCharState('normal');

    if (handwritingIndex < 4) {
      setHandwritingIndex(i => i + 1);
    } else {
      // 全問完了
      playFinishSound();
      setScore(s => s + handwritingScore);
      await db.saveScore('japanese', { score: handwritingScore, date: new Date().toLocaleDateString() });
      alert(`てがきで あなうめ おわり！がんばりポイント ${handwritingScore} をゲットしたよ！`);
      setStudyMenu('select');
    }
  };

  // --- UIレンダリング画面の定義 ---

  // 学習選択（初期トップメニュー）のレンダリング
  const renderStudySelectMenu = () => {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
          <CharacterSVG type="happy" width={90} height={90} />
        </div>
        <p style={{ fontWeight: 'bold', color: '#475569', marginBottom: '30px' }}>
          どのおべんきょうを する？ えらんでね！
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px', margin: '0 auto' }}>
          {/* メニュー1: もじのれんしゅう */}
          <div 
            onClick={() => { setLettersViewMode('menu'); setStudyMenu('letters'); }}
            className="subject-card"
            style={{ 
              flexDirection: 'row', 
              padding: '20px 24px', 
              textAlign: 'left', 
              alignItems: 'center',
              borderBottom: '4px solid #FF6B6B',
              background: 'linear-gradient(135deg, #ffffff 0%, #FFF5F5 100%)',
              justifyContent: 'flex-start',
              gap: '20px'
            }}
          >
            <div style={{ fontSize: '3rem' }}>🌸</div>
            <div>
              <h2 style={{ textAlign: 'left', fontSize: '1.3rem', margin: 0, color: '#E03131' }}>もじの れんしゅう</h2>
              <p style={{ textAlign: 'left', fontSize: '0.85rem', color: '#787878', marginTop: '4px' }}>
                ひらがな・カタカナ・かんじ を なぞって きれいに かこう！
              </p>
            </div>
          </div>

          {/* メニュー2: ことばのクイズ */}
          <div 
            onClick={startGrammarQuizzes}
            className="subject-card"
            style={{ 
              flexDirection: 'row', 
              padding: '20px 24px', 
              textAlign: 'left', 
              alignItems: 'center',
              borderBottom: '4px solid #4ECDC4',
              background: 'linear-gradient(135deg, #ffffff 0%, #F0FDFA 100%)',
              justifyContent: 'flex-start',
              gap: '20px'
            }}
          >
            <div style={{ fontSize: '3rem' }}>📖</div>
            <div>
              <h2 style={{ textAlign: 'left', fontSize: '1.3rem', margin: 0, color: '#0F766E' }}>ことばの クイズ</h2>
              <p style={{ textAlign: 'left', fontSize: '0.85rem', color: '#787878', marginTop: '4px' }}>
                「は」「を」「へ」 など、ただしい つなぎことば を えらぼう！
              </p>
            </div>
          </div>

          {/* メニュー3: てがきであなうめ */}
          <div 
            onClick={startHandwritingQuizzes}
            className="subject-card"
            style={{ 
              flexDirection: 'row', 
              padding: '20px 24px', 
              textAlign: 'left', 
              alignItems: 'center',
              borderBottom: '4px solid #FFE66D',
              background: 'linear-gradient(135deg, #ffffff 0%, #FFFDF0 100%)',
              justifyContent: 'flex-start',
              gap: '20px'
            }}
          >
            <div style={{ fontSize: '3rem' }}>✏️</div>
            <div>
              <h2 style={{ textAlign: 'left', fontSize: '1.3rem', margin: 0, color: '#B25E00' }}>てがきで あなうめ</h2>
              <p style={{ textAlign: 'left', fontSize: '0.85rem', color: '#787878', marginTop: '4px' }}>
                あいているところに、てがきで もじを かきこもう！
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 1. もじのれんしゅうモードの画面
  const renderLettersMenu = () => {
    const charList = getCharList(category);
    const catData = progress[category];

    return (
      <div>
        {/* カテゴリタブ */}
        <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '16px', padding: '6px', marginBottom: '20px', gap: '4px' }}>
          {['hiragana', 'katakana', 'kanji'].map((cat) => {
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  flex: 1,
                  background: isActive ? 'white' : 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  color: isActive ? 'var(--primary-color)' : '#475569',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat === 'hiragana' ? 'あいうえお' : cat === 'katakana' ? 'アイウエオ' : 'かんじ'}
              </button>
            );
          })}
        </div>

        {/* プレイモード切替 */}
        {renderModeSelector()}

        {/* キャラクターふきだし */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '20px 0', padding: '15px', background: 'rgba(255,255,255,0.4)', borderRadius: '20px' }}>
          <CharacterSVG type="normal" width={70} height={70} />
          <div style={{
            position: 'relative',
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            padding: '12px 18px',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#334155',
            maxWidth: '300px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              position: 'absolute',
              left: '-10px',
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '16px',
              height: '16px',
              background: 'white',
              borderLeft: '2px solid #e2e8f0',
              borderBottom: '2px solid #e2e8f0'
            }} />
            {getSupportMessage()}
          </div>
        </div>

        {/* 進捗ゲージ */}
        <div style={{ margin: '20px auto', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' }}>
            <span>クリアしたもじ</span>
            <span>{catData.completed.length} / {charList.length} もじ</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${(catData.completed.length / charList.length) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #4ECDC4 0%, #2AB7CA 100%)',
                borderRadius: '10px',
                transition: 'width 0.5s ease-out'
              }} 
            />
          </div>
        </div>

        {/* グリッド表示 */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(55px, 1fr))', 
            gap: '12px', 
            background: 'white', 
            padding: '24px', 
            borderRadius: '24px',
            boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.02)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {charList.map((char, index) => {
            const isCompleted = catData.completed.includes(char);
            const isCurrent = index === catData.currentIdx;
            const isLocked = playMode === 'game' && index > catData.currentIdx;

            let btnBg = 'white';
            let btnBorder = '2px solid #e2e8f0';
            let btnColor = '#475569';
            let btnShadow = 'none';
            let cursor = 'pointer';

            if (isCompleted) {
              btnBg = 'linear-gradient(135deg, #E8F9FD 0%, #C4EDDE 100%)';
              btnBorder = '2px solid #4ECDC4';
              btnColor = '#1A535C';
            } else if (isCurrent && playMode === 'game') {
              btnBg = 'linear-gradient(135deg, #FFFDF0 0%, #FFF5C2 100%)';
              btnBorder = '3px solid #FFE66D';
              btnColor = '#B25E00';
              btnShadow = '0 0 12px rgba(255, 230, 109, 0.8)';
            } else if (isLocked) {
              btnBg = '#f1f5f9';
              btnBorder = '2px dashed #cbd5e1';
              btnColor = '#94a3b8';
              cursor = 'not-allowed';
            }

            return (
              <button
                key={char}
                onClick={() => !isLocked && startPractice(char)}
                disabled={isLocked}
                className={isCurrent && playMode === 'game' ? 'pulse-btn' : ''}
                style={{
                  width: '55px',
                  height: '55px',
                  borderRadius: '16px',
                  background: btnBg,
                  border: btnBorder,
                  color: btnColor,
                  fontSize: '1.4rem',
                  fontWeight: 'bold',
                  cursor: cursor,
                  boxShadow: btnShadow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                {isLocked ? '🔒' : char}
                {isCompleted && (
                  <span style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '0.65rem', color: '#FFB800' }}>★</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
          <button onClick={handleResetProgress} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
            データを リセットする
          </button>
        </div>
      </div>
    );
  };

  const renderModeSelector = () => (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
      <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.8)', borderRadius: '50px', padding: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <button
          onClick={() => setPlayMode('game')}
          style={{
            background: playMode === 'game' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' : 'transparent',
            color: playMode === 'game' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '50px',
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: playMode === 'game' ? '0 4px 10px rgba(255,107,107,0.3)' : 'none'
          }}
        >
          🎮 ステップアップ
        </button>
        <button
          onClick={() => setPlayMode('select')}
          style={{
            background: playMode === 'select' ? 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)' : 'transparent',
            color: playMode === 'select' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '50px',
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: playMode === 'select' ? '0 4px 10px rgba(78,205,196,0.3)' : 'none'
          }}
        >
          🔍 えらんでれんしゅう
        </button>
      </div>
    </div>
  );

  const getSupportMessage = () => {
    const catData = progress[category];
    const total = getCharList(category).length;
    const completedCount = catData.completed.length;
    if (completedCount === total) return `すごい！ ぜんぶクリアしたよ！`;
    if (playMode === 'game') {
      const nextChar = getCharList(category)[catData.currentIdx];
      return `つぎは 「${nextChar}」 に ちょうせんしてみよう！`;
    }
    return `れんしゅう したい もじ を クリックしてね！`;
  };

  const startPractice = (char) => {
    setActiveChar(char);
    setLettersViewMode('practice');
    setShowSuccess(false);
    // モードとフリーハンド状態をリセット
    setPracticeMode('trace');
    setFreeHandwritingResult(null);
    setFreeRecognizedChar('');
  };

  // 1-2. もじのれんしゅう（練習画面）
  const renderLettersPractice = () => {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn" onClick={() => setLettersViewMode('menu')} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', fontSize: '1rem' }}>
            ← いちらんへ
          </button>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--blue-color)' }}>
            「{activeChar}」 の れんしゅう
          </div>
          <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'bold' }}>
            {playMode === 'game' ? '🎮 ステップアップ' : '🔍 えらんで練習'}
          </div>
        </div>

        {/* 読み方の表示 */}
        {category === 'kanji' && kanjiDetails[activeChar] && (
          <div 
            style={{ 
              background: 'white', 
              border: '2px solid #e2e8f0', 
              borderRadius: '24px', 
              padding: '16px 20px', 
              margin: '0 auto 15px auto', 
              maxWidth: '350px',
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.95rem',
              color: '#334155',
              boxShadow: '0 8px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
              {kanjiDetails[activeChar].kunyomi && (
                <div>
                  <span style={{ fontWeight: 'bold', color: '#FF6B6B' }}>くんよみ:</span> {kanjiDetails[activeChar].kunyomi}
                </div>
              )}
              {kanjiDetails[activeChar].onyomi && (
                <div>
                  <span style={{ fontWeight: 'bold', color: '#4ECDC4' }}>おんよみ:</span> {kanjiDetails[activeChar].onyomi}
                </div>
              )}
            </div>
            
            {kanjiDetails[activeChar].examples && kanjiDetails[activeChar].examples.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', alignSelf: 'flex-start' }}>✏️ つかいかたの れい:</span>
                {kanjiDetails[activeChar].examples.map((ex, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      background: '#f8fafc', 
                      padding: '6px 12px', 
                      borderRadius: '8px', 
                      width: '100%', 
                      fontSize: '0.9rem', 
                      fontWeight: 'bold',
                      color: '#475569',
                      borderLeft: '3px solid #FFD166',
                      textAlign: 'left'
                    }}
                  >
                    {ex}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* なぞりと手書き(AI判定)の切り替えトグル */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
          <button 
            onClick={() => { setPracticeMode('trace'); setFreeHandwritingResult(null); }}
            style={{
              background: practiceMode === 'trace' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' : '#e2e8f0',
              color: practiceMode === 'trace' ? 'white' : '#475569',
              border: 'none',
              borderRadius: '50px',
              padding: '10px 20px',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: practiceMode === 'trace' ? '0 4px 10px rgba(255,107,107,0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            🎮 なぞってれんしゅう
          </button>
          <button 
            onClick={() => { setPracticeMode('free'); setFreeHandwritingResult(null); }}
            style={{
              background: practiceMode === 'free' ? 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)' : '#e2e8f0',
              color: practiceMode === 'free' ? 'white' : '#475569',
              border: 'none',
              borderRadius: '50px',
              padding: '10px 20px',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: practiceMode === 'free' ? '0 4px 10px rgba(78,205,196,0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            ✏️ じぶんでれんしゅう (AI判定)
          </button>
        </div>

        {/* じぶんでれんしゅう(AI判定)時のガイドテキスト表示切り替え */}
        {practiceMode === 'free' && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '15px', fontSize: '0.95rem', fontWeight: 'bold', color: '#475569' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={showFreeGuideText}
                onChange={(e) => setShowFreeGuideText(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              背景にお手本の文字をだす
            </label>
          </div>
        )}

        {/* キャンバス切り替え */}
        {practiceMode === 'trace' ? (
          <StrokeOrderCanvas 
            targetText={activeChar} 
            onFinish={handleFinishDraw} 
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            {freeHandwritingResult !== 'incorrect' ? (
              <HandwritingRecognizer 
                expectedAnswer={activeChar}
                backgroundText={activeChar}
                showBackgroundText={showFreeGuideText}
                onResult={handleFreeHandwritingResult}
              />
            ) : (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '20px', 
                  padding: '24px 20px',
                  background: 'white',
                  borderRadius: '24px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                  border: '2px solid #e2e8f0',
                  width: '280px',
                  animation: 'fadeIn 0.3s ease'
                }}
              >
                <div style={{ fontSize: '4.5rem' }}>❌</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#64748b', textAlign: 'center', lineHeight: '1.4' }}>
                  おしかったね！💦<br />
                  <span style={{ fontSize: '1.05rem', color: '#FF6B6B' }}>「{freeRecognizedChar}」って かいてあるみたい。</span>
                </div>
                <button 
                  className="btn" 
                  onClick={() => setFreeHandwritingResult(null)}
                  style={{ 
                    background: '#FF6B6B', 
                    border: 'none', 
                    color: 'white', 
                    padding: '12px 28px', 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 10px rgba(255,107,107,0.3)',
                    cursor: 'pointer'
                  }}
                >
                  もういちど かく
                </button>
              </div>
            )}
          </div>
        )}

        {showSuccess && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.92)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', zIndex: 100, animation: 'fadeIn 0.3s ease' }}>
            {/* 花丸 */}
            <div style={{ width: '150px', height: '150px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'success-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <svg viewBox="0 0 120 120" width="100%" height="100%">
                <path d="M 60,8 C 53,8 50,20 45,22 C 37,25 31,14 24,19 C 18,24 25,34 22,41 C 20,49 8,53 8,60 C 8,67 20,71 22,79 C 25,86 18,96 24,101 C 31,106 37,95 45,98 C 50,100 53,112 60,112 C 67,112 70,100 75,98 C 83,95 89,106 96,101 C 102,96 95,86 98,79 C 100,71 112,67 112,60 C 112,53 100,49 98,41 C 95,34 102,24 96,19 C 89,14 83,25 75,22 C 70,20 67,8 60,8 Z" fill="none" stroke="#FF3366" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="60" cy="60" r="32" fill="none" stroke="#FF3366" strokeWidth="4.5" />
              </svg>
              <div style={{ position: 'absolute', fontSize: '0.8rem', fontWeight: '900', color: '#FF3366', textAlign: 'center', width: '120px', lineHeight: '1.35', fontFamily: "'Kosugi Maru', sans-serif", textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 0 2px 0 #fff, 2px 0 0 #fff, 0 -2px 0 #fff, -2px 0 0 #fff' }}>
                たいへん<br /><span style={{ whiteSpace: 'nowrap' }}>よくできました</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CharacterSVG type="happy" width={90} height={90} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#FF3366', textAlign: 'center' }}>
              きれいに かけたね！<br />
              <span style={{ fontSize: '1.1rem', color: '#FF8E53' }}>+10 がんばりポイント！</span>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button className="btn" onClick={() => setLettersViewMode('menu')} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                いちらんに もどる
              </button>
              {playMode === 'game' ? (
                <button className="btn btn-primary" onClick={handleNextChar} style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', border: 'none', boxShadow: '0 4px 15px rgba(255,107,107,0.3)' }}>
                  つぎのもじへ →
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowSuccess(false)} style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)', border: 'none', boxShadow: '0 4px 15px rgba(78,205,196,0.3)' }}>
                  もういちど かく
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 2. ことばのクイズ（接続詞クイズ）の画面
  const renderGrammarQuizzes = () => {
    if (grammarQuizzes.length === 0) return null;
    const currentQ = grammarQuizzes[grammarIndex];

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn" onClick={() => setStudyMenu('select')} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', fontSize: '1rem' }}>
            ← メニューへ
          </button>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--blue-color)' }}>ことばの クイズ</div>
          <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'bold' }}>
            {grammarIndex + 1} / 5 もんめ
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <CharacterSVG type={grammarCharState} width={90} height={90} />
        </div>

        <div 
          style={{ 
            background: 'white', 
            borderRadius: '24px', 
            padding: '30px 20px', 
            textAlign: 'center', 
            fontSize: '1.6rem', 
            fontWeight: 'bold',
            margin: '20px 0',
            boxShadow: '0 8px 16px rgba(0,0,0,0.03)',
            border: '2px solid #e2e8f0',
            fontFamily: "'Kosugi Maru', sans-serif"
          }}
        >
          {currentQ.sentence.replace(' 　 ', selectedGrammarAnswer || ' 　 ')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginTop: '30px' }}>
          {currentQ.options.map((opt, i) => (
            <button 
              key={i} 
              className="btn btn-primary" 
              style={{ 
                width: '80%', 
                background: 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)', 
                border: 'none',
                boxShadow: '0 4px 15px rgba(78,205,196,0.2)',
                fontSize: '1.5rem',
                padding: '12px 0'
              }}
              onClick={() => handleGrammarAnswer(opt)}
              disabled={selectedGrammarAnswer !== null}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // 3. てがきであなうめ（手書き文字認識）の画面
  const renderHandwritingQuizzes = () => {
    if (handwritingQuizzes.length === 0) return null;
    const currentQ = handwritingQuizzes[handwritingIndex];

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn" onClick={() => setStudyMenu('select')} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', fontSize: '1rem' }}>
            ← メニューへ
          </button>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--blue-color)' }}>てがきで あなうめ</div>
          <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'bold' }}>
            {handwritingIndex + 1} / 5 もんめ
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
          <CharacterSVG type={handwritingCharState} width={80} height={80} />
        </div>

        {/* 穴埋め問題文章 */}
        <div 
          style={{ 
            background: 'white', 
            borderRadius: '24px', 
            padding: '24px 20px', 
            textAlign: 'center', 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            margin: '15px 0',
            boxShadow: '0 8px 16px rgba(0,0,0,0.03)',
            border: '2px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Kosugi Maru', sans-serif"
          }}
        >
          <span>{currentQ.textBefore}</span>
          <span 
            style={{ 
              display: 'inline-block', 
              width: '45px', 
              height: '45px', 
              lineHeight: '38px',
              border: '3px dashed #FF6B6B', 
              borderRadius: '8px', 
              background: '#FFF5F5',
              color: '#FF6B6B',
              fontSize: '1.6rem'
            }}
          >
            {handwritingResult === 'correct' ? currentQ.answer : (recognizedChar || '？')}
          </span>
          <span>{currentQ.textAfter}</span>
        </div>

        {/* 手書き認識キャンバス */}
        {handwritingResult === null ? (
          <HandwritingRecognizer 
            expectedAnswer={currentQ.answer}
            onResult={handleHandwritingResult}
          />
        ) : (
          /* 回答結果のアニメーション・演出画面 */
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px', 
              padding: '20px',
              background: 'white',
              borderRadius: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              border: '2px solid #e2e8f0',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            {handwritingResult === 'correct' ? (
              <>
                <div style={{ width: '120px', height: '120px', position: 'relative', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                  <svg viewBox="0 0 120 120" width="100%" height="100%">
                    <path d="M 60,8 C 53,8 50,20 45,22 C 37,25 31,14 24,19 C 18,24 25,34 22,41 C 20,49 8,53 8,60 C 8,67 20,71 22,79 C 25,86 18,96 24,101 C 31,106 37,95 45,98 C 50,100 53,112 60,112 C 67,112 70,100 75,98 C 83,95 89,106 96,101 C 102,96 95,86 98,79 C 100,71 112,67 112,60 C 112,53 100,49 98,41 C 95,34 102,24 96,19 C 89,14 83,25 75,22 C 70,20 67,8 60,8 Z" fill="none" stroke="#FF3366" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="60" cy="60" r="32" fill="none" stroke="#FF3366" strokeWidth="4.5" />
                  </svg>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#FF3366', textAlign: 'center' }}>
                  せいかい！すごい！🌟<br />
                  <span style={{ fontSize: '1.1rem', color: '#64748b' }}>「{recognizedChar}」って よみとれたよ！</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '4rem' }}>❌</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>
                  おしかったね！💦<br />
                  <span style={{ fontSize: '1.1rem', color: '#FF6B6B' }}>「{recognizedChar}」って かいてあるみたい。</span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              {handwritingResult === 'incorrect' ? (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setHandwritingResult(null)}
                  style={{ background: '#FF6B6B', border: 'none', color: 'white' }}
                >
                  もういちど かく
                </button>
              ) : null}
              <button 
                className="btn btn-primary"
                onClick={handleNextHandwriting}
                style={{
                  background: 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(78,205,196,0.3)'
                }}
              >
                {handwritingIndex < 4 ? 'つぎのもんだいへ →' : 'おわり！ 🎌'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '24px 20px' }}>
      {/* トップバー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          className="btn" 
          onClick={() => {
            if (studyMenu !== 'select') {
              if (studyMenu === 'letters' && lettersViewMode === 'practice') {
                setLettersViewMode('menu');
              } else {
                setStudyMenu('select');
              }
            } else {
              navigate('/');
            }
          }}
          style={{ padding: '8px 16px', fontSize: '0.95rem' }}
        >
          ◀ もどる
        </button>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>こくご（もじのれんしゅう）</h2>
        <div 
          style={{ 
            fontWeight: 'bold', 
            color: '#FF6B6B', 
            background: 'white', 
            padding: '8px 16px', 
            borderRadius: '50px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            fontSize: '0.95rem'
          }}
        >
          🌟 ポイント: {score}
        </div>
      </div>

      {studyMenu === 'select' && renderStudySelectMenu()}
      {studyMenu === 'letters' && (lettersViewMode === 'menu' ? renderLettersMenu() : renderLettersPractice())}
      {studyMenu === 'grammar' && renderGrammarQuizzes()}
      {studyMenu === 'handwriting' && renderHandwritingQuizzes()}

      {/* スタイル定義 */}
      <style>{`
        @keyframes success-pop {
          0% { transform: scale(0.3); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-active {
          0% { transform: scale(1); box-shadow: 0 0 8px rgba(255, 230, 109, 0.6); }
          100% { transform: scale(1.06); box-shadow: 0 0 18px rgba(255, 230, 109, 0.9); }
        }
        .pulse-btn {
          animation: pulse-active 1.2s infinite alternate ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Japanese;
