import { GraphQLClient, gql } from 'graphql-request';
import fs from 'fs';
import fetch, { Headers } from 'node-fetch';

global.Headers = Headers;
global.fetch = fetch;

const endpoint = 'https://api.studio.thegraph.com/query/77024/pwn-graph/v0.0.1';
const graphQLClient = new GraphQLClient(endpoint);

const loanCreatedsQuery = gql`
{
  loancreateds(first: 1000) {
    loanId
    terms_collateral_category
    terms_collateral_amount
    terms_asset_amount
    terms_loanRepayAmount
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

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function predictProbability(features, coefficients, intercept) {
  const z = intercept + features.reduce((sum, feature, index) => sum + feature * coefficients[index], 0);
  return sigmoid(z);
}

(async () => {
  const modelParams = JSON.parse(fs.readFileSync('model_params.json', 'utf8'));
  const coefficients = modelParams.coefficients[0];
  const intercept = modelParams.intercept[0];

  const loanCreatedsData = await fetchData(loanCreatedsQuery);

  if (loanCreatedsData) {
    const loanDetails = loanCreatedsData.loancreateds.map(loan => ({
      loanId: loan.loanId,
      termsCollateralCategory: parseFloat(loan.terms_collateral_category),
      termsCollateralAmount: parseFloat(loan.terms_collateral_amount),
      termsAssetAmount: parseFloat(loan.terms_asset_amount),
      termsLoanRepayAmount: parseFloat(loan.terms_loanRepayAmount)
    }));

    let totalPD = 0;
    for (const loan of loanDetails) {
      const features = [
        loan.termsCollateralCategory,
        loan.termsCollateralAmount,
        loan.termsAssetAmount,
        loan.termsLoanRepayAmount
      ];

      const pd = predictProbability(features, coefficients, intercept);
      totalPD += pd;
      console.log(`Loan ID: ${loan.loanId}, Probability of Default (PD): ${pd}`);
    }

    const averagePD = totalPD / loanDetails.length;
    console.log(`Total Probability of Default (PD) for the portfolio: ${averagePD}`);
  }
})();
