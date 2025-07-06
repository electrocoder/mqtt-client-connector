"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mqtt = __importStar(require("mqtt"));
function activate(context) {
    let client = null;
    let disposable = vscode.commands.registerCommand('mqtt-client-connector.connect', () => {
        const panel = vscode.window.createWebviewPanel('mqttConnector', 'MQTT Client Connector and send message', vscode.ViewColumn.One, {
            enableScripts: true
        });
        const htmlPath = path.join(context.extensionPath, 'src', './webview.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = htmlContent;
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'connect') {
                const { brokerAddress, port, clientId, username, password } = message.data;
                try {
                    client = mqtt.connect(brokerAddress, {
                        port: parseInt(port),
                        clientId: clientId || `vscode_${Math.random().toString(16).slice(3)}`,
                        username: username || undefined,
                        password: password || undefined
                    });
                    client.on('connect', () => {
                        panel.webview.postMessage({
                            command: 'connectionStatus',
                            status: 'success',
                            message: 'MQTT Broker connect succesfull.'
                        });
                    });
                    client.on('error', (err) => {
                        panel.webview.postMessage({
                            command: 'connectionStatus',
                            status: 'error',
                            message: `MQTT connection error: ${err.message}`
                        });
                        client?.end();
                        client = null;
                    });
                }
                catch (err) {
                    panel.webview.postMessage({
                        command: 'connectionStatus',
                        status: 'error',
                        message: `Connection error: ${err.message}`
                    });
                }
            }
            else if (message.command === 'sendMessage') {
                const { topic, messageContent } = message.data;
                if (client && client.connected) {
                    client.publish(topic, messageContent, (err) => {
                        if (err) {
                            panel.webview.postMessage({
                                command: 'messageStatus',
                                status: 'error',
                                message: `Publish error: ${err.message}`
                            });
                        }
                        else {
                            panel.webview.postMessage({
                                command: 'messageStatus',
                                status: 'success',
                                message: `Message "${topic}" send succesfull.`
                            });
                        }
                    });
                }
                else {
                    panel.webview.postMessage({
                        command: 'messageStatus',
                        status: 'error',
                        message: 'Connection problem. Please later connection.'
                    });
                }
            }
        }, undefined, context.subscriptions);
        // close
        panel.onDidDispose(() => {
            if (client) {
                client.end();
                client = null;
            }
        }, null, context.subscriptions);
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map