import { promises as fs } from 'fs';
import { GraphQLClient, gql } from 'graphql-request';
import path from 'path';
import fetch, { Headers } from 'node-fetch';

// Polyfill for Headers and fetch
global.Headers = Headers;
global.fetch = fetch;

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
  loanclaimeds(first: 1000) {
    loanId
    defaulted
    blockTimestamp
  }
}
`;

async function fetchData(query) {
  try {
    const data = await graphQLClient.request(query);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

async function writeDataToCSV(data, filename) {
  const header = "loanId,termsCollateralCategory,termsCollateralAmount,termsAssetAmount,termsLoanRepayAmount,defaulted\n";
  const rows = data.map(loan => {
    return `${loan.loanId},${loan.termsCollateralCategory},${loan.termsCollateralAmount},${loan.termsAssetAmount},${loan.termsLoanRepayAmount},${loan.defaulted}`;
  }).join('\n');
  
  await fs.writeFile(filename, header + rows, 'utf8');
}

(async () => {
  const loanCreatedsData = await fetchData(loanCreatedsQuery);
  const loanClaimedsData = await fetchData(loanClaimedsQuery);

  if (loanCreatedsData && loanClaimedsData) {
    const loanDetails = loanCreatedsData.loancreateds.map(loan => ({
      loanId: loan.loanId,
      termsCollateralCategory: loan.terms_collateral_category,
      termsCollateralAmount: loan.terms_collateral_amount,
      termsAssetAmount: loan.terms_asset_amount,
      termsLoanRepayAmount: loan.terms_loanRepayAmount,
      defaulted: loanClaimedsData.loanclaimeds.some(claimed => claimed.loanId === loan.loanId && claimed.defaulted) ? 1 : 0
    }));

    const outputPath = path.resolve('loan_data.csv');
    await writeDataToCSV(loanDetails, outputPath);
    console.log('Data written to loan_data.csv');
  }
})();
