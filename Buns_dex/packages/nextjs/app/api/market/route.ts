export async function GET(_: Request) {
  const apiUrl =
    "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=100&sortBy=market_cap&sortType=desc&convert=USD&cryptoType=all&tagType=all&audited=false";

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; MyApp/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`CoinMarketCap response status: ${response.status}`);
    }

    const data = await response.json();

    // Transform the data to match our table structure
    const transformedData = data.data.cryptoCurrencyList.map(
      (coin: any, index: number) => ({
        rank: index + 1,
        name: coin.name,
        symbol: coin.symbol,
        price: coin.quotes[0]?.price || 0,
        percentChange1h: coin.quotes[0]?.percentChange1h || 0,
        percentChange24h: coin.quotes[0]?.percentChange24h || 0,
        percentChange7d: coin.quotes[0]?.percentChange7d || 0,
        volume24h: coin.quotes[0]?.volume24h || 0,
        marketCap: coin.quotes[0]?.marketCap || 0,
        sparkline: coin.sparkline || [],
      })
    );

    return Response.json({
      data: transformedData,
      status: { error_code: "0", error_message: "SUCCESS" },
    });
  } catch (e) {
    console.error("Error fetching market data:", e);
    return Response.json({
      data: [],
      status: { error_code: "1", error_message: "Failed to fetch market data" },
    });
  }
}
