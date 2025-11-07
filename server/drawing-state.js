class DrawingState {
    constructor() {
        this.roomStates = new Map();
    }

    initializeRoom(roomId) {
        if (!this.roomStates.has(roomId)) {
            this.roomStates.set(roomId, {
                operations: [],
                undoneOperations: []
            });
        }
    }

    addOperation(roomId, operation) {
        if (!this.roomStates.has(roomId)) {
            this.initializeRoom(roomId);
        }

        const roomState = this.roomStates.get(roomId);
        
        // Ensure operation has required fields
        if (!operation.timestamp) operation.timestamp = Date.now();
        if (!operation.operationId) operation.operationId = this.generateId();
        
        roomState.operations.push(operation);
        
        // Clear redo stack for this user
        roomState.undoneOperations = roomState.undoneOperations.filter(op => 
            op.userId !== operation.userId
        );

        console.log(`✅ Operation added for ${operation.userId}. Total: ${roomState.operations.length}`);
        return operation.operationId;
    }

    getRoomState(roomId) {
        if (!this.roomStates.has(roomId)) {
            return { operations: [] };
        }
        return { operations: this.roomStates.get(roomId).operations };
    }

    performUndoRedo(roomId, action, userId) {
        if (!this.roomStates.has(roomId)) return null;

        const roomState = this.roomStates.get(roomId);
        
        if (action === 'undo') {
            // Find the most recent operation by this user
            for (let i = roomState.operations.length - 1; i >= 0; i--) {
                if (roomState.operations[i].userId === userId) {
                    const undoneOp = roomState.operations.splice(i, 1)[0];
                    roomState.undoneOperations.push(undoneOp);
                    
                    console.log(`✅ UNDO: Removed operation by ${userId}`);
                    return {
                        type: 'operation-undo',
                        operationId: undoneOp.operationId,
                        userId: userId,
                        userName: undoneOp.userName,
                        timestamp: Date.now()
                    };
                }
            }
            console.log(`❌ No operations to undo for ${userId}`);
            return null;
            
        } else if (action === 'redo') {
            // Find the most recent undone operation by this user
            for (let i = roomState.undoneOperations.length - 1; i >= 0; i--) {
                if (roomState.undoneOperations[i].userId === userId) {
                    const redoneOp = roomState.undoneOperations.splice(i, 1)[0];
                    roomState.operations.push(redoneOp);
                    
                    console.log(`✅ REDO: Added back operation by ${userId}`);
                    return {
                        type: 'operation-redo',
                        operation: redoneOp,
                        userId: userId,
                        userName: redoneOp.userName,
                        timestamp: Date.now()
                    };
                }
            }
            console.log(`❌ No operations to redo for ${userId}`);
            return null;
        }
        
        return null;
    }

    clearCanvas(roomId) {
        if (this.roomStates.has(roomId)) {
            const roomState = this.roomStates.get(roomId);
            roomState.operations = [];
            roomState.undoneOperations = [];
            console.log(`🗑️ Canvas cleared`);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    debugState(roomId) {
        if (this.roomStates.has(roomId)) {
            const roomState = this.roomStates.get(roomId);
            console.log(`=== ROOM ${roomId} STATE ===`);
            console.log(`Operations: ${roomState.operations.length}`);
            console.log(`Undone: ${roomState.undoneOperations.length}`);
        }
    }
}

module.exports = DrawingState;