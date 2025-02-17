require('dotenv').config(); // Import and configure dotenv
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');
const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/common-evm-utils');
const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js'); // For Solana

const app = express();
const port = process.env.PORT || 8080;

/***************  Trading Logic Start *********************/
// Add JSON parsing middleware
app.use(express.json());

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
      console.error("Error: Contract address is missing from TradingView data.");
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


app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json()); // For parsing application/json

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




app.get('/api/ohlcv/evm/:pairAddress', async (req, res) => {
  const { fromDate, toDate, timeframe } = req.query;
  const { pairAddress } = req.params;

  // Validate required parameters
  if (!pairAddress || !fromDate || !toDate || !timeframe) {
    console.error('Missing required parameters:', { pairAddress, fromDate, toDate, timeframe });
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    // Construct the Moralis API endpoint
    const endpoint = `https://deep-index.moralis.io/api/v2.2/pairs/${pairAddress}/ohlcv`;
    const url = `${endpoint}?chain=eth&timeframe=${timeframe}&currency=usd&fromDate=${fromDate}&toDate=${toDate}`;

    console.log(`Fetching data from Moralis API: ${url}`);

    // Fetch data from Moralis API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY,
      },
    });

    // Handle API response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from Moralis API:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.result.length} OHLCV data points.`);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching EVM OHLCV data:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});






app.get('/api/ohlcv/solana/:pairAddress', async (req, res) => {
  const { fromDate, toDate, timeframe } = req.query;
  const { pairAddress } = req.params;

  if (!pairAddress || !fromDate || !toDate || !timeframe) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const endpoint = `https://solana-gateway.moralis.io/token/mainnet/pairs/${pairAddress}/ohlcv`;
    const url = `${endpoint}?timeframe=${timeframe}&currency=usd&fromDate=${fromDate}&toDate=${toDate}`;

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
    console.log(`Solana: Successfully fetched ${data.result.length} data points.`);
    res.status(200).json(data);
  } catch (error) {
    console.error('Solana: Error fetching OHLCV data:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
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

/*// Endpoint to fetch NFTs by wallet address
app.get('/wallet-nfts', async (req, res) => {
  try {
    const { address, chain, format = 'decimal', mediaItems = false, tokenAddresses } = req.query; // Extract wallet address, chain, format, mediaItems, and tokenAddresses from query parameters

    if (!address || !chain || !tokenAddresses) {
      return res.status(400).json({ error: 'Address, chain, and tokenAddresses parameters are missing' });
    }

    console.log(`Fetching NFTs for wallet: ${address}, chain: ${chain}, tokenAddresses: ${tokenAddresses}`);

    const response = await Moralis.EvmApi.nft.getWalletNFTs({
      chain,
      address,
      format,
      mediaItems,
      tokenAddresses: [tokenAddresses], // Pass the token addresses as an array
    });

    console.log("Fetched wallet NFTs:", response.raw);

    res.status(200).json(response.raw);
  } catch (error) {
    console.error('Error fetching wallet NFTs:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching wallet NFTs' });
  }
});*/


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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});