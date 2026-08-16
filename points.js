const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'points.json');

// Estructura: { [userId]: { points: number, username: string } }
let data = {};

function load() {
    try {
        data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
        data = {}; // No existe todavía o está corrupto: empezamos de cero.
    }
}

let saveQueued = false;
function save() {
    // Agrupa escrituras seguidas en una sola para no martillar el disco.
    if (saveQueued) return;
    saveQueued = true;
    setImmediate(() => {
        saveQueued = false;
        try {
            fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('No se pudieron guardar los puntos:', error);
        }
    });
}

function addPoints(userId, username, amount) {
    if (!data[userId]) data[userId] = { points: 0, username };
    data[userId].points += amount;
    data[userId].username = username; // Mantiene el nombre actualizado.
    save();
}

// Devuelve [{ userId, points, username }] ordenado de mayor a menor.
function leaderboard() {
    return Object.entries(data)
        .map(([userId, v]) => ({ userId, points: v.points, username: v.username }))
        .sort((a, b) => b.points - a.points);
}

load();

module.exports = { addPoints, leaderboard };
