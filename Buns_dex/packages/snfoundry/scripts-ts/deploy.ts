import {
  deployContract,
  executeDeployCalls,
  deployer,
  provider,
  exportDeployments,
} from "./deploy-contract";
import { green } from "./helpers/colorize-log";
import { cairo, CallData } from "starknet";

let buns_token: any;
let dex: any;
const STRK_ADDRESS =
  "0x4718F5A0FC34CC1AF16A1CDEE98FFB20C31F5CD61D6AB07201858F4287C938D";
const INITIAL_SUPPLY = cairo.uint256(5_000_000_000_000_000_000n); // 5 * 10^18

/**
 * Deploys the Balloons and Dex contracts.
 */
const deployScript = async (): Promise<void> => {
  buns_token = await deployContract({
    contract: "Buns",
    constructorArgs: {
      // initial_supply: cairo.uint256(1_000_000_000_000_000_000_000n), // 1000 * 10^18
      owner: "0x00b347f940bCFA9C75cA56d0a0fa2A054dfa93D73D4CD3A4145ff98D65b746D5", // In devnet, your deployer.address is by default the first pre-deployed account: 0x64b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691
    },
  });

  dex = await deployContract({
    contract: "Dex",
    constructorArgs: {
      strk_token_address: STRK_ADDRESS,
      token_address: buns_token.address,
      owner: "0x00b347f940bCFA9C75cA56d0a0fa2A054dfa93D73D4CD3A4145ff98D65b746D5",
    },
  });
};

/**
 * Transfers tokens and initializes the DEX.
 */
const transferScript = async (): Promise<void> => {
  try {
    // 1. Check initial balances
    const balanceResponse = await deployer.callContract({
      contractAddress: buns_token.address,
      entrypoint: "balance_of",
      calldata: ["0x00b347f940bCFA9C75cA56d0a0fa2A054dfa93D73D4CD3A4145ff98D65b746D5"],
    });
    console.log("Deployer initial balance:", BigInt(balanceResponse[0]));

    // todo: checkpoint 2 - uncomment to init DEX on deploy:
    // 2. Approve DEX to spend tokens
    let approveResponse = await deployer.execute(
        [
            {
                contractAddress: buns_token.address,
                entrypoint: "approve",
                // approve 1 fri for bridge
                calldata: CallData.compile({
                    spender: dex.address,
                    amount: INITIAL_SUPPLY,
                }),
            },
            {
                contractAddress: STRK_ADDRESS,
                entrypoint: "approve",
                calldata: CallData.compile({
                    spender: dex.address,
                    amount: INITIAL_SUPPLY
                })
            }
        ],
        {
            maxFee: 1e15,
        }
    );
    await provider.waitForTransaction(approveResponse.transaction_hash);
    console.log("Approve token and strk transaction hash:", approveResponse.transaction_hash);

    // 3. Initialize DEX to pull tokens from deployer
    const initResponse = await deployer.execute(
        [{
            contractAddress: dex.address,
            entrypoint: "init",
            calldata: CallData.compile({
                tokens: INITIAL_SUPPLY,  // tokens amount
                strk: INITIAL_SUPPLY // strk amount (0 for now)
            }),
        }],
        {
            maxFee: 1e15,
        }
    );
    await provider.waitForTransaction(initResponse.transaction_hash);
    console.log("DEX Initialization Completed at ", initResponse.transaction_hash);

    // 4. Verify final balances
    const finalDexBalance = await deployer.callContract({
      contractAddress: buns_token.address,
      entrypoint: "balance_of",
      calldata: [dex.address],
    });
    console.log(green("DEX final $BAL balance:"), BigInt(finalDexBalance[0]));
  } catch (error) {
    console.error("DEX setup failed:", error);
    throw error;
  }

 // todo checkpoint 2: - paste in your front-end address here to get 10 balloons from deployer on deploy
  const frontEndAddress = "0x00b347f940bCFA9C75cA56d0a0fa2A054dfa93D73D4CD3A4145ff98D65b746D5";
  const transferAmount = 10_000_000_000_000_000_000n; //10 $BAL
  try {
      const transferResponse = await deployer.execute(
          [
              {
                  contractAddress: buns_token.address,
                  entrypoint: "transfer",
                  calldata: CallData.compile({
                      recipient: frontEndAddress,
                      amount: cairo.uint256(transferAmount)
                  }),
              }
          ],
          {
              maxFee: 1e15,
          }
      );
      await provider.waitForTransaction(transferResponse.transaction_hash);

      // Verify the transfer by checking recipient's balance
      const recipientBalance = await deployer.callContract({
          contractAddress: buns_token.address,
          entrypoint: 'balance_of',
          calldata: [frontEndAddress]
      });
      console.log(`Frontend address ${frontEndAddress} $BAL balance: ${BigInt(recipientBalance[0])} in fri`);
  } catch (error) {
      console.error("Transfer failed:", error);
      throw error;
  }
};

/**
 * Main function to deploy contracts and execute deployment calls.
 */
async function main() {
  await deployScript();
  await executeDeployCalls();
  await exportDeployments();
  // todo checkpoint 2: - uncomment to transferScript
  // await transferScript();
  console.log(green("All Setup Done"));
}

main().catch(console.error);
