"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Pattern } from "@/lib/patterns"
import {
  Loader2, Rocket, Wallet, User, ShieldCheck,
  ArrowRightLeft, Info, ExternalLink, Sparkles,
  Droplets, Coins, CheckCircle2, Circle, Zap, ZapOff, Heart, HeartOff, MessageCircle, Send, Bookmark, MoreHorizontal, Terminal,
  Clock, Lock, Unlock, Trophy, ShieldAlert, Target, Gavel, Users, Activity
} from "lucide-react"
import { toast } from "sonner"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import * as anchor from "@coral-xyz/anchor"
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL, Keypair, Transaction, ComputeBudgetProgram } from "@solana/web3.js"
import { IDL_REGISTRY, PatternSlug } from "@/lib/idl"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { requestAirdrop, createMockToken } from "@/lib/solana-utils"

interface SolanaClientProps {
  pattern: Pattern
}

export function SolanaClient({ pattern }: SolanaClientProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [role, setRole] = useState<"maker" | "taker">("maker")

  // Balances & State
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [mintAddress, setMintAddress] = useState<string>("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr")
  const [amount, setAmount] = useState<string>("100")
  const [escrowId, setEscrowId] = useState<string>("1")

  // Persistence: Load saved mint address and escrow ID from localStorage
  useEffect(() => {
    const savedMint = localStorage.getItem(`nodeshift_mint_${pattern.slug}`)
    if (savedMint) setMintAddress(savedMint)

    const savedId = localStorage.getItem(`nodeshift_escrow_id_${pattern.slug}`)
    if (savedId) setEscrowId(savedId)
  }, [pattern.slug])

  // Monitor Balance
  useEffect(() => {
    if (!wallet.publicKey) return
    const updateBalance = async () => {
      try {
        const bal = await connection.getBalance(wallet.publicKey!)
        setSolBalance(bal / LAMPORTS_PER_SOL)
      } catch (e) {
        console.error("Balance fetch failed", e)
      }
    }
    updateBalance()
    const interval = setInterval(updateBalance, 10000)
    return () => clearInterval(interval)
  }, [wallet.publicKey, connection])

  const [activeEscrow, setActiveEscrow] = useState<boolean>(false)
  const [activeLimiter, setActiveLimiter] = useState<boolean>(false)
  const [activeRbacProfile, setActiveRbacProfile] = useState<boolean>(false)
  const [userRole, setUserRole] = useState<any>(null)
  const [selectedRbacRole, setSelectedRbacRole] = useState<number>(0) // 0: Viewer, 1: Editor, 2: Admin

  const [activeApiKey, setActiveApiKey] = useState<boolean>(false)
  const [apiKeyRecord, setApiKeyRecord] = useState<any>(null)
  const [generatedKey, setGeneratedKey] = useState<string>("")

  const [idempotencyKey, setIdempotencyKey] = useState<string>("")
  const [idempotencyRecord, setIdempotencyRecord] = useState<any>(null)
  const [idemLogs, setIdemLogs] = useState<string[]>([])

  const [subscriptionRecord, setSubscriptionRecord] = useState<any>(null)
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const [subTimeLeft, setSubTimeLeft] = useState<number>(0)

  const [jobAccounts, setJobAccounts] = useState<any[]>([])
  const [isBotActive, setIsBotActive] = useState<boolean>(false)
  const [crankLogs, setCrankLogs] = useState<string[]>([])
  const [keeperProfit, setKeeperProfit] = useState<number>(0)

  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([])

  const [orderBook, setOrderBook] = useState<{ bids: any[], asks: any[] }>({ bids: [], asks: [] })
  const [orderSide, setOrderSide] = useState<number>(0) // 0: Buy, 1: Sell

  const [electionState, setElectionState] = useState<{ activeLeader: string, epochEnd: number, epochDuration: number } | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [prevLeader, setPrevLeader] = useState<string | null>(null)
  const [reputationScore] = useState<number>(Math.floor(Math.random() * 100) + 1) // Simulated reputation

  // Auction State
  const [auctionAccount, setAuctionAccount] = useState<any>(null)
  const [bidAmount, setBidAmount] = useState<string>("")
  const [startPrice, setStartPrice] = useState<string>("1.5")

  // Circuit Breaker State
  const [breakerAccount, setBreakerAccount] = useState<any>(null)

  // Anchor Program Setup
  const program = useMemo(() => {
    const config = IDL_REGISTRY[pattern.slug as PatternSlug]
    if (!config || !wallet.publicKey) return null

    const provider = new anchor.AnchorProvider(
      connection,
      wallet as any,
      anchor.AnchorProvider.defaultOptions()
    )
    return new anchor.Program(config.idl as any, provider)
  }, [connection, wallet, pattern.slug])

  // Check for existing state on-chain
  useEffect(() => {
    if (!program || !wallet.publicKey) return

    const checkState = async () => {
      try {
        const currentPubkey = program.provider.publicKey!

        if (pattern.slug === "escrow-engine") {
          const seedBN = new anchor.BN(escrowId)
          const [escrowPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("escrow"),
              currentPubkey.toBuffer(),
              seedBN.toArrayLike(Buffer, "le", 8)
            ],
            program.programId
          )
          const account = await connection.getAccountInfo(escrowPDA)
          setActiveEscrow(!!account)
        } else if (pattern.slug === "rate-limiter") {
          const [limiterPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("rate-limiter"), currentPubkey.toBuffer()],
            program.programId
          )
          const account = await connection.getAccountInfo(limiterPDA)
          setActiveLimiter(!!account)
        } else if (pattern.slug === "rbac-access-control") {
          const [profilePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("user-profile"), currentPubkey.toBuffer()],
            program.programId
          )
          const account = await (program as any).account.userProfile.fetchNullable(profilePDA)
          setActiveRbacProfile(!!account)
          if (account) {
            setUserRole(account.role)
          }
        } else if (pattern.slug === "api-key-management") {
          const [apiPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("api-key"), currentPubkey.toBuffer()],
            program.programId
          )
          const account = await (program as any).account.apiKeyRegistry.fetchNullable(apiPDA)
          setActiveApiKey(!!account)
          if (account) {
            setApiKeyRecord(account)
          }
        } else if (pattern.slug === "idempotency-key") {
          if (idempotencyKey) {
            const seedBN = new anchor.BN(idempotencyKey);
            const [idemPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from("idempotency"), currentPubkey.toBuffer(), seedBN.toArrayLike(Buffer, "le", 8)],
              program.programId
            )
            const account = await (program as any).account.idempotencyTracker.fetchNullable(idemPDA)
            if (account) {
              setIdempotencyRecord(account)
            } else {
              setIdempotencyRecord(null)
            }
          }
        } else if (pattern.slug === "subscription-billing") {
          const [subPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("subscription"), currentPubkey.toBuffer()],
            program.programId
          )
          const account = await (program as any).account.subscriptionAccount.fetchNullable(subPDA)
          setSubscriptionRecord(account)
          setIsSubscribed(!!account)

          if (account) {
            const now = Math.floor(Date.now() / 1000)
            const expiry = account.expiryTimestamp.toNumber()
            setSubTimeLeft(Math.max(0, expiry - now))
          } else {
            setSubTimeLeft(0)
          }
        } else if (pattern.slug === "on-chain-job-queue") {
          const accounts = await (program as any).account.jobAccount.all()
          setJobAccounts(accounts)
        } else if (pattern.slug === "leaderboard-ranking") {
          try {
            const leaderboardAccount = await (program as any).account.leaderboard.all()
            if (leaderboardAccount.length > 0) {
              setLeaderboardEntries(leaderboardAccount[0].account.entries)
            }
          } catch (e) {
            console.warn("Leaderboard not initialized yet")
          }
        } else if (pattern.slug === "order-matching-engine") {
          try {
            const orderBookAccount = await (program as any).account.orderBookAccount.all()
            if (orderBookAccount.length > 0) {
              setOrderBook(orderBookAccount[0].account)
            }
          } catch (e) {
            console.warn("Order book not initialized yet")
          }
        } else if (pattern.slug === "leader-election") {
          try {
            const savedState = localStorage.getItem("nodeshift_election_state")
            const savedPool = localStorage.getItem("nodeshift_election_pool")

            if (savedState && savedPool) {
              const stateAcc = await (program as any).account.electionState.fetch(new PublicKey(savedState))
              const poolAcc = await (program as any).account.electoralPool.fetch(new PublicKey(savedPool))

              setElectionState({
                activeLeader: stateAcc.activeLeader.toString(),
                epochEnd: stateAcc.epochEnd.toNumber(),
                epochDuration: stateAcc.epochDuration.toNumber()
              })
              setCandidates(poolAcc.candidates)
            } else {
              setElectionState(null)
              setCandidates([])
            }
          } catch (e) {
            console.warn("Election state sync failed or not found")
          }
        } else if (pattern.slug === "auction-engine") {
          try {
            const auctions = await (program as any).account.auctionAccount.all()
            if (auctions.length > 0) {
              setAuctionAccount(auctions[0].account)
            } else {
              setAuctionAccount(null)
            }
          } catch (e) {
            console.warn("Auction account sync failed")
          }
        } else if (pattern.slug === "circuit-breaker") {
          try {
            const breakers = await (program as any).account.circuitBreakerAccount.all()
            if (breakers.length > 0) {
              setBreakerAccount(breakers[0].account)
            } else {
              setBreakerAccount(null)
            }
          } catch (e) {
            console.warn("Breaker sync failed")
          }
        }
      } catch (e) {
        console.error("State check failed", e)
      }
    }
    checkState()
    const interval = setInterval(checkState, 5000)
    return () => clearInterval(interval)
  }, [program, wallet.publicKey, connection, escrowId, pattern.slug])

  // Automated Keeper Bot Loop
  useEffect(() => {
    if (!isBotActive || !program || !wallet.publicKey || pattern.slug !== "on-chain-job-queue") return

    const scanQueue = async () => {
      const log = (msg: string) => setCrankLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))

      try {
        log("Scanning queue for ready jobs...")
        const accounts = await (program as any).account.jobAccount.all()
        const readyJobs = accounts.filter((j: any) => {
          const now = Math.floor(Date.now() / 1000)
          return j.account.status.pending && now >= j.account.triggerTime.toNumber()
        })

        if (readyJobs.length > 0) {
          const target = readyJobs[0]
          log(`MATCH FOUND: Job ${target.publicKey.toString().slice(0, 8)}... is ready!`)
          log("Triggering Crank Transaction...")

          const tx = await (program.methods as any)
            .processJob()
            .accounts({
              jobAccount: target.publicKey,
              keeper: wallet.publicKey,
            })
            .rpc()

          setTxSig(tx)
          const reward = (target.account.bounty.toNumber() / LAMPORTS_PER_SOL)
          setKeeperProfit(prev => prev + reward)
          log(`SUCCESS: Crank complete. Earned ${reward.toFixed(3)} SOL incentive.`)
        } else {
          log("No ready jobs found. Standing by...")
        }
      } catch (e: any) {
        log(`CRITICAL: Keeper error - ${e.message}`)
      }
    }

    const interval = setInterval(scanQueue, 5000)
    return () => clearInterval(interval)
  }, [isBotActive, program, wallet.publicKey, pattern.slug])

  // Actions
  const handleAirdrop = async () => {
    if (!wallet.publicKey) return
    setLoading(true)
    try {
      await requestAirdrop(connection, wallet.publicKey)
      toast.success("1 SOL Received! (Devnet)")
    } catch (e: any) {
      toast.error(e.message, {
        description: "Devnet might be busy. Try the official faucet.",
        action: {
          label: "Open Faucet",
          onClick: () => window.open("https://faucet.solana.com", "_blank")
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMockToken = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return
    setLoading(true)
    try {
      const mint = await createMockToken(connection, wallet as any)
      setMintAddress(mint)
      localStorage.setItem(`nodeshift_mint_${pattern.slug}`, mint)
      toast.success("Mock Tokens Created!", {
        description: `Mint: ${mint.slice(0, 8)}...`
      })
    } catch (e: any) {
      console.error(e)
      toast.error("Mock token creation failed. Devnet rate limits might be active.")
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeEscrow = async () => {
    if (!program || !wallet.publicKey) return
    if (!mintAddress) {
      toast.error("Please provide or create a Token Mint address first.")
      return
    }

    setLoading(true)
    try {
      const amountBN = new anchor.BN(amount)
      const expectedAmountBN = new anchor.BN(amount)
      const mint = new PublicKey(mintAddress)
      const seedBN = new anchor.BN(escrowId)

      // Derive the correct Associated Token Account for the user
      const makerATA = await anchor.utils.token.associatedAddress({
        mint: mint,
        owner: wallet.publicKey
      })

      // Derive Escrow PDA with seed
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          wallet.publicKey.toBuffer(),
          seedBN.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      )

      // Derive Vault PDA with seed
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          wallet.publicKey.toBuffer(),
          seedBN.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      )

      const tx = await program.methods
        .initialize(seedBN, amountBN, expectedAmountBN)
        .accounts({
          maker: wallet.publicKey,
          makerTokenAccount: makerATA,
          makerTokenAccountMint: mint,
          escrowState: escrowPDA,
          vault: vaultPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveEscrow(true)
      localStorage.setItem(`nodeshift_last_maker`, wallet.publicKey.toBase58())
      toast.success("Escrow Initialized Successfully!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Transaction Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEscrow = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      const mint = new PublicKey(mintAddress)
      const seedBN = new anchor.BN(escrowId)

      const makerATA = await anchor.utils.token.associatedAddress({
        mint: mint,
        owner: wallet.publicKey
      })

      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          wallet.publicKey.toBuffer(),
          seedBN.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      )

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          wallet.publicKey.toBuffer(),
          seedBN.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      )

      const tx = await program.methods
        .cancel()
        .accounts({
          maker: wallet.publicKey,
          makerTokenAccount: makerATA,
          escrowState: escrowPDA,
          vault: vaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveEscrow(false)
      toast.success("Escrow Canceled!", { description: "Funds returned to your wallet." })
    } catch (e: any) {
      console.error(e)
      toast.error(`Cancel Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleExchange = async () => {
    if (!program || !wallet.publicKey) return

    setLoading(true)
    try {
      const makerPubkey = new PublicKey(localStorage.getItem(`nodeshift_last_maker`) || wallet.publicKey.toBase58());
      const mint = new PublicKey(mintAddress)
      const seedBN = new anchor.BN(escrowId)

      const takerATA = await anchor.utils.token.associatedAddress({
        mint: mint,
        owner: wallet.publicKey
      })

      const makerATA = await anchor.utils.token.associatedAddress({
        mint: mint,
        owner: makerPubkey
      })

      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          makerPubkey.toBuffer(),
          seedBN.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      )

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          makerPubkey.toBuffer(),
          seedBN.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      )

      const tx = await program.methods
        .exchange()
        .accounts({
          taker: wallet.publicKey,
          takerTokenAccount: takerATA,
          takerReceiveTokenAccount: takerATA,
          maker: makerPubkey,
          makerTokenAccount: makerATA,
          escrowState: escrowPDA,
          vault: vaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveEscrow(false)
      toast.success("Atomic Swap Complete!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Exchange Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeLimiter = async () => {
    if (!program || !program.provider.publicKey) return
    setLoading(true)
    try {
      const currentPubkey = program.provider.publicKey
      const [limiterPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("rate-limiter"), currentPubkey.toBuffer()],
        program.programId
      )

      const tx = await program.methods
        .initializeLimiter()
        .accounts({
          rateLimiter: limiterPDA,
          user: currentPubkey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveLimiter(true)
      toast.success("Rate Limiter Initialized!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Initialization Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAccessResource = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      const currentPubkey = wallet.publicKey
      const [limiterPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("rate-limiter"), currentPubkey.toBuffer()],
        program.programId
      )

      const tx = await program.methods
        .accessResource()
        .accounts({
          rateLimiter: limiterPDA,
          user: currentPubkey,
          signer: currentPubkey,
        } as any)
        .rpc()

      setTxSig(tx)
      toast.success("Resource Accessed!", {
        description: "Request within limits."
      })
    } catch (e: any) {
      console.error(e)
      if (e.message.includes("RateLimitExceeded")) {
        toast.error("Rate Limit Exceeded!", { description: "Wait for the window to reset." })
      } else {
        toast.error(`Access Failed: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetLimiter = async () => {
    if (!program || !program.provider.publicKey) return
    setLoading(true)
    try {
      const currentPubkey = program.provider.publicKey
      const [limiterPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("rate-limiter"), currentPubkey.toBuffer()],
        program.programId
      )

      const tx = await program.methods
        .closeLimiter()
        .accounts({
          rateLimiter: limiterPDA,
          user: currentPubkey,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveLimiter(false)
      toast.success("Limiter State Reset!", { description: "On-chain account closed and SOL returned." })
    } catch (e: any) {
      console.error(e)
      toast.error(`Reset Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }


  const handleInitializeRbacProfile = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      // If profile already exists, we need to close it first
      if (activeRbacProfile) {
        await (program as any).methods
          .closeProfile()
          .accounts({
            userProfile: PublicKey.findProgramAddressSync(
              [Buffer.from("user-profile"), wallet.publicKey.toBuffer()],
              program.programId
            )[0],
            authority: wallet.publicKey,
          } as any)
          .rpc()
        toast.info("Updating identity...")
      }

      const tx = await program.methods
        .initializeUserRole(selectedRbacRole)
        .accounts({
          userProfile: PublicKey.findProgramAddressSync(
            [Buffer.from("user-profile"), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveRbacProfile(true)

      // Fetch the new role immediately for better UX
      const profilePDA = PublicKey.findProgramAddressSync(
        [Buffer.from("user-profile"), wallet.publicKey.toBuffer()],
        program.programId
      )[0]
      const updatedAccount = await (program as any).account.userProfile.fetch(profilePDA)
      setUserRole(updatedAccount.role)

      toast.success("RBAC Profile Initialized!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Initialization Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseRbacProfile = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      const tx = await (program as any).methods
        .closeProfile()
        .accounts({
          userProfile: PublicKey.findProgramAddressSync(
            [Buffer.from("user-profile"), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          authority: wallet.publicKey,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveRbacProfile(false)
      setUserRole(null)
      toast.success("RBAC Profile Closed!", { description: "You can now select a new role." })
    } catch (e: any) {
      console.error(e)
      toast.error(`Reset Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteAdminInstruction = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      const tx = await program.methods
        .adminOnlyInstruction()
        .accounts({
          userProfile: PublicKey.findProgramAddressSync(
            [Buffer.from("user-profile"), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          authority: wallet.publicKey,
        } as any)
        .rpc()

      setTxSig(tx)
      toast.success("Admin Action Successful!")
    } catch (e: any) {
      console.error(e)
      if (e.message.includes("Unauthorized")) {
        toast.error("Access Denied!", { description: "You are not an Admin." })
      } else {
        toast.error(`Execution Failed: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteEditorInstruction = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      const tx = await program.methods
        .editorInstruction()
        .accounts({
          userProfile: PublicKey.findProgramAddressSync(
            [Buffer.from("user-profile"), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          authority: wallet.publicKey,
        } as any)
        .rpc()

      setTxSig(tx)
      toast.success("Editor Action Successful!")
    } catch (e: any) {
      console.error(e)
      if (e.message.includes("Unauthorized")) {
        toast.error("Access Denied!", { description: "You need Admin or Editor role." })
      } else {
        toast.error(`Execution Failed: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeApiKey = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      if (activeApiKey) {
        await handleCloseApiKey(false)
      }
      const randomBytes = crypto.getRandomValues(new Uint8Array(32))
      const rawKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      const keyHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))

      const tx = await program.methods
        .initializeKey(keyHash)
        .accounts({
          apiKeyRegistry: PublicKey.findProgramAddressSync(
            [Buffer.from("api-key"), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      setTxSig(tx)
      setActiveApiKey(true)
      setGeneratedKey(rawKey)
      const pda = PublicKey.findProgramAddressSync(
        [Buffer.from("api-key"), wallet.publicKey.toBuffer()],
        program.programId
      )[0]
      const updatedAccount = await (program as any).account.apiKeyRegistry.fetch(pda)
      setApiKeyRecord(updatedAccount)
      toast.success("API Key Generated & Registered!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Initialization Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeApiKey = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    try {
      const tx = await program.methods
        .revokeKey()
        .accounts({
          apiKeyRegistry: PublicKey.findProgramAddressSync(
            [Buffer.from("api-key"), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          owner: wallet.publicKey,
        } as any)
        .rpc()

      setTxSig(tx)
      setApiKeyRecord((prev: any) => ({ ...prev, isActive: false }))
      toast.success("API Key Revoked Off-Chain & On-Chain!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Revoke Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseApiKey = async (showToast = true) => {
    if (!program || !wallet.publicKey) return
    if (showToast) setLoading(true)
    try {
      const tx = await program.methods
        .closeRegistry()
        .accounts({
          apiKeyRegistry: PublicKey.findProgramAddressSync(
            [Buffer.from("api-key"), wallet.publicKey.toBuffer()],
            program.programId
          )[0],
          owner: wallet.publicKey,
        } as any)
        .rpc()

      if (showToast) {
        setTxSig(tx)
        toast.success("API Key Data Erased!", { description: "You can generate a new one." })
      }
      setActiveApiKey(false)
      setApiKeyRecord(null)
      setGeneratedKey("")
    } catch (e: any) {
      console.error(e)
      if (showToast) toast.error(`Reset Failed: ${e.message}`)
    } finally {
      if (showToast) setLoading(false)
    }
  }

  const handleProcessIdempotentAction = async (keyInput?: string) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    const u64Key = keyInput || "1337"; // Using a fixed post ID for social demo
    const seedBN = new anchor.BN(u64Key);
    const log = (msg: string) => setIdemLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))

    try {
      log(`Initiating Like for Post #${u64Key}...`)
      setIdempotencyKey(u64Key);

      const tx = await program.methods
        .processUniqueAction(seedBN)
        .accounts({
          idempotencyTracker: PublicKey.findProgramAddressSync(
            [Buffer.from("idempotency"), wallet.publicKey.toBuffer(), seedBN.toArrayLike(Buffer, "le", 8)],
            program.programId
          )[0],
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      setTxSig(tx)
      log(`SUCCESS: Transaction confirmed. PDA Initialized.`)
      toast.success(`Post Liked!`)

      const [idemPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("idempotency"), wallet.publicKey.toBuffer(), seedBN.toArrayLike(Buffer, "le", 8)],
        program.programId
      )
      const account = await (program as any).account.idempotencyTracker.fetch(idemPDA)
      setIdempotencyRecord(account)

    } catch (e: any) {
      console.error(e)
      if (e.message.includes("already in use") || e.message.includes("0x0")) {
        log(`REJECTED: Account already exists. Idempotency enforced by Anchor.`)
        toast.error(`Idempotency Kept: Already Liked.`)
      } else {
        log(`ERROR: ${e.message}`)
        toast.error(`Execution Failed: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUnlikeAction = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    const u64Key = idempotencyKey || "1337";
    const seedBN = new anchor.BN(u64Key);
    const log = (msg: string) => setIdemLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))

    try {
      log(`Initiating Unlike for Post #${u64Key}...`)

      const tx = await (program.methods as any)
        .closeTracker(seedBN)
        .accounts({
          idempotencyTracker: PublicKey.findProgramAddressSync(
            [Buffer.from("idempotency"), wallet.publicKey.toBuffer(), seedBN.toArrayLike(Buffer, "le", 8)],
            program.programId
          )[0],
          user: wallet.publicKey,
        } as any)
        .rpc()

      setTxSig(tx)
      log(`SUCCESS: PDA destroyed. Rent recovered. You can Like again!`)
      setIdempotencyRecord(null)
      toast.success(`Post Unliked!`)
    } catch (e: any) {
      log(`ERROR: ${e.message}`)
      toast.error(`Unlike Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBuySubscription = async (durationSec: number) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const [subPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("subscription"), wallet.publicKey.toBuffer()],
        program.programId
      )

      const tx = await (program.methods as any)
        .buySubscription(new anchor.BN(durationSec))
        .accounts({
          subscription: subPDA,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      setTxSig(tx)
      toast.success(`Subscription Secured for ${durationSec}s!`)
    } catch (e: any) {
      console.error(e)
      toast.error(`Purchase Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySubscription = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const [subPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("subscription"), wallet.publicKey.toBuffer()],
        program.programId
      )

      const tx = await (program.methods as any)
        .accessProtectedResource()
        .accounts({
          subscription: subPDA,
          user: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success("Access Granted! Resource verified on-chain.")
    } catch (e: any) {
      console.error(e)
      // Check for expiry error
      if (e.message.includes("SubscriptionExpired")) {
        toast.error("Access Denied: Your subscription has expired on-chain!")
      } else {
        toast.error(`Verification Failed: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const [subPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("subscription"), wallet.publicKey.toBuffer()],
        program.programId
      )

      const tx = await (program.methods as any)
        .cancelSubscription()
        .accounts({
          subscription: subPDA,
          user: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      setSubscriptionRecord(null)
      setIsSubscribed(false)
      toast.success("Subscription Cancelled. Rent recovered.")
    } catch (e: any) {
      console.error(e)
      toast.error(`Cancel Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePostScheduledJob = async (bountySol: number, delaySec: number) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const jobKeypair = Keypair.generate()
      const bountyLamports = new anchor.BN(bountySol * LAMPORTS_PER_SOL)
      const delay = new anchor.BN(delaySec)

      const tx = await (program.methods as any)
        .postJob(bountyLamports, delay)
        .accounts({
          jobAccount: jobKeypair.publicKey,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([jobKeypair])
        .rpc()

      setTxSig(tx)
      toast.success(`Job Scheduled! Reward: ${bountySol} SOL.`)
    } catch (e: any) {
      console.error(e)
      toast.error(`Post Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCrankJob = async (jobPubKey: string) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const tx = await (program.methods as any)
        .processJob()
        .accounts({
          jobAccount: new PublicKey(jobPubKey),
          keeper: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success("Crank Successful! Incentive collected.")
    } catch (e: any) {
      console.error(e)
      toast.error(`Crank Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeLeaderboard = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const leaderboardKeypair = Keypair.generate()
      const tx = await (program.methods as any)
        .initialize()
        .accounts({
          leaderboard: leaderboardKeypair.publicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([leaderboardKeypair])
        .rpc()

      setTxSig(tx)
      toast.success("Leaderboard Initialized!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Init Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitScore = async (score: number) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const allLeaderboards = await (program as any).account.leaderboard.all()
      if (allLeaderboards.length === 0) {
        toast.error("Leaderboard not initialized. Admin must initialize first.")
        return
      }

      const tx = await (program.methods as any)
        .submitScore(new anchor.BN(score))
        .accounts({
          leaderboard: allLeaderboards[0].publicKey,
          player: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success(`Score ${score} Submitted!`)
    } catch (e: any) {
      console.error(e)
      toast.error(`Submission Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeOrderBook = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const orderBookKeypair = Keypair.generate()
      const tx = await (program.methods as any)
        .initialize()
        .accounts({
          orderBook: orderBookKeypair.publicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([orderBookKeypair])
        .rpc()

      setTxSig(tx)
      toast.success("Order Book Initialized!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Initialization Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceOrder = async (side: number, price: number, quantity: number) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const allBooks = await (program as any).account.orderBookAccount.all()
      if (allBooks.length === 0) {
        toast.error("Order Book not initialized. Admin must initialize first.")
        return
      }

      const tx = await (program.methods as any)
        .placeLimitOrder(side, new anchor.BN(price), new anchor.BN(quantity))
        .accounts({
          orderBook: allBooks[0].publicKey,
          trader: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success(`Order Placed: ${side === 0 ? "BUY" : "SELL"} ${quantity} @ ${price}`)
    } catch (e: any) {
      console.error(e)
      toast.error(`Order Placement Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeElection = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const stateKeypair = Keypair.generate()
      const poolKeypair = Keypair.generate()
      const tx = await (program.methods as any)
        .initialize(new anchor.BN(120)) // 120 second default epoch
        .accounts({
          electionState: stateKeypair.publicKey,
          electoralPool: poolKeypair.publicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([stateKeypair, poolKeypair])
        .rpc()

      setTxSig(tx)
      localStorage.setItem("nodeshift_election_state", stateKeypair.publicKey.toBase58())
      localStorage.setItem("nodeshift_election_pool", poolKeypair.publicKey.toBase58())
      toast.success("Election Engine Initialized!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Initialization Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterCandidate = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const poolAddr = localStorage.getItem("nodeshift_election_pool")
      if (!poolAddr) return

      const tx = await (program.methods as any)
        .registerCandidate()
        .accounts({
          electoralPool: new PublicKey(poolAddr),
          candidate: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success("Successfully Registered as Candidate!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Registration Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (index: number) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const poolAddr = localStorage.getItem("nodeshift_election_pool")
      if (!poolAddr) return

      const tx = await (program.methods as any)
        .vote(index, new anchor.BN(reputationScore))
        .accounts({
          electoralPool: new PublicKey(poolAddr),
          voter: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success(`Cast ${reputationScore} Votes!`)
    } catch (e: any) {
      console.error(e)
      toast.error(`Voting Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveElection = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const stateAddr = localStorage.getItem("nodeshift_election_state")
      const poolAddr = localStorage.getItem("nodeshift_election_pool")
      if (!stateAddr || !poolAddr) return

      const tx = await (program.methods as any)
        .resolveElection()
        .accounts({
          electionState: new PublicKey(stateAddr),
          electoralPool: new PublicKey(poolAddr),
        })
        .rpc()

      setTxSig(tx)

      // Immediate refresh to show the new leader
      const stateAcc = await (program as any).account.electionState.fetch(new PublicKey(stateAddr))
      const newLeader = stateAcc.activeLeader.toString()

      if (newLeader !== electionState?.activeLeader) {
        toast.success(`ELECTION SUCCESS: New Leader ${newLeader.slice(0, 6)}... commissioned!`, {
          icon: '👑',
          duration: 6000
        })
        setPrevLeader(electionState?.activeLeader || null)
      } else {
        toast.success("Election Resolved!")
      }

      setElectionState({
        activeLeader: newLeader,
        epochEnd: stateAcc.epochEnd.toNumber(),
        epochDuration: stateAcc.epochDuration.toNumber()
      })
    } catch (e: any) {
      console.error(e)
      toast.error(`Resolution Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedNodes = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const poolAddr = localStorage.getItem("nodeshift_election_pool")
      if (!poolAddr) return

      // Generate 5 random pubkeys for simulation
      const mockPubkeys = Array.from({ length: 5 }, () => Keypair.generate().publicKey)

      const tx = await (program.methods as any)
        .seedCandidates(mockPubkeys)
        .accounts({
          electoralPool: new PublicKey(poolAddr),
          admin: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success("5 Simulated Nodes Spawned On-Chain!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Simulation Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetElection = async () => {
    setLoading(true)
    try {
      localStorage.removeItem("nodeshift_election_state")
      localStorage.removeItem("nodeshift_election_pool")
      setElectionState(null)
      setCandidates([])
      setTxSig(null)
      toast.success("Electoral Hub Total Reset")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelJob = async (jobPubKey: string) => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const tx = await (program.methods as any)
        .cancelJob()
        .accounts({
          jobAccount: new PublicKey(jobPubKey),
          creator: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success("Job Cancelled. Assets recovered.")
    } catch (e: any) {
      console.error(e)
      toast.error(`Cancel Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeAuction = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const auctionKeypair = Keypair.generate()
      const priceLamports = new anchor.BN(parseFloat(startPrice) * LAMPORTS_PER_SOL)

      const tx = await (program.methods as any)
        .initializeAuction(priceLamports)
        .accounts({
          auctionAccount: auctionKeypair.publicKey,
          seller: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([auctionKeypair])
        .rpc()

      setTxSig(tx)
      toast.success(`Auction Initialized at ${startPrice} SOL!`)
    } catch (e: any) {
      console.error(e)
      toast.error(`Initialization Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceBid = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const allAuctions = await (program as any).account.auctionAccount.all()
      if (allAuctions.length === 0) {
        toast.error("No active auction found.")
        return
      }

      const amountLamports = new anchor.BN(parseFloat(bidAmount) * LAMPORTS_PER_SOL)
      const tx = await (program.methods as any)
        .placeBid(amountLamports)
        .accounts({
          auctionAccount: allAuctions[0].publicKey,
          bidder: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success(`Bid of ${bidAmount} SOL Accepted!`)
    } catch (e: any) {
      console.error(e)
      if (e.message.includes("BidTooLow")) {
        toast.error("Bid too low!", { description: "You must outbid the current highest bidder." })
      } else {
        toast.error(`Bid failed: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeBreaker = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const breakerKeypair = Keypair.generate()
      const tx = await (program.methods as any)
        .initialize()
        .accounts({
          breakerAccount: breakerKeypair.publicKey,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([breakerKeypair])
        .rpc()

      setTxSig(tx)
      toast.success("Circuit Breaker Initialized!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Initialization Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBreaker = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const allBreakers = await (program as any).account.circuitBreakerAccount.all()
      if (allBreakers.length === 0) return

      const tx = await (program.methods as any)
        .togglePause()
        .accounts({
          breakerAccount: allBreakers[0].publicKey,
          authority: wallet.publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success("Circuit State Toggled!")
    } catch (e: any) {
      console.error(e)
      toast.error(`Toggle Failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteBreakerAction = async () => {
    if (!program || !wallet.publicKey) return
    setLoading(true)
    setTxSig(null)
    try {
      const allBreakers = await (program as any).account.circuitBreakerAccount.all()
      if (allBreakers.length === 0) return

      const tx = await (program.methods as any)
        .executeAction()
        .accounts({
          breakerAccount: allBreakers[0].publicKey,
        })
        .rpc()

      setTxSig(tx)
      toast.success("Protected Action Executed!")
    } catch (e: any) {
      console.error(e)
      if (e.message.includes("CircuitOpen")) {
        toast.error("Circuit is OPEN!", { description: "Instruction execution blocked by on-chain circuit breaker." })
      } else {
        toast.error(`Action Failed: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!wallet.connected) {
    return (
      <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-outfit font-black text-2xl uppercase tracking-tighter text-white">Judge Access Portal</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">Connect your Devnet wallet to begin the interactive verification session.</p>
          </div>
          <WalletMultiButton className="!bg-primary !rounded-full !h-14 !px-8 !font-outfit !font-black !uppercase !text-[12px] !tracking-widest !transition-all hover:!scale-105 active:!scale-95" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Onboarding Checklist (Left) */}
      <div className="lg:col-span-4 space-y-4">
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <CardHeader className="p-6 border-b border-white/5">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-primary" />
              Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {solBalance !== null && solBalance > 0 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600" />}
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Step 1: Get Gas (SOL)</p>
                  <p className="text-[10px] text-gray-500">Required for transactions.</p>
                  {(!solBalance || solBalance < 0.01) && (
                    <Button onClick={handleAirdrop} disabled={loading} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-primary/20 text-primary hover:bg-primary/10">
                      Request 1 SOL
                    </Button>
                  )}
                </div>
              </div>

              {pattern.slug === "escrow-engine" ? (
                <div className="flex items-center gap-3">
                  {mintAddress ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600" />}
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Step 2: Mint Assets</p>
                    <p className="text-[10px] text-gray-500">Create mock tokens to escrow.</p>
                    {!mintAddress && (
                      <Button onClick={handleCreateMockToken} disabled={loading || !solBalance} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-primary/20 text-primary hover:bg-primary/10">
                        Generate Mock Token
                      </Button>
                    )}
                  </div>
                </div>
              ) : pattern.slug === "rbac-access-control" ? (
                <div className="flex items-center gap-3">
                  {activeRbacProfile ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600" />}
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Step 2: Create Identity</p>
                    <p className="text-[10px] text-gray-500">Initialize your on-chain user profile with a role.</p>
                    {!activeRbacProfile && (
                      <Button onClick={handleInitializeRbacProfile} disabled={loading || !solBalance} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-primary/20 text-primary hover:bg-primary/10">
                        Initialize Profile
                      </Button>
                    )}
                  </div>
                </div>
              ) : pattern.slug === "api-key-management" ? (
                <div className="flex items-center gap-3">
                  {activeApiKey ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600" />}
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Step 2: Generate Key</p>
                    <p className="text-[10px] text-gray-500">Create & register an API Key on-chain.</p>
                    {!activeApiKey && (
                      <Button onClick={handleInitializeApiKey} disabled={loading || !solBalance} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-primary/20 text-primary hover:bg-primary/10">
                        Generate API Key
                      </Button>
                    )}
                  </div>
                </div>
              ) : pattern.slug === "leader-election" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {electionState ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600" />}
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-white">Step 2: Start Epoch</p>
                      <p className="text-[10px] text-gray-500">Initialize the on-chain electoral pool.</p>
                      {!electionState && (
                        <Button onClick={handleInitializeElection} disabled={loading || !solBalance} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-primary/20 text-primary hover:bg-primary/10">
                          Init Election Engine
                        </Button>
                      )}
                    </div>
                  </div>
                  {electionState && candidates.length < 5 && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                      <Circle className="h-5 w-5 text-indigo-500" />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-white">Simulation: Nodes</p>
                        <p className="text-[10px] text-gray-500">Spawn 5 mock nodes for POV.</p>
                        <Button onClick={handleSeedNodes} disabled={loading} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10">
                          Seed 5 Network Nodes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : pattern.slug === "circuit-breaker" ? (
                <div className="flex items-center gap-3">
                  {breakerAccount ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600" />}
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Step 2: Bootstrap System</p>
                    <p className="text-[10px] text-gray-500">Initialize on-chain security state.</p>
                    {!breakerAccount && (
                      <Button onClick={handleInitializeBreaker} disabled={loading || !solBalance} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-primary/20 text-primary hover:bg-primary/10">
                        Bootstrap Breaker
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {activeLimiter ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-gray-600" />}
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Step 2: Init Protocol</p>
                    <p className="text-[10px] text-gray-500">Initialize on-chain state.</p>
                    {!activeLimiter && (
                      <Button onClick={handleInitializeLimiter} disabled={loading || !solBalance} size="sm" variant="outline" className="mt-2 h-8 text-[10px] rounded-full border-primary/20 text-primary hover:bg-primary/10">
                        Initialize Limiter
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 opacity-50">
                <Circle className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Step 3: Execute Logic</p>
                  <p className="text-[10px] text-gray-500">
                    {pattern.slug === "escrow-engine" ? "Interact with the Escrow." : pattern.slug === "rbac-access-control" ? "Test permissioned gates." : pattern.slug === "api-key-management" ? "Verify Key identity." : pattern.slug === "idempotency-key" ? "Submit duplicate actions." : pattern.slug === "auction-engine" ? "Place decentralized bids." : pattern.slug === "circuit-breaker" ? "Test emergency stop." : "Interact with the Limiter."}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-gray-500">
                <span>Wallet Balance</span>
                <span className="text-white font-mono">{solBalance?.toFixed(3) || "0.000"} SOL</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Client (Right) */}
      <div className="lg:col-span-8 flex flex-col gap-8">
        <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md flex-1">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="font-outfit text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Live Devnet Explorer
                </CardTitle>
                <CardDescription className="text-gray-400">Interact with {pattern.title}</CardDescription>
              </div>

              {pattern.slug === "escrow-engine" && (
                <div className="flex bg-black/40 p-1 rounded-full border border-white/10 self-start">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => {
                      setRole("maker");
                      setTxSig(null);
                    }}
                    className={`rounded-full px-4 text-[10px] uppercase font-black tracking-widest transition-all ${role === "maker" ? "bg-white/10 text-white" : "text-gray-500"}`}
                  >
                    <User className="h-3 w-3 mr-2" /> Maker
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => {
                      setRole("taker");
                      setTxSig(null);
                    }}
                    className={`rounded-full px-4 text-[10px] uppercase font-black tracking-widest transition-all ${role === "taker" ? "bg-white/10 text-white" : "text-gray-500"}`}
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-2" /> Taker
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {pattern.slug === "escrow-engine" && (
              <div className={`p-6 rounded-2xl border ${role === 'maker' ? 'border-primary/20 bg-primary/5' : 'border-cyan-500/20 bg-cyan-500/5'} space-y-6`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-outfit font-black uppercase tracking-tighter text-lg text-white">
                    {role === "maker" ? "Initialize Escrow" : "Complete Swap"}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${role === 'maker' ? 'bg-primary' : 'bg-cyan-500'}`}></span>
                    Role: {role}
                  </div>
                </div>

                {role === "maker" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Token Amount</Label>
                        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="bg-black/60 border-white/10 h-14 font-mono text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Mock Mint Address</Label>
                        <Input
                          value={mintAddress}
                          readOnly
                          disabled
                          className="bg-black/60 border-white/10 h-14 font-mono text-white/40 text-[10px] cursor-not-allowed opacity-60"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Escrow ID (Seed)</Label>
                        <Input
                          value={escrowId}
                          onChange={(e) => {
                            setEscrowId(e.target.value);
                            localStorage.setItem(`nodeshift_escrow_id_${pattern.slug}`, e.target.value);
                          }}
                          placeholder="12345"
                          className="bg-black/60 border-white/10 h-14 font-mono text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        onClick={handleInitializeEscrow}
                        disabled={loading || !mintAddress || activeEscrow}
                        className="flex-1 h-14 gap-3 font-outfit font-black uppercase border-b-4 tracking-[0.2em] text-sm bg-primary border-primary-foreground/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                        {activeEscrow ? "Escrow ID Active" : "Launch Vault"}
                      </Button>
                      {(txSig || activeEscrow) && (
                        <Button
                          onClick={handleCancelEscrow}
                          disabled={loading}
                          variant="destructive"
                          className="h-14 px-6 border-b-4 border-red-900/50 uppercase font-black tracking-widest text-[10px]"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                      <ArrowRightLeft className="h-10 w-10 text-cyan-500" />
                    </div>
                    <p className="text-sm text-gray-400 max-w-xs">Ready to swap 100 tokens with the current Maker.</p>
                    <Button
                      onClick={handleExchange}
                      disabled={loading}
                      className="w-full h-14 gap-3 font-outfit font-black uppercase border-b-4 tracking-[0.2em] text-sm bg-cyan-600 border-cyan-700 hover:bg-cyan-500 transition-all active:scale-95"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                      Finalize Atomic Swap
                    </Button>
                  </div>
                )}
              </div>
            )}
            {pattern.slug === "rate-limiter" && (
              <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-outfit font-black uppercase tracking-tighter text-lg text-white">
                    Rate Limiter Verification
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">
                    <span className={`w-2 h-2 rounded-full animate-pulse bg-primary`}></span>
                    Status: {activeLimiter ? "Ready" : "Not Initialized"}
                  </div>
                </div>


                <div className="space-y-6">
                  {!activeLimiter ? (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-400">Initialize your personal on-chain rate limiter state (PDA).</p>
                      <Button
                        onClick={handleInitializeLimiter}
                        disabled={loading}
                        className="w-full h-14 gap-3 font-outfit font-black uppercase border-b-4 tracking-[0.2em] text-sm bg-primary border-primary-foreground/20 hover:bg-primary/90 transition-all active:scale-95"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                        Initialize Limiter
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                        <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest text-center">Protocol Limits</p>
                        <div className="flex justify-around">
                          <div className="text-center">
                            <p className="text-lg font-mono text-white">2</p>
                            <p className="text-[8px] uppercase text-gray-500">Max Req</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-mono text-white">~2mins</p>
                            <p className="text-[8px] uppercase text-gray-500">Window</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button
                          onClick={handleAccessResource}
                          disabled={loading}
                          className="flex-1 h-14 gap-3 font-outfit font-black uppercase border-b-4 tracking-[0.2em] text-sm bg-primary border-primary-foreground/20 hover:bg-primary/90 transition-all active:scale-95"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                          Access Resource (Spam Me)
                        </Button>
                        <Button
                          onClick={handleResetLimiter}
                          disabled={loading}
                          variant="destructive"
                          className="h-14 px-6 border-b-4 border-red-900/50 uppercase font-black tracking-widest text-[10px]"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


            {pattern.slug === "rbac-access-control" && (
              <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-outfit font-black uppercase tracking-tighter text-lg text-white">
                    RBAC Verification
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">
                    <span className={`w-2 h-2 rounded-full animate-pulse bg-primary`}></span>
                    Status: {activeRbacProfile ? "Profile Active" : "No Profile"}
                  </div>
                </div>

                <div className="space-y-6">
                  {!activeRbacProfile ? (
                    <div className="space-y-4">
                      <Label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Select Initial Role</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Viewer', 'Editor', 'Admin'].map((r, i) => (
                          <Button
                            key={r}
                            onClick={() => setSelectedRbacRole(i)}
                            variant={selectedRbacRole === i ? "default" : "outline"}
                            className="h-10 text-[10px] font-bold uppercase tracking-widest"
                          >
                            {r}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={handleInitializeRbacProfile}
                        disabled={loading}
                        className="w-full h-14 gap-3 font-outfit font-black uppercase border-b-4 tracking-[0.2em] text-sm bg-primary border-primary-foreground/20 hover:bg-primary/90 transition-all active:scale-95"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <User className="h-5 w-5" />}
                        Initialize Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Identity Badge */}
                      <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[8px] uppercase text-gray-500 font-black tracking-widest">Current Role</p>
                          <p className="text-xl font-outfit font-extrabold text-primary flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            {Object.keys(userRole || {})[0] || "Unknown"}
                          </p>
                        </div>
                        <div className="text-right space-y-2">
                          <div>
                            <p className="text-[8px] uppercase text-gray-500 font-black tracking-widest">Identity</p>
                            <p className="text-[10px] font-mono text-gray-400">{wallet.publicKey?.toBase58().slice(0, 8)}...</p>
                          </div>
                          <Button
                            onClick={handleCloseRbacProfile}
                            disabled={loading}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[8px] uppercase font-black text-red-500/50 hover:text-red-500 hover:bg-red-500/10 border border-red-500/10"
                          >
                            Reset Identification
                          </Button>
                        </div>
                      </div>

                      {/* Permission gates */}
                      <div className="grid grid-cols-1 gap-3">
                        {/* Editor Gate */}
                        <div className="p-4 rounded-xl border border-white/10 bg-black/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-cyan-400" />
                              <Label className="text-[10px] uppercase font-black text-cyan-400 tracking-widest">Editor Gate</Label>
                            </div>
                            <span className="text-[8px] text-gray-600 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">Editor + Admin</span>
                          </div>
                          <p className="text-[10px] text-gray-500">On-chain constraint rejects Viewer roles automatically.</p>
                          <Button
                            onClick={handleExecuteEditorInstruction}
                            disabled={loading}
                            variant="outline"
                            className="w-full h-11 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            Execute Editor Instruction
                          </Button>
                        </div>

                        {/* Admin Gate */}
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              <Label className="text-[10px] uppercase font-black text-primary tracking-widest">Admin Gate</Label>
                            </div>
                            <span className="text-[8px] text-gray-600 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">Admin only</span>
                          </div>
                          <p className="text-[10px] text-gray-500">Will fail unless your on-chain role is Admin. Try it with Editor to see rejection.</p>
                          <Button
                            onClick={handleExecuteAdminInstruction}
                            disabled={loading}
                            className="w-full h-11 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Execute Admin Instruction
                          </Button>
                        </div>
                      </div>

                      {/* Re-assign role */}
                      <div className="border-t border-white/5 pt-4 space-y-3">
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Re-Assign Role</p>
                        <p className="text-[10px] text-gray-600">Re-initialize the profile with a different role to test each permission level.</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Viewer', 'Editor', 'Admin'] as const).map((r, i) => (
                            <Button
                              key={r}
                              onClick={() => setSelectedRbacRole(i)}
                              variant={selectedRbacRole === i ? "default" : "outline"}
                              size="sm"
                              className="h-9 text-[10px] font-bold uppercase tracking-widest"
                            >
                              {r}
                            </Button>
                          ))}
                        </div>
                        <Button
                          onClick={handleInitializeRbacProfile}
                          disabled={loading}
                          variant="outline"
                          className="w-full h-11 border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                          Re-Initialize as {['Viewer', 'Editor', 'Admin'][selectedRbacRole]}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pattern.slug === "api-key-management" && (
              <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-outfit font-black uppercase tracking-tighter text-lg text-white">
                    API Key Registry
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${apiKeyRecord?.isActive ? 'bg-green-500' : (activeApiKey ? 'bg-red-500' : 'bg-primary')}`}></span>
                    Status: {activeApiKey ? (apiKeyRecord?.isActive ? "Active" : "Revoked") : "No Key"}
                  </div>
                </div>

                <div className="space-y-6">
                  {!activeApiKey ? (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-400">Generate a new API key. We will hash it and store only the hash on-chain in your PDA.</p>
                      <Button
                        onClick={handleInitializeApiKey}
                        disabled={loading}
                        className="w-full h-14 gap-3 font-outfit font-black uppercase border-b-4 tracking-[0.2em] text-sm bg-primary border-primary-foreground/20 hover:bg-primary/90 transition-all active:scale-95"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                        Generate & Register
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {generatedKey && apiKeyRecord?.isActive && (
                        <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 space-y-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-green-400" />
                            <Label className="text-[10px] uppercase font-black text-green-400 tracking-widest">Secret Key (Save This!)</Label>
                          </div>
                          <p className="text-[10px] text-gray-500">This client-side raw key will not be shown again.</p>
                          <p className="font-mono text-sm text-white break-all">{generatedKey}</p>
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                        <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">On-Chain Registry Info</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono text-gray-400">
                            <span>Owner: </span> <span className="text-white">{apiKeyRecord?.owner.toBase58().slice(0, 8)}...</span>
                          </div>
                          <div className="flex justify-between text-xs font-mono text-gray-400 break-all">
                            <span>Key Hash: </span> <span className="text-white">[{apiKeyRecord?.keyHash?.slice(0, 8).join(",")},...]</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={handleRevokeApiKey}
                          disabled={loading || !apiKeyRecord?.isActive}
                          variant="outline"
                          className="w-full h-12 border-red-500/20 text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                        >
                          {loading && apiKeyRecord?.isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                          {apiKeyRecord?.isActive ? "Revoke Key" : "Already Revoked"}
                        </Button>
                        <Button
                          onClick={() => handleCloseApiKey(true)}
                          disabled={loading}
                          variant="destructive"
                          className="h-12 border-b-4 border-red-900/50 uppercase font-black tracking-widest text-[10px]"
                        >
                          Erase Registry
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pattern.slug === "idempotency-key" && (
              <div className="space-y-6">
                <Card className="bg-black/40 border-white/10 overflow-hidden rounded-2xl shadow-2xl">
                  {/* Image on Top */}
                  <div className="relative aspect-video bg-black overflow-hidden group">
                    <img
                      src="/idempotency-demo.png"
                      alt="Idempotency Demo"
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000"
                    />

                    {/* Live Log Terminal Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 h-24 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 p-3 overflow-hidden flex flex-col pointer-events-none border-l-4 border-l-primary">
                      <div className="flex items-center gap-2 mb-1">
                        <Terminal className="h-3 w-3 text-primary animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">On-Chain Activity</span>
                      </div>
                      <div className="flex-1 font-mono text-[9px] text-gray-300 space-y-1 overflow-y-auto scrollbar-hide">
                        {idemLogs.length === 0 ? (
                          <p className="text-gray-500 italic opacity-50">Waiting for interaction...</p>
                        ) : (
                          idemLogs.map((log, i) => (
                            <p key={i} className={i === 0 ? "text-primary" : "opacity-70"}>{log}</p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interaction Section */}
                  <div className="p-6 space-y-6 bg-white/5">
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Like Button with Count */}
                        <Button
                          onClick={() => handleProcessIdempotentAction("1337")}
                          disabled={loading}
                          className={`h-16 gap-3 font-outfit font-black uppercase border-b-4 tracking-widest text-lg transition-all active:scale-95 ${idempotencyRecord ? 'bg-red-500 border-red-900/50 hover:bg-red-600' : 'bg-primary border-primary-foreground/20 hover:bg-primary/90'}`}
                        >
                          <Heart className={`h-6 w-6 ${idempotencyRecord ? 'fill-white' : ''}`} />
                          {idempotencyRecord ? "Like (1)" : "Like (0)"}
                        </Button>

                        {/* Unlike Button */}
                        <Button
                          onClick={() => handleUnlikeAction()}
                          disabled={loading || !idempotencyRecord}
                          variant="outline"
                          className="h-16 gap-3 font-outfit font-black uppercase tracking-widest text-lg border-white/10 hover:bg-white/10 hover:text-red-400 transition-all active:scale-95"
                        >
                          <HeartOff className="h-6 w-6" />
                          Unlike
                        </Button>
                      </div>

                      {idempotencyRecord && (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex flex-col gap-2">
                          <p className="text-[10px] uppercase font-black text-green-500 tracking-widest">Active On-Chain Tracker</p>
                          <div className="flex justify-between text-xs font-mono text-gray-400">
                            <span>PDA Status:</span>
                            <span className="text-white">INITIALIZED (ID: 1337)</span>
                          </div>
                          <div className="flex justify-between text-xs font-mono text-gray-400">
                            <span>Slot Hash:</span>
                            <span className="text-white truncate ml-4 font-bold">{idempotencyRecord.processedAt.toString()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                      <p className="text-[11px] text-gray-300 leading-relaxed italic">
                        <span className="font-bold text-white not-italic">Pro Tip:</span> Click "Like" several times. Notice how the count stays (1) because the Solana smart contract rejects duplicates in the active logs above. Click "Unlike" to reset.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {pattern.slug === "subscription-billing" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pricing Tiers */}
                  <Card className="bg-black/40 border-white/10 overflow-hidden rounded-2xl">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Tier Selection</CardTitle>
                      <CardDescription className="text-[10px]">Pick a plan to initialize your on-chain subscription.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className={`p-4 rounded-xl border-2 transition-all ${isSubscribed && subTimeLeft > 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-primary/5 border-primary/20 hover:border-primary/40'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="font-bold text-white uppercase text-xs">Standard Node</span>
                          </div>
                          <span className="text-xs font-mono text-gray-500">Free Tier</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-4">Baseline access to public resources. No on-chain PDA required.</p>
                        <Button
                          variant="outline"
                          disabled={true}
                          className="w-full h-10 border-white/10 text-gray-500 text-[10px] font-black uppercase tracking-widest"
                        >
                          Default Access
                        </Button>
                      </div>

                      <div className={`p-4 rounded-xl border-2 transition-all ${isSubscribed && subTimeLeft > 0 ? 'bg-primary/10 border-primary animate-pulse' : 'bg-white/5 border-white/10 hover:border-primary/40'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Rocket className="h-4 w-4 text-primary" />
                            <span className="font-bold text-white uppercase text-xs">Devnet Pro</span>
                          </div>
                          <span className="text-xs font-mono text-primary font-bold">1 min sub</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-4">Unlocks the protected vault through on-chain timestamp verification.</p>
                        <Button
                          onClick={() => handleBuySubscription(60)}
                          disabled={loading}
                          className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Coins className="h-3 w-3 mr-2" />}
                          Buy 60s Access
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Protected Vault */}
                  <Card className="bg-black/40 border-white/10 overflow-hidden rounded-2xl flex flex-col">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Protected Vault</CardTitle>
                      <CardDescription className="text-[10px]">Resource gate enforced by block timestamps.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                      {subTimeLeft > 0 ? (
                        <>
                          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30 text-green-500 shadow-2xl shadow-green-500/20">
                            <Unlock className="h-10 w-10" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-white uppercase tracking-tighter">Access Granted</h4>
                            <div className="flex items-center justify-center gap-2 font-mono text-sm text-green-400">
                              <Clock className="h-4 w-4" />
                              <span>{subTimeLeft}s Remaining</span>
                            </div>
                          </div>
                          <Button
                            onClick={handleVerifySubscription}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 w-full h-12 uppercase font-black tracking-widest text-xs"
                          >
                            On-Chain Verification
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 text-red-500 opacity-50">
                            <Lock className="h-10 w-10" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-gray-500 uppercase tracking-tighter">Vault Locked</h4>
                            <p className="text-[10px] text-gray-600 max-w-[180px]">Initialize a subscription to unlock this on-chain resource.</p>
                          </div>
                          <Button
                            disabled={true}
                            variant="outline"
                            className="w-full h-12 border-white/5 text-gray-700 uppercase font-black tracking-widest text-xs"
                          >
                            Check Expiry
                          </Button>
                        </>
                      )}
                    </CardContent>

                    {isSubscribed && (
                      <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Active PDA found</span>
                          <span className="text-[10px] font-mono text-white/50">{subscriptionRecord?.expiryTimestamp?.toString()}</span>
                        </div>
                        <Button
                          onClick={handleCancelSubscription}
                          disabled={loading}
                          variant="ghost"
                          className="h-8 text-[8px] font-black uppercase tracking-tighter text-red-500/50 hover:text-red-500 hover:bg-red-500/5"
                        >
                          Cancel Sub
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* Network Resilience Section */}
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-3 w-3 text-yellow-500/50" />
                <p className="text-[10px] uppercase font-black tracking-widest text-yellow-500/50">Network Status Helper</p>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                If you encounter a <span className="text-white font-bold italic">"429 Too Many Requests"</span> error, it means the public Devnet faucet is congested.
                Please wait 60 seconds or use the <a href="https://faucet.solana.com" target="_blank" className="text-primary hover:underline">Official Web Faucet</a>.
              </p>
            </div>

            {pattern.slug === "on-chain-job-queue" && (
              <div className="space-y-6">
                {/* 1. Producer Panel */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-white">Producer Panel</h3>
                      <p className="text-xs text-gray-400 font-medium">Schedule asynchronous on-chain tasks.</p>
                    </div>
                    <div className="bg-primary/20 px-3 py-1 rounded-full text-[10px] font-black uppercase text-primary border border-primary/20">
                      Asnyc Requestor
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Bounty Amount (SOL)</Label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary" />
                        <Input id="jobBounty" type="number" defaultValue="0.1" className="bg-black/40 border-white/10 h-11 pl-8 text-xs font-mono" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Execution Delay (Seconds)</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary" />
                        <Input id="jobDelay" type="number" defaultValue="30" className="bg-black/40 border-white/10 h-11 pl-8 text-xs font-mono" />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          const bounty = parseFloat((document.getElementById('jobBounty') as HTMLInputElement).value || "0.1")
                          const delay = parseInt((document.getElementById('jobDelay') as HTMLInputElement).value || "30")
                          handlePostScheduledJob(bounty, delay)
                        }}
                        disabled={loading}
                        className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Schedule Job
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* 2. Decentralized Queue (The Stats/Radar) */}
                  <div className="md:col-span-4 space-y-4">
                    <Card className="bg-black/40 border-white/10 overflow-hidden rounded-2xl h-full">
                      <CardHeader className="bg-white/5 border-b border-white/5 p-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Queue Radar
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Pending</span>
                          <span className="text-sm font-black text-white">{jobAccounts.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-xl border border-primary/20">
                          <span className="text-[10px] font-bold text-primary uppercase">Bot Profit</span>
                          <span className="text-sm font-black text-white">{keeperProfit.toFixed(3)} SOL</span>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase text-gray-500">Keeper Bot Status</span>
                            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase ${isBotActive ? 'text-green-500' : 'text-red-500'}`}>
                              <Circle className={`h-2 w-2 fill-current ${isBotActive && 'animate-pulse'}`} />
                              {isBotActive ? 'Active' : 'Offline'}
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              setIsBotActive(!isBotActive)
                              if (!isBotActive) setCrankLogs(["[SYSTEM] Keeper bot engine starting... scan sequence initiated.", ...crankLogs])
                            }}
                            className={`w-full h-12 uppercase font-black tracking-widest text-xs rounded-xl transition-all ${isBotActive ? 'bg-red-500/10 border-2 border-red-500 text-red-500 hover:bg-red-500/20' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20'}`}
                          >
                            {isBotActive ? 'Deactivate Bot' : 'Activate Keeper Bot'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 3. The Crank Hub & Automated Logs */}
                  <div className="md:col-span-8 flex flex-col gap-4">
                    <div className="bg-black border border-white/10 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[300px]">
                      <div className="bg-white/5 border-b border-white/5 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Crank Sequence Log</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                      </div>
                      <div className="flex-1 p-4 font-mono text-[10px] space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar">
                        {crankLogs.length === 0 ? (
                          <p className="text-gray-600 italic">Waiting for bot activation or job scheduling...</p>
                        ) : (
                          crankLogs.map((log, i) => (
                            <p key={i} className={`${log.includes('SUCCESS') ? 'text-green-400' : log.includes('MATCH') ? 'text-primary' : 'text-gray-400'}`}>
                              {log}
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend/Pattern Explanation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-black uppercase text-white">The Producer</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Schedules an <span className="text-white italic">asynchronous task</span> on-chain. The SOL bounty is locked in a PDA and cannot be released until the trigger time passes.
                    </p>
                  </div>
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket className="h-3 w-3 text-green-500" />
                      <span className="text-[10px] font-black uppercase text-white">The Keeper (Crank)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      A decentralized bot (simulated by your browser) that maintains system state. It scans for ready jobs and <span className="text-white italic">"cranks"</span> the instruction to earn the bounty.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pattern.slug === "leaderboard-ranking" && (
              <div className="space-y-8">
                {/* 1. Global Ranking Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-black/40 to-transparent p-8 rounded-3xl border border-white/10 shadow-2xl">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-2 text-center md:text-left">
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Global Arena</h3>
                      </div>
                      <p className="text-sm text-gray-400 font-medium max-w-md">
                        Compete for the top spot. Rankings are immutable and secured by the Solana blockchain.
                      </p>
                    </div>

                    <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                      <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Total Contenders</span>
                      <span className="text-4xl font-black text-white">{leaderboardEntries.length}</span>
                    </div>
                  </div>

                  {/* Decorative background glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* 2. Leaderboard Table */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="flex justify-between items-center px-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">The Top 10 Elite</h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase">
                        <Zap className="h-3 w-3" />
                        Live Updates
                      </div>
                    </div>

                    <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                      <div className="grid grid-cols-12 p-4 bg-white/5 border-b border-white/5 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                        <div className="col-span-2 text-center">Rank</div>
                        <div className="col-span-6">Contender</div>
                        <div className="col-span-4 text-right">Score</div>
                      </div>

                      <div className="divide-y divide-white/5">
                        {leaderboardEntries.length === 0 ? (
                          <div className="p-20 flex flex-col items-center justify-center space-y-4 opacity-50 text-center">
                            <ShieldAlert className="h-12 w-12 text-gray-500" />
                            <div className="space-y-1">
                              <p className="text-sm font-black uppercase text-white">Arena Empty</p>
                              <p className="text-[10px] text-gray-400">Be the first to dominate the rankings.</p>
                            </div>
                            <Button
                              onClick={handleInitializeLeaderboard}
                              disabled={loading}
                              className="bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] h-9 px-6 rounded-full"
                            >
                              Initialize Arena Settings
                            </Button>
                          </div>
                        ) : (
                          leaderboardEntries.map((entry, index) => {
                            const isMe = entry.player.toString() === wallet.publicKey?.toString()
                            return (
                              <div key={index} className={`grid grid-cols-12 p-5 items-center transition-all hover:bg-white/5 ${isMe && 'bg-primary/10 border-l-4 border-primary'}`}>
                                <div className="col-span-2 flex justify-center">
                                  {index === 0 ? (
                                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black text-sm shadow-lg shadow-yellow-500/40">1</div>
                                  ) : index === 1 ? (
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-black font-black text-sm">2</div>
                                  ) : index === 2 ? (
                                    <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center text-black font-black text-sm">3</div>
                                  ) : (
                                    <span className="text-gray-500 font-black text-sm">{index + 1}</span>
                                  )}
                                </div>
                                <div className="col-span-6 flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg ${isMe ? 'bg-primary' : 'bg-white/10'} flex items-center justify-center`}>
                                    <User className={`h-4 w-4 ${isMe ? 'text-white' : 'text-gray-400'}`} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-mono text-white tracking-tighter">
                                      {entry.player.toString().slice(0, 4)}...{entry.player.toString().slice(-4)}
                                    </p>
                                    {isMe && <span className="text-[8px] font-black uppercase text-primary">Your Entry</span>}
                                  </div>
                                </div>
                                <div className="col-span-4 text-right">
                                  <p className="text-lg font-black text-white tracking-tighter">{entry.score.toNumber()}</p>
                                  <p className="text-[8px] uppercase font-bold text-gray-500">Points</p>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Competitive Actions */}
                  <div className="md:col-span-4 space-y-6">
                    <Card className="bg-black/60 border-primary/20 rounded-3xl overflow-hidden shadow-2xl relative">
                      <div className="absolute top-0 right-0 p-3">
                        <Rocket className="h-12 w-12 text-primary opacity-10 -rotate-12" />
                      </div>
                      <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Join The Battle</CardTitle>
                        <CardDescription className="text-xs text-gray-400 font-medium">Submit your latest performance to the chain.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Simulation Score</Label>
                          <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input
                              id="scoreInput"
                              type="number"
                              defaultValue={Math.floor(Math.random() * 5000 + 1000)}
                              className="bg-black/40 border-white/10 h-14 pl-10 text-xl font-black text-white tracking-tighter"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            const score = parseInt((document.getElementById('scoreInput') as HTMLInputElement).value || "0")
                            handleSubmitScore(score)
                          }}
                          disabled={loading}
                          className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Broadcast Score"}
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">The Mechanics</h5>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-primary">1</span>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            <span className="text-white font-bold">Immutable Logic</span>: The sorting and truncation (Top 10) happens <span className="text-primary italic">on-chain</span>, making it impossible to cheat rankings.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-primary">2</span>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            <span className="text-white font-bold">O(1) Access</span>: We use a single PDA for the entire leaderboard, ensuring constant-time data retrieval for all users.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {pattern.slug === "order-matching-engine" && (
              <div className="space-y-8">
                {/* 1. Market Header */}
                <div className="bg-gradient-to-r from-black/40 to-primary/10 p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
                      <ArrowRightLeft className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter text-white">SOL / USDC Arena</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Limit Order Book Engine</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Market Status</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-black text-white uppercase tracking-tighter">Live & Matching</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleInitializeOrderBook}
                      variant="outline"
                      className="border-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl"
                    >
                      Reset Book
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* 2. The Order Book */}
                  <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Atomic Order Flow</h4>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500">
                        <span className="flex items-center gap-1"><Circle className="h-2 w-2 fill-red-500 text-red-500" /> Asks</span>
                        <span className="flex items-center gap-1"><Circle className="h-2 w-2 fill-green-500 text-green-500" /> Bids</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* ASKS (Sells) */}
                      <Card className="bg-black/60 border-red-500/20 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-4 bg-red-500/5 border-b border-red-500/10 text-[10px] font-black uppercase text-red-500 tracking-widest text-center">
                          Supply (Asks)
                        </div>
                        <div className="p-2 min-h-[300px]">
                          <div className="grid grid-cols-3 p-2 text-[8px] font-black uppercase text-gray-600 tracking-widest border-b border-white/5 mb-2 text-center">
                            <div>Price</div>
                            <div>Size</div>
                            <div>Depth</div>
                          </div>
                          <div className="space-y-1">
                            {orderBook.asks.length === 0 ? (
                              <div className="h-64 flex items-center justify-center opacity-20 italic text-[10px] text-gray-400">Empty</div>
                            ) : (
                              [...orderBook.asks].sort((a, b) => b.price.toNumber() - a.price.toNumber()).map((ask, i) => {
                                const maxQty = Math.max(...orderBook.asks.map(a => a.quantity.toNumber()), 1);
                                const depth = (ask.quantity.toNumber() / maxQty) * 100;
                                return (
                                  <div key={i} className="relative group overflow-hidden rounded-md">
                                    <div className="absolute inset-0 bg-red-500/10 origin-right transition-all group-hover:bg-red-500/20" style={{ width: `${depth}%`, left: 'auto', right: 0 }} />
                                    <div className="relative grid grid-cols-3 p-2 text-[10px] font-mono font-bold text-center">
                                      <div className="text-red-400">{ask.price.toNumber()}</div>
                                      <div className="text-white">{ask.quantity.toNumber()}</div>
                                      <div className="text-gray-600">{depth.toFixed(0)}%</div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </Card>

                      {/* BIDS (Buys) */}
                      <Card className="bg-black/60 border-green-500/20 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-4 bg-green-500/5 border-b border-green-500/10 text-[10px] font-black uppercase text-green-500 tracking-widest text-center">
                          Demand (Bids)
                        </div>
                        <div className="p-2 min-h-[300px]">
                          <div className="grid grid-cols-3 p-2 text-[8px] font-black uppercase text-gray-600 tracking-widest border-b border-white/5 mb-2 text-center">
                            <div>Price</div>
                            <div>Size</div>
                            <div>Depth</div>
                          </div>
                          <div className="space-y-1">
                            {orderBook.bids.length === 0 ? (
                              <div className="h-64 flex items-center justify-center opacity-20 italic text-[10px] text-gray-400">Empty</div>
                            ) : (
                              [...orderBook.bids].sort((a, b) => b.price.toNumber() - a.price.toNumber()).map((bid, i) => {
                                const maxQty = Math.max(...orderBook.bids.map(b => b.quantity.toNumber()), 1);
                                const depth = (bid.quantity.toNumber() / maxQty) * 100;
                                return (
                                  <div key={i} className="relative group overflow-hidden rounded-md">
                                    <div className="absolute inset-0 bg-green-500/10 origin-left transition-all group-hover:bg-green-500/20" style={{ width: `${depth}%` }} />
                                    <div className="relative grid grid-cols-3 p-2 text-[10px] font-mono font-bold text-center">
                                      <div className="text-green-400">{bid.price.toNumber()}</div>
                                      <div className="text-white">{bid.quantity.toNumber()}</div>
                                      <div className="text-gray-600">{depth.toFixed(0)}%</div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* 3. Trade Execution Form */}
                  <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-black/60 border-white/10 rounded-3xl overflow-hidden p-6 shadow-2xl">
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-white mb-6">Execution Terminal</CardTitle>

                      <div className="space-y-6">
                        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                          <Button
                            onClick={() => setOrderSide(0)}
                            className={`flex-1 h-12 font-black uppercase text-xs rounded-xl transition-all ${orderSide === 0
                              ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                              : "bg-transparent text-gray-500 hover:bg-white/5"
                              }`}
                          >
                            Buy
                          </Button>
                          <Button
                            onClick={() => setOrderSide(1)}
                            className={`flex-1 h-12 font-black uppercase text-xs rounded-xl transition-all ${orderSide === 1
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                              : "bg-transparent text-gray-500 hover:bg-white/5"
                              }`}
                          >
                            Sell
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Limit Price</Label>
                          <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input id="orderPrice" type="number" defaultValue="100" className="bg-black border-white/10 h-14 pl-10 text-xl font-black text-white tracking-tighter" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Quantity</Label>
                          <div className="relative">
                            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input id="orderQty" type="number" defaultValue="10" className="bg-black border-white/10 h-14 pl-10 text-xl font-black text-white tracking-tighter" />
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            const price = parseInt((document.getElementById('orderPrice') as HTMLInputElement).value || "0")
                            const qty = parseInt((document.getElementById('orderQty') as HTMLInputElement).value || "0")
                            handlePlaceOrder(orderSide, price, qty)
                          }}
                          disabled={loading}
                          className={`w-full h-16 text-white font-black uppercase tracking-[0.2em] text-sm shadow-lg rounded-2xl transition-all hover:scale-[1.02] ${orderSide === 0
                            ? "bg-green-600 hover:bg-green-500 shadow-green-500/20"
                            : "bg-red-600 hover:bg-red-500 shadow-red-500/20"
                            }`}
                        >
                          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `Broadcast ${orderSide === 0 ? 'Buy' : 'Sell'} Order`}
                        </Button>
                      </div>
                    </Card>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Trading Constraints</h5>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-black text-primary">1</span>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            <span className="text-white font-bold">Atomic Logic</span>: Matches are computed in a single transaction. If the spread is crossed, the order executes instantly.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-black text-primary">2</span>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            <span className="text-white font-bold">State Pricing</span>: Order book accounts are rent-exempt but limited in size to maintain O(N) matching complexity within gas limits.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pattern.slug === "auction-engine" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-outfit font-black uppercase tracking-tighter text-2xl text-white">Vickrey Auction Room</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="h-3 w-3 text-primary animate-pulse" />
                      Live Bidding Session
                    </p>
                  </div>
                  {auctionAccount ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 py-1 px-4 uppercase font-black tracking-widest animate-pulse">
                      Active Auction
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20 py-1 px-4 uppercase font-black tracking-widest">
                      No Active Items
                    </Badge>
                  )}
                </div>

                {!auctionAccount ? (
                  <div className="bg-black/40 rounded-3xl border border-white/5 p-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                      <Gavel className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-white font-black uppercase tracking-tight text-xl">Initialize New Auction</h4>
                      <p className="text-gray-500 text-sm max-w-xs mx-auto">Set a starting price to launch an item into the decentralized bidding pool.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={startPrice}
                          onChange={(e) => setStartPrice(e.target.value)}
                          className="bg-white/5 border-white/10 h-14 pl-12 font-mono text-white text-lg rounded-2xl focus:ring-primary/50"
                        />
                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600 uppercase">SOL</div>
                      </div>
                      <Button
                        onClick={handleInitializeAuction}
                        disabled={loading}
                        className="h-14 px-8 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start Listing"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7 bg-white/5 rounded-3xl border border-white/10 p-8 space-y-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Trophy className="h-32 w-32 text-white" />
                      </div>

                      <div className="space-y-6 relative">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-[0.3em] text-gray-500">Current Highest Bid</Label>
                          <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-white tracking-tighter">
                              {(auctionAccount.highestBid.toNumber() / LAMPORTS_PER_SOL).toFixed(2)}
                            </span>
                            <span className="text-xl font-bold text-primary uppercase">SOL</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest flex items-center gap-2">
                              <User className="h-3 w-3" /> Seller
                            </p>
                            <p className="font-mono text-xs text-white truncate">{auctionAccount.seller.toString()}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                            <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest flex items-center gap-2">
                              <Trophy className="h-3 w-3 text-yellow-500" /> Top Bidder
                            </p>
                            <p className="font-mono text-xs text-white truncate">
                              {auctionAccount.highestBidder.toString() === SystemProgram.programId.toString() ? "No bids yet" : auctionAccount.highestBidder.toString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-5 flex flex-col gap-6">
                      <div className="bg-primary/5 rounded-3xl border border-primary/20 p-8 flex-1 space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70">Increment Bid</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              placeholder="e.g. 2.5"
                              className="bg-black/40 border-primary/20 h-16 pl-6 text-xl font-black text-white rounded-2xl placeholder:text-gray-600"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-primary uppercase">SOL</div>
                          </div>
                        </div>
                        <Button
                          onClick={handlePlaceBid}
                          disabled={loading || !bidAmount}
                          className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-95 group"
                        >
                          {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              Place Bid
                              <ArrowRightLeft className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </Button>
                        <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest leading-relaxed">
                          Min Bid: <span className="text-white font-bold">{(auctionAccount.highestBid.toNumber() / LAMPORTS_PER_SOL + 0.001).toFixed(3)} SOL</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {pattern.slug === "circuit-breaker" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-outfit font-black uppercase tracking-tighter text-2xl text-white">Emergency Control Panel</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      On-Chain Guard System
                    </p>
                  </div>
                  {breakerAccount ? (
                    <Badge variant="outline" className={`${breakerAccount.isPaused ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'} py-1 px-4 uppercase font-black tracking-widest animate-pulse`}>
                      {breakerAccount.isPaused ? 'CIRCUIT OPEN' : 'CIRCUIT CLOSED'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20 py-1 px-4 uppercase font-black tracking-widest">
                      OFFLINE
                    </Badge>
                  )}
                </div>

                {!breakerAccount ? (
                  <div className="bg-black/40 rounded-3xl border border-white/5 p-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                      <ShieldAlert className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-white font-black uppercase tracking-tight text-xl">Deploy Security Guard</h4>
                      <p className="text-gray-500 text-sm max-w-xs mx-auto">Initialize the circuit breaker state to protect your sensitive on-chain operations.</p>
                    </div>
                    <Button
                      onClick={handleInitializeBreaker}
                      disabled={loading}
                      className="h-14 px-12 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Bootstrap System"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-8 space-y-8">
                      <div className={`p-8 rounded-3xl border transition-all ${breakerAccount.isPaused ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'} relative overflow-hidden`}>
                        <div className="absolute -top-10 -right-10 opacity-5">
                          {breakerAccount.isPaused ? <ZapOff className="h-40 w-40 text-red-500" /> : <Zap className="h-40 w-40 text-green-500" />}
                        </div>

                        <div className="space-y-6 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-black tracking-widest text-gray-500">Service Status</Label>
                              <h4 className={`text-4xl font-black uppercase tracking-tight ${breakerAccount.isPaused ? 'text-red-500' : 'text-green-500'}`}>
                                {breakerAccount.isPaused ? 'Halted' : 'Operational'}
                              </h4>
                            </div>
                            <Button
                              onClick={handleToggleBreaker}
                              disabled={loading}
                              variant="outline"
                              className={`h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-2 transition-all ${breakerAccount.isPaused ? 'border-green-500/40 text-green-500 hover:bg-green-500/10' : 'border-red-500/40 text-red-500 hover:bg-red-500/10'}`}
                            >
                              {breakerAccount.isPaused ? 'Resume Service' : 'Trigger Emergency Cutoff'}
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                              <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Authority</p>
                              <p className="font-mono text-[10px] text-white truncate">{breakerAccount.authority.toString()}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                              <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">State Storage</p>
                              <p className="font-mono text-[10px] text-white">Circuit Account Active</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-6">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-primary" />
                          <h4 className="text-white font-black uppercase tracking-tight text-lg">Protected Instruction Test</h4>
                        </div>
                        <p className="text-xs text-gray-400 max-w-xl">
                          This button triggers a real on-chain instruction that is internally gated by the circuit state.
                          If the circuit is <span className="text-red-500 font-bold">OPEN</span>, the transaction will revert before any logic executes.
                        </p>
                        <Button
                          onClick={handleExecuteBreakerAction}
                          disabled={loading}
                          className="h-14 px-12 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl border border-white/10"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Attempt Sensitive Action"}
                        </Button>
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-6">
                      <div className="bg-black/60 rounded-3xl border border-white/5 p-6 space-y-6">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-primary">Security Logs</h5>
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
                            <p className="text-[10px] text-gray-400 font-mono"><span className="text-gray-600">[INFO]</span> Circuit initialized as CLOSED.</p>
                          </div>
                          {breakerAccount.isPaused && (
                            <div className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-1 animate-pulse" />
                              <p className="text-[10px] text-red-400 font-mono"><span className="text-red-900">[WARN]</span> Manual override active. Service halted.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Emergency Protocol</h5>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Lock className="h-3 w-3 text-primary mt-0.5" />
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                              <span className="text-white font-bold">In-Program Gate</span>: The is_paused flag is checked atomically at the start of instructions.
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <Key className="h-3 w-3 text-primary mt-0.5" />
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                              <span className="text-white font-bold">Admin Only</span>: Only the authority that initialized the breaker can toggle the state.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {pattern.slug === "leader-election" && (
              <div className="space-y-8">
                {/* 1. Governance Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/40 via-black/40 to-transparent p-8 rounded-3xl border border-white/10 shadow-2xl">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-3 text-center md:text-left">
                      <div className="flex items-center gap-3 justify-center md:justify-start">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                          <Gavel className="h-6 w-6 text-indigo-400" />
                        </div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Electoral Hub</h3>
                      </div>
                      <p className="text-sm text-gray-400 font-medium max-w-lg">
                        Decentralized leadership election through on-chain reputation weighting. No single point of failure.
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex flex-col items-center p-5 bg-black/60 rounded-3xl border border-white/10 backdrop-blur-xl min-w-[140px]">
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-2">Epoch End</span>
                        <span className="text-2xl font-black text-white font-mono tracking-tighter">
                          {electionState ? (Math.max(0, electionState.epochEnd - Math.floor(Date.now() / 1000))) : "0"}s
                        </span>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all duration-1000"
                            style={{
                              width: electionState
                                ? `${(1 - (electionState.epochEnd - Math.floor(Date.now() / 1000)) / electionState.epochDuration) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleResetElection}
                        variant="outline"
                        size="icon"
                        className="w-12 h-12 rounded-2xl border-white/10 text-gray-500 hover:text-white"
                      >
                        <Zap className="h-5 w-5 rotate-180 opacity-50" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* 2. Active Leader & Candidates */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Active Leader Profile */}
                    <Card className="bg-gradient-to-br from-indigo-600/20 via-black/40 to-black/60 border-indigo-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                        <ShieldCheck className="h-32 w-32 text-indigo-400 rotate-12" />
                      </div>

                      <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center gap-8 relative z-10">
                        <div className="relative group">
                          <div className="w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center border-4 border-black shadow-2xl transform transition-all group-hover:rotate-6 group-hover:scale-110">
                            <User className="h-12 w-12 text-white" />
                          </div>
                          <div className="absolute -bottom-3 -right-3 bg-yellow-500 text-black text-[11px] font-black px-4 py-1.5 rounded-2xl uppercase border-4 border-black animate-bounce shadow-xl">
                            {electionState?.activeLeader !== prevLeader && prevLeader !== null ? "Newly Elected" : "Active"}
                          </div>
                        </div>

                        <div className="space-y-4 max-w-md">
                          <div className="flex flex-col items-center gap-2">
                            <div className={`px-4 py-1.5 border rounded-full ${electionState?.activeLeader !== prevLeader && prevLeader !== null ? 'bg-green-500/20 border-green-500/40' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${electionState?.activeLeader !== prevLeader && prevLeader !== null ? 'text-green-400' : 'text-indigo-400'}`}>
                                {electionState?.activeLeader !== prevLeader && prevLeader !== null ? 'Authority Reassigned' : 'On-Chain Authority'}
                              </span>
                            </div>
                            <h5 className="text-xl sm:text-3xl font-black text-white tracking-widest font-mono group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all">
                              {!electionState ? (
                                <span className="text-gray-600 italic">OFFLINE</span>
                              ) : electionState.activeLeader === "11111111111111111111111111111111" ? (
                                <span className="text-orange-500">VACANT</span>
                              ) : (
                                <span className="text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                  {electionState.activeLeader.slice(0, 12)}...{electionState.activeLeader.slice(-8)}
                                </span>
                              )}
                            </h5>
                          </div>

                          <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed px-4">
                            {electionState?.activeLeader !== "11111111111111111111111111111111"
                              ? "The sovereign referee currently holding verifiable protocol orchestration rights."
                              : "The network is awaiting the next electoral resolution to assign authority."}
                          </p>
                        </div>

                        <Button
                          onClick={handleResolveElection}
                          disabled={loading || (electionState ? Math.floor(Date.now() / 1000) < electionState.epochEnd : true)}
                          className="w-full sm:w-auto min-w-[240px] h-16 bg-white hover:bg-indigo-50 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 border-4 border-black/5"
                        >
                          <Zap className="h-4 w-4" />
                          Resolve Election
                        </Button>
                      </CardContent>
                    </Card>

                    {/* The Ballot Box */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Live Electoral Pool</h4>
                        <div className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-2">
                          <Zap className="h-3 w-3" /> Consensus Active
                        </div>
                      </div>

                      <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        {candidates.length === 0 ? (
                          <div className="p-20 text-center space-y-4 opacity-50">
                            <ShieldAlert className="h-10 w-10 mx-auto text-gray-600" />
                            <p className="text-[10px] font-black uppercase text-white tracking-widest">No candidates in the pool</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {candidates.map((cand, idx) => {
                              const totalVotes = candidates.reduce((acc, c) => acc + c.votes.toNumber(), 0);
                              const percentage = totalVotes > 0 ? (cand.votes.toNumber() / totalVotes) * 100 : 0;
                              return (
                                <div key={idx} className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-all hover:bg-white/5 border-b border-white/5 last:border-none">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 bg-white/5 flex items-center justify-center rounded-xl font-black text-gray-400 shrink-0 border border-white/10">
                                      {idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-mono font-bold text-white leading-none truncate pr-2">
                                        {cand.pubkey.toString().slice(0, 10)}...{cand.pubkey.toString().slice(-6)}
                                      </p>
                                      <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">Candidate Address</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-none border-white/5 pt-4 sm:pt-0">
                                    <div className="text-left sm:text-right">
                                      <p className="text-sm font-black text-white leading-none">{cand.votes.toNumber()}</p>
                                      <span className="text-[9px] font-black uppercase text-indigo-400 tracking-tighter">Votes</span>
                                    </div>
                                    <div className="flex-1 sm:flex-initial flex items-center gap-4">
                                      <div className="hidden xs:block w-16 md:w-24 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
                                        <div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }} />
                                      </div>
                                      <Button
                                        onClick={() => handleVote(idx)}
                                        disabled={loading || (electionState ? Math.floor(Date.now() / 1000) >= electionState.epochEnd : false)}
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[9px] h-10 px-8 rounded-lg shrink-0 shadow-lg shadow-indigo-600/10 active:scale-95 transition-all disabled:opacity-50"
                                      >
                                        {electionState && Math.floor(Date.now() / 1000) >= electionState.epochEnd ? "Closed" : "Vote"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Action Portal */}
                  <div className="lg:col-span-5 space-y-6">
                    <Card className="bg-black/60 border-indigo-500/20 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col h-full min-h-[350px]">
                      <div className="space-y-4 mb-auto">
                        <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Electoral Profile</Label>
                        <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                              <Sparkles className="h-6 w-6 text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-2xl font-black text-white leading-none truncate">{reputationScore}</p>
                              <span className="text-[9px] font-black uppercase text-indigo-400 leading-none tracking-widest">Power Units</span>
                            </div>
                          </div>
                          <Badge className="shrink-0 bg-white/10 text-white text-[8px] uppercase font-black border-none px-3 h-6 flex items-center">Live</Badge>
                        </div>

                        <p className="text-[11px] text-gray-500 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4 py-1">
                          Weight your influence on the network through on-chain reputation synchronization.
                        </p>
                      </div>

                      <div className="pt-8">
                        <Button
                          onClick={handleRegisterCandidate}
                          disabled={loading}
                          className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-indigo-600/10 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap px-6 border border-white/10"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Register as Candidate"}
                        </Button>
                      </div>
                    </Card>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Architecture Logic</h5>
                      <div className="space-y-5">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                            <Users className="h-4 w-4 text-indigo-400" />
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                            <strong className="text-white block uppercase mb-1">Decentralized Voting</strong>
                            No central server picks the leader. The collective weighted votes from the pool define the next authority.
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                            <Clock className="h-4 w-4 text-indigo-400" />
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                            <strong className="text-white block uppercase mb-1">Epochal Liveness</strong>
                            Transitions occur based on the verifiable on-chain <span className="text-indigo-400 italic font-bold">Clock</span>, ensuring constant rotation and liveness.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {txSig && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-gray-400 truncate max-w-[200px]">{txSig}</p>
                  </div>
                </div>
                <Button variant="outline" className="rounded-full gap-2 border-green-500/20 text-white" asChild>
                  <a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank">
                    Explorer <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
