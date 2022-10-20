// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // We get the contract to deploy
  const NftMintEcdsaSignature = await hre.ethers.getContractFactory("NftMintEcdsaSignature");
  const nftMintEcdsaSignature = await NftMintEcdsaSignature.deploy();

  await nftMintEcdsaSignature.deployed();
  
  console.log("NftMintEcdsaSignature deployed to:", nftMintEcdsaSignature.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
