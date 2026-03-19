export interface FileNode {
  name: string;
  language: string;
  content: string;
}

export interface FolderNode {
  name: string;
  files: FileNode[];
}

export interface Pattern {
  slug: string;
  id: string;
  githubUrl: string;
  title: string;
  description: string;
  tags: string[];
  theory: string;
  constraints: string[];
  tradeoffs: {
    aspect: string;
    web2: string;
    solana: string;
    notes: string;
  }[];
  web2: {
    explanation: string;
    implementations: {
      name: "Node.js" | "Python (FastAPI)" | "Python (Flask)" | "Java (Spring Boot)" | "C# (.NET)" | "Go";
      folders: FolderNode[];
    }[];
  };
  web3: {
    explanation: string;
    programId: string;
    implementations: {
      name: "Anchor" | "Native Rust";
      folders: FolderNode[];
    }[];
    clientFolders: FolderNode[];
    diagram?: string;
  };
}

const commonWeb2Folders = (lang: string, mainFile: string, mainContent: string, depFile: string, depContent: string): FolderNode[] => [
  {
    name: "src",
    files: [{ name: mainFile, language: lang, content: mainContent }]
  },
  {
    name: "root",
    files: [{ name: depFile, language: depFile.split('.').pop() === 'txt' || depFile === 'go.mod' ? 'text' : depFile.split('.').pop()!, content: depContent }]
  }
];

export const patterns: Pattern[] = [
  {
    slug: "escrow-engine",
    id: "PATTERN_01",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/escrow-engine",
    title: "Escrow Engine",
    description: "Secure, trustless multi-party transaction management for decentralized commerce.",
    tags: ["DeFi", "Security", "Classic"],
    theory: "In the Web2 world, escrow services rely on a 'Trusted Third Party' (TTP) to hold funds and arbitrate disputes. This introduces counterparty risk, potential censorship, and centralized points of failure. On Solana, the 'Trusted Third Party' is replaced by immutable smart contract code. We utilize Program Derived Addresses (PDAs) to create a 'vault'—a specialized account controlled solely by the program's logic rather than a private key. The program enforces strict state transitions: funds are only released to the taker if they successfully transfer the expected payment to the maker in the same transaction. This architectural pattern enables 'Atomic Swaps,' where both legs of the trade occur simultaneously or the entire operation reverts, ensuring zero counterparty risk for both participants without requiring an intermediary.",
    constraints: [
      "**Atomic Transactionality**: All swap components (deposits, transfers, and closures) must occur within a single atomic transaction.\nNote: Solana's runtime ensures that if any instruction within a transaction fails, all state changes revert, preventing partial execution bugs common in distributed Web2 systems.",
      "**PDA Authority Management**: The program-controlled vault must use a PDA as its authority to ensure funds cannot be moved without program logic.\nNote: Program Derived Addresses lack a private key, meaning only the specific program that 'owns' the PDA can sign for it, effectively making the code the legal custodian of assets.",
      "**Token Account Initialization**: Participants must have pre-existing Associated Token Accounts (ATAs) for the specific mints being traded.\nNote: Unlike Ethereum where tokens are stored within the contract's internal mapping, Solana tokens are stored in separate accounts, necessitating explicit account validation in every instruction.",
      "**Rent-Exempt Minimums**: Every on-chain account must maintain a minimum SOL balance to be exempt from rent deletion.\nNote: Developers must account for the SOL cost of creating state accounts and vaults, typically handled by the initiator or refunded upon closing the escrow to reclaim the deposit."
    ],
    tradeoffs: [
      {
        aspect: "Trust Model",
        web2: "Relies on a centralized 'Trusted Third Party' (bank, escrow agent, or platform) to hold funds. Users must trust the intermediary's solvency and integrity.",
        solana: "Replaced by immutable code. Funds are held in a Program Derived Address (PDA) that only the program logic can release based on predefined conditions.",
        notes: "Solana eliminates counterparty risk and reduces the need for expensive legal enforcement of contracts."
      },
      {
        aspect: "Atomic Settlement",
        web2: "Multi-step process involving bank transfers and manual verification. Transactions can be reversed (chargebacks) or fail halfway, leaving assets in limbo.",
        solana: "Entire exchange (taker pays maker, vault releases to taker) happens in a single, atomic transaction. If any step fails, the entire state reverts.",
        notes: "This 'all-or-nothing' execution ensures that neither party is ever left without their assets during a trade."
      },
      {
        aspect: "Cost & Fees",
        web2: "High percentage fees (1-5%) from payment processors and escrow services to cover insurance, overhead, and profit margins.",
        solana: "Negligible transaction fees ($<0.01) and minimal rent costs for state storage. The system is inherently lean and automated.",
        notes: "Significantly more efficient for micro-transactions and high-frequency swaps that would be unprofitable in Web2."
      }
    ],
    web2: {
      explanation: "Centralized server holds state in a SQL/NoSQL database and verifies external payment status via API hooks.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const { v4: uuidv4 } = require("uuid")

const app = express()
app.use(express.json())

// In Web2, we store state in memory or a database
const escrows = {}

app.post("/escrow/create", (req, res) => {

    const { buyer, seller, amount } = req.body

    const id = uuidv4()

    escrows[id] = {
        id,
        buyer,
        seller,
        amount,
        status: "FUNDED"
    }

    res.json(escrows[id])
})

app.post("/escrow/release/:id", (req, res) => {

    const escrow = escrows[req.params.id]

    if (!escrow) return res.status(404).json({ error: "Not found" })

    // Manual status update
    escrow.status = "RELEASED"

    res.json(escrow)
})

app.post("/escrow/refund/:id", (req, res) => {

    const escrow = escrows[req.params.id]

    if (!escrow) return res.status(404).json({ error: "Not found" })

    escrow.status = "REFUNDED"

    res.json(escrow)
})

app.get("/escrow/:id", (req, res) => {

    const escrow = escrows[req.params.id]

    if (!escrow) return res.status(404).json({ error: "Not found" })

    res.json(escrow)
})

app.listen(3000, () => console.log("Escrow engine running"))`, "package.json", `{
  "name": "escrow-engine",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": {
    "express": "^4.19.2",
    "uuid": "^9.0.1"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid

app = FastAPI()

escrows = {}

class Escrow(BaseModel):
    buyer: str
    seller: str
    amount: float

@app.post("/escrow/create")
def create_escrow(data: Escrow):

    escrow_id = str(uuid.uuid4())

    escrows[escrow_id] = {
        "id": escrow_id,
        "buyer": data.buyer,
        "seller": data.seller,
        "amount": data.amount,
        "status": "FUNDED"
    }

    return escrows[escrow_id]

@app.post("/escrow/release/{escrow_id}")
def release_escrow(escrow_id: str):

    escrow = escrows.get(escrow_id)

    if not escrow:
        raise HTTPException(404)

    escrow["status"] = "RELEASED"

    return escrow

@app.post("/escrow/refund/{escrow_id}")
def refund_escrow(escrow_id: str):

    escrow = escrows.get(escrow_id)

    if not escrow:
        raise HTTPException(404)

    escrow["status"] = "REFUNDED"

    return escrow

@app.get("/escrow/{escrow_id}")
def get_escrow(escrow_id: str):

    escrow = escrows.get(escrow_id)

    if not escrow:
        raise HTTPException(404)

    return escrow`, "requirements.txt", "fastapi\nuvicorn\npydantic")
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

escrows = {}

@app.route("/escrow/create", methods=["POST"])
def create_escrow():

    data = request.json

    escrow_id = str(uuid.uuid4())

    escrows[escrow_id] = {
        "id": escrow_id,
        "buyer": data["buyer"],
        "seller": data["seller"],
        "amount": data["amount"],
        "status": "FUNDED"
    }

    return jsonify(escrows[escrow_id])

@app.route("/escrow/release/<escrow_id>", methods=["POST"])
def release_escrow(escrow_id):

    escrow = escrows.get(escrow_id)

    if not escrow:
        return jsonify({"error": "Not found"}), 404

    escrow["status"] = "RELEASED"

    return jsonify(escrow)

@app.route("/escrow/refund/<escrow_id>", methods=["POST"])
def refund_escrow(escrow_id):

    escrow = escrows.get(escrow_id)

    if not escrow:
        return jsonify({"error": "Not found"}), 404

    escrow["status"] = "REFUNDED"

    return jsonify(escrow)

@app.route("/escrow/<escrow_id>")
def get_escrow(escrow_id):

    escrow = escrows.get(escrow_id)

    if not escrow:
        return jsonify({"error": "Not found"}), 404

    return jsonify(escrow)

if __name__ == "__main__":
    app.run(debug=True)`, "requirements.txt", "flask")
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "EscrowApp.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@SpringBootApplication
@RestController
public class EscrowApp {

    Map<String, Map<String,Object>> escrows = new HashMap<>();

    public static void main(String[] args) {
        SpringApplication.run(EscrowApp.class, args);
    }

    @PostMapping("/escrow/create")
    public Map<String,Object> create(@RequestBody Map<String,Object> body){

        String id = UUID.randomUUID().toString();

        body.put("id",id);
        body.put("status","FUNDED");

        escrows.put(id,body);

        return body;
    }

    @PostMapping("/escrow/release/{id}")
    public Map<String,Object> release(@PathVariable String id){

        Map<String,Object> e = escrows.get(id);

        if(e!=null) e.put("status","RELEASED");

        return e;
    }

    @PostMapping("/escrow/refund/{id}")
    public Map<String,Object> refund(@PathVariable String id){

        Map<String,Object> e = escrows.get(id);

        if(e!=null) e.put("status","REFUNDED");

        return e;
    }

    @GetMapping("/escrow/{id}")
    public Map<String,Object> get(@PathVariable String id){
        return escrows.get(id);
    }
}`, "pom.xml", `<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>escrow</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var escrows = new ConcurrentDictionary<string, Escrow>();

app.MapPost("/escrow/create", (EscrowRequest req) =>
{
    var id = Guid.NewGuid().ToString();

    var escrow = new Escrow
    {
        Id = id,
        Buyer = req.Buyer,
        Seller = req.Seller,
        Amount = req.Amount,
        Status = "FUNDED"
    };

    escrows[id] = escrow;

    return Results.Ok(escrow);
});

app.MapPost("/escrow/release/{id}", (string id) =>
{
    if (!escrows.TryGetValue(id, out var escrow))
        return Results.NotFound();

    escrow.Status = "RELEASED";

    return Results.Ok(escrow);
});

app.MapPost("/escrow/refund/{id}", (string id) =>
{
    if (!escrows.TryGetValue(id, out var escrow))
        return Results.NotFound();

    escrow.Status = "REFUNDED";

    return Results.Ok(escrow);
});

app.MapGet("/escrow/{id}", (string id) =>
{
    if (!escrows.TryGetValue(id, out var escrow))
        return Results.NotFound();

    return Results.Ok(escrow);
});

app.Run();

record EscrowRequest(string Buyer, string Seller, double Amount);

class Escrow
{
    public string Id { get; set; }
    public string Buyer { get; set; }
    public string Seller { get; set; }
    public double Amount { get; set; }
    public string Status { get; set; }
}`, "escrow.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"encoding/json"
	"net/http"
	"github.com/google/uuid"
)

type Escrow struct {
	ID     string  \`json: "id"\`
	Buyer  string  \`JSON: "buyer"\`
	Seller string  \`json: "seller"\`
	Amount float64 \`json: "amount"\`
	Status string  \`json: "status"\`
}

var escrows = map[string]Escrow{}

func createEscrow(w http.ResponseWriter, r *http.Request) {

	var e Escrow

	json.NewDecoder(r.Body).Decode(&e)

	e.ID = uuid.New().String()
	e.Status = "FUNDED"

	escrows[e.ID] = e

	json.NewEncoder(w).Encode(e)
}

func main() {

	http.HandleFunc("/escrow/create", createEscrow)

	http.ListenAndServe(":8080", nil)
}`, "go.mod", `module escrow

go 1.22

require github.com/google/uuid v1.6.0`)
        }
      ]
    },
    web3: {
      explanation: "Uses Program Derived Addresses (PDAs) to hold tokens in a program-controlled vault. All logic is immutable and verifiable on-chain.",
      programId: "9anrPY2Ei1Lkvqmqcdyuie42aYhxvnB9qScUTZZimwTB",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/escrow",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("9anrPY2Ei1Lkvqmqcdyuie42aYhxvnB9qScUTZZimwTB");

#[program]
pub mod escrow {
    use super::*;

    /// Initializes the escrow by creating a PDA vault and transferring tokens from the maker.
    /// In Web2, this is the "Lock" phase where a database record is created and funds are moved.
    pub fn initialize(ctx: Context<Initialize>, amount: u64, expected_amount: u64) -> Result<()> {
        let escrow_state = &mut ctx.accounts.escrow_state;
        escrow_state.maker = ctx.accounts.maker.key();
        escrow_state.expected_amount = expected_amount;
        escrow_state.bump = ctx.bumps.escrow_state;

        // CPI (Cross Program Invocation) to Token Program
        // This is the Web3 way of "calling an internal service" to handle transfers.
        let cpi_accounts = Transfer {
            from: ctx.accounts.maker_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.maker.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    /// The taker sends the expected tokens to the maker, and the vault releases tokens to the taker.
    /// This is an atomic swap - if any part fails, the whole transaction reverts.
    pub fn exchange(ctx: Context<Exchange>) -> Result<()> {
        // 1. Transfer taker's tokens to maker
        let cpi_accounts_taker = Transfer {
            from: ctx.accounts.taker_token_account.to_account_info(),
            to: ctx.accounts.maker_token_account.to_account_info(),
            authority: ctx.accounts.taker.to_account_info(),
        };
        let cpi_ctx_taker = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_taker);
        token::transfer(cpi_ctx_taker, ctx.accounts.escrow_state.expected_amount)?;

        // 2. Transfer vault tokens to taker (signed by PDA)
        let maker_key = ctx.accounts.escrow_state.maker.key();
        let seeds = &[b"escrow", maker_key.as_ref(), &[ctx.accounts.escrow_state.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts_vault = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.taker_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        let cpi_ctx_vault = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_vault,
            signer
        );
        token::transfer(cpi_ctx_vault, ctx.accounts.vault.amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    pub maker_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub maker_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = maker,
        space = 8 + 32 + 8 + 1,
        seeds = [b"escrow", maker.key().as_ref()],
        bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(
        init,
        payer = maker,
        token::mint = maker_token_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Exchange<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(mut)]
    pub taker_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub maker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow", escrow_state.maker.as_ref()],
        bump = escrow_state.bump,
        close = taker
    )]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EscrowState {
    pub maker: Pubkey,
    pub expected_amount: u64,
    pub bump: u8,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "escrow"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"\nanchor-spl = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "src",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    program::{invoke, invoke_signed},
    sysvar::{rent::Rent, Sysvar},
    program_pack::Pack,
};
use spl_token::state::Account as TokenAccount;

entrypoint!(process_instruction);

/// In Native Rust, we don't have Anchor's macros. We must manually:
/// 1. Parse account infos from the input slice.
/// 2. Validate signers and ownership.
/// 3. Deserialize/Serialize data.
/// 4. Manually construct CPI calls.
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    
    // Instruction discriminator (Web2 equivalent: Route handling)
    match instruction_data[0] {
        0 => {
            // Initialize logic
            let maker = next_account_info(accounts_iter)?;
            let escrow_account = next_account_info(accounts_iter)?;
            let vault = next_account_info(accounts_iter)?;
            
            // Validate the PDA manually
            let (expected_pda, bump) = Pubkey::find_program_address(&[b"escrow", maker.key.as_ref()], program_id);
            if expected_pda != *escrow_account.key {
                return Err(solana_program::program_error::ProgramError::InvalidSeeds);
            }
            
            // Transfer tokens to vault via CPI
            let transfer_ix = spl_token::instruction::transfer(
                &spl_token::id(),
                next_account_info(accounts_iter)?.key, // from
                vault.key, // to
                maker.key, // authority
                &[],
                100, // amount
            )?;
            invoke(&transfer_ix, accounts)?;
        },
        _ => return Err(solana_program::program_error::ProgramError::InvalidInstructionData),
    }
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "escrow-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nspl-token = "4.0.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [{
        name: "client",
        files: [{ name: "index.ts", language: "typescript", content: `import * as anchor from "@coral-xyz/anchor";\nasync function main() {\n  // Client logic...\n}` }]
      }],
      diagram: "graph TD\n    subgraph Users\n        M[Maker]\n        T[Taker]\n    end\n    subgraph Program\n        P[Escrow Program]\n        S[Escrow State PDA]\n        V[Vault Token Account]\n    end\n    M -->|1. Init Escrow| P\n    P -->|2. Create| S\n    P -->|3. Transfer Tokens| V\n    T -->|4. Exchange| P\n    P -->|5. Pay Maker| M\n    P -->|6. Release Tokens| T\n    P -->|7. Close| S"
    }
  },
  {
    slug: "subscription-billing",
    id: "PATTERN_02",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/subscription-billing",
    title: "Subscription Billing",
    description: "Recurring payments and access control for modern on-chain services.",
    tags: ["Payments", "Business"],
    theory: "Web2 subscription models (like Netflix or Spotify) rely on 'Merchant Pull' billing via Stripe or Braintree, where the merchant stores your credit card and pulls funds periodically. In the Web3 world, especially on Solana, we shift to a 'User Push' or 'Pre-paid' model due to the lack of native recurring transaction primitives. The user's access state is stored in a Program Derived Address (PDA) containing their subscription details. Access is gated by comparing the current block timestamp (via the Clock sysvar) to an 'expiration' timestamp stored in the user's PDA. This creates a transparent, non-custodial billing system where users retain full control over their funds, renewing only when desired or through automated 'Crank' workers that trigger renewals from pre-approved balances.",
    constraints: [
      "**Deterministic Time (Clock Sysvar)**: Access validation relies on the Solana Clock sysvar to provide a network-wide consensus on the current timestamp.\nNote: While generally accurate, block time can slightly drift from wall-clock time; developers should include a small 'grace period' in expiration logic to account for network jitter.",
      "**User-Centric PDA Storage**: Each subscriber is mapped to a unique PDA derived from their public key and a 'subscription' seed.\nNote: This architecture allows the program to verify a user's status with O(1) complexity, as the account address can be calculated locally by the client without searching a database.",
      "**Automated Renewal Incentives**: Without native cron jobs, automated billing requires external 'Keepers' to trigger renewal instructions.\nNote: To simulate 'Auto-renew,' protocols often charge a small fee that is paid to the 'Crank' operator who submits the renewal transaction when the subscription is due.",
      "**Immutable Account Scaling**: Account space for subscription state is allocated during initialization and is costly to change.\nNote: Using the `realloc` instruction allows programs to expand account size dynamically, but requires the caller to provide additional SOL to maintain rent exemption for the new space."
    ],
    tradeoffs: [
      {
        aspect: "Payment Direction",
        web2: "Classic 'Pull' model. Merchants store credit card tokens and automatically pull funds from the user's account at regular intervals.",
        solana: "Uses a 'Push' or 'Pre-paid' model. Users must proactively renew their status or authorize a balance for a 'Crank' to execute renewals.",
        notes: "Increases user privacy and security, as merchants never hold sensitive long-term payment credentials."
      },
      {
        aspect: "Access Gating",
        web2: "Gating logic is buried in a private server and database. Verification is internal and cannot be independently audited by the user.",
        solana: "Gated by the public block timestamp in the user's PDA. Status verification is cryptographic, instant, and visible to all.",
        notes: "Enables 'composable' access where third-party apps can instantly verify a user's subscription status without an API key."
      },
      {
        aspect: "Automation",
        web2: "Managed by internal cron jobs or cloud task schedulers. Reliability is tied to the availability of the central server.",
        solana: "Relies on an external network of 'Keepers' or 'Cranks' that are incentivized to trigger renewals when conditions are met.",
        notes: "Decentralizes operations, removing the merchant's server as a single point of failure for billing events."
      }
    ],
    web2: {
      explanation: "Centralized server holds subscription state in a database and verifies status against a payment gateway (Stripe/PayPal) on every request.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const { v4: uuidv4 } = require("uuid")

const app = express()
app.use(express.json())

// Web2 state is usually a SQL table row
const subscriptions = {}

app.post("/subscribe", (req,res)=>{

    const {user, plan, price} = req.body

    const id = uuidv4()

    subscriptions[id] = {
        id,
        user,
        plan,
        price,
        status:"ACTIVE"
    }

    res.json(subscriptions[id])
})

app.post("/cancel/:id", (req,res)=>{

    const sub = subscriptions[req.params.id]

    if(!sub) return res.status(404).json({error:"Not found"})

    sub.status = "CANCELLED"

    res.json(sub)
})

app.get("/subscription/:id", (req,res)=>{

    const sub = subscriptions[req.params.id]

    if(!sub) return res.status(404).json({error:"Not found"})

    res.json(sub)
})

app.listen(3000, ()=>console.log("Subscription service running"))`, "package.json", `{
  "name": "subscription-engine",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": {
    "express": "^4.19.2",
    "uuid": "^9.0.1"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid

app = FastAPI()

subscriptions = {}

class Subscription(BaseModel):
    user: str
    plan: str
    price: float

@app.post("/subscribe")
def subscribe(data: Subscription):

    sub_id = str(uuid.uuid4())

    subscriptions[sub_id] = {
        "id": sub_id,
        "user": data.user,
        "plan": data.plan,
        "price": data.price,
        "status": "ACTIVE"
    }

    return subscriptions[sub_id]

@app.post("/cancel/{sub_id}")
def cancel(sub_id: str):

    sub = subscriptions.get(sub_id)

    if not sub:
        raise HTTPException(404)

    sub["status"] = "CANCELLED"

    return sub

@app.get("/subscription/{sub_id}")
def get_sub(sub_id: str):

    sub = subscriptions.get(sub_id)

    if not sub:
        raise HTTPException(404)

    return sub`, "requirements.txt", "fastapi\nuvicorn\npydantic")
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

subscriptions = {}

@app.route("/subscribe", methods=["POST"])
def subscribe():

    data = request.json

    sub_id = str(uuid.uuid4())

    subscriptions[sub_id] = {
        "id": sub_id,
        "user": data["user"],
        "plan": data["plan"],
        "price": data["price"],
        "status": "ACTIVE"
    }

    return jsonify(subscriptions[sub_id])

@app.route("/cancel/<sub_id>", methods=["POST"])
def cancel(sub_id):

    sub = subscriptions.get(sub_id)

    if not sub:
        return jsonify({"error":"Not found"}),404

    sub["status"]="CANCELLED"

    return jsonify(sub)

@app.route("/subscription/<sub_id>")
def get_sub(sub_id):

    sub = subscriptions.get(sub_id)

    if not sub:
        return jsonify({"error":"Not found"}),404

    return jsonify(sub)

if __name__ == "__main__":
    app.run(debug=True)`, "requirements.txt", "flask")
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "SubscriptionApp.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@SpringBootApplication
@RestController
public class SubscriptionApp {

    Map<String, Map<String,Object>> subs = new HashMap<>();

    public static void main(String[] args) {
        SpringApplication.run(SubscriptionApp.class,args);
    }

    @PostMapping("/subscribe")
    public Map<String,Object> subscribe(@RequestBody Map<String,Object> body){

        String id = UUID.randomUUID().toString();

        body.put("id",id);
        body.put("status","ACTIVE");

        subs.put(id,body);

        return body;
    }

    @PostMapping("/cancel/{id}")
    public Map<String,Object> cancel(@PathVariable String id){

        Map<String,Object> s = subs.get(id);

        if(s!=null) s.put("status","CANCELLED");

        return s;
    }

    @GetMapping("/subscription/{id}")
    public Map<String,Object> get(@PathVariable String id){

        return subs.get(id);
    }
}`, "pom.xml", `<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>subscription</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var subs = new ConcurrentDictionary<string, Subscription>();

app.MapPost("/subscribe", (SubscriptionRequest req)=>{

    var id = Guid.NewGuid().ToString();

    var sub = new Subscription{
        Id=id,
        User=req.User,
        Plan=req.Plan,
        Price=req.Price,
        Status="ACTIVE"
    };

    subs[id]=sub;

    return Results.Ok(sub);
});

app.MapPost("/cancel/{id}",(string id)=>{

    if(!subs.TryGetValue(id,out var sub))
        return Results.NotFound();

    sub.Status="CANCELLED";

    return Results.Ok(sub);
});

app.MapGet("/subscription/{id}",(string id)=>{

    if(!subs.TryGetValue(id,out var sub))
        return Results.NotFound();

    return Results.Ok(sub);
});

app.Run();

record SubscriptionRequest(string User,string Plan,double Price);

class Subscription{
    public string Id {get;set;}
    public string User {get;set;}
    public string Plan {get;set;}
    public double Price {get;set;}
    public string Status {get;set;}
}`, "subscription.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"encoding/json"
	"net/http"
	"github.com/google/uuid"
)

type Subscription struct {
	ID string \`json:"id"\`
	User string \`json:"user"\`
	Plan string \`json:"plan"\`
	Price float64 \`json:"price"\`
	Status string \`json:"status"\`
}

var subs = map[string]Subscription{}

func subscribe(w http.ResponseWriter, r *http.Request){

	var s Subscription

	json.NewDecoder(r.Body).Decode(&s)

	s.ID = uuid.New().String()
	s.Status = "ACTIVE"

	subs[s.ID] = s

	json.NewEncoder(w).Encode(s)
}

func main(){

	http.HandleFunc("/subscribe", subscribe)

	http.ListenAndServe(":8080", nil)
}`, "go.mod", `module subscription

go 1.22

require github.com/google/uuid v1.6.0`)
        }
      ]
    },
    web3: {
      explanation: "Stores an expiration timestamp in a UserAccount PDA. Gated instructions check if timestamp < block.timestamp.",
      programId: "AihnoAeD3MH23amQhmMgRWq9UF3rSV7YMnN6THArV8e7",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/subscription",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("Sub1111111111111111111111111111111111111");

#[program]
pub mod subscription {
    use super::*;

    /// Initializes a user's subscription record (PDA).
    /// In Web2, this is like creating a row in a 'subscriptions' table.
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        subscription.user = ctx.accounts.user.key();
        subscription.expires_at = 0; // Not yet active
        Ok(())
    }

    /// Renew or start a subscription by paying and updating the expiration timestamp.
    /// Web3 uses 'Push' payments: the user initiates the transaction.
    pub fn renew(ctx: Context<Renew>, months: u8) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?; // System time on Solana
        
        let current_time = clock.unix_timestamp;
        let start_time = if subscription.expires_at > current_time {
            subscription.expires_at // Extend existing sub
        } else {
            current_time // Start fresh
        };

        // Add 30 days per month
        let duration = (months as i64) * 30 * 24 * 60 * 60;
        subscription.expires_at = start_time + duration;

        // Logic for transferring payment (e.g., SOL or SPL Token) would go here
        // In Web2, Stripe would 'pull' this. In Web3, the user 'pushes' it.
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8,
        seeds = [b"subscription", user.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, SubscriptionState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Renew<'info> {
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"subscription", user.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, SubscriptionState>,
}

#[account]
pub struct SubscriptionState {
    pub user: Pubkey,
    pub expires_at: i64,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "subscription"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/subscription-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    sysvar::{clock::Clock, Sysvar},
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SubscriptionState {
    pub user: Pubkey,
    pub expires_at: i64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let user = next_account_info(accounts_iter)?;
    let subscription_account = next_account_info(accounts_iter)?;

    // Manually handle instruction (0 = Init, 1 = Renew)
    match instruction_data[0] {
        0 => {
            msg!("Initializing subscription");
            let mut sub_data = SubscriptionState {
                user: *user.key,
                expires_at: 0,
            };
            sub_data.serialize(&mut &mut subscription_account.data.borrow_mut()[..])?;
        },
        1 => {
            msg!("Renewing subscription");
            let months = instruction_data[1];
            let clock = Clock::get()?;
            let mut sub_data = SubscriptionState::try_from_slice(&subscription_account.data.borrow())?;
            
            let start_time = if sub_data.expires_at > clock.unix_timestamp {
                sub_data.expires_at
            } else {
                clock.unix_timestamp
            };

            sub_data.expires_at = start_time + (months as i64 * 30 * 24 * 60 * 60);
            sub_data.serialize(&mut &mut subscription_account.data.borrow_mut()[..])?;
        },
        _ => return Err(solana_program::program_error::ProgramError::InvalidInstructionData),
    }
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "subscription-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    U[User] -->|1. Transfer SOL| P[Program Vault]
    P -->|2. Update Expiry| PDA[User Subscription PDA]
    subgraph Gateway
        G[Protected Service] -->|3. Check Status| PDA
        PDA -->|4. Verify Expiration| G
    end
    G -->|5. Grant Access| U`
    }
  },
  {
    slug: "order-matching-engine",
    id: "PATTERN_03",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/order-matching",
    title: "Order Matching",
    description: "High-performance limit order book on-chain for transparent trading.",
    tags: ["DeFi", "Trading"],
    theory: "Centralized exchanges (CEX) like Binance or Coinbase use ultra-fast, off-chain in-memory matching engines to process millions of trades per second. However, this is a 'Black Box'—users can't verify if the exchange is front-running them or manipulating the order book. Solana enables high-performance on-chain Order Matching by maintaining sorted orderbook accounts directly in global state. Every bid and ask is recorded in program-owned accounts, often using advanced data structures like Binary Search Trees or Linked Lists to maintain price-time priority. When a new order arrives, the program logic attempts to match it against the existing 'book' atomically. While slower than a CEX due to block times, it provides absolute transparency, removes counterparty risk, and ensures that the matching logic is publicly auditable and immutable.",
    constraints: [
      "**Compute Unit Optimization**: Transaction execution is capped at a strict compute limit, making complex tree traversals risky.\nNote: Developers must use efficient algorithms (like Red-Black trees) or off-chain 'cranking' to ensure that matching 10+ orders doesn't exceed the 200k CU limit per instruction.",
      "**Dynamic Account Reallocation**: Growing order books require the program to expand account space via the `realloc` primitive.\nNote: Because account expansion costs SOL, many engines use a 'user-funded' model where the order-placer pays for the extra bytes required to store their order in the book.",
      "**Price-Time Priority Enforcement**: The engine must guarantee that the highest bids and lowest asks are processed in the order they were received.\nNote: Maintaining a sorted list on-chain is expensive; many high-performance DEXs use 'Asynchronous Matching' where orders are placed in a queue and matched by a separate crank.",
      "**Memory-Safe Data Structures**: Large order books must be split across multiple accounts to bypass the 10MB account size limit.\nNote: Using a 'Heap' or 'Slab' allocator within a Solana account allows for efficient memory management, mimicking low-level C++ memory patterns inside the Rust program."
    ],
    tradeoffs: [
      {
        aspect: "Transparency",
        web2: "'Black box' execution. Only the exchange operator can see the full matching logs and order book internals.",
        solana: "Every order, match, and book update is recorded on-chain. Matching logic is public and immutable for auditing.",
        notes: "Prevents unfair practices like front-running by the exchange operator and ensures 'Fair-Play' by code."
      },
      {
        aspect: "Latency & Speed",
        web2: "Microsecond execution in-memory. Can handle millions of orders per second on high-performance centralized clusters.",
        solana: "Limited by block times (~400ms) and compute budget (CU limits). Atomic matching is fast but capped by L1 throughput.",
        notes: "A deliberate trade-off between raw performance and total, decentralized auditability of the market."
      },
      {
        aspect: "Asset Custody",
        web2: "The exchange holds all user funds. High 'honeypot' risk and dependency on the operator's financial stability.",
        solana: "Users retain custody of their funds in their own wallets or program-owned vaults until the exact moment of matching.",
        notes: "Dramatically reduces systemic risk, as funds cannot be misappropriated or lost due to operator insolvency."
      }
    ],
    web2: {
      explanation: "Uses a Red-Black tree or sorted heap to match orders in memory at microsecond speeds. Orders are eventually persisted to a database.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const { v4: uuidv4 } = require("uuid")

const app = express()
app.use(express.json())

// Web2: Fast in-memory arrays
let buyOrders = []
let sellOrders = []

function matchOrders(){

    buyOrders.sort((a,b)=>b.price-a.price)
    sellOrders.sort((a,b)=>a.price-b.price)

    if(buyOrders.length===0 || sellOrders.length===0) return null

    const buy = buyOrders[0]
    const sell = sellOrders[0]

    if(buy.price >= sell.price){

        buyOrders.shift()
        sellOrders.shift()

        return {
            price:sell.price,
            quantity:Math.min(buy.qty,sell.qty)
        }
    }

    return null
}

app.post("/order",(req,res)=>{

    const {type,price,qty}=req.body

    const order={id:uuidv4(),type,price,qty}

    if(type==="BUY") buyOrders.push(order)
    else sellOrders.push(order)

    const trade=matchOrders()

    res.json({order,trade})
})

app.listen(3000,()=>console.log("Matching engine running"))`, "package.json", `{
  "name": "order-matching-engine",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": {
    "express": "^4.19.2",
    "uuid": "^9.0.1"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI
from pydantic import BaseModel
import uuid

app = FastAPI()

buy_orders = []
sell_orders = []

class Order(BaseModel):
    type: str
    price: float
    qty: float


def match_orders():

    if not buy_orders or not sell_orders:
        return None

    buy_orders.sort(key=lambda x: -x["price"])
    sell_orders.sort(key=lambda x: x["price"])

    buy = buy_orders[0]
    sell = sell_orders[0]

    if buy["price"] >= sell["price"]:

        buy_orders.pop(0)
        sell_orders.pop(0)

        return {
            "price": sell["price"],
            "qty": min(buy["qty"], sell["qty"])
        }

    return None


@app.post("/order")
def place_order(order: Order):

    new = order.dict()
    new["id"] = str(uuid.uuid4())

    if order.type == "BUY":
        buy_orders.append(new)
    else:
        sell_orders.append(new)

    trade = match_orders()

    return {"order": new, "trade": trade}`, "requirements.txt", "fastapi\nuvicorn\npydantic")
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

buy_orders = []
sell_orders = []


def match_orders():

    if not buy_orders or not sell_orders:
        return None

    buy_orders.sort(key=lambda x: -x["price"])
    sell_orders.sort(key=lambda x: x["price"])

    buy = buy_orders.pop(0)
    sell = sell_orders.pop(0)

    if buy["price"] >= sell["price"]:

        return {
            "price": sell["price"],
            "qty": min(buy["qty"], sell["qty"])
        }

    return None


@app.route("/order", methods=["POST"])
def place_order():

    data = request.json

    order = {
        "id": str(uuid.uuid4()),
        "type": data["type"],
        "price": data["price"],
        "qty": data["qty"]
    }

    if order["type"] == "BUY":
        buy_orders.append(order)
    else:
        sell_orders.append(order)

    trade = match_orders()

    return jsonify({"order": order, "trade": trade})


if __name__ == "__main__":
    app.run(debug=True)`, "requirements.txt", "flask")
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "MatchingApp.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@SpringBootApplication
@RestController
public class MatchingApp {

    List<Map<String,Object>> buys = new ArrayList<>();
    List<Map<String,Object>> sells = new ArrayList<>();

    public static void main(String[] args){
        SpringApplication.run(MatchingApp.class,args);
    }

    @PostMapping("/order")
    public Map<String,Object> order(@RequestBody Map<String,Object> body){

        body.put("id",UUID.randomUUID().toString());

        if(body.get("type").equals("BUY")) buys.add(body);
        else sells.add(body);

        Map<String,Object> result = new HashMap<>();
        result.put("order",body);

        if(!buys.isEmpty() && !sells.isEmpty()){

            Map<String,Object> b = buys.get(0);
            Map<String,Object> s = sells.get(0);

            double bp = Double.parseDouble(b.get("price").toString());
            double sp = Double.parseDouble(s.get("price").toString());

            if(bp >= sp){

                buys.remove(0);
                sells.remove(0);

                Map<String,Object> trade = new HashMap<>();
                trade.put("price",sp);

                result.put("trade",trade);
            }
        }

        return result;
    }
}`, "pom.xml", `<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>matching</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var buys = new List<Order>();
var sells = new List<Order>();

app.MapPost("/order", (OrderRequest req)=>{

    var order = new Order{
        Id = Guid.NewGuid().ToString(),
        Type = req.Type,
        Price = req.Price,
        Qty = req.Qty
    };

    if(req.Type=="BUY") buys.Add(order);
    else sells.Add(order);

    return Results.Ok(order);
});

app.Run();

record OrderRequest(string Type,double Price,double Qty);

class Order{
    public string Id {get;set;}
    public string Type {get;set;}
    public double Price {get;set;}
    public double Qty {get;set;}
}`, "matching.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"encoding/json"
	"net/http"
	"github.com/google/uuid"
)

type Order struct{
	ID string \`json:"id"\`
	Type string \`json:"type"\`
	Price float64 \`json:"price"\`
	Qty float64 \`json:"qty"\`
}

var buys []Order
var sells []Order

func placeOrder(w http.ResponseWriter, r *http.Request){

	var o Order

	json.NewDecoder(r.Body).Decode(&o)

	o.ID = uuid.New().String()

	if o.Type=="BUY"{
		buys = append(buys,o)
	}else{
		sells = append(sells,o)
	}

	json.NewEncoder(w).Encode(o)
}

func main(){

	http.HandleFunc("/order", placeOrder)

	http.ListenAndServe(":8080",nil)
}`, "go.mod", `module matching

go 1.22

require github.com/google/uuid v1.6.0`)
        }
      ]
    },
    web3: {
      explanation: "Maintains sorted arrays or linked lists in program-owned accounts to handle transparent bid/ask matching.",
      programId: "3qWdfedEMajVfoF7CgHvoCPy7Ddd7r1pWiHYGmbxQ3fj",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/order_book",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("Match11111111111111111111111111111111111");

#[program]
pub mod matching_engine {
    use super::*;

    /// Places a new order into the orderbook.
    /// Unlike Web2's in-memory matching, Web3 matching happens on-chain 
    /// within the constraints of transaction compute limits.
    pub fn place_order(ctx: Context<PlaceOrder>, side: Side, price: u64, quantity: u64) -> Result<()> {
        let orderbook = &mut ctx.accounts.orderbook;
        
        let order = Order {
            owner: ctx.accounts.owner.key(),
            price,
            quantity,
        };

        match side {
            Side::Bid => {
                // In Web2, we'd use a fast in-memory sorted list.
                // In Web3, we must carefully manage account space and compute.
                // Simplified: Insert into the first available slot.
                orderbook.bids[0] = order; 
            }
            Side::Ask => {
                orderbook.asks[0] = order; 
            }
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub orderbook: Account<'info, Orderbook>,
}

#[account]
pub struct Orderbook {
    pub bids: [Order; 50], // Fixed size for on-chain storage predictability
    pub asks: [Order; 50],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Order {
    pub owner: Pubkey,
    pub price: u64,
    pub quantity: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side { Bid, Ask }` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "order-book"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/order-book-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Default)]
pub struct Order {
    pub owner: Pubkey,
    pub price: u64,
    pub quantity: u64,
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct Orderbook {
    pub bids: [Order; 50],
    pub asks: [Order; 50],
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _owner = next_account_info(accounts_iter)?;
    let orderbook_account = next_account_info(accounts_iter)?;

    msg!("Placing order in Native Rust");
    let mut orderbook = Orderbook::try_from_slice(&orderbook_account.data.borrow())?;
    
    // Manual bit-parsing for Side, Price, Qty from instruction_data...
    // simplified: just update first bid
    orderbook.bids[0] = Order {
        owner: *program_id,
        price: 100,
        quantity: 1,
    };

    orderbook.serialize(&mut &mut orderbook_account.data.borrow_mut()[..])?;
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "order-book-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: "graph TD\n    U[User] -->|1. Submit Order| P[Matching Program]\n    P -->|2. Load Book| PDA[Orderbook Account]\n    PDA -->|3. Sorted Orders| P\n    P -->|4. Match Logic| P\n    P -->|5. Update Book| PDA\n    P -->|6. Settle Funds| V[Vaults]"
    }
  },
  {
    slug: "rbac-access-control",
    id: "PATTERN_04",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/rbac",
    title: "RBAC",
    description: "Role-Based Access Control on-chain for secure governance and administration.",
    tags: ["Security", "Infrastructure"],
    theory: "In Web2, access control is usually handled via JWT (JSON Web Tokens) or session cookies, where a centralized server verifies the user's role against a database before granting access to specific API routes. On Solana, every transaction is cryptographically signed by a wallet, and the program 'verifies' roles by looking up the signer's public key in a 'Registry' PDA (Program Derived Address). This shifts the security model from server-side session management to on-chain state verification. Permissions are granular and immutable; for instance, a program can ensure that only a specific 'Admin' PDA can authorize a withdrawal or upgrade the program logic. This ensures that sensitive functions are protected by cryptographic proofs that are visible and verifiable by all participants in the network.",
    constraints: [
      "**Cryptographic Signature Enforcement**: Every privileged instruction must be signed by the authorized wallet to ensure authenticity.\nNote: Solana's runtime automatically verifies signatures before the program logic even executes, meaning developers only need to check `is_signer` on the account info to ensure the caller is who they claim to be.",
      "**PDA-Based Role Registry**: Roles are stored in individual PDAs derived from the user's public key, allowing for O(1) permission checks.\nNote: By using the user's pubkey as a seed, the program can deterministically find the user's role account without needing to iterate through a global list, which would be inefficient and costly.",
      "**Secure Role Revocation Logic**: Programs must include 'Close' or 'Update' instructions to remove or downgrade user roles.\nNote: To prevent administrative 'deadlock' (where no admins are left to manage the program), it is common practice to require a multi-signature wallet or a 'Root' authority that cannot be easily revoked.",
      "**Initialization Bootstrapping**: The foundation of the RBAC hierarchy is established during the program's `initialize` call.\nNote: The first admin is typically the wallet that deployed the program. This 'Superuser' has the power to seed subsequent roles, making the initial deployment transaction a critical security event."
    ],
    tradeoffs: [
      {
        aspect: "Authentication",
        web2: "Based on session tokens (JWTs) or cookies stored in a browser. Revocation can be complex across distributed microservices.",
        solana: "Based on direct cryptographic signatures (Ed25519) from the user's wallet. Auth is tied to the physical private key.",
        notes: "Eliminates common session hijacking risks; an attacker requires the private key to perform privileged actions."
      },
      {
        aspect: "State Transparency",
        web2: "Admin roles are stored in private databases (SQL/Redis). Only the platform owner knows the true privilege hierarchy.",
        solana: "Roles are stored in a public Registry PDA. Any user can verify the program's administrative hierarchy at any time.",
        notes: "Enables 'Trustless Governance' where the power of admins is visible and strictly bound by the smart contract's code."
      },
      {
        aspect: "Revocation Latency",
        web2: "Instant. Updating a database flag invalidates the user's session globally across all server instances.",
        solana: "Requires an on-chain transaction. Effective once the transaction is finalized by the network (~12-30 seconds).",
        notes: "While slower for emergency lockouts, it provides an immutable audit trail of all permission changes."
      }
    ],
    web2: {
      explanation: "Centralized server verifies user roles from a database or in-memory store (like Redis) before granting access to specific routes via middleware.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")

const app = express()

// Web2 state: A simple JS object or DB table
const users = {
  "1": { id: "1", role: "ADMIN" },
  "2": { id: "2", role: "USER" }
}

function authorize(role) {
  return (req, res, next) => {

    const user = users[req.headers.userid]

    if (!user || user.role !== role)
      return res.status(403).json({ error: "Forbidden" })

    next()
  }
}

app.get("/admin", authorize("ADMIN"), (req, res) => {
  res.json({ message: "Admin panel" })
})

app.get("/profile", (req, res) => {
  res.json({ message: "User profile" })
})

app.listen(3000, () => console.log("RBAC service running"))`, "package.json", `{
  "name": "rbac-service",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": {
    "express": "^4.19.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, HTTPException, Header

app = FastAPI()

users = {
    "1": {"role": "ADMIN"},
    "2": {"role": "USER"}
}


def authorize(required_role, user_id):

    user = users.get(user_id)

    if not user or user["role"] != required_role:
        raise HTTPException(status_code=403)


@app.get("/admin")
def admin(userid: str = Header()):

    authorize("ADMIN", userid)

    return {"message": "Admin panel"}


@app.get("/profile")
def profile():
    return {"message": "User profile"}`, "requirements.txt", "fastapi\nuvicorn")
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify

app = Flask(__name__)

users = {
    "1": {"role": "ADMIN"},
    "2": {"role": "USER"}
}


def authorize(role):

    def wrapper(func):

        def inner(*args, **kwargs):

            user_id = request.headers.get("userid")
            user = users.get(user_id)

            if not user or user["role"] != role:
                return jsonify({"error": "Forbidden"}), 403

            return func(*args, **kwargs)

        return inner

    return wrapper


@app.route("/admin")
@authorize("ADMIN")
def admin():
    return jsonify({"message": "Admin panel"})


@app.route("/profile")
def profile():
    return jsonify({"message": "User profile"})


if __name__ == "__main__":
    app.run(debug=True)`, "requirements.txt", "flask")
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "RbacApp.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@SpringBootApplication
@RestController
public class RbacApp {

    Map<String,String> users = Map.of(
        "1","ADMIN",
        "2","USER"
    );

    public static void main(String[] args){
        SpringApplication.run(RbacApp.class,args);
    }

    @GetMapping("/admin")
    public String admin(@RequestHeader("userid") String id){

        if(!"ADMIN".equals(users.get(id)))
            return "Forbidden";

        return "Admin panel";
    }

    @GetMapping("/profile")
    public String profile(){
        return "User profile";
    }
}`, "pom.xml", `<project>
<dependencies>
<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>
</dependencies>
</project>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var users = new Dictionary<string,string>(){
    {"1","ADMIN"},
    {"2","USER"}
};

app.MapGet("/admin", (HttpRequest req)=>{

    var id = req.Headers["userid"].ToString();

    if(!users.ContainsKey(id) || users[id] != "ADMIN")
        return Results.StatusCode(403);

    return Results.Ok("Admin panel");
});

app.MapGet("/profile", ()=> "User profile");

app.Run();`, "rbac.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"net/http"
)

var users = map[string]string{
	"1":"ADMIN",
	"2":"USER",
}

func admin(w http.ResponseWriter, r *http.Request){

	id := r.Header.Get("userid")

	if users[id] != "ADMIN"{
		w.WriteHeader(403)
		w.Write([]byte("Forbidden"))
		return
	}

	w.Write([]byte("Admin panel"))
}

func main(){

	http.HandleFunc("/admin", admin)

	http.ListenAndServe(":8080", nil)
}`, "go.mod", `module rbac

go 1.22`)
        }
      ]
    },
    web3: {
      explanation: "A Global Configuration PDA stores a whitelist of Pubkeys. Every instruction includes a 'guard' that checks if the signer's key exists in that list with the correct role bits.",
      programId: "txyHnTyAi8MiVFy3ZLQeqJiCHKt3FuJx2gg2pvab8T9",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/rbac",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("RBAC111111111111111111111111111111111111");

#[program]
pub mod rbac {
    use super::*;

    /// Assigns a role to a user. Only an existing admin can call this.
    /// In Web2, this is a database update. In Web3, it's a signed PDA creation/update.
    pub fn assign_role(ctx: Context<AssignRole>, role: Role) -> Result<()> {
        let user_role = &mut ctx.accounts.user_role;
        user_role.owner = ctx.accounts.target_user.key();
        user_role.role = role;
        Ok(())
    }

    /// An example of an instruction gated by a specific role.
    /// The 'require!' macro is the Web3 equivalent of middleware role checks.
    pub fn admin_only_instruction(ctx: Context<AdminOnly>) -> Result<()> {
        let user_role = &ctx.accounts.user_role;
        require!(user_role.role == Role::Admin, ErrorCode::Unauthorized);
        
        // Admin-only logic here...
        Ok(())
    }
}

#[derive(Accounts)]
pub struct AssignRole<'info> {
    #[account(mut)]
    pub admin: Signer<'info>, // Must be authorized to assign roles
    pub target_user: SystemAccount<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 32 + 1,
        seeds = [b"role", target_user.key().as_ref()],
        bump
    )]
    pub user_role: Account<'info, UserRole>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    pub user: Signer<'info>,
    #[account(
        seeds = [b"role", user.key().as_ref()],
        bump
    )]
    pub user_role: Account<'info, UserRole>,
}

#[account]
pub struct UserRole {
    pub owner: Pubkey,
    pub role: Role,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    None,
    User,
    Admin,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "rbac"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/rbac-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum Role { None, User, Admin }

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserRole {
    pub owner: Pubkey,
    pub role: Role,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _admin = next_account_info(accounts_iter)?;
    let user_role_account = next_account_info(accounts_iter)?;

    // Handle instructions manually
    match instruction_data[0] {
        0 => { // Assign role
            msg!("Assigning role in Native RBAC");
            let role_val = instruction_data[1];
            let role = match role_val {
                1 => Role::User,
                2 => Role::Admin,
                _ => Role::None,
            };
            let data = UserRole {
                owner: *user_role_account.key,
                role,
            };
            data.serialize(&mut &mut user_role_account.data.borrow_mut()[..])?;
        },
        _ => return Err(solana_program::program_error::ProgramError::InvalidInstructionData),
    }
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "rbac-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph LR
      A[Admin] -->|1. Assign Role| P[Program]
      P -->|2. Write Role| PDA[User Role PDA]
      U[User] -->|3. Call Action| P
      P -->|4. Read Role| PDA
      PDA -->|5. Check Admin Role| P
      P -->|6. Execute Operation| U`
    }
  },
  {
    slug: "rate-limiter",
    id: "PATTERN_05",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/rate-limiter",
    title: "Rate Limiter",
    description: "Instruction frequency management to prevent spam and resource exhaustion on-chain.",
    tags: ["Security", "Infrastructure"],
    theory: "Web2 applications typically use Redis or an in-memory cache to implement 'Token Bucket' or 'Fixed Window' rate limiting based on IP address or API key. On Solana, IP-based limiting isn't possible because the program only sees wallet addresses. Therefore, we use per-wallet PDA timestamps to enforce 'cooling periods'. When a wallet calls an instruction, the program records the current block time in that wallet's PDA. Subsequent calls are rejected if the elapsed time is less than the required threshold. This pattern is crucial for protecting expensive on-chain operations and preventing Denial-of-Service (DoS) attacks that attempt to congest a program's state or compute budget.",
    constraints: [
      "**Clock Sysvar Dependency**: The accuracy of the rate limit depends on the Solana Clock sysvar which provides the current network time.\nNote: While generally reliable, block time can slightly drift from real-world time; developers should allow for minor variations and not rely on sub-second precision.",
      "**Storage Cost per Address**: Unlike Web2 Redis keys which are virtually free, every Solana rate-limit PDA requires a SOL deposit for rent.\nNote: A common strategy is to have the user pay the rent for their own throttle PDA during their first interaction, which can be closed later to reclaim the SOL.",
      "**Atomic Counter Updates**: To prevent race conditions where multiple transactions from the same wallet land in the same block, the program must update the timestamp atomically.\nNote: Solana's parallel execution engine handles this by locking the throttle PDA account during transaction processing, ensuring no two instructions can update the same user's limit simultaneously.",
      "**Granularity vs Storage Cost**: Storing complex 'buckets' (e.g., 5 calls per minute) requires more account space than a simple 'last called' timestamp.\nNote: Developers must balance the precision of the rate limit with the rent cost of the account; often, a simple 'cooldown' period is the most cost-effective solution."
    ],
    tradeoffs: [
      {
        aspect: "Spam Identification",
        web2: "Relies on IP addresses or API keys. Easily bypassed via proxies, VPNs, or botnets with many IPs.",
        solana: "Uses the physical wallet's public key. Harder to bypass, as each new identity requires funding with SOL.",
        notes: "Shifts the cost of spam to the attacker, as every failed or throttled attempt still costs real money (SOL fees)."
      },
      {
        aspect: "Storage & Rent",
        web2: "Redis keys are practically free (~1KB each) and can be configured to expire and disappear automatically.",
        solana: "Each rate-limit PDA requires a SOL deposit for rent. Rent must be paid by someone (usually the user) to persist.",
        notes: "Requires careful account management; programs often have users fund their own throttle PDA during first use."
      },
      {
        aspect: "Consensus Time",
        web2: "High-precision (milliseconds). Distributed Redis clusters offer near-instant syncing of rate counters.",
        solana: "Relies on the network's Slot/Clock sysvar. Precision is bound by the average block time (~400ms).",
        notes: "Sufficient for application-level throttling but not suitable for high-frequency trading protection mechanisms."
      }
    ],
    web2: {
      explanation: "Uses Redis for distributed rate limiting, allowing the limiter to sync across multiple server instances using atomic operations like INCR and EXPIRE.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const Redis = require("ioredis")

const app = express()
const redis = new Redis()

const WINDOW = 60
const LIMIT = 5

app.use(async (req, res, next) => {

  const ip = req.ip
  const key = \`rate:\${ip}\`

  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, WINDOW)
  }

  if (count > LIMIT) {
    return res.status(429).json({ error: "Too many requests" })
  }

  next()
})

app.get("/", (req,res)=>{
  res.json({message:"Request allowed"})
})

app.listen(3000)`, "package.json", `{
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, Request, HTTPException
import redis

app = FastAPI()

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

WINDOW = 60
LIMIT = 5

@app.middleware("http")
async def rate_limit(request: Request, call_next):

    ip = request.client.host

    key = f"rate:{ip}"

    count = r.incr(key)

    if count == 1:
        r.expire(key, WINDOW)

    if count > LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests")

    return await call_next(request)

@app.get("/")
def home():
    return {"message":"Request allowed"}`, "requirements.txt", "fastapi\nuvicorn\nredis")
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import redis

app = Flask(__name__)

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

WINDOW = 60
LIMIT = 5

@app.before_request
def rate_limit():

    ip = request.remote_addr

    key = f"rate:{ip}"

    count = r.incr(key)

    if count == 1:
        r.expire(key, WINDOW)

    if count > LIMIT:
        return jsonify({"error":"Too many requests"}),429

@app.route("/")
def home():
    return {"message":"Request allowed"}

if __name__ == "__main__":
    app.run()`, "requirements.txt", "flask\nredis")
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "RateLimiterApplication.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import redis.clients.jedis.Jedis;
import jakarta.servlet.http.HttpServletRequest;

@SpringBootApplication
@RestController
public class RateLimiterApplication {

    Jedis redis = new Jedis("localhost",6379);

    int LIMIT = 5;

    @GetMapping("/")
    public String home(HttpServletRequest request) {

        String ip = request.getRemoteAddr();

        String key = "rate:" + ip;

        long count = redis.incr(key);

        if(count == 1) redis.expire(key,60);

        if(count > LIMIT) {
            throw new RuntimeException("Too many requests");
        }

        return "Request allowed";
    }

    public static void main(String[] args) {
        SpringApplication.run(RateLimiterApplication.class, args);
    }
}`, "pom.xml", `<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>example</groupId>
  <artifactId>ratelimiter</artifactId>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.0.0</version>
  </parent>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>redis.clients</groupId>
      <artifactId>jedis</artifactId>
      <version>5.0.0</version>
    </dependency>
  </dependencies>
</project>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var redis = ConnectionMultiplexer.Connect("localhost:6379");
var db = redis.GetDatabase();

int LIMIT = 5;

app.Use(async (context,next)=>{

    var ip = context.Connection.RemoteIpAddress.ToString();

    var key = \$\"rate:{ip}\";

    var count = await db.StringIncrementAsync(key);

    if(count == 1)
        await db.KeyExpireAsync(key, TimeSpan.FromSeconds(60));

    if(count > LIMIT)
    {
        context.Response.StatusCode = 429;
        await context.Response.WriteAsync("Too many requests");
        return;
    }

    await next();
});

app.MapGet("/", ()=>"Request allowed");

app.Run();`, "ratelimiter.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">
<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>
<ItemGroup>
<PackageReference Include="StackExchange.Redis" Version="2.7.10" />
</ItemGroup>
</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"context"
	"fmt"
	"net/http"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

var rdb = redis.NewClient(&redis.Options{
	Addr: "localhost:6379",
})

var LIMIT = int64(5)

func handler(w http.ResponseWriter, r *http.Request) {

	ip := r.RemoteAddr

	key := "rate:" + ip

	count, _ := rdb.Incr(ctx, key).Result()

	if count == 1 {
		rdb.Expire(ctx, key, 60)
	}

	if count > LIMIT {
		w.WriteHeader(429)
		w.Write([]byte("Too many requests"))
		return
	}

	fmt.Fprintf(w, "Request allowed")
}

func main() {

	http.HandleFunc("/", handler)

	http.ListenAndServe(":8080", nil)
}`, "go.mod", `module ratelimiter

go 1.21

require github.com/redis/go-redis/v9 v9.0.0`)
        }
      ]
    },
    web3: {
      explanation: "PDA stores 'LastCalled' timestamp. Instruction reverts if now - LastCalled < threshold, effectively enforcing a minimum interval between calls per wallet.",
      programId: "J3cTELeaZPRUd1qGHrDW6mxi9Hyz3egMs9unqVQsxny6",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/rate_limiter",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("Rate11111111111111111111111111111111111111");

#[program]
pub mod rate_limiter {
    use super::*;

    /// Throttles an instruction based on a per-wallet cool-down.
    /// In Web2, we'd use Redis 'incr' with a TTL. In Web3, we use a PDA.
    pub fn limited_call(ctx: Context<LimitedCall>) -> Result<()> {
        let throttle = &mut ctx.accounts.throttle;
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Ensure at least 60 seconds have passed since last call
        // This is the Web3 equivalent of an 'If-Modified-Since' or Rate-Limit header.
        require!(
            now - throttle.last_called_at >= 60, 
            ErrorCode::TooFast
        );

        throttle.last_called_at = now;
        
        // Execute the limited logic here...
        Ok(())
    }
}

#[derive(Accounts)]
pub struct LimitedCall<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 8, // Discriminator + i64 timestamp
        seeds = [b"throttle", user.key().as_ref()],
        bump
    )]
    pub throttle: Account<'info, ThrottleState>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ThrottleState {
    pub last_called_at: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Please wait 60 seconds between calls.")]
    TooFast,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "rate-limiter"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/rate-limiter-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    sysvar::{clock::Clock, Sysvar},
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct ThrottleState {
    pub last_called_at: i64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _user = next_account_info(accounts_iter)?;
    let throttle_account = next_account_info(accounts_iter)?;

    msg!("Checking rate limit in Native Rust");
    let mut data = ThrottleState::try_from_slice(&throttle_account.data.borrow())?;
    let clock = Clock::get()?;

    if clock.unix_timestamp - data.last_called_at < 60 {
        return Err(solana_program::program_error::ProgramError::Custom(1));
    }

    data.last_called_at = clock.unix_timestamp;
    data.serialize(&mut &mut throttle_account.data.borrow_mut()[..])?;
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "rate-limiter-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    U[User Wallet] -->|1. Call Instruction| P[Rate Program]
    P -->|2. Check Last Ts| PDA[Rate-Limit PDA]
    PDA -->|3. Cooldown Expired?| P
    P -->|No: Revert| U
    P -->|Yes: Update Ts| PDA
    P -->|Yes: Execute Logic| P`
    }
  },
  {
    slug: "on-chain-job-queue",
    id: "PATTERN_06",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/onchain-job-queue",
    title: "On-Chain Job Queue",
    description: "Asynchronous task execution.",
    tags: ["Infrastructure"],
    theory: "In Web2 architectures, job queues like Celery or BullMQ rely on persistent background workers and message brokers to handle asynchronous tasks. On Solana, the blockchain itself acts as the state store for the queue, but it lacks a built-in scheduler to trigger executions. Developers must implement 'crank' or 'keeper' patterns where external bots are incentivized to call specific processing instructions when certain conditions are met. This shift moves the responsibility of execution from a managed server to a decentralized network of actors who compete or are rewarded for maintaining system state.",
    constraints: [
      "**Keeper Incentivization**: External actors must be financially motivated to pay transaction fees and trigger the job execution.\nNote: Include a small reward or 'tip' in the job account to reimburse keepers.",
      "**Atomic Execution**: Each job must be processed exactly once to avoid state corruption or double-spending in financial applications.\nNote: Use a boolean flag or a unique PDA to track the completion status of each job.",
      "**Resource Limits**: Solana's compute budget and transaction size limits restrict the complexity of tasks that can be performed in a single job step.\nNote: For long-running tasks, break the job into multiple smaller instructions that update a progress account."
    ],
    tradeoffs: [
      {
        aspect: "Reliability",
        web2: "Guaranteed by a managed worker pool. Tasks can be configured to retry automatically if a failure occurs.",
        solana: "Relies on an external network of 'Keepers' to trigger the instruction. No built-in retry logic exists on L1.",
        notes: "Requires a robust 'Incentive Design' to ensure keepers find it profitable to process all jobs in the queue."
      },
      {
        aspect: "Task Complexity",
        web2: "Background workers can perform heavy computation, external API calls, and complex data transformations.",
        solana: "Execution is bound by the Compute Unit (CU) budget of a single transaction. Logic must be highly optimized.",
        notes: "Web3 job queues are best for 'Verifiable State Transitions' rather than raw, computationally heavy data processing."
      },
      {
        aspect: "Cost Model",
        web2: "Fixed monthly costs for infrastructure (Redis, servers). Costs remain constant regardless of task volume.",
        solana: "Pay-as-you-go. Every single job requires a transaction fee and a small reward for the processing keeper.",
        notes: "Offers more predictable cost-per-job unit economics, making it efficient for low-volume, high-value operations."
      }
    ],
    web2: {
      explanation: "Separates producers (APIs) from workers (background processors) using a Redis-backed queue to handle long-running tasks asynchronously.",
      implementations: [
        {
          name: "Node.js",
          folders: [
            {
              name: "src",
              files: [
                {
                  name: "app.js",
                  language: "javascript",
                  content: `const express = require("express")
const { Queue } = require("bullmq")

const app = express()
app.use(express.json())

const emailQueue = new Queue("emailQueue", {
  connection: { host: "localhost", port: 6379 }
})

app.post("/send-email", async (req,res)=>{

  const {email,message} = req.body

  await emailQueue.add("sendEmail",{email,message})

  res.json({status:"job queued"})

})

app.listen(3000)`
                },
                {
                  name: "worker.js",
                  language: "javascript",
                  content: `const { Worker } = require("bullmq")

const worker = new Worker("emailQueue", async job => {

  console.log("Sending email to", job.data.email)

})`
                }
              ]
            },
            {
              name: "root",
              files: [
                {
                  name: "package.json",
                  language: "json",
                  content: `{
  "dependencies": {
    "express": "^4.18.2",
    "bullmq": "^4.0.0",
    "ioredis": "^5.3.2"
  }
}`
                }
              ]
            }
          ]
        },
        {
          name: "Python (FastAPI)",
          folders: [
            {
              name: "src",
              files: [
                {
                  name: "app.py",
                  language: "python",
                  content: `from fastapi import FastAPI
from redis import Redis
from rq import Queue

app = FastAPI()

redis = Redis()
q = Queue(connection=redis)

def send_email(email,message):
    print("sending email to",email)

@app.post("/send-email")
def create_job(email:str,message:str):

    job = q.enqueue(send_email,email,message)

    return {"job_id":job.id}`
                },
                {
                  name: "worker.py",
                  language: "python",
                  content: `from redis import Redis
from rq import Worker, Queue

redis = Redis()

worker = Worker([Queue(connection=redis)])
worker.work()`
                }
              ]
            },
            {
              name: "root",
              files: [
                {
                  name: "requirements.txt",
                  language: "text",
                  content: "fastapi\nuvicorn\nredis\nrq"
                }
              ]
            }
          ]
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request
from redis import Redis
from rq import Queue

app = Flask(__name__)

redis = Redis()
queue = Queue(connection=redis)

def send_email(email,message):
    print("sending email",email)

@app.route("/send-email",methods=["POST"])
def job():

    data = request.json

    job = queue.enqueue(send_email,data["email"],data["message"])

    return {"job":job.id}

if __name__ == "__main__":
    app.run()`, "requirements.txt", "flask\nredis\nrq")
        },
        {
          name: "Java (Spring Boot)",
          folders: [
            {
              name: "src",
              files: [
                {
                  name: "JobController.java",
                  language: "java",
                  content: `import org.springframework.web.bind.annotation.*;
import redis.clients.jedis.Jedis;

@RestController
public class JobController {

    Jedis redis = new Jedis("localhost",6379);

    @PostMapping("/send-email")
    public String createJob(@RequestParam String email) {

        redis.lpush("emailQueue", email);

        return "job queued";
    }
}`
                },
                {
                  name: "Worker.java",
                  language: "java",
                  content: `import redis.clients.jedis.Jedis;

public class Worker {

    public static void main(String[] args) throws Exception {

        Jedis redis = new Jedis("localhost",6379);

        while(true){

            var job = redis.brpop(0,"emailQueue");

            System.out.println("processing job " + job.get(1));

        }

    }
}`
                }
              ]
            },
            {
              name: "root",
              files: [
                {
                  name: "pom.xml",
                  language: "xml",
                  content: `<project>
<dependencies>
<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
<groupId>redis.clients</groupId>
<artifactId>jedis</artifactId>
<version>5.0.0</version>
</dependency>
</dependencies>
</project>`
                }
              ]
            }
          ]
        },
        {
          name: "C# (.NET)",
          folders: [
            {
              name: "src",
              files: [
                {
                  name: "Program.cs",
                  language: "csharp",
                  content: `using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var redis = ConnectionMultiplexer.Connect("localhost:6379");
var db = redis.GetDatabase();

app.MapPost("/send-email", async (string email)=>{

    await db.ListLeftPushAsync("emailQueue",email);

    return "job queued";

});

app.Run();`
                },
                {
                  name: "Worker.cs",
                  language: "csharp",
                  content: `using StackExchange.Redis;

var redis = ConnectionMultiplexer.Connect("localhost:6379");
var db = redis.GetDatabase();

while(true)
{

    var job = db.ListRightPop("emailQueue");

    if(job.HasValue)
        Console.WriteLine("processing " + job);

}`
                }
              ]
            },
            {
              name: "root",
              files: [
                {
                  name: "jobqueue.csproj",
                  language: "xml",
                  content: `<Project Sdk="Microsoft.NET.Sdk">
<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>
<ItemGroup>
<PackageReference Include="StackExchange.Redis" Version="2.7.10" />
</ItemGroup>
</Project>`
                }
              ]
            }
          ]
        },
        {
          name: "Go",
          folders: [
            {
              name: "src",
              files: [
                {
                  name: "main.go",
                  language: "go",
                  content: `package main

import (
	"context"
	"fmt"
	"net/http"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

var rdb = redis.NewClient(&redis.Options{
	Addr: "localhost:6379",
})

func handler(w http.ResponseWriter, r *http.Request) {

	email := r.URL.Query().Get("email")

	rdb.LPush(ctx,"emailQueue",email)

	fmt.Fprintf(w,"job queued")

}

func main(){

	http.HandleFunc("/send-email",handler)

	http.ListenAndServe(":8080",nil)

}`
                },
                {
                  name: "worker.go",
                  language: "go",
                  content: `package main

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

func main(){

	rdb := redis.NewClient(&redis.Options{Addr:"localhost:6379"})

	for{

		job,_ := rdb.BRPop(ctx,0,"emailQueue").Result()

		fmt.Println("processing",job[1])

	}

}`
                }
              ]
            },
            {
              name: "root",
              files: [
                {
                  name: "go.mod",
                  language: "text",
                  content: "module jobqueue\n\ngo 1.21\n\nrequire github.com/redis/go-redis/v9 v9.0.0"
                }
              ]
            }
          ]
        }
      ]
    },
    web3: {
      explanation: "Accounts store job state. Process instruction verifies due time and executes logic.",
      programId: "7AgxB5wUW2tYksiWXW9pvmdiGCKRYSgL5sNcuXSm7Z5T",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/job_queue",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("JobQ11111111111111111111111111111111111111");

#[program]
pub mod job_queue {
    use super::*;

    /// Submits a new job to the on-chain queue.
    /// In Web2, we'd use 'bullmq.add()'. In Web3, we create a Job account.
    pub fn submit_job(ctx: Context<SubmitJob>, process_at: i64) -> Result<()> {
        let job = &mut ctx.accounts.job;
        job.owner = ctx.accounts.owner.key();
        job.process_at = process_at;
        job.is_completed = false;
        Ok(())
    }

    /// Processes a job if the time has passed.
    /// In Web3, external 'keepers' or 'cranks' must trigger this call.
    pub fn process_job(ctx: Context<ProcessJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        // Verify time constraints - similar to a worker's 'if due' check
        require!(
            clock.unix_timestamp >= job.process_at, 
            ErrorCode::NotReady
        );
        require!(!job.is_completed, ErrorCode::AlreadyProcessed);

        // Mark as done to prevent double-execution (Web3 idempotency)
        job.is_completed = true;

        // Perform job logic here...
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SubmitJob<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 8 + 1,
        seeds = [b"job", owner.key().as_ref(), &process_at.to_le_bytes()],
        bump
    )]
    pub job: Account<'info, JobState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessJob<'info> {
    #[account(mut)]
    pub job: Account<'info, JobState>,
    pub keeper: Signer<'info>, // The external actor triggering the work
}

#[account]
pub struct JobState {
    pub owner: Pubkey,
    pub process_at: i64,
    pub is_completed: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Job is not due for processing yet.")]
    NotReady,
    #[msg("Job has already been processed.")]
    AlreadyProcessed,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "job-queue"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/job-queue-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    sysvar::{clock::Clock, Sysvar},
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct JobState {
    pub owner: Pubkey,
    pub process_at: i64,
    pub is_completed: bool,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _signer = next_account_info(accounts_iter)?;
    let job_account = next_account_info(accounts_iter)?;

    msg!("Processing job in Native Rust");
    let mut job = JobState::try_from_slice(&job_account.data.borrow())?;
    let clock = Clock::get()?;

    if clock.unix_timestamp < job.process_at || job.is_completed {
        return Err(solana_program::program_error::ProgramError::Custom(1));
    }

    job.is_completed = true;
    job.serialize(&mut &mut job_account.data.borrow_mut()[..])?;
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "job-queue-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    User[User/DApp] -->|Submit Job| Program[Job Queue Program]
    Program -->|Create Account| JobAcc[Job State Account]
    Keeper[External Keeper/Crank] -->|Watch| JobAcc
    Keeper -->|Trigger if Due| Program
    Program -->|Verify & Execute| JobAcc
    JobAcc -->|Mark Completed| JobAcc`
    }
  },
  {
    slug: "api-key-management",
    id: "PATTERN_07",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/api-key-management",
    title: "API Key Management",
    description: "Secure on-chain credentials.",
    tags: ["Security"],
    theory: "In Web2, API keys are typically long-lived secrets generated by a server and stored in a database, often verified via HMAC or simple equality checks. On Solana, the concept of an 'API Key' shifts to public key authorization within a program's state. Instead of sharing a secret, a user's wallet address (their public key) is registered on-chain in a Program Derived Address (PDA) that acts as a whitelist. Authorization is then performed by verifying the user's cryptographic signature in the transaction against this on-chain registry, ensuring that only approved entities can execute specific program instructions.",
    constraints: [
      "**Registry PDA Storage**: Each authorized key must be stored in a unique PDA to allow for efficient lookups and individual management.\nNote: Use the authorized user's public key as a seed for the registry account PDA.",
      "**Signature Verification**: The program must explicitly check that the caller's public key matches the one stored in the registry and that the transaction is signed.\nNote: Anchor's `Signer` type automatically handles the signature check, but the PDA link must be manually verified or constrained in the account macro.",
      "**Revocation Mechanism**: A reliable way to disable keys is essential for security, requiring an 'active' flag or the deletion of the registry account.\nNote: Closing the account (burning it) is more gas-efficient than just flipping a boolean, as it reclaims rent SOL."
    ],
    tradeoffs: [
      {
        aspect: "Secret Management",
        web2: "Users must store and protect a 'Secret Key.' If leaked, their account is compromised and must be regenerated.",
        solana: "No secrets are shared. Authorization is based on the user's public key address and signature.",
        notes: "Significantly safer, as the user's private key never leaves their own secure wallet environment."
      },
      {
        aspect: "Revocation Transparency",
        web2: "Revocation is a private server event. Users cannot prove their key was revoked at a specific point in time.",
        solana: "Revocation is a public transaction on the ledger. Provides an immutable, verifiable audit trail.",
        notes: "Essential for high-security services and multi-party service level agreements requiring trustless proof."
      },
      {
        aspect: "On-chain Footprint",
        web2: "Scaling to millions of keys is trivial in a database. Negligible storage cost per key.",
        solana: "Each key requires its own PDA. Management of millions of keys requires careful rent and indexing planning.",
        notes: "Best suited for B2B or high-value service access than mass-market free APIs with millions of users."
      }
    ],
    web2: {
      explanation: "HMAC or hashed key verification.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const crypto = require("crypto")

const app = express()
app.use(express.json())

const apiKeys = new Map()

function generateKey(){
  return crypto.randomBytes(32).toString("hex")
}

app.post("/keys",(req,res)=>{

  const key = generateKey()

  apiKeys.set(key,{active:true})

  res.json({apiKey:key})

})

function auth(req,res,next){

  const key = req.headers["x-api-key"]

  if(!key || !apiKeys.has(key))
    return res.status(401).json({error:"invalid key"})

  next()

}

app.get("/data",auth,(req,res)=>{
  res.json({message:"secure data"})
})

app.listen(3000)`, "package.json", `{
  "dependencies": {
    "express": "^4.18.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, Header, HTTPException
import secrets

app = FastAPI()

api_keys = set()

@app.post("/keys")
def create_key():

    key = secrets.token_hex(32)

    api_keys.add(key)

    return {"api_key":key}

@app.get("/data")
def secure_data(x_api_key: str = Header()):

    if x_api_key not in api_keys:
        raise HTTPException(status_code=401, detail="invalid key")

    return {"message":"secure data"}`, "requirements.txt", `fastapi
uvicorn`)
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import secrets

app = Flask(__name__)

api_keys = set()

@app.route("/keys",methods=["POST"])
def create_key():

    key = secrets.token_hex(32)

    api_keys.add(key)

    return {"api_key":key}

@app.route("/data")
def data():

    key = request.headers.get("x-api-key")

    if key not in api_keys:
        return jsonify({"error":"invalid key"}),401

    return {"message":"secure data"}

if __name__ == "__main__":
    app.run()`, "requirements.txt", `flask`)
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "ApiKeyApplication.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.security.SecureRandom;
import java.util.*;

@SpringBootApplication
@RestController
public class ApiKeyApplication {

    Set<String> keys = new HashSet<>();

    String generateKey(){

        byte[] bytes = new byte[32];

        new SecureRandom().nextBytes(bytes);

        return Base64.getEncoder().encodeToString(bytes);

    }

    @PostMapping("/keys")
    public Map<String,String> createKey(){

        String key = generateKey();

        keys.add(key);

        return Map.of("apiKey",key);

    }

    @GetMapping("/data")
    public String data(HttpServletRequest request){

        String key = request.getHeader("x-api-key");

        if(!keys.contains(key))
            throw new RuntimeException("invalid key");

        return "secure data";

    }

    public static void main(String[] args) {
        SpringApplication.run(ApiKeyApplication.class, args);
    }
}`, "pom.xml", `<dependencies>

<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>

</dependencies>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using System.Security.Cryptography;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var keys = new HashSet<string>();

string GenerateKey()
{
    var bytes = RandomNumberGenerator.GetBytes(32);
    return Convert.ToHexString(bytes);
}

app.MapPost("/keys",()=>{

    var key = GenerateKey();

    keys.Add(key);

    return Results.Ok(new { apiKey = key });

});

app.MapGet("/data",(HttpRequest req)=>{

    var key = req.Headers["x-api-key"].ToString();

    if(!keys.Contains(key))
        return Results.Unauthorized();

    return Results.Ok("secure data");

});

app.Run();`, "apikey.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
)

var apiKeys = map[string]bool{}

func generateKey() string {

	b := make([]byte,32)

	rand.Read(b)

	return hex.EncodeToString(b)

}

func createKey(w http.ResponseWriter,r *http.Request){

	key := generateKey()

	apiKeys[key] = true

	fmt.Fprintf(w,key)

}

func data(w http.ResponseWriter,r *http.Request){

	key := r.Header.Get("x-api-key")

	if !apiKeys[key] {

		w.WriteHeader(401)
		return

	}

	fmt.Fprintf(w,"secure data")

}

func main(){

	http.HandleFunc("/keys",createKey)

	http.HandleFunc("/data",data)

	http.ListenAndServe(":8080",nil)

}`, "go.mod", `module apikey

go 1.21`)
        }
      ]
    },
    web3: {
      explanation: "Registry PDA stores a whitelist of Pubkeys authorized to call instructions.",
      programId: "BdmZeEzG8eNqNGxtMQ1YP8ZDPy1Di4JkTLYQWkrwpsQA",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/api_key_registry",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("Keys11111111111111111111111111111111111111");

#[program]
pub mod api_key_registry {
    use super::*;

    /// Registers a new "API Key" (Wallet Pubkey) into the authorized registry.
    /// In Web3, the "Key" is the user's signature, verified against this list.
    pub fn register_key(ctx: Context<RegisterKey>, label: String) -> Result<()> {
        let registry_entry = &mut ctx.accounts.registry_entry;
        registry_entry.authorized_pubkey = ctx.accounts.target_user.key();
        registry_entry.is_active = true;
        registry_entry.label = label;
        Ok(())
    }

    /// Revokes an "API Key" by flipping the active bit on the registry PDA.
    pub fn revoke_key(ctx: Context<RevokeKey>) -> Result<()> {
        let registry_entry = &mut ctx.accounts.registry_entry;
        registry_entry.is_active = false;
        Ok(())
    }

    /// Gated instruction that only authorized wallets can call.
    pub fn authorized_call(ctx: Context<AuthorizedCall>) -> Result<()> {
        let entry = &ctx.accounts.registry_entry;
        require!(entry.is_active, ErrorCode::RevokedKey);
        
        // Secured logic here...
        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterKey<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub target_user: SystemAccount<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1 + 64, // Disc + Pubkey + bool + String label
        seeds = [b"api_key", target_user.key().as_ref()],
        bump
    )]
    pub registry_entry: Account<'info, RegistryEntry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeKey<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"api_key", registry_entry.authorized_pubkey.as_ref()],
        bump
    )]
    pub registry_entry: Account<'info, RegistryEntry>,
}

#[derive(Accounts)]
pub struct AuthorizedCall<'info> {
    pub user: Signer<'info>,
    #[account(
        seeds = [b"api_key", user.key().as_ref()],
        bump
    )]
    pub registry_entry: Account<'info, RegistryEntry>,
}

#[account]
pub struct RegistryEntry {
    pub authorized_pubkey: Pubkey,
    pub is_active: bool,
    pub label: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("This key has been revoked and is no longer authorized.")]
    RevokedKey,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "api-key-registry"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/api-key-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct RegistryEntry {
    pub authorized_pubkey: Pubkey,
    pub is_active: bool,
    pub label: String,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _admin = next_account_info(accounts_iter)?;
    let entry_account = next_account_info(accounts_iter)?;

    msg!("Checking API key in Native Rust");
    let mut entry = RegistryEntry::try_from_slice(&entry_account.data.borrow())?;
    
    match instruction_data[0] {
        1 => { // Revoke
            entry.is_active = false;
            entry.serialize(&mut &mut entry_account.data.borrow_mut()[..])?;
        },
        _ => (),
    }

    if !entry.is_active {
        return Err(solana_program::program_error::ProgramError::Custom(2));
    }

    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "api-key-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    Admin[Admin Wallet] -->|Register Pubkey| Program[Registry Program]
    Program -->|Create Entry| PDA[Registry PDA]
    User[User Wallet] -->|Signed Call| Program
    Program -->|Derive PDA| PDA
    PDA -->|Verify is_active| Program
    Program -->|Execute Logic| Final[Secure Action]`
    }
  },
  {
    slug: "leaderboard-ranking",
    id: "PATTERN_08",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/leaderboard-ranking",
    title: "Leaderboard",
    description: "Global score tracking.",
    tags: ["Gaming", "Social"],
    theory: "Web2 leaderboards commonly leverage Redis sorted sets (ZSETs) for logarithmic time complexity updates and retrievals, easily handling millions of players. On Solana, implementing a global leaderboard requires careful account size management since accounts are limited to 10MB and frequent resizing is expensive. Developers often use fixed-size arrays in a single PDA for 'Top 100' lists or more complex structures like on-chain Merkle Trees or Red-Black Trees for larger verifiable rankings. This architectural choice forces a tradeoff between the granularity of the ranking and the transaction costs associated with sorting and updating the state on-chain.",
    constraints: [
      "**Account Size Limits**: Solana accounts have a maximum size of 10MB, which limits the number of entries that can be stored in a single flat array.\nNote: Calculate the byte size of each entry (Pubkey + Score) to determine the maximum capacity before reaching the limit.",
      "**Sorting Logic Efficiency**: On-chain sorting is computationally expensive and can quickly exceed the transaction compute budget.\nNote: Offload complex sorting to the client or use an 'insertion sort' approach where only the relevant portion of the list is shifted.",
      "**Concurrency Bottlenecks**: A single global leaderboard PDA can become a write bottleneck as only one transaction can modify it at a time.\nNote: Use multiple 'sharded' leaderboards or a tiered system (e.g., daily vs. all-time) to distribute the write load."
    ],
    tradeoffs: [
      {
        aspect: "Integrity",
        web2: "Vulnerable to database manipulation or 'fake' scores submitted by compromised server environments.",
        solana: "Every submission is a signed transaction. The logic for updating the ranking is immutable and public.",
        notes: "Ideal for 'Play-to-Earn' games where a high ranking has real monetary value and requires trustless proof."
      },
      {
        aspect: "Performance",
        web2: "O(log N) updates in Redis. Can handle millions of players with near-instant ranking refreshes.",
        solana: "Sorting large lists on-chain is extremely expensive. Most are limited to 'Top 100' or use off-chain indexing.",
        notes: "A classic trade-off between total throughput and the benefit of trustless, verifiable score calculations."
      },
      {
        aspect: "Data Accessibility",
        web2: "Private, siloed data. Only the developer can export or analyze the full history of the rankings.",
        solana: "Public state. Anyone can build a third-party explorer or analytics tool for the game's ranking history.",
        notes: "Encourages a richer ecosystem of community-built tools, bots, and secondary platforms for the application."
      }
    ],
    web2: {
      explanation: "Sorted set operations in Redis.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const Redis = require("ioredis")

const app = express()
app.use(express.json())

const redis = new Redis()

app.post("/score", async (req,res)=>{

  const {user,score} = req.body

  await redis.zadd("leaderboard",score,user)

  res.json({status:"score updated"})

})

app.get("/top", async (req,res)=>{

  const top = await redis.zrevrange("leaderboard",0,9,"WITHSCORES")

  res.json(top)

})

app.listen(3000)`, "package.json", `{
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI
import redis

app = FastAPI()

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

@app.post("/score")
def update_score(user:str,score:int):

    r.zadd("leaderboard",{user:score})

    return {"status":"updated"}

@app.get("/top")
def top():

    return r.zrevrange("leaderboard",0,9,withscores=True)`, "requirements.txt", `fastapi
uvicorn
redis`)
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request
import redis

app = Flask(__name__)

r = redis.Redis(host="localhost",port=6379,decode_responses=True)

@app.route("/score",methods=["POST"])
def score():

    data = request.json

    r.zadd("leaderboard",{data["user"]:data["score"]})

    return {"status":"updated"}

@app.route("/top")
def top():

    return r.zrevrange("leaderboard",0,9,withscores=True)

if __name__ == "__main__":
    app.run()`, "requirements.txt", `flask
redis`)
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "LeaderboardApplication.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import redis.clients.jedis.Jedis;

@SpringBootApplication
@RestController
public class LeaderboardApplication {

    Jedis redis = new Jedis("localhost",6379);

    @PostMapping("/score")
    public String update(@RequestParam String user, @RequestParam int score){

        redis.zadd("leaderboard",score,user);

        return "updated";

    }

    @GetMapping("/top")
    public Object top(){

        return redis.zrevrangeWithScores("leaderboard",0,9);

    }

    public static void main(String[] args) {
        SpringApplication.run(LeaderboardApplication.class,args);
    }
}`, "pom.xml", `<dependencies>

<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
<groupId>redis.clients</groupId>
<artifactId>jedis</artifactId>
<version>5.0.0</version>
</dependency>

</dependencies>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var redis = ConnectionMultiplexer.Connect("localhost:6379");
var db = redis.GetDatabase();

app.MapPost("/score", async (string user,int score)=>{

    await db.SortedSetAddAsync("leaderboard",user,score);

    return "updated";

});

app.MapGet("/top", async ()=>{

    var res = await db.SortedSetRangeByRankWithScoresAsync("leaderboard",0,9,Order.Descending);

    return res;

});

app.Run();`, "leaderboard.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>

<ItemGroup>
<PackageReference Include="StackExchange.Redis" Version="2.7.10" />
</ItemGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"context"
	"encoding/json"
	"net/http"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

var rdb = redis.NewClient(&redis.Options{Addr:"localhost:6379"})

func score(w http.ResponseWriter,r *http.Request){

	var body struct{User string; Score float64}

	json.NewDecoder(r.Body).Decode(&body)

	rdb.ZAdd(ctx,"leaderboard",redis.Z{Score:body.Score,Member:body.User})

	w.Write([]byte("updated"))

}

func top(w http.ResponseWriter,r *http.Request){

	res,_ := rdb.ZRevRangeWithScores(ctx,"leaderboard",0,9).Result()

	json.NewEncoder(w).Encode(res)

}

func main(){

	http.HandleFunc("/score",score)

	http.HandleFunc("/top",top)

	http.ListenAndServe(":8080",nil)

}`, "go.mod", `module leaderboard

go 1.21

require github.com/redis/go-redis/v9 v9.0.0`)
        }
      ]
    },
    web3: {
      explanation: "Leaderboard PDA stores the top N scores and wallet addresses.",
      programId: "GDXdtax9eoW2DSDQUkweFdEwyMq8foKRq3oo56hZUQM",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/leaderboard",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("Rank11111111111111111111111111111111111111");

#[program]
pub mod leaderboard {
    use super::*;

    /// Submits a score and updates the top 10 rankings if necessary.
    /// Web2's Redis 'zadd' is fast. In Web3, we must manually sort or use data structures.
    pub fn submit_score(ctx: Context<SubmitScore>, score: u64) -> Result<()> {
        let lb = &mut ctx.accounts.leaderboard;
        let user = ctx.accounts.user.key();

        // Find if user is already in top 10 or if new score beats the lowest top score
        let mut scores = lb.entries.to_vec();
        
        // Simplified: Add new score and sort
        scores.push(ScoreEntry { player: user, value: score });
        scores.sort_by(|a, b| b.value.cmp(&a.value));
        scores.truncate(10); // Keep only top 10

        // Write back to account
        for (i, entry) in scores.iter().enumerate() {
            lb.entries[i] = *entry;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SubmitScore<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"leaderboard"],
        bump
    )]
    pub leaderboard: Account<'info, GlobalLeaderboard>,
}

#[account]
pub struct GlobalLeaderboard {
    pub entries: [ScoreEntry; 10], // Fixed size for account storage predictability
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct ScoreEntry {
    pub player: Pubkey,
    pub value: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Score submission failed.")]
    SubmissionError,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "leaderboard"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "src",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, Default, Debug)]
pub struct ScoreEntry {
    pub player: Pubkey,
    pub value: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GlobalLeaderboard {
    pub entries: [ScoreEntry; 10],
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let user = next_account_info(accounts_iter)?;
    let lb_account = next_account_info(accounts_iter)?;

    msg!("Submitting score in Native Leaderboard");
    let mut lb = GlobalLeaderboard::try_from_slice(&lb_account.data.borrow())?;
    
    // Manual scoring logic...
    lb.entries[0] = ScoreEntry {
        player: *user.key,
        value: 1000,
    };

    lb.serialize(&mut &mut lb_account.data.borrow_mut()[..])?;
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "leaderboard-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    Player[Player/User] -->|Submit Score| Program[Leaderboard Program]
    Program -->|Fetch State| LBAcc[Leaderboard PDA]
    LBAcc -->|Current Rankings| Program
    Program -->|Sort & Update| LBAcc
    LBAcc -->|Global Top Scores| Client[Frontend/UI]`
    }
  },
  {
    slug: "auction-engine",
    id: "PATTERN_09",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/auction-engine",
    title: "Auction Engine",
    description: "Trustless bidding logic.",
    tags: ["DeFi", "NFTs"],
    theory: "Web2 auctions (like eBay) rely on centralized databases to track bids and timers, with a trusted server making the final determination of the winner. On Solana, this process is decentralized and immutable. The Auction Engine pattern uses a program-owned account (PDA) to store the current highest bid, the bidder's identity, and the auction's end timestamp. When a new bid is placed, the program atomically verifies that the bid amount exceeds the current leader and that the auction hasn't expired according to the network's consensus clock. Bids are trustlessly held in escrow, ensuring that the highest bidder's funds are secured and that outbid participants can be refunded instantly through automated program logic.",
    constraints: [
      "**Atomic Bid Comparison**: The program must guarantee that the incoming bid is strictly greater than the current record in a single atomic transaction.\nNote: Use Solana's account locking to prevent multiple bidders from competing for the same 'highest bid' slot simultaneously, avoiding race conditions.",
      "**Clock Sysvar Synchronization**: The auction's lifecycle depends on the `Clock` sysvar for a network-wide consensus on the current time.\nNote: Developers should account for minor variations in slot times and ensure that the 'end_at' timestamp provides a fair window for all network participants.",
      "**Trustless Fund Escrow**: Every bid must be backed by a transfer of assets into a program-controlled vault account.\nNote: This ensures the winner's payment is already secured; for outbid participants, the program should implement a 'push' or 'pull' refund mechanism to return their collateral safely."
    ],
    tradeoffs: [
      {
        aspect: "Fairness",
        web2: "Auction owners can see 'hidden' bids or manipulate the timer to favor specific bidders.",
        solana: "The code is the law. All bids and time limits are enforced by the entire network's consensus.",
        notes: "Eliminates 'Auction Sniping' and manipulation by predictable, cryptographically transparent rules."
      },
      {
        aspect: "Capital Efficiency",
        web2: "'Bid now, pay later.' Funds are typically only transferred after the auction officially ends.",
        solana: "Uses 'Committed Bidding.' Funds are trustlessly locked in a vault the moment a bid is placed.",
        notes: "Removes the problem of 'non-paying winners' and ensures assets are always backed by collateral."
      },
      {
        aspect: "Refund Logic",
        web2: "Manual or semi-automated refunds for outbid participants, often taking days to clear through banks.",
        solana: "Atomic or user-triggered refunds. Funds return the instant a higher bid is verified on the network.",
        notes: "Reduces the 'Opportunity Cost' for bidders participating in multiple concurrent auctions."
      }
    ],
    web2: {
      explanation: "Server-side timers and bidding logic.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const Redis = require("ioredis")

const app = express()
app.use(express.json())

const redis = new Redis()

app.post("/auction", async (req,res)=>{

  const {id,item} = req.body

  await redis.hset(\`auction:\${id}\`,{
    item,
    highestBid:0,
    highestBidder:""
  })

  res.json({status:"auction created"})

})

app.post("/bid", async (req,res)=>{

  const {auctionId,user,bid} = req.body

  const auction = await redis.hgetall(\`auction:\${auctionId}\`)

  if(Number(bid) <= Number(auction.highestBid))
    return res.status(400).json({error:"bid too low"})

  await redis.hset(\`auction:\${auctionId}\`,{
    highestBid:bid,
    highestBidder:user
  })

  res.json({status:"bid accepted"})

})

app.get("/auction/:id", async (req,res)=>{

  const auction = await redis.hgetall(\`auction:\${req.params.id}\`)

  res.json(auction)

})

app.listen(3000)`, "package.json", `{
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, HTTPException
import redis

app = FastAPI()

r = redis.Redis(host="localhost",port=6379,decode_responses=True)

@app.post("/auction")
def create(id:str,item:str):

    r.hset(f"auction:{id}",mapping={
        "item":item,
        "highestBid":0,
        "highestBidder":""
    })

    return {"status":"auction created"}

@app.post("/bid")
def bid(auctionId:str,user:str,bid:int):

    auction = r.hgetall(f"auction:{auctionId}")

    if bid <= int(auction["highestBid"]):
        raise HTTPException(status_code=400,detail="bid too low")

    r.hset(f"auction:{auctionId}",mapping={
        "highestBid":bid,
        "highestBidder":user
    })

    return {"status":"bid accepted"}

@app.get("/auction/{id}")
def get_auction(id:str):

    return r.hgetall(f"auction:{id}")`, "requirements.txt", `fastapi
uvicorn
redis`)
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import redis

app = Flask(__name__)

r = redis.Redis(host="localhost",port=6379,decode_responses=True)

@app.route("/auction",methods=["POST"])
def create():

    data = request.json

    r.hset(f"auction:{data['id']}",mapping={
        "item":data["item"],
        "highestBid":0,
        "highestBidder":""
    })

    return {"status":"auction created"}

@app.route("/bid",methods=["POST"])
def bid():

    data = request.json

    auction = r.hgetall(f"auction:{data['auctionId']}")

    if int(data['bid']) <= int(auction['highestBid']):
        return jsonify({"error":"bid too low"}),400

    r.hset(f"auction:{data['auctionId']}",mapping={
        "highestBid":data['bid'],
        "highestBidder":data['user']
    })

    return {"status":"bid accepted"}

if __name__ == "__main__":
    app.run()`, "requirements.txt", `flask
redis`)
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "AuctionApplication.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import redis.clients.jedis.Jedis;

@SpringBootApplication
@RestController
public class AuctionApplication {

    Jedis redis = new Jedis("localhost",6379);

    @PostMapping("/auction")
    public String create(@RequestParam String id,@RequestParam String item){

        redis.hset("auction:"+id,"item",item);
        redis.hset("auction:"+id,"highestBid","0");
        redis.hset("auction:"+id,"highestBidder","");

        return "auction created";

    }

    @PostMapping("/bid")
    public String bid(@RequestParam String auctionId,@RequestParam String user,@RequestParam int bid){

        String current = redis.hget("auction:"+auctionId,"highestBid");

        if(bid <= Integer.parseInt(current))
            throw new RuntimeException("bid too low");

        redis.hset("auction:"+auctionId,"highestBid",String.valueOf(bid));
        redis.hset("auction:"+auctionId,"highestBidder",user);

        return "bid accepted";

    }

    public static void main(String[] args){
        SpringApplication.run(AuctionApplication.class,args);
    }
}`, "pom.xml", `<dependencies>

<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
<groupId>redis.clients</groupId>
<artifactId>jedis</artifactId>
<version>5.0.0</version>
</dependency>

</dependencies>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var redis = ConnectionMultiplexer.Connect("localhost:6379");
var db = redis.GetDatabase();

app.MapPost("/auction", async (string id,string item)=>{

    await db.HashSetAsync($"auction:{id}", new HashEntry[]{
        new("item",item),
        new("highestBid",0),
        new("highestBidder","")
    });

    return "auction created";

});

app.MapPost("/bid", async (string auctionId,string user,int bid)=>{

    var current = await db.HashGetAsync($"auction:{auctionId}","highestBid");

    if(bid <= (int)current)
        return Results.BadRequest("bid too low");

    await db.HashSetAsync($"auction:{auctionId}", new HashEntry[]{
        new("highestBid",bid),
        new("highestBidder",user)
    });

    return "bid accepted";

});

app.Run();`, "auction.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>

<ItemGroup>
<PackageReference Include="StackExchange.Redis" Version="2.7.10" />
</ItemGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"context"
	"encoding/json"
	"net/http"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

var rdb = redis.NewClient(&redis.Options{Addr:"localhost:6379"})

func create(w http.ResponseWriter,r *http.Request){

	var body struct{ID string; Item string}

	json.NewDecoder(r.Body).Decode(&body)

	rdb.HSet(ctx,"auction:"+body.ID,map[string]interface{}{
		"item":body.Item,
		"highestBid":0,
		"highestBidder":"",
	})

	w.Write([]byte("auction created"))

}

func bid(w http.ResponseWriter,r *http.Request){

	var body struct{AuctionID string; User string; Bid int}

	json.NewDecoder(r.Body).Decode(&body)

	current,_ := rdb.HGet(ctx,"auction:"+body.AuctionID,"highestBid").Int()

	if body.Bid <= current{
		w.WriteHeader(400)
		return
	}

	rdb.HSet(ctx,"auction:"+body.AuctionID,map[string]interface{}{
		"highestBid":body.Bid,
		"highestBidder":body.User,
	})

	w.Write([]byte("bid accepted"))

}

func main(){

	http.HandleFunc("/auction",create)

	http.HandleFunc("/bid",bid)

	http.ListenAndServe(":8080",nil)

}`, "go.mod", `module auction

go 1.21

require github.com/redis/go-redis/v9 v9.0.0`)
        }
      ]
    },
    web3: {
      explanation: "PDA stores current highest bid and expiry.",
      programId: "DEvYCdsNiLK998bxX4EB59pPnuAvrJhgG6VThjZb5T8d",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/auction",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("DEvYCdsNiLK998bxX4EB59pPnuAvrJhgG6VThjZb5T8d");

#[program]
pub mod auction_engine {
    use super::*;

    /// Initializes a new auction. 
    /// In Web2, this is a database entry. In Web3, it's a program-owned PDA.
    pub fn initialize_auction(ctx: Context<InitializeAuction>, item_id: String, end_ts: i64) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        auction.seller = ctx.accounts.seller.key();
        auction.highest_bid = 0;
        auction.end_at = end_ts;
        Ok(())
    }

    /// Places a bid. The bid amount must be greater than the current top bid.
    /// In Web3, bid funds are typically held in escrow until outbid or the auction ends.
    pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        // Verify auction is still active
        require!(clock.unix_timestamp < auction.end_at, ErrorCode::AuctionEnded);
        
        // Verify bid is higher - the "Atomic Compare-and-Swap" of Web3
        require!(amount > auction.highest_bid, ErrorCode::BidTooLow);

        // Update state
        auction.highest_bid = amount;
        auction.highest_bidder = ctx.accounts.bidder.key();

        // Transfer funds logic (CPI to Token Program) would happen here
        // ...

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(item_id: String)]
pub struct InitializeAuction<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 32 + 8 + 8,
        seeds = [b"auction", item_id.as_bytes()],
        bump
    )]
    pub auction: Account<'info, AuctionState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, AuctionState>,
}

#[account]
pub struct AuctionState {
    pub seller: Pubkey,
    pub highest_bidder: Pubkey,
    pub highest_bid: u64,
    pub end_at: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The auction has already ended.")]
    AuctionEnded,
    #[msg("Your bid must be higher than the current highest bid.")]
    BidTooLow,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "auction"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/auction-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    sysvar::{clock::Clock, Sysvar},
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionState {
    pub seller: Pubkey,
    pub highest_bidder: Pubkey,
    pub highest_bid: u64,
    pub end_at: i64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let bidder = next_account_info(accounts_iter)?;
    let auction_account = next_account_info(accounts_iter)?;

    msg!("Placing bid in Native Auction");
    let mut auction = AuctionState::try_from_slice(&auction_account.data.borrow())?;
    let clock = Clock::get()?;

    if clock.unix_timestamp > auction.end_at {
        return Err(solana_program::program_error::ProgramError::Custom(3));
    }

    // Manual bid validation
    let bid_amount = u64::from_le_bytes(instruction_data[1..9].try_into().unwrap());
    if bid_amount <= auction.highest_bid {
        return Err(solana_program::program_error::ProgramError::Custom(4));
    }

    auction.highest_bid = bid_amount;
    auction.highest_bidder = *bidder.key;
    auction.serialize(&mut &mut auction_account.data.borrow_mut()[..])?;
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "auction-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    Seller[Seller] -->|Initialize| Program[Auction Program]
    Program -->|Create| State[Auction State PDA]
    BidderA[Bidder A] -->|1. Bid $100| Program
    Program -->|Escrow Funds| Vault[Vault PDA]
    Program -->|Update Highest| State
    BidderB[Bidder B] -->|2. Bid $150| Program
    Program -->|Escrow Funds| Vault
    Program -->|Refund Bidder A| BidderA
    Program -->|Update Highest| State
    Timer[Clock Sysvar] -->|3. Expiry Check| Program
    Program -->|Finalize| Seller`
    }
  },
  {
    slug: "idempotency-key",
    id: "PATTERN_10",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/idempotency",
    title: "Idempotency",
    description: "Single-execution enforcement.",
    tags: ["Reliability"],
    theory: "In Web2 development, idempotency is often handled by including a unique 'Idempotency-Key' in HTTP headers, which the server stores in a fast cache (like Redis) for a short duration to prevent processing the same request twice (e.g., during a network retry). On Solana, idempotency is enforced by using a unique value—often a nonce or a client-generated key—as a seed for a Program Derived Address (PDA). Because an account can only be initialized once, the program can ensure that a specific operation (like a payment or an order) is never executed more than once. This shifts the responsibility of state tracking from a transient cache to the immutable ledger, providing absolute reliability even in the face of erratic network conditions.",
    constraints: [
      "**PDA-Based Nonce Enforcement**: Every idempotent instruction must attempt to 'init' a PDA derived from a unique client key.\nNote: Using `init` in Anchor's `Accounts` struct automatically causes the transaction to fail if the PDA already exists, providing a zero-latency check.",
      "**Atomic Nonce Expiration**: To manage on-chain storage costs, idempotency accounts should include a timestamp and a cleanup mechanism.\nNote: Developers should implement a 'close' instruction that allows users or bots to reclaim the rent SOL after the idempotency period (e.g., 24 hours) has passed.",
      "**Deterministic Key Generation**: Clients must generate a unique 32-byte key for every intended operation to ensure no two requests share a nonce.\nNote: Use a secure random generator or hash the request parameters together with a client-side timestamp to create the idempotency seed."
    ],
    tradeoffs: [
      {
        aspect: "Execution Overhead",
        web2: "Fast in-memory check (Redis). Keys are transient and typically expire within minutes or hours automatically.",
        solana: "Requires initializing a persistent PDA on-chain. Involves a one-time rent cost and a permanent entry on the ledger.",
        notes: "Provides an absolute, immutable guarantee of single-execution, even across different client versions or network reorgs."
      },
      {
        aspect: "Storage Lifespan",
        web2: "Automatically cleaned up by TTL (Time-To-Live) settings in the cache. No manual maintenance required.",
        solana: "Persists until the account is explicitly closed. Programs must implement a 'cleanup' instruction to reclaim rent SOL.",
        notes: "Shifts the responsibility of data management to the user or an automated bot (Crank) to keep the state bloat-free."
      },
      {
        aspect: "Failure Modes",
        web2: "If the Redis cache is unavailable, the system might accidentally double-process requests during retries.",
        solana: "If the transaction lands, the idempotency is guaranteed by the protocol itself. There is no external cache to fail.",
        notes: "Essential for high-stakes financial operations where double-spending or duplicate orders are catastrophic."
      }
    ],
    web2: {
      explanation: "Database unique constraints and TTL cache.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const Redis = require("ioredis")

const app = express()
app.use(express.json())

const redis = new Redis()

app.post("/order", async (req, res) => {
  const key = req.header("Idempotency-Key")

  if (!key) return res.status(400).send("Missing Idempotency-Key")

  const existing = await redis.get(key)

  if (existing) {
    return res.json(JSON.parse(existing))
  }

  const result = {
    orderId: Math.floor(Math.random() * 100000),
    status: "created"
  }

  await redis.set(key, JSON.stringify(result), "EX", 3600)

  res.json(result)
})

app.listen(3000)`, "package.json", `{
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, Header, HTTPException
import redis
import json
import random

app = FastAPI()
r = redis.Redis()

@app.post("/order")
def create_order(idempotency_key: str = Header(None)):

    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Missing Idempotency-Key")

    existing = r.get(idempotency_key)

    if existing:
        return json.loads(existing)

    result = {
        "orderId": random.randint(1,100000),
        "status": "created"
    }

    r.setex(idempotency_key,3600,json.dumps(result))

    return result`, "requirements.txt", `fastapi
uvicorn
redis`)
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import redis
import json
import random

app = Flask(__name__)
r = redis.Redis()

@app.route("/order", methods=["POST"])
def order():

    key = request.headers.get("Idempotency-Key")

    if not key:
        return "Missing Idempotency-Key", 400

    existing = r.get(key)

    if existing:
        return jsonify(json.loads(existing))

    result = {
        "orderId": random.randint(1,100000),
        "status": "created"
    }

    r.setex(key,3600,json.dumps(result))

    return jsonify(result)

app.run()`, "requirements.txt", `flask
redis`)
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "Application.java", `import org.springframework.web.bind.annotation.*;
import redis.clients.jedis.Jedis;
import java.util.*;

@RestController
public class Application {

    Jedis redis = new Jedis("localhost");

    @PostMapping("/order")
    public Map<String,Object> order(@RequestHeader("Idempotency-Key") String key){

        String existing = redis.get(key);

        if(existing != null){
            return Map.of("cached", existing);
        }

        Map<String,Object> result = new HashMap<>();
        result.put("orderId", new Random().nextInt(100000));
        result.put("status","created");

        redis.setex(key,3600,result.toString());

        return result;
    }
}`, "pom.xml", `<dependencies>

<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
<groupId>redis.clients</groupId>
<artifactId>jedis</artifactId>
<version>4.3.1</version>
</dependency>

</dependencies>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using StackExchange.Redis;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var redis = ConnectionMultiplexer.Connect("localhost:6379");
var db = redis.GetDatabase();

app.MapPost("/order", async (HttpRequest req) =>
{
    var key = req.Headers["Idempotency-Key"].ToString();

    if(string.IsNullOrEmpty(key))
        return Results.BadRequest("Missing Idempotency-Key");

    var existing = await db.StringGetAsync(key);

    if(existing.HasValue)
        return Results.Content(existing);

    var result = new {
        orderId = new Random().Next(100000),
        status = "created"
    };

    var json = JsonSerializer.Serialize(result);

    await db.StringSetAsync(key,json,TimeSpan.FromHours(1));

    return Results.Content(json);
});

app.Run();`, "idempotency.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">

<PropertyGroup>
<TargetFramework>net7.0</TargetFramework>
</PropertyGroup>

<ItemGroup>
<PackageReference Include="StackExchange.Redis" Version="2.7.33" />
</ItemGroup>

</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
    "context"
    "encoding/json"
    "math/rand"
    "net/http"

    "github.com/go-redis/redis/v8"
)

var ctx = context.Background()
var rdb = redis.NewClient(&redis.Options{Addr: "localhost:6379"})

func order(w http.ResponseWriter, r *http.Request) {

    key := r.Header.Get("Idempotency-Key")

    if key == "" {
        http.Error(w, "Missing Idempotency-Key", 400)
        return
    }

    existing, _ := rdb.Get(ctx, key).Result()

    if existing != "" {
        w.Write([]byte(existing))
        return
    }

    result := map[string]interface{}{
        "orderId": rand.Intn(100000),
        "status": "created",
    }

    jsonData, _ := json.Marshal(result)

    rdb.Set(ctx, key, jsonData, 0)

    w.Write(jsonData)
}

func main() {
    http.HandleFunc("/order", order)
    http.ListenAndServe(":8080", nil)
}`, "go.mod", `module idempotency

go 1.20

require github.com/go-redis/redis/v8 v8.11.5`)
        }
      ]
    },
    web3: {
      explanation: "Registers a unique ID in a PDA to mark a transaction as processed.",
      programId: "DzBV9RhbE5WCNscwPBSwYrCEWFxDRMSkM5oWYKktMonr",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/idempotency",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("Idem11111111111111111111111111111111111111");

#[program]
pub mod idempotency {
    use super::*;

    /// Executes an instruction with a required idempotency key (nonce).
    /// In Web2, we'd check a Redis 'Idempotency-Key' header. 
    /// In Web3, we try to initialize a PDA using the key as a seed. 
    /// If it already exists, the transaction fails (at the account level).
    pub fn process_order(ctx: Context<ProcessOrder>, idempotency_key: [u8; 32]) -> Result<()> {
        let nonce = &mut ctx.accounts.nonce;
        nonce.used = true;
        
        // Execute the sensitive logic (e.g., spending funds) here...
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(idempotency_key: [u8; 32])]
pub struct ProcessOrder<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init, // This will fail if a PDA with these seeds already exists
        payer = user,
        space = 8 + 1,
        seeds = [b"nonce", user.key().as_ref(), &idempotency_key],
        bump
    )]
    pub nonce: Account<'info, NonceState>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct NonceState {
    pub used: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("This operation has already been executed with the provided key.")]
    DuplicateKey,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "idempotency"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/idempotency-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct NonceState {
    pub used: bool,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _user = next_account_info(accounts_iter)?;
    let nonce_account = next_account_info(accounts_iter)?;

    msg!("Checking idempotency in Native Rust");
    // Manual PDA check would happen here...

    if !nonce_account.data_is_empty() {
        return Err(solana_program::program_error::ProgramError::AccountAlreadyInitialized);
    }

    let data = NonceState { used: true };
    data.serialize(&mut &mut nonce_account.data.borrow_mut()[..])?;
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "idempotency-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    Client[Client/DApp] -->|1. Generate Key| Client
    Client -->|2. Call Instruction with Key| Program[Idempotency Program]
    Program -->|3. Try Initialize| NoncePDA[Nonce Account PDA]
    NoncePDA -->|Success: First Call| Action[Execute Business Logic]
    NoncePDA -->|Error: Duplicate Call| Revert[Transaction Reverts]
    Action -->|Record Used| NoncePDA`
    }
  },
  {
    slug: "circuit-breaker",
    id: "PATTERN_11",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/circuit-breaker",
    title: "Circuit Breaker",
    description: "Fail-safe pausing mechanism.",
    tags: ["Security", "Reliability"],
    theory: "Web2 circuit breakers are distributed failure-handling patterns designed to prevent cascading failures in microservices (e.g., stopping calls to a failing database to allow it to recover). On Solana, the circuit breaker pattern functions as a governance-controlled killswitch. It uses a global configuration PDA to store a 'paused' state, which is then checked at the beginning of every critical program instruction. This allows administrators or a Decentralized Autonomous Organization (DAO) to instantly pause all program functionality during an emergency, such as a discovered exploit or an economic attack, ensuring that funds and state remain secure while a fix is developed and deployed.",
    constraints: [
      "**Centralized Admin Authority**: Only a designated 'emergency admin' or a multi-signature wallet should have the permission to trigger the circuit breaker.\nNote: This authority is established during the program's initialization and should be easily transferable to a DAO for more decentralized control.",
      "**Instruction-Level Gating**: Every instruction that modifies on-chain state must explicitly check the 'is_paused' flag in the global configuration account.\nNote: In Anchor, this can be efficiently handled using the `require!` macro or a custom instruction attribute to ensure a consistent and secure check across the entire program.",
      "**Emergency Recovery Pathway**: The program must define a clear process for 'un-pausing' the system once the threat has been mitigated.\nNote: Developers should consider including a time-lock mechanism where the system can only be resumed after a specific delay, allowing all participants to prepare for the resumption of activity."
    ],
    tradeoffs: [
      {
        aspect: "Governance Model",
        web2: "Typically controlled by a centralized Devops team or an automated monitoring script with root access.",
        solana: "Controlled by an Admin PDA, which can be a single wallet, a multi-sig (like Squads), or a DAO vote.",
        notes: "Transparent and auditable 'Killswitch' that anyone can monitor, increasing trust in the protocol's safety."
      },
      {
        aspect: "Granularity",
        web2: "Can be implemented at the load balancer, API gateway, or service level to stop failing calls globally.",
        solana: "Implemented at the instruction level. Every sensitive call must explicitly check the 'is_paused' state flag.",
        notes: "Ensures that even if the UI is bypassed, the underlying program logic remains protected from any exploit."
      },
      {
        aspect: "Reaction Speed",
        web2: "Near-instant. A configuration change can propagate across a server cluster in milliseconds.",
        solana: "Bound by block finalization. An emergency pause transaction takes a few seconds (~4-12s) to become permanent.",
        notes: "While slightly slower for high-frequency attack mitigation, it provides superior, verifiable safety guarantees."
      }
    ],
    web2: {
      explanation: "Application configuration gating.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require("express")
const app = express()

let failureCount = 0
const failureThreshold = 3
let state = "CLOSED"
let resetTimeout = 5000
let nextAttempt = Date.now()

function circuitBreaker(func){
  return async function(...args){

    if(state === "OPEN"){
      if(Date.now() > nextAttempt){
        state = "HALF_OPEN"
      } else {
        throw new Error("Service unavailable")
      }
    }

    try{
      const result = await func(...args)
      failureCount = 0
      state = "CLOSED"
      return result
    } catch(e){
      failureCount++
      if(failureCount >= failureThreshold){
        state = "OPEN"
        nextAttempt = Date.now() + resetTimeout
      }
      throw e
    }
  }
}

// Simulated downstream service
async function unreliableService(){
  if(Math.random() < 0.5){
    throw new Error("Random failure")
  }
  return "Success"
}

app.get("/call", async (req,res)=>{
  const safeCall = circuitBreaker(unreliableService)

  try{
    const result = await safeCall()
    res.send(result)
  } catch(e){
    res.status(503).send(e.message)
  }
})

app.listen(3000)`, "package.json", `{
  "dependencies": {
    "express": "^4.18.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI, HTTPException
import random
import time

app = FastAPI()

failure_count = 0
failure_threshold = 3
state = "CLOSED"
reset_timeout = 5
next_attempt = time.time()

async def unreliable_service():
    if random.random() < 0.5:
        raise Exception("Random failure")
    return "Success"

async def circuit_breaker(func):
    global failure_count,state,next_attempt

    if state == "OPEN":
        if time.time() > next_attempt:
            state = "HALF_OPEN"
        else:
            raise HTTPException(status_code=503, detail="Service unavailable")

    try:
        result = await func()
        failure_count = 0
        state = "CLOSED"
        return result
    except Exception as e:
        failure_count += 1
        if failure_count >= failure_threshold:
            state = "OPEN"
            next_attempt = time.time() + reset_timeout
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/call")
async def call():
    return await circuit_breaker(unreliable_service)`, "requirements.txt", `fastapi
uvicorn`)
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, jsonify
import random, time

app = Flask(__name__)

failure_count = 0
failure_threshold = 3
state = "CLOSED"
reset_timeout = 5
next_attempt = time.time()

def unreliable_service():
    if random.random() < 0.5:
        raise Exception("Random failure")
    return "Success"

def circuit_breaker(func):
    global failure_count,state,next_attempt

    if state == "OPEN":
        if time.time() > next_attempt:
            state = "HALF_OPEN"
        else:
            raise Exception("Service unavailable")

    try:
        result = func()
        failure_count = 0
        state = "CLOSED"
        return result
    except Exception as e:
        failure_count +=1
        if failure_count >= failure_threshold:
            state = "OPEN"
            next_attempt = time.time() + reset_timeout
        raise e

@app.route("/call")
def call():
    try:
        result = circuit_breaker(unreliable_service)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}),503

if __name__ == "__main__":
    app.run()`, "requirements.txt", `flask`)
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "CircuitBreakerApplication.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import java.util.Random;

@SpringBootApplication
@RestController
public class CircuitBreakerApplication {

    int failureCount = 0;
    int failureThreshold = 3;
    String state = "CLOSED";
    long resetTimeout = 5000;
    long nextAttempt = System.currentTimeMillis();

    @GetMapping("/call")
    public String call(){

        if(state.equals("OPEN")){
            if(System.currentTimeMillis() > nextAttempt){
                state = "HALF_OPEN";
            } else {
                throw new RuntimeException("Service unavailable");
            }
        }

        try{
            String result = unreliableService();
            failureCount = 0;
            state = "CLOSED";
            return result;
        } catch(Exception e){
            failureCount++;
            if(failureCount >= failureThreshold){
                state = "OPEN";
                nextAttempt = System.currentTimeMillis() + resetTimeout;
            }
            throw e;
        }
    }

    public String unreliableService(){
        if(new Random().nextDouble() < 0.5){
            throw new RuntimeException("Random failure");
        }
        return "Success";
    }

    public static void main(String[] args){
        SpringApplication.run(CircuitBreakerApplication.class,args);
    }
}`, "pom.xml", `<dependencies>
<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>
</dependencies>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

int failureCount = 0;
int failureThreshold = 3;
string state = "CLOSED";
DateTime nextAttempt = DateTime.Now;
TimeSpan resetTimeout = TimeSpan.FromSeconds(5);

string UnreliableService(){
    var rnd = new Random();
    if(rnd.NextDouble() < 0.5) throw new Exception("Random failure");
    return "Success";
}

app.MapGet("/call", () => {

    if(state == "OPEN"){
        if(DateTime.Now > nextAttempt){
            state = "HALF_OPEN";
        } else {
            return Results.Problem("Service unavailable", statusCode:503);
        }
    }

    try{
        var result = UnreliableService();
        failureCount = 0;
        state = "CLOSED";
        return Results.Ok(result);
    } catch(Exception){
        failureCount++;
        if(failureCount >= failureThreshold){
            state = "OPEN";
            nextAttempt = DateTime.Now + resetTimeout;
        }
        return Results.Problem("Random failure", statusCode:503);
    }

});

app.Run();`, "circuitbreaker.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">
<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>
</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
    "math/rand"
    "net/http"
    "time"
    "fmt"
)

var failureCount = 0
var failureThreshold = 3
var state = "CLOSED"
var resetTimeout = 5 * time.Second
var nextAttempt = time.Now()

func unreliableService() (string,error){
    if rand.Float64() < 0.5{
        return "", fmt.Errorf("Random failure")
    }
    return "Success", nil
}

func circuitBreaker(w http.ResponseWriter,r *http.Request){

    if state == "OPEN"{
        if time.Now().After(nextAttempt){
            state = "HALF_OPEN"
        } else {
            http.Error(w,"Service unavailable",503)
            return
        }
    }

    result,err := unreliableService()

    if err != nil{
        failureCount++
        if failureCount >= failureThreshold{
            state = "OPEN"
            nextAttempt = time.Now().Add(resetTimeout)
        }
        http.Error(w,err.Error(),503)
        return
    }

    failureCount = 0
    state = "CLOSED"
    fmt.Fprint(w,result)
}

func main(){
    http.HandleFunc("/call",circuitBreaker)
    http.ListenAndServe(":8080",nil)
}`, "go.mod", `module circuitbreaker

go 1.20`)
        }
      ]
    },
    web3: {
      explanation: "Config PDA stores a 'paused' boolean checked in every instruction.",
      programId: "3KnPCDHyU6fB6tBFndfs7UoM6Mwg4sgmhBS941BefhSS",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/circuit_breaker",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("3KnPCDHyU6fB6tBFndfs7UoM6Mwg4sgmhBS941BefhSS");

#[program]
pub mod anchor_circuit_breaker {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let breaker = &mut ctx.accounts.breaker_account;
        breaker.authority = ctx.accounts.authority.key();
        breaker.is_paused = false;
        msg!("Circuit Breaker initialized and CLOSED.");
        Ok(())
    }

    pub fn toggle_pause(ctx: Context<TogglePause>) -> Result<()> {
        let breaker = &mut ctx.accounts.breaker_account;
        breaker.is_paused = !breaker.is_paused;
        msg!("Circuit Breaker toggled. Is Paused: {}", breaker.is_paused);
        Ok(())
    }

    pub fn execute_action(ctx: Context<ExecuteAction>) -> Result<()> {
        let breaker_account = &ctx.accounts.breaker_account;
        if breaker_account.is_paused {
            return Err(BreakerError::CircuitOpen.into());
        }
        msg!("Executing business logic securely while circuit is CLOSED.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 1)]
    pub breaker_account: Account<'info, CircuitBreakerAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(mut, has_one = authority)]
    pub breaker_account: Account<'info, CircuitBreakerAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteAction<'info> {
    pub breaker_account: Account<'info, CircuitBreakerAccount>,
}

#[account]
pub struct CircuitBreakerAccount {
    pub authority: Pubkey,
    pub is_paused: bool,
}

#[error_code]
pub enum BreakerError {
    #[msg("The circuit is currently OPEN. Operations are paused.")]
    CircuitOpen,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "circuit-breaker"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/circuit-breaker-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub is_paused: bool,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _admin = next_account_info(accounts_iter)?;
    let config_account = next_account_info(accounts_iter)?;

    msg!("Checking circuit breaker in Native Rust");
    let mut config = GlobalConfig::try_from_slice(&config_account.data.borrow())?;

    match instruction_data[0] {
        1 => { // Toggle pause
            config.is_paused = !config.is_paused;
            config.serialize(&mut &mut config_account.data.borrow_mut()[..])?;
        },
        _ => (),
    }

    if config.is_paused {
        return Err(solana_program::program_error::ProgramError::Custom(5));
    }

    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "circuit-breaker-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    Admin[Admin/DAO] -->|1. Detect Emergency| Admin
    Admin -->|2. Call TogglePause()| Program[Circuit Program]
    Program -->|3. Update Config| ConfigAcc[Global Config PDA]
    User[Regular User] -->|4. Call Action| Program
    Program -->|5. Read State| ConfigAcc
    ConfigAcc -->|6. is_paused == true| Program
    Program -->|7. Revert| User
    Admin -->|8. Fix & Resume| Program`
    }
  },
  {
    slug: "leader-election",
    id: "PATTERN_12",
    githubUrl: "https://github.com/DrApkFile/Node-Shift/tree/master/examples/leader-election",
    title: "Leader Election",
    description: "Ranked voting and scoring.",
    tags: ["Infrastructure"],
    theory: "In Web2 architectures, leader election is typically used in distributed systems (via consensus algorithms like Raft or Paxos in ZooKeeper) to ensure that only one node performs a specific task or holds a particular role at a time. On Solana, leader election is implemented through on-chain voting and reputation scoring. Participants use their tokens or governance power to 'elect' a specific wallet address or PDA as the active leader for a given epoch or duration. This ensures that the orchestrator of a process—whether it's a protocol's 'crank' or a game's 'referee'—is chosen in a transparent, verifiable way that is resistant to single-point-of-failure risks and centralized manipulation.",
    constraints: [
      "**Deterministic Leader Selection Logic**: The program must define a clear, non-random algorithm for selecting the leader based on the current vote tally or scoring state.\nNote: This ensures that all participants can predict and verify the outcome of the election, avoiding the need for an external 'tie-breaker' or administrator.",
      "**Fixed Voting Duration Gating**: Elections should be bound by a specific number of slots or a duration according to the network's consensus clock.\nNote: This prevents indefinite elections and allows the system to periodically 'rotate' the leader, which is essential for maintaining a healthy and decentralized ecosystem.",
      "**Single-Vote Enforcement Logic**: To prevent sybil attacks, the program must ensure that each unique wallet or identity can only cast a single vote per election cycle.\nNote: This is typically enforced by creating a PDA for each voter's choice, which can only be initialized once per election epoch."
    ],
    tradeoffs: [
      {
        aspect: "Coordination",
        web2: "High-speed gossip protocols (Raft, Paxos) that require low-latency communication between trusted server nodes.",
        solana: "On-chain voting and reputation scoring. The leader is selected through public, verifiable state transitions.",
        notes: "Eliminates the 'Split-Brain' problem common in distributed systems via a single, global source of truth."
      },
      {
        aspect: "Transparency",
        web2: "Internal cluster events. External users cannot verify how or why a specific leader was chosen by the system.",
        solana: "Every vote and scoring metric is public. Any participant can audit the election to ensure zero manipulation.",
        notes: "Crucial for building decentralized infrastructure where the 'Orchestrator' must be held publicly accountable."
      },
      {
        aspect: "Liveness",
        web2: "Managed by automated health checks. If a leader node fails, a new one is elected in milliseconds.",
        solana: "Elections are typically tied to Epochs or Slots. Role rotation is predictable and secure, but slower than a cluster.",
        notes: "Better suited for long-term role assignment (e.g., Oracles, DAO moderators) than low-level networking leaders."
      }
    ],
    web2: {
      explanation: "Zookeeper consensus logic.",
      implementations: [
        {
          name: "Node.js",
          folders: commonWeb2Folders("javascript", "app.js", `const express = require('express');
const Redis = require('ioredis');
const app = express();
app.use(express.json());

const redis = new Redis();
const leaderboardKey = 'leaderboard';

app.post('/vote', async (req,res) => {
  const {participant, score} = req.body;
  await redis.zincrby(leaderboardKey, score, participant);
  const totalScore = await redis.zscore(leaderboardKey, participant);
  res.json({status:'score updated', participant, totalScore});
});

app.get('/leaderboard', async (req,res) => {
  const top = await redis.zrevrange(leaderboardKey, 0, 9, 'WITHSCORES');
  const result = [];
  for(let i=0; i<top.length; i+=2){
    result.push({participant: top[i], score: parseInt(top[i+1])});
  }
  res.json(result);
});

app.listen(3000);`, "package.json", `{
  "dependencies": {
    "express": "^4.18.2",
    "ioredis": "^5.3.2"
  }
}`)
        },
        {
          name: "Python (FastAPI)",
          folders: commonWeb2Folders("python", "app.py", `from fastapi import FastAPI
import redis

app = FastAPI()
r = redis.Redis()
leaderboard_key = 'leaderboard'

@app.post("/vote")
def vote(participant: str, score: int):
    r.zincrby(leaderboard_key, score, participant)
    total = r.zscore(leaderboard_key, participant)
    return {"status":"score updated", "participant": participant, "totalScore": int(total)}

@app.get("/leaderboard")
def get_leaderboard():
    top = r.zrevrange(leaderboard_key, 0, 9, withscores=True)
    return [{"participant":p.decode(), "score":int(s)} for p,s in top]`, "requirements.txt", `fastapi
uvicorn
redis`)
        },
        {
          name: "Python (Flask)",
          folders: commonWeb2Folders("python", "app.py", `from flask import Flask, request, jsonify
import redis

app = Flask(__name__)
r = redis.Redis()
leaderboard_key = 'leaderboard'

@app.route('/vote', methods=['POST'])
def vote():
    data = request.json
    participant = data['participant']
    score = data['score']
    r.zincrby(leaderboard_key, score, participant)
    totalScore = int(r.zscore(leaderboard_key, participant))
    return jsonify({"status":"score updated","participant":participant,"totalScore":totalScore})

@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    top = r.zrevrange(leaderboard_key,0,9,withscores=True)
    result = [{"participant":p.decode(), "score":int(s)} for p,s in top]
    return jsonify(result)

if __name__ == '__main__':
    app.run()`, "requirements.txt", `flask
redis`)
        },
        {
          name: "Java (Spring Boot)",
          folders: commonWeb2Folders("java", "LeaderboardApplication.java", `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import redis.clients.jedis.Jedis;
import java.util.*;

@SpringBootApplication
@RestController
public class LeaderboardApplication {

    Jedis redis = new Jedis("localhost");
    String leaderboardKey = "leaderboard";

    @PostMapping("/vote")
    public Map<String,Object> vote(@RequestParam String participant, @RequestParam int score){
        redis.zincrby(leaderboardKey, score, participant);
        double totalScore = redis.zscore(leaderboardKey, participant);
        return Map.of("status","score updated","participant",participant,"totalScore",(int)totalScore);
    }

    @GetMapping("/leaderboard")
    public List<Map<String,Object>> getLeaderboard(){
        Set<String> topParticipants = redis.zrevrange(leaderboardKey, 0, 9);
        List<Map<String,Object>> result = new ArrayList<>();
        for(String p: topParticipants){
            result.add(Map.of("participant", p, "score", (int)redis.zscore(leaderboardKey,p)));
        }
        return result;
    }

    public static void main(String[] args){
        SpringApplication.run(LeaderboardApplication.class,args);
    }
}`, "pom.xml", `<dependencies>
<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
<groupId>redis.clients</groupId>
<artifactId>jedis</artifactId>
<version>4.3.1</version>
</dependency>
</dependencies>`)
        },
        {
          name: "C# (.NET)",
          folders: commonWeb2Folders("csharp", "Program.cs", `using StackExchange.Redis;
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var redis = ConnectionMultiplexer.Connect("localhost:6379");
var db = redis.GetDatabase();
string leaderboardKey = "leaderboard";

app.MapPost("/vote", async (string participant,int score) => {
    await db.SortedSetIncrementAsync(leaderboardKey, participant, score);
    var totalScore = await db.SortedSetScoreAsync(leaderboardKey, participant);
    return Results.Ok(new {status="score updated", participant, totalScore});
});

app.MapGet("/leaderboard", async () => {
    var top = await db.SortedSetRangeByRankWithScoresAsync(leaderboardKey,0,9,Order.Descending);
    var result = top.Select(x=>new {participant=x.Element, score=(int)x.Score});
    return Results.Ok(result);
});

app.Run();`, "leaderboard.csproj", `<Project Sdk="Microsoft.NET.Sdk.Web">
<PropertyGroup>
<TargetFramework>net8.0</TargetFramework>
</PropertyGroup>
<ItemGroup>
<PackageReference Include="StackExchange.Redis" Version="2.7.33" />
</ItemGroup>
</Project>`)
        },
        {
          name: "Go",
          folders: commonWeb2Folders("go", "main.go", `package main

import (
	"encoding/json"
	"net/http"
	"github.com/redis/go-redis/v9"
	"context"
	"strconv"
)

var ctx = context.Background()
var rdb = redis.NewClient(&redis.Options{Addr:"localhost:6379"})
var leaderboardKey = "leaderboard"

func vote(w http.ResponseWriter,r *http.Request){
	participant := r.URL.Query().Get("participant")
	scoreStr := r.URL.Query().Get("score")
	score,_ := strconv.Atoi(scoreStr)
	rdb.ZIncrBy(ctx, leaderboardKey, float64(score), participant)
	total,_ := rdb.ZScore(ctx, leaderboardKey, participant).Result()
	json.NewEncoder(w).Encode(map[string]interface{}{"status":"score updated","participant":participant,"totalScore":int(total)})
}

func getLeaderboard(w http.ResponseWriter,r *http.Request){
	top,_ := rdb.ZRevRangeWithScores(ctx, leaderboardKey,0,9).Result()
	result := []map[string]interface{}{}
	for _,v := range top{
		result = append(result,map[string]interface{}{"participant":v.Member.(string),"score":int(v.Score)})
	}
	json.NewEncoder(w).Encode(result)
}

func main(){
	http.HandleFunc("/vote",vote)
	http.HandleFunc("/leaderboard",getLeaderboard)
	http.ListenAndServe(":8080",nil)
}`, "go.mod", `module leaderboard

go 1.20

require github.com/redis/go-redis/v9 v9.4.6`)
        }
      ]
    },
    web3: {
      explanation: "Stake-based voting account elects a 'Leader'.",
      programId: "EC6dqnTdQFabKC4qzf5jzLhEDDLRZ2XyhzFYhTNF2cHQ",
      implementations: [
        {
          name: "Anchor",
          folders: [{
            name: "programs/leader_election",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use anchor_lang::prelude::*;

declare_id!("Vote11111111111111111111111111111111111111");

#[program]
pub mod leader_election {
    use super::*;

    /// Casts a vote for a candidate. 
    /// In Web2, we'd use a message queue or consensus protocol like Raft.
    /// In Web3, we record votes on-chain to be verified by anyone.
    pub fn vote(ctx: Context<CastVote>, candidate: Pubkey) -> Result<()> {
        let election = &mut ctx.accounts.election;
        let vote_record = &mut ctx.accounts.vote_record;

        require!(!vote_record.voted, ErrorCode::AlreadyVoted);

        // Record the vote - Web3's verifiable "single vote" enforcement
        vote_record.voted = true;
        vote_record.candidate = candidate;

        // In a real election, we'd tally votes here or in a 'close_election' instruction
        election.total_votes += 1;

        Ok(())
    }

    /// Determines the leader based on the current vote tally.
    pub fn finalize_leader(ctx: Context<FinalizeLeader>) -> Result<()> {
        let election = &mut ctx.accounts.election;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= election.end_at, ErrorCode::ElectionOngoing);
        
        // Finalization logic to select winner based on tally...
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(mut)]
    pub election: Account<'info, ElectionState>,
    #[account(
        init,
        payer = voter,
        space = 8 + 1 + 32,
        seeds = [b"vote", voter.key().as_ref(), election.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeLeader<'info> {
    #[account(mut)]
    pub election: Account<'info, ElectionState>,
}

#[account]
pub struct ElectionState {
    pub total_votes: u64,
    pub end_at: i64,
    pub leader: Pubkey,
}

#[account]
pub struct VoteRecord {
    pub voted: bool,
    pub candidate: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You have already cast your vote.")]
    AlreadyVoted,
    #[msg("The election is still ongoing.")]
    ElectionOngoing,
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "leader-election"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nanchor-lang = "0.29.0"` }
            ]
          }]
        },
        {
          name: "Native Rust",
          folders: [{
            name: "programs/leader-election-native",
            files: [
              {
                name: "lib.rs", language: "rust", content: `use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct ElectionState {
    pub total_votes: u64,
    pub end_at: i64,
    pub leader: Pubkey,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct VoteRecord {
    pub voted: bool,
    pub candidate: Pubkey,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _voter = next_account_info(accounts_iter)?;
    let election_account = next_account_info(accounts_iter)?;
    let vote_record_account = next_account_info(accounts_iter)?;

    msg!("Casting vote in Native Election");
    let mut election = ElectionState::try_from_slice(&election_account.data.borrow())?;
    
    // Manual vote recording
    let vote = VoteRecord {
        voted: true,
        candidate: *program_id, // simplified
    };
    
    election.total_votes += 1;
    election.serialize(&mut &mut election_account.data.borrow_mut()[..])?;
    vote.serialize(&mut &mut vote_record_account.data.borrow_mut()[..])?;
    Ok(())
}` },
              { name: "Cargo.toml", language: "toml", content: `[package]\nname = "leader-election-native"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\n\n[dependencies]\nsolana-program = "1.17.0"\nborsh = "1.3.1"` }
            ]
          }]
        }
      ],
      clientFolders: [],
      diagram: `graph TD
    Voters[Stakeholders/Voters] -->|1. Cast Vote| Program[Election Program]
    Program -->|2. Create Record| VotePDA[Vote PDA]
    Program -->|3. Update Tally| ElectionPDA[Election State PDA]
    Timer[Clock Sysvar] -->|4. Expiry Check| Program
    Program -->|5. Elect Winner| ElectionPDA
    ElectionPDA -->|6. Winner Role Active| App[DApp Logic]`
    }
  }
];
