import 'dotenv/config'; // Import and configure dotenv
import express from 'express';
import cors from 'cors';
import axios from "axios";
import OpenAI from 'openai';
import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';
import crypto from 'crypto';
import { Connection, VersionedTransaction, PublicKey, Keypair } from '@solana/web3.js'; // For Solana
import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import bodyParser from 'body-parser';




// Define __filename and __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 8080;


app.use(cors({
  origin: 'http://localhost:3000', // Ensure this matches your frontend's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

// ✅ EVM OHLCV Endpoint (Ethereum-based pairs)
app.get('/api/ohlcv/evm/:pairAddress', async (req, res) => {
  const { fromDate, toDate, timeframe } = req.query;
  const { pairAddress } = req.params;

  if (!pairAddress || !fromDate || !toDate || !timeframe) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const url = `https://deep-index.moralis.io/api/v2.2/pairs/${pairAddress}/ohlcv?chain=eth&timeframe=${timeframe}&currency=usd&fromDate=${fromDate}&toDate=${toDate}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY, 
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching EVM OHLCV data:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ✅ Solana OHLCV Endpoint
app.get('/api/ohlcv/solana/:pairAddress', async (req, res) => {
  const { fromDate, toDate, timeframe } = req.query;
  const { pairAddress } = req.params;

  if (!pairAddress || !fromDate || !toDate || !timeframe) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const url = `https://solana-gateway.moralis.io/token/mainnet/pairs/${pairAddress}/ohlcv?timeframe=${timeframe}&currency=usd&fromDate=${fromDate}&toDate=${toDate}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching Solana OHLCV data:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});



/***************  Trading Logic Start *********************
 

// Add JSON parsing middleware

app.post('/tradingview-webhook', async (req, res) => {
  try {
    // Step 1: Handle and parse the incoming TradingView data
    const tradingViewData = req.body;
    
    // Check if data is received, log an error if undefined
    if (!tradingViewData || Object.keys(tradingViewData).length === 0) {
      console.error("Error: No data received from TradingView or data is empty.");
      return res.status(400).send("No data received from TradingView.");
    }
    
    console.log('Received data from TradingView:', tradingViewData);

    const { indicator, trend, timeframe, assetTicker, price, volume, contract } = tradingViewData;

    // Validate that the contract address is provided
    if (!contract) {
      console.error("Error: Contranpm stact address is missing from TradingView data.");
      return res.status(400).send("Contract address is missing from TradingView data.");
    }

    // Step 2: Fetch NFTs from Moralis using the contract address
    const nftResponse = await Moralis.EvmApi.nft.getContractNFTs({
      address: contract,
      chain: EvmChain.BASE_SEPOLIA,
      format: 'decimal',
      normalizeMetadata: true,
    });

    // Step 3: Filter for active NFTs with a matching indicator
    const filteredNFTs = nftResponse.raw.result.filter(nft => {
      try {
        const metadata = JSON.parse(nft.metadata);
        
        // Check if the NFT is active and if the trend matches the indicator from TradingView
        const isActive = metadata.attributes.some(attr => attr.trait_type === "Status" && attr.value === "Active");
        const hasMatchingTrend = metadata.description === indicator;

        return isActive && hasMatchingTrend;
      } catch (e) {
        console.error("Error parsing metadata:", e.message);
        return false;
      }
    });

    // Log the filtered NFTs
    console.log("Active NFTs with matching trend:", filteredNFTs);

    res.status(200).send('Data processed and active NFTs with matching trend found');
  } catch (error) {
    console.error('Error handling TradingView webhook:', error.message);
    res.status(500).send('Error processing TradingView webhook');
  }
});

/***************  Trading Logic End *********************/


/***************  Hard Coded Trading Logic *********************/

const SOLANA_RPC = "https://solana-mainnet.g.alchemy.com/v2/PAtsWUaSQ5zE5KLRvssArvkFS-Ex3GPn";
const connection = new Connection(SOLANA_RPC);

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; 
const SOL_MINT = "So11111111111111111111111111111111111111112";

const PRIVATE_KEY = Uint8Array.from([
  68, 62, 192, 53, 244, 81, 157, 33, 205, 82, 228, 91, 202, 201, 178, 237,
  74, 166, 134, 111, 214, 32, 131, 19, 62, 178, 215, 137, 114, 56, 229, 205,
  218, 50, 92, 56, 175, 92, 121, 11, 228, 174, 210, 212, 150, 236, 89, 107,
  143, 97, 221, 142, 237, 154, 73, 246, 233, 222, 94, 109, 3, 40, 101, 75
]);

const keypair = Keypair.fromSecretKey(PRIVATE_KEY);

const fetchBalances = async (publicKey) => {
  try {
    const solBalanceLamports = await connection.getBalance(publicKey);
    const solBalance = solBalanceLamports / 10 ** 9;

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      mint: new PublicKey(USDC_MINT),
    });
    const usdcBalance = tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;

    return { sol: solBalance, usdc: usdcBalance };
  } catch (error) {
    console.error("Error fetching balances:", error.message);
    throw error;
  }
};

// 🚀 **Reliable Transaction Confirmation**
const confirmTransactionReliable = async (signature) => {
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 3000; // 3 seconds per retry

  while (attempts < maxAttempts) {
    try {
      const statusResponse = await connection.getSignatureStatus(signature);
      const status = statusResponse.value;

      if (status && status.confirmationStatus === "finalized") {
        console.log(`✅ Transaction confirmed via status check: ${signature}`);
        return true;
      }

      // Fallback to full confirmation check
      const confirmation = await connection.getConfirmedTransaction(signature);
      if (confirmation && confirmation.meta && confirmation.meta.err === null) {
        console.log(`✅ Transaction confirmed via detailed check: ${signature}`);
        return true;
      }
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempts + 1}: Confirmation failed. Retrying...`);
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    attempts++;
  }

  console.error('Transaction confirmation failed after retries.');
  return false;
};

app.post('/tradingview-webhook', async (req, res) => {
  try {
    const { indicator } = req.body;

    if (!indicator) {
      return res.status(400).json({ error: "'indicator' is required in the request." });
    }

    console.log(`📊 Received indicator: ${indicator}`);

    const balances = await fetchBalances(keypair.publicKey);
    console.log(`💰 Balances - SOL: ${balances.sol} | USDC: ${balances.usdc}`);

    let fromToken, toToken, amount;

    if (indicator === "bullish") {
      fromToken = USDC_MINT;
      toToken = SOL_MINT;
      amount = Math.floor(balances.usdc * 10 ** 6); 
    } else if (indicator === "bearish") {
      fromToken = SOL_MINT;
      toToken = USDC_MINT;
      const solToKeep = 0.01;
      amount = Math.floor((balances.sol - solToKeep) * 10 ** 9);
      if (amount <= 0) {
        return res.status(400).json({ error: "Not enough SOL to trade after reserving for fees." });
      }
    } else {
      return res.status(400).json({ error: `Unknown indicator '${indicator}'` });
    }

    console.log(`🔄 Trading ${amount} of ${fromToken} → ${toToken}`);

    const quoteResponse = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
      params: {
        inputMint: fromToken,
        outputMint: toToken,
        amount,
        slippageBps: 50,
        restrictIntermediateTokens: true,
      },
    });

    const swapResponse = await axios.post(`https://quote-api.jup.ag/v6/swap`, {
      userPublicKey: keypair.publicKey.toBase58(),
      quoteResponse: quoteResponse.data,
      dynamicSlippage: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000,
          priorityLevel: "veryHigh",
        },
      },
    });

    const { swapTransaction } = swapResponse.data;
    const transactionBuffer = Buffer.from(swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    transaction.sign([keypair]);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      maxRetries: 2,
      skipPreflight: true,
    });

    console.log(`Transaction sent with signature: ${signature}`);

    const isConfirmed = await confirmTransactionReliable(signature);

    if (!isConfirmed) {
      return res.status(500).json({ error: 'Transaction confirmation failed', signature });
    }

    console.log(`Transaction successful: ${signature}`);
    return res.status(200).json({ message: 'Transaction successful', signature });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      error: error.message,
      details: error.response ? error.response.data : "No additional error details."
    });
  }
});


/***************  Trading Logic End *********************/





// Initialize Moralis SDK
Moralis.start({
  apiKey: process.env.MORALIS_API_KEY,
});

// Log the OpenAI API Key to verify it's loaded correctly
console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY}`);

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is in the .env file
});

// Endpoint to fetch wallet balances
app.get('/balances', async (req, res) => {
  try {
    const { address } = req.query; // Extract wallet address from query parameters

    if (!address) {
      return res.status(400).json({ error: 'Address parameter is missing' });
    }

    console.log(`Fetching balances for address: ${address}`);

    const [nativeBalance, tokenBalances] = await Promise.all([
      Moralis.EvmApi.balance.getNativeBalance({
        chain: EvmChain.BASE_SEPOLIA,
        address,
      }),
      Moralis.EvmApi.token.getWalletTokenBalances({
        chain: EvmChain.BASE_SEPOLIA,
        address,
      }),
    ]);

    console.log("Fetched balances:", { nativeBalance, tokenBalances });

    res.status(200).json({
      address,
      nativeBalance: nativeBalance.result.balance.ether,
      tokenBalances: tokenBalances.result.map(token => token.display()),
    });
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Error fetching balances' });
  }
});

app.get('/solana/balance', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    console.log(`Fetching Solana balance for address: ${address}`);

    // Fetch SPL tokens using Moralis
    const response = await Moralis.SolApi.account.getSPL({
      network: 'mainnet', // Use 'testnet' or 'devnet' if needed
      address,
    });

    console.log('Raw response from Moralis API:', response.raw);

    // Look for USDC token using the mint address
    const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const usdcToken = response.raw.find((token) => token.mint === USDC_MINT_ADDRESS);

    if (!usdcToken) {
      console.log('USDC token not found for this address.');
      return res.status(200).json({ address, usdcBalance: 0 });
    }

    // Correctly calculate the USDC balance
    const usdcBalance = parseFloat(usdcToken.amount); // Ensure it's parsed as a float

    console.log('USDC balance:', usdcBalance);

    res.status(200).json({ address, usdcBalance });
  } catch (error) {
    console.error('Error fetching Solana balance:', error.message);
    res.status(500).json({ error: 'Error fetching Solana balance' });
  }
});


app.get('/ethereum/balance', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    console.log(`Fetching Ethereum balance for address: ${address}`);

    const USDC_CONTRACT_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

    const tokenBalances = await Moralis.EvmApi.token.getWalletTokenBalances({
      chain: EvmChain.ETHEREUM,
      address,
    });

    const usdcToken = tokenBalances.result.find(
      (token) => token.token_address.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase()
    );

    const usdcBalance = usdcToken ? usdcToken.balance / Math.pow(10, usdcToken.decimals) : 0;

    res.status(200).json({ address, usdcBalance });
  } catch (error) {
    console.error('Error fetching Ethereum balance:', error.message);
    res.status(500).json({ error: 'Error fetching Ethereum balance' });
  }
});


// Endpoint to fetch NFT metadata
app.get('/nft-metadata', async (req, res) => {
  try {
    const { address, tokenId, chain } = req.query; // Extract contract address, token ID, and chain from query parameters

    if (!address || !tokenId || !chain) {
      return res.status(400).json({ error: 'Address, tokenId, and chain parameters are missing' });
    }

    console.log(`Fetching NFT metadata for address: ${address}, tokenId: ${tokenId}, chain: ${chain}`);

    const response = await Moralis.EvmApi.nft.getNFTMetadata({
      chain,
      address,
      tokenId,
      limit,
      normalizeMetadata: true,
    });

    console.log("Fetched NFT metadata:", response.raw);

    res.status(200).json(response.raw);
  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    res.status(500).json({ error: 'Error fetching NFT metadata' });
  }
});

// Endpoint to fetch NFTs by contract address
app.get('/contract-nfts', async (req, res) => {
  try {
    const { address, chain } = req.query;

    if (!address || !chain) {
      return res.status(400).json({ error: 'Address and chain parameters are required' });
    }

    console.log(`Fetching NFTs for contract: ${address}, chain: ${chain}`);

    const response = await Moralis.EvmApi.nft.getContractNFTs({
      address,
      chain,
      format: 'decimal',
      limit: 100,  // Adjust limit as needed
      normalizeMetadata: true,
    });

    console.log("Fetched contract NFTs:", response.raw);

    res.status(200).json(response.raw);
  } catch (error) {
    console.error('Error fetching contract NFTs:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching contract NFTs' });
  }
});


// Endpoint to fetch portfolio for a given wallet address
app.get('/api/getPortfolio', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    console.log(`Fetching portfolio for Solana wallet: ${address}`);

    const portfolioResponse = await Moralis.SolApi.account.getPortfolio({
      network: 'mainnet',
      address,
    });

    // Extract SPL tokens
    const tokens = (portfolioResponse.raw.tokens || []).map((token) => ({
      name: token.name || "Unknown Token",
      symbol: token.symbol || "N/A",
      mintAddress: token.mint,
      balance: token.amountRaw, // Using raw amount for consistency
      decimals: token.decimals || 0,
      logo: token.logo || "", 
      type: "token",
    }));

    // Extract native SOL balance from API response
    const nativeBalance = portfolioResponse.raw.nativeBalance;
    const solAsset = {
      name: "Solana",
      symbol: "SOL",
      mintAddress: "So11111111111111111111111111111111111111112", // Standard mint for SOL
      balance: nativeBalance.lamports,
      decimals: 9, 
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      type: "native",
    };

    // Only add SOL if the balance is greater than zero
    const formattedAssets = nativeBalance.lamports > 0
      ? [solAsset, ...tokens]
      : [...tokens];

    console.log('Formatted portfolio data:', formattedAssets);
    res.status(200).json({ assets: formattedAssets });
  } catch (error) {
    console.error('Error fetching portfolio:', error.message);
    res.status(500).json({ error: 'Error fetching portfolio', message: error.message });
  }
});


/******** Fetch the Token Prices APIs Beginning **********/

app.get('/api/token-price', async (req, res) => {
  const { network, address } = req.query;

  try {
    console.log(`Fetching token price for network: ${network}, address: ${address}`);
    
    // Use Moralis SDK to fetch token price
    const tokenPrice = await Moralis.SolApi.token.getTokenPrice({
      network,
      address,
    });

    console.log('Successfully retrieved token price:', tokenPrice.raw);

    res.status(200).json({
      exchangeName: tokenPrice.raw.exchangeName || 'Unknown',
      nativePrice: tokenPrice.raw.nativePrice || {},
      usdPrice: tokenPrice.raw.usdPrice || 0,
    });
  } catch (error) {
    console.error('Server error fetching token price:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/******** Fetch the Token Prices APIs End **********/


app.get('/wallet-nfts', async (req, res) => {
  try {
    const { address, chain, format = 'decimal', mediaItems = false, tokenAddresses } = req.query;
    
    console.log("Request Params: ", { address, chain, tokenAddresses }); // Check incoming params

    if (!address || !chain || !tokenAddresses) {
      return res.status(400).json({ error: 'Address, chain, and tokenAddresses parameters are missing' });
    }

    const response = await Moralis.EvmApi.nft.getWalletNFTs({
      chain,
      address,
      format,
      mediaItems,
      tokenAddresses: [tokenAddresses],
    });

    console.log("NFT API Response: ", response.raw); // Log the Moralis response

    res.status(200).json(response.raw);
  } catch (error) {
    console.error('Error fetching wallet NFTs:', error);
    res.status(500).json({ error: 'Error fetching wallet NFTs' });
  }
});



/********BotDetailsPage Transactions Widget 2 Fees**************




app.get("/api/solana/transactions", async (req, res) => {
  const { address, limit = 10 } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Address parameter is required" });
  }

  try {
    const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
    const ALCHEMY_RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const connection = new Connection(ALCHEMY_RPC_URL, "confirmed");

    console.log(`Fetching transactions for address: ${address}`);

    const transactionLimit = Number(limit);
    if (isNaN(transactionLimit)) {
      return res
        .status(400)
        .json({ error: "Invalid limit parameter. Must be a number." });
    }

    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(address),
      { limit: transactionLimit }
    );

    if (!signatures || signatures.length === 0) {
      console.log("No transaction signatures found.");
      return res.status(200).json({ transactions: [] });
    }

    console.log(`Found ${signatures.length} transaction signatures`);

    const transactions = await Promise.all(
      signatures.map(async (signatureInfo) => {
        try {
          console.log(`Fetching details for signature: ${signatureInfo.signature}`);

          const transactionDetails = await connection.getTransaction(
            signatureInfo.signature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          );

          if (!transactionDetails || !transactionDetails.meta) {
            console.warn(`No details found for signature ${signatureInfo.signature}`);
            return null;
          }

          // Ensure meta exists
          const meta = transactionDetails.meta || {};
          const instructions = transactionDetails.transaction?.message?.instructions || [];
          const innerInstructions = meta.innerInstructions || [];

          let transactionType = "Transfer"; // Default
          let interactedAddress = "N/A";
          let isBuy = false;
          let isSell = false;
          let isFee = false;

          // Token Mints
          const SOL_MINT = "So11111111111111111111111111111111111111112";
          const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
          const JUPITER_PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

          // Step 1: Check for Jupiter Swap transactions
          const isJupiterSwap =
            instructions.some((inst) => inst?.programId?.toBase58() === JUPITER_PROGRAM) ||
            innerInstructions.some((innerInst) =>
              innerInst.instructions?.some(
                (inst) => inst?.programId?.toBase58() === JUPITER_PROGRAM
              )
            );

          if (isJupiterSwap) {
            console.log(`🚀 Jupiter Swap detected in transaction ${signatureInfo.signature}`);

            let receivedSOL = false;
            let receivedUSDC = false;
            let spentSOL = false;
            let spentUSDC = false;

            // Step 2: Check for token transfers inside `innerInstructions`
            innerInstructions.forEach((innerInstGroup) => {
              innerInstGroup.instructions.forEach((instruction) => {
                if (instruction?.parsed?.info) {
                  const { source, destination, mint } = instruction.parsed.info;

                  if (mint) {
                    if (mint === SOL_MINT) {
                      if (source === address) spentSOL = true;
                      if (destination === address) receivedSOL = true;
                    } else if (mint === USDC_MINT) {
                      if (source === address) spentUSDC = true;
                      if (destination === address) receivedUSDC = true;
                    }
                  }
                }
              });
            });

            // Determine if it's a Buy or Sell
            if (receivedSOL && spentUSDC) {
              transactionType = "Buy"; // Bought SOL using USDC
              isBuy = true;
            } else if (receivedUSDC && spentSOL) {
              transactionType = "Sell"; // Sold SOL for USDC
              isSell = true;
            }

            console.log(`Transaction ${signatureInfo.signature} labeled as: ${transactionType}`);
          }

          // Step 3: Identify Fee Payments (Check if only a small balance change)
          if (meta.preBalances && meta.postBalances) {
            const preBalance = meta.preBalances[0] || 0;
            const postBalance = meta.postBalances[0] || 0;
            const balanceChange = (postBalance - preBalance) / 10 ** 9;

            if (Math.abs(balanceChange) < 0.00001 && meta.fee > 0) {
              transactionType = "Fee Payment";
              isFee = true;
            }
          }

          // Step 4: Check for Token Transfers if not a swap or fee
          if (!isBuy && !isSell && !isFee) {
            instructions.forEach((instruction) => {
              if (instruction?.parsed?.info) {
                const { source, destination, tokenAmount } = instruction.parsed.info;

                if (source === address) {
                  interactedAddress = destination;
                  transactionType = tokenAmount ? "Token Transfer" : "Transfer";
                } else if (destination === address) {
                  interactedAddress = source;
                  transactionType = tokenAmount ? "Token Transfer" : "Transfer";
                }
              }
            });
          }

          return {
            signature: signatureInfo.signature,
            blockTime: transactionDetails.blockTime || null,
            fee: meta?.fee || null,
            preBalances: meta?.preBalances || [],
            postBalances: meta?.postBalances || [],
            instructions,
            innerInstructions,
            transactionType,
            interactedAddress,
          };
        } catch (err) {
          console.error(`Error fetching details for signature ${signatureInfo.signature}: ${err.message}`);
          return null;
        }
      })
    );

    const filteredTransactions = transactions.filter((tx) => tx !== null);

    console.log(`Returning ${filteredTransactions.length} valid transactions`);
    res.status(200).json({ transactions: filteredTransactions });
  } catch (error) {
    console.error("Error fetching Solana transactions:", error.message);
    res.status(500).json({ error: "Error fetching Solana transactions", message: error.message });
  }
});



/********BotDetailsPage Transactions Widget 2 Fees**************/

/********BotDetailsPage Transactions Widget 3 Swaps **************


app.get("/api/solana/transactions", async (req, res) => {
  const { address, limit = 30 } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Address parameter is required" });
  }

  try {
    const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
    const ALCHEMY_RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const connection = new Connection(ALCHEMY_RPC_URL, "confirmed");

    console.log(`Fetching transactions for address: ${address}`);

    const transactionLimit = Number(limit);
    if (isNaN(transactionLimit)) {
      return res.status(400).json({ error: "Invalid limit parameter. Must be a number." });
    }

    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(address),
      { limit: transactionLimit }
    );

    if (!signatures || signatures.length === 0) {
      console.log("No transaction signatures found.");
      return res.status(200).json({ transactions: [] });
    }

    console.log(`Found ${signatures.length} transaction signatures`);

    const transactions = await Promise.all(
      signatures.map(async (signatureInfo) => {
        try {
          console.log(`Fetching details for signature: ${signatureInfo.signature}`);

          const transactionDetails = await connection.getTransaction(
            signatureInfo.signature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          );

          if (!transactionDetails || !transactionDetails.meta) {
            console.warn(`No details found for signature ${signatureInfo.signature}`);
            return null;
          }

          const meta = transactionDetails.meta;
          const preTokenBalances = meta.preTokenBalances || [];
          const postTokenBalances = meta.postTokenBalances || [];

          // Log balances to debug
          console.log(`💾 preTokenBalances:`, JSON.stringify(preTokenBalances, null, 2));
          console.log(`💾 postTokenBalances:`, JSON.stringify(postTokenBalances, null, 2));

          // 🛒 Swap Detection Logic
          const tokenChanges = {};

          // Track pre balances
          preTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            tokenChanges[mint] = {
              pre: uiTokenAmount?.uiAmount || 0,
              post: 0,
            };
          });

          // Track post balances
          postTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            if (tokenChanges[mint]) {
              tokenChanges[mint].post = uiTokenAmount?.uiAmount || 0;
            }
          });

          // Identify spent and received tokens
          const spentTokens = [];
          const receivedTokens = [];

          for (const mint in tokenChanges) {
            const { pre, post } = tokenChanges[mint];
            const change = post - pre;

            if (change < 0) {
              spentTokens.push({
                mint,
                amount: Math.abs(change),
              });
            } else if (change > 0) {
              receivedTokens.push({
                mint,
                amount: change,
              });
            }
          }

          // Log token changes to the console
          console.log(`💸 Spent Tokens:`, JSON.stringify(spentTokens, null, 2));
          console.log(`💰 Received Tokens:`, JSON.stringify(receivedTokens, null, 2));

          let transactionType = "Transfer";
          if (spentTokens.length > 0 && receivedTokens.length > 0) {
            transactionType = "Swap";
          }

          // ✅ Return Processed Transaction
          return {
            signature: signatureInfo.signature,
            blockTime: transactionDetails.blockTime || null,
            fee: meta?.fee || null,
            transactionType,
            spentTokens,
            receivedTokens,
            preBalances: meta?.preBalances || [],
            postBalances: meta?.postBalances || [],
            preTokenBalances,
            postTokenBalances,
          };
        } catch (err) {
          console.error(
            `Error fetching details for signature ${signatureInfo.signature}: ${err.message}`
          );
          return null;
        }
      })
    );

    const filteredTransactions = transactions.filter((tx) => tx !== null);

    console.log(`Returning ${filteredTransactions.length} valid transactions`);
    res.status(200).json({ transactions: filteredTransactions });
  } catch (error) {
    console.error("Error fetching Solana transactions:", error.message);
    res.status(500).json({
      error: "Error fetching Solana transactions",
      message: error.message,
    });
  }
});


/********BotDetailsPage Transactions Widget 3 Swaps **************/

/********BotDetailsPage Transactions Widget 3 Swaps **************
app.get("/api/solana/transactions", async (req, res) => {
  const { address, limit = 30 } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Address parameter is required" });
  }

  try {
    const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
    const ALCHEMY_RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const connection = new Connection(ALCHEMY_RPC_URL, "confirmed");

    console.log(`Fetching transactions for address: ${address}`);

    const transactionLimit = Number(limit);
    if (isNaN(transactionLimit)) {
      return res.status(400).json({ error: "Invalid limit parameter. Must be a number." });
    }

    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(address),
      { limit: transactionLimit }
    );

    // ✅ Fixed Signature Check
    if (!signatures || signatures.length === 0) {
      console.log("No transaction signatures found.");
      return res.status(200).json({ transactions: [] });
    }

    console.log(`Found ${signatures.length} transaction signatures`);

    const transactions = await Promise.all(
      signatures.map(async (signatureInfo) => {
        try {
          console.log(`Fetching details for signature: ${signatureInfo.signature}`);

          const transactionDetails = await connection.getTransaction(
            signatureInfo.signature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          );

          if (!transactionDetails || !transactionDetails.meta) {
            console.warn(`No details found for signature ${signatureInfo.signature}`);
            return null;
          }

          const meta = transactionDetails.meta;
          const preTokenBalances = meta.preTokenBalances || [];
          const postTokenBalances = meta.postTokenBalances || [];
          const preBalances = meta.preBalances || [];
          const postBalances = meta.postBalances || [];
          const feeInSOL = meta.fee / 10 ** 9;

          // -------------------------
          // 🛒 Step 1: Swap Detection
          // -------------------------
          const tokenChanges = {};

          // Track pre balances
          preTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            tokenChanges[mint] = {
              pre: uiTokenAmount?.uiAmount || 0,
              post: 0,
            };
          });

          // Track post balances
          postTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            if (tokenChanges[mint]) {
              tokenChanges[mint].post = uiTokenAmount?.uiAmount || 0;
            }
          });

          // Identify spent and received tokens
          const spentTokens = [];
          const receivedTokens = [];

          for (const mint in tokenChanges) {
            const { pre, post } = tokenChanges[mint];
            const change = post - pre;

            if (change < 0) {
              spentTokens.push({ mint, amount: Math.abs(change) });
            } else if (change > 0) {
              receivedTokens.push({ mint, amount: change });
            }
          }

          // -------------------------
          // 💸 Step 2: Improved Fee Detection
          // -------------------------
          let transactionType = "Transfer";
          const solChange = (postBalances[0] - preBalances[0]) / 10 ** 9;

          // ✅ Improved Fee Detection:
          // A fee transaction is characterized by:
          // - Small negative SOL balance change equal to the fee.
          // - No other tokens transferred or received.
          // - No significant SOL transfer beyond the fee amount.
          const isFeeTransaction =
            Math.abs(solChange + feeInSOL) < 0.00001 &&
            spentTokens.length === 0 &&
            receivedTokens.length === 0;

          if (isFeeTransaction) {
            transactionType = "Fee Payment";
          }

          // -------------------------
          // 🛒 Step 3: Swap Detection
          // -------------------------
          if (spentTokens.length > 0 && receivedTokens.length > 0) {
            transactionType = "Swap";
          }

          // -------------------------
          // 🔁 Step 4: Transfer Detection
          // -------------------------
          if (
            spentTokens.length === 1 &&
            receivedTokens.length === 0 &&
            !isFeeTransaction
          ) {
            transactionType = "Transfer";
          }

          // ✅ Return Processed Transaction
          return {
            signature: signatureInfo.signature,
            blockTime: transactionDetails.blockTime || null,
            fee: meta.fee || null,
            transactionType,
            spentTokens,
            receivedTokens,
            preBalances,
            postBalances,
            preTokenBalances,
            postTokenBalances,
          };
        } catch (err) {
          console.error(
            `Error fetching details for signature ${signatureInfo.signature}: ${err.message}`
          );
          return null;
        }
      })
    );

    const filteredTransactions = transactions.filter((tx) => tx !== null);

    console.log(`Returning ${filteredTransactions.length} valid transactions`);
    res.status(200).json({ transactions: filteredTransactions });
  } catch (error) {
    console.error("Error fetching Solana transactions:", error.message);
    res.status(500).json({
      error: "Error fetching Solana transactions",
      message: error.message,
    });
  }
});

/********BotDetailsPage Transactions Widget 3 Swaps **************/

/********BotDetailsPage Transactions Widget 3 Swaps **************
app.get("/api/solana/transactions", async (req, res) => {
  const { address, limit = 30 } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Address parameter is required" });
  }

  try {
    const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
    const ALCHEMY_RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const connection = new Connection(ALCHEMY_RPC_URL, "confirmed");

    console.log(`Fetching transactions for address: ${address}`);

    const transactionLimit = Number(limit);
    if (isNaN(transactionLimit)) {
      return res.status(400).json({ error: "Invalid limit parameter. Must be a number." });
    }

    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(address),
      { limit: transactionLimit }
    );

    if (!signatures || signatures.length === 0) {
      console.log("No transaction signatures found.");
      return res.status(200).json({ transactions: [] });
    }

    console.log(`Found ${signatures.length} transaction signatures`);

    const transactions = await Promise.all(
      signatures.map(async (signatureInfo) => {
        try {
          console.log(`Fetching details for signature: ${signatureInfo.signature}`);

          const transactionDetails = await connection.getTransaction(
            signatureInfo.signature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          );

          if (!transactionDetails || !transactionDetails.meta) {
            console.warn(`No details found for signature ${signatureInfo.signature}`);
            return null;
          }

          const meta = transactionDetails.meta;
          const preTokenBalances = meta.preTokenBalances || [];
          const postTokenBalances = meta.postTokenBalances || [];
          const preBalances = meta.preBalances || [];
          const postBalances = meta.postBalances || [];
          const feeInSOL = meta.fee / 10 ** 9;

          // 🟡 Initialize transaction type here (prevents 'before initialization' error)
          let transactionType = "Transfer";

          // -------------------------
          // 🛒 Step 1: Swap Detection
          // -------------------------
          const tokenChanges = {};
          preTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            tokenChanges[mint] = { pre: uiTokenAmount?.uiAmount || 0, post: 0 };
          });
          postTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            if (tokenChanges[mint]) {
              tokenChanges[mint].post = uiTokenAmount?.uiAmount || 0;
            }
          });

          // Identify spent and received assets
          const spentAssets = [];
          const receivedAssets = [];
          for (const mint in tokenChanges) {
            const { pre, post } = tokenChanges[mint];
            const change = post - pre;
            if (change < 0) {
              spentAssets.push({ mint, amount: Math.abs(change) });
            } else if (change > 0) {
              receivedAssets.push({ mint, amount: change });
            }
          }

          // -------------------------
          // 💸 Step 2: Improved Fee Detection
          // -------------------------
          const solChange = (postBalances[0] - preBalances[0]) / 10 ** 9;
          const isFeeTransaction =
            Math.abs(solChange + feeInSOL) < 0.00001 &&
            spentAssets.length === 0 &&
            receivedAssets.length === 0;

          if (isFeeTransaction) {
            transactionType = "Fee Payment";
          }

          // -------------------------
          // 🛒 Step 3: Swap Detection
          // -------------------------
          if (spentAssets.length > 0 && receivedAssets.length > 0) {
            transactionType = "Swap";
          }

          // -------------------------
          // 🔁 Step 4: Transfer Detection
          // -------------------------
          if (
            spentAssets.length === 1 &&
            receivedAssets.length === 0 &&
            !isFeeTransaction
          ) {
            transactionType = "Transfer";
          }

          // ✅ Return Processed Transaction
          return {
            signature: signatureInfo.signature,
            blockTime: transactionDetails.blockTime || null,
            fee: meta.fee || null,
            transactionType,
            spentAssets,
            receivedAssets,
            preBalances,
            postBalances,
            preTokenBalances,
            postTokenBalances,
          };
        } catch (err) {
          console.error(
            `Error fetching details for signature ${signatureInfo.signature}: ${err.message}`
          );
          return null;
        }
      })
    );

    const filteredTransactions = transactions.filter((tx) => tx !== null);

    console.log(`Returning ${filteredTransactions.length} valid transactions`);
    res.status(200).json({ transactions: filteredTransactions });
  } catch (error) {
    console.error("Error fetching Solana transactions:", error.message);
    res.status(500).json({
      error: "Error fetching Solana transactions",
      message: error.message,
    });
  }
});

/********BotDetailsPage Transactions Widget 3 Swaps **************/


// Correct Buy/Sell Logic for Solana Swaps
app.get("/api/solana/transactions", async (req, res) => {
  const { address, limit = 30 } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Address parameter is required" });
  }

  try {
    const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
    const ALCHEMY_RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const connection = new Connection(ALCHEMY_RPC_URL, "confirmed");

    console.log(`Fetching transactions for address: ${address}`);

    const transactionLimit = Number(limit);
    if (isNaN(transactionLimit)) {
      return res.status(400).json({ error: "Invalid limit parameter. Must be a number." });
    }

    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(address),
      { limit: transactionLimit }
    );

    if (!signatures || signatures.length === 0) {
      console.log("No transaction signatures found.");
      return res.status(200).json({ transactions: [] });
    }

    console.log(`Found ${signatures.length} transaction signatures`);

    const transactions = await Promise.all(
      signatures.map(async (signatureInfo) => {
        try {
          const transactionDetails = await connection.getTransaction(
            signatureInfo.signature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          );

          if (!transactionDetails || !transactionDetails.meta) {
            return null;
          }

          const meta = transactionDetails.meta;
          const preTokenBalances = meta.preTokenBalances || [];
          const postTokenBalances = meta.postTokenBalances || [];
          const preBalances = meta.preBalances || [];
          const postBalances = meta.postBalances || [];
          const feeInSOL = meta.fee / 10 ** 9;

          let transactionType = "Transfer";

          // Known Token Mints
          const SOL_MINT = "So11111111111111111111111111111111111111112";
          const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

          // -------------------------
          // 🛒 Step 1: Track Token Changes
          // -------------------------
          const tokenChanges = {};
          preTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            tokenChanges[mint] = { pre: uiTokenAmount?.uiAmount || 0, post: 0 };
          });
          postTokenBalances.forEach(({ mint, uiTokenAmount }) => {
            if (tokenChanges[mint]) {
              tokenChanges[mint].post = uiTokenAmount?.uiAmount || 0;
            }
          });

          // Identify Spent and Received Assets
          const spentAssets = [];
          const receivedAssets = [];

          for (const mint in tokenChanges) {
            const { pre, post } = tokenChanges[mint];
            const change = post - pre;
            if (change < 0) {
              spentAssets.push({ mint, amount: Math.abs(change) });
            } else if (change > 0) {
              receivedAssets.push({ mint, amount: change });
            }
          }

          // -------------------------
          // 💸 Step 2: Fee Detection
          // -------------------------
          const solChange = (postBalances[0] - preBalances[0]) / 10 ** 9;
          const isFeeTransaction =
            Math.abs(solChange + feeInSOL) < 0.00001 &&
            spentAssets.length === 0 &&
            receivedAssets.length === 0;

          if (isFeeTransaction) {
            transactionType = "Fee Payment";
          }

          // -------------------------
          // 🛒 Step 3: Swap Detection with Correct Buy/Sell Logic
          // -------------------------

          if (spentAssets.length > 0 && receivedAssets.length > 0) {
            const spentUSDC = spentAssets.find(asset => asset.mint === USDC_MINT);
            const receivedSOL = receivedAssets.find(asset => asset.mint === SOL_MINT);
            const spentSOL = spentAssets.find(asset => asset.mint === SOL_MINT);
            const receivedUSDC = receivedAssets.find(asset => asset.mint === USDC_MINT);
          
            // ✅ Corrected Buy/Sell Logic Based on Spent/Received Tokens
            if (spentUSDC && receivedSOL) {
              transactionType = "Sell SOL";  // USDC out, SOL in
            } else if (spentSOL && receivedUSDC) {
              transactionType = "Buy SOL"; // SOL out, USDC in
            } else {
              transactionType = "Swap";
            }
          }

          // -------------------------
          // 🔁 Step 4: Transfer Detection
          // -------------------------
          if (
            spentAssets.length === 1 &&
            receivedAssets.length === 0 &&
            !isFeeTransaction
          ) {
            transactionType = "Transfer";
          }

          // ✅ Return Processed Transaction
          return {
            signature: signatureInfo.signature,
            blockTime: transactionDetails.blockTime || null,
            fee: meta.fee || null,
            transactionType,
            spentAssets,
            receivedAssets,
            preBalances,
            postBalances,
            preTokenBalances,
            postTokenBalances,
          };
        } catch (err) {
          console.error(`Error fetching details for signature ${signatureInfo.signature}: ${err.message}`);
          return null;
        }
      })
    );

    const filteredTransactions = transactions.filter(tx => tx !== null);

    console.log(`Returning ${filteredTransactions.length} valid transactions`);
    res.status(200).json({ transactions: filteredTransactions });
  } catch (error) {
    console.error("Error fetching Solana transactions:", error.message);
    res.status(500).json({
      error: "Error fetching Solana transactions",
      message: error.message,
    });
  }
});


























// Endpoint to generate a strategy using OpenAI
app.post('/api/generate-strategy', async (req, res) => {
  const { userStrategy } = req.body;

  console.log("Received strategy request:", userStrategy);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",  // Ensure the model name matches what you intend to use
      messages: [{ role: "user", content: userStrategy }],
    });

    console.log("OpenAI API response:", response);

    const tradingInstructions = response.choices[0].message.content;

    res.send({ status: 'success', instructions: tradingInstructions });
  } catch (error) {
    console.error("Error with OpenAI API or processing:", error);
    res.status(500).send({ status: 'error', message: 'Failed to generate strategy or execute trade' });
  }
});

// Endpoint to encrypt data
app.post('/api/encrypt', (req, res) => {
  try {
    const { data } = req.body;
    
    const secretKey = process.env.DECRYPTION_KEY;
    if (!secretKey || secretKey.length !== 32) {
      throw new Error('Secret key is invalid. It must be 32 characters (256 bits).');
    }

    console.log('Received data for encryption:', data);
    console.log('Using secret key for encryption:', secretKey);

    // Ensure the secret key is 32 bytes
    const key = crypto.createHash('sha256').update(secretKey).digest();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const encryptedData = iv.toString('hex') + ':' + encrypted;

    console.log('Encrypted data:', encryptedData);

    // Send the encrypted data back to the front-end
    res.status(200).json({ encryptedData });
  } catch (error) {
    console.error('Error encrypting data:', error.message);
    res.status(500).json({ error: 'Error encrypting data' });
  }
});




app.get('/wallet-assets-with-prices', async (req, res) => {
  try {
    const { address, chain } = req.query;

    if (!address || !chain) {
      return res.status(400).json({ error: 'Address and chain parameters are required' });
    }

    let assets = [];

    if (chain.toLowerCase() === 'solana') {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const publicKey = new PublicKey(address);

      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      assets.push({
        name: 'SOL',
        type: 'SOL',
        amount: solBalance / 10 ** 9,
        mintAddress: 'So11111111111111111111111111111111111111112',
      });
    }

    // Fetch token prices
    const assetsWithPrices = await Promise.all(
      assets.map(async (asset) => {
        try {
          const response = await axios.get(
            `https://solana-gateway.moralis.io/token/devnet/${asset.mintAddress}/price`,
            { headers: moralisHeaders }
          );
          const usdPrice = response.data.usdPrice || 0;
          return { ...asset, usdPrice, totalValue: asset.amount * usdPrice };
        } catch (error) {
          console.error(`Error fetching price for ${asset.name}:`, error.message);
          return { ...asset, usdPrice: 0, totalValue: 0 };
        }
      })
    );

    res.status(200).json({ assets: assetsWithPrices });
  } catch (error) {
    console.error('Error fetching assets:', error.message);
    res.status(500).json({ error: 'Error fetching assets' });
  }
});








const PORT = process.env.PORT || 8081; // Use environment variable or default to 8080

app.use(bodyParser.json());

app.post('/api/swap', async (req, res) => {
  try {
    const { quote, userPublicKey } = req.body;

    if (!quote || !userPublicKey) {
      return res.status(400).json({ error: 'Missing quote or userPublicKey' });
    }

    const swapResponse = await axios.post('https://api.jup.ag/swap/v1/swap', {
      quoteResponse: quote,
      userPublicKey: userPublicKey,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000,
          priorityLevel: "veryHigh"
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const transactionBase64 = swapResponse.data.swapTransaction;

    // Send the unsigned transaction back to the client for signing
    res.status(200).json({ swapTransaction: transactionBase64 });
  } catch (error) {
    console.error('Error building swap transaction:', error.message);
    res.status(500).json({ error: 'Failed to build swap transaction', message: error.message });
  }
});






// Endpoint to decrypt data
app.post('/api/decrypt', (req, res) => {
  try {
    const { encryptedData } = req.body;

    const secretKey = process.env.DECRYPTION_KEY;
    if (!secretKey || secretKey.length !== 32) {
      throw new Error('Secret key is invalid. It must be 32 characters (256 bits).');
    }

    console.log('Using secret key for decryption:', secretKey);

    // Generate the 256-bit key using the same method as encryption
    const key = crypto.createHash('sha256').update(secretKey).digest();

    const [iv, encrypted] = encryptedData.split(':');
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedBuffer = Buffer.from(encrypted, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    res.status(200).json({ decryptedData: decrypted.toString('utf8') });
  } catch (error) {
    console.error('Error decrypting data:', error.message);
    res.status(500).json({ error: 'Error decrypting data' });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));


app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    headers: req.headers,
    body: req.body,
    query: req.query,
  });
  res.status(500).send('Something went wrong');
});



app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});



// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});