import { ethers } from "ethers";
import NewStoryCreateAbi from "@/contracts/abi/NewStoryCreate.json";

export const CREATE_CONTRACT_ADDRESS = "0x54507082a8BD3f4aef9a69Ae58DeAD63cAB97244";

export async function NewStoryCreate(provider: ethers.BrowserProvider) {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CREATE_CONTRACT_ADDRESS, NewStoryCreateAbi, signer);

  const value = ethers.parseEther("0.01");

  console.log("Sending 1 VERY (value in wei):", value.toString());

  const tx = await contract.StoryCreate({ value });
  await tx.wait();

  console.log("Transaction confirmed!");
}
