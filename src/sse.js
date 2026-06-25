// Basic SSE Client Manager
const clients = new Set();

function addClient(res) {
    clients.add(res);
}

function removeClient(res) {
    clients.delete(res);
}

function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
        client.write(payload);
    }
}

module.exports = {
    addClient,
    removeClient,
    broadcast
};
