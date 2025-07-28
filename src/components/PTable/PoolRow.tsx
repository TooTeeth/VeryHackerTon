// // app/components/PoolRow.tsx
// import Image from "next/image";

// export default function PoolRow({ pool }: { pool: any }) {
//   const formatNumber = (num: number) => {
//     return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
//   };

//   const formatChange = (change: number) => {
//     const color = change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "";
//     const sign = change > 0 ? "+" : "";
//     return (
//       <span className={color}>
//         {sign}
//         {change.toFixed(2)}%
//       </span>
//     );
//   };

//   return (
//     <tr>
//       <td className="px-4 py-2 flex items-center gap-2">
//         {pool.icons.map((icon: string, i: number) => (
//           <Image key={i} src={icon} alt="" width={20} height={20} />
//         ))}
//         {pool.name}
//       </td>
//       <td className="px-4 py-2">
//         {formatNumber(pool.tvl)} {formatChange(pool.tvlChange)}
//       </td>
//       <td className="px-4 py-2">
//         {formatNumber(pool.volume24h)} {formatChange(pool.volume24hChange)}
//       </td>
//       <td className="px-4 py-2">
//         {formatNumber(pool.volume1w)} {formatChange(pool.volume1wChange)}
//       </td>
//       <td className="px-4 py-2 text-center">{pool.transactions24h}</td>
//       <td className="px-4 py-2 text-center">{pool.apr}</td>
//     </tr>
//   );
// }
