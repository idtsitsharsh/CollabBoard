# CollabBoard – Real-Time Collaborative Whiteboard

**CollabBoard** is a web-based whiteboard built with the MERN stack and powered by Socket.IO to enable real-time, multi-user collaboration. It allows participants to draw, write, chat, and interact live on a shared canvas. Ideal for classrooms, remote teams, and brainstorming sessions, CollabBoard replicates the experience of a traditional whiteboard in the browser.

---

## Features

* **Live Multi-User Collaboration**
  Real-time drawing and messaging across all connected users using WebSockets.

* **Drawing Toolkit**

  * Freehand pen and eraser with adjustable size and opacity
  * Basic shapes including rectangles and circles
  * Text insertion and positioning directly on the canvas

* **Room-Based Access Control**

  * Public rooms can be accessed by anyone with a link
  * Private rooms are secured by passwords for restricted access

* **Chat Integration**
  Users can communicate with each other in real time via the built-in chat panel.

* **Undo and Redo**
  Navigate through drawing actions with full undo/redo support.

* **Canvas Management**

  * Clear canvas for all users
  * Customize brush color, size, and opacity for individual preferences

* **Export Options**
  Download the entire canvas as a PNG or PDF file for offline use or documentation.

---

## Technology Stack

| Layer    | Technology                                               |
| -------- | -------------------------------------------------------- |
| Frontend | React, HTML5 Canvas, Styled Components, Socket.IO Client |
| Backend  | Node.js, Express, Socket.IO                              |
| Database | MongoDB (via MongoDB Atlas)                              |
| Hosting  | Vercel (Frontend), Railway (Backend)                     |

---

## Project Structure

```
/
├── backend/              # Express server and WebSocket logic
│   ├── schemas/          # Mongoose models (e.g., Room schema)
│   └── server.js         # Backend entry point
└── frontend/             # React frontend
    ├── public/
    └── src/
        ├── components/   # Canvas, Toolbar, Chat, etc.
        ├── context/      # Socket.IO and application context
        └── App.js        # Main app component
```

---

## Getting Started Locally

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/CollabBoard.git
cd CollabBoard
```

### 2. Backend Setup

```bash
cd backend
npm install
# Create a .env file with the following content:
# PORT=5000
# MONGODB_URI=your_mongodb_connection_string
# FRONTEND_URL=http://localhost:3000
# JWT_SECRET=your_jwt_secret
npm start
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
# Create a .env file with:
# REACT_APP_SOCKET_URL=http://localhost:5000
npm start
```

Visit `http://localhost:3000` in your browser to begin using the app locally.

---

## Live Demo

* **Frontend (Vercel)**: [Live App on Vercel](https://collab-board-omega-nine.vercel.app/)
* **Backend (Railway)**: The backend is deployed and operational, but does not serve a UI.

---

## Future Enhancements

* Voice and video calling support
* Drawing history timeline with step-by-step replay
* Offline mode with local caching
* Zoom and pan on the canvas
* Real-time collaborative image annotations

---
