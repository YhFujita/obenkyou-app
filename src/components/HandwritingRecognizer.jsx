import { useRef, useState, useEffect } from 'react';
import strokeDataJson from '../data/strokeData.json';
import { db } from '../db';

const HandwritingRecognizer = ({ expectedAnswer, onResult, backgroundText = '', showBackgroundText = false }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const inkRef = useRef([]); // [ [ [x], [y], [t] ], ... ]
  const currentStrokeRef = useRef([[], [], []]); // [ [x], [y], [t] ]
  const [hasInk, setHasInk] = useState(false);
  const [loading, setLoading] = useState(false);
  const ctxRef = useRef(null);

  // 背景に表示するSVGパスの配列
  const [backgroundPaths, setBackgroundPaths] = useState([]);

  // 初回マウント時の初期設定
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1E3E62'; // 濃紺の鉛筆カラー
    ctxRef.current = ctx;

    drawBackground(ctx, rect.width, rect.height);
  }, []);

  // 背景お手本用のSVGパスを非同期でロードする
  useEffect(() => {
    let active = true;
    const loadBackgroundPaths = async () => {
      if (!showBackgroundText || !backgroundText) {
        setBackgroundPaths([]);
        return;
      }

      // 1. ローカルJSONを確認
      if (strokeDataJson[backgroundText]) {
        if (active) setBackgroundPaths(strokeDataJson[backgroundText].paths || []);
        return;
      }

      // 2. IndexedDBキャッシュを確認
      try {
        const cached = await db.getCachedStroke(backgroundText);
        if (cached && active) {
          setBackgroundPaths(cached.paths || []);
          return;
        }
      } catch (err) {
        console.warn('Failed to read background stroke cache:', err);
      }

      // 3. オンラインからフェッチ
      try {
        const codePoint = backgroundText.codePointAt(0).toString(16).padStart(5, '0');
        const url = `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/${codePoint}.svg`;
        const res = await fetch(url);
        if (res.ok) {
          const svgText = await res.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgText, 'image/svg+xml');
          const paths = Array.from(doc.querySelectorAll('path')).map(p => p.getAttribute('d') || '');
          if (active && paths.length > 0) {
            setBackgroundPaths(paths);
            // キャッシュに保存
            await db.saveCachedStroke(backgroundText, { paths, numbers: [] });
          }
        }
      } catch (err) {
        console.error('Failed to fetch background stroke:', err);
      }
    };

    loadBackgroundPaths();
    return () => { active = false; };
  }, [backgroundText, showBackgroundText]);

  // 前の文字を追跡して、文字が切り替わったことを検知する
  const lastTextRef = useRef(backgroundText);

  // 背景の文字や表示設定、パスデータが変わった時に背景を更新し、描画済みのインクも再描画する
  useEffect(() => {
    if (ctxRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      
      // 対象の文字（backgroundText）が変わった場合は、インクデータをクリアする（次の文字へ進んだ時の自動クリア）
      if (lastTextRef.current !== backgroundText) {
        inkRef.current = [];
        currentStrokeRef.current = [[], [], []];
        setHasInk(false);
        lastTextRef.current = backgroundText;
      }

      drawBackground(ctxRef.current, rect.width, rect.height);
      reDrawInk();
    }
  }, [backgroundText, showBackgroundText, backgroundPaths]);

  // インクデータの再描画
  const reDrawInk = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    ctx.save();
    ctx.strokeStyle = '#1E3E62';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    inkRef.current.forEach(stroke => {
      const xs = stroke[0];
      const ys = stroke[1];
      if (xs.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length; i++) {
        ctx.lineTo(xs[i], ys[i]);
      }
      ctx.stroke();
    });
    ctx.restore();
  };

  function drawBackground(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    // 薄いグレーの点線枠（書き込みガイド）
    ctx.beginPath();
    ctx.rect(10, 10, width - 20, height - 20);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 中央の十字線
    ctx.beginPath();
    ctx.moveTo(width / 2, 10);
    ctx.lineTo(width / 2, height - 10);
    ctx.moveTo(10, height / 2);
    ctx.lineTo(width - 10, height / 2);
    ctx.strokeStyle = '#f1f5f9';
    ctx.stroke();

    // 背景にお手本文字をうっすら描画 (なぞり書きと全く同じSVGパスを使用)
    if (showBackgroundText && backgroundText) {
      ctx.save();
      
      if (backgroundPaths && backgroundPaths.length > 0) {
        // なぞり書き(KanjiVG)のSVGパスと同じ形状でキャンバスに描画
        const svgSize = 109; // KanjiVGの基準サイズ
        const scale = (width * 0.76) / svgSize;
        const offset = (width - svgSize * scale) / 2;
        
        ctx.translate(offset, offset);
        ctx.scale(scale, scale);
        
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)'; // なぞり書きと重ねやすい薄いグレー
        ctx.lineWidth = 6; // 太めのなぞりガイド線
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        backgroundPaths.forEach(pathStr => {
          const path = new Path2D(pathStr);
          ctx.stroke(path);
        });
      } else {
        // パスデータ取得中またはオフライン時のフォールバック（フォント描画）
        ctx.font = `bold ${width * 0.65}px 'Kosugi Maru', sans-serif`;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(backgroundText, width / 2, height / 2);
      }
      ctx.restore();
    }

    ctx.strokeStyle = '#1E3E62';
    ctx.lineWidth = 10;
  }

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    if (loading) return;
    const { x, y } = getCoords(e);
    const t = Date.now();

    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);

    currentStrokeRef.current = [[x], [y], [t]];
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || loading) return;
    const { x, y } = getCoords(e);
    const t = Date.now();

    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();

    // 直接 ref 内の配列にプッシュすることで React の非同期ステート遅延を回避し、
    // マウス・タッチ移動時の全座標をこぼさず完全に記録します。
    currentStrokeRef.current[0].push(Math.round(x));
    currentStrokeRef.current[1].push(Math.round(y));
    currentStrokeRef.current[2].push(t);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      inkRef.current.push(currentStrokeRef.current);
      setHasInk(true);
    }
  };

  // 文字の判定処理を呼び出す
  const handleCheck = async () => {
    const inkData = inkRef.current;
    if (inkData.length === 0) {
      alert('四角の中に 文字を 書いてね！');
      return;
    }

    setLoading(true);
    try {
      // タイムスタンプ t を最初の点を基準(0ms)とする相対時間（経過ミリ秒）に変換します。
      let firstTime = null;
      const relativeInk = inkData.map(stroke => {
        const xs = stroke[0];
        const ys = stroke[1];
        const ts = stroke[2];
        if (firstTime === null && ts.length > 0) {
          firstTime = ts[0];
        }
        const newTs = ts.map(t => (firstTime !== null ? t - firstTime : 0));
        return [xs, ys, newTs];
      });

      console.log('Sending handwriting ink data:', relativeInk);

      const response = await fetch('https://inputtools.google.com/request?itc=ja-t-i0-handwrit&num=5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_version: 0.4,
          api_level: '53.0.0',
          device: 'pc',
          input_type: '0',
          options: 'enable_pre_space',
          requests: [
            {
              writing_guide: {
                writing_area_width: 300,
                writing_area_height: 300
              },
              ink: relativeInk,
              language: 'ja'
            }
          ]
        })
      });

      const data = await response.json();
      if (data[0] === 'SUCCESS') {
        // APIのレスポンスは [ "SUCCESS", [ [ "文字列", [ "は", "ほ", "け", ... ], ... ] ] ] という配列形式です。
        // data[1][0][1] に認識された候補の配列が入っています。
        const candidates = data[1][0][1] || [];
        console.log('Handwriting recognized candidates:', candidates);
        
        // 候補の先頭3つの中に正解の文字（ひらがな）が含まれているかチェック
        const cleanCandidates = candidates.map(c => c.trim());
        const isCorrect = cleanCandidates.slice(0, 3).includes(expectedAnswer);
        
        onResult(isCorrect, cleanCandidates[0] || '？');
      } else {
        throw new Error('Recognition failed');
      }
    } catch (err) {
      console.error(err);
      alert('文字の読み取りに失敗しました。インターネットに繋がっているか確認してね！');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    drawBackground(ctxRef.current, rect.width, rect.height);
    inkRef.current = [];
    currentStrokeRef.current = [[], [], []];
    setHasInk(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: '100%' }}>
      <div 
        style={{
          width: '280px',
          height: '280px',
          background: 'white',
          borderRadius: '24px',
          boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
        {loading && (
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              background: 'rgba(255,255,255,0.7)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#334155'
            }}
          >
            かんがえ中... 🤔
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          className="btn"
          onClick={handleClear}
          disabled={loading}
          style={{ background: '#f5f7fa', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 20px', fontSize: '0.95rem' }}
        >
          やりなおし
        </button>
        <button
          className="btn btn-primary"
          onClick={handleCheck}
          disabled={loading || !hasInk}
          style={{
            background: 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(78,205,196,0.3)',
            padding: '10px 25px',
            fontSize: '0.95rem'
          }}
        >
          できた！
        </button>
      </div>
    </div>
  );
};

export default HandwritingRecognizer;
