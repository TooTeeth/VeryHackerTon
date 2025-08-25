import Moralis from "moralis";

Moralis.start({
  apiKey: process.env.MORALIS_API_KEY,
});

export default Moralis;
