import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from "@solana/web3.js";
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";

/**
 * Requests an airdrop of SOL to the given public key.
 */
export async function requestAirdrop(connection: Connection, publicKey: PublicKey) {
    try {
        const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: signature,
        });
        return signature;
    } catch (error: any) {
        console.error("Airdrop failed:", error);
        throw new Error(error.message || "Airdrop failed. Devnet might be rate-limited.");
    }
}

/**
 * Creates a mock SPL token and mints it to the user.
 * This is used for demo purposes so judges have assets to lock in escrow.
 */
export async function createMockToken(
    connection: Connection,
    payer: anchor.Wallet,
) {
    try {
        // 1. Create Mint
        const mint = await createMint(
            connection,
            (payer as any).payer || payer, // Use payer if available, otherwise assume it's a Signer
            payer.publicKey,
            null,
            9
        );

        // 2. Create ATA
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            (payer as any).payer || payer,
            mint,
            payer.publicKey
        );

        // 3. Mint 1,000 tokens
        await mintTo(
            connection,
            (payer as any).payer || payer,
            mint,
            tokenAccount.address,
            payer.publicKey,
            1000 * 10 ** 9
        );

        return mint.toBase58();
    } catch (error: any) {
        console.error("Mock token creation failed:", error);
        throw new Error(error.message || "Failed to create mock tokens.");
    }
}
