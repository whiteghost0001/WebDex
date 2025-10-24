"use client";

import React, { useState, useEffect } from "react";

interface MarketData {
  rank: number;
  name: string;
  symbol: string;
  price: number;
  percentChange1h: number;
  percentChange24h: number;
  percentChange7d: number;
  volume24h: number;
  marketCap: number;
  sparkline: number[];
}

const Home = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/market");
        const data = await response.json();

        if (data.status.error_code === "0") {
          setMarketData(data.data);
        } else {
          setError(data.status.error_message);
        }
      } catch (err) {
        setError("Failed to fetch market data");
        console.error("Error fetching market data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPercentColor = (value: number) => {
    if (value > 0) return "text-green-500";
    if (value < 0) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-[90%] md:w-[75%]">
          <div className="container flex flex-col items-center justify-start gap-20 px-4 md:px-8">
            <div className="flex w-full max-w-md flex-col items-center justify-start gap-10">
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <span className="text-3xl font-bold">StarkDex Market</span>
                {/* <span className="text-sm text-muted-foreground">
                  StarkDex Market Data for all
                </span> */}
                {/* <span className="text-sm text-muted-foreground">
                  Real-time data, charts, and analytics for Starknet
                </span> */}
              </div>
              <input
                className="flex w-full truncate px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 rounded-lg bg-background ring-2 ring-accent ring-offset-background focus-visible:ring-1 focus-visible:ring-primary h-10 text-sm"
                placeholder="Token name or address"
                value=""
              />
            </div>
            <div className="rounded-xl border border-border bg-card text-card-foreground flex w-full max-w-6xl flex-1 flex-col items-center justify-between gap-20 p-6">
              <div className="flex size-full flex-col gap-2">
                {loading ? (
                  Array.from({ length: 16 }, (_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl bg-primary/5 dark:bg-muted h-14 w-full"
                    ></div>
                  ))
                ) : error ? (
                  <div className="text-center text-red-500 py-8">
                    Error: {error}
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-4">#</th>
                          <th className="text-left p-4">Coin</th>
                          <th className="text-right p-4">Price</th>
                          <th className="text-right p-4">1H</th>
                          <th className="text-right p-4">24H</th>
                          <th className="text-right p-4">7D</th>
                          <th className="text-right p-4">Volume(24h)</th>
                          <th className="text-right p-4">Market cap</th>
                          <th className="text-center p-4">Last 7 days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketData.map((coin, index) => (
                          <tr
                            key={coin.rank}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            <td className="p-4">{index + 1}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{coin.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  {coin.symbol}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono">
                              ${coin.price.toFixed(coin.price < 1 ? 6 : 2)}
                            </td>
                            <td
                              className={`p-4 text-right font-mono ${getPercentColor(coin.percentChange1h)}`}
                            >
                              {formatPercent(coin.percentChange1h)}
                            </td>
                            <td
                              className={`p-4 text-right font-mono ${getPercentColor(coin.percentChange24h)}`}
                            >
                              {formatPercent(coin.percentChange24h)}
                            </td>
                            <td
                              className={`p-4 text-right font-mono ${getPercentColor(coin.percentChange7d)}`}
                            >
                              {formatPercent(coin.percentChange7d)}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {formatCurrency(coin.volume24h)}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {formatCurrency(coin.marketCap)}
                            </td>
                            <td className="p-4 text-center">
                              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded">
                                {/* Placeholder for sparkline chart */}
                                <div className="text-xs text-muted-foreground pt-2">
                                  Chart
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                Disclaimer: The data presented on StarkDex is provided for
                informational purposes only and is not intended as financial
                advice. While we strive for accuracy, data may occasionally be
                incorrect, unsynchronized, or not fully representative of the
                current market conditions. We encourage users to review our data
                collection and computation methodology for a better
                understanding of how our market data is derived. Please exercise
                due diligence!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
