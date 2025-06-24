import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;

const Canvas = forwardRef(({ 
  tool = 'pen', 
  color = '#000000', 
  brushSize = 2, 
  opacity = 1,
  onDrawEvent,
  onDrawStart,
  onDrawEnd,
  remoteDrawEvent,
  undoStack,
  redoStack
}, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const startPoint = useRef(null);
  const snapshot = useRef(null);
  const localUndoStack = useRef([]);
  const localRedoStack = useRef([]);
  const currentStroke = useRef([]); 

  // For smoother drawing, use requestAnimationFrame
  const lastDraw = useRef(null);
  const pendingDraw = useRef(null);

  // Expose imperative methods

  useImperativeHandle(ref, () => ({
    exportImage: () => {
      return canvasRef.current.toDataURL('image/png');
    },
    exportPDF: async () => {
      const jsPDF = (await import('jspdf')).jsPDF;
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape' });
      pdf.addImage(dataUrl, 'PNG', 10, 10, 280, 160);
      return pdf;
    },
    clear: () => {
      clearCanvas();
    },
    undo: () => {
      handleUndo();
    },
    redo: () => {
      handleRedo();
    },
    loadImageFromDataUrl: (dataUrl) => {
      const img = new window.Image();
      img.onload = () => {
        ctxRef.current.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctxRef.current.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        localUndoStack.current = [ctxRef.current.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)];
        localRedoStack.current = [];
      };
      img.src = dataUrl;
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctxRef.current = canvas.getContext('2d');
    ctxRef.current.lineCap = 'round';
    ctxRef.current.lineJoin = 'round';
    ctxRef.current.globalAlpha = opacity;
  }, [opacity]);

  // Handle remote draw events
  useEffect(() => {
    if (!remoteDrawEvent) return;
    if (remoteDrawEvent.type === 'stroke' && remoteDrawEvent.points) {
      drawStroke(remoteDrawEvent.points, remoteDrawEvent);
    } else if (remoteDrawEvent.type === 'draw') {
      drawLine(remoteDrawEvent.prev, remoteDrawEvent.current, remoteDrawEvent);
    } else if (remoteDrawEvent.type === 'shape') {
      drawShape(remoteDrawEvent);
    } else if (remoteDrawEvent.type === 'text') {
      drawText(remoteDrawEvent);
    } else if (remoteDrawEvent.type === 'clear') {
      clearCanvas();
    }
  }, [remoteDrawEvent]);

  const getPointer = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Pointer events have a consistent API for coordinates
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    drawing.current = true;
    const point = getPointer(e);
    startPoint.current = point;
    snapshot.current = ctxRef.current.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    currentStroke.current = [point]; 
    if (tool === 'pen' || tool === 'eraser') {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(point.x, point.y);
      ctxRef.current.strokeStyle = tool === 'eraser' ? '#fff' : color;
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.globalAlpha = opacity;
      if (onDrawStart) onDrawStart(point);
    }
  };

  const smoothDrawLine = (from, to, settings) => {
    if (lastDraw.current) cancelAnimationFrame(lastDraw.current);
    pendingDraw.current = { from, to, settings };
    lastDraw.current = requestAnimationFrame(() => {
      drawLine(from, to, settings);
      pendingDraw.current = null;
    });
  };

  const emitDrawEvent = (drawData) => {
    if (onDrawEvent) onDrawEvent(drawData);
  };

  const handlePointerMove = (e) => {
    if (!drawing.current) return;
    const point = getPointer(e);
    if (tool === 'pen' || tool === 'eraser') {
      ctxRef.current.lineTo(point.x, point.y);
      ctxRef.current.strokeStyle = tool === 'eraser' ? '#fff' : color;
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.globalAlpha = opacity;
      ctxRef.current.stroke();
      currentStroke.current.push(point); 
      startPoint.current = point;
    } else if (tool === 'rectangle' || tool === 'circle') {
      ctxRef.current.putImageData(snapshot.current, 0, 0);
      ctxRef.current.strokeStyle = color;
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.globalAlpha = opacity;
      if (tool === 'rectangle') {
        const width = point.x - startPoint.current.x;
        const height = point.y - startPoint.current.y;
        ctxRef.current.strokeRect(startPoint.current.x, startPoint.current.y, width, height);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(point.x - startPoint.current.x, 2) + Math.pow(point.y - startPoint.current.y, 2));
        ctxRef.current.beginPath();
        ctxRef.current.arc(startPoint.current.x, startPoint.current.y, radius, 0, 2 * Math.PI);
        ctxRef.current.stroke();
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    const point = getPointer(e);
    if (tool === 'rectangle' || tool === 'circle') {
      handlePointerMove(e);
    
      if (onDrawEvent) {
        onDrawEvent({
          type: 'shape',
          shape: tool,
          start: startPoint.current,
          end: point,
          color,
          brushSize,
          opacity,
          canvasData: canvasRef.current.toDataURL('image/png')
        });
      }
    }
    localUndoStack.current.push(ctxRef.current.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
    localRedoStack.current = [];
    if (onDrawEnd) onDrawEnd(point);
   
    if ((tool === 'pen' || tool === 'eraser') && currentStroke.current.length > 1) {
      if (onDrawEvent) {
        onDrawEvent({
          type: 'stroke',
          points: currentStroke.current,
          tool,
          color,
          brushSize,
          opacity,
          canvasData: canvasRef.current.toDataURL('image/png')
        });
      }
    } else if (tool !== 'rectangle' && tool !== 'circle' && onDrawEvent) {
    
      onDrawEvent({
        type: 'end',
        canvasData: canvasRef.current.toDataURL('image/png'),
        tool,
        color,
        brushSize,
        opacity
      });
    }
    currentStroke.current = [];
  };

  const handleDoubleClick = (e) => {
    if (tool === 'text') {
      const point = getPointer(e);
      const text = prompt('Enter text:');
      if (text) {
        ctxRef.current.font = `${brushSize * 6}px Arial`;
        ctxRef.current.fillStyle = color;
        ctxRef.current.globalAlpha = opacity;
        ctxRef.current.fillText(text, point.x, point.y);
        localUndoStack.current.push(ctxRef.current.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
        localRedoStack.current = [];
    
        if (onDrawEvent) {
          onDrawEvent({
            type: 'text',
            text,
            point,
            color,
            brushSize,
            opacity,
            canvasData: canvasRef.current.toDataURL('image/png')
          });
        }
      }
    }
  };

  const drawLine = (from, to, settings) => {
    ctxRef.current.save();
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(from.x, from.y);
    ctxRef.current.lineTo(to.x, to.y);
    ctxRef.current.strokeStyle = settings.tool === 'eraser' ? '#fff' : settings.color;
    ctxRef.current.lineWidth = settings.brushSize;
    ctxRef.current.globalAlpha = settings.opacity;
    ctxRef.current.stroke();
    ctxRef.current.restore();
  };

  const clearCanvas = () => {
    ctxRef.current.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    localUndoStack.current.push(ctxRef.current.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
    localRedoStack.current = [];
  };

  const handleUndo = () => {
    if (localUndoStack.current.length > 1) {
      localRedoStack.current.push(localUndoStack.current.pop());
      const prev = localUndoStack.current[localUndoStack.current.length - 1];
      ctxRef.current.putImageData(prev, 0, 0);
    }
  };

  const handleRedo = () => {
    if (localRedoStack.current.length > 0) {
      const redoImg = localRedoStack.current.pop();
      ctxRef.current.putImageData(redoImg, 0, 0);
      localUndoStack.current.push(redoImg);
    }
  };

  // Initialize undo stack on mount
  useEffect(() => {
    localUndoStack.current = [ctxRef.current.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)];
    localRedoStack.current = [];
  }, []);

  // Draw a full stroke from array of points
  const drawStroke = (points, settings) => {
    if (!points || points.length < 2) return;
    ctxRef.current.save();
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctxRef.current.lineTo(points[i].x, points[i].y);
    }
    ctxRef.current.strokeStyle = settings.tool === 'eraser' ? '#fff' : settings.color;
    ctxRef.current.lineWidth = settings.brushSize;
    ctxRef.current.globalAlpha = settings.opacity;
    ctxRef.current.stroke();
    ctxRef.current.restore();
  };

  // Draw a shape (rectangle or circle) from event data
  const drawShape = (event) => {
    const { shape, start, end, color, brushSize, opacity } = event;
    ctxRef.current.save();
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = brushSize;
    ctxRef.current.globalAlpha = opacity;
    if (shape === 'rectangle') {
      const width = end.x - start.x;
      const height = end.y - start.y;
      ctxRef.current.strokeRect(start.x, start.y, width, height);
    } else if (shape === 'circle') {
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      ctxRef.current.beginPath();
      ctxRef.current.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      ctxRef.current.stroke();
    }
    ctxRef.current.restore();
  };

  // Draw text from event data
  const drawText = (event) => {
    const { text, point, color, brushSize, opacity } = event;
    ctxRef.current.save();
    ctxRef.current.font = `${brushSize * 6}px Arial`;
    ctxRef.current.fillStyle = color;
    ctxRef.current.globalAlpha = opacity;
    ctxRef.current.fillText(text, point.x, point.y);
    ctxRef.current.restore();
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
          margin: 24,
          cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          display: 'block',
          width: '100%',
          height: 'auto',
          maxWidth: '100%',
          maxHeight: '80vh',
          objectFit: 'contain',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
});

export default Canvas; 