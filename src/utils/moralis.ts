export async function createMoralisStream() {
  const res = await fetch("https://api.moralis.io/streams/v2/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.NEXT_PUBLIC_MORALIS_API_KEY || "",
    },
    body: JSON.stringify({
      webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/moralis/webhook`,
      description: "VeryChain stream",
      tag: "very-stream",
      chainIds: [397], // 10진수
      allAddresses: false,
      includeNativeTxs: true,
      advancedOptions: {
        includeContractLogs: true,
      },
    }),
  });

  const data = await res.json();
  console.log("📡 Moralis stream created:", data);
}
