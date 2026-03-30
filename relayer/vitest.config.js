import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      PRIVATE_KEY: "0x" + "a".repeat(64),
      GENLAYER_PRIVATE_KEY: "0x" + "b".repeat(64),
      ESCROW_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
      GENLAYER_CONTRACT_ADDRESS: "0x2222222222222222222222222222222222222222",
      GENLAYER_RPC_URL: "http://localhost:4000",
      AVALANCHE_RPC_URL: "http://localhost:9545",
      PORT: "0",
    },
  },
});
