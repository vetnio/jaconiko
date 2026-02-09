const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 128;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "voyage-code-3",
        input: batch,
        input_type: "document",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Voyage AI batch ${batchIndex} failed (${batch.length} texts): ${response.status} ${error}`);
      throw new Error(`Voyage AI error: ${response.status} ${error}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.data)) {
      console.error(`Voyage AI batch ${batchIndex}: unexpected response structure`, data);
      throw new Error("Voyage AI returned unexpected response structure");
    }

    const embeddings = data.data.map(
      (item: { embedding: number[] }) => item.embedding
    );
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

export async function embedQuery(query: string): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "voyage-code-3",
      input: [query],
      input_type: "query",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
