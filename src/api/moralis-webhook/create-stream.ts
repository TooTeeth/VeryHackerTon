import { NextApiRequest, NextApiResponse } from "next";
import { createMoralisStream } from "../../utils/moralis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const result = await createMoralisStream();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    } else {
      return res.status(500).json({ success: false, error: "Unknown error" });
    }
  }
}
