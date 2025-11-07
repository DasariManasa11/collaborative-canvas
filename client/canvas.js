class DrawingCanvas {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.cursorLayer = document.getElementById('cursorLayer');
        this.cursorCtx = this.cursorLayer.getContext('2d');
        this.cursorOverlay = document.getElementById('cursorOverlay');
        
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.brushSize = 5;
        
        this.remoteCursors = new Map();
        
        this.initializeCanvas();
        this.setupEventListeners();
        
        console.log(' Canvas initialized');
    }

    initializeCanvas() {
        this.resizeCanvas();
        
        // Set initial canvas styles
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = this.brushSize;
        this.ctx.strokeStyle = this.currentColor;
        
        // Fill with white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        console.log('Resizing canvas to:', width, 'x', height);
        
        // Set canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;
        this.cursorLayer.width = width;
        this.cursorLayer.height = height;
        
        // Redraw white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, width, height);
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
        
        // Mouse events with proper binding
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
        
        // Tool events
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.dataset.tool);
            });
        });

        // Color events
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.setColor(e.target.dataset.color);
            });
        });

        // Brush size
        const brushSizeSlider = document.getElementById('brushSize');
        const brushSizeValue = document.getElementById('brushSizeValue');
        
        brushSizeSlider.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = this.brushSize + 'px';
            this.ctx.lineWidth = this.brushSize;
        });

        // Clear button
        document.querySelector('[data-tool="clear"]').addEventListener('click', () => {
            if (confirm('Clear the entire canvas?')) {
                this.clearCanvas();
                if (window.websocket) {
                    window.websocket.send(JSON.stringify({ type: 'clear-canvas' }));
                }
            }
        });

        // Cursor tracking
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (window.websocket) {
                window.websocket.send(JSON.stringify({
                    type: 'cursor-move',
                    position: { x, y }
                }));
            }
        });

        console.log(' Event listeners setup complete');
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        console.log('Tool set to:', tool);
    }

    setColor(color) {
        this.currentColor = color;
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-color="${color}"]`).classList.add('active');
        this.ctx.strokeStyle = color;
        console.log('Color set to:', color);
    }

    startDrawing(e) {
        this.isDrawing = true;
        const point = this.getMousePos(e);
        this.lastX = point.x;
        this.lastY = point.y;
        
        console.log('🖊️ Start drawing at:', point.x, point.y);
        
        // Set drawing style
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = this.brushSize;
        
        if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
        }
        
        // Begin path
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        
        const operation = {
            type: 'draw-start',
            x: point.x,
            y: point.y,
            color: this.currentColor,
            brushSize: this.brushSize,
            tool: this.currentTool,
            timestamp: Date.now(),
            operationId: this.generateOperationId()
        };
        
        // Send to server
        if (window.websocket) {
            window.websocket.send(JSON.stringify(operation));
        }
        
        // Add to undo manager - CORRECT METHOD NAME
        if (window.undoRedoManager) {
            window.undoRedoManager.addOperation(operation);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const point = this.getMousePos(e);
        
        // Draw locally
        this.ctx.lineTo(point.x, point.y);
        this.ctx.stroke();
        
        console.log(' Drawing to:', point.x, point.y);
        
        const operation = {
            type: 'draw-move',
            x: point.x,
            y: point.y,
            timestamp: Date.now(),
            operationId: this.generateOperationId()
        };
        
        // Send to server
        if (window.websocket) {
            window.websocket.send(JSON.stringify(operation));
        }
        
        // Add to undo manager - CORRECT METHOD NAME
        if (window.undoRedoManager) {
            window.undoRedoManager.addOperation(operation);
        }
        
        this.lastX = point.x;
        this.lastY = point.y;
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.ctx.closePath();
        
        console.log(' Stop drawing');
        
        const operation = {
            type: 'draw-end',
            timestamp: Date.now(),
            operationId: this.generateOperationId()
        };
        
        // Send to server
        if (window.websocket) {
            window.websocket.send(JSON.stringify(operation));
        }
        
        // Add to undo manager - CORRECT METHOD NAME
        if (window.undoRedoManager) {
            window.undoRedoManager.addOperation(operation);
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // Handle remote drawing
    handleRemoteDraw(operation) {
        console.log(' Remote draw:', operation.type);
        
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = operation.brushSize || 5;
        this.ctx.strokeStyle = operation.color || '#000000';
        this.ctx.globalCompositeOperation = operation.tool === 'eraser' ? 
            'destination-out' : 'source-over';
        
        if (operation.type === 'draw-start') {
            this.ctx.beginPath();
            this.ctx.moveTo(operation.x, operation.y);
        } else if (operation.type === 'draw-move') {
            this.ctx.lineTo(operation.x, operation.y);
            this.ctx.stroke();
        } else if (operation.type === 'draw-end') {
            this.ctx.closePath();
        }
    }

    // Redraw all operations (for undo/redo)
    redrawAllOperations(operations) {
        console.log(` Redrawing ${operations.length} operations`);
        
        
        // Clear canvas with white background
        this.clearCanvas();
        
        // Group operations by stroke
        
        
        
            if (!operations || operations.length === 0) {
                console.log(' No operations to draw');
                return;
            }
            const strokes = [];
            let currentStroke = null;
            operations.forEach(operation => {
                if (operation.type === 'draw-start') {
                    if (currentStroke) {
                        strokes.push(currentStroke);
                    }
                currentStroke = {
                    points: [{x: operation.x, y: operation.y}],
                    color: operation.color || '#000000',
                    brushSize: operation.brushSize || 5,
                    tool: operation.tool || 'brush'
                    };
                }
                else if (operation.type === 'draw-move' && currentStroke) {
                    currentStroke.points.push({ x: operation.x, y: operation.y });
                }
                else if (operation.type === 'draw-end' && currentStroke) {
                    strokes.push(currentStroke);
                    currentStroke = null;
                }
            });

            strokes.forEach(stroke => {
                if (stroke.points.length < 2) return;
                // Set drawing style
                this.ctx.lineJoin = 'round';
                this.ctx.lineCap = 'round';
                this.ctx.lineWidth = stroke.brushSize;
                this.ctx.strokeStyle = currentStroke.color;
                this.ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 
                    'destination-out' : 'source-over';
                
                this.ctx.beginPath();
                this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

                for (let i = 1; i < stroke.points.length; i++) {
                    this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }

                this.ctx.stroke();
                this.ctx.closePath();
            });

            console.log(` Redrew ${strokes.length} strokes`);
    }

                
           

    // Handle remote cursor
    updateRemoteCursor(userId, position, user) {
        let cursor = this.remoteCursors.get(userId);
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'user-cursor';
            cursor.style.backgroundColor = user.color;
            cursor.setAttribute('data-user', user.name);
            this.cursorOverlay.appendChild(cursor);
            this.remoteCursors.set(userId, cursor);
        }
        
        cursor.style.left = position.x + 'px';
        cursor.style.top = position.y + 'px';
    }

    removeRemoteCursor(userId) {
        const cursor = this.remoteCursors.get(userId);
        if (cursor) {
            cursor.remove();
            this.remoteCursors.delete(userId);
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        console.log(' Canvas cleared');
    }

    generateOperationId() {
        return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Debug method
    debug() {
        console.log('=== CANVAS DEBUG ===');
        console.log('Size:', this.canvas.width, 'x', this.canvas.height);
        console.log('Drawing:', this.isDrawing);
        console.log('Tool:', this.currentTool);
        console.log('Color:', this.currentColor);
        console.log('Brush Size:', this.brushSize);
    }
}