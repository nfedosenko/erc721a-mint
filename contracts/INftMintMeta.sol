// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface INftMintMeta {
    error DontTryToTrickUs();
    error InvalidMintPhase();
    error InvalidRevealPhase();
    error InvalidSignature();
    error SupplyExceeded();
    error TokenCapExceeded();
    error TokenLimitExceeded();
    error InvalidEtherAmount();
    error TokenClaimed();
    error WithdrawFailed();
    error WalletLimitExceeded();
    error ArrayLengthMismatch();
    error InvalidTokenCap();
}