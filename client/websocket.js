class WebSocketClient {
    constructor() {
        this.ws = null;
        this.userId = this.generateUserId();
        this.userName = 'User_' + Math.random().toString(36).substr(2, 5);
        this.userColor = this.generateRandomColor();
        this.roomId = 'default';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.connect();
        this.setupEventListeners();
    }

    connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log(' Connecting to:', wsUrl);
            this.ws = new WebSocket(wsUrl);
            window.websocket = this.ws;
            
            this.ws.onopen = () => {
                console.log(' Connected to server');
                this.reconnectAttempts = 0;
                this.joinRoom();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error(' Error parsing message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log(' Disconnected from server');
                this.handleReconnection();
            };

            this.ws.onerror = (error) => {
                console.error(' WebSocket error:', error);
            };

        } catch (error) {
            console.error(' Failed to connect:', error);
        }
    }

    handleMessage(data) {
        console.log(' Received:', data.type);
        
        switch (data.type) {
            case 'canvas-state':
                console.log(' Loading canvas state with', data.data.operations.length, 'operations');
                if (window.undoRedoManager) {
                    window.undoRedoManager.initializeOperations(data.data.operations);
                    window.drawingCanvas.redrawAllOperations(data.data.operations);
                }
                break;

            case 'draw-start':
            case 'draw-move':
            case 'draw-end':
                console.log(' Remote drawing:', data.type);
                if (window.undoRedoManager) {
                    window.undoRedoManager.addRemoteOperation(data);
                }
                window.drawingCanvas.handleRemoteDraw(data);
                break;

            case 'cursor-update':
                window.drawingCanvas.updateRemoteCursor(data.userId, data.position, data.user);
                break;

            case 'user-joined':
                console.log(' User joined:', data.user.name);
                this.addUser(data.user);
                break;

            case 'user-left':
                console.log(' User left:', data.userId);
                this.removeUser(data.userId);
                window.drawingCanvas.removeRemoteCursor(data.userId);
                break;

            case 'operation-undo':
                console.log('↶ Remote undo for:', data.userId);
                if (window.undoRedoManager) {
                    const success = window.undoRedoManager.handleRemoteUndo(data.operationId);
                    if (success) {
                        // Redraw everything after undo
                        window.drawingCanvas.redrawAllOperations(window.undoRedoManager.getOperations());
                    }
                }
                break;

            case 'operation-redo':
                console.log('↷ Remote redo for:', data.userId);
                if (window.undoRedoManager && data.operation) {
                    window.undoRedoManager.handleRemoteRedo(data.operation);
                    // Redraw everything after redo
                    window.drawingCanvas.redrawAllOperations(window.undoRedoManager.getOperations());
                }
                break;

            case 'operation-failed':
                console.log(` ${data.action} failed`);
                if (data.action === 'undo') {
                    alert('Nothing to undo - you haven\'t drawn anything yet');
                } else if (data.action === 'redo') {
                    alert('Nothing to redo - you haven\'t undone anything yet');
                }
                break;

            case 'canvas-cleared':
                console.log(' Canvas cleared by user');
                if (window.undoRedoManager) {
                    window.undoRedoManager.clearOperations();
                }
                window.drawingCanvas.clearCanvas();
                break;

            case 'welcome':
                console.log(' Server welcome:', data.message);
                break;

            case 'debug-response':
                console.log(' Debug response:', data.message);
                break;

            case 'error':
                console.error(' Server error:', data.message);
                break;

            default:
                console.log(' Unknown message type:', data.type);
        }
    }

    joinRoom() {
        const joinMessage = {
            type: 'join-room',
            roomId: this.roomId,
            userId: this.userId,
            userName: this.userName,
            color: this.userColor
        };
        
        console.log(' Joining room:', joinMessage);
        this.send(joinMessage);
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log(' Sending:', message.type, message);
            this.ws.send(JSON.stringify(message));
        } else {
            console.log(' WebSocket not ready, cannot send:', message.type);
        }
    }

    setupEventListeners() {
        // User name input
        const userNameInput = document.getElementById('userName');
        userNameInput.value = this.userName;
        userNameInput.addEventListener('change', (e) => {
            this.userName = e.target.value || this.userName;
            console.log(' Username changed to:', this.userName);
        });

        // Change color button
        document.getElementById('changeColor').addEventListener('click', () => {
            this.userColor = this.generateRandomColor();
            console.log(' User color changed to:', this.userColor);
        });

        // Undo/Redo buttons
        document.getElementById('undoBtn').addEventListener('click', () => {
            console.log('↶ Undo button clicked');
            this.send({ type: 'undo' });
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            console.log('↷ Redo button clicked');
            this.send({ type: 'redo' });
        });

        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                console.log('Ctrl+Z - Undo');
                this.send({ type: 'undo' });
            }
            
            // Ctrl+Y for redo
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                console.log(' Ctrl+Y - Redo');
                this.send({ type: 'redo' });
            }
            
            // Ctrl+D for debug
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                console.log(' Debug shortcut pressed');
                if (window.undoRedoManager) {
                    window.undoRedoManager.debug();
                }
                if (window.drawingCanvas) {
                    window.drawingCanvas.debug();
                }
                this.debug();
            }
            
            // Ctrl+L for clear
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                console.log(' Clear shortcut pressed');
                if (confirm('Clear the entire canvas?')) {
                    window.drawingCanvas.clearCanvas();
                    this.send({ type: 'clear-canvas' });
                }
            }
        });
    }

    addUser(user) {
        const usersList = document.getElementById('usersList');
        
        // Check if user already exists
        if (document.getElementById(`user-${user.id}`)) {
            return;
        }
        
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.id = `user-${user.id}`;
        userElement.innerHTML = `
            <div class="user-color" style="background-color: ${user.color}"></div>
            <span>${user.name}</span>
        `;
        usersList.appendChild(userElement);
        
        this.updateUserCount();
        console.log(' User added to list:', user.name);
    }

    removeUser(userId) {
        const userElement = document.getElementById(`user-${userId}`);
        if (userElement) {
            userElement.remove();
            this.updateUserCount();
            console.log(' User removed from list:', userId);
        }
    }

    updateUserCount() {
        const users = document.querySelectorAll('.user-item');
        const count = users.length;
        document.getElementById('userCount').textContent = 
            `${count} user${count !== 1 ? 's' : ''} online`;
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * this.reconnectAttempts, 10000);
            
            console.log(` Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.log(' Max reconnection attempts reached. Please refresh the page.');
            alert('Connection lost. Please refresh the page to reconnect.');
        }
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateRandomColor() {
        const colors = [
            '#ff0000', '#00ff00', '#0000ff', 
            '#ffff00', '#ff00ff', '#00ffff',
            '#ff8000', '#8000ff', '#00ff80',
            '#ff0080', '#80ff00', '#0080ff'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Public methods to update user info
    setUserName(name) {
        this.userName = name || this.userName;
    }

    setUserColor(color) {
        this.userColor = color;
    }

    // Debug method
    debug() {
        console.log('=== WEBSOCKET DEBUG ===');
        console.log('User ID:', this.userId);
        console.log('User Name:', this.userName);
        console.log('User Color:', this.userColor);
        console.log('Room ID:', this.roomId);
        console.log('WebSocket State:', this.ws ? this.ws.readyState : 'No connection');
        console.log('Reconnect Attempts:', this.reconnectAttempts);
    }
}