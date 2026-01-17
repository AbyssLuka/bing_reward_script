import {Browser, executablePath, Page} from "puppeteer";
import puppeteer from 'puppeteer-extra';
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {Command} from 'commander';
import {sleep} from "@renzp/utils";
import axios from "axios";
import {keywordsPc, keywordsMobile} from "./trending-keywords";
import {Clock} from "./Clock";

puppeteer.use(StealthPlugin());

// 获取随机延迟时间（5秒 ± 1-2秒的随机扰动）
const getRandomDelay = () => 5000 + (Math.random() - 0.5) * 2000;

// 搜索
async function performSearch(page: Page, keyword: string) {
    const searchBox = await page.waitForSelector(argsOption.selector, {
        visible: true,
    });
    if (!searchBox) throw new Error("搜索框未找到");
    await searchBox.evaluate(el => {
        if (el.tagName != "INPUT" && el.tagName != "TEXTAREA")
            throw new Error("选择器找到的元素不是输入框");
    });
    await searchBox.click({count: 3});
    await page.keyboard.type(keyword, {
        delay: 100 + Math.random() * 100,
    });
    await page.keyboard.press("Enter");
}

// 创建浏览器实例s
async function createBrowser() {
    if (argsOption.connect){
        const URL = `http://${argsOption.connect}`
        const response = await axios.get(`${URL}/json/version`);
        console.log(response.data.webSocketDebuggerUrl)
        return  puppeteer.connect({
            browserWSEndpoint: response.data.webSocketDebuggerUrl,
            defaultViewport: null,
        })

    }else {
        return puppeteer.launch({
            userDataDir: "./google-chrome-puppeteer", // 浏览器数据路径保存位置
            // executablePath: "/usr/bin/google-chrome-stable", // 使用系统安装的 Chrome
            executablePath: executablePath(), // 自动检测Chrome
            headless: false, // 显示浏览器窗口
            defaultViewport: null,
            args: [
                "--start-maximized",
                "--disable-blink-features=AutomationControlled", // 隐藏自动化特征
            ],
        });
    }
}

// 伪装移动设备
async function setMobileEmulation(page: Page) {
    const client = await page.createCDPSession();
    // 启用触摸模拟
    await client.send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 5,
    });
    // 设备尺寸
    await client.send("Emulation.setDeviceMetricsOverride", {
        width: 393,
        height: 851,
        deviceScaleFactor: 3,
        mobile: true,
        screenOrientation: {type: "portraitPrimary", angle: 0},
    });
    // 深度注入 User-Agent 和 Client Hints
    await client.send("Network.setUserAgentOverride", {
        userAgent:
            "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8",
        platform: "Android",
        userAgentMetadata: {
            brands: [
                {brand: "Not_A Brand", version: "8"},
                {brand: "Chromium", version: "120"},
                {brand: "Google Chrome", version: "120"},
            ],
            platform: "Android",
            platformVersion: "13.0.0",
            architecture: "",
            model: "Pixel 7",
            mobile: true,
            bitness: "",
            wow64: false,
        },
    });
}

const clock = new Clock();

// 循环搜索
async function searchLoop(browser: Browser, keywords: string[]) {
    for (let i = 0; i < keywords.length; i++) {
        console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++")
        console.log(`准备搜索: ${keywords[i]}`);
        const page = await newPage(browser);
        await performSearch(page, keywords[i]);
        await sleep(getRandomDelay());
        await page.close();
        const delta = clock.getDelta();
        console.log(`✓ 搜索完成: ${keywords[i]}`);
        console.log(`等待 ${(delta / 1000).toFixed(2)} 秒`);
        console.log(`已完成完成 ${i + 1} 个，还剩 ${keywords.length - (i + 1)} 个`)
    }
}

// 创建新页面
async function newPage(browser: Browser) {
    const page = await browser.newPage();
    if (argsOption.mobile) await setMobileEmulation(page);
    await page.goto("http://bing.com");
    return page;
}

// 初始化参数
function init() {
    const program = new Command();
    program
        .name("Bing Reward Bot")
        .description("自动刷 Bing 积分脚本")
        .version("1.0.0")
        .option("--pc", "以 PC 模式运行")
        .option("--mobile", "以移动端模式运行")
        .option("-c, --connect <url>", "远程调试","")
        .option("-s, --selector <css>", "指定搜索框的 selector");
    program.parse(process.argv);
    const options = program.opts();

    if (options.pc && options.mobile) {
        console.error("❌ 错误: --pc 和 --mobile 不能同时使用");
        process.exit(1);
    }

    // 默认：pc
    if (!options.pc && !options.mobile) {
        options.pc = true;
    }

    argsOption = {...argsOption, ...options};
}

// 参数对象
let argsOption = {
    mobile: false,
    pc: false,
    selector: "#sb_form_q",
    connect: "",
} as const

// 主函数
async function main() {
    init();
    console.log("启动 Bing 积分自动刷取脚本...\n");
    const browser = await createBrowser();

    const bingPage = await newPage(browser);
    console.log("-----------------------------------------------------");
    console.log(" 请在浏览器中登录你的 Bing / Microsoft 账号");
    console.log(" 登录完成后，回到 终端控制台 按下 【回车】 继续");
    console.log("-----------------------------------------------------");
    // 等待用户按回车
    await new Promise<void>((resolve) => {
        process.stdin.resume();
        process.stdin.once("data", () => {
            resolve();
            if (!bingPage.isClosed()) bingPage.close();
        });
    });

    console.log("✓ 用户已确认，继续执行脚本...");
    const keywords = argsOption.pc ? keywordsPc : keywordsMobile;
    console.log(`✓ 已加载 ${keywords.length} 个关键词`);
    console.log("开始自动搜索...");
    console.log("提示: 按 Ctrl+C 停止脚本");
    await searchLoop(browser, keywords);
    process.exit(0);
}

// 开始执行
main().catch(console.error);