import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import Home from './components/Login';
import Whiteboard from './components/Whiteboard';
import { SocketProvider } from './socket/Socket';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a, #2e2e2e 100%);
`;

function App() {
  return (
    <SocketProvider>
      <AppContainer>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/whiteboard/:roomId" element={<Whiteboard />} />
          </Routes>
        </Router>
      </AppContainer>
    </SocketProvider>
  );
}

export default App; 