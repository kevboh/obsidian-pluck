import {
  App,
  ButtonComponent,
  htmlToMarkdown,
  MarkdownView,
  Modal,
  Plugin,
  TextComponent,
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

class URLModal extends Modal {
  plugin: Pluck;

  constructor(app: App, plugin: Pluck) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    const urlField = new TextComponent(contentEl).setPlaceholder(
      "URL of note contents"
    );
    urlField.inputEl.id = "pluck-input";

    const doPluck = () => {
      const url = urlField.getValue();
      this.plugin.processURL(url);
      this.close();
    };

    const pluckButton = new ButtonComponent(contentEl)
      .setButtonText("Pluck")
      .onClick(doPluck);
    pluckButton.buttonEl.id = "pluck-button";
    urlField.inputEl.focus();
    urlField.inputEl.addEventListener("keypress", function (keypressed) {
      if (keypressed.key === "Enter") {
        doPluck();
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
