import { TableCell, TableRow } from "@/components/custom/table";
import { columns } from "../columns";
import { Activity } from "lucide-react";

export function LiveRow() {
  return (
    <TableRow>
      <TableCell className="w-[--header-logo-size] min-w-[--header-logo-size] max-w-[--header-logo-size] border-b border-l border-r border-t border-info border-r-info/50">
        <div className="flex items-center justify-center">
          <Activity className="h-5 w-5 text-info" />
        </div>
      </TableCell>
      <TableCell
        colSpan={columns.length - 1}
        className="border-b border-r border-t border-info font-medium text-info"
      >
        Live Mode
      </TableCell>
    </TableRow>
  );
}
