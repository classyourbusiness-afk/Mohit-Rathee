fetch("https://scanner.tradingview.com/forex/scan", {
    method: "POST",
    body: JSON.stringify({ symbols: { tickers: ["FX:EURUSD"] }, columns: ["close", "change"] }),
    headers: { "Content-Type": "application/json" }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d))).catch(console.error);
