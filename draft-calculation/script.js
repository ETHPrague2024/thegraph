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

// Function to calculate 12-month PD
function calculate12MonthPD(loans) {
  const now = Date.now() / 1000; // Current timestamp in seconds
  const twelveMonthsAgo = now - (365 * 24 * 60 * 60); // Timestamp for 12 months ago

  const loansInPeriod = loans.filter(loan => loan.blockTimestamp >= twelveMonthsAgo);
  const defaultedLoans = loansInPeriod.filter(loan => loan.defaulted);

  const pd = loansInPeriod.length ? defaultedLoans.length / loansInPeriod.length : 0;
  return { pd, defaultedCount: defaultedLoans.length, totalCount: loansInPeriod.length };
}

// Main function
(async () => {
  const loanCreatedsData = await fetchData(loanCreatedsQuery);
  const loanClaimedsData = await fetchData(loanClaimedsQuery);

  if (loanCreatedsData && loanClaimedsData) {
    const loanCreateds = loanCreatedsData.loancreateds;
    const loanClaimeds = loanClaimedsData.loanclaimeds;

    if (loanCreateds.length > 0 && loanClaimeds.length > 0) {
      const loanCreatedMap = new Map();
      loanCreateds.forEach(loan => {
        loanCreatedMap.set(loan.loanId.toString(), loan.terms_collateral_category);
      });

      const loansByCategory = {};
      loanClaimeds.forEach(loan => {
        const collateralCategory = loanCreatedMap.get(loan.loanId.toString());
        if (collateralCategory !== undefined) {
          if (!loansByCategory[collateralCategory]) {
            loansByCategory[collateralCategory] = [];
          }
          loansByCategory[collateralCategory].push(loan);
        }
      });

      console.log('12-month PD by Collateral Category:');
      for (const [category, loans] of Object.entries(loansByCategory)) {
        const { pd, defaultedCount, totalCount } = calculate12MonthPD(loans);
        console.log(`Collateral Category: ${category}`);
        console.log(`  12-month PD: ${pd}`);
        console.log(`  Number of Defaults: ${defaultedCount}`);
        console.log(`  Total Number of Loans: ${totalCount}`);
      }
    } else {
      console.log('No loan data available.');
    }
  }
})();
