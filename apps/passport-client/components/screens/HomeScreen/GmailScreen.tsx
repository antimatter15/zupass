import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import React, { useMemo } from "react";
import { usePCDCollection } from "../../../src/appHooks";

export const GmailScreen = React.memo(GmailScreenImpl);

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("name", {
    header: "name",
    cell: (info) => info.getValue(),
    maxSize: 200
  }),
  columnHelper.accessor("pcd.id", {
    header: "id",
    cell: (info) => info.getValue(),
    size: 200,
    maxSize: 200
  }),
  columnHelper.accessor("type", {
    header: "type",
    cell: (info) => info.getValue()
  })
];

interface Row {
  pcd: PCD;
  name: string | undefined;
  type: string;
}

function PCDtoRow(pcds: PCDCollection, pcd: PCD): Row | undefined {
  const pack = pcds.getPackage(pcd.type);

  if (!pack) {
    return undefined;
  }

  if (!pack.getDisplayOptions) {
    return undefined;
  }

  const options = pack.getDisplayOptions(pcd);

  return {
    pcd,
    name: options.header,
    type: pcd.type
  };
}

/**
 * Show the user their Zupass, an overview of cards / PCDs.
 */
export function GmailScreenImpl(): JSX.Element | null {
  const pcds = usePCDCollection();
  const data: Row[] = useMemo(
    () =>
      pcds
        .getAll()
        .map((pcd) => PCDtoRow(pcds, pcd))
        .filter((row) => !!row),
    [pcds]
  );

  const table = useReactTable<Row>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="p-2 bg-green-950 w-full">
      <table className="bg-green-900 w-full">
        <thead className="bg-green-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    width: `${header.getSize()}px`,
                    maxWidth: `${header.column.columnDef.maxSize}px`,
                    minWidth: `${header.column.columnDef.minSize}px`
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-green-800">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="bg-green-700">
              {row.getVisibleCells().map((cell) => (
                <td
                  {...{
                    key: cell.id,
                    style: {
                      width: cell.column.getSize(),
                      maxWidth: `${cell.column.columnDef.maxSize}px`,
                      minWidth: `${cell.column.columnDef.minSize}px`,
                      overflow: "hidden"
                    }
                  }}
                  className="bg-green-600 text-ellipsis whitespace-nowrap"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // return (
  //   <div>
  //     {Object.entries(pcds.folders).map(([pcdId, folder], i) => (
  //       <div
  //         key={i}
  //         className="max-w-[100%] overflow-hidden whitespace-nowrap text-ellipsis p-1 px-3"
  //       >
  //         {folder} - {pcdId}
  //       </div>
  //     ))}
  //   </div>
  // );
}

/////////////////////////////
