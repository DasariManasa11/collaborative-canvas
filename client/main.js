class CollaborativeCanvasApp {
    constructor() {
        this.initializeApp();
    }

    initializeApp() {
        console.log(' Starting Collaborative Canvas App...');
        
        try {
            // Initialize undo/redo manager first
            window.undoRedoManager = new UndoRedoManager();
            console.log(' UndoRedoManager initialized');
            
            // Then initialize canvas
            window.drawingCanvas = new DrawingCanvas();
            console.log(' DrawingCanvas initialized');
            
            // Then initialize WebSocket connection
            window.websocketClient = new WebSocketClient();
            console.log(' WebSocketClient initialized');
            
            console.log(' Collaborative Canvas App fully initialized');
            
            // Update undo/redo button states periodically
            this.updateButtonStates();
            setInterval(() => this.updateButtonStates(), 500);
            
        } catch (error) {
            console.error(' App initialization failed:', error);
        }
    }

    updateButtonStates() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (window.undoRedoManager) {
            undoBtn.disabled = !window.undoRedoManager.canUndo();
            redoBtn.disabled = !window.undoRedoManager.canRedo();
        }
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log(' DOM loaded, starting app...');
    new CollaborativeCanvasApp();
});