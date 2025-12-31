import { JsonFragment } from "@ethersproject/abi";

declare module "*.json" {
  const value: readonly JsonFragment[];
  export default value;
}
