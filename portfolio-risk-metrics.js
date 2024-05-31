import { GraphQLClient, gql } from 'graphql-request';

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

// Fixed conversion rates (assumed)
const conversionRates = {
  'ERC20': 1,  // 1 ERC20 unit = 1 USD
  'ERC721': 100, // Example: 1 ERC721 token = 100 USD
  'ERC1155': 10  // Example: 1 ERC1155 unit = 10 USD
};

// Function to calculate 12-month PD
function calculate12MonthPD(loans) {
  const now = Date.now() / 1000; // Current timestamp in seconds
  const twelveMonthsAgo = now - (365 * 24 * 60 * 60); // Timestamp for 12 months ago

  const loansInPeriod = loans.filter(loan => loan.blockTimestamp >= twelveMonthsAgo);
  const defaultedLoans = loansInPeriod.filter(loan => loan.defaulted);

  const pd = loansInPeriod.length ? defaultedLoans.length / loansInPeriod.length : 0;
  return { pd, defaultedCount: defaultedLoans.length, totalCount: loansInPeriod.length };
}

// Function to calculate EAD, LGD, and ECL
async function calculateRiskMetrics() {
  const loanCreatedsData = await fetchData(loanCreatedsQuery);
  const loanClaimedsData = await fetchData(loanClaimedsQuery);

  if (!loanCreatedsData || !loanClaimedsData) {
    console.error('Failed to fetch necessary data.');
    return;
  }

  // Map of loanId to loan details
  const loanDetails = loanCreatedsData.loancreateds.reduce((acc, loan) => {
    acc[loan.loanId] = loan;
    return acc;
  }, {});

  // Filter defaulted loans
  const defaultedLoans = loanClaimedsData.loanclaimeds.filter(loan => loan.defaulted);

  let totalEAD = 0;
  let totalCollateral = 0;
  let numberOfDefaults = 0;

  for (const loan of defaultedLoans) {
    const loanDetail = loanDetails[loan.loanId];
    if (loanDetail) {
      const collateralValue = loanDetail.terms_collateral_amount * (conversionRates[loanDetail.terms_collateral_category] || 1);
      const exposureValue = loanDetail.terms_loanRepayAmount * (conversionRates[loanDetail.terms_asset_category] || 1);

      totalEAD += exposureValue;
      totalCollateral += collateralValue;
      numberOfDefaults += 1;
    }
  }

  // Adjust EAD and Collateral values to account for decimals
  const adjustedEAD = totalEAD / 1e12;
  const adjustedCollateral = totalCollateral / 1e4;

  // Calculate LGD as total EAD divided by total Collateral
  const LGD = adjustedCollateral > 0 ? adjustedEAD / adjustedCollateral : 0;

  // Calculate 12-month PD
  const { pd: PD, defaultedCount, totalCount } = calculate12MonthPD(loanClaimedsData.loanclaimeds);

  // Calculate Expected Credit Loss (ECL) as PD * LGD * EAD
  const ECL = PD * LGD * adjustedEAD;

  console.log(`Total EAD (in USD): ${adjustedEAD}`);
  console.log(`Total Collateral (in USD): ${adjustedCollateral}`);
  console.log(`Loss Given Default (LGD): ${LGD}`);
  console.log(`Number of Defaults: ${numberOfDefaults}`);
  console.log(`Probability of Default (PD): ${PD}`);
  console.log(`Expected Credit Loss (ECL): ${ECL}`);
}

calculateRiskMetrics();