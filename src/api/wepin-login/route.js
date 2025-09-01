export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { provider } = req.body;

  if (provider !== "google") {
    return res.status(400).json({ success: false, message: "This login method is not supported." });
  }

  try {
    // Wepin API Call
    const response = await fetch("https://sdk.wepin.io/v1/user/oauth/callback?uri=wepin.5ad1aa1e5636b5b7820b2450d5bb1000%3A%2Foauth2redirect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, token: result.token });
    } else {
      return res.status(400).json({ success: false, message: result.message || "Login failed." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "server error" });
  }
}
