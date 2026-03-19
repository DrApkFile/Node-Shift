import anchorEscrowIdl from "./anchor_escrow.json";
import anchorRateLimiterIdl from "./anchor_rate_limiter.json";
import anchorRbacIdl from "./anchor_rbac.json";
import anchorApiKeyIdl from "./anchor_api_key.json";
import anchorIdempotencyIdl from "./anchor_idempotency.json";
import anchorSubscriptionIdl from "./anchor_subscription.json";
import anchorJobQueueIdl from "./anchor_job_queue.json";
import anchorLeaderboardIdl from "./anchor_leaderboard.json";
import anchorOrderMatchingIdl from "./anchor_order_matching.json";
import anchorLeaderElectionIdl from "./anchor_leader_election.json";
import anchorAuctionIdl from "./anchor_auction.json";
import anchorCircuitBreakerIdl from "./anchor_circuit_breaker.json";

export const IDL_REGISTRY = {
    "escrow-engine": {
        idl: anchorEscrowIdl,
        programId: "9anrPY2Ei1Lkvqmqcdyuie42aYhxvnB9qScUTZZimwTB",
    },
    "rate-limiter": {
        idl: anchorRateLimiterIdl,
        programId: "J3cTELeaZPRUd1qGHrDW6mxi9Hyz3egMs9unqVQsxny6",
    },
    "rbac-access-control": {
        idl: anchorRbacIdl,
        programId: "txyHnTyAi8MiVFy3ZLQeqJiCHKt3FuJx2gg2pvab8T9",
    },
    "api-key-management": {
        idl: anchorApiKeyIdl,
        programId: "BdmZeEzG8eNqNGxtMQ1YP8ZDPy1Di4JkTLYQWkrwpsQA",
    },
    "idempotency-key": {
        idl: anchorIdempotencyIdl,
        programId: "DzBV9RhbE5WCNscwPBSwYrCEWFxDRMSkM5oWYKktMonr",
    },
    "subscription-billing": {
        idl: anchorSubscriptionIdl,
        programId: "AihnoAeD3MH23amQhmMgRWq9UF3rSV7YMnN6THArV8e7",
    },
    "on-chain-job-queue": {
        idl: anchorJobQueueIdl,
        programId: "7AgxB5wUW2tYksiWXW9pvmdiGCKRYSgL5sNcuXSm7Z5T",
    },
    "leaderboard-ranking": {
        idl: anchorLeaderboardIdl,
        programId: "GDXdtax9eoW2DSDQUkweFdEwyMq8foKRq3oo56hZUQM",
    },
    "order-matching-engine": {
        idl: anchorOrderMatchingIdl,
        programId: "3qWdfedEMajVfoF7CgHvoCPy7Ddd7r1pWiHYGmbxQ3fj",
    },
    "leader-election": {
        idl: anchorLeaderElectionIdl,
        programId: "EC6dqnTdQFabKC4qzf5jzLhEDDLRZ2XyhzFYhTNF2cHQ",
    },
    "auction-engine": {
        idl: anchorAuctionIdl,
        programId: "DEvYCdsNiLK998bxX4EB59pPnuAvrJhgG6VThjZb5T8d",
    },
    "circuit-breaker": {
        idl: anchorCircuitBreakerIdl,
        programId: "3KnPCDHyU6fB6tBFndfs7UoM6Mwg4sgmhBS941BefhSS",
    },
};

export type PatternSlug = keyof typeof IDL_REGISTRY;
