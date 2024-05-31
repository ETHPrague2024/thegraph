import { GraphQLClient, gql } from 'graphql-request';
import axios from 'axios';

// Replace with your subgraph's endpoint
const endpoint = 'https://api.studio.thegraph.com/query/77024/pwn-graph/v0.0.1';

const graphQLClient = new GraphQLClient(endpoint);

// Define GraphQL queries
const loanClaimedsQuery = gql`
{
  loanclaimeds(first: 1000, where: {defaulted: true}) {
    loanId
  }
}
`;

const loanCreatedsQuery = gql`
{
  loancreateds(first: 1000) {
    loanId
    terms_borrower
    terms_loanRepayAmount
    terms_asset_assetAddress
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

// Fetch conversion rates function
async function fetchConversionRates(assetAddresses) {
  const baseUrl = 'https://api.coingecko.com/api/v3/simple/token_price/ethereum';
  try {
    const ids = assetAddresses.join(',');
    const url = `${baseUrl}?contract_addresses=${ids}&vs_currencies=usdt`;
    console.log('Fetching conversion rates from URL:', url); // Log the URL for debugging
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching conversion rates:', error);
    return {};
  }
}

// Calculate EAD metrics function
function calculateEADMetrics(loanClaimeds, loanCreateds, conversionRates) {
  let totalEAD = 0;
  const customerEAD = {};
  let numberOfDefaults = 0;

  const loanCreatedMap = new Map();
  loanCreateds.forEach(loan => {
    loanCreatedMap.set(loan.loanId.toString(), loan);
  });

  loanClaimeds.forEach(claim => {
    const loan = loanCreatedMap.get(claim.loanId.toString());
    if (loan) {
      const assetAddress = loan.terms_asset_assetAddress.toLowerCase();
      const eadAmount = parseFloat(loan.terms_loanRepayAmount);
      const conversionRate = conversionRates[assetAddress]?.usdt || 0;

      const eadInUSDT = eadAmount * conversionRate;
      totalEAD += eadInUSDT;
      numberOfDefaults += 1;

      if (!customerEAD[loan.terms_borrower]) {
        customerEAD[loan.terms_borrower] = 0;
      }
      customerEAD[loan.terms_borrower] += eadInUSDT;
    }
  });

  return { totalEAD, customerEAD, numberOfDefaults };
}

// Main function
(async () => {
  const loanClaimedsData = await fetchData(loanClaimedsQuery);
  const loanCreatedsData = await fetchData(loanCreatedsQuery);

  if (loanClaimedsData && loanCreatedsData) {
    const loanClaimeds = loanClaimedsData.loanclaimeds;
    const loanCreateds = loanCreatedsData.loancreateds;

    if (loanClaimeds.length > 0 && loanCreateds.length > 0) {
      // Get unique asset addresses
      const assetAddresses = [...new Set(loanCreateds.map(loan => loan.terms_asset_assetAddress.toLowerCase()))];
      
      // Fetch conversion rates
      const conversionRates = await fetchConversionRates(assetAddresses);

      const { totalEAD, customerEAD, numberOfDefaults } = calculateEADMetrics(loanClaimeds, loanCreateds, conversionRates);

      console.log(`Total EAD: ${totalEAD}`);
      console.log(`Number of Defaults: ${numberOfDefaults}`);
      console.log('EAD per Defaulted Customer:');
      for (const [customer, ead] of Object.entries(customerEAD)) {
        console.log(`Customer: ${customer}, EAD: ${ead}`);
      }
    } else {
      console.log('No defaulted loan data available.');
    }
  }
})();
