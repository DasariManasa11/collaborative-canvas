class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    joinRoom(roomId, ws, user) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        
        this.rooms.get(roomId).add({
            ws,
            user,
            joinedAt: Date.now()
        });

        console.log(`User ${user.name} joined room ${roomId}`);
    }

    leaveRoom(roomId, ws) {
        if (this.rooms.has(roomId)) {
            const room = this.rooms.get(roomId);
            for (let user of room) {
                if (user.ws === ws) {
                    room.delete(user);
                    console.log(`User ${user.user.name} left room ${roomId}`);
                    break;
                }
            }
            
            if (room.size === 0) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (no users)`);
            }
        }
    }

    getRoomUsers(roomId) {
        return this.rooms.has(roomId) ? Array.from(this.rooms.get(roomId)) : [];
    }

    getRoomUserCount(roomId) {
        return this.rooms.has(roomId) ? this.rooms.get(roomId).size : 0;
    }
}

module.exports = RoomManager;