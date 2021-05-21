import {
  App,
  Plugin,
  FuzzyMatch,
  FuzzySuggestModal,
  MarkdownView,
} from "obsidian";

// @ts-ignore
import electron from "electron";
import TurndownService from "turndown";

export default class Pluck extends Plugin {
  async onload() {
    // Intercept Cross-Origin.
    // H/t https://discord.com/channels/686053708261228577/707816848615407697/802052942885945395
    // @ts-ignore
    electron.remote.session.defaultSession.webRequest.onHeadersReceived(
      { urls: ["https://*/*", "http://*/*"] },
      (details: any, callback: any) => {
        console.log("in callback");
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "x-frame-options": [""],
            "access-control-allow-origin": ["*"],
          },
        });
      }
    );

    this.addStatusBarItem().setText("Status Bar Text");

    this.addCommand({
      id: "pluck-insert-from-url",
      name: "Insert contents from URL",
      callback: () => {
        new URLModal(this.app, this).open();
      },
    });
  }

  async processURL(url: string) {
    const response = await fetch(url, {
      headers: {
        Accept: "text/plain",
      },
    });
    const res = await response.text();
    if (!res) {
      console.error(`[Pluck] No text/plain response from URL: ${url}`);
      return;
    }
    const turndownService = new TurndownService();
    const md = turndownService.turndown(res);
    if (!md) {
      console.error(`[Pluck] Unable to convert text to Markdown.`);
      return;
    }

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      console.error("[Pluck] No active view to insert into.");
      return;
    }

    const editor = activeView.editor;
    const doc = editor.getDoc();
    doc.replaceSelection(md);
  }
}

class URLModal extends FuzzySuggestModal<string> {
  plugin: Pluck;

  constructor(app: App, plugin: Pluck) {
    super(app);
    this.plugin = plugin;
  }

  getSuggestions(query: string): FuzzyMatch<string>[] {
    return [
      {
        item: query,
        match: {
          score: 0,
          matches: [],
        },
      },
    ];
  }

  getItems(): string[] {
    return [];
  }

  getItemText(item: string): string {
    return `Insert HTML -> Markdown from: ${item}`;
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.plugin.processURL(item);
  }
}
