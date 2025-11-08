const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const RoomManager = require('./rooms');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const roomManager = new RoomManager();
const drawingState = new DrawingState();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Route for root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        rooms: roomManager.getRoomCount(),
        totalUsers: roomManager.getTotalUsers()
    });
});

wss.on('connection', (ws, req) => {
    console.log(' New client connected');
    
    let currentRoom = null;
    let currentUser = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(' Received:', data.type, 'from user:', currentUser ? currentUser.name : 'unknown');
            handleMessage(ws, data);
        } catch (error) {
            console.error(' Error parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    function handleMessage(ws, data) {
        switch (data.type) {
            case 'join-room':
                handleJoinRoom(ws, data);
                break;

            case 'draw-start':
            case 'draw-move':
            case 'draw-end':
                handleDrawingOperation(ws, data);
                break;

            case 'cursor-move':
                handleCursorMove(ws, data);
                break;

            case 'undo':
            case 'redo':
                handleUndoRedo(ws, data);
                break;

            case 'clear-canvas':
                handleClearCanvas(ws, data);
                break;

            case 'debug-state':
                handleDebugState(ws, data);
                break;

            default:
                console.log(' Unknown message type:', data.type);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Unknown message type: ${data.type}`
                }));
        }
    }

    function handleJoinRoom(ws, data) {
        currentRoom = data.roomId || 'default';
        currentUser = {
            id: data.userId,
            name: data.userName,
            color: data.color
        };
        
        console.log(` User ${currentUser.name} (${currentUser.id}) joining room ${currentRoom}`);
        
        roomManager.joinRoom(currentRoom, ws, currentUser);
        drawingState.initializeRoom(currentRoom);
        
        // Send current canvas state to new user
        const initialState = drawingState.getRoomState(currentRoom);
        ws.send(JSON.stringify({
            type: 'canvas-state',
            data: initialState
        }));
        
        // Notify others about new user
        broadcastToRoom(currentRoom, {
            type: 'user-joined',
            user: currentUser
        }, ws);

        console.log(` User ${currentUser.name} joined room ${currentRoom}`);
    }

    function handleDrawingOperation(ws, data) {
        if (!currentUser || !currentRoom) {
            console.log(' Drawing operation rejected - user not in room');
            return;
        }

        // Add operation to history with user info
        const operation = {
            ...data,
            userId: currentUser.id,
            userName: currentUser.name,
            timestamp: Date.now(),
            operationId: data.operationId || generateId()
        };
        
        drawingState.addOperation(currentRoom, operation);
        
        // Broadcast to all other users in the room
        broadcastToRoom(currentRoom, operation, ws);
        
        console.log(` ${data.type} from ${currentUser.name} in ${currentRoom}`);
    }

    function handleCursorMove(ws, data) {
        if (!currentUser || !currentRoom) {
            return;
        }

        // Broadcast cursor position to all other users
        broadcastToRoom(currentRoom, {
            type: 'cursor-update',
            userId: currentUser.id,
            position: data.position,
            user: currentUser
        }, ws);
    }

    function handleUndoRedo(ws, data) {
        if (!currentUser || !currentRoom) {
            console.log(' Undo/redo rejected - user not in room');
            ws.send(JSON.stringify({
                type: 'operation-failed',
                action: data.type,
                reason: 'not_joined'
            }));
            return;
        }

        console.log(` ${data.type.toUpperCase()} request from ${currentUser.name}`);
        
        const undoRedoResult = drawingState.performUndoRedo(currentRoom, data.type, currentUser.id);
        
        if (undoRedoResult) {
            console.log(` ${data.type} successful`);
            // Broadcast to ALL users including the one who requested it
            broadcastToRoom(currentRoom, undoRedoResult);
        } else {
            console.log(` ${data.type} failed - no operations`);
            ws.send(JSON.stringify({
                type: 'operation-failed',
                action: data.type,
                reason: 'no_operations'
            }));
        }
    }

    function handleClearCanvas(ws, data) {
        if (!currentUser || !currentRoom) {
            return;
        }

        console.log(` Clear canvas request from ${currentUser.name}`);
        drawingState.clearCanvas(currentRoom);
        
        broadcastToRoom(currentRoom, {
            type: 'canvas-cleared',
            userId: currentUser.id,
            userName: currentUser.name
        });
        
        console.log(` Canvas cleared by ${currentUser.name}`);
    }

    function handleDebugState(ws, data) {
        if (!currentRoom) return;
        
        console.log(' Debug state request from:', currentUser ? currentUser.name : 'unknown');
        drawingState.debugState(currentRoom);
        
        // Send debug info back to client
        ws.send(JSON.stringify({
            type: 'debug-response',
            message: 'Debug info printed in server console',
            room: currentRoom,
            userCount: roomManager.getRoomUserCount(currentRoom)
        }));
    }

    function broadcastToRoom(roomId, message, excludeWs = null) {
        const users = roomManager.getRoomUsers(roomId);
        let sentCount = 0;
        
        users.forEach(user => {
            if (user.ws !== excludeWs && user.ws.readyState === WebSocket.OPEN) {
                user.ws.send(JSON.stringify(message));
                sentCount++;
            }
        });
        
        console.log(` Broadcast ${message.type} to ${sentCount} users in ${roomId}`);
    }

    ws.on('close', (code, reason) => {
        console.log(` Client disconnected. Code: ${code}, Reason: ${reason}`);
        
        if (currentRoom && currentUser) {
            roomManager.leaveRoom(currentRoom, ws);
            broadcastToRoom(currentRoom, {
                type: 'user-left',
                userId: currentUser.id,
                userName: currentUser.name
            });
            
            console.log(` User ${currentUser.name} left room ${currentRoom}`);
        }
    });

    ws.on('error', (error) => {
        console.error(' WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to collaborative canvas server',
        timestamp: new Date().toISOString()
    }));
});

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(' Shutting down server gracefully...');
    wss.close(() => {
        console.log(' WebSocket server closed');
        server.close(() => {
            console.log(' HTTP server closed');
            process.exit(0);
        });
    });
});

process.on('SIGTERM', () => {
    console.log(' Received SIGTERM, shutting down...');
    wss.close();
    server.close();
});

// Error handling for server
server.on('error', (error) => {
    console.error(' Server error:', error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(' Server running on http://localhost:' + PORT);
    console.log(' Health check available at http://localhost:' + PORT + '/health');
    console.log(' Collaborative Canvas ready for connections!');
});

