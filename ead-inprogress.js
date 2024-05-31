import { GraphQLClient, gql } from 'graphql-request';

// Replace with your subgraph's endpoint
const endpoint = 'https://api.studio.thegraph.com/query/77024/pwn-graph/v0.0.1';

const graphQLClient = new GraphQLClient(endpoint);

// Define GraphQL queries
const loanClaimedsQuery = gql`
{
  loanclaimeds(first: 1000, where: {defaulted: true}) {
    loanId
    blockTimestamp
  }
}
`;

const loanCreatedsQuery = gql`
{
  loancreateds(first: 1000) {
    loanId
    terms_borrower
    terms_loanRepayAmount
  }
}
`;

// Function to fetch data
async function fetchData(query) {
  try {
    const data = await graphQLClient.request(query);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

// Function to calculate EAD metrics
function calculateEADMetrics(loanClaimeds, loanCreateds) {
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
      const eadAmount = parseFloat(loan.terms_loanRepayAmount);
      totalEAD += eadAmount;
      numberOfDefaults += 1;

      if (!customerEAD[loan.terms_borrower]) {
        customerEAD[loan.terms_borrower] = 0;
      }
      customerEAD[loan.terms_borrower] += eadAmount;
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
      const { totalEAD, customerEAD, numberOfDefaults } = calculateEADMetrics(loanClaimeds, loanCreateds);

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
