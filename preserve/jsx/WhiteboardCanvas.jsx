import { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Download, 
  Trash2, 
  Users,
  Minus,
  Undo,
  Redo
} from 'lucide-react';
import '../styles/WhiteboardCanvas.css';

const WhiteboardCanvas = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [color, setColor] = useState('#8b5cf6');
  const [lineWidth, setLineWidth] = useState(3);
  const [roomId] = useState('ABC12345'); // This should come from route params

  const colors = [
    '#8b5cf6', // Purple
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#ef4444', // Red
    '#ec4899', // Pink
    '#000000', // Black
    '#ffffff'  // White
  ];

  const tools = [
    { name: 'pencil', icon: <Pencil size={20} />, label: 'Draw' },
    { name: 'eraser', icon: <Eraser size={20} />, label: 'Erase' },
    { name: 'rectangle', icon: <Square size={20} />, label: 'Rectangle' },
    { name: 'circle', icon: <Circle size={20} />, label: 'Circle' },
    { name: 'text', icon: <Type size={20} />, label: 'Text' },
    { name: 'line', icon: <Minus size={20} />, label: 'Line' }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add "Start Here" text
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Start Here', canvas.width / 2, canvas.height / 2);
    }
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'pencil') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (selectedTool === 'eraser') {
      ctx.clearRect(x - lineWidth / 2, y - lineWidth / 2, lineWidth, lineWidth);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="whiteboard-canvas-page">
      <Navbar theme="dark" />
      
      <main className="canvas-main">
        <div className="canvas-container">
          {/* Top Toolbar */}
          <div className="canvas-toolbar">
            <div className="toolbar-section">
              <div className="room-info">
                <Users size={18} />
                <span className="room-id">Room: {roomId}</span>
                <div className="active-users">
                  <div className="user-indicator active"></div>
                  <span>3 Active</span>
                </div>
              </div>
            </div>

            <div className="toolbar-section tools-section">
              {tools.map(tool => (
                <button
                  key={tool.name}
                  className={`tool-btn ${selectedTool === tool.name ? 'active' : ''}`}
                  onClick={() => setSelectedTool(tool.name)}
                  title={tool.label}
                >
                  {tool.icon}
                </button>
              ))}
            </div>

            <div className="toolbar-section">
              <div className="color-picker">
                {colors.map(c => (
                  <button
                    key={c}
                    className={`color-btn ${color === c ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: c,
                      border: c === '#ffffff' ? '1px solid #cbd5e1' : 'none'
                    }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
              </div>

              <div className="stroke-width">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(e.target.value)}
                  className="width-slider"
                />
                <span className="width-label">{lineWidth}px</span>
              </div>
            </div>

            <div className="toolbar-section actions-section">
              <button className="action-btn" title="Undo">
                <Undo size={18} />
              </button>
              <button className="action-btn" title="Redo">
                <Redo size={18} />
              </button>
              <button className="action-btn danger" onClick={clearCanvas} title="Clear All">
                <Trash2 size={18} />
              </button>
              <button className="action-btn primary" onClick={downloadCanvas} title="Download">
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              className="whiteboard-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WhiteboardCanvas;
