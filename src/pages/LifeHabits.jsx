import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { db } from '../db';

// 30種類のSVGシール定義
const SEAL_TYPES = [
  { id: 'star_y', name: 'きんのほし', render: () => <polygon points="25,3 31,17 46,18 35,28 38,43 25,35 12,43 15,28 4,18 19,17" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" /> },
  { id: 'star_p', name: 'ぴんくのほし', render: () => <polygon points="25,3 31,17 46,18 35,28 38,43 25,35 12,43 15,28 4,18 19,17" fill="#FF8DA1" stroke="#E05B70" strokeWidth="1.5" /> },
  { id: 'star_b', name: 'あおのほし', render: () => <polygon points="25,3 31,17 46,18 35,28 38,43 25,35 12,43 15,28 4,18 19,17" fill="#74C0FC" stroke="#3b5bdb" strokeWidth="1.5" /> },
  { id: 'heart_r', name: 'あかいはーと', render: () => <path d="M25,12 C25,12 20,4 12,4 C6,4 2,9 2,16 C2,26 15,36 25,45 C35,36 48,26 48,16 C48,9 44,4 38,4 C30,4 25,12 25,12 Z" fill="#FF6B6B" stroke="#C92A2A" strokeWidth="1.5" /> },
  { id: 'heart_p', name: 'ぴんくのはーと', render: () => <path d="M25,12 C25,12 20,4 12,4 C6,4 2,9 2,16 C2,26 15,36 25,45 C35,36 48,26 48,16 C48,9 44,4 38,4 C30,4 25,12 25,12 Z" fill="#FAA2C1" stroke="#E03131" strokeWidth="1.5" /> },
  { id: 'heart_o', name: 'おれんじのはーと', render: () => <path d="M25,12 C25,12 20,4 12,4 C6,4 2,9 2,16 C2,26 15,36 25,45 C35,36 48,26 48,16 C48,9 44,4 38,4 C30,4 25,12 25,12 Z" fill="#FF922B" stroke="#D9480F" strokeWidth="1.5" /> },
  { id: 'clover', name: 'くろーばー', render: () => (
    <g>
      <circle cx="25" cy="18" r="7" fill="#69DB7C" stroke="#2B8A3E" strokeWidth="1.5" />
      <circle cx="18" cy="25" r="7" fill="#69DB7C" stroke="#2B8A3E" strokeWidth="1.5" />
      <circle cx="32" cy="25" r="7" fill="#69DB7C" stroke="#2B8A3E" strokeWidth="1.5" />
      <circle cx="25" cy="32" r="7" fill="#69DB7C" stroke="#2B8A3E" strokeWidth="1.5" />
      <path d="M25,25 Q28,38 25,46" fill="none" stroke="#2B8A3E" strokeWidth="3" strokeLinecap="round" />
    </g>
  )},
  { id: 'flower_r', name: 'あかいおはな', render: () => (
    <g>
      <circle cx="25" cy="15" r="6" fill="#FF8787" stroke="#C92A2A" strokeWidth="1.5" />
      <circle cx="15" cy="25" r="6" fill="#FF8787" stroke="#C92A2A" strokeWidth="1.5" />
      <circle cx="35" cy="25" r="6" fill="#FF8787" stroke="#C92A2A" strokeWidth="1.5" />
      <circle cx="25" cy="35" r="6" fill="#FF8787" stroke="#C92A2A" strokeWidth="1.5" />
      <circle cx="25" cy="25" r="7" fill="#FFE66D" stroke="#C92A2A" strokeWidth="1.5" />
    </g>
  )},
  { id: 'flower_y', name: 'きいろいおはな', render: () => (
    <g>
      <circle cx="25" cy="15" r="6" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" />
      <circle cx="15" cy="25" r="6" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" />
      <circle cx="35" cy="25" r="6" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" />
      <circle cx="25" cy="35" r="6" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" />
      <circle cx="25" cy="25" r="7" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="1.5" />
    </g>
  )},
  { id: 'flower_b', name: 'あおいおはな', render: () => (
    <g>
      <circle cx="25" cy="15" r="6" fill="#A5D8FF" stroke="#1971C2" strokeWidth="1.5" />
      <circle cx="15" cy="25" r="6" fill="#A5D8FF" stroke="#1971C2" strokeWidth="1.5" />
      <circle cx="35" cy="25" r="6" fill="#A5D8FF" stroke="#1971C2" strokeWidth="1.5" />
      <circle cx="25" cy="35" r="6" fill="#A5D8FF" stroke="#1971C2" strokeWidth="1.5" />
      <circle cx="25" cy="25" r="7" fill="#FFE66D" stroke="#1971C2" strokeWidth="1.5" />
    </g>
  )},
  { id: 'sun', name: 'たいよう', render: () => (
    <g>
      <circle cx="25" cy="25" r="11" fill="#FF922B" stroke="#D9480F" strokeWidth="1.5" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 25 + Math.cos(angle) * 14;
        const y1 = 25 + Math.sin(angle) * 14;
        const x2 = 25 + Math.cos(angle) * 20;
        const y2 = 25 + Math.sin(angle) * 20;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D9480F" strokeWidth="2.5" strokeLinecap="round" />;
      })}
    </g>
  )},
  { id: 'moon', name: 'みかづき', render: () => <path d="M15,8 A 18 18 0 1 0 43,36 A 14 14 0 1 1 15,8 Z" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" /> },
  { id: 'ribbon', name: 'りぼん', render: () => (
    <g>
      <path d="M10,25 C10,18 20,18 25,25 C30,18 40,18 40,25 C40,32 30,32 25,25 C20,32 10,32 10,25 Z" fill="#FF8DA1" stroke="#E05B70" strokeWidth="1.5" />
      <path d="M25,25 L18,42" stroke="#E05B70" strokeWidth="4" strokeLinecap="round" />
      <path d="M25,25 L32,42" stroke="#E05B70" strokeWidth="4" strokeLinecap="round" />
      <circle cx="25" cy="25" r="5" fill="#FFFFFF" stroke="#E05B70" strokeWidth="1.5" />
    </g>
  )},
  { id: 'crown', name: 'おうかん', render: () => <polygon points="8,40 5,20 16,28 25,12 34,28 45,20 42,40" fill="#FCC419" stroke="#D5A200" strokeWidth="1.5" strokeLinejoin="round" /> },
  { id: 'trophy', name: 'とろふぃー', render: () => (
    <g>
      <path d="M12,12 L38,12 L35,26 C35,32 29,35 25,35 C21,35 15,32 15,26 Z" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" />
      <rect x="22" y="35" width="6" height="8" fill="#FFE66D" stroke="#D4AF37" strokeWidth="1.5" />
      <rect x="16" y="42" width="18" height="4" rx="2" fill="#D4AF37" />
      <path d="M12,16 H8 V22 H12 Z M38,16 H42 V22 H38 Z" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )},
  { id: 'balloon', name: 'ふうせん', render: () => (
    <g>
      <path d="M25,6 C15,6 15,24 25,28 C35,24 35,6 25,6 Z" fill="#FF6B6B" stroke="#C92A2A" strokeWidth="1.5" />
      <polygon points="25,28 22,32 28,32" fill="#C92A2A" />
      <path d="M25,32 Q20,38 27,45" fill="none" stroke="#666" strokeWidth="1.5" />
    </g>
  )},
  { id: 'rocket', name: 'ろけっと', render: () => (
    <g>
      <path d="M25,5 Q15,18 15,35 H35 Q35,18 25,5 Z" fill="#E9ECEF" stroke="#495057" strokeWidth="1.5" />
      <path d="M20,35 L12,43 V35 Z" fill="#FF8787" stroke="#C92A2A" strokeWidth="1.5" />
      <path d="M30,35 L38,43 V35 Z" fill="#FF8787" stroke="#C92A2A" strokeWidth="1.5" />
      <circle cx="25" cy="20" r="5" fill="#74C0FC" stroke="#1971C2" strokeWidth="1.5" />
      <path d="M25,35 V44" stroke="#FF922B" strokeWidth="3" strokeLinecap="round" />
    </g>
  )},
  { id: 'car', name: 'くるま', render: () => (
    <g>
      <path d="M8,28 H42 V38 H8 Z" fill="#FF6B6B" stroke="#C92A2A" strokeWidth="1.5" />
      <path d="M14,28 L18,18 H32 L36,28 Z" fill="#E9ECEF" stroke="#495057" strokeWidth="1.5" />
      <circle cx="16" cy="38" r="6" fill="#495057" />
      <circle cx="16" cy="38" r="2.5" fill="#FFF" />
      <circle cx="34" cy="38" r="6" fill="#495057" />
      <circle cx="34" cy="38" r="2.5" fill="#FFF" />
    </g>
  )},
  { id: 'apple', name: 'りんご', render: () => (
    <g>
      <path d="M25,12 C18,10 10,14 10,24 C10,34 18,42 25,40 C32,42 40,34 40,24 C40,14 32,10 25,12 Z" fill="#FF6B6B" stroke="#C92A2A" strokeWidth="1.5" />
      <path d="M25,12 Q28,5 34,7" fill="none" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28,8 Q34,2 32,12 Z" fill="#69DB7C" />
    </g>
  )},
  { id: 'strawberry', name: 'いちご', render: () => (
    <g>
      <path d="M25,42 C36,36 38,20 35,14 C32,8 18,8 15,14 C12,20 14,36 25,42 Z" fill="#FF6B6B" stroke="#C92A2A" strokeWidth="1.5" />
      <path d="M25,14 Q25,8 25,8 M20,12 C21,8 29,8 30,12 Z" fill="#69DB7C" stroke="#2B8A3E" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="1.2" fill="#FFE66D" />
      <circle cx="30" cy="20" r="1.2" fill="#FFE66D" />
      <circle cx="25" cy="26" r="1.2" fill="#FFE66D" />
      <circle cx="18" cy="30" r="1.2" fill="#FFE66D" />
      <circle cx="32" cy="30" r="1.2" fill="#FFE66D" />
      <circle cx="25" cy="36" r="1.2" fill="#FFE66D" />
    </g>
  )},
  { id: 'candy', name: 'あめ', render: () => (
    <g>
      <polygon points="5,15 15,25 5,35" fill="#DA77F2" stroke="#AE3EC9" strokeWidth="1.5" />
      <polygon points="45,15 35,25 45,35" fill="#DA77F2" stroke="#AE3EC9" strokeWidth="1.5" />
      <circle cx="25" cy="25" r="11" fill="#DA77F2" stroke="#AE3EC9" strokeWidth="1.5" />
      <path d="M20,25 Q25,20 30,25" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )},
  { id: 'music', name: 'おんぷ', render: () => (
    <g>
      <circle cx="16" cy="34" r="6" fill="#20C997" stroke="#0CA678" strokeWidth="1.5" />
      <circle cx="34" cy="30" r="6" fill="#20C997" stroke="#0CA678" strokeWidth="1.5" />
      <path d="M22,34 V12 L40,8 V28" fill="none" stroke="#0CA678" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22,12 H40" stroke="#0CA678" strokeWidth="3" strokeLinecap="round" />
    </g>
  )},
  { id: 'smile', name: 'にこちゃん', render: () => (
    <g>
      <circle cx="25" cy="25" r="20" fill="#FFE66D" stroke="#F5B041" strokeWidth="1.5" />
      <circle cx="18" cy="20" r="2.5" fill="#333" />
      <circle cx="32" cy="20" r="2.5" fill="#333" />
      <path d="M16,28 Q25,38 34,28" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )},
  { id: 'panda', name: 'ぱんだ', render: () => (
    <g>
      <circle cx="25" cy="26" r="17" fill="#FFF" stroke="#495057" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" fill="#495057" />
      <circle cx="38" cy="12" r="6" fill="#495057" />
      <ellipse cx="18" cy="23" rx="4" ry="5" fill="#495057" transform="rotate(-15 18 23)" />
      <ellipse cx="32" cy="23" rx="4" ry="5" fill="#495057" transform="rotate(15 32 23)" />
      <circle cx="18" cy="22" r="1.5" fill="#FFF" />
      <circle cx="32" cy="22" r="1.5" fill="#FFF" />
      <polygon points="25,28 23,26 27,26" fill="#495057" />
      <path d="M23,31 Q25,33 27,31" fill="none" stroke="#495057" strokeWidth="1.5" />
    </g>
  )},
  { id: 'bear', name: 'くま', render: () => (
    <g>
      <circle cx="25" cy="26" r="17" fill="#D0BFFF" stroke="#845EF7" strokeWidth="1.5" />
      <circle cx="11" cy="12" r="6" fill="#D0BFFF" stroke="#845EF7" strokeWidth="1.5" />
      <circle cx="11" cy="12" r="3" fill="#FFA2C1" />
      <circle cx="39" cy="12" r="6" fill="#D0BFFF" stroke="#845EF7" strokeWidth="1.5" />
      <circle cx="39" cy="12" r="3" fill="#FFA2C1" />
      <circle cx="25" cy="29" r="6" fill="#FFF" stroke="#845EF7" strokeWidth="1" />
      <circle cx="19" cy="22" r="2" fill="#333" />
      <circle cx="31" cy="22" r="2" fill="#333" />
      <circle cx="25" cy="27" r="2" fill="#333" />
      <path d="M23,31 Q25,33 27,31" fill="none" stroke="#333" strokeWidth="1" />
    </g>
  )},
  { id: 'cat', name: 'ねこ', render: () => (
    <g>
      <circle cx="25" cy="26" r="17" fill="#FFE066" stroke="#F59F00" strokeWidth="1.5" />
      <polygon points="9,14 17,21 7,24" fill="#FFE066" stroke="#F59F00" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="41,14 33,21 43,24" fill="#FFE066" stroke="#F59F00" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="18" cy="23" r="2" fill="#333" />
      <circle cx="32" cy="23" r="2" fill="#333" />
      <polygon points="25,27 23,25 27,25" fill="#FF8787" />
      <path d="M22,30 Q25,32 28,30" fill="none" stroke="#333" strokeWidth="1.5" />
      <path d="M12,28 H7 M12,31 H6 M38,28 H43 M38,31 H44" stroke="#F59F00" strokeWidth="1" />
    </g>
  )},
  { id: 'dog', name: 'いぬ', render: () => (
    <g>
      <circle cx="25" cy="26" r="17" fill="#FFD8A8" stroke="#E67E22" strokeWidth="1.5" />
      <path d="M10,18 C7,18 7,32 11,32 C13,32 14,24 12,18 Z" fill="#D35400" />
      <path d="M40,18 C43,18 43,32 39,32 C37,32 36,24 38,18 Z" fill="#D35400" />
      <circle cx="18" cy="23" r="2" fill="#333" />
      <circle cx="32" cy="23" r="2" fill="#333" />
      <ellipse cx="25" cy="27" rx="3" ry="2" fill="#333" />
      <path d="M23,30 Q25,32 27,30" fill="none" stroke="#333" strokeWidth="1" />
    </g>
  )},
  { id: 'chick', name: 'ひよこ', render: () => (
    <g>
      <circle cx="25" cy="26" r="17" fill="#FFF3BF" stroke="#F59F00" strokeWidth="1.5" />
      <circle cx="18" cy="21" r="2" fill="#333" />
      <circle cx="32" cy="21" r="2" fill="#333" />
      <polygon points="25,23 21,26 29,26" fill="#FF922B" stroke="#D9480F" strokeWidth="1" />
      <polygon points="25,29 22,26 28,26" fill="#FF922B" stroke="#D9480F" strokeWidth="1" />
      <circle cx="12" cy="25" r="4" fill="#FFE66D" opacity="0.6"/>
      <circle cx="38" cy="25" r="4" fill="#FFE66D" opacity="0.6"/>
    </g>
  )},
  { id: 'rainbow', name: 'にじ', render: () => (
    <g>
      <path d="M8,38 A17,17 0 0,1 42,38" fill="none" stroke="#FF6B6B" strokeWidth="3" />
      <path d="M12,38 A13,13 0 0,1 38,38" fill="none" stroke="#FFE66D" strokeWidth="3" />
      <path d="M16,38 A9,9 0 0,1 34,38" fill="none" stroke="#4DABF7" strokeWidth="3" />
    </g>
  )},
  { id: 'diamond', name: 'だいや', render: () => <polygon points="25,5 42,25 25,45 8,25" fill="#E8F4F8" stroke="#74C0FC" strokeWidth="2" strokeLinejoin="round" /> }
];

// お手伝い項目リスト
const STAMP_TASKS = [
  { id: 'sweep', label: '🧹 そうじ', desc: 'おへややおうちのそうじ' },
  { id: 'meal_prep', label: '🍽️ おしょくじじゅんび', desc: 'ごはんのじゅんびをてつだう' },
  { id: 'dish_wash', label: '🧼 かたづけ', desc: 'しょっきをシンクにはこぶ・あらう' },
  { id: 'water', label: '🌸 みずやり', desc: 'おはなやうえきにみずをあげる' },
  { id: 'shoes', label: '👞 くつそろえ', desc: 'げんかんのくつをきれいにそろえる' }
];

// 生活リズムの項目リスト
const RHYTHM_ITEMS = [
  { id: 'wakeup', label: '☀️ はやおき', q: 'あさ、はやく おきられた？' },
  { id: 'breakfast', label: '🍳 あさごはん', q: 'あさごはんを しっかり たべた？' },
  { id: 'teeth', label: '🪥 はみがき', q: 'はを きれいに みがいた？' },
  { id: 'prep', label: '🎒 あしたのじゅんび', q: 'あしたの じゅんびを した？' },
  { id: 'bath', label: '🛁 おふろ', q: 'おふろに はいって さっぱりした？' },
  { id: 'sleep', label: '🌙 はやね', q: 'はやく ねる じゅんびを した？' }
];

// 個別の手書き文字認識マスコンポーネント (国語の HandwritingRecognizer を流用)
const CharCanvas = ({ index, onCharRecognized, onStrokeChange }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [recognizedChar, setRecognizedChar] = useState('');
  const [loading, setLoading] = useState(false);
  const inkRef = useRef([]); // [ [ [x], [y], [t] ], ... ]
  const currentStrokeRef = useRef([[], [], []]);
  const timerRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    // 小さめの110x110サイズ
    canvas.width = 110 * dpr;
    canvas.height = 110 * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1E3E62';
    ctxRef.current = ctx;

    drawGrid(ctx, 110, 110);
  }, []);

  const drawGrid = (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#1E3E62';
  };

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
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || loading) return;
    const { x, y } = getCoords(e);
    const t = Date.now();
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    currentStrokeRef.current[0].push(Math.round(x));
    currentStrokeRef.current[1].push(Math.round(y));
    currentStrokeRef.current[2].push(t);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      inkRef.current.push(currentStrokeRef.current);
      onStrokeChange(index, true);

      // 書き終わってから1.2秒後に自動で文字認識APIを実行する（デバウンス）
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        recognizeHandwriting();
      }, 1200);
    }
  };

  const recognizeHandwriting = async () => {
    if (inkRef.current.length === 0) return;
    setLoading(true);
    try {
      let firstTime = null;
      const relativeInk = inkRef.current.map(stroke => {
        const xs = stroke[0];
        const ys = stroke[1];
        const ts = stroke[2];
        if (firstTime === null && ts.length > 0) firstTime = ts[0];
        const newTs = ts.map(t => (firstTime !== null ? t - firstTime : 0));
        return [xs, ys, newTs];
      });

      const response = await fetch('https://inputtools.google.com/request?itc=ja-t-i0-handwrit&num=3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_version: 0.4,
          api_level: '53.0.0',
          device: 'pc',
          input_type: '0',
          options: 'enable_pre_space',
          requests: [{
            writing_guide: { writing_area_width: 110, writing_area_height: 110 },
            ink: relativeInk,
            language: 'ja'
          }]
        })
      });

      const data = await response.json();
      if (data[0] === 'SUCCESS') {
        const candidates = data[1][0][1] || [];
        const topChar = (candidates[0] || '').trim();
        setRecognizedChar(topChar);
        onCharRecognized(index, topChar);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    drawGrid(ctxRef.current, 110, 110);
    inkRef.current = [];
    currentStrokeRef.current = [[], [], []];
    setRecognizedChar('');
    onCharRecognized(index, '');
    onStrokeChange(index, false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '110px' }}>
      <div 
        style={{
          width: '110px',
          height: '110px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid #e2e8f0'
        }}
      >
        <canvas
          ref={canvasRef}
          className="goal-char-canvas"
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
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>
            🤔...
          </div>
        )}
      </div>
      <input
        type="text"
        maxLength={1}
        value={recognizedChar}
        onChange={(e) => {
          const val = e.target.value;
          setRecognizedChar(val);
          onCharRecognized(index, val);
        }}
        style={{
          width: '60px',
          padding: '4px',
          textAlign: 'center',
          borderRadius: '8px',
          border: '2px solid #cbd5e1',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          fontFamily: 'Kosugi Maru, sans-serif',
          background: '#f8fafc'
        }}
      />
      <button
        onClick={handleClear}
        style={{
          background: '#fee2e2',
          color: '#ef4444',
          border: 'none',
          borderRadius: '8px',
          padding: '4px 16px',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontWeight: 'bold',
          width: '80px',
          textAlign: 'center'
        }}
      >
        けす
      </button>
    </div>
  );
};

// 複数マスの手書き目標設定コンポーネント (可変文字数対応)
const GoalMultiCanvas = ({ onSave, onCancel }) => {
  const [charCount, setCharCount] = useState(6);
  const [charList, setCharList] = useState(Array(6).fill(''));
  const [hasStrokes, setHasStrokes] = useState(Array(6).fill(false));

  // 文字数変更
  const changeCharCount = (newCount) => {
    if (newCount < 2 || newCount > 15) return;
    setCharCount(newCount);
    setCharList(prev => {
      const next = [...prev];
      if (newCount > prev.length) {
        return [...next, ...Array(newCount - prev.length).fill('')];
      } else {
        return next.slice(0, newCount);
      }
    });
    setHasStrokes(prev => {
      const next = [...prev];
      if (newCount > prev.length) {
        return [...next, ...Array(newCount - prev.length).fill(false)];
      } else {
        return next.slice(0, newCount);
      }
    });
  };

  const handleCharRecognized = (index, char) => {
    setCharList(prev => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
  };

  const handleStrokeChange = (index, hasStroke) => {
    setHasStrokes(prev => {
      const next = [...prev];
      next[index] = hasStroke;
      return next;
    });
  };

  const handleSave = () => {
    const canvases = document.querySelectorAll('.goal-char-canvas');
    if (canvases.length === 0) return;

    const combinedCanvas = document.createElement('canvas');
    // 現在の文字数に応じた横幅でキャンバスを作成
    const w = 110 * charCount;
    const h = 110;
    combinedCanvas.width = w;
    combinedCanvas.height = h;
    const ctx = combinedCanvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // 有効な文字数分のキャンバスだけを描画・合成する
    for (let idx = 0; idx < charCount; idx++) {
      const canvas = canvases[idx];
      if (canvas) {
        ctx.drawImage(canvas, idx * 110, 0, 110, 110);
      }
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.strokeRect(idx * 110, 0, 110, 110);
    }

    const dataUrl = combinedCanvas.toDataURL('image/png');
    const combinedText = charList.slice(0, charCount).join('').trim();
    onSave(dataUrl, combinedText);
  };

  const combinedText = charList.slice(0, charCount).join('').trim();

  return (
    <div style={{ background: '#fff9db', padding: '20px', borderRadius: '24px', border: '3px dashed #ffd43b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: '100%', margin: '0 auto' }}>
      <p style={{ fontWeight: 'bold', color: '#B25E00', fontSize: '1.05rem', margin: 0, textAlign: 'center' }}>
        1もじ ずつ マスに てがきで かこう！ ✏️
      </p>

      {/* 文字数変更コントロール */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '5px 15px', borderRadius: '50px', border: '2px solid #ffd43b', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <button
          className="btn"
          disabled={charCount <= 2}
          onClick={() => changeCharCount(charCount - 1)}
          style={{ padding: '4px 10px', fontSize: '0.85rem', minWidth: '32px', height: '32px', border: 'none', background: '#f1f5f9', color: '#64748b', boxShadow: 'none' }}
        >
          ー
        </button>
        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#B25E00', minWidth: '70px', textAlign: 'center' }}>
          {charCount} もじ
        </span>
        <button
          className="btn"
          disabled={charCount >= 15}
          onClick={() => changeCharCount(charCount + 1)}
          style={{ padding: '4px 10px', fontSize: '0.85rem', minWidth: '32px', height: '32px', border: 'none', background: '#f1f5f9', color: '#64748b', boxShadow: 'none' }}
        >
          ＋
        </button>
      </div>

      {/* スクロール可能コンテナ。左右パディングと文字数に応じた動的な中央/左寄せ配置 */}
      <div 
        style={{ 
          width: '100%', 
          overflowX: 'auto', 
          padding: '15px 10px', 
          display: 'flex', 
          justifyContent: charCount <= 4 ? 'center' : 'flex-start',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'auto'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', padding: '5px 20px', minWidth: 'min-content' }}>
          {Array.from({ length: charCount }).map((_, idx) => (
            <CharCanvas
              key={idx}
              index={idx}
              onCharRecognized={handleCharRecognized}
              onStrokeChange={handleStrokeChange}
            />
          ))}
        </div>
      </div>

      {/* 認識テキストのプレビュー */}
      <div style={{ background: 'white', padding: '10px 20px', borderRadius: '12px', border: '2px solid #ffd43b', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>よみとった もくひょう:</span>
        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#B25E00', marginTop: '4px', minHeight: '30px' }}>
          {combinedText || '（なにか かいてね）'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={!combinedText} style={{ fontSize: '0.95rem', padding: '10px 30px', background: '#ffd43b', color: '#856404' }}>
          できた！もくひょうをきめる
        </button>
        {onCancel && (
          <button className="btn" onClick={onCancel} style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '0.95rem', padding: '10px 15px', boxShadow: 'none' }}>
            やめる
          </button>
        )}
      </div>
    </div>
  );
};

const LifeHabits = () => {
  const navigate = useNavigate();

  // データベース保存用データ状態
  const [stamps, setStamps] = useState({}); // { 'YYYY-MM-DD': { sweep: true, ... } }
  const [rhythm, setRhythm] = useState({}); // { 'YYYY-MM-DD': { wakeup: true, ... } }
  const [goals, setGoals] = useState({ currentGoalImg: '', chosens: {}, seals: [] });

  // アプリケーション表示状態
  const [activeModal, setActiveModal] = useState(null); // 'stamps' | 'rhythm' | 'goals_text'
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // カレンダー関連
  const todayStr = new Date().toLocaleDateString('sv-SE').slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  // モーダル内の一時状態
  const [tempStamps, setTempStamps] = useState({});
  const [tempRhythm, setTempRhythm] = useState({});
  const [tempGoalText, setTempGoalText] = useState({ challenge: '', achieved: '' });

  // 目標シール用状態
  const [selectedSeal, setSelectedSeal] = useState('star_y');
  const [bgType, setBgType] = useState('forest');
  const [showWarning, setShowWarning] = useState('');
  const sealContainerRef = useRef(null);

  // 初期ロード
  useEffect(() => {
    const loadData = async () => {
      const stampData = await db.getLifeHabitData('life_stamps');
      const rhythmData = await db.getLifeHabitData('life_rhythm');
      const goalData = await db.getLifeHabitData('life_goals');

      if (stampData) {
        if (Array.isArray(stampData)) {
          const migrated = {};
          stampData.forEach(item => {
            if (item.date) {
              if (!migrated[item.date]) migrated[item.date] = {};
              migrated[item.date]['sweep'] = true;
            }
          });
          setStamps(migrated);
        } else {
          setStamps(stampData);
        }
      }
      if (rhythmData) {
        setRhythm(Array.isArray(rhythmData) ? {} : rhythmData);
      }
      if (goalData) {
        const normalized = {
          currentGoalImg: goalData.currentGoalImg || '',
          chosens: goalData.chosens || {},
          seals: goalData.seals || []
        };
        setGoals(normalized);
        if (!normalized.currentGoalImg) {
          setIsEditingGoal(true);
        }
      } else {
        setIsEditingGoal(true);
      }
    };
    loadData();
  }, []);

  // 総スタンプ（お手伝いチェック数）の計算
  const getStampCount = (stampObj) => {
    return Object.values(stampObj || stamps).reduce((acc, dayData) => {
      if (!dayData) return acc;
      return acc + Object.values(dayData).filter(Boolean).length;
    }, 0);
  };

  // 手書き目標保存
  const handleSaveHandwritingGoal = async (dataUrl, recognizedText) => {
    const newGoals = { 
      ...goals, 
      currentGoalImg: dataUrl,
      currentGoalText: recognizedText 
    };
    setGoals(newGoals);
    setIsEditingGoal(false);
    await db.saveLifeHabitData('life_goals', newGoals);
  };

  // 目標モーダルの起動
  const openGoalModal = () => {
    const chosens = goals.chosens || {};
    const currentText = chosens[selectedDate] || { challenge: '', achieved: '' };
    setTempGoalText(currentText);
    setActiveModal('goals_text');
  };

  // 目標テキスト保存
  const handleSaveGoalText = async () => {
    const chosens = goals.chosens || {};
    const newChosens = {
      ...chosens,
      [selectedDate]: tempGoalText
    };
    const newGoals = { ...goals, chosens: newChosens };
    setGoals(newGoals);
    setActiveModal(null);
    await db.saveLifeHabitData('life_goals', newGoals);
  };

  // 目標たっせいボタン（目標リセット）
  const handleAchieveGoal = async () => {
    if (window.confirm('もくひょうを たっせい しましたか？おめでとうございます！💮 新しい目標をきめましょう。')) {
      // 達成お祝いエフェクト
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);

      const newGoals = { ...goals, currentGoalImg: '', currentGoalText: '' };
      setGoals(newGoals);
      setIsEditingGoal(true);
      setActiveModal(null);
      await db.saveLifeHabitData('life_goals', newGoals);
    }
  };

  // おてつだいモーダル起動
  const openStampsModal = () => {
    setTempStamps(stamps[selectedDate] || {});
    setActiveModal('stamps');
  };

  // おてつだい保存
  const handleSaveStamps = async () => {
    const previousCount = getStampCount(stamps);

    const newStamps = {
      ...stamps,
      [selectedDate]: tempStamps
    };

    setStamps(newStamps);
    await db.saveLifeHabitData('life_stamps', newStamps);
    setActiveModal(null);

    const afterCount = getStampCount(newStamps);
    // 10個貯まるごとにお祝いエフェクト
    if (afterCount > previousCount && Math.floor(afterCount / 10) > Math.floor(previousCount / 10)) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  // せいかつリズムモーダル起動
  const openRhythmModal = () => {
    setTempRhythm(rhythm[selectedDate] || {});
    setActiveModal('rhythm');
  };

  // せいかつリズム保存
  const handleSaveRhythm = async () => {
    const newRhythm = {
      ...rhythm,
      [selectedDate]: tempRhythm
    };
    setRhythm(newRhythm);
    await db.saveLifeHabitData('life_rhythm', newRhythm);
    setActiveModal(null);
  };

  // シール貼り付け (台紙クリック時)
  const handleBgClick = async (e) => {
    if (!sealContainerRef.current) return;
    
    // シール貼り付け条件チェック
    const chosens = goals.chosens || {};
    const chosenData = chosens[selectedDate] || { challenge: '', achieved: '' };
    const hasText = chosenData.challenge.trim() !== '' || chosenData.achieved.trim() !== '';

    if (!hasText) {
      setShowWarning('そのひの『ちょうせんしたこと』か『できるようになったこと』をかいてから、シールをはってね！');
      setTimeout(() => setShowWarning(''), 5000);
      return;
    }

    const rect = sealContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // シールに貼り付けるテキストの決定
    let sealText = '';
    if (chosenData.challenge && chosenData.achieved) {
      sealText = `${chosenData.challenge} (できた: ${chosenData.achieved})`;
    } else {
      sealText = chosenData.challenge || chosenData.achieved;
    }

    const newSeal = {
      id: Date.now().toString(),
      type: selectedSeal,
      x: Math.max(2, Math.min(x, 90)), // 吹き出し表示領域を確保
      y: Math.max(2, Math.min(y, 88)),
      date: selectedDate,
      text: sealText
    };

    const newSeals = [...goals.seals, newSeal];
    const newGoals = { ...goals, seals: newSeals };
    setGoals(newGoals);
    await db.saveLifeHabitData('life_goals', newGoals);
  };

  // シールはがし
  const handleUndoSeal = async () => {
    if (goals.seals.length === 0) return;
    const newSeals = goals.seals.slice(0, -1);
    const newGoals = { ...goals, seals: newSeals };
    setGoals(newGoals);
    await db.saveLifeHabitData('life_goals', newGoals);
  };

  const handleClearSeals = async () => {
    if (window.confirm('シールをすべて はがしますか？')) {
      const newGoals = { ...goals, seals: [] };
      setGoals(newGoals);
      await db.saveLifeHabitData('life_goals', newGoals);
    }
  };

  // カレンダー計算
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // カレンダーの日付の評価マークを計算
  const getRhythmMark = (dateKey) => {
    const dayData = rhythm[dateKey];
    if (!dayData) return null;
    const count = Object.values(dayData).filter(Boolean).length;
    if (count === 6) return '💮';
    if (count >= 4) return '○';
    if (count === 3) return '△';
    return null;
  };

  // カレンダーの日付にお手伝いマークを表示するかどうか
  const hasStampOnDate = (dateKey) => {
    const dayData = stamps[dateKey];
    if (!dayData) return false;
    return Object.values(dayData).some(Boolean);
  };

  // 選択日のおてつだい数、リズムチェック数、目標入力の有無
  const selectedDateStamps = stamps[selectedDate] || {};
  const selectedDateRhythm = rhythm[selectedDate] || {};
  const chosens = goals.chosens || {};
  const selectedGoalText = chosens[selectedDate] || { challenge: '', achieved: '' };

  const activeStampCount = Object.values(selectedDateStamps).filter(Boolean).length;
  const activeRhythmCount = Object.values(selectedDateRhythm).filter(Boolean).length;
  const hasGoalRecorded = selectedGoalText.challenge.trim() !== '' || selectedGoalText.achieved.trim() !== '';

  // シール台紙のスタイル
  const getBgStyle = () => {
    switch (bgType) {
      case 'space':
        return {
          background: 'linear-gradient(to bottom, #0F2027, #203A43, #2C5364)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          height: '350px',
          cursor: 'crosshair',
          border: '3px solid #FFE66D',
          marginTop: '15px'
        };
      case 'ocean':
        return {
          background: 'linear-gradient(to bottom, #00c6ff, #0072ff)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          height: '350px',
          cursor: 'crosshair',
          border: '3px solid #74C0FC',
          marginTop: '15px'
        };
      case 'forest':
      default:
        return {
          background: 'linear-gradient(to bottom, #87CEEB 0%, #BFF0FF 50%, #98FB98 50%, #52C452 100%)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          height: '350px',
          cursor: 'crosshair',
          border: '3px solid #69DB7C',
          marginTop: '15px'
        };
    }
  };

  // 紙吹雪エフェクト
  const renderConfetti = () => {
    if (!showConfetti) return null;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8DA1', '#74C0FC', '#FF922B', '#DA77F2'];
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 99999 }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 4;
          const duration = Math.random() * 3 + 2;
          const size = Math.random() * 12 + 6;
          const color = colors[Math.floor(Math.random() * colors.length)];
          return (
            <div
              key={i}
              className="confetti-piece"
              style={{
                position: 'absolute',
                top: '-20px',
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                opacity: 0.8,
                transform: `rotate(${Math.random() * 360}deg)`,
                animation: `confetti-fall ${duration}s linear ${delay}s infinite`
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '850px', margin: '0 auto' }}>
      {/* CSSの追加 */}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @keyframes stamp-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          background: white;
          padding: 15px;
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .calendar-day-header {
          text-align: center;
          font-weight: bold;
          font-size: 0.9rem;
          padding: 8px 0;
          color: #64748b;
        }
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 6px 2px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          transition: all 0.2s ease;
          position: relative;
          background: #f8fafc;
        }
        .calendar-day:hover {
          background: #e2e8f0;
        }
        .calendar-day.selected {
          background: #ffe3e3;
          color: #ff3366;
          box-shadow: 0 0 0 3px #ff3366 inset;
        }
        .calendar-day.today {
          background: #e6fffa;
          border: 2px solid var(--secondary-color);
        }
        .calendar-mark {
          font-size: 1rem;
          line-height: 1;
        }
        .calendar-stamp-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 0.65rem;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100000;
        }
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 24px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 15px 30px rgba(0,0,0,0.15);
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #f8fafc;
          padding: 15px 20px;
          border-radius: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }
        .checkbox-row:hover {
          background: #f1f5f9;
        }
        .checkbox-row.checked {
          border-color: var(--secondary-color);
          background: #e6fffa;
        }
        .modal-btn-row {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 25px;
        }
        .seal-palette {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 10px 5px;
          background: white;
          border-radius: 12px;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.05);
        }
        .seal-palette-item {
          flex: 0 0 52px;
          height: 52px;
          border-radius: 8px;
          border: 2px solid transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          background: #f8fafc;
        }
        .seal-palette-item.active {
          border-color: var(--primary-color);
          background: #fff5f5;
          transform: scale(1.1);
        }
        .bubble-label {
          background: white;
          border: 2px solid #cbd5e1;
          border-radius: 12px;
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: bold;
          color: #334155;
          box-shadow: 0 3px 6px rgba(0,0,0,0.1);
          white-space: nowrap;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bubble-label::after {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: transparent #cbd5e1 transparent transparent;
        }
        .goal-img-display {
          max-width: 100%;
          width: 380px;
          height: auto;
          border-radius: 12px;
          border: 2px solid #ffd43b;
          background: white;
          padding: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
      `}</style>

      {renderConfetti()}

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn" onClick={() => navigate('/life')}>もどる</button>
        <h2 style={{ margin: 0 }}>じぶんでできるよ ⭐</h2>
        <div style={{ width: '80px' }}></div>
      </div>

      {/* 目標設定が未設定、または編集中の場合 */}
      {isEditingGoal ? (
        <div style={{ marginBottom: '30px', background: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ textShadow: 'none', color: '#B25E00', marginTop: 0 }}>いまのもくひょう を きめよう</h3>
          <GoalMultiCanvas
            onSave={handleSaveHandwritingGoal}
            onCancel={goals.currentGoalImg ? () => setIsEditingGoal(false) : null}
          />
        </div>
      ) : (
        /* カレンダー上部の手書き目標表示 */
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '25px', background: 'linear-gradient(135deg, #fff9db 0%, #fff3bf 100%)', padding: '15px 25px', borderRadius: '20px', border: '3px solid #ffd43b', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#856404' }}>いまのもくひょう 🏆</span>
            <img src={goals.currentGoalImg} alt="現在の目標" className="goal-img-display" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#856404', border: '1px solid #ffe066', background: 'white' }} onClick={() => setIsEditingGoal(true)}>
              ✏️ かきなおす
            </button>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#ffd43b', color: '#856404', border: 'none' }} onClick={handleAchieveGoal}>
              🏆 たっせい！
            </button>
          </div>
        </div>
      )}

      {/* カレンダー表示 */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, textShadow: 'none', color: '#1A535C' }}>できたことカレンダー 📅</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', boxShadow: 'none' }} onClick={handlePrevMonth}>◀</button>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '100px', textAlign: 'center', color: '#334155' }}>
              {calendarYear}ねん {calendarMonth + 1}がつ
            </span>
            <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', boxShadow: 'none' }} onClick={handleNextMonth}>▶</button>
          </div>
        </div>

        <div className="calendar-grid">
          {['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'].map((day) => (
            <div key={day} className="calendar-day-header" style={{ color: day === 'にち' ? '#ef4444' : day === 'ど' ? '#3b82f6' : '#64748b' }}>
              {day}
            </div>
          ))}
          {Array.from({ length: getFirstDayOfMonth(calendarYear, calendarMonth) }).map((_, idx) => (
            <div key={`empty-${idx}`} />
          ))}
          {Array.from({ length: getDaysInMonth(calendarYear, calendarMonth) }).map((_, idx) => {
            const day = idx + 1;
            const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayStr;
            const rhythmMark = getRhythmMark(dateKey);
            const hasStamp = hasStampOnDate(dateKey);

            return (
              <div
                key={dateKey}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span style={{ fontSize: '0.95rem' }}>{day}</span>
                {hasStamp && <span className="calendar-stamp-dot" title="おてつだいをしました">⭐</span>}
                <span className="calendar-mark">{rhythmMark}</span>
              </div>
            );
          })}
        </div>

        {/* 凡例表示 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.85rem', color: '#64748b', marginTop: '12px', fontWeight: 'bold' }}>
          <span>⭐ おてつだい</span>
          <span>💮 リズム6つ</span>
          <span>○ リズム4〜5つ</span>
          <span>△ リズム3つ</span>
        </div>

        {/* 選択日付とアクションボタン */}
        <div style={{ marginTop: '25px', padding: '15px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#334155' }}>
              📅 {selectedDate === todayStr ? 'きょう' : selectedDate.replace('-', 'ねん').replace('-', 'がつ') + 'にち'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
              スタンプ累計: <span style={{ color: 'var(--primary-color)', fontSize: '1rem' }}>{getStampCount()}</span> こ
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn" style={{ padding: '10px 20px', fontSize: '1rem', border: '2px solid var(--primary-color)', color: 'var(--primary-color)' }} onClick={openStampsModal}>
              💮 おてつだい ({activeStampCount}こ)
            </button>
            <button className="btn" style={{ padding: '10px 20px', fontSize: '1rem', border: '2px solid var(--secondary-color)', color: 'var(--secondary-color)' }} onClick={openRhythmModal}>
              ⏰ せいかつリズム ({activeRhythmCount}こ)
            </button>
            <button className="btn" style={{ padding: '10px 20px', fontSize: '1rem', border: '2px solid #ffd43b', color: '#856404' }} onClick={openGoalModal}>
              🎨 もくひょうと記録 {hasGoalRecorded ? '✓' : ''}
            </button>
          </div>
        </div>
      </div>

      {/* シール台紙エリア */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, textShadow: 'none', color: '#1A535C' }}>もくひょうシールだいし 🎨</h3>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#e03131', border: '1px solid #e03131', boxShadow: 'none' }} onClick={handleUndoSeal} disabled={goals.seals.length === 0}>
              ひとつはがす
            </button>
            <button className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#ef4444', border: '1px solid #ef4444', boxShadow: 'none' }} onClick={handleClearSeals} disabled={goals.seals.length === 0}>
              ぜんぶはがす
            </button>
          </div>
        </div>

        {/* 背景切り替え */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>だいし:</span>
          {[{ id: 'forest', label: '🌳 もり' }, { id: 'space', label: '🚀 うちゅう' }, { id: 'ocean', label: '🐠 うみ' }].map((bg) => (
            <button
              key={bg.id}
              className="btn"
              style={{
                padding: '4px 8px',
                fontSize: '0.8rem',
                boxShadow: 'none',
                background: bgType === bg.id ? '#495057' : 'white',
                color: bgType === bg.id ? 'white' : '#495057',
                border: '1px solid #495057'
              }}
              onClick={() => setBgType(bg.id)}
            >
              {bg.label}
            </button>
          ))}
        </div>

        {/* 警告メッセージ */}
        {showWarning && (
          <div style={{ marginTop: '10px', padding: '10px', borderRadius: '10px', background: '#fff0f6', color: '#c91a5e', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
            ⚠️ {showWarning}
          </div>
        )}

        {/* 台紙 */}
        <div
          ref={sealContainerRef}
          style={getBgStyle()}
          onClick={handleBgClick}
        >
          {/* 装飾パーツ */}
          {bgType === 'forest' && (
            <>
              <div style={{ position: 'absolute', top: '10%', left: '5%', opacity: 0.15, fontSize: '3rem' }}>☁️</div>
              <div style={{ position: 'absolute', top: '15%', right: '10%', opacity: 0.15, fontSize: '3rem' }}>☁️</div>
              <div style={{ position: 'absolute', bottom: '15%', left: '15%', fontSize: '4rem', opacity: 0.2 }}>🌳</div>
              <div style={{ position: 'absolute', bottom: '15%', right: '15%', fontSize: '4rem', opacity: 0.2 }}>🌳</div>
            </>
          )}
          {bgType === 'space' && (
            <>
              <div style={{ position: 'absolute', top: '10%', right: '10%', opacity: 0.2, fontSize: '3.5rem' }}>🌙</div>
              <div style={{ position: 'absolute', top: '40%', left: '15%', opacity: 0.1, fontSize: '1rem', color: 'white' }}>★</div>
              <div style={{ position: 'absolute', bottom: '30%', left: '30%', opacity: 0.15, fontSize: '3rem' }}>🪐</div>
            </>
          )}
          {bgType === 'ocean' && (
            <>
              <div style={{ position: 'absolute', top: '20%', left: '20%', opacity: 0.2, fontSize: '2rem' }}>🫧</div>
              <div style={{ position: 'absolute', bottom: '20%', left: '40%', opacity: 0.15, fontSize: '2.5rem' }}>🐠</div>
            </>
          )}

          {/* 貼られたシールのレンダリング */}
          {goals.seals.map((seal) => {
            const template = SEAL_TYPES.find(t => t.id === seal.type);
            if (!template) return null;
            return (
              <div
                key={seal.id}
                style={{
                  position: 'absolute',
                  left: `${seal.x}%`,
                  top: `${seal.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  pointerEvents: 'none',
                  animation: 'stamp-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  zIndex: 5
                }}
              >
                <svg viewBox="0 0 50 50" width="38" height="38" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))' }}>
                  {template.render()}
                </svg>
                {seal.text && (
                  <div className="bubble-label" title={seal.text}>
                    {seal.text}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', pointerEvents: 'none', fontWeight: 'bold' }}>
            タッチして シールを はってね！ (シールの数: {goals.seals.length}こ)
          </div>
        </div>

        {/* シール選択パレット */}
        <div style={{ margin: '15px 0 5px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textAlign: 'left' }}>
          はるシールを えらんでね (全30しゅるい)
        </div>
        <div className="seal-palette">
          {SEAL_TYPES.map((seal) => (
            <div
              key={seal.id}
              className={`seal-palette-item ${selectedSeal === seal.id ? 'active' : ''}`}
              onClick={() => setSelectedSeal(seal.id)}
              title={seal.name}
            >
              <svg viewBox="0 0 50 50" width="38" height="38">
                {seal.render()}
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== モーダル一覧 ==================== */}

      {/* 1. おてつだいモーダル */}
      {activeModal === 'stamps' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textShadow: 'none', color: 'var(--primary-color)', marginTop: 0 }}>🧹 おてつだい の きろく</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px' }}>
              できたおてつだいに チェックを いれよう！ (複数えらべます)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {STAMP_TASKS.map((task) => {
                const isChecked = tempStamps[task.id] || false;
                return (
                  <div
                    key={task.id}
                    className={`checkbox-row ${isChecked ? 'checked' : ''}`}
                    onClick={() => setTempStamps({ ...tempStamps, [task.id]: !isChecked })}
                  >
                    <div className="checkbox-circle" style={{ borderColor: isChecked ? 'var(--primary-color)' : '#cbd5e1', background: isChecked ? 'var(--primary-color)' : 'white' }}>
                      {isChecked ? '✓' : ''}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#334155' }}>{task.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{task.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-btn-row">
              <button className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }} onClick={() => setActiveModal(null)}>
                キャンセル
              </button>
              <button className="btn btn-primary" style={{ padding: '8px 24px', fontSize: '0.9rem' }} onClick={handleSaveStamps}>
                ほぞんする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. せいかつリズムモーダル */}
      {activeModal === 'rhythm' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textShadow: 'none', color: 'var(--secondary-color)', marginTop: 0 }}>⏰ せいかつリズム の きろく</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px' }}>
              できたことに チェックを いれよう！
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {RHYTHM_ITEMS.map((item) => {
                const isChecked = tempRhythm[item.id] || false;
                return (
                  <div
                    key={item.id}
                    className={`checkbox-row ${isChecked ? 'checked' : ''}`}
                    onClick={() => setTempRhythm({ ...tempRhythm, [item.id]: !isChecked })}
                  >
                    <div className="checkbox-circle" style={{ borderColor: isChecked ? 'var(--secondary-color)' : '#cbd5e1', background: isChecked ? 'var(--secondary-color)' : 'white' }}>
                      {isChecked ? '✓' : ''}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#334155' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{item.q}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-btn-row">
              <button className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }} onClick={() => setActiveModal(null)}>
                キャンセル
              </button>
              <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: '0.9rem' }} onClick={handleSaveRhythm}>
                ほぞんする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. もくひょう（挑戦・達成）モーダル */}
      {activeModal === 'goals_text' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textShadow: 'none', color: '#856404', marginTop: 0 }}>🎨 もくひょうときろく</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                <label style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>🎯 ちょうせんしたこと</label>
                <input
                  type="text"
                  placeholder="例: ほんを 3ページ よんだ"
                  value={tempGoalText.challenge}
                  onChange={(e) => setTempGoalText({ ...tempGoalText, challenge: e.target.value })}
                  style={{
                    padding: '12px 15px',
                    borderRadius: '12px',
                    border: '2px solid #cbd5e1',
                    fontSize: '1rem',
                    fontFamily: 'Kosugi Maru, sans-serif'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                <label style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>🎉 できるようになったこと</label>
                <input
                  type="text"
                  placeholder="例: あさひとりで おきられた"
                  value={tempGoalText.achieved}
                  onChange={(e) => setTempGoalText({ ...tempGoalText, achieved: e.target.value })}
                  style={{
                    padding: '12px 15px',
                    borderRadius: '12px',
                    border: '2px solid #cbd5e1',
                    fontSize: '1rem',
                    fontFamily: 'Kosugi Maru, sans-serif'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: '#856404', fontWeight: 'bold', background: '#fff9db', padding: '10px', borderRadius: '10px', marginTop: '5px', textAlign: 'center' }}>
                💡 ここに書き込むと、シール台紙にシールを貼れるようになるよ！
              </div>
            </div>

            <div className="modal-btn-row">
              <button className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', boxShadow: 'none' }} onClick={() => setActiveModal(null)}>
                キャンセル
              </button>
              <button className="btn" style={{ padding: '8px 24px', fontSize: '0.9rem', background: '#ffd43b', color: '#856404' }} onClick={handleSaveGoalText}>
                ほぞんする
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LifeHabits;
