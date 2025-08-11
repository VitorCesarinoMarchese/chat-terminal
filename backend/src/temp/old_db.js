"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var client_1 = require("@prisma/client");
var db = new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
exports.db = db;
