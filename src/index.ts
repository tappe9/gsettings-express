import express, { Request, Response } from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import pool from "./db";

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// サーバーが正常に動作していることを確認するためのエンドポイント
app.get("/", (req: Request, res: Response) => {
  res.send("Server is running");
});

// デバイス情報をスクレイピングして返すエンドポイント
app.post("/api/scrape-amazon", async (req: Request, res: Response) => {
  const { url } = req.body;

  try {
    const deviceData = await scrapeAmazon(url);
    res.status(200).json(deviceData);
  } catch (error) {
    res.status(500).json({ error: "Failed to scrape data" });
  }
});

// スクレイピング処理を行う関数
const scrapeAmazon = async (url: string) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      const manufacturer = (document.querySelector("tr.po-brand .po-break-word")?.textContent || "").trim();
      const deviceName = (document.querySelector("span#productTitle")?.textContent || "").trim();
      const price = (document.querySelector("span.a-price-whole")?.textContent || "").trim().replace(/[^\d.]/g, "");
      const thumbnailUrl = (document.querySelector("#landingImage") as HTMLImageElement)?.src || "";

      return {
        manufacturer,
        deviceName,
        price: parseFloat(price),
        thumbnailUrl,
      };
    });

    await browser.close();
    return data;
  } catch (error) {
    console.error("Error scraping data:", error);
    throw error;
  }
};

// サーバーの起動
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
