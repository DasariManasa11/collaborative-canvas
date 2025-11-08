class UndoRedoManager {
    constructor() {
        this.operations = [];
        this.undoneOperations = [];
        console.log(' UndoRedoManager initialized');
    }

    initializeOperations(operations) {
        this.operations = operations || [];
        this.undoneOperations = [];
        console.log(` Loaded ${this.operations.length} operations`);
    }

    addOperation(operation) {
        this.operations.push(operation);
        // Clear redo stack when new operation is added
        this.undoneOperations = [];
        console.log(` Added ${operation.type}. Total: ${this.operations.length}`);
    }

    addRemoteOperation(operation) {
        // Only add if we don't already have it
        const exists = this.operations.some(op => op.operationId === operation.operationId);
        if (!exists) {
            this.operations.push(operation);
            console.log(` Added remote ${operation.type}. Total: ${this.operations.length}`);
        }
    }

    undo() {
        if (this.operations.length > 0) {
            const lastOp = this.operations.pop();
            this.undoneOperations.push(lastOp);
            console.log(`Undo performed. Remaining: ${this.operations.length}`);
            return lastOp;
        } else {
            console.log(' No operations to undo');
            return null;
        }
    }

    redo() {
        if (this.undoneOperations.length > 0) {
            const redoneOp = this.undoneOperations.pop();
            this.operations.push(redoneOp);
            console.log(`↷ Redo performed. Total: ${this.operations.length}`);
            return redoneOp;
        } else {
            console.log(' No operations to redo');
            return null;
        }
    }

    handleRemoteUndo(operationId) {
        const index = this.operations.findIndex(op => op.operationId === operationId);
        if (index !== -1) {
            const undoneOp = this.operations.splice(index, 1)[0];
            this.undoneOperations.push(undoneOp);
            console.log(` Remote undo handled. Remaining: ${this.operations.length}`);
            return true;
        }
        console.log(' Remote undo failed - operation not found');
        return false;
    }

    handleRemoteRedo(operation) {
        this.operations.push(operation);
        const redoIndex = this.undoneOperations.findIndex(op => op.operationId === operation.operationId);
        if (redoIndex !== -1) {
            this.undoneOperations.splice(redoIndex, 1);
        }
        console.log(` Remote redo handled. Total: ${this.operations.length}`);
        return true;
    }

    clearOperations() {
        this.operations = [];
        this.undoneOperations = [];
        console.log(' All operations cleared');
    }

    getOperations() {
        return this.operations;
    }

    canUndo() {
        return this.operations.length > 0;
    }

    canRedo() {
        return this.undoneOperations.length > 0;
    }

    debug() {
        console.log('=== UNDO/REDO DEBUG ===');
        console.log(`Operations: ${this.operations.length}`);
        console.log(`Undone: ${this.undoneOperations.length}`);
        console.log('Recent operations:', this.operations.slice(-3));
    }
}