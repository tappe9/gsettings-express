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

app.get("/scrape-price", async (req: Request, res: Response) => {
  const url = req.query.url as string;

  if (!url) {
    return res.status(400).send({ error: "URL is required" });
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const price = await page.evaluate(() => {
      const priceElement = document.querySelector("#priceblock_ourprice, #priceblock_dealprice");
      return priceElement ? priceElement.textContent : null;
    });

    await browser.close();

    if (price) {
      res.send({ price });
    } else {
      res.status(404).send({ error: "Price not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "An error occurred while scraping the price" });
  }
});

app.post("/devices", async (req: Request, res: Response) => {
  const { deviceName, deviceDescription, amazonLink } = req.body;
  const price = 0;

  if (!deviceName || !amazonLink) {
    return res.status(400).send({ error: "Invalid data" });
  }

  try {
    const client = await pool.connect();
    const insertQuery = `
            INSERT INTO amazon_devices (device_name, device_description, amazon_link, price)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
    const result = await client.query(insertQuery, [deviceName, deviceDescription, amazonLink, price]);
    client.release();

    res.status(201).send({ message: "Device added successfully", device: result.rows[0] });
  } catch (error) {
    console.error("Error adding device:", error);
    res.status(500).send({ error: "An error occurred while adding the device" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
