import fs from "fs";
import path from "path";

const IMAGES_DIR = path.join(process.cwd(), "data", "images", "parts");

function ensureDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

export function getImagePath(partId: string): string | null {
  ensureDir();
  const files = fs.readdirSync(IMAGES_DIR);
  const match = files.find((f) => f.startsWith(partId + "."));
  return match ? path.join(IMAGES_DIR, match) : null;
}

export function getImageFilename(partId: string): string | null {
  const filePath = getImagePath(partId);
  return filePath ? path.basename(filePath) : null;
}

export async function downloadImage(partId: string, imageUrl: string): Promise<string | null> {
  try {
    ensureDir();

    const res = await fetch(imageUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("gif")) ext = "gif";

    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = `${partId}.${ext}`;
    const filePath = path.join(IMAGES_DIR, filename);

    fs.writeFileSync(filePath, buffer);
    return filename;
  } catch (err) {
    console.error("Failed to download image:", err);
    return null;
  }
}

export function deleteImage(partId: string): void {
  const filePath = getImagePath(partId);
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function fetchProductImage(lcscCode: string): Promise<string | null> {
  try {
    const res = await fetch("https://pro.lceda.cn/api/eda/product/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: lcscCode, page: 1, pageSize: 5 }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.success || !data.ok) return null;

    const productList = data.result?.productList;
    if (!Array.isArray(productList) || productList.length === 0) return null;

    const product = productList.find((p: { code: string }) => p.code === lcscCode) || productList[0];
    const rawImage: string = product.image || "";

    if (!rawImage) return null;

    return rawImage.split("<$>")[0] || null;
  } catch {
    return null;
  }
}
