"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
var ws_1 = require("ws");
var old_db_1 = require("./old_db");
var old_queue_1 = require("./old_queue");
var bcrypt = require("bcrypt");
var wss = new ws_1.default.Server({ port: 3000 });
exports.wss = wss;
var SALT_ROUNDS = 10;
wss.on('connection', function (socket) {
    var ws = socket;
    console.log('Novo cliente conectado');
    ws.user = undefined;
    ws.on('message', function (raw) { return __awaiter(void 0, void 0, void 0, function () {
        var data, username, password, user, hashedPassword, isValid, history_1, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 13, , 14]);
                    data = JSON.parse(raw.toString());
                    if (!(data.type === 'login')) return [3 /*break*/, 10];
                    username = data.username, password = data.password;
                    return [4 /*yield*/, old_db_1.db.user.findUnique({ where: { username: username } })];
                case 1:
                    user = _a.sent();
                    if (!!user) return [3 /*break*/, 5];
                    return [4 /*yield*/, bcrypt.hash(password, SALT_ROUNDS)];
                case 2:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, old_db_1.db.user.create({
                            data: {
                                username: username,
                                password: hashedPassword,
                            }
                        })];
                case 3:
                    user = _a.sent();
                    return [4 /*yield*/, old_db_1.db.session.create({
                            data: {
                                userId: user.id,
                                isOnline: true
                            }
                        })];
                case 4:
                    _a.sent();
                    ws.send(JSON.stringify({ type: 'login-success', newUser: true }));
                    console.log("Novo usu\u00E1rio criado: ".concat(username));
                    return [3 /*break*/, 8];
                case 5: return [4 /*yield*/, bcrypt.compare(password, user.password)];
                case 6:
                    isValid = _a.sent();
                    if (!isValid) {
                        ws.send(JSON.stringify({ type: 'login-error', error: 'Senha incorreta' }));
                        ws.close();
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, old_db_1.db.session.upsert({
                            where: { userId: user.id },
                            update: { isOnline: true },
                            create: { userId: user.id, isOnline: true }
                        })];
                case 7:
                    _a.sent();
                    ws.send(JSON.stringify({ type: 'login-success', newUser: false }));
                    console.log("Usu\u00E1rio autenticado: ".concat(username));
                    _a.label = 8;
                case 8:
                    ws.user = username;
                    return [4 /*yield*/, old_db_1.db.message.findMany({
                            orderBy: { timestamp: 'asc' },
                            take: 50
                        })];
                case 9:
                    history_1 = _a.sent();
                    ws.send(JSON.stringify({
                        type: 'history',
                        messages: history_1
                    }));
                    return [2 /*return*/];
                case 10:
                    if (!(data.type === 'message')) return [3 /*break*/, 12];
                    if (!ws.user) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Faça login primeiro!' }));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, old_queue_1.messageQueue.add('new-message', {
                            user: ws.user,
                            text: data.text,
                            timestamp: Date.now()
                        })];
                case 11:
                    _a.sent();
                    _a.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    err_1 = _a.sent();
                    console.error('Erro ao processar mensagem:', err_1);
                    ws.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida' }));
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    }); });
    ws.on('close', function () { return __awaiter(void 0, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!ws.user) return [3 /*break*/, 3];
                    return [4 /*yield*/, old_db_1.db.user.findUnique({ where: { username: ws.user } })];
                case 1:
                    user = _a.sent();
                    if (!user) return [3 /*break*/, 3];
                    return [4 /*yield*/, old_db_1.db.session.updateMany({
                            where: { userId: user.id },
                            data: { isOnline: false }
                        })];
                case 2:
                    _a.sent();
                    console.log("Usu\u00E1rio desconectado: ".concat(ws.user));
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); });
});
console.log('Servidor WebSocket rodando na porta 3000');
