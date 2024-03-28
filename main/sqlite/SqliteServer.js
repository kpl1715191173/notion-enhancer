"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const SqliteConnectionWrapper_1 = require("./SqliteConnectionWrapper");
const electron_log_1 = __importDefault(require("electron-log"));
const crypto_1 = __importDefault(require("crypto"));
let killed = false;
class SqliteServer {
    constructor() {
        this.dbConnection = this.getDbConnection();
        this.startWebsocketServer();
        this.startHealthchecks();
    }
    shutdown() {
        if (this.dbConnection) {
            this.dbConnection.close();
        }
        if (this.server) {
            this.server.close();
        }
    }
    getDbConnection() {
        const userDataPath = process.argv[2];
        return new SqliteConnectionWrapper_1.SqliteConnectionWrapper({
            type: "on-disk",
            dbDirectory: userDataPath,
            debug: false,
        });
    }
    startWebsocketServer() {
        const serverProcessPort = parseInt(process.argv[3]);
        this.server = new ws_1.default.Server({
            port: serverProcessPort,
            host: "127.0.0.1",
        });
        electron_log_1.default.info(`Websocket listening on ${serverProcessPort}...`);
        this.setupServerListeners();
    }
    setupServerListeners() {
        electron_log_1.default.info(`Set up server listeners with auth (${process.argv[4]})...`);
        const authToken = process.argv[4];
        if (this.server) {
            this.server.on("connection", conn => {
                conn.on("message", async (msg) => {
                    const msgS = msg.toString();
                    const { id, batch, auth, precondition } = JSON.parse(msgS);
                    if (crypto_1.default.timingSafeEqual(Buffer.from(auth), Buffer.from(authToken))) {
                        const res = precondition
                            ? await this.dbConnection.execSqliteBatchV2({
                                batch,
                                precondition,
                            })
                            : await this.dbConnection.execSqliteBatch(batch);
                        conn.send(JSON.stringify({ id, result: res }));
                    }
                });
                conn.on("error", error => {
                    electron_log_1.default.error("Connection error", error);
                });
            });
            this.server.on("close", () => {
                electron_log_1.default.info("Closing websocket server...");
                if (!killed) {
                    this.startWebsocketServer();
                }
            });
            this.server.on("error", error => {
                electron_log_1.default.error("[WS Server] An error occurred!", error);
            });
        }
    }
    startHealthchecks() {
        if (this.healthcheckInterval) {
            clearInterval(this.healthcheckInterval);
        }
        this.healthcheckInterval = setInterval(() => {
            if (this.dbConnection.closed) {
                this.dbConnection = this.getDbConnection();
            }
        }, 100);
    }
}
const server = new SqliteServer();
process.on("SIGTERM", () => {
    electron_log_1.default.info("Responding to SIGTERM and shutting down...");
    server.shutdown();
    killed = true;
    process.exit(0);
});
//# sourceMappingURL=SqliteServer.js.map

//notion-enhancer
require('notion-enhancer')('main/sqlite/SqliteServer', exports, (js) => eval(js))