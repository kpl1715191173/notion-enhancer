"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqliteBindBoolean = exports.sqliteBindObject = exports.makeSqliteException = exports.getSingleRowResultAsType = exports.getFirstRowAsType = exports.executeSqliteTransaction = exports.sqliteWrite = exports.sqliteReadWrite = exports.SQLITE_MAX_VARIABLE_NUMBER = void 0;
const sqliteTypes_1 = require("./sqliteTypes");
const typeUtils_1 = require("./typeUtils");
const utils_1 = require("./utils");
const retryHelpers = __importStar(require("./retryHelpers"));
exports.SQLITE_MAX_VARIABLE_NUMBER = 999;
async function sqliteReadWrite(connection, sql, args) {
    const statement = {
        sql,
        args,
        getData: true,
    };
    const [result] = await executeSqliteTransaction(connection, [statement]);
    return result.data;
}
exports.sqliteReadWrite = sqliteReadWrite;
async function sqliteWrite(connection, sql, args) {
    const statement = {
        sql,
        args,
    };
    await executeSqliteTransaction(connection, [statement]);
}
exports.sqliteWrite = sqliteWrite;
async function executeSqliteTransaction(connection, statements) {
    const executeSqliteTransactionInner = async () => {
        const begin = { sql: `BEGIN`, getData: false };
        const commit = { sql: `COMMIT`, getData: false };
        const rollback = { sql: `ROLLBACK`, getData: false };
        const trimmed = statements.map(s => {
            return Object.assign(Object.assign({}, s), { sql: utils_1.trimQuery(s.sql) });
        });
        const body = [begin, ...trimmed, commit];
        const batch = sqliteTypes_1.makeSqliteBatch({
            body,
            onError: rollback,
        });
        const batchWithTransactionalTypeBrand = batch;
        const result = await connection.execSqliteBatch(batchWithTransactionalTypeBrand);
        const userResults = result.body.slice(1, -1);
        const error = makeSqliteException(batch, result);
        if (error || userResults.some(sqliteTypes_1.isSqliteError)) {
            throw error;
        }
        return userResults;
    };
    return await retryHelpers.retry({
        initialInput: undefined,
        fn: () => executeSqliteTransactionInner(),
        handleError: (e, isLastAttempt) => {
            if (e.name !== "SqlitePreconditionFail" || isLastAttempt) {
                return {
                    status: "throw",
                    error: e,
                };
            }
            return {
                status: "retry",
            };
        },
        retryAttemptsMS: [10, 100, 1000],
        retryAttemptRandomOffsetMS: 50,
    });
}
exports.executeSqliteTransaction = executeSqliteTransaction;
function getFirstRowAsType(result) {
    const firstRow = result.data[0];
    if (result.data.length === 0 || !firstRow) {
        throw new Error(`Expected >1 result rows, instead had none.`);
    }
    return firstRow;
}
exports.getFirstRowAsType = getFirstRowAsType;
function getSingleRowResultAsType(result) {
    if (result.data.length !== 1) {
        throw new Error(`Expected exactly 1 result row, instead had ${result.data.length}.`);
    }
    return result.data[0];
}
exports.getSingleRowResultAsType = getSingleRowResultAsType;
function makeSqliteException(batch, result) {
    const errorResultIndex = result.body.findIndex(sqliteTypes_1.isSqliteError);
    if (errorResultIndex < 0) {
        return;
    }
    const errorResult = result.body[errorResultIndex];
    let name = "SqliteError";
    let message = "Unknown sqlite error";
    switch (errorResult.type) {
        case "Error":
            const { sql } = batch.body[errorResultIndex];
            message = `${errorResult.message} (sql: \`${sql}\`)`;
            name = errorResult.name;
            break;
        case "ErrorBefore":
            message = `ErrorBefore before first Error`;
            name = "SqliteInvalidResult";
            break;
        case "PreconditionFailed":
            message = `The precondition SQL query did not pass, the batch execution was not attempted.`;
            name = "SqlitePreconditionFail";
            break;
        case "OutOfSpace":
            message = `Sqlite has run out of space`;
            name = "SqliteOutOfSpace";
            break;
        default:
            typeUtils_1.unreachable(errorResult);
    }
    const error = new Error(message);
    Object.assign(error, errorResult, {
        name,
        message,
        batch,
        result,
        errorSql: batch.body[errorResultIndex].sql,
        errorArgs: batch.body[errorResultIndex].args,
        errorIndex: errorResultIndex,
    });
    return error;
}
exports.makeSqliteException = makeSqliteException;
function sqliteBindObject(value) {
    return JSON.stringify(value)
        .replace(/\u2028/g, "")
        .replace(/\u2029/g, "");
}
exports.sqliteBindObject = sqliteBindObject;
function sqliteBindBoolean(bool) {
    if (bool) {
        return 1;
    }
    return 0;
}
exports.sqliteBindBoolean = sqliteBindBoolean;
//# sourceMappingURL=sqliteHelpers.js.map

//notion-enhancer
require('notion-enhancer')('shared/sqliteHelpers', exports, (js) => eval(js))