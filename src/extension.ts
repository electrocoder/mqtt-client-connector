import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as mqtt from 'mqtt';

export function activate(context: vscode.ExtensionContext) {
    let client: mqtt.MqttClient | null = null;

    let disposable = vscode.commands.registerCommand('mqtt-client-connector.connect', () => {
        const panel = vscode.window.createWebviewPanel(
            'mqttConnector',
            'MQTT Client Connector and send message',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        const htmlPath = path.join(context.extensionPath, 'src', 'webview.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = htmlContent;

        panel.webview.onDidReceiveMessage(
            async (message) => {
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
                    } catch (err: any) {
                        panel.webview.postMessage({
                            command: 'connectionStatus',
                            status: 'error',
                            message: `Connection error: ${err.message}`
                        });
                    }
                } else if (message.command === 'sendMessage') {
                    const { topic, messageContent } = message.data;

                    if (client && client.connected) {
                        client.publish(topic, messageContent, (err) => {
                            if (err) {
                                panel.webview.postMessage({
                                    command: 'messageStatus',
                                    status: 'error',
                                    message: `Publish error: ${err.message}`
                                });
                            } else {
                                panel.webview.postMessage({
                                    command: 'messageStatus',
                                    status: 'success',
                                    message: `Message "${topic}" send succesfull.`
                                });
                            }
                        });
                    } else {
                        panel.webview.postMessage({
                            command: 'messageStatus',
                            status: 'error',
                            message: 'Connection problem. Please later connection.'
                        });
                    }
                }
            },
            undefined,
            context.subscriptions
        );

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

export function deactivate() {}