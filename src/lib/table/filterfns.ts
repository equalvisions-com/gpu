import { FilterFn } from "@tanstack/react-table";

export const arrSome: FilterFn<any> = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue)) return false;
  return filterValue.some((val) => row.getValue<unknown[]>(columnId) === val);
};

arrSome.autoRemove = (val: any) => !Array.isArray(val) || !val?.length;

function testFalsey(val: any) {
  return val === undefined || val === null || val === "";
}
