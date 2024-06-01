import express from 'express';
import axios from 'axios';
import 'dotenv/config';


const app = express();
const port = 8000;

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

async function fetchData(userAddress) {
  const balance = await getEthBalance(userAddress);
  const transactions = await getTransactionHistory(userAddress);
  const erc20Transfers = await getErc20Transfers(userAddress);
  const erc721Transfers = await getErc721Transfers(userAddress);

  return {
    firstTransactionDate: transactions.length ? transactions[0].timeStamp : null,
    numberOfTokens: new Set(erc20Transfers.map(t => t.tokenSymbol)).size,
    currentValue: balance,
    totalValueOfTransactions: transactions.reduce((acc, tx) => acc + parseFloat(tx.value) / 1e18, 0), // Convert Wei to Ether
    prooaps: erc721Transfers.length // Placeholder for actual prooap calculation
  };
}

async function getEthBalance(address) {
  const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
  try {
    const response = await axios.get(url);
    return parseFloat(response.data.result) / 1e18; // Convert from Wei to Ether
  } catch (error) {
    console.error('Error fetching ETH balance:', error);
    return 0;
  }
}

async function getTransactionHistory(address) {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  try {
    const response = await axios.get(url);
    return response.data.result;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

async function getErc20Transfers(address) {
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  try {
    const response = await axios.get(url);
    return response.data.result;
  } catch (error) {
    console.error('Error fetching ERC20 transfers:', error);
    return [];
  }
}

async function getErc721Transfers(address) {
  const url = `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  try {
    const response = await axios.get(url);
    return response.data.result;
  } catch (error) {
    console.error('Error fetching ERC721 transfers:', error);
    return [];
  }
}

function computeRating(data) {
  let score = 0;

  // Scoring based on first transaction date
  const accountAge = data.firstTransactionDate ? (new Date() - new Date(data.firstTransactionDate * 1000)) / (1000 * 60 * 60 * 24 * 365) : 0;
  let accountAgeScore;
  if (accountAge > 0.4) {
    accountAgeScore = 1;
  } else if (accountAge > 0.3) {
    accountAgeScore = 2;
  } else if (accountAge > 0.2) {
    accountAgeScore = 3;
  } else if (accountAge > 0.1) {
    accountAgeScore = 4;
  } else {
    accountAgeScore = 5;
  }
  score += accountAgeScore;
  console.log(`Account Age: ${accountAge} years, Score: ${accountAgeScore}`);

  // Scoring based on number of tokens held
  let numberOfTokensScore;
  if (data.numberOfTokens > 4) {
    numberOfTokensScore = 1;
  } else if (data.numberOfTokens > 3) {
    numberOfTokensScore = 2;
  } else if (data.numberOfTokens > 2) {
    numberOfTokensScore = 3;
  } else if (data.numberOfTokens > 1) {
    numberOfTokensScore = 4;
  } else {
    numberOfTokensScore = 5;
  }
  score += numberOfTokensScore;
  console.log(`Number of Tokens: ${data.numberOfTokens}, Score: ${numberOfTokensScore}`);

  // Scoring based on current value
  let currentValueScore;
  if (data.currentValue > 4) {
    currentValueScore = 1;
  } else if (data.currentValue > 3) {
    currentValueScore = 2;
  } else if (data.currentValue > 2) {
    currentValueScore = 3;
  } else if (data.currentValue > 1) {
    currentValueScore = 4;
  } else {
    currentValueScore = 5;
  }
  score += currentValueScore;
  console.log(`Current Value: ${data.currentValue} ETH, Score: ${currentValueScore}`);

  // Scoring based on total value of transactions
  let totalValueOfTransactionsScore;
  if (data.totalValueOfTransactions > 9) {
    totalValueOfTransactionsScore = 1;
  } else if (data.totalValueOfTransactions > 7) {
    totalValueOfTransactionsScore = 2;
  } else if (data.totalValueOfTransactions > 5) {
    totalValueOfTransactionsScore = 3;
  } else if (data.totalValueOfTransactions > 3) {
    totalValueOfTransactionsScore = 4;
  } else {
    totalValueOfTransactionsScore = 5;
  }
  score += totalValueOfTransactionsScore;
  console.log(`Total Value of Transactions: ${data.totalValueOfTransactions} ETH, Score: ${totalValueOfTransactionsScore}`);

  // Scoring based on NFTs (participation in events/airdrops)
  let nftsScore;
  if (data.prooaps > 4) {
    nftsScore = 1;
  } else if (data.prooaps > 3) {
    nftsScore = 2;
  } else if (data.prooaps > 2) {
    nftsScore = 3;
  } else if (data.prooaps > 1) {
    nftsScore = 4;
  } else {
    nftsScore = 5;
  }
  score += nftsScore;
  console.log(`Number of NFTs: ${data.prooaps}, Score: ${nftsScore}`);

  // Normalize score to a 1-5 rating, where 1 is the best
  const rating = Math.min(Math.max(Math.ceil(score / 5), 1), 5);

  return rating;
}

app.get('/rating/:address', async (req, res) => {
  const address = req.params.address;
  try {
    const data = await fetchData(address);
    console.log('Fetched data:', data); // Log fetched data
    const rating = computeRating(data);
    res.json({ address, rating });
  } catch (error) {
    console.error(`Failed to fetch data for address ${address}:`, error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
