import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../socket/Socket';

const HomeContainer = styled.div`
  position: relative;
  min-height: 100vh;
  background: url('https://img.freepik.com/free-photo/colorful-school-accessories-corner-white-background_23-2148050642.jpg') center center / cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.7); /* soft white overlay */
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 40px 36px;
  width: 100%;
  max-width: 460px;
  text-align: center;
  color: #333;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 2.4rem;
  font-weight: 800;
  color: #1e3a5f;
  margin-bottom: 12px;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #4b5563;
  opacity: 0.85;
  margin-bottom: 28px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
`;

const Label = styled.label`
  color: #374151;
  font-weight: 600;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 12px 16px;
  font-size: 1rem;
  background: #f9fafb;
  border: 2px solid #d1d5db;
  border-radius: 10px;
  color: #1f2937;
  transition: border 0.3s ease;

  &:focus {
    border-color: #3b82f6;
    outline: none;
    background: #fff;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
`;

const Button = styled.button`
  background: #3b82f6; /* solid blue */
  color: white;
  padding: 13px;
  font-size: 1.05rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    background: #2563eb; /* darker blue on hover */
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: #93c5fd;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;




function Home() {
  const navigate = useNavigate();
  const { isConnected, joinRoom } = useSocket();
  const [mode, setMode] = useState('join');

  const [createData, setCreateData] = useState({
    username: '',
    isPrivate: false,
    password: '',
    passwordConfirm: ''
  });

  const [joinData, setJoinData] = useState({
    username: '',
    roomId: '',
    password: ''
  });

  const handleCreateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCreateData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleJoinChange = (e) => {
    const { name, value } = e.target;
    setJoinData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createData.username.trim()) {
      alert('Please enter a username');
      return;
    }
    if (createData.isPrivate) {
      if (!createData.password.trim()) {
        alert('Please enter a password for private room');
        return;
      }
      if (createData.password !== createData.passwordConfirm) {
        alert('Passwords do not match');
        return;
      }
    }
    try {
      const res = await fetch(
        (process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000') + '/api/rooms',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Room ${Math.random().toString(36).substring(2, 10)}`,
            isPrivate: createData.isPrivate,
            password: createData.isPrivate ? createData.password : ''
          })
        }
      );
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to create room');
        return;
      }
      const room = await res.json();
      localStorage.setItem('username', createData.username);
      joinRoom(room.roomId, createData.username, createData.isPrivate, createData.password);
      navigate(`/whiteboard/${room.roomId}`);
    } catch (error) {
      alert('Failed to create room');
    }
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinData.username.trim()) {
      alert('Please enter a username');
      return;
    }
    if (!joinData.roomId.trim()) {
      alert('Please enter a Room ID');
      return;
    }
    localStorage.setItem('username', joinData.username);
    joinRoom(joinData.roomId.trim(), joinData.username, !!joinData.password, joinData.password);
    navigate(`/whiteboard/${joinData.roomId.trim()}`);
  };

  const handleQuickJoin = () => {
    const username = `User${Math.floor(Math.random() * 1000)}`;
    const roomId = generateRoomId();
    joinRoom(roomId, username);
    navigate(`/whiteboard/${roomId}`);
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  return (
    <HomeContainer>
      <Card>
        <Title>CollabBoard</Title>
        <Subtitle>Brainstorm. Sketch. Build—Together.</Subtitle>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
          <Button onClick={() => setMode('join')}>Join Room</Button>
          <Button onClick={() => setMode('create')}>Create Room</Button>
        </div>
        {mode === 'join' ? (
          <Form onSubmit={handleJoinSubmit}>
            <InputGroup>
              <Label htmlFor="join-username">Your Name</Label>
              <Input
                type="text"
                id="join-username"
                name="username"
                value={joinData.username}
                onChange={handleJoinChange}
                placeholder="Enter your name"
                required
              />
            </InputGroup>
            <InputGroup>
              <Label htmlFor="roomId">Room ID</Label>
              <Input
                type="text"
                id="roomId"
                name="roomId"
                value={joinData.roomId}
                onChange={handleJoinChange}
                placeholder="Enter Room ID"
                required
              />
            </InputGroup>
            <InputGroup>
              <Label htmlFor="join-password">Room Password (if private)</Label>
              <Input
                type="password"
                id="join-password"
                name="password"
                value={joinData.password}
                onChange={handleJoinChange}
                placeholder="Enter room password"
              />
            </InputGroup>
            <Button type="submit" disabled={!isConnected}>Join Room</Button>
          </Form>
        ) : (
          <Form onSubmit={handleCreateSubmit}>
            <InputGroup>
              <Label htmlFor="create-username">Your Name</Label>
              <Input
                type="text"
                id="create-username"
                name="username"
                value={createData.username}
                onChange={handleCreateChange}
                placeholder="Enter your name"
                required
              />
            </InputGroup>
            <CheckboxGroup>
              <Checkbox
                type="checkbox"
                id="isPrivate"
                name="isPrivate"
                checked={createData.isPrivate}
                onChange={handleCreateChange}
              />
              <Label htmlFor="isPrivate">Private Room</Label>
            </CheckboxGroup>
            {createData.isPrivate && (
              <>
                <InputGroup>
                  <Label htmlFor="create-password">Room Password</Label>
                  <Input
                    type="password"
                    id="create-password"
                    name="password"
                    value={createData.password}
                    onChange={handleCreateChange}
                    placeholder="Enter room password"
                    required
                  />
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="create-password-confirm">Confirm Password</Label>
                  <Input
                    type="password"
                    id="create-password-confirm"
                    name="passwordConfirm"
                    value={createData.passwordConfirm}
                    onChange={handleCreateChange}
                    placeholder="Confirm room password"
                    required
                  />
                </InputGroup>
              </>
            )}
            <Button type="submit" disabled={!isConnected}>Create Room</Button>
          </Form>
        )}
      </Card>
    </HomeContainer>
  );
}

export default Home;
