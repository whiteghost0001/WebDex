"use client";

import React from "react";

const Dex = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-[90%] md:w-[75%]">
          <div className="container flex flex-col items-center justify-start gap-20 px-4 md:px-8">
            <div className="flex w-full max-w-md flex-col items-center justify-start gap-10">
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <span className="text-2xl font-bold">Starknet Staking</span>
                <span className="text-sm text-muted-foreground">
                  Natively. With 0% commission fees
                </span>
                <span className="text-sm text-muted-foreground">
                  Less smart contract exposure. Keep full custody on your assets
                </span>
              </div>
            </div>
            <div className="flex w-full max-w-6xl flex-col items-end justify-start gap-2">
              <div className="grid w-full grid-cols-1 gap-4 text-sm md:grid-cols-3">
                {/* Stats grid can be added here if needed */}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card text-card-foreground flex w-full max-w-6xl flex-1 flex-col items-center justify-between gap-20 p-6">
              <div className="flex size-full flex-col gap-2">
                {/* Staking content placeholder */}
                <div className="text-center py-8">
                  <h3 className="text-xl font-semibold mb-4">
                    Staking Information
                  </h3>
                  <p className="text-muted-foreground">
                    Staking details and options will be displayed here.
                  </p>
                </div>
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                Disclaimer: The data presented on AVNU is provided 'as is' for
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

export default Dex;
