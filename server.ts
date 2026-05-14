import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/ext-prices", async (req, res) => {
    try {
      const { symbols } = req.query;
      if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({ error: "Symbols are required" });
      }

      const symbolList = symbols.split(',');
      const tvSymbols = symbolList.map(sym => {
        if (sym.includes('Apple') || sym.includes('AAPL')) return 'NASDAQ:AAPL';
        if (sym.includes('Gold') || sym.includes('XAU')) return 'OANDA:XAUUSD';
        return `FX:${sym.replace('/', '')}`;
      });

      const response = await fetch("https://scanner.tradingview.com/global/scan", {
        method: "POST",
        body: JSON.stringify({ symbols: { tickers: tvSymbols }, columns: ["close", "change"] }),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from TV Scanner" });
      }

      const data = await response.json();
      const responseMap: Record<string, any> = {};

      if (data && data.data) {
        for (let i = 0; i < data.data.length; i++) {
          const item = data.data[i];
          const tvSym = item.s;
          // Find original app symbol from index
          const originalSymbol = symbolList[tvSymbols.indexOf(tvSym)] || symbolList[i];
          
          responseMap[originalSymbol] = {
            symbol: originalSymbol,
            price: item.d[0],
            change: item.d[1]
          };
        }
      }

      res.json(responseMap);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API route to proxy 
  app.get("/ext-price", async (req, res) => {
    console.log(`[API] Received request for /ext-price?symbol=${req.query.symbol}`);
    try {
      const { symbol } = req.query;
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ error: "Symbol is required" });
      }

      let tvSymbol = symbol;
      if (symbol.includes('Apple') || symbol.includes('AAPL')) tvSymbol = 'NASDAQ:AAPL';
      else if (symbol.includes('Gold') || symbol.includes('XAU')) tvSymbol = 'OANDA:XAUUSD';
      else tvSymbol = `FX:${symbol.replace('/', '')}`;

      const response = await fetch("https://scanner.tradingview.com/global/scan", {
        method: "POST",
        body: JSON.stringify({ symbols: { tickers: [tvSymbol] }, columns: ["close", "change"] }),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from TV Scanner" });
      }

      const data = await response.json();
      const item = data?.data?.[0];

      if (!item) {
        return res.status(404).json({ error: "Data not found" });
      }

      res.json({
         symbol,
         price: item.d[0],
         change: item.d[1],
         history: [] // Do not use slow Yahoo finance history, let frontend generate chart baseline
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
