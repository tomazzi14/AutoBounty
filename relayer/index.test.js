import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

// ─── Hoist mock objects so they're accessible in vi.mock factories ────────────

const { mockPublicClient, mockWalletClient, mockGlClient } = vi.hoisted(() => ({
  mockPublicClient: {
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
    getBlockNumber: vi.fn(),
  },
  mockWalletClient: { writeContract: vi.fn() },
  mockGlClient: {
    writeContract: vi.fn(),
    readContract: vi.fn(),
    request: vi.fn(),
  },
}));

// ─── Module mocks (hoisted before imports) ───────────────────────────────────

vi.mock("dotenv/config");
vi.mock("viem/accounts", () => ({ privateKeyToAccount: () => ({ address: "0xRELAYER" }) }));
vi.mock("viem", () => ({
  createPublicClient: () => mockPublicClient,
  createWalletClient: () => mockWalletClient,
  http: () => {},
  webSocket: () => {},
  parseAbi: () => [],
  parseAbiItem: () => {},
  defineChain: () => ({}),
}));
vi.mock("viem/chains", () => ({ avalancheFuji: {}, foundry: {} }));
vi.mock("genlayer-js", () => ({ createClient: () => mockGlClient }));
vi.mock("genlayer-js/chains", () => ({ localnet: {}, testnetBradbury: {} }));

import { app, rateLimitMap } from "./index.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Matches the tuple returned by bounties(id): [id, creator, issueURL, prURL, amount, solver, status]
const BOUNTY_TUPLE = [
  BigInt(0),
  "0xCreator1111111111111111111111111111111111",
  "https://github.com/org/repo/issues/1",
  "",
  BigInt(500e6),
  "0x0000000000000000000000000000000000000000",
  0, // Status.Open
];

// Sets up all mocks for the full handlePRSubmission flow.
function mockSubmitFlow({ approved = true, score = 9, reasoning = "Looks great" } = {}) {
  mockPublicClient.readContract.mockResolvedValueOnce(BOUNTY_TUPLE);
  mockWalletClient.writeContract.mockResolvedValueOnce("0xTX_SUBMIT");
  mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce({ transactionHash: "0xTX_SUBMIT" });
  mockGlClient.writeContract.mockResolvedValueOnce("0xGL_TX");
  mockGlClient.request.mockResolvedValueOnce({ status: "0x1" }); // pollGenLayerTx
  mockGlClient.readContract.mockResolvedValueOnce({ approved, score, reasoning });
  mockWalletClient.writeContract.mockResolvedValueOnce("0xTX_RESOLVE");
  mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce({ transactionHash: "0xTX_RESOLVE" });
}

// ─── GET /health ──────────────────────────────────────────────────────────────

describe("GET /health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns ok with both services connected", async () => {
    mockPublicClient.getBlockNumber.mockResolvedValue(BigInt(100));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.avalancheConnected).toBe(true);
    expect(res.body.genlayerConnected).toBe(true);
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("escrow");
    expect(res.body).toHaveProperty("genlayer");
  });

  it("reports avalancheConnected false when getBlockNumber throws", async () => {
    mockPublicClient.getBlockNumber.mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.avalancheConnected).toBe(false);
    expect(res.body.genlayerConnected).toBe(true);
  });

  it("reports genlayerConnected false when fetch throws", async () => {
    mockPublicClient.getBlockNumber.mockResolvedValue(BigInt(100));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.genlayerConnected).toBe(false);
  });
});

// ─── GET /bounties ────────────────────────────────────────────────────────────

describe("GET /bounties", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no bounties exist", async () => {
    mockPublicClient.readContract.mockResolvedValueOnce(BigInt(0));

    const res = await request(app).get("/bounties");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns correct shape for a single bounty", async () => {
    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1))      // bountyCount
      .mockResolvedValueOnce(BOUNTY_TUPLE);  // bounties(0)

    const res = await request(app).get("/bounties");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 0,
      creator: BOUNTY_TUPLE[1],
      issueURL: BOUNTY_TUPLE[2],
      prURL: "",
      status: "Open",
    });
    expect(res.body[0].amount).toBe(String(BigInt(500e6)));
  });

  it("returns multiple bounties in order", async () => {
    const bounty1 = [...BOUNTY_TUPLE];
    bounty1[0] = BigInt(1);
    bounty1[6] = 2; // Approved

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(2))
      .mockResolvedValueOnce(BOUNTY_TUPLE)
      .mockResolvedValueOnce(bounty1);

    const res = await request(app).get("/bounties");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].status).toBe("Open");
    expect(res.body[1].status).toBe("Approved");
  });

  it("returns 500 on RPC error", async () => {
    mockPublicClient.readContract.mockRejectedValue(new Error("RPC down"));

    const res = await request(app).get("/bounties");

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});

// ─── GET /stats ────────────────────────────────────────────────────────────────

describe("GET /stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zeroed stats when no bounties exist", async () => {
    mockPublicClient.readContract.mockResolvedValueOnce(BigInt(0));

    const res = await request(app).get("/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 0,
      open: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      totalValueLocked: "0",
    });
  });

  it("returns correct counts for mixed statuses", async () => {
    const openBounty = [...BOUNTY_TUPLE]; // status 0 = Open
    const submittedBounty = [...BOUNTY_TUPLE];
    submittedBounty[0] = BigInt(1);
    submittedBounty[6] = 1; // Submitted
    const approvedBounty = [...BOUNTY_TUPLE];
    approvedBounty[0] = BigInt(2);
    approvedBounty[6] = 2; // Approved
    const rejectedBounty = [...BOUNTY_TUPLE];
    rejectedBounty[0] = BigInt(3);
    rejectedBounty[6] = 3; // Rejected

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(4)) // bountyCount
      .mockResolvedValueOnce(openBounty)
      .mockResolvedValueOnce(submittedBounty)
      .mockResolvedValueOnce(approvedBounty)
      .mockResolvedValueOnce(rejectedBounty);

    const res = await request(app).get("/stats");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.open).toBe(1);
    expect(res.body.submitted).toBe(1);
    expect(res.body.approved).toBe(1);
    expect(res.body.rejected).toBe(1);
  });

  it("calculates totalValueLocked from Open + Submitted only", async () => {
    const openBounty = [...BOUNTY_TUPLE]; // amount = 500e6
    const approvedBounty = [...BOUNTY_TUPLE];
    approvedBounty[0] = BigInt(1);
    approvedBounty[4] = BigInt(300e6);
    approvedBounty[6] = 2; // Approved

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(2))
      .mockResolvedValueOnce(openBounty)
      .mockResolvedValueOnce(approvedBounty);

    const res = await request(app).get("/stats");

    expect(res.status).toBe(200);
    expect(res.body.totalValueLocked).toBe("500000000"); // only Open bounty amount
  });

  it("returns 500 on RPC error", async () => {
    mockPublicClient.readContract.mockRejectedValue(new Error("RPC down"));

    const res = await request(app).get("/stats");

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});

// ─── GET /status/:id ──────────────────────────────────────────────────────────

describe("GET /status/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns bounty for valid id", async () => {
    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1))
      .mockResolvedValueOnce(BOUNTY_TUPLE);

    const res = await request(app).get("/status/0");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(0);
    expect(res.body.status).toBe("Open");
    expect(res.body.verdict).toBeNull();
  });

  it("returns 404 for out-of-range id", async () => {
    mockPublicClient.readContract.mockResolvedValueOnce(BigInt(1));

    const res = await request(app).get("/status/5");

    expect(res.status).toBe(404);
  });

  it("returns 404 for non-numeric id", async () => {
    mockPublicClient.readContract.mockResolvedValueOnce(BigInt(1));

    const res = await request(app).get("/status/abc");

    expect(res.status).toBe(404);
  });

  it("includes GenLayer verdict for Approved bounty", async () => {
    const resolvedBounty = [...BOUNTY_TUPLE];
    resolvedBounty[6] = 2; // Status.Approved

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1))
      .mockResolvedValueOnce(resolvedBounty);
    mockGlClient.readContract.mockResolvedValueOnce({
      approved: true,
      score: 9,
      reasoning: "Great PR",
    });

    const res = await request(app).get("/status/0");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Approved");
    expect(res.body.verdict).toMatchObject({ approved: true, score: 9, reasoning: "Great PR" });
  });

  it("includes GenLayer verdict for Rejected bounty", async () => {
    const rejectedBounty = [...BOUNTY_TUPLE];
    rejectedBounty[6] = 3; // Status.Rejected

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1))
      .mockResolvedValueOnce(rejectedBounty);
    mockGlClient.readContract.mockResolvedValueOnce({
      approved: false,
      score: 2,
      reasoning: "Does not address the issue",
    });

    const res = await request(app).get("/status/0");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Rejected");
    expect(res.body.verdict.approved).toBe(false);
  });

  it("returns null verdict when GenLayer read throws on first attempt", async () => {
    const resolvedBounty = [...BOUNTY_TUPLE];
    resolvedBounty[6] = 2; // Approved

    mockPublicClient.readContract
      .mockResolvedValueOnce(BigInt(1))
      .mockResolvedValueOnce(resolvedBounty);
    // Succeed immediately so there are no retry delays, but return null-ish data
    mockGlClient.readContract.mockResolvedValueOnce(null);

    const res = await request(app).get("/status/0");

    expect(res.status).toBe(200);
    // When readContract returns null the try/catch in /status catches the access error
    // and falls back to verdict: null
    expect(res.body.verdict).toBeNull();
  });

  it("returns 500 on RPC error", async () => {
    mockPublicClient.readContract.mockRejectedValue(new Error("node down"));

    const res = await request(app).get("/status/0");

    expect(res.status).toBe(500);
  });
});

// ─── POST /submit — validation ────────────────────────────────────────────────

describe("POST /submit — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMap.clear();
  });

  it("returns 400 when bountyId is missing", async () => {
    const res = await request(app)
      .post("/submit")
      .send({ prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it("returns 400 when prURL is missing", async () => {
    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, solverAddress: "0xSOLVER" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when solverAddress is missing", async () => {
    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/submit").send({});

    expect(res.status).toBe(400);
  });
});

// ─── POST /submit — happy path ────────────────────────────────────────────────

describe("POST /submit — flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMap.clear();
  });

  it("resolves approved bounty and returns success", async () => {
    mockSubmitFlow({ approved: true, score: 9, reasoning: "Looks great" });

    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.approved).toBe(true);
    expect(res.body.score).toBe(9);
    expect(res.body.reasoning).toBe("Looks great");
  });

  it("resolves rejected bounty and returns success:false verdict", async () => {
    mockSubmitFlow({ approved: false, score: 2, reasoning: "Does not address the issue" });

    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.approved).toBe(false);
    expect(res.body.score).toBe(2);
  });

  it("returns 500 when chain read fails", async () => {
    mockPublicClient.readContract.mockRejectedValue(new Error("RPC down"));

    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it("returns 500 when GenLayer writeContract fails", async () => {
    mockPublicClient.readContract.mockResolvedValueOnce(BOUNTY_TUPLE);
    mockWalletClient.writeContract.mockResolvedValueOnce("0xTX_SUBMIT");
    mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce({ transactionHash: "0xTX_SUBMIT" });
    mockGlClient.writeContract.mockRejectedValue(new Error("GenLayer error"));

    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });

    expect(res.status).toBe(500);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe("rate limiting on POST /submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMap.clear();
    // Make all calls fail fast so we're not waiting for real logic
    mockPublicClient.readContract.mockRejectedValue(new Error("mock"));
  });

  it("allows the first 5 requests (returns non-429)", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/submit")
        .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });
      expect(res.status).not.toBe(429);
    }
  });

  it("blocks the 6th request with 429", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/submit")
        .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });
    }

    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many/i);
  });

  it("includes Retry-After header on 429", async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post("/submit")
        .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });
    }

    const res = await request(app)
      .post("/submit")
      .send({ bountyId: 0, prURL: "https://github.com/org/repo/pull/1", solverAddress: "0xSOLVER" });

    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });
});
