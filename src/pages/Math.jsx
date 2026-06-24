import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { playCorrectSound, playIncorrectSound, playFinishSound } from '../audio';
import { db } from '../db';

// ----------------------------------------------------
// 時計クイズ用の補助関数
// ----------------------------------------------------

// 時計の日本語の読みラベルを生成
const getClockLabel = (hour, minute, difficulty) => {
  if (difficulty === 'easy') {
    if (minute === 30) {
      return `${hour}じはん`;
    }
    return `${hour}じ`;
  } else {
    if (minute === 0) {
      return `${hour}じ`;
    }
    const suffix = (minute % 10 === 0) ? 'ぷん' : 'ふん';
    return `${hour}じ ${minute}${suffix}`;
  }
};

// 選択肢（3択）を生成
const generateClockOptions = (hour, minute, difficulty) => {
  const correct = getClockLabel(hour, minute, difficulty);
  const options = new Set([correct]);

  while (options.size < 3) {
    const rand = Math.random();
    if (rand < 0.5) {
      // 時間だけをずらす (+1 または -1)
      const diff = Math.random() > 0.5 ? 1 : -1;
      let dHour = hour + diff;
      if (dHour > 12) dHour = 1;
      if (dHour < 1) dHour = 12;
      options.add(getClockLabel(dHour, minute, difficulty));
    } else {
      // 分だけをずらす
      if (difficulty === 'easy') {
        const dMin = minute === 30 ? 0 : 30;
        options.add(getClockLabel(hour, dMin, difficulty));
      } else {
        // 5分刻みでずらす
        const offsetChoices = [-15, -10, -5, 5, 10, 15, 30];
        const offset = offsetChoices[Math.floor(Math.random() * offsetChoices.length)];
        let dMin = minute + offset;
        let dHour = hour;
        if (dMin >= 60) {
          dMin -= 60;
          dHour = dHour === 12 ? 1 : dHour + 1;
        } else if (dMin < 0) {
          dMin += 60;
          dHour = dHour === 1 ? 12 : dHour - 1;
        }
        options.add(getClockLabel(dHour, dMin, difficulty));
      }
    }
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
};

// ----------------------------------------------------
// アナログ時計コンポーネーン (SVG描画)
// ----------------------------------------------------
const AnalogClock = ({ hour, minute }) => {
  // 針の角度計算
  // 短針: 1時間で 30度。1分で 0.5度。
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  // 長針: 1分で 6度。
  const minuteAngle = minute * 6;

  const hrRad = (hourAngle * Math.PI) / 180;
  const minRad = (minuteAngle * Math.PI) / 180;

  // 中心座標
  const cx = 120;
  const cy = 120;

  // 12箇所の目盛り & 数字の配置
  const numbers = [];
  for (let i = 1; i <= 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const x = cx + 76 * Math.sin(angle);
    const y = cy - 76 * Math.cos(angle);
    numbers.push({ val: i, x, y });
  }

  // 60箇所の目盛り線
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 * Math.PI) / 180;
    const isHourTick = i % 5 === 0;
    const rOut = 92;
    const rIn = isHourTick ? 82 : 88;
    const x1 = cx + rOut * Math.sin(angle);
    const y1 = cy - rOut * Math.cos(angle);
    const x2 = cx + rIn * Math.sin(angle);
    const y2 = cy - rIn * Math.cos(angle);
    ticks.push({ x1, y1, x2, y2, isHourTick });
  }

  return (
    <svg width="240" height="240" viewBox="0 0 240 240" style={{ filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.1))' }}>
      {/* 外枠 */}
      <circle cx={cx} cy={cy} r="100" fill="#f8f9fa" stroke="#2c3e50" strokeWidth="6" />
      <circle cx={cx} cy={cy} r="92" fill="#ffffff" />

      {/* 目盛り */}
      {ticks.map((t, idx) => (
        <line
          key={idx}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={t.isHourTick ? '#2c3e50' : '#bdc3c7'}
          strokeWidth={t.isHourTick ? 3 : 1.5}
          strokeLinecap="round"
        />
      ))}

      {/* 文字盤の数字 */}
      {numbers.map((n) => (
        <text
          key={n.val}
          x={n.x}
          y={n.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="18"
          fontWeight="800"
          fill="#2c3e50"
          style={{ fontFamily: "'Outfit', 'Kosugi Maru', sans-serif" }}
        >
          {n.val}
        </text>
      ))}

      {/* 短針 (赤・時針) */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + 50 * Math.sin(hrRad)}
        y2={cy - 50 * Math.cos(hrRad)}
        stroke="#FF6B6B"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 長針 (青・分針) */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + 78 * Math.sin(minRad)}
        y2={cy - 78 * Math.cos(minRad)}
        stroke="#4ECDC4"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* 中心部キャップ */}
      <circle cx={cx} cy={cy} r="8" fill="#2c3e50" />
      <circle cx={cx} cy={cy} r="3.5" fill="#ffffff" />
    </svg>
  );
};

// ----------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------
const MathPage = () => {
  const navigate = useNavigate();

  // 'select' (さんすうメニュー) | 'clock_menu' (時計難易度選択) | 'calculation' (計算ゲーム) | 'clock' (時計ゲーム)
  const [studyMenu, setStudyMenu] = useState('select');
  const [difficulty, setDifficulty] = useState('easy'); // clock用: 'easy' | 'hard'

  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 5;

  const [characterState, setCharacterState] = useState('normal');

  // --- 計算ゲーム用ステート ---
  const [question, setQuestion] = useState({ num1: 0, num2: 0, op: '+', answer: 0, options: [] });
  const [usedQuestions, setUsedQuestions] = useState([]);

  // --- 時計ゲーム用ステート ---
  const [clockQuestion, setClockQuestion] = useState({ hour: 12, minute: 0, answer: '', options: [] });
  const [usedClockQuestions, setUsedClockQuestions] = useState([]);

  // --- 各ゲーム開始処理 ---

  // 計算ゲーム開始
  const startCalculationGame = () => {
    setScore(0);
    setQuestionCount(0);
    setUsedQuestions([]);
    generateCalculationQuestion([]);
    setStudyMenu('calculation');
  };

  // 時計難易度選択画面へ
  const openClockMenu = () => {
    setStudyMenu('clock_menu');
  };

  // 時計ゲーム開始
  const startClockGame = (diff) => {
    setDifficulty(diff);
    setScore(0);
    setQuestionCount(0);
    setUsedClockQuestions([]);
    generateClockQuestion(diff, []);
    setStudyMenu('clock');
  };

  // --- 計算問題生成 ---
  const generateCalculationQuestion = (currentUsed = usedQuestions) => {
    let num1, num2, op, answer;
    let attempts = 0;

    while (attempts < 100) {
      const isAddition = Math.random() > 0.5;
      if (isAddition) {
        num1 = Math.floor(Math.random() * 10) + 1; // 1-10
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 + num2;
        op = '+';
      } else {
        num1 = Math.floor(Math.random() * 10) + 10; // 10-19
        num2 = Math.floor(Math.random() * 9) + 1; // 1-9
        answer = num1 - num2;
        op = '-';
      }

      const isDuplicate = currentUsed.some(
        q => q.num1 === num1 && q.num2 === num2 && q.op === op
      );

      if (!isDuplicate) {
        break;
      }
      attempts++;
    }

    let options = new Set([answer]);
    while (options.size < 3) {
      let dummy = answer + Math.floor(Math.random() * 5) - 2;
      if (dummy > 0 && dummy !== answer) {
        options.add(dummy);
      }
    }
    const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

    setQuestion({ num1, num2, op, answer, options: shuffledOptions });
    setCharacterState('normal');
  };

  // --- 時計問題生成 ---
  const generateClockQuestion = (diff = difficulty, currentUsed = usedClockQuestions) => {
    let hour, minute;
    let attempts = 0;

    while (attempts < 100) {
      hour = Math.floor(Math.random() * 12) + 1; // 1-12
      if (diff === 'easy') {
        minute = Math.random() > 0.5 ? 0 : 30;
      } else {
        const mins = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
        minute = mins[Math.floor(Math.random() * mins.length)];
      }

      const isDuplicate = currentUsed.some(
        q => q.hour === hour && q.minute === minute
      );
      if (!isDuplicate) {
        break;
      }
      attempts++;
    }

    const options = generateClockOptions(hour, minute, diff);
    const answer = getClockLabel(hour, minute, diff);

    setClockQuestion({ hour, minute, answer, options });
    setUsedClockQuestions(prev => [...prev, { hour, minute }]);
    setCharacterState('normal');
  };

  // --- 回答処理 ---

  // 計算の回答
  const handleCalculationAnswer = async (selected) => {
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
        generateCalculationQuestion();
      } else {
        playFinishSound();
        const finalScore = score + (selected === question.answer ? 10 : 0);
        await db.saveScore('math', { score: finalScore, date: new Date().toLocaleDateString() });
        alert(`よくできました！がんばりポイント ${finalScore} をゲットしたよ！`);
        setStudyMenu('select');
      }
    }, 1000);
  };

  // 時計の回答
  const handleClockAnswer = async (selected) => {
    if (selected === clockQuestion.answer) {
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
        generateClockQuestion(difficulty);
      } else {
        playFinishSound();
        const finalScore = score + (selected === clockQuestion.answer ? 10 : 0);
        await db.saveScore('math', { score: finalScore, date: new Date().toLocaleDateString() });
        alert(`よくできました！がんばりポイント ${finalScore} をゲットしたよ！`);
        setStudyMenu('select');
      }
    }, 1000);
  };

  // --- 描画処理 ---

  return (
    <div className="glass-panel">
      {/* 1. メニュー画面 */}
      {studyMenu === 'select' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
            <button className="btn" onClick={() => navigate('/')}>ホームにもどる</button>
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '30px', color: '#2c3e50', fontWeight: 'bold' }}>
            さんすう の おべんきょう
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '320px', margin: '0 auto' }}>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '1.4rem', padding: '18px', borderRadius: '20px', background: 'linear-gradient(135deg, #4ecdc4, #556270)', color: '#fff' }}
              onClick={startCalculationGame}
            >
              けいさん (＋, －)
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '1.4rem', padding: '18px', borderRadius: '20px', background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)', color: '#fff' }}
              onClick={openClockMenu}
            >
              とけい の よみかた
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <CharacterSVG type="normal" width={120} height={120} />
          </div>
        </div>
      )}

      {/* 2. 時計難易度選択画面 */}
      {studyMenu === 'clock_menu' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
            <button className="btn" onClick={() => setStudyMenu('select')}>もどる</button>
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '30px', color: '#2c3e50', fontWeight: 'bold' }}>
            むずかしさ を えらんでね
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '320px', margin: '0 auto' }}>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '1.4rem', padding: '18px', borderRadius: '20px', background: 'linear-gradient(135deg, #a8e6cf, #1d976c)', color: '#fff' }}
              onClick={() => startClockGame('easy')}
            >
              かんたん (○じ, ○じはん)
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '1.4rem', padding: '18px', borderRadius: '20px', background: 'linear-gradient(135deg, #ffd3b6, #ff8e53)', color: '#fff' }}
              onClick={() => startClockGame('hard')}
            >
              むずかしい (5ふんきざみ)
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <CharacterSVG type="happy" width={120} height={120} />
          </div>
        </div>
      )}

      {/* 3. 計算ゲーム画面 */}
      {studyMenu === 'calculation' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn" onClick={() => setStudyMenu('select')}>もどる</button>
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
                onClick={() => handleCalculationAnswer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>
            {questionCount + 1} / {maxQuestions} もんめ
          </div>
        </div>
      )}

      {/* 4. 時計ゲーム画面 */}
      {studyMenu === 'clock' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn" onClick={() => setStudyMenu('clock_menu')}>もどる</button>
            <h2>さんすう（とけい）</h2>
            <div style={{ fontWeight: 'bold', color: '#FF6B6B' }}>ポイント: {score}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', margin: '20px 0', flexWrap: 'wrap' }}>
            <AnalogClock hour={clockQuestion.hour} minute={clockQuestion.minute} />
            <CharacterSVG type={characterState} width={100} height={100} />
          </div>

          <div style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '25px', fontWeight: 'bold', color: '#2c3e50' }}>
            この とけい は なんじ を さしているかな？
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {clockQuestion.options.map((opt, i) => (
              <button 
                key={i} 
                className="btn btn-secondary" 
                style={{ 
                  fontSize: '1.4rem', 
                  minWidth: '130px', 
                  padding: '12px 24px', 
                  borderRadius: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}
                onClick={() => handleClockAnswer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>
            {questionCount + 1} / {maxQuestions} もんめ
          </div>
        </div>
      )}
    </div>
  );
};

export default MathPage;
