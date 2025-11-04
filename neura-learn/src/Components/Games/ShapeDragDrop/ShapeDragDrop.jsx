import React, { useState, useRef, useEffect } from 'react';
import './ShapeDragDrop.css';

const ShapeDragDrop = () => {
  const canvasRef = useRef(null);
  const [canvasShapes, setCanvasShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 500;

  const sidebarShapes = {
    left: [
      { id: 'circle-red', type: 'circle', label: 'Circle', color: '#EF4444', radius: 50 },
      { id: 'triangle-orange', type: 'triangle-right', label: 'Triangle', color: '#FF8C00', width: 85, height: 85 },
      { id: 'rectangle-green', type: 'rectangle', label: 'Rectangle', color: '#10B981', width: 80, height: 70 },
      { id: 'polygon-blue', type: 'polygon', label: 'Polygon', color: '#3B82F6', radius: 45 },
    ],
    right: [
      { id: 'hexagon-yellow', type: 'hexagon', label: 'Hexagon', color: '#F59E0B', radius: 45 },
      { id: 'arch-purple', type: 'arch', label: 'Arch', color: '#8B5CF6', width: 130, height: 80 },
      { id: 'line-cyan', type: 'line', label: 'Line', color: '#06B6D4', width: 110, height: 15 },
      { id: 'diamond-pink', type: 'diamond', label: 'Diamond', color: '#EC4899', width: 95, height: 95 },
    ],
  };

  const getShapeBounds = (shape) => {
    if (shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'hexagon') {
      return shape.radius;
    } else if (shape.type === 'rectangle' || shape.type === 'line' || shape.type === 'diamond' || shape.type === 'arch') {
      return Math.max(shape.width, shape.height) / 2;
    } else if (shape.type === 'triangle-right') {
      return Math.max(shape.width, shape.height) / 2;
    }
    return 0;
  };

  const constrainShapePosition = (shape) => {
    const bound = getShapeBounds(shape);
    let x = shape.x;
    let y = shape.y;

    if (x - bound < 0) {
      x = bound;
    } else if (x + bound > CANVAS_WIDTH) {
      x = CANVAS_WIDTH - bound;
    }

    if (y - bound < 0) {
      y = bound;
    } else if (y + bound > CANVAS_HEIGHT) {
      y = CANVAS_HEIGHT - bound;
    }

    return { ...shape, x, y };
  };

  const addToHistory = (newShapes) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newShapes)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCanvasShapes(newShapes);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCanvasShapes(JSON.parse(JSON.stringify(history[newIndex])));
      setSelectedShapeId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCanvasShapes(JSON.parse(JSON.stringify(history[newIndex])));
      setSelectedShapeId(null);
    }
  };

  const handleDelete = () => {
    if (!selectedShapeId) return;

    const newShapes = canvasShapes.filter((shape) => shape.id !== selectedShapeId);
    addToHistory(newShapes);
    setSelectedShapeId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedShapeId, canvasShapes]);

  const drawShape = (ctx, shape, isSelected = false) => {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate((shape.rotation * Math.PI) / 180);

    if (shape.type === 'circle') {
      ctx.fillStyle = shape.color;
      ctx.beginPath();
      ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape.type === 'triangle-right') {
      ctx.fillStyle = shape.color;
      ctx.beginPath();
      ctx.moveTo(shape.width / 2, 0);
      ctx.lineTo(-shape.width / 2, -shape.height / 2);
      ctx.lineTo(-shape.width / 2, shape.height / 2);
      ctx.closePath();
      ctx.fill();
    } else if (shape.type === 'rectangle') {
      ctx.fillStyle = shape.color;
      ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
    } else if (shape.type === 'arch') {
      ctx.fillStyle = shape.color;
      ctx.beginPath();
      ctx.arc(0, 0, shape.width / 2, Math.PI, 0, false);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    } else if (shape.type === 'line') {
      ctx.fillStyle = shape.color;
      ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
    } else if (shape.type === 'diamond') {
      ctx.fillStyle = shape.color;
      ctx.beginPath();
      ctx.moveTo(0, -shape.height / 2);
      ctx.lineTo(shape.width / 2, 0);
      ctx.lineTo(0, shape.height / 2);
      ctx.lineTo(-shape.width / 2, 0);
      ctx.closePath();
      ctx.fill();
    } else if (shape.type === 'polygon') {
      ctx.fillStyle = shape.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = shape.radius * Math.cos(angle);
        const y = shape.radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (shape.type === 'hexagon') {
      ctx.fillStyle = shape.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6;
        const x = shape.radius * Math.cos(angle);
        const y = shape.radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    if (isSelected) {
      ctx.strokeStyle = '#a8d5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      // Fix for semicircle bottom border when selected
      if (shape.type === 'arch') {
        const padding = 8;
        const rectLeft = -shape.width / 2 - padding;
        const rectRight = shape.width / 2 + padding;
        const bottomY = padding; // move bottom line down by padding pixels
        const arcRadius = shape.width / 2 + padding;

        ctx.beginPath();
        // bottom horizontal line with padding below the arc
        ctx.moveTo(rectLeft, bottomY);
        ctx.lineTo(rectRight, bottomY);
        // arc with increased radius to create padding
        ctx.arc(0, 0, arcRadius, 0, Math.PI, true);
        ctx.closePath();
        ctx.stroke();
      }

      else if (shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'hexagon') {
        ctx.beginPath();
        ctx.arc(0, 0, shape.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape.type === 'rectangle' || shape.type === 'line' || shape.type === 'diamond') {
        ctx.strokeRect(-shape.width / 2 - 6, -shape.height / 2 - 6, shape.width + 12, shape.height + 12);
      } else if (shape.type === 'triangle-right') {
        ctx.strokeRect(-shape.width / 2 - 6, -shape.height / 2 - 6, shape.width + 12, shape.height + 12);
      }

      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvasShapes.forEach((shape) => {
      drawShape(ctx, shape, shape.id === selectedShapeId);
    });
  };

  useEffect(() => {
    drawCanvas();
  }, [canvasShapes, selectedShapeId]);

  const handleDragStart = (e, shapeTemplate) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('shapeTemplate', JSON.stringify(shapeTemplate));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const shapeTemplate = JSON.parse(e.dataTransfer.getData('shapeTemplate'));

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newShapeId = `${shapeTemplate.id}-${Date.now()}`;
    let newShape = {
      ...shapeTemplate,
      id: newShapeId,
      x,
      y,
      rotation: 0,
    };

    newShape = constrainShapePosition(newShape);

    const newShapes = [...canvasShapes, newShape];
    addToHistory(newShapes);
    setSelectedShapeId(newShapeId);
  };

  const isPointInShape = (px, py, shape) => {
    const dx = px - shape.x;
    const dy = py - shape.y;

    const angle = -(shape.rotation * Math.PI) / 180;
    const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

    if (shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'hexagon') {
      const distance = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
      return distance <= shape.radius + 10;
    } else if (shape.type === 'triangle-right') {
      return (
        rotatedX >= -shape.width / 2 - 10 &&
        rotatedX <= shape.width / 2 + 10 &&
        rotatedY >= -shape.height / 2 - 10 &&
        rotatedY <= shape.height / 2 + 10
      );
    } else if (shape.type === 'rectangle' || shape.type === 'line' || shape.type === 'diamond') {
      return (
        rotatedX >= -shape.width / 2 - 10 &&
        rotatedX <= shape.width / 2 + 10 &&
        rotatedY >= -shape.height / 2 - 10 &&
        rotatedY <= shape.height / 2 + 10
      );
    } else if (shape.type === 'arch') {
      const archRadius = shape.width / 2;
      return (
        rotatedX >= -archRadius - 10 &&
        rotatedX <= archRadius + 10 &&
        rotatedY >= -archRadius - 10 &&
        rotatedY <= 10
      );
    }

    return false;
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let clickedShape = null;

    for (let i = canvasShapes.length - 1; i >= 0; i--) {
      const shape = canvasShapes[i];
      if (isPointInShape(x, y, shape)) {
        clickedShape = shape.id;
        break;
      }
    }

    setSelectedShapeId(clickedShape);
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let clickedShape = null;

    // Find if mouse is on a shape
    for (let i = canvasShapes.length - 1; i >= 0; i--) {
      const shape = canvasShapes[i];
      if (isPointInShape(x, y, shape)) {
        clickedShape = shape.id;
        break;
      }
    }

    // If clicked on a shape, select it and start dragging
    if (clickedShape) {
      setSelectedShapeId(clickedShape);
      const shape = canvasShapes.find((s) => s.id === clickedShape);
      setDragOffset({ x: x - shape.x, y: y - shape.y });
      setIsDraggingCanvas(true);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDraggingCanvas || !selectedShapeId) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let newShapes = canvasShapes.map((shape) =>
      shape.id === selectedShapeId
        ? { ...shape, x: x - dragOffset.x, y: y - dragOffset.y }
        : shape
    );

    newShapes = newShapes.map((shape) =>
      shape.id === selectedShapeId ? constrainShapePosition(shape) : shape
    );

    setCanvasShapes(newShapes);
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingCanvas) {
      addToHistory(canvasShapes);
    }
    setIsDraggingCanvas(false);
  };

  const handleRotate = () => {
    if (!selectedShapeId) return;

    const newShapes = canvasShapes.map((shape) =>
      shape.id === selectedShapeId
        ? { ...shape, rotation: (shape.rotation + 15) % 360 }
        : shape
    );

    addToHistory(newShapes);
  };

  const handleReset = () => {
    addToHistory([]);
    setSelectedShapeId(null);
  };

  const renderShapePreview = (shape) => {
    const size = 70;

    if (shape.type === 'circle') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="28" fill={shape.color} />
        </svg>
      );
    } else if (shape.type === 'triangle-right') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <polygon points="50,35 20,12 20,58" fill={shape.color} />
        </svg>
      );
    } else if (shape.type === 'rectangle') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <rect x="12" y="20" width="46" height="30" fill={shape.color} />
        </svg>
      );
    } else if (shape.type === 'arch') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <path d="M 15 50 A 20 20 0 0 1 55 50 Z" fill={shape.color} />
        </svg>
      );
    } else if (shape.type === 'line') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <rect x="12" y="32" width="46" height="6" fill={shape.color} />
        </svg>
      );
    } else if (shape.type === 'diamond') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <polygon points="35,12 58,35 35,58 12,35" fill={shape.color} />
        </svg>
      );
    } else if (shape.type === 'polygon') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <polygon points="35,10 60,28 55,58 15,58 10,28" fill={shape.color} />
        </svg>
      );
    } else if (shape.type === 'hexagon') {
      return (
        <svg width={size} height={size} viewBox="0 0 70 70">
          <polygon points="35,12 58,22 58,48 35,58 12,48 12,22" fill={shape.color} />
        </svg>
      );
    }
  };

  const ShapeItem = ({ shape }) => {
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, shape)}
        className="shapeDragItem"
        title={shape.label}
      >
        {renderShapePreview(shape)}
      </div>
    );
  };

  return (
    <div className="shapeDragDropRoot">
      <div className="shapeSidebarLeft">
        <h3 className="shapeTitle">Shapes</h3>
        {sidebarShapes.left.map((shape) => (
          <ShapeItem key={shape.id} shape={shape} />
        ))}
      </div>

      <div className="shapeCanvasWrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="shapeCanvas"
        />
      </div>

      <div className="shapeSidebarRight">
        <h3 className="shapeTitle">Shapes</h3>
        {sidebarShapes.right.map((shape) => (
          <ShapeItem key={shape.id} shape={shape} />
        ))}
      </div>

      <div className="shapeControlPanel">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="shapeButtonUndo"
          title="Ctrl+Z"
        >
          ↶ Undo
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="shapeButtonRedo"
          title="Ctrl+Y"
        >
          ↷ Redo
        </button>
        <button
          onClick={handleRotate}
          disabled={!selectedShapeId}
          className="shapeButtonRotate"
        >
          ↻ Rotate
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedShapeId}
          className="shapeButtonDelete"
          title="Delete key"
        >
          🗑 Delete
        </button>
        <button
          onClick={handleReset}
          className="shapeButtonReset"
        >
          ⟲ Reset
        </button>
      </div>
    </div>
  );
};

export default ShapeDragDrop;
