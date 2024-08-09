import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import { ReactNode } from "react";
import { cn } from "../../../src/util";
import { useZmailContext } from "./ZmailContext";
import { ZmailRow } from "./ZmailTable";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function ZmailRowElement({ row }: { row: ZmailRow }): ReactNode {
  const ctx = useZmailContext();
  const meta = row.meta;

  return (
    <div
      onClick={() => {
        ctx.update({
          viewingPCDID: row.pcd.id,
          hoveringPCDID: undefined
        });
      }}
      onMouseEnter={() => {
        ctx.update({ hoveringPCDID: row.pcd.id });
      }}
      onMouseLeave={() => {
        ctx.update({ hoveringPCDID: undefined });
      }}
      className="border-b-2 border-gray-200 px-4 py-[0.1em] cursor-pointer hover:bg-gray-100 active:bg-gray-200 select-none flex flex-row items-center justify-between whitespace-nowrap transition-colors duration-100"
    >
      <span className={cn("flex-grow pr-2", meta?.viewed ? "" : "font-bold")}>
        {row.name}
      </span>
      <span className="pr-2">
        <span className="italic">{row.folder}</span>
        {" · "}
        {row.type}
        <span className="w-20 inline-block text-right">
          {meta?.updatedTimestamp
            ? timeAgo.format(new Date(meta.updatedTimestamp), "mini")
            : "n/a"}
        </span>
      </span>
    </div>
  );
}
