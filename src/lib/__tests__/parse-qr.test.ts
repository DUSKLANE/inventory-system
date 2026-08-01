import { describe, it, expect } from "vitest";
import { parseScanData, extractPartCode } from "../parse-qr";

describe("parseScanData", () => {
  it("解析纯编码", () => {
    expect(parseScanData("C2907002")).toEqual({ pc: "C2907002" });
  });
  it("解析嘉立创 JSON 格式", () => {
    const r = parseScanData('{on:SO123,pc:C2907002,pm:10K 电阻}');
    expect(r).toEqual({ on: "SO123", pc: "C2907002", pm: "10K 电阻" });
  });
  it("带大括号变体", () => {
    expect(parseScanData('{pc:C12345}')?.pc).toBe("C12345");
  });
  it("值包含冒号时保留", () => {
    expect(parseScanData('{pc:C12345,note:a:b}')?.note).toBe("a:b");
  });
  it("无法解析返回 null", () => {
    expect(parseScanData("")).toBeNull();
    expect(parseScanData("!!!")).toEqual({ "!!!": "!!!" }); // 现有行为：非空即返回
  });
});

describe("extractPartCode", () => {
  it("取 pc 字段", () => {
    expect(extractPartCode('{on:SO123,pc:C2907002}')).toBe("C2907002");
  });
  it("纯编码原样返回", () => {
    expect(extractPartCode("Z0001")).toBe("Z0001");
  });
});
