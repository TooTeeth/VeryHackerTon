// // lib/utils/priceUtils.ts
// import { ethers } from "ethers";

// /**
//  * Wei를 ETH로 변환하여 표시용 문자열 반환
//  * @param weiString - Wei 단위의 문자열 (예: "1000000000000000000")
//  * @returns ETH 단위 문자열 (예: "1.0000")
//  */
// export function formatWeiToEth(weiString: string): string {
//   if (!weiString || weiString === "0") return "0";

//   try {
//     const weiValue = BigInt(weiString);
//     const ethValue = ethers.formatEther(weiValue);
//     const num = parseFloat(ethValue);
//     return num.toFixed(4);
//   } catch (error) {
//     console.error("Wei to ETH 변환 실패:", error);
//     return "0";
//   }
// }

// /**
//  * ETH를 Wei로 변환
//  * @param ethString - ETH 단위의 문자열 (예: "1.5")
//  * @returns Wei 단위의 BigInt
//  */
// export function parseEthToWei(ethString: string): bigint {
//   try {
//     return ethers.parseEther(ethString);
//   } catch (error) {
//     console.error("ETH to Wei 변환 실패:", error);
//     return BigInt(0);
//   }
// }

// /**
//  * 가격이 Wei 단위인지 ETH 단위인지 자동 감지하여 ETH로 변환
//  * @param priceString - 가격 문자열
//  * @returns ETH 단위 문자열
//  */
// export function smartFormatPrice(priceString: string): string {
//   if (!priceString || priceString === "0") return "0";

//   try {
//     const price = BigInt(priceString);

//     // 1 ETH = 10^18 Wei
//     // 0.001 ETH = 10^15 Wei를 임계값으로 사용
//     const WEI_THRESHOLD = BigInt("1000000000000000"); // 0.001 ETH

//     if (price > WEI_THRESHOLD) {
//       // Wei로 판단 -> ETH로 변환
//       return formatWeiToEth(priceString);
//     } else {
//       // 이미 ETH 단위로 판단
//       return parseFloat(priceString).toFixed(4);
//     }
//   } catch {
//     // BigInt 변환 실패 시 그대로 반환
//     return parseFloat(priceString || "0").toFixed(4);
//   }
// }

// /**
//  * Wei 문자열을 BigInt로 안전하게 변환
//  * @param weiString - Wei 단위 문자열
//  * @returns BigInt 값
//  */
// export function parseWeiString(weiString: string): bigint {
//   try {
//     return BigInt(weiString);
//   } catch (error) {
//     console.error("Wei 파싱 실패:", error);
//     return BigInt(0);
//   }
// }
