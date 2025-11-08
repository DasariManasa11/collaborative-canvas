Data flow Diagram


<img width="736" height="724" alt="Data flow diagram" src="https://github.com/user-attachments/assets/ff6fd90d-a08d-46cb-8e55-aa69e9c64fba" />

#WebSocket Protocol: What messages you send/receive
Client → Server Messages

// Drawing Operation
{
  type: "draw",
  id: "client_generated_uuid",
  tool: "pen|eraser|rectangle|circle",
  points: [{x: 100, y: 150}, {x: 110, y: 160}],
  color: "#ff0000",
  brushSize: 5,
  timestamp: 1635724800000
}

// Undo/Redo Request
{
  type: "undo",
  targetId: "operation_id_to_undo",
  userId: "user_123"
}

// Cursor Update
{
  type: "cursor",
  position: {x: 200, y: 300},
  userId: "user_123"
}

Server → Client Messages
// Broadcast Drawing
{
  type: "draw",
  id: "server_verified_uuid",
  operation: {tool, points, color, brushSize},
  userId: "user_123",
  serverTimestamp: 1635724800000
}

// Global Undo/Redo Command
{
  type: "undo",
  targetId: "operation_id",
  userId: "user_who_triggered_it"
}

// User Cursor Broadcast
{
  type: "cursor",
  userId: "user_123", 
  position: {x: 200, y: 300}
}

// Full State Sync (for new users)
{
  type: "full-state",
  operations: [/* all drawing operations */],
  users: [/* active users with cursors */]
}

#How Global Undo/Redo Works
1. User Triggers Undo on Client A
   // Client A immediately responds locally
clientA.undoLastOperation();

// Then requests global undo from server
websocket.send({
  type: "undo",
  userId: "userA",
  targetId: "op3", // Operation to undo
  requestId: "req_123"
});

2. Server Processes Undo Request
class UndoManager {
  processUndoRequest(request) {
    // Validate user can undo this operation
    if (!this.canUserUndo(request.userId, request.targetId)) {
      return { error: "Permission denied" };
    }
    
    // Add undo operation to global history
    const undoOperation = {
      id: this.generateId(),
      type: "undo",
      targetId: request.targetId,
      userId: request.userId,
      timestamp: Date.now(),
      version: this.globalVersion++
    };
    
    // Add to history and broadcast
    this.operationHistory.push(undoOperation);
    this.broadcastToAll(undoOperation);
    
    return { success: true, operation: undoOperation };
  }
}

3. All Clients Apply Global Undo
   // Every client receives the undo command
{
  type: "undo",
  targetId: "op3",
  userId: "userA",
  version: 16
}

// Each client removes the target operation
clientB.applyUndo("op3");
clientC.applyUndo("op3");

#Performance Decisions
Why We Chose Operations:
// GOOD: Operation data (~200 bytes)
{
  type: "draw",
  tool: "pen",
  points: [{x:100,y:150}, {x:110,y:160}],
  color: "#ff0000",
  brushSize: 5
}

//  BAD: Pixel data (~50,000+ bytes for 500x500 canvas)
{
  type: "pixels",
  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+K...",
  width: 500,
  height: 500
}
Performance Impact:
Bandwidth: 250x reduction in data transfer
Memory: Client stores operations instead of full canvas bitmaps
Scalability: Supports infinite zoom without quality loss

#Conflict Resolution: How you handle simultaneous drawing
By using Operational Transform (OT) Approach
1. Server as Central Authority
   // Every operation gets server metadata
{
  id: "client_generated_uuid",
  type: "draw",
  operation: {tool: "pen", points: [...]},
  userId: "user_123",
  clientTimestamp: 1635724800000,
  serverTimestamp: 1635724801000, // ← SERVER DECIDES ORDER
  version: 15 // ← Global sequence number
}

2. Global Sequence Numbers
Each operation gets incrementing version number from server
All clients apply operations in version order
No ambiguity about which operation comes first

3.Operation Transformation
When two operations affect the same area, we transform them:
// Example: User draws line, another user draws over it simultaneously
function transformOperations(opA, opB) {
  if (!operationsOverlap(opA, opB)) {
    return [opA, opB]; // No conflict, apply as-is
  }
  
  if (opA.tool === "eraser" && opB.tool === "pen") {
    // Eraser should remove the drawing, regardless of order
    return adjustCoordinates(opB, opA.erasedArea);
  }
  
  // Default: apply in server order, adjust second operation
  return [opA, transformAgainst(opB, opA)];
}
