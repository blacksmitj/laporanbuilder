import fs from "node:fs";
import path from "node:path";

function walk(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith(".ts")) {
      let content = fs.readFileSync(p, "utf8");
      if (content.includes("export const runtime")) {
        content = content.replace(/export const runtime = ['"]nodejs['"];?\r?\n/g, "");
        fs.writeFileSync(p, content, "utf8");
        console.log("Stripped runtime from:", p);
      }
    }
  }
}

walk("src/app/api");

