/**
 * RouteForge LLM Routing and Fallback Simulator
 * 
 * This script runs a self-contained simulation of the RouteForge
 * dynamic provider routing, sorting, and automatic failover mechanism.
 */

// 1. Types definition matching RouteForge core types
type ProviderMetrics = {
  avgLatencyMs: number;
  avgThroughputTps: number;
  uptimePct: number;
};

type ProviderMapping = {
  providerName: string;
  inputTokenCost: number; // Cost in micro-cents
  outputTokenCost: number;
};

type Candidate = {
  providerName: string;
  mapping: ProviderMapping;
  metrics: ProviderMetrics;
  priceScore: number;
};

// 2. Mock Database Data
const mockModel = {
  name: "Llama 3.1 8B Instant",
  slug: "llama-3.1-8b-instant",
  providers: [
    {
      providerName: "Groq",
      inputTokenCost: 5,   // $0.05 per Million tokens
      outputTokenCost: 8,
      metrics: { avgLatencyMs: 120, avgThroughputTps: 130, uptimePct: 98 },
      behavior: "fail" // Simulates a provider outage / rate-limit
    },
    {
      providerName: "Cerebras",
      inputTokenCost: 10,  // $0.10 per Million tokens
      outputTokenCost: 10,
      metrics: { avgLatencyMs: 80, avgThroughputTps: 250, uptimePct: 99.9 },
      behavior: "succeed"
    },
    {
      providerName: "Together AI",
      inputTokenCost: 3,   // $0.03 per Million tokens
      outputTokenCost: 3,
      metrics: { avgLatencyMs: 250, avgThroughputTps: 80, uptimePct: 95 },
      behavior: "succeed"
    }
  ]
};

// 3. Routing Engine Sorting Logic
function compareCandidates(
  left: Candidate,
  right: Candidate,
  sortBy: "price" | "latency" | "throughput" = "price"
): number {
  const leftLatency = left.metrics.avgLatencyMs;
  const rightLatency = right.metrics.avgLatencyMs;
  const leftThroughput = left.metrics.avgThroughputTps;
  const rightThroughput = right.metrics.avgThroughputTps;

  if (sortBy === "throughput") {
    if (leftThroughput !== rightThroughput) {
      return rightThroughput - leftThroughput; // Higher throughput first
    }
  } else if (sortBy === "latency") {
    if (leftLatency !== rightLatency) {
      return leftLatency - rightLatency; // Lower latency first
    }
  } else {
    // Default: Sort by Price Score
    if (left.priceScore !== right.priceScore) {
      return left.priceScore - right.priceScore; // Lower price first
    }
  }

  // Tie-breaker: Uptime
  if (left.metrics.uptimePct !== right.metrics.uptimePct) {
    return right.metrics.uptimePct - left.metrics.uptimePct;
  }

  return left.providerName.localeCompare(right.providerName);
}

// 4. Simulator Main Loop
async function runSimulation(sortBy: "price" | "latency" | "throughput") {
  console.log(`\n==================================================`);
  console.log(`🎬 STARTING SIMULATION (Strategy: Sort by ${sortBy.toUpperCase()})`);
  console.log(`==================================================`);
  console.log(`Model: ${mockModel.name} (${mockModel.slug})`);

  // Build candidates list
  const candidates: Candidate[] = mockModel.providers.map(p => ({
    providerName: p.providerName,
    mapping: {
      providerName: p.providerName,
      inputTokenCost: p.inputTokenCost,
      outputTokenCost: p.outputTokenCost
    },
    metrics: p.metrics,
    priceScore: p.inputTokenCost + p.outputTokenCost
  }));

  console.log("\n📊 Available Providers & Metrics:");
  candidates.forEach(c => {
    console.log(`  - [${c.providerName}] Price Score: ${c.priceScore} | Latency: ${c.metrics.avgLatencyMs}ms | Throughput: ${c.metrics.avgThroughputTps} t/s | Uptime: ${c.metrics.uptimePct}%`);
  });

  // Sort candidates based on strategy
  candidates.sort((a, b) => compareCandidates(a, b, sortBy));

  console.log("\n⚡ Sorted Routing Queue (Priority Order):");
  candidates.forEach((c, index) => {
    console.log(`  ${index + 1}. ${c.providerName}`);
  });

  console.log("\n🚀 Initiating chat request completion...");

  let success = false;
  let lastError: string | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    const mockDbProvider = mockModel.providers.find(p => p.providerName === candidate.providerName)!;
    
    console.log(`\n🔄 Attempt ${i + 1}: Routing request to [${candidate.providerName}]...`);
    
    // Simulate network delay based on actual provider latency
    await new Promise(resolve => setTimeout(resolve, 300));

    if (mockDbProvider.behavior === "fail") {
      lastError = `API error from ${candidate.providerName}: 503 Service Unavailable (Outage / Rate Limit)`;
      console.log(`❌ Attempt failed: ${lastError}`);
      console.log(`⚠️  Failover triggered! Dynamically routing to the next candidate...`);
    } else {
      console.log(`✅ Attempt succeeded! [${candidate.providerName}] completed the request.`);
      console.log(`📝 Response: "Hello! I am Llama 3.1 running on ${candidate.providerName}."`);
      success = true;
      break;
    }
  }

  console.log(`\n==================================================`);
  if (success) {
    console.log("🎉 SUCCESS: Chat completed successfully via failover routing.");
  } else {
    console.log(`💥 CRITICAL: All providers failed. Last Error: ${lastError}`);
  }
  console.log(`==================================================\n`);
}

// Execute simulation using different strategies
async function main() {
  // 1. Simulate default (lowest price first) -> Groq fails, falls back to Together, then Cerebras
  await runSimulation("price");
  
  // 2. Simulate latency preference -> Cerebras (80ms) goes first and succeeds immediately
  await runSimulation("latency");
}

main();
