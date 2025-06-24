import React from 'react';
import styled from 'styled-components';
import { SketchPicker } from 'react-color';

const ToolbarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 160px;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  gap: 16px;
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.6);
  z-index: 100;
`;

const ToolButton = styled.button`
  width: 100%;
  padding: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  border: none;
  border-radius: 10px;
  background: ${props =>
    props.$active
      ? 'linear-gradient(135deg, #3fc177, #2f9c5d)'
      : '#2e2e2e'};
  color: ${props => (props.$active ? '#ffffff' : '#cfcfcf')};
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    background: ${props =>
      props.$active
        ? 'linear-gradient(135deg, #39b56f, #298a52)'
        : '#3b3b3b'};
    transform: scale(1.02);
    box-shadow: 0 0 6px rgba(60, 255, 180, 0.2);
  }
`;

const ColorBox = styled.div`
  width: 120px;
  height: 30px;
  border-radius: 6px;
  border: 2px solid #555;
  background: ${props => props.color};
  cursor: pointer;
  box-shadow: 0 0 4px rgba(255,255,255,0.15);
`;

const RangeInput = styled.input`
  width: 100%;
  cursor: pointer;
  background: transparent;
`;

const ExportButton = styled.button`
  width: 100%;
  padding: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  background: linear-gradient(135deg, #3fc177, #2f9c5d);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #38b26e, #28864f);
    transform: scale(1.03);
    box-shadow: 0 0 6px rgba(100, 255, 200, 0.3);
  }
`;

const BrushSizeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
`;

const BrushSizeLabel = styled.span`
  font-size: 0.8rem;
  color: #aaa;
`;

const BrushSizeValue = styled.span`
  font-size: 0.85rem;
  color: #fff;
  font-weight: 500;
`;

function Toolbar({ settings, onSettingsChange, onClear, onUndo, onRedo, onExportImage, onExportPDF }) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const handleToolChange = (tool) => {
    onSettingsChange({ ...settings, tool });
  };

  const handleColorChange = (color) => {
    onSettingsChange({ ...settings, color: color.hex });
  };

  const handleBrushSizeChange = (e) => {
    onSettingsChange({ ...settings, brushSize: parseInt(e.target.value, 10) });
  };

  return (
    <ToolbarContainer>
            <ToolButton $active={settings.tool === 'text'} onClick={() => handleToolChange('text')}>Text</ToolButton>
      <ToolButton $active={settings.tool === 'pen'} onClick={() => handleToolChange('pen')}>Sketch Pen</ToolButton>
      <ToolButton $active={settings.tool === 'eraser'} onClick={() => handleToolChange('eraser')}>Eraser</ToolButton>
      <ToolButton $active={settings.tool === 'rectangle'} onClick={() => handleToolChange('rectangle')}>Rectangle</ToolButton>
      <ToolButton $active={settings.tool === 'circle'} onClick={() => handleToolChange('circle')}>Circle</ToolButton>


      <div style={{ position: 'relative' }}>
        <ColorBox color={settings.color} onClick={() => setShowColorPicker(v => !v)} />
        {showColorPicker && (
          <div style={{ position: 'absolute', left: '150px', zIndex: 20 }}>
            <SketchPicker color={settings.color || '#000000'} onChange={handleColorChange} />
          </div>
        )}
      </div>

      <BrushSizeContainer>
        <BrushSizeLabel>Brush Size</BrushSizeLabel>
        <RangeInput
          type="range"
          min={1}
          max={30}
          value={settings.brushSize}
          onChange={handleBrushSizeChange}
        />
        <BrushSizeValue>{settings.brushSize}</BrushSizeValue>
      </BrushSizeContainer>

      <ToolButton onClick={onUndo}>Undo</ToolButton>
      <ToolButton onClick={onRedo}>Redo</ToolButton>
      <ToolButton onClick={onClear}>Clear</ToolButton>

      <ExportButton onClick={onExportImage}>Export PNG</ExportButton>
      <ExportButton onClick={onExportPDF}>Export PDF</ExportButton>
    </ToolbarContainer>
  );
}

export default Toolbar;
