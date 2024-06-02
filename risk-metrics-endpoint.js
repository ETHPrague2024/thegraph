import express from 'express';
import { GraphQLClient, gql } from 'graphql-request';
import fetch, { Headers } from 'node-fetch';
import axios from 'axios';
import 'dotenv/config';
import fs from 'fs';

global.Headers = Headers;
global.fetch = fetch;

const app = express();
const port = 8000;

const endpoint = 'https://api.studio.thegraph.com/query/77024/pwn-graph/v0.0.1';
const graphQLClient = new GraphQLClient(endpoint);

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

let cache = {
  data: null,
  timestamp: null,
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const fetchAssetDetails = async (chainId, tokenAddress, tokenIndex) => {
  if (!chainId || !tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  let url;
  if (tokenIndex !== undefined) {
    url = `https://api-staging.pwn.xyz/api/v1/asset/asset/${chainId}/${tokenAddress}/${tokenIndex}`;
  } else {
    url = `https://api-staging.pwn.xyz/api/v1/asset/asset/${chainId}/${tokenAddress}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch asset details from ${url}`);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching asset details from ${url}:`, error);
    return null;
  }
};

const loanCreatedsQuery = gql`
{
  loancreateds {
    loanId
    terms_collateral_category
    terms_collateral_assetAddress
    terms_collateral_id
    terms_collateral_amount
    terms_asset_category
    terms_asset_assetAddress
    terms_asset_id
    terms_asset_amount
    terms_loanRepayAmount
    blockNumber
    blockTimestamp
    transactionHash
  }
}
`;

const loanClaimedsQuery = gql`
{
  loanclaimeds(where: { defaulted: true }) {
    loanId
    defaulted
    blockTimestamp
  }
}
`;

const fetchDataFromGraph = async (query) => {
  try {
    const data = await graphQLClient.request(query);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
};

const processLoans = async () => {
  const loanCreatedsData = await fetchDataFromGraph(loanCreatedsQuery);
  const loanClaimedsData = await fetchDataFromGraph(loanClaimedsQuery);

  if (!loanCreatedsData || !loanClaimedsData) {
    console.error('Failed to fetch necessary data.');
    return;
  }

  const loanDetails = loanCreatedsData.loancreateds.reduce((acc, loan) => {
    acc[loan.loanId] = loan;
    return acc;
  }, {});

  const defaultedLoans = loanClaimedsData.loanclaimeds.filter((loan) => loan.defaulted);

  let totalLoans = 0;
  let totalLoanValueUSD = 0;
  let totalCollateralValueUSD = 0;
  let totalEAD = 0;
  let totalLGD = 0;
  let totalValidLGDLoans = 0;
  let numberOfDefaults = 0;

  for (const loanId in loanDetails) {
    const loanDetail = loanDetails[loanId];
    if (loanDetail) {
      totalLoans++;
      let collateralDetails = null;
      if (loanDetail.terms_collateral_category === 1) { // NFT
        collateralDetails = await fetchAssetDetails(1, loanDetail.terms_collateral_assetAddress, loanDetail.terms_collateral_id); // Chain ID 1 used as placeholder
      } else if (loanDetail.terms_collateral_category === 0) { // ERC20
        collateralDetails = await fetchAssetDetails(1, loanDetail.terms_collateral_assetAddress); // Chain ID 1 used as placeholder
      }

      let assetDetails = null;
      if (loanDetail.terms_asset_category === 1) { // NFT
        assetDetails = await fetchAssetDetails(1, loanDetail.terms_asset_assetAddress, loanDetail.terms_asset_id); // Chain ID 1 used as placeholder
      } else if (loanDetail.terms_asset_category === 0) { // ERC20
        assetDetails = await fetchAssetDetails(1, loanDetail.terms_asset_assetAddress); // Chain ID 1 used as placeholder
      }

      const collateralValueUSD = parseFloat(collateralDetails?.latest_price?.price?.usd_amount || 0);
      const assetValueUSD = parseFloat(assetDetails?.latest_price?.price?.usd_amount || 0);

      const collateralAmount = loanDetail.terms_collateral_amount === 0 ? 1 : loanDetail.terms_collateral_amount;

      totalLoanValueUSD += assetValueUSD;
      totalCollateralValueUSD += collateralValueUSD;
    }
  }

  for (const loan of defaultedLoans) {
    const loanDetail = loanDetails[loan.loanId];
    if (loanDetail) {
      numberOfDefaults++;
      let collateralDetails = null;
      if (loanDetail.terms_collateral_category === 1) { // NFT
        collateralDetails = await fetchAssetDetails(1, loanDetail.terms_collateral_assetAddress, loanDetail.terms_collateral_id); // Chain ID 1 used as placeholder
      } else if (loanDetail.terms_collateral_category === 0) { // ERC20
        collateralDetails = await fetchAssetDetails(1, loanDetail.terms_collateral_assetAddress); // Chain ID 1 used as placeholder
      }

      let assetDetails = null;
      if (loanDetail.terms_asset_category === 1) { // NFT
        assetDetails = await fetchAssetDetails(1, loanDetail.terms_asset_assetAddress, loanDetail.terms_asset_id); // Chain ID 1 used as placeholder
      } else if (loanDetail.terms_asset_category === 0) { // ERC20
        assetDetails = await fetchAssetDetails(1, loanDetail.terms_asset_assetAddress); // Chain ID 1 used as placeholder
      }

      const collateralValueUSD = parseFloat(collateralDetails?.latest_price?.price?.usd_amount || 0);

      const collateralAmount = loanDetail.terms_collateral_amount === 0 ? 1 : loanDetail.terms_collateral_amount;

      const ead = (collateralValueUSD * loanDetail.terms_asset_amount) / loanDetail.terms_loanRepayAmount;
      const lgd = ead > 0 ? 1 - (collateralValueUSD / ead) : 0;

      if (ead > 0) {
        totalEAD += ead;
        totalValidLGDLoans++;
        totalLGD += lgd;
      }
    }
  }

  const observedDefaultRate = totalLoans > 0 ? numberOfDefaults / totalLoans : 0;
  const averageLGD = totalValidLGDLoans > 0 ? totalLGD / totalValidLGDLoans : 0;

  const totalECL = totalEAD * observedDefaultRate * averageLGD;

  return {
    totalLoans,
    numberOfDefaults,
    observedDefaultRate,
    totalLoanValueUSD,
    totalCollateralValueUSD,
    totalEAD,
    averageLGD,
    totalECL
  };
};

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

app.get('/metrics', async (req, res) => {
  try {
    const metrics = await processLoans();
    res.json(metrics);
  } catch (error) {
    console.error('Error processing loans:', error);
    res.status(500).json({ error: 'Failed to process loans' });
  }
});

app.get('/fetchLoans', async (req, res) => {
  try {
    const loanCreatedsData = await fetchDataFromGraph(loanCreatedsQuery);
    const loanClaimedsData = await fetchDataFromGraph(loanClaimedsQuery);

    if (!loanCreatedsData || !loanClaimedsData) {
      res.status(500).json({ error: 'Failed to fetch data from The Graph' });
      return;
    }

    res.status(200).json({ loanCreateds: loanCreatedsData.loancreateds, loanClaimeds: loanClaimedsData.loanclaimeds });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data from The Graph' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
