import React, { useState, useEffect, useRef } from 'react';
import strokeDataJson from '../data/strokeData.json';

const StrokeOrderCanvas = ({ targetText, onFinish }) => {
  const [strokes, setStrokes] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useFallbackText, setUseFallbackText] = useState(false);

  // 各ストロークの長さ
  const [strokeLengths, setStrokeLengths] = useState([]);

  // おなぞり（練習モード）の状態
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [completedStrokes, setCompletedStrokes] = useState([]);
  const [strokeProgress, setStrokeProgress] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  // 自動アニメーション（お手本再生）の状態
  const [isAnimating, setIsAnimating] = useState(false);
  const [animStrokeIndex, setAnimStrokeIndex] = useState(-1);
  const [animProgress, setAnimProgress] = useState(0);

  // フリーハンド用のフォールバックキャンバス用 (オフライン時のフェッチ失敗対応)
  const canvasRef = useRef(null);
  const [isFreeDrawing, setIsFreeDrawing] = useState(false);
  const ctxRef = useRef(null);

  const svgRef = useRef(null);
  const guidePathRef = useRef(null);
  const animIntervalRef = useRef(null);

  // 競合状態を防ぐための同期描画フラグ
  const isDrawingRef = useRef(false);

  // 1画完了の軽い効果音
  const playTickSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.error(e);
    }
  };

  // 文字データ（KanjiVG）のロード
  useEffect(() => {
    let active = true;
    const loadCharData = async () => {
      if (!targetText) return;
      setLoading(true);
      setUseFallbackText(false);
      setStrokes([]);
      setNumbers([]);
      setStrokeLengths([]);
      setCurrentStrokeIndex(0);
      setCompletedStrokes([]);
      setStrokeProgress(0);
      setStartPoint(null);
      setIsDrawing(false);
      isDrawingRef.current = false;
      setIsAnimating(false);

      // 1. ローカルキャッシュ (strokeData.json) を確認
      if (strokeDataJson[targetText]) {
        if (active) {
          setStrokes(strokeDataJson[targetText].paths);
          setNumbers(strokeDataJson[targetText].numbers);
          setLoading(false);
        }
        return;
      }

      // 2. なければオンラインからフェッチを試みる
      try {
        const codePoint = targetText.codePointAt(0).toString(16).padStart(5, '0');
        const url = `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/${codePoint}.svg`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Not found in KanjiVG');
        const svgText = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths = Array.from(doc.querySelectorAll('path')).map(p => p.getAttribute('d') || '');
        const textElements = Array.from(doc.querySelectorAll('text'));
        const numbersData = textElements.map((txt) => {
          const transform = txt.getAttribute('transform');
          let x = 0, y = 0;
          if (transform) {
            const match = /matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)/.exec(transform);
            if (match) {
              x = parseFloat(match[1]);
              y = parseFloat(match[2]);
            }
          }
          return {
            x,
            y,
            number: parseInt(txt.textContent || '', 10) || 1
          };
        });

        if (active) {
          if (paths.length > 0) {
            setStrokes(paths);
            setNumbers(numbersData);
          } else {
            throw new Error('No paths found');
          }
          setLoading(false);
        }
      } catch (e) {
        console.warn(`KanjiVG fetch failed for "${targetText}":`, e);
        if (active) {
          // フォールバックモード（従来のフリーハンドお絵かき）へ移行
          setUseFallbackText(true);
          setLoading(false);
        }
      }
    };

    loadCharData();

    return () => {
      active = false;
      if (animIntervalRef.current) {
        clearInterval(animIntervalRef.current);
      }
    };
  }, [targetText]);

  // パスの長さを一括測定するエフェクト
  useEffect(() => {
    if (strokes.length > 0 && svgRef.current) {
      const tempLengths = strokes.map((d) => {
        try {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          svgRef.current.appendChild(path);
          const len = path.getTotalLength();
          svgRef.current.removeChild(path);
          return len;
        } catch (e) {
          return 150; // デフォルト値
        }
      });
      setStrokeLengths(tempLengths);
    } else {
      setStrokeLengths([]);
    }
  }, [strokes]);

  // 新しい画（ガイド）が表示された時に、その始点を計算する
  useEffect(() => {
    if (guidePathRef.current) {
      try {
        const startPt = guidePathRef.current.getPointAtLength(0);
        setStartPoint(startPt);
      } catch (e) {
        // パスが読み込み中のときはエラーになる場合がある
      }
    } else {
      setStartPoint(null);
    }
  }, [currentStrokeIndex, strokes, loading, useFallbackText]);

  // アニメーション再生（お手本再生）のトリガー
  const startStrokeAnimation = () => {
    if (strokes.length === 0 || isAnimating || strokeLengths.length === 0) return;
    setIsAnimating(true);
    setAnimStrokeIndex(0);
    setAnimProgress(0);

    if (animIntervalRef.current) clearInterval(animIntervalRef.current);

    let currentIdx = 0;
    let progress = 0;

    animIntervalRef.current = setInterval(() => {
      progress += 0.04; // ややゆっくり描画
      if (progress >= 1.0) {
        progress = 1.0;
        setAnimProgress(1.0);
        clearInterval(animIntervalRef.current);
        
        setTimeout(() => {
          if (currentIdx < strokes.length - 1) {
            currentIdx += 1;
            setAnimStrokeIndex(currentIdx);
            progress = 0;
            setAnimProgress(0);
            startAnimLoop(currentIdx);
          } else {
            // アニメーション終了
            setIsAnimating(false);
            setAnimStrokeIndex(-1);
            setAnimProgress(0);
          }
        }, 400); // 画の間のタメ
      } else {
        setAnimProgress(progress);
      }
    }, 25);
  };

  const startAnimLoop = (idx) => {
    let progress = 0;
    animIntervalRef.current = setInterval(() => {
      progress += 0.04;
      if (progress >= 1.0) {
        progress = 1.0;
        setAnimProgress(1.0);
        clearInterval(animIntervalRef.current);
        
        setTimeout(() => {
          if (idx < strokes.length - 1) {
            const nextIdx = idx + 1;
            setAnimStrokeIndex(nextIdx);
            setAnimProgress(0);
            startAnimLoop(nextIdx);
          } else {
            setIsAnimating(false);
            setAnimStrokeIndex(-1);
            setAnimProgress(0);
          }
        }, 400);
      } else {
        setAnimProgress(progress);
      }
    }, 25);
  };

  // SVG座標へのマッピング (ビューボックスは 109x109)
  const getSVGCoords = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * 109;
    const y = ((clientY - rect.top) / rect.height) * 109;
    return { x, y };
  };

  // なぞり開始判定
  const startDrawing = (e) => {
    if (isAnimating || loading || useFallbackText || isDrawingRef.current) return;
    e.preventDefault();

    if (!guidePathRef.current) return;
    const { x, y } = getSVGCoords(e);

    try {
      const pathEl = guidePathRef.current;
      
      // 始点 getPointAtLength(0) との距離
      const startPt = pathEl.getPointAtLength(0);
      const dist = Math.hypot(startPt.x - x, startPt.y - y);

      // 始点の近く（18単位以内）をタッチしたらおなぞり開始
      if (dist < 18) {
        isDrawingRef.current = true;
        setIsDrawing(true);
        setStrokeProgress(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // なぞり中の位置追従
  const draw = (e) => {
    if (!isDrawingRef.current || isAnimating || loading || useFallbackText) return;
    e.preventDefault();

    if (!guidePathRef.current) return;
    const { x, y } = getSVGCoords(e);

    try {
      const pathEl = guidePathRef.current;
      const totalLen = pathEl.getTotalLength();

      // パス上で最もタッチ位置に近い点を検索 (50ステップで走査)
      let minDistance = Infinity;
      let bestLen = 0;
      const steps = 50;

      for (let i = 0; i <= steps; i++) {
        const l = (totalLen * i) / steps;
        const pt = pathEl.getPointAtLength(l);
        const dist = Math.hypot(pt.x - x, pt.y - y);
        if (dist < minDistance) {
          minDistance = dist;
          bestLen = l;
        }
      }

      // 指がガイドパスから離れすぎている場合 (20単位以上) はなぞり中断
      if (minDistance > 20) {
        isDrawingRef.current = false;
        setIsDrawing(false);
        setStrokeProgress(0);
        return;
      }

      const progress = bestLen / totalLen;
      const prevProgress = strokeProgress;

      // 急激なワープを防止 (前回の位置から最大 0.35 までの前進、少しの逆戻りも許容)
      if (progress >= prevProgress - 0.1 && progress <= prevProgress + 0.35) {
        setStrokeProgress(progress);
        
        // 90% 以上なぞれたら完了とする
        if (progress >= 0.9) {
          isDrawingRef.current = false; // 即座に Ref を同期的にリセット
          setIsDrawing(false);
          setStrokeProgress(0);
          playTickSound();
          
          const newCompleted = [...completedStrokes, currentStrokeIndex];
          setCompletedStrokes(newCompleted);

          if (currentStrokeIndex < strokes.length - 1) {
            setCurrentStrokeIndex(curr => curr + 1);
          } else {
            // 全ての画が完了！自動で「できた！」にする
            setTimeout(() => {
              onFinish();
            }, 500);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // タッチ離脱
  const stopDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      setIsDrawing(false);
      setStrokeProgress(0);
    }
  };

  // やりなおし
  const handleClear = () => {
    if (useFallbackText) {
      const canvas = canvasRef.current;
      if (canvas && ctxRef.current) {
        const rect = canvas.getBoundingClientRect();
        ctxRef.current.clearRect(0, 0, rect.width, rect.height);
        drawFallbackBackground(ctxRef.current, rect.width, rect.height);
      }
    } else {
      setCurrentStrokeIndex(0);
      setCompletedStrokes([]);
      setStrokeProgress(0);
      setIsDrawing(false);
      isDrawingRef.current = false;
      setIsAnimating(false);
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    }
  };

  // --- フリーハンド・フォールバック関連の処理 ---
  useEffect(() => {
    if (useFallbackText && canvasRef.current) {
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#FF6B6B';
      ctxRef.current = ctx;

      drawFallbackBackground(ctx, rect.width, rect.height);
    }
  }, [useFallbackText, targetText]);

  const drawFallbackBackground = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = `bold ${width * 0.7}px 'Kosugi Maru', sans-serif`;
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(targetText, width / 2, height / 2);

    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 12;
  };

  const getFallbackCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startFreeDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getFallbackCoords(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsFreeDrawing(true);
  };

  const freeDraw = (e) => {
    e.preventDefault();
    if (!isFreeDrawing) return;
    const { x, y } = getFallbackCoords(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopFreeDrawing = () => {
    if (isFreeDrawing) {
      ctxRef.current.closePath();
      setIsFreeDrawing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      <div 
        style={{
          width: '320px',
          height: '320px',
          background: 'white',
          borderRadius: '24px',
          boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          touchAction: 'none'
        }}
      >
        {loading && (
          <div style={{ color: '#666', fontWeight: 'bold' }}>ダウンロード中...</div>
        )}

        {!loading && useFallbackText && (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
            onMouseDown={startFreeDrawing}
            onMouseMove={freeDraw}
            onMouseUp={stopFreeDrawing}
            onMouseOut={stopFreeDrawing}
            onTouchStart={startFreeDrawing}
            onTouchMove={freeDraw}
            onTouchEnd={stopFreeDrawing}
            onTouchCancel={stopFreeDrawing}
          />
        )}

        {!loading && !useFallbackText && (
          <svg
            ref={svgRef}
            viewBox="0 0 109 109"
            style={{
              width: '90%',
              height: '90%',
              overflow: 'visible',
              userSelect: 'none'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          >
            {/* ガイド十字線 */}
            <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#E6EEF8" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#E6EEF8" strokeWidth="1" strokeDasharray="3 3" />

            {/* お手本（薄いグレーの背景文字） */}
            {strokes.map((d, index) => (
              <path
                key={`bg-${index}`}
                d={d}
                fill="none"
                stroke="#F0F3F7"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* すでに書き終わったストローク */}
            {completedStrokes.map((idx) => (
              <path
                key={`completed-${idx}`}
                d={strokes[idx]}
                fill="none"
                stroke="#1E3E62"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* 自動アニメーション中のストローク */}
            {isAnimating && animStrokeIndex !== -1 && strokeLengths[animStrokeIndex] && (
              <path
                d={strokes[animStrokeIndex]}
                fill="none"
                stroke="#FF6B6B"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: strokeLengths[animStrokeIndex],
                  strokeDashoffset: strokeLengths[animStrokeIndex] * (1 - animProgress),
                  transition: 'none'
                }}
              />
            )}

            {/* すでにアニメーションし終えたストローク */}
            {isAnimating && strokes.map((d, index) => {
              if (index < animStrokeIndex) {
                return (
                  <path
                    key={`anim-done-${index}`}
                    d={d}
                    fill="none"
                    stroke="#FF6B6B"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              return null;
            })}

            {/* 現在おなぞり中のストローク (ガイドとユーザー入力の反映) */}
            {!isAnimating && currentStrokeIndex < strokes.length && strokeLengths[currentStrokeIndex] && (
              <>
                {/* 1. ガイド (薄い水色の光るような枠線) */}
                <path
                  ref={guidePathRef}
                  id="current-guide-path"
                  d={strokes[currentStrokeIndex]}
                  fill="none"
                  stroke="#CBE4DE"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    opacity: 0.75
                  }}
                />

                {/* 2. ユーザーがなぞった分だけ描画される線 */}
                {strokeProgress > 0 && (
                  <path
                    d={strokes[currentStrokeIndex]}
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      strokeDasharray: strokeLengths[currentStrokeIndex],
                      strokeDashoffset: strokeLengths[currentStrokeIndex] * (1 - strokeProgress)
                    }}
                  />
                )}
              </>
            )}

            {/* 次に書くべきストロークの「開始地点」ガイド（アニメーションする赤丸） */}
            {!isAnimating && !loading && startPoint && (
              <circle
                cx={startPoint.x}
                cy={startPoint.y}
                r="3.5"
                fill="#FF4B4B"
                className="guide-pulse-dot"
                style={{
                  filter: 'drop-shadow(0 0 2px rgba(255, 75, 75, 0.6))',
                  animation: 'pulse 1s infinite alternate'
                }}
              />
            )}

            {/* 書き順の数字 (数字ガイド) */}
            {!loading && numbers.map((item, index) => {
              const isNext = index === currentStrokeIndex && !isAnimating;
              return (
                <g key={`num-${index}`}>
                  <circle
                    cx={item.x - 1}
                    cy={item.y - 2.5}
                    r={isNext ? "3.5" : "2.5"}
                    fill={isNext ? "#FFD166" : "#E2E8F0"}
                    stroke={isNext ? "#FF8F00" : "#CBD5E1"}
                    strokeWidth="0.5"
                  />
                  <text
                    x={item.x - 1}
                    y={item.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontFamily: "'Fredoka One', 'Kosugi Maru', sans-serif",
                      fontSize: isNext ? "6.5px" : "4.8px",
                      fontWeight: 'bold',
                      fill: isNext ? "#B25E00" : "#64748B",
                      pointerEvents: 'none'
                    }}
                  >
                    {item.number}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          className="btn"
          onClick={handleClear}
          style={{ background: '#f5f7fa', color: '#475569', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          やりなおし
        </button>

        {!useFallbackText && (
          <button
            className="btn btn-primary"
            onClick={startStrokeAnimation}
            disabled={isAnimating || loading}
            style={{
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
            かきじゅんをみる
          </button>
        )}

        {useFallbackText && (
          <button
            className="btn btn-primary"
            onClick={onFinish}
            style={{
              background: 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)',
              border: 'none'
            }}
          >
            かけた！
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.3); opacity: 1; }
        }
        .guide-pulse-dot {
          transform-origin: center;
        }
      `}</style>
    </div>
  );
};

export default StrokeOrderCanvas;
