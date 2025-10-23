"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useNetwork } from "@starknet-react/core";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useScaffoldMultiWriteContract,
} from "~~/hooks/scaffold-stark";
import { IntegerInput } from "~~/components/scaffold-stark/Input/IntegerInput";
import { Balance } from "~~/components/scaffold-stark/Balance";
import { Curve } from "./_components/Curve";
import { formatUnits, parseUnits } from "ethers";
import { notification } from "~~/utils/scaffold-stark";

const Dex = () => {
  const { address } = useAccount();
  const { chain } = useNetwork();

  const [strkInput, setStrkInput] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [depositInput, setDepositInput] = useState<string>("");
  const [withdrawInput, setWithdrawInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"swap" | "liquidity">("swap");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Read contract data
  const { data: strkReserves } = useScaffoldReadContract({
    contractName: "Strk",
    functionName: "balance_of",
    args: [
      "0x072bd4B40cA19F56a2C1BC74aCd989bE1E844e5675f7FF4c5CB73493Ed12a1bF",
    ],
  });

  const { data: tokenReserves } = useScaffoldReadContract({
    contractName: "Buns",
    functionName: "balance_of",
    args: [
      "0x072bd4B40cA19F56a2C1BC74aCd989bE1E844e5675f7FF4c5CB73493Ed12a1bF",
    ],
  });

  const { data: userLiquidity } = useScaffoldReadContract({
    contractName: "Dex",
    functionName: "get_liquidity",
    args: address ? [address] : [undefined],
  });

  const { data: totalLiquidity } = useScaffoldReadContract({
    contractName: "Dex",
    functionName: "get_total_liquidity",
  });

  // Trigger refresh after successful transactions
  useEffect(() => {
    // This effect will run whenever refreshTrigger changes
    // The contract reads will automatically re-fetch when this happens
  }, [refreshTrigger]);

  // Multi-write contract functions for batched transactions
  const { sendAsync: strkToTokenSwap } = useScaffoldMultiWriteContract();

  const { sendAsync: tokenToStrkSwap } = useScaffoldMultiWriteContract();

  const { sendAsync: depositLiquidityTx } = useScaffoldMultiWriteContract();

  const { sendAsync: withdrawLiquidityTx } = useScaffoldWriteContract({
    contractName: "Dex",
    functionName: "withdraw",
    args: [undefined],
  });

  const handleStrkToToken = async () => {
    if (!strkInput || parseFloat(strkInput) <= 0) {
      notification.error("Please enter a valid STRK amount");
      return;
    }
    try {
      const parsedAmount = parseUnits(strkInput, 18);
      console.log("Parsed STRK amount for approval:", parsedAmount.toString());
      console.log("Parsed STRK amount for swap:", parsedAmount.toString());

      // Execute batched approval and swap transaction with dynamic args
      notification.info("Approving STRK spending and executing swap...");
      await strkToTokenSwap({
        calls: [
          {
            contractName: "Strk",
            functionName: "approve",
            args: [
              "0x072bd4B40cA19F56a2C1BC74aCd989bE1E844e5675f7FF4c5CB73493Ed12a1bF",
              parsedAmount,
            ],
          },
          {
            contractName: "Dex",
            functionName: "strk_to_token",
            args: [parsedAmount],
          },
        ],
      });
      notification.success("Swap successful!");
      setStrkInput("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      notification.error("Swap failed");
      console.error(error);
    }
  };

  const handleTokenToStrk = async () => {
    if (!tokenInput || parseFloat(tokenInput) <= 0) {
      notification.error("Please enter a valid token amount");
      return;
    }
    try {
      const parsedAmount = parseUnits(tokenInput, 18);
      console.log("Parsed BNS amount for approval:", parsedAmount.toString());
      console.log("Parsed BNS amount for swap:", parsedAmount.toString());

      // Execute batched approval and swap transaction
      notification.info("Approving BNS spending and executing swap...");
      await tokenToStrkSwap({
        calls: [
          {
            contractName: "Buns",
            functionName: "approve",
            args: [
              "0x072bd4B40cA19F56a2C1BC74aCd989bE1E844e5675f7FF4c5CB73493Ed12a1bF",
              parsedAmount,
            ],
          },
          {
            contractName: "Dex",
            functionName: "token_to_strk",
            args: [parsedAmount],
          },
        ],
      });
      notification.success("Swap successful!");
      setTokenInput("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      notification.error("Swap failed");
      console.error(error);
    }
  };

  const handleDeposit = async () => {
    if (!depositInput || parseFloat(depositInput) <= 0) {
      notification.error("Please enter a valid STRK amount");
      return;
    }
    try {
      const parsedAmount = parseUnits(depositInput, 18);
      console.log(
        "Parsed STRK amount for deposit approval:",
        parsedAmount.toString()
      );
      console.log("Parsed STRK amount for deposit:", parsedAmount.toString());

      // For simplicity, assume 1:1 ratio initially and let the contract handle the calculation
      // In a real DEX, you'd want to calculate this properly
      const estimatedTokenAmount = parsedAmount; // Estimate based on current reserves

      // Execute batched approvals and deposit transaction
      notification.info(
        "Approving STRK and BNS spending and adding liquidity..."
      );
      await depositLiquidityTx({
        calls: [
          {
            contractName: "Strk",
            functionName: "approve",
            args: [
              "0x072bd4B40cA19F56a2C1BC74aCd989bE1E844e5675f7FF4c5CB73493Ed12a1bF",
              parsedAmount * BigInt(2), // Approve double the amount for safety
            ],
          },
          {
            contractName: "Buns",
            functionName: "approve",
            args: [
              "0x072bd4B40cA19F56a2C1BC74aCd989bE1E844e5675f7FF4c5CB73493Ed12a1bF",
              estimatedTokenAmount * BigInt(2), // Approve double the amount for safety
            ],
          },
          {
            contractName: "Dex",
            functionName: "deposit",
            args: [parsedAmount],
          },
        ],
      });
      notification.success("Liquidity deposited successfully!");
      setDepositInput("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      notification.error("Deposit failed");
      console.error(error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawInput || parseFloat(withdrawInput) <= 0) {
      notification.error("Please enter a valid liquidity amount");
      return;
    }
    try {
      const parsedAmount = parseUnits(withdrawInput, 18);
      console.log(
        "Parsed liquidity amount for withdrawal:",
        parsedAmount.toString()
      );

      // Execute the withdrawal (no approval needed for withdrawal)
      await withdrawLiquidityTx({
        args: [parsedAmount],
      });
      notification.success("Liquidity withdrawn successfully!");
      setWithdrawInput("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      notification.error("Withdrawal failed");
      console.error(error);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-[90%] md:w-[75%]">
          <div className="container flex flex-col items-center justify-start gap-20 px-4 md:px-8">
            <div className="flex w-full max-w-md flex-col items-center justify-start gap-10">
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <span className="text-2xl font-bold">BunsSwap</span>
                <span className="text-sm text-muted-foreground">
                  Decentralized Exchange on Starknet
                </span>
                <span className="text-sm text-muted-foreground">
                  Swap STRK for BNS tokens and provide liquidity
                </span>
              </div>
            </div>

            <div className="flex w-full max-w-6xl flex-col items-end justify-start gap-2">
              <div className="grid w-full grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div className="stat">
                  <div className="stat-title">STRK Reserves</div>
                  <div className="stat-value">
                    {strkReserves
                      ? parseFloat(
                          formatUnits(strkReserves as unknown as bigint, 18)
                        ).toFixed(3)
                      : "0.000"}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">BNS Reserves</div>
                  <div className="stat-value">
                    {tokenReserves
                      ? parseFloat(
                          formatUnits(tokenReserves as unknown as bigint, 18)
                        ).toFixed(3)
                      : "0.000"}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">Total Liquidity</div>
                  <div className="stat-value">
                    {totalLiquidity
                      ? parseFloat(
                          formatUnits(totalLiquidity as unknown as bigint, 18)
                        ).toFixed(3)
                      : "0.000"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card text-card-foreground flex w-full max-w-6xl flex-1 flex-col items-center justify-between gap-20 p-6">
              <div className="flex size-full flex-col gap-2">
                <div className="tabs tabs-boxed justify-center mb-6">
                  <a
                    className={`tab ${activeTab === "swap" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("swap")}
                  >
                    Swap
                  </a>
                  <a
                    className={`tab ${activeTab === "liquidity" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("liquidity")}
                  >
                    Liquidity
                  </a>
                </div>

                {activeTab === "swap" && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                          <h2 className="card-title">STRK → BNS</h2>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">STRK Amount</span>
                            </label>
                            <IntegerInput
                              value={strkInput}
                              onChange={(value) =>
                                setStrkInput(value.toString())
                              }
                              placeholder="Enter STRK amount"
                              disableMultiplyBy1e18
                            />
                          </div>
                          <div className="card-actions justify-end">
                            <button
                              className="btn btn-primary"
                              onClick={handleStrkToToken}
                              disabled={!address || !strkInput}
                            >
                              Swap STRK for BNS
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                          <h2 className="card-title">BNS → STRK</h2>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">BNS Amount</span>
                            </label>
                            <IntegerInput
                              value={tokenInput}
                              onChange={(value) =>
                                setTokenInput(value.toString())
                              }
                              placeholder="Enter BNS amount"
                              disableMultiplyBy1e18
                            />
                          </div>
                          <div className="card-actions justify-end">
                            <button
                              className="btn btn-primary"
                              onClick={handleTokenToStrk}
                              disabled={!address || !tokenInput}
                            >
                              Swap BNS for STRK
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Curve
                        strkReserve={parseFloat(
                          strkReserves
                            ? formatUnits(strkReserves as unknown as bigint, 18)
                            : "0"
                        )}
                        tokenReserve={parseFloat(
                          tokenReserves
                            ? formatUnits(
                                tokenReserves as unknown as bigint,
                                18
                              )
                            : "0"
                        )}
                        addingStrk={parseFloat(strkInput || "0")}
                        addingToken={parseFloat(tokenInput || "0")}
                        width={600}
                        height={400}
                        isDarkMode={false}
                      />
                    </div>
                  </div>
                )}

                {activeTab === "liquidity" && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                          <h2 className="card-title">Add Liquidity</h2>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">STRK Amount</span>
                            </label>
                            <IntegerInput
                              value={depositInput}
                              onChange={(value) =>
                                setDepositInput(value.toString())
                              }
                              placeholder="Enter STRK amount"
                              disableMultiplyBy1e18
                            />
                          </div>
                          <div className="card-actions justify-end">
                            <button
                              className="btn btn-primary"
                              onClick={handleDeposit}
                              disabled={!address || !depositInput}
                            >
                              Add Liquidity
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                          <h2 className="card-title">Remove Liquidity</h2>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">
                                Liquidity Amount
                              </span>
                            </label>
                            <IntegerInput
                              value={withdrawInput}
                              onChange={(value) =>
                                setWithdrawInput(value.toString())
                              }
                              placeholder="Enter liquidity amount"
                              disableMultiplyBy1e18
                            />
                          </div>
                          <div className="card-actions justify-end">
                            <button
                              className="btn btn-primary"
                              onClick={handleWithdraw}
                              disabled={!address || !withdrawInput}
                            >
                              Remove Liquidity
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                      <div className="card-body">
                        <h2 className="card-title">Your Liquidity</h2>
                        <p className="text-lg font-bold">
                          {userLiquidity
                            ? parseFloat(
                                formatUnits(
                                  userLiquidity as unknown as bigint,
                                  18
                                )
                              ).toFixed(3)
                            : "0"}{" "}
                          <span className="font-normal">LP Tokens</span>
                        </p>
                        {address && (
                          <div className="mt-4">
                            <span className="card-title">
                              Your STRK Balance:{" "}
                              <Balance
                                address={address}
                                className="text-[1rem]"
                              />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm font-normal text-muted-foreground">
                Disclaimer: This DEX is for educational purposes. Trading
                involves risk and you may lose your funds. Always do your own
                research before interacting with smart contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dex;
