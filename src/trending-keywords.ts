import fs from "node:fs";
import path from "node:path";

function readKeywords(fileName: string): string[] {
    const fullPath = path.join(path.resolve(), fileName);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`❌ 关键字文件不存在: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, "utf8");

    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

export const keywordsPc = readKeywords("pc.txt").sort((_, __) => Math.random() - 0.5);
export const keywordsMobile = readKeywords("mobile.txt").sort((_, __) => Math.random() - 0.5);