export interface LcedaProduct {
  lcscCode: string;
  name: string;
  brand: string;
  model: string;
  package: string;
  category: string;
  subCategory: string;
  parameters: Record<string, string>;
  image: string;
  datasheet: string;
  description: string;
  price: string;
  stock: number;
}

interface LcedaProductItem {
  code: string;
  name: string;
  brandName: string;
  model: string;
  standard: string;
  catalogName: string;
  image: string;
  pdfFileUrl: string;
  stockNumber: string;
  desc: string | null;
  priceList?: Array<{
    startNumber: number;
    endNumber: number;
    price: number;
  }>;
  device_info?: {
    description?: string;
    attributes?: Record<string, string>;
  };
}

export async function fetchProductInfo(lcscCode: string): Promise<LcedaProduct | null> {
  try {
    const res = await fetch(`/api/lceda?keyword=${encodeURIComponent(lcscCode)}`);

    if (!res.ok) {
      console.error("LCEDA proxy request failed:", res.status);
      return null;
    }

    const data = await res.json();

    if (!data.success || !data.ok) {
      console.error("LCEDA API returned error:", data);
      return null;
    }

    const productList = data.result?.productList;
    if (!Array.isArray(productList) || productList.length === 0) {
      console.warn("LCEDA API returned empty productList for:", lcscCode);
      return null;
    }

    const product = productList.find((p: LcedaProductItem) => p.code === lcscCode) || productList[0];

    const parameters: Record<string, string> = {};
    if (product.device_info?.attributes) {
      const attrs = product.device_info.attributes;
      for (const [key, value] of Object.entries(attrs)) {
        if (typeof value === "string" && value && key !== "Add into BOM" && key !== "Convert to PCB" && key !== "Symbol" && key !== "Footprint" && key !== "3D Model") {
          parameters[key] = value;
        }
      }
    }

    const price = product.priceList && product.priceList.length > 0
      ? product.priceList[0].price.toString()
      : "";

    return {
      lcscCode: product.code,
      name: product.name,
      brand: product.brandName,
      model: product.model,
      package: product.standard,
      category: product.catalogName,
      subCategory: "",
      parameters,
      image: product.image ? product.image.split("<$>")[0] : "",
      datasheet: product.pdfFileUrl || "",
      description: product.device_info?.description || product.desc || "",
      price,
      stock: parseInt(product.stockNumber, 10) || 0,
    };
  } catch (error) {
    console.error("Failed to fetch product info:", error);
    return null;
  }
}

export function buildProductFromScanData(scanData: {
  pc?: string;
  pm?: string;
  mc?: string;
  qty?: string;
}): LcedaProduct {
  return {
    lcscCode: scanData.pc || "",
    name: scanData.pm || "",
    brand: "",
    model: scanData.pm || "",
    package: "",
    category: "",
    subCategory: "",
    parameters: {},
    image: "",
    datasheet: "",
    description: "",
    price: "",
    stock: 0,
  };
}
