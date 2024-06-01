import { GraphQLClient, gql } from 'graphql-request';
import axios from 'axios';

// Replace with your subgraph's endpoint
const endpoint = 'https://api.studio.thegraph.com/query/77024/pwn-graph/v0.0.1';

const graphQLClient = new GraphQLClient(endpoint);

// Define GraphQL queries
const loanCreatedsQuery = gql`
{
  loancreateds(first: 1000) {
    loanId
    terms_collateral_category
    terms_collateral_assetAddress
    terms_collateral_id
    terms_collateral_amount
    terms_asset_assetAddress
  }
}
`;

const loanClaimedsQuery = gql`
{
  loanclaimeds(first: 1000) {
    loanId
    defaulted
    blockTimestamp
  }
}
`;

// Fetch data function
async function fetchData(query) {
  try {
    const data = await graphQLClient.request(query);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

// Function to fetch token price
async function getTokenPrice(chainId, contractAddress) {
  const url = `https://api-staging.pwn.xyz/api/v1/asset/valuation/token-price/${chainId}/${contractAddress}/`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(`Token price endpoint not found for ${contractAddress}`);
    } else {
      console.error('Error fetching token price:', error);
    }
    return null;
  }
}

// Function to fetch NFT price
async function getNftPrice(chainId, contractAddress, tokenId) {
  const url = `https://api-staging.pwn.xyz/api/v1/asset/valuation/nft-price/${chainId}/${contractAddress}/${tokenId}/`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(`NFT price endpoint not found for ${contractAddress} with token ID ${tokenId}`);
    } else {
      console.error('Error fetching NFT price:', error);
    }
    return null;
  }
}

// Main function to fetch data and calculate EAD and LGD
async function main() {
  const loanCreatedsData = await fetchData(loanCreatedsQuery);
  const loanClaimedsData = await fetchData(loanClaimedsQuery);

  if (loanCreatedsData && loanClaimedsData) {
    console.log('Loan Createds Data:', loanCreatedsData);
    console.log('Loan Claimeds Data:', loanClaimedsData);

    const loanClaimedMap = new Map();
    loanClaimedsData.loanclaimeds.forEach(loan => {
      loanClaimedMap.set(loan.loanId, loan);
    });

    let totalDefaults = 0;
    let totalEADUSD = 0;
    let lgdValues = [];

    for (const loan of loanCreatedsData.loancreateds) {
      const chainId = 1;  // Assuming chainId is 1 for all assets
      const contractAddress = loan.terms_collateral_assetAddress;
      const category = loan.terms_collateral_category;
      const tokenId = loan.terms_collateral_id;
      const loanClaimed = loanClaimedMap.get(loan.loanId);

      if (!loanClaimed || !loanClaimed.defaulted) {
        continue;
      }

      totalDefaults += 1;

      let priceData;
      if (category === 0) {  // ERC20
        priceData = await getTokenPrice(chainId, contractAddress);
      } else if (category === 1) {  // ERC721
        priceData = await getNftPrice(chainId, contractAddress, tokenId);
      } else if (category === 2) {  // ERC1155
        priceData = await getTokenPrice(chainId, contractAddress);
      }

      // Use mock values for price data if fetching fails
      if (!priceData) {
        priceData = { price: { eth_amount: '0.01', usd_amount: '20' } };  // Mock values for demonstration
      }

      if (priceData) {
        const collateralValueUSD = parseFloat(priceData.price.usd_amount) * parseFloat(loan.terms_collateral_amount);
        const exposureValueUSD = parseFloat(priceData.price.usd_amount) * parseFloat(loan.terms_collateral_amount);

        totalEADUSD += exposureValueUSD;

        // Calculate LGD as collateral / exposure at default
        const lgd = collateralValueUSD / exposureValueUSD;
        lgdValues.push(lgd);

        console.log(`Loan ID: ${loan.loanId}`);
        console.log(`Collateral Value in USD: ${collateralValueUSD}`);
        console.log(`Exposure at Default (EAD) in USD: ${exposureValueUSD}`);
        console.log(`Loss Given Default (LGD): ${lgd}`);
      }
    }

    const averageLGD = lgdValues.reduce((acc, lgd) => acc + lgd, 0) / lgdValues.length;

    console.log(`Total Number of Defaults: ${totalDefaults}`);
    console.log(`Total EAD in USDT: ${totalEADUSD}`);
    console.log(`Average LGD for Observed Defaults: ${averageLGD}`);
  }
}

main();
