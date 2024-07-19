import { assertUnreachable } from "@pcd/util";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  PODPipelineCSVInput,
  PODPipelineInputFieldType
} from "../genericIssuanceTypes";
import {
  Input,
  InputColumn,
  InputRow,
  InputValue,
  TemplatedColumn
} from "./Input";
import { inputToBigInt, inputToBoolean, inputToDate } from "./coercion";

export class CSVInput implements Input {
  private data: Record<string, InputValue>[] = [];
  private columns: Record<string, InputColumn>;

  public constructor({ csv, columns }: PODPipelineCSVInput) {
    this.columns = Object.fromEntries(
      Object.entries(columns).map(([name, { type }]) => [
        name,
        new TemplatedColumn(name, type)
      ])
    );
    const rowSchema = z.object(
      Object.fromEntries(
        Object.entries(columns).map(([key, column]) => [
          key,
          column.type === PODPipelineInputFieldType.String
            ? z.string()
            : column.type === PODPipelineInputFieldType.Integer
            ? inputToBigInt.refine(
                (arg: bigint) => arg >= 0n,
                "Integers must not be negative"
              )
            : column.type === PODPipelineInputFieldType.Boolean
            ? inputToBoolean
            : column.type === PODPipelineInputFieldType.Date
            ? inputToDate
            : column.type === PODPipelineInputFieldType.UUID
            ? z.string().uuid()
            : assertUnreachable(column.type)
        ])
      )
    );

    const columnNames = Object.keys(columns);
    const data: unknown[] = parse(csv, { columns: columnNames });
    const header = data.shift();
    // The first row of a CSV file should be the header, which
    // should match the column names in the pipeline configuration
    if (
      !(header instanceof Object) ||
      Object.values(header).length !== columnNames.length ||
      !Object.values(header).every((name, index) => name === columnNames[index])
    ) {
      throw new Error("CSV header does not match configured columns");
    }

    for (const row of data) {
      // This will throw if the row is not valid
      this.data.push(rowSchema.parse(row));
    }
  }

  public getRows(): InputRow[] {
    return this.data;
  }

  public getColumns(): Record<string, InputColumn> {
    return this.columns;
  }
}
