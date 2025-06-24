import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useSocket } from '../socket/Socket';

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: #f5f6fa;
  border-left: 1px solid #2c2f40;
  min-width: 340px;
`;

const TabContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #222;
  border-bottom: 1px solid #333;
  height: 60px;
  position: relative;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.4rem;
  color: #888;
  cursor: pointer;
  transition: color 0.2s ease;

  position: absolute;
  right: 40px;

  &:hover {
    color: #fff;
  }

  &::before {
    content: "✕";
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 12px;
  margin: 15px;
  background: #1c1c1c;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  margin-bottom: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #444;
  }
`;

const Message = styled.div`
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #2a2c3a;
  color: #f1f1f1;
  border-radius: 16px;
  max-width: 75%;
  align-self: ${({ $isOwn }) => ($isOwn ? 'flex-end' : 'flex-start')};
  word-wrap: break-word;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  position: relative;

  ${({ $isOwn }) =>
    $isOwn
      ? `
    border-bottom-right-radius: 4px;
    border-top-right-radius: 4px;
  `
      : `
    border-bottom-left-radius: 4px;
    border-top-left-radius: 4px;
  `}

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    ${({ $isOwn }) => ($isOwn ? 'right: -6px;' : 'left: -6px;')}
    width: 0;
    height: 0;
    border: 6px solid transparent;
    ${({ $isOwn }) =>
      $isOwn
        ? 'border-left-color: #2a2c3a; border-right: 0; margin-bottom: 2px;'
        : 'border-right-color: #2a2c3a; border-left: 0; margin-bottom: 2px;'}
  }
`;

const MessageHeader = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  color: #8bc4ff; /* Username color (cool teal/blue) */
`;


const MessageContent = styled.div`
  font-size: 0.92rem;
  line-height: 1.4;
`;

const ChatInputContainer = styled.div`
  display: flex;
  gap: 10px;
  padding: 0 8px;
  margin-top: 6px;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #444;
  background: #1f1f1f;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #eee;
  outline: none;

  &:focus {
    border-color: #3fc177;
    box-shadow: 0 0 0 2px rgba(63, 193, 119, 0.15);
  }

  &::placeholder {
    color: #777;
  }
`;

const SendButton = styled.button`
  padding: 10px 16px;
  background: #3fc177;
  color: #111;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.2s;

  &:hover {
    background: #34b36b;
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
  }
`;

const TypingIndicator = styled.div`
  font-size: 0.8rem;
  color: #aab4f9;
  font-style: italic;
  padding-left: 10px;
  margin-bottom: 6px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #777;
`;

function Sidebar({ users, roomId, currentUsername, onClose, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const { socket, sendMessage } = useSocket();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (messageData) => {
      setMessages(prev => {
        if (onNewMessage && prev.length > 0) onNewMessage();
        return [...prev, messageData];
      });
    });

    socket.on('room-joined', (data) => {
      if (data.messages) setMessages(data.messages);
    });

    socket.on('user-typing', (data) => {
      if (data.username !== currentUsername) {
        setTypingUsers(prev => new Set(prev).add(data.username));
      }
    });

    socket.on('user-stop-typing', (data) => {
      if (data.username !== currentUsername) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.username);
          return newSet;
        });
      }
    });

    return () => {
      socket.off('receive-message');
      socket.off('room-joined');
      socket.off('user-typing');
      socket.off('user-stop-typing');
    };
  }, [socket, currentUsername, onNewMessage]);

  const handleSendMessage = () => {
    if (newMessage.trim() && sendMessage) {
      sendMessage(newMessage.trim(), currentUsername, roomId);
      setNewMessage('');
      setIsTyping(false);
      socket?.emit('stop-typing', { roomId, username: currentUsername });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', { roomId, username: currentUsername });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('stop-typing', { roomId, username: currentUsername });
    }, 1000);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    return diffInHours < 24
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;
    const users = Array.from(typingUsers);
    const text = users.length === 1
      ? `${users[0]} is typing...`
      : `${users[0]} and ${users.length - 1} other(s) are typing...`;
    return <TypingIndicator>{text}</TypingIndicator>;
  };

  return (
    <SidebarContainer>
      <TabContainer>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'absolute', left: '16px' }}>
          <span role="img" aria-label="chat" style={{ fontSize: '1.2rem' }}>💬</span>
          <h2 style={{ color: '#aab4f9', fontSize: '1.05rem', fontWeight: '600', margin: 0 }}>Chats</h2>
        </div>
        <CloseButton onClick={onClose} />
      </TabContainer>

      <ContentArea>
        <ChatContainer>
          <MessagesContainer>
            {messages.length === 0 ? (
              <EmptyState>
                <div>No messages yet</div>
                <div style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                  Start the conversation!
                </div>
              </EmptyState>
            ) : (
              <>
                {messages.map((message, index) => {
  const isOwn = message.username === currentUsername;
  return (
    <Message
      key={index}
      $isOwn={isOwn}
      style={{
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
        marginLeft: isOwn ? 'auto' : '0'
      }}
    >
      <MessageHeader>
        <span>{message.username}</span>
        <span>{formatTime(message.timestamp)}</span>
      </MessageHeader>
      <MessageContent>{message.message}</MessageContent>
    </Message>
  );
})}

                {renderTypingIndicator()}
                <div ref={messagesEndRef} />
              </>
            )}
          </MessagesContainer>

          <ChatInputContainer>
            <ChatInput
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              maxLength={500}
            />
            <SendButton onClick={handleSendMessage} disabled={!newMessage.trim()}>
              Send
            </SendButton>
          </ChatInputContainer>
        </ChatContainer>
      </ContentArea>
    </SidebarContainer>
  );
}

export default Sidebar;
