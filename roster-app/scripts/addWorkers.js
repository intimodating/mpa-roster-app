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
var dotenv = require("dotenv");
var path = require("path");
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
var mongodb_1 = require("../lib/mongodb");
var users_1 = require("../models/users");
var firstNames = ["John", "Jane", "Peter", "Mary", "David", "Sarah", "Michael", "Emily", "Chris", "Anna"];
var lastNames = ["Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson"];
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function addWorkers(numWorkers) {
    return __awaiter(this, void 0, void 0, function () {
        var workersToAdd, i, firstName, lastName, userId, proficiencyGrade, batchSize, i, batch, result, batchError_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, 9, 10]);
                    return [4 /*yield*/, (0, mongodb_1.connectToDatabase)()];
                case 1:
                    _a.sent();
                    console.log("Database connected.");
                    workersToAdd = [];
                    for (i = 0; i < numWorkers; i++) {
                        firstName = firstNames[getRandomInt(0, firstNames.length - 1)];
                        lastName = lastNames[getRandomInt(0, lastNames.length - 1)];
                        userId = "".concat(firstName.toLowerCase(), ".").concat(lastName.toLowerCase(), ".").concat(i);
                        proficiencyGrade = getRandomInt(1, 9);
                        workersToAdd.push({
                            user_id: userId,
                            password: userId, // As requested, password is the same as user_id
                            account_type: "Non-Planner",
                            proficiency_grade: proficiencyGrade,
                            name: "".concat(firstName, " ").concat(lastName),
                            email: "".concat(userId, "@example.com"),
                            age: getRandomInt(20, 60),
                            hobbies: ["reading", "hiking", "gaming"][getRandomInt(0, 2)],
                        });
                    }
                    batchSize = 50;
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < workersToAdd.length)) return [3 /*break*/, 7];
                    batch = workersToAdd.slice(i, i + batchSize);
                    console.log("Attempting to insert batch ".concat(i / batchSize + 1, "/").concat(Math.ceil(workersToAdd.length / batchSize), " with ").concat(batch.length, " workers."));
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, users_1.default.insertMany(batch, { ordered: false })];
                case 4:
                    result = _a.sent();
                    console.log("Successfully inserted ".concat(result.length, " workers in batch."));
                    return [3 /*break*/, 6];
                case 5:
                    batchError_1 = _a.sent();
                    console.error("Error inserting batch ".concat(i / batchSize + 1, ":"), batchError_1);
                    return [3 /*break*/, 6];
                case 6:
                    i += batchSize;
                    return [3 /*break*/, 2];
                case 7:
                    console.log("Successfully added ".concat(numWorkers, " workers."));
                    return [3 /*break*/, 10];
                case 8:
                    error_1 = _a.sent();
                    console.error("Error adding workers:", error_1);
                    return [3 /*break*/, 10];
                case 9:
                    // It's generally good practice to disconnect, but Mongoose manages connections internally in Next.js
                    // If running as a standalone script, you might want to add mongoose.disconnect();
                    console.log("Script finished.");
                    process.exit(0);
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
addWorkers(150);
