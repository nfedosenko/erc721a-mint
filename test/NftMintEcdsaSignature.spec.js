const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");

const MintPhase = {
    CLOSED: 0,
    WL: 1,
    PUBLIC: 2
};

const generateSignature = async (signer, senderAddress, phase = "WHITELIST") => {
    let messageHash = ethers.utils.solidityKeccak256(
        ["address", "string"],
        [senderAddress, phase]
    );
    let messageHashBinary = ethers.utils.arrayify(messageHash);

    const signature = await signer.signMessage(messageHashBinary);
    // const verified = ethers.utils.verifyMessage(messageHashBinary, signature);

    return {signature, message: messageHashBinary};
};

describe("PussyLoversClub", function () {
    async function deployNftContractFixture() {
        const NftMintEcdsaSignature = await ethers.getContractFactory("NftMintEcdsaSignature");
        const [owner, addr1, addr2] = await ethers.getSigners();

        const instance = await NftMintEcdsaSignature.deploy();

        await instance.deployed();

        // Fixtures can return anything you consider useful for your tests
        return {instance, owner, addr1, addr2};
    }

    describe('Deployment', () => {
        it('Should set the right owner', async () => {
            const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

            expect(await instance.owner()).to.equal(owner.address);
        });
        it('Should mint TEAM_RESERVED_TOKENS to msg.sender', async () => {
            const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

            const TEAM_RESERVED_TOKENS = await instance.TEAM_RESERVED_TOKENS();
            const balanceOfOwner = await instance.balanceOf(owner.address);

            expect(balanceOfOwner).to.equal(TEAM_RESERVED_TOKENS);
        });
    });
    describe('Mint', () => {
        describe('Params', () => {
            it('Should set initial mint price', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                const mintPrice = await instance.mintPrice();

                expect(ethers.utils.formatEther(mintPrice)).to.equal("0.1");
            });
        });
        describe('Closed Phase', () => {
            it('Should fail calling mintPublic (InvalidMintPhase)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.CLOSED);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "PUBLIC");

                await expect(instance.mintPublic(signature, 1))
                    .to.be.revertedWithCustomError(instance, "InvalidMintPhase")
            });
            it('Should fail calling mintWhitelist (InvalidMintPhase)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.CLOSED);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "WL");

                await expect(instance.mintWhitelist(signature, 1))
                    .to.be.revertedWithCustomError(instance, "InvalidMintPhase")
            });
        });
        describe('Whitelist Phase', () => {
            it('Should fail calling mintPublic (InvalidMintPhase)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.WL);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "PUBLIC");

                await expect(instance.mintPublic(signature, 1))
                    .to.be.revertedWithCustomError(instance, "InvalidMintPhase")
            });
            it('Should fail calling mintWhitelist (InvalidEtherAmount)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.WL);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "WL");

                await expect(instance.mintWhitelist(signature, 1, {
                    value: ethers.utils.parseEther("0.05")
                }))
                    .to.be.revertedWithCustomError(instance, "InvalidEtherAmount")
            });
            it('Should succeed calling mintWhitelist (Single Item)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.WL);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "WHITELIST");

                await expect(instance.connect(addr1).mintWhitelist(signature, 1, {
                    value: ethers.utils.parseEther("0.1"),
                })).to.changeEtherBalances(
                    [addr1.address, instance.address],
                    [`-${ethers.utils.parseEther("0.1")}`, ethers.utils.parseEther("0.1")]);

                expect(await instance.balanceOf(addr1.address)).to.equal(1);
            });
            it('Should succeed calling mintWhitelist (Multiple Items)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.WL);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "WHITELIST");

                await expect(instance.connect(addr1).mintWhitelist(signature, 5, {
                    value: ethers.utils.parseEther("0.5"),
                })).to.changeEtherBalances(
                    [addr1.address, instance.address],
                    [`-${ethers.utils.parseEther("0.5")}`, ethers.utils.parseEther("0.5")]);

                expect(await instance.balanceOf(addr1.address)).to.equal(5);
            });
            it('Should fail calling mintWhitelist (WalletLimitExceeded)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.WL);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "WHITELIST");

                await expect(instance.connect(addr1).mintWhitelist(signature, 7, {
                    value: ethers.utils.parseEther("0.7"),
                })).to.be.revertedWithCustomError(instance, "WalletLimitExceeded")
            });
            it('Should fail calling mintWhitelist SEQ (WalletLimitExceeded)', async () => {
                const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

                await instance.setMintPhase(MintPhase.WL);
                await instance.setSigner(owner.address);

                let {signature} = await generateSignature(owner, addr1.address, "WHITELIST");

                await instance.connect(addr1).mintWhitelist(signature, 3, {
                    value: ethers.utils.parseEther("0.3")
                });

                await expect(instance.connect(addr1).mintWhitelist(signature, 3, {
                    value: ethers.utils.parseEther("0.3"),
                })).to.be.revertedWithCustomError(instance, "WalletLimitExceeded")
            });
        });
        describe('Public Phase', () => {
            it('Should fail calling mintWhitelist', async () => {
            });
            it('Should succeed calling mintPublic', async () => {
            });
        });
    });
    describe('Reveal', () => {
        it('Should reveal and update metadata pointers', async () => {
            const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

            const baseUri = process.env.BASE_URI;
            const tokenId = 10;

            await instance.setBaseURI(baseUri);
            await instance.reveal();

            const tokenUri = await instance.tokenURI(tokenId);

            expect(tokenUri).to.equal(`${baseUri}${tokenId}.json`);
        });
        it('Should return unrevealed metadata', async () => {
            const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

            const baseUri = process.env.BASE_URI;

            await instance.setBaseURI(baseUri);

            const tokenUri = await instance.tokenURI(1);

            expect(tokenUri).to.equal(`${baseUri}unrevealed.json`);
        });
    });
    describe('Owner Functions', () => {
        it('Should withdraw successfully', async () => {
        });
        it('Should change _signer value', async () => {
        });
        it('Should change mintPrice value', async () => {
            const {instance, owner, addr1, addr2} = await loadFixture(deployNftContractFixture);

            const initialMintPrice = await instance.mintPrice();

            await instance.setMintPrice(ethers.utils.parseUnits("0.5"));

            const afterMintPrice = await instance.mintPrice();

            expect(ethers.utils.formatEther(initialMintPrice)).to.equal("0.1");
            expect(ethers.utils.formatEther(afterMintPrice)).to.equal("0.5");
        });
        it('Should change mintPhase value', async () => {
        });
        it('Should fail for setMintPhase with invalid value', async () => {
        });
    });

});
