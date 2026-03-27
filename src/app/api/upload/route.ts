import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"],
  document: ["application/pdf"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};

const ALL_ALLOWED = [
  ...ALLOWED_TYPES.image,
  ...ALLOWED_TYPES.document,
  ...ALLOWED_TYPES.video,
];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALL_ALLOWED.includes(file.type)) {
      return NextResponse.json(
        {
          error: "File type not allowed. Supported: JPG, PNG, GIF, WebP, PDF, MP4, WebM",
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const uniqueName = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

    // Determine subfolder based on type
    let subfolder = "misc";
    if (ALLOWED_TYPES.image.includes(file.type)) subfolder = "images";
    else if (ALLOWED_TYPES.document.includes(file.type)) subfolder = "documents";
    else if (ALLOWED_TYPES.video.includes(file.type)) subfolder = "videos";

    // Ensure directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", subfolder);
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    // Return URL via API route (works in production mode)
    const fileUrl = `/api/files/${subfolder}/${uniqueName}`;

    // Determine file category
    let fileType = "file";
    if (ALLOWED_TYPES.image.includes(file.type)) fileType = "image";
    else if (ALLOWED_TYPES.document.includes(file.type)) fileType = "document";
    else if (ALLOWED_TYPES.video.includes(file.type)) fileType = "video";

    return NextResponse.json({
      url: fileUrl,
      fileName: file.name,
      fileType,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
