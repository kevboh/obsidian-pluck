import {
  App,
  Plugin,
  FuzzyMatch,
  FuzzySuggestModal,
  MarkdownView,
  htmlToMarkdown,
} from "obsidian";

// @ts-ignore
import electron from "electron";
import TurndownService from "turndown";

export default class Pluck extends Plugin {
  async onload() {
    this.addCommand({
      id: "pluck-insert-from-url",
      name: "Insert contents from URL",
      callback: () => {
        new URLModal(this.app, this).open();
      },
    });
  }

  async processURL(url: string) {
    const activeView = this.getActiveView();
    if (!activeView) {
      console.error("[Pluck] No active view to insert into.");
      return;
    }

    var body = "";
    const request = electron.remote.net.request({
      url,
    });
    request.setHeader("Accept", "text/plain");
    request.on("response", (response: any) => {
      response.on("end", () => {
        if (body && body.length > 0) {
          this.noteFromHTML(body);
        } else {
          console.error(`[Pluck] Unable to fetch HTML from ${url}`);
        }
      });
      response.on("error", () => {
        console.error(`[Pluck] Error fetching HTML ${url}`);
      });
      response.on("data", (chunk: any) => {
        body += chunk;
      });
    });
    request.end();
  }

  async noteFromHTML(html: string) {
    const turndownService = new TurndownService();
    let md;
    if (htmlToMarkdown) {
      md = htmlToMarkdown(html);
    } else {
      md = turndownService.turndown(html);
    }

    if (!md) {
      console.error(`[Pluck] Unable to convert text to Markdown.`);
      return;
    }

    const activeView = this.getActiveView();
    if (!activeView) {
      console.error("[Pluck] No active view to insert into.");
      return;
    }

    activeView.editor.replaceSelection(md);
  }

  getActiveView(): MarkdownView {
    return this.app.workspace.getActiveViewOfType(MarkdownView);
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
