"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteConnectionWrapper = void 0;
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const sqliteTypes_1 = require("../../shared/sqliteTypes");
const sqliteHelpers_1 = require("../../shared/sqliteHelpers");
const SQLITE_DB_NAME = "notion.db";
class SqliteConnectionWrapper {
    constructor(args) {
        this.execSqliteBatchCalls = 0;
        switch (args.type) {
            case "on-disk":
                const { dbDirectory, debug, timeoutMs } = args;
                const dbPath = path_1.default.join(dbDirectory, SQLITE_DB_NAME);
                this.db = new better_sqlite3_1.default(dbPath, Object.assign(Object.assign({}, (Boolean(debug) ? { verbose: console.log } : {})), (timeoutMs ? { timeout: timeoutMs } : {})));
                this.debug = Boolean(debug);
                break;
            case "in-memory":
                this.db = new better_sqlite3_1.default(":memory:");
                this.debug = true;
                break;
            default:
                throw new Error(`Bad type passed`);
        }
    }
    execSqliteBatch(batch) {
        this.execSqliteBatchCalls += 1;
        return Promise.resolve(this.execSqliteBatchInternal(batch));
    }
    execSqliteBatchV2(args) {
        const { precondition, batch } = args;
        if (precondition) {
            const res = this.execSqliteBatchInternal({
                body: [precondition],
                onError: undefined,
            });
            const [preconditionResult] = res.body;
            if (preconditionResult.type === "DataOk") {
                const { precondition_result } = sqliteHelpers_1.getSingleRowResultAsType(preconditionResult);
                if (typeof precondition_result !== "number") {
                    throw new Error(`precondition_result must be 0/1, instead received: ${precondition_result} (type: ${typeof precondition_result})`);
                }
                if (precondition_result === 1) {
                    this.execSqliteBatchCalls += 1;
                    return Promise.resolve(this.execSqliteBatchInternal(batch));
                }
            }
            const bodyResults = batch.body.map(() => ({
                type: "PreconditionFailed",
            }));
            return Promise.resolve({
                body: bodyResults,
                onErrorResult: undefined,
            });
        }
        this.execSqliteBatchCalls += 1;
        return Promise.resolve(this.execSqliteBatchInternal(batch));
    }
    execSqliteBatchInternal(batch) {
        const { body, onError } = batch;
        const results = [];
        let errored = false;
        for (const [index, statement] of body.entries()) {
            if (errored) {
                results[index] = {
                    type: "ErrorBefore",
                };
                continue;
            }
            const result = this.execSqliteStatement(statement);
            results[index] = result;
            errored = sqliteTypes_1.isSqliteError(result);
        }
        return {
            body: results,
            onErrorResult: errored && onError ? this.execSqliteStatement(onError) : undefined,
        };
    }
    close() {
        this.db.close();
    }
    get closed() {
        return !this.db.open;
    }
    execSqliteStatement(statement) {
        try {
            const { sql, getData } = statement;
            const preparedStatement = this.db.prepare(sql);
            const args = statement.args || [];
            if (getData) {
                const result = preparedStatement.reader
                    ? preparedStatement.all(...args)
                    : preparedStatement.run(...args);
                return {
                    type: "DataOk",
                    data: result,
                };
            }
            else {
                preparedStatement.run(...args);
                return { type: "Ok" };
            }
        }
        catch (e) {
            return {
                type: "Error",
                message: e.message,
                name: e.name,
                sqliteCode: e.code,
            };
        }
    }
}
exports.SqliteConnectionWrapper = SqliteConnectionWrapper;
//# sourceMappingURL=SqliteConnectionWrapper.js.map

//notion-enhancer
require('notion-enhancer')('main/sqlite/SqliteConnectionWrapper', exports, (js) => eval(js))