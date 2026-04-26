import * as vscode from 'vscode';
import { AxonViewProvider } from './AxonViewProvider';

export function activate(context: vscode.ExtensionContext) {
	const provider = new AxonViewProvider(context.extensionUri, context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(AxonViewProvider.viewType, provider)
	);
}

export function deactivate() {}