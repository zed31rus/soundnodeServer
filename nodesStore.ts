import EventEmitter from "events";
import { Socket } from "socket.io";

type NodesType = Map<string, NodeType>
type NodeType = {'login':string, 'node': Socket};

export default class nodesStore extends EventEmitter {
    nodes: NodesType;
    
    constructor() {
        super();
        this.nodes = new Map() as NodesType;
    }

    add(login: string, node: Socket) {
        this.nodes.set(login, {'login': login, 'node': node})
        this.emit("nodeAdded", this.getNodes())
    }

    delete(login: string) {
        this.nodes.delete(login)
        this.emit("nodeDeleted", this.getNodes())
    }

    getNodes(login: string|null = null) {
        if (login) {
            const node = this.nodes.get(login);
            return node ? [node] : [];
        }
        else {
            const node = Array.from(this.nodes.values())
            return node
        }
    }
}