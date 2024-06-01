import { GraphQLClient, gql } from 'graphql-request';
import fetch, { Headers } from 'node-fetch';

global.fetch = fetch; // Polyfill fetch for node-fetch
global.Headers = Headers; // Polyfill Headers for node-fetch

const endpoint = 'https://api.studio.thegraph.com/query/77024/pwn-graph/v0.0.1';
const graphQLClient = new GraphQLClient(endpoint);

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

const fetchData = async (query) => {
    try {
        const data = await graphQLClient.request(query);
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
};

const processLoans = async () => {
    const loanCreatedsData = await fetchData(loanCreatedsQuery);
    const loanClaimedsData = await fetchData(loanClaimedsQuery);

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
            console.log(`Loan ID: ${loanId}`);
            console.log(`Collateral Category: ${loanDetail.terms_collateral_category}`);
            console.log(`Collateral Address: ${loanDetail.terms_collateral_assetAddress}`);
            console.log(`Collateral ID: ${loanDetail.terms_collateral_id}`);
            console.log(`Collateral Amount: ${loanDetail.terms_collateral_amount}`);
            console.log(`Asset Category: ${loanDetail.terms_asset_category}`);
            console.log(`Asset Address: ${loanDetail.terms_asset_assetAddress}`);
            console.log(`Asset ID: ${loanDetail.terms_asset_id}`);
            console.log(`Block Timestamp: ${loanDetail.blockTimestamp}`);
            console.log(`Loan Repay Amount: ${loanDetail.terms_loanRepayAmount}`);
            console.log('---------------------------');

            let collateralDetails = null;
            if (loanDetail.terms_collateral_category === 1) { // NFT
                collateralDetails = await fetchAssetDetails(1, loanDetail.terms_collateral_assetAddress, loanDetail.terms_collateral_id); // Chain ID 1 used as placeholder
            } else if (loanDetail.terms_collateral_category === 0) { // ERC20
                collateralDetails = await fetchAssetDetails(1, loanDetail.terms_collateral_assetAddress); // Chain ID 1 used as placeholder
            }
            console.log('Collateral Details:', collateralDetails);

            let assetDetails = null;
            if (loanDetail.terms_asset_category === 1) { // NFT
                assetDetails = await fetchAssetDetails(1, loanDetail.terms_asset_assetAddress, loanDetail.terms_asset_id); // Chain ID 1 used as placeholder
            } else if (loanDetail.terms_asset_category === 0) { // ERC20
                assetDetails = await fetchAssetDetails(1, loanDetail.terms_asset_assetAddress); // Chain ID 1 used as placeholder
            }
            console.log('Asset Details:', assetDetails);

            const collateralValueUSD = parseFloat(collateralDetails?.latest_price?.price?.usd_amount || 0);
            const assetValueUSD = parseFloat(assetDetails?.latest_price?.price?.usd_amount || 0);

            // Adjust collateral amount to 1 if it's 0
            const collateralAmount = loanDetail.terms_collateral_amount === 0 ? 1 : loanDetail.terms_collateral_amount;

            totalLoanValueUSD += assetValueUSD;
            totalCollateralValueUSD += collateralValueUSD;

            console.log(`Collateral Amount: ${collateralAmount}`);
            console.log(`Collateral Value (in USD): ${collateralValueUSD}`);
            console.log(`Asset Amount: ${loanDetail.terms_asset_amount}`);
            console.log(`Asset Value (in USD): ${assetValueUSD}`);
            console.log('===========================');
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

            // Adjust collateral amount to 1 if it's 0
            const collateralAmount = loanDetail.terms_collateral_amount === 0 ? 1 : loanDetail.terms_collateral_amount;

            // EAD calculation
            const ead = (collateralValueUSD * loanDetail.terms_asset_amount) / loanDetail.terms_loanRepayAmount;
            const lgd = ead > 0 ? 1 - (collateralValueUSD / ead) : 0;

            if (ead > 0) {
                totalEAD += ead;
                totalValidLGDLoans++;
                totalLGD += lgd;
            }

            console.log(`EAD (Exposure at Default): ${ead}`);
            console.log(`LGD (Loss Given Default): ${lgd}`);
            console.log('===========================');
        }
    }

    // Calculate Observed Default Rate
    const observedDefaultRate = totalLoans > 0 ? numberOfDefaults / totalLoans : 0;
    const averageLGD = totalValidLGDLoans > 0 ? totalLGD / totalValidLGDLoans : 0;

    // Calculate Expected Credit Loss (ECL)
    const totalECL = totalEAD * observedDefaultRate * averageLGD;

    console.log(`Total Number of Loans: ${totalLoans}`);
    console.log(`Total Number of Defaults: ${numberOfDefaults}`);
    console.log(`Observed Default Rate: ${observedDefaultRate}`);
    console.log(`Total Loan Value in USD: ${totalLoanValueUSD}`);
    console.log(`Total Collateral Value in USD: ${totalCollateralValueUSD}`);
    console.log(`Total EAD in USD: ${totalEAD}`);
    console.log(`Average LGD: ${averageLGD}`);
    console.log(`Total ECL in USD: ${totalECL}`);
};

processLoans();
