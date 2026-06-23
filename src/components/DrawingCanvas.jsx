import { useRef, useState, useEffect } from 'react';

const DrawingCanvas = ({ targetText, onFinish }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showFlower, setShowFlower] = useState(false);
  const ctxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // スマホ等の高解像度ディスプレイ対応
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#333';
    ctxRef.current = ctx;

    drawBackground(ctx, rect.width, rect.height);
  }, [targetText]);

  function drawBackground(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    // 十字線の描画
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); // リセット

    // お手本の文字を描画
    if (targetText) {
      ctx.font = `bold ${width * 0.7}px 'Kosugi Maru', sans-serif`;
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(targetText, width / 2, height / 2);
    }
    // 描画設定を元に戻す
    ctx.strokeStyle = '#FF6B6B'; // なぞる線の色
    ctx.lineWidth = 12;
  }

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault(); // スクロール防止
    if (showFlower) return; // 完了時は描けない
    const { x, y } = getCoordinates(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || showFlower) return;
    const { x, y } = getCoordinates(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    if (isDrawing) {
      ctxRef.current.closePath();
      setIsDrawing(false);
    }
  };

  const handleFinish = () => {
    setShowFlower(true);
    setTimeout(() => {
      setShowFlower(false);
      onFinish();
    }, 2000);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    drawBackground(ctxRef.current, rect.width, rect.height);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      <div className="drawing-canvas-container">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
        <div className={`flower-circle ${showFlower ? 'show' : ''}`}></div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn" onClick={handleClear} style={{ background: '#f0f0f0', color: '#666' }}>
          やりなおし
        </button>
        <button className="btn btn-primary" onClick={handleFinish} disabled={showFlower}>
          かけた！
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
