import { Server } from "socket.io";

const nodesSocket = new Server(3005, { cors: { origin: "*", credentials: true } });
const nodes = new Map();

/*--------------------------------------------------------------------------------------------------------------------------------------------
                                                        technical nodes events
-------------------------------------------------------------------------------------------------------------------------------------------- */

nodesSocket.on("connection", (node) => {
    console.log("node connected:", node.id);

    node.on("auth", async (res) => {
        const cookieHeader = node.handshake.headers.cookie
        try {
        const authRes = await fetch("https://auth.zed31rus.ru/me", { method: "GET", headers: { Cookie: cookieHeader } });
        const data = await authRes.json();
        console.log("authRes:", data);

        if (authRes.ok && data?.user?.login) {
            node.user = data.user;
            nodes.set(node.user.login, { socket: node, user: node.user });
            clientsSocket.emit("nodesChanged", Array.from(nodes.keys()));

            console.log(`user ${node.user.login} authenticated`);
            console.log("active nodes:", Array.from(nodes.keys()));

            res?.({ ok: true, user: node.user });
        } else {
            console.log("auth failed:", data);
            res?.({ ok: false, message: "Authentication failed" });
        }
        } catch (err) {
        console.error("auth error:", err);
        res?.({ ok: false, message: "Internal error" });
        }
    });

    node.on("disconnect", () => {
        if (node.user?.login) {
        nodes.delete(node.user.login);
        clientsSocket.emit("nodesChanged", Array.from(nodes.keys()));
        console.log(`user ${node.user.login} disconnected`);
        } else {
        console.log(`unauthenticated node disconnected`);
        }
    });


/*--------------------------------------------------------------------------------------------------------------------------------------------
                                                        soundpad nodes events
-------------------------------------------------------------------------------------------------------------------------------------------- */

  node.on("currentUpdated", (current, res) => {
    clientsSocket.to(`${node.user?.login}'s room`).emit("currentUpdated", current);
    res?.({ ok: true });
  });

  node.on("historyUpdated", (history, res) => {
    clientsSocket.to(`${node.user?.login}'s room`).emit("historyUpdated", history);
    res?.({ ok: true });
  });

  node.on("soundListUpdated", (soundList, res) => {
    clientsSocket.to(`${node.user?.login}'s room`).emit("soundListUpdated", soundList);
    res?.({ ok: true });
  });

  node.on("volumeUpdated", (volume, res) => {
    clientsSocket.to(`${node.user?.login}'s room`).emit("volumeUpdated", volume);
    res?.({ ok: true });
  });
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const clientsSocket = new Server(3004, { cors: { origin: ["https://zed31rus.ru"], credentials: true } });
const clients = new Set();

/*--------------------------------------------------------------------------------------------------------------------------------------------
                                                        technical clients events
-------------------------------------------------------------------------------------------------------------------------------------------- */

clientsSocket.on("connection", (client) => {
  console.log("client connected:", client.id);
  clients.add(client);

  client.emit("nodesChanged", Array.from(nodes.keys()));

  client.on("disconnect", () => {
    clients.delete(client);
    console.log("client disconnected:", client.id)
  });

  client.on("nodeConnect", (clientReq, clientRes) => {
    const login = clientReq.login;
    const node = nodes.get(login);

    if (!node) return clientRes({ ok: false, message: `Node ${login} not found.` });

    client.join(`${login}'s room`);
    client.nodeConnected = node;
    clientRes({ ok: true, message: `Connected to node ${login}`, user: node.user });

    console.log(`client connected to node ${login}`);
  });
/*--------------------------------------------------------------------------------------------------------------------------------------------
                                                        soundpad clients events
-------------------------------------------------------------------------------------------------------------------------------------------- */
  client.on("play", (clientReq, clientRes) => {
    const nodeSocket = client.nodeConnected?.socket;
    if (!nodeSocket) return clientRes({ ok: false, message: "Not connected to a Soundpad Node." });

    nodeSocket.emit("play", clientReq, (nodeRes) => clientRes(nodeRes));
    console.log(`sent play to ${client.nodeConnected?.user?.login}`);
  });

  client.on("stop", (clientReq, clientRes) => {
    const nodeSocket = client.nodeConnected?.socket;
    if (!nodeSocket) return clientRes({ ok: false, message: "Not connected to a Soundpad Node." });

    nodeSocket.emit("stop", clientReq.soundIndex, (nodeRes) => clientRes(nodeRes));
    console.log(`sent stop to ${client.nodeConnected?.user?.login}`);
  });

  client.on("getSoundListJSON", (clientReq, clientRes) => {
    const nodeSocket = client.nodeConnected?.socket;
    if (!nodeSocket) return clientRes({ ok: false, message: "Not connected to a Soundpad Node." });

    nodeSocket.emit("getSoundListJSON", null, (nodeRes) => clientRes(nodeRes));
  });
});