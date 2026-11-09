// An HTML page for pairing the Paseo app with this workspace's daemon: a Copy
// button for the pairing link, the link itself and its QR code. The Coder
// template serves it behind a workspace app, because copying the link out of
// a log or a web terminal is hard on a phone.
//
//   workbench-paseo-pairing-page URL           the pairing page for URL
//   workbench-paseo-pairing-page --none MSG    a page saying why there's no link
//
// Prints the page, or with --port PORT first, serves it on 127.0.0.1:PORT.
// The server answers every request with the page and nothing else.
import { createServer } from "node:http";
import { hostname } from "node:os";
import QRCode from "qrcode";

const usage =
  "usage: workbench-paseo-pairing-page [--port PORT] (URL | --none MESSAGE)";
const args = process.argv.slice(2);

let port;
if (args[0] === "--port") {
  port = Number(args[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(usage);
    process.exit(2);
  }
  args.splice(0, 2);
}

const escape = (text) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let body;
if (args.length === 2 && args[0] === "--none") {
  body = `<p>${escape(args[1])}</p>`;
} else if (args.length === 1 && /^https:\/\/\S+#offer=\S+$/.test(args[0])) {
  const url = args[0];
  const qr = await QRCode.toString(url, { type: "svg", margin: 2 });
  body = `
<button id="copy" type="button">Copy pairing link</button>
<p id="status" role="status"></p>
<ol>
  <li>In the Paseo app, add a host.</li>
  <li>Choose <b>Paste pairing link</b>, or <b>Scan QR code</b> and scan the code below.</li>
  <li>Enter the daemon's password when the app asks.</li>
</ol>
<div class="qr">${qr}</div>
<textarea id="link" readonly rows="4" aria-label="Pairing link">${escape(url)}</textarea>
<p><a href="${escape(url)}">Open in the Paseo web app</a></p>
<script>
  const link = document.getElementById("link");
  const status = document.getElementById("status");
  document.getElementById("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link.value);
    } catch {
      // Without the clipboard API (e.g. an insecure origin), copy the selection.
      link.focus();
      link.setSelectionRange(0, link.value.length);
      if (!document.execCommand("copy")) {
        status.textContent = "Couldn't copy. The link is selected below.";
        return;
      }
    }
    status.textContent = "Copied. Paste it into the Paseo app.";
  });
</script>`;
} else {
  console.error(usage);
  process.exit(2);
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Pair Paseo</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { max-width: 28rem; margin: 0 auto; padding: 1.5rem 1rem; line-height: 1.5; }
  h1 { font-size: 1.4rem; margin: 0 0 1rem; }
  button { width: 100%; padding: 0.9rem; font-size: 1.1rem; font-weight: 600;
           border: 0; border-radius: 0.6rem; background: #2563eb; color: #fff; cursor: pointer; }
  button:active { background: #1d4ed8; }
  #status { min-height: 1.5em; margin: 0.5rem 0; }
  ol { padding-left: 1.3rem; }
  .qr { background: #fff; border-radius: 0.6rem; padding: 0.5rem; margin: 1rem 0; }
  .qr svg { display: block; width: 100%; height: auto; }
  textarea { box-sizing: border-box; width: 100%; font: 0.8rem ui-monospace, monospace;
             word-break: break-all; resize: none; }
</style>
</head>
<body>
<h1>Pair Paseo with ${escape(hostname())}</h1>
${body}
</body>
</html>
`;

if (port === undefined) {
  process.stdout.write(page);
} else {
  createServer((request, response) => {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : page);
  }).listen(port, "127.0.0.1");
}
