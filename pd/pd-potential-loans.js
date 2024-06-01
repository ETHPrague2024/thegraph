import fs from 'fs';
import { GraphQLClient, gql } from 'graphql-request';
import fetch, { Headers } from 'node-fetch';

// Polyfill for Headers and fetch
global.Headers = Headers;
global.fetch = fetch;

// Replace with your new subgraph's endpoint
const endpoint = 'https://api.studio.thegraph.com/query/77024/pwn-potential-loans/version/latest';

const graphQLClient = new GraphQLClient(endpoint);

// Define GraphQL query to fetch potential loans
const potentialLoansQuery = gql`
{
  newLoanAdvertiseds(first: 1000) {
    loanID
    chainId
    tokenCollateralAddress
    tokenCollateralAmount
    tokenCollateralIndex
    tokenLoanAddress
    tokenLoanAmount
    tokenLoanIndex
    durationOfLoanSeconds
    blockNumber
    blockTimestamp
    transactionHash
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

// Sigmoid function for logistic regression
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// Predict function using the saved model parameters
function predictProbability(features, coefficients, intercept) {
  const z = intercept + features.reduce((sum, feature, index) => sum + feature * coefficients[index], 0);
  return sigmoid(z);
}

(async () => {
  // Load model parameters
  const modelParams = JSON.parse(fs.readFileSync('model_params.json', 'utf8'));
  const coefficients = modelParams.coefficients[0];
  const intercept = modelParams.intercept[0];

  // Fetch potential loan data
  const potentialLoansData = await fetchData(potentialLoansQuery);

  if (potentialLoansData) {
    const potentialLoanDetails = potentialLoansData.newLoanAdvertiseds.map(loan => ({
      loanID: loan.loanID,
      termsCollateralCategory: loan.tokenCollateralIndex === "115792089237316195423570985008687907853269984665640564039457584007913129639935" ? 0 : 1, // Example logic, adjust based on your use case
      termsCollateralAmount: parseFloat(loan.tokenCollateralAmount),
      termsAssetAmount: parseFloat(loan.tokenLoanAmount),
      termsLoanRepayAmount: parseFloat(loan.tokenLoanAmount) // This should be determined based on your repayment terms
    }));

    let totalPD = 0;
    for (const loan of potentialLoanDetails) {
      const features = [
        loan.termsCollateralCategory,
        loan.termsCollateralAmount,
        loan.termsAssetAmount,
        loan.termsLoanRepayAmount
      ];

      const pd = predictProbability(features, coefficients, intercept);
      totalPD += pd;
      console.log(`Loan ID: ${loan.loanID}, Probability of Default (PD): ${pd}`);
    }

    const averagePD = totalPD / potentialLoanDetails.length;
    console.log(`Total Probability of Default (PD) for the potential loan portfolio: ${averagePD}`);
  }
})();
